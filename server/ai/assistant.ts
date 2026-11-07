import type Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import {
  ASSISTANT_TOOLS,
  type AssistantResponse,
  type AssistantStep,
  type ChatTurn,
  type RealCard,
  type ScoutPlayer,
  type Source,
} from "../../shared/types.ts";
import { fallbackParams, getClient, hash, LlmError, model, readCache, writeCache } from "../lib/index.ts";
import { findRealClubs, findRealPlayers } from "../realworld.ts";
import { FoundPlayerSchema, hydratePlayers, ScoutPlayerSchema, searchQuery, today, type Job } from "./live.ts";

/**
 * The scout assistant: answers in chat with live web search, puts players it recommends on the scout's board,
 * and shows photo cards from TheSportsDB. Every fact it states must come from a search in this conversation.
 */

export interface AssistantContext {
  selected: string | null;
  brief: string | null;
  board: string[];
}

const SYSTEM = `You are the scout assistant in a football club's recruitment department. You help a scout find and judge real, current players.

How to work:
- Today is {today}. Use web_search for every fact: clubs, ages, values, contracts, stats, injuries, transfers. Your memory is out of date; never state a number you did not read in a search result in this conversation.
- Good sources: Transfermarkt (values in €, contracts, foot, height), FBref or league sites (stats, per-90, xG), club sites and reputable news.
- When you recommend players, call show_players so they appear on the scout's board, best first, with the facts you found and their source URLs. Unknown values are null.
- lookup_real_player and lookup_club show the scout a photo or badge card. Use them when the scout asks who someone is or what a club looks like.

How to reply:
- Speak like a scout. Lead with the answer. Under 150 words. Name players with one or two numbers that justify the pick.
- You may use short bullet lists and **bold**. No headings or tables.
- You are "the scout assistant". Never name the AI model or company behind you; if asked, say you are the app's AI assistant.`;

const CachedSchema = z.object({
  reply: z.string(),
  board: z.object({ title: z.string(), players: z.array(ScoutPlayerSchema) }).nullable(),
  steps: z.array(z.object({ tool: z.enum(ASSISTANT_TOOLS), summary: z.string() })),
  cards: z.array(z.custom<RealCard>((v) => typeof v === "object" && v !== null && "kind" in v)),
  sources: z.array(z.object({ title: z.string(), url: z.string() })),
});

/** Search queries and result URLs from web search blocks, for the visible working and the source list. */
function readSearches(message: Anthropic.Beta.BetaMessage, steps: AssistantStep[], sources: Map<string, Source>) {
  for (const block of message.content) {
    if (block.type === "server_tool_use" && block.name === "web_search") {
      const q = (block.input as { query?: string })?.query;
      if (q) steps.push({ tool: "web_search", summary: q });
    }
    if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
      for (const r of block.content as { url?: string; title?: string }[]) {
        if (r.url && !sources.has(r.url)) sources.set(r.url, { title: r.title ?? r.url, url: r.url });
      }
    }
  }
}

