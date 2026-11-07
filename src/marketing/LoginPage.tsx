"use client";

import { Eye, EyeOff, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Logo } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dash, eur } from "../../shared/format.ts";
import type { DemoResponse, ScoutPlayer } from "../../shared/types.ts";
import { useAuth } from "../auth/AuthProvider.tsx";
import { authEnabled, supabase } from "../auth/supabase.ts";
import { Avatar, ClubBadge } from "../scout/bits.tsx";
import { apiStream } from "../ui/api.ts";
import { DEMO_BRIEFS } from "./LiveDemo.tsx";

type Mode = "signin" | "signup" | "reset" | "update";

const COPY: Record<Mode, { title: string; sub: string; submit: string }> = {
  signin: { title: "Sign in to Scout Copilot", sub: "Pick up where your department left off.", submit: "Sign in" },
  signup: { title: "Create your account", sub: "Your scouting workspace, ready for your next brief.", submit: "Create account" },
  reset: { title: "Reset your password", sub: "We'll email you a link to set a new one.", submit: "Send reset link" },
  update: { title: "Set a new password", sub: "Choose a password with at least 8 characters.", submit: "Save password" },
};

/** Supabase error messages are written for developers; these are the ones scouts actually hit. */
function friendly(message: string): string {
  if (/invalid login credentials/i.test(message)) return "That email and password don't match an account.";
  if (/email not confirmed/i.test(message)) return "Confirm your email first: open the link we sent you, then sign in.";
  if (/already registered|already exists/i.test(message)) return "There's already an account with that email. Sign in instead.";
  if (/rate limit|too many/i.test(message)) return "Too many attempts. Wait a minute and try again.";
  if (/password should be at least/i.test(message)) return "Use a password with at least 8 characters.";
  return message;
}

/** Only follow same-site paths after sign-in, never an absolute URL from the query string. */
function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/app";
}

const linkBtn = "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";