export async function askAssistant(turns: ChatTurn[], context?: AssistantContext, job?: Job): Promise<AssistantResponse> {
  const contextNote = [
    context?.selected && `The scout has ${context.selected} open in the profile panel.`,
    context?.brief && `The current brief: "${context.brief}".`,
    context?.board.length && `On the board now: ${context.board.join("; ")}.`,
  ]
    .filter(Boolean)
    .join(" ");

  const key = hash({ kind: "assistant-live", model: model(), turns, contextNote, day: today() });
  const cached = await readCache(key, CachedSchema);
  if (cached) return cached;

  const steps: AssistantStep[] = [];
  const cards: RealCard[] = [];
  const sources = new Map<string, Source>();
  const urls = new Set<string>();
  let board: { title: string; players: ScoutPlayer[] } | null = null;
  let pendingBoard: { title: string; players: z.infer<typeof FoundPlayerSchema>[] } | null = null;
  const addCard = (card: RealCard) => {
    if (!cards.some((c) => c.kind === card.kind && c.id === card.id)) cards.push(card);
  };

  const tools = [
    { type: "web_search_20260209" as const, name: "web_search" as const, max_uses: 10 },
    betaZodTool({
      name: "show_players",
      eager_input_streaming: true,
      description: "Put players on the scout's board, best first, replacing what's there. Call this whenever you recommend players.",
      inputSchema: z.object({
        title: z.string().max(80).describe("Short board title, e.g. 'Cheaper alternatives to Saka'"),
        players: z.array(FoundPlayerSchema).min(1).max(10),
      }),
      run: ({ title, players }) => {
        pendingBoard = { title, players };
        steps.push({ tool: "show_players", summary: `${players.length} players: ${title}` });
        return `Board updated with ${players.length} players.`;
      },
    }),
    betaZodTool({
      name: "lookup_real_player",
      description: "Show the scout a photo card for a real footballer (from TheSportsDB): club, nationality, position, date of birth. Identity facts only.",
      inputSchema: z.object({ name: z.string().min(2).describe("The player's name, e.g. 'Bukayo Saka'") }),
      run: async ({ name }) => {
        const found = await findRealPlayers(name);
        steps.push({ tool: "lookup_real_player", summary: found?.length ? found.map((p) => p.name).join(", ") : `no match for ${name}` });
        if (found === null) return "The photo service could not be reached.";
        if (!found.length) return `No photo card found for "${name}".`;
        found.slice(0, 2).forEach(addCard);
        return JSON.stringify(found.map(({ photo: _p, cutout: _c, clubBadge: _b, ...facts }) => facts));
      },
    }),
    betaZodTool({
      name: "lookup_club",
      description: "Show the scout a badge card for a real club (from TheSportsDB): league, country, stadium, founded.",
      inputSchema: z.object({ name: z.string().min(2).describe("Club name, e.g. 'Benfica'") }),
      run: async ({ name }) => {
        const found = await findRealClubs(name);
        steps.push({ tool: "lookup_club", summary: found?.length ? found.map((c) => c.name).join(", ") : `no match for ${name}` });
        if (found === null) return "The badge service could not be reached.";
        if (!found.length) return `No club called "${name}" found.`;
        found.slice(0, 1).forEach(addCard);
        return JSON.stringify(found.map(({ badge: _b, ...facts }) => facts));
      },
    }),
  ];

  const messages: Anthropic.Beta.BetaMessageParam[] = turns.map((t, i) =>
    i === turns.length - 1 && t.role === "user" && contextNote
      ? { role: "user", content: `${t.content}\n\n<screen_context>${contextNote}</screen_context>` }
      : { role: t.role, content: t.content },
  );

  const runner = getClient().beta.messages.toolRunner({
    model: model(),
    max_tokens: 16000,
    max_iterations: 20,
    system: SYSTEM.replace("{today}", today()),
    tools,
    messages,
    output_config: { effort: "medium" },
    stream: true,
    ...fallbackParams(),
  }, { signal: job?.signal });

  let final: Anthropic.Beta.BetaMessage | undefined;
  for await (const stream of runner) {
    stream.on("contentBlock", (block) => {
      const q = searchQuery(block);
      if (q) job?.progress?.(`Searching: ${q}`);
    });
    const message = await stream.finalMessage();
    readSearches(message, steps, sources);
    for (const s of sources.values()) urls.add(s.url);
    final = message;
  }
  if (!final) throw new LlmError("The assistant didn't answer. Try again.");
  if (final.stop_reason === "refusal") throw new LlmError("The AI declined this request.");
  if (final.stop_reason === "max_tokens") throw new LlmError("The AI's response was cut off.");

  const shown = pendingBoard as { title: string; players: z.infer<typeof FoundPlayerSchema>[] } | null;
  if (shown) board = { title: shown.title, players: await hydratePlayers(shown.players, urls) };

  const reply = final.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  const result: AssistantResponse = {
    reply: reply || (board ? "Done. The board is updated." : "I couldn't find anything reliable on that."),
    board,
    steps,
    cards,
    sources: [...sources.values()].slice(0, 8),
  };
  await writeCache(key, result);
  return result;
}