export function LoginPage() {
  const { session, loading, recovering } = useAuth();
  const params = useSearchParams();
  const router = useRouter();
  const next = safeNext(params.get("next"));

  const [chosenMode, setMode] = useState<Mode>(params.get("mode") === "signup" ? "signup" : "signin");
  // A password-reset link signs the scout in with a recovery session: show the new-password form.
  const mode: Mode = recovering ? "update" : chosenMode;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState<string>();

  const signedIn = !loading && Boolean(session) && !recovering && mode !== "update";
  useEffect(() => {
    if (signedIn) router.replace(next);
  }, [signedIn, next, router]);

  const copy = COPY[mode];
  const needsPassword = mode !== "reset";
  const needsEmail = mode !== "update";

  function switchMode(m: Mode) {
    setMode(m);
    setError(undefined);
    setSent(undefined);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(undefined);
    setSent(undefined);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(next);
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/app` } });
        if (error) throw error;
        if (data.session) router.replace("/app");
        else setSent(`We sent a confirmation link to ${email}. Open it to finish creating your account.`);
      } else if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` });
        if (error) throw error;
        setSent(`If ${email} has an account, a reset link is on its way.`);
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        router.replace("/app");
      }
    } catch (err) {
      setError(friendly((err as Error).message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-2">
      <div className="flex flex-col px-4 py-5 sm:px-12 sm:py-7">
        <Logo />

        <div className="m-auto grid w-full max-w-[400px] gap-3 py-12">
          {(mode === "signin" || mode === "signup") && (
            <Tabs value={mode} onValueChange={(m) => switchMode(m as Mode)}>
              <TabsList className="grid h-10! w-full grid-cols-2 rounded-xl border bg-background">
                <TabsTrigger value="signin" className="rounded-lg">
                  Sign in
                </TabsTrigger>
                <TabsTrigger value="signup" className="rounded-lg">
                  Create account
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          <h1 className="mt-4 font-heading text-3xl leading-tight font-extrabold tracking-tight">{copy.title}</h1>
          <p className="mb-3 text-[15.5px] text-muted-foreground">{copy.sub}</p>

          {!authEnabled ? (
            <div className="grid justify-items-start gap-3.5 rounded-xl bg-warn-soft p-5 text-[14.5px]">
              <p>
                Sign-in isn&apos;t configured on this server yet. Add <code className="rounded bg-background px-1.5 py-px">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                <code className="rounded bg-background px-1.5 py-px">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code>.env</code> and restart. Until then the
                workspace is open.
              </p>
              <Button asChild className="rounded-full px-4">
                <Link href="/app">Open the workspace</Link>
              </Button>
            </div>
          ) : sent ? (
            <div className="grid justify-items-start gap-2.5 rounded-xl bg-good-soft p-5" role="status">
              <MailCheck className="size-6 text-good" aria-hidden />
              <p>{sent}</p>
              <button className={linkBtn} onClick={() => setSent(undefined)}>
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-4">
              {needsEmail && (
                <div className="grid gap-2">
                  <Label htmlFor="email">Work email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 rounded-xl bg-card text-[15px]"
                  />
                </div>
              )}
              {needsPassword && (
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === "signin" && (
                      <button type="button" className={`${linkBtn} text-[13px]`} onClick={() => switchMode("reset")}>
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={show ? "text" : "password"}
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      required
                      minLength={mode === "signin" ? undefined : 8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 rounded-xl bg-card pr-12 text-[15px]"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 size-9 text-muted-foreground"
                      onClick={() => setShow((s) => !s)}
                      aria-label={show ? "Hide password" : "Show password"}
                    >
                      {show ? <EyeOff /> : <Eye />}
                    </Button>
                  </div>
                </div>
              )}
              {error && (
                <p className="rounded-xl bg-bad-soft px-3 py-2.5 text-sm text-bad" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" size="lg" className="h-11 w-full rounded-xl text-[15px]" disabled={busy}>
                {busy ? "One moment…" : copy.submit}
              </Button>
              {mode === "reset" && (
                <button type="button" className={linkBtn} onClick={() => switchMode("signin")}>
                  Back to sign in
                </button>
              )}
              {mode === "signup" && (
                <p className="text-center text-[13.5px] text-faint">
                  Choosing a plan for your department?{" "}
                  <Link href="/pricing" className="text-muted-foreground underline underline-offset-4 hover:text-foreground">
                    Compare plans
                  </Link>
                  .
                </p>
              )}
            </form>
          )}
        </div>
      </div>
      <LoginShowcase />
    </div>
  );
}

/** The other half of the page: a real player from today's demo search, as the workspace shows him. */
function LoginShowcase() {
  const [player, setPlayer] = useState<ScoutPlayer | null>(null);
  useEffect(() => {
    apiStream<DemoResponse>("/api/demo", { query: DEMO_BRIEFS[1] }).then(
      (res) => setPlayer(res.players[0] ?? null),
      () => setPlayer(null),
    );
  }, []);
  return (
    <aside
      className="relative hidden flex-col justify-center gap-7 overflow-hidden border-l bg-card bg-[radial-gradient(ellipse_80%_60%_at_70%_20%,rgb(124_134_255/0.2),transparent_70%)] px-14 py-16 lg:flex"
      aria-label="What scouts see"
    >
      <p className="max-w-[20ch] font-heading text-[clamp(26px,2.6vw,36px)] leading-[1.15] font-bold tracking-tight">
        “Pressing striker under 26 from the Eredivisie or Liga Portugal.”
      </p>
      {player && (
        <div className="grid max-w-[420px] gap-2.5 rounded-2xl border border-input bg-background p-6 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.7)] [.light_&]:shadow-[0_40px_80px_-30px_rgb(18_21_26/0.25)]">
          <div className="flex items-center gap-3.5">
            <Avatar player={player} size={60} prefer="cutout" />
            <div className="min-w-0">
              <p className="text-xl leading-tight font-bold tracking-tight">{player.name}</p>
              <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                <ClubBadge src={player.clubBadge} size={14} /> {player.club ?? "Club unknown"} · {dash(player.age)} · {eur(player.market_value_eur_m)}
              </p>
            </div>
          </div>
          <ul className="mt-1.5">
            {player.key_stats.slice(0, 5).map((s) => (
              <li key={s.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 border-b py-2 text-sm last:border-b-0">
                <span>{s.label}</span>
                <b className="font-cond text-[15px]">{s.value}</b>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="max-w-[46ch] text-sm text-muted-foreground">The top match for that brief, found on today's web. Every number links back to its source in the app.</p>
    </aside>
  );
}
