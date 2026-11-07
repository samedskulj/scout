/**
 * Generates a fictional, seeded player database (data/players.json).
 * Real data (Opta, StatsBomb, Wyscout) would replace this file; nothing else changes.
 * Usage: npm run generate
 */
import { writeFileSync } from "node:fs";
import type { Foot, League, MetricId, Player, Position } from "../shared/types.ts";

// Mulberry32: tiny seeded PRNG so the dataset is reproducible.
let seed = 20261107;
function rand(): number {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const normal = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
const pick = <T>(items: readonly T[]): T => items[Math.floor(rand() * items.length)]!;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
// toFixed strips float noise like 3.5100000000000002.
const round = (v: number, step: number) => Number((Math.round(v / step) * step).toFixed(2));

const NAMES: Record<string, [first: string[], last: string[]]> = {
  England: [["Jack", "Harry", "Callum", "Mason", "Reece", "Tyler", "Lewis", "Kieran", "Owen", "Ethan"], ["Whitaker", "Ashworth", "Pembridge", "Holloway", "Crossley", "Fenwick", "Thornton", "Bramley", "Hartley", "Sutcliffe"]],
  Spain: [["Álvaro", "Iker", "Pablo", "Sergio", "Unai", "Mikel", "Adrián", "Javier", "Rubén", "Marcos"], ["Castellano", "Iturbe", "Montero", "Robledo", "Salcedo", "Arriaga", "Larrañaga", "Quintana", "Ferrero", "Echeverría"]],
  France: [["Théo", "Mathis", "Enzo", "Lucas", "Yanis", "Rayan", "Nolan", "Maxime", "Hugo", "Bastien"], ["Delacroix", "Marchand", "Lefebvre", "Rousseau", "Garnier", "Fontaine", "Morel", "Chevalier", "Bonnet", "Girard"]],
  Germany: [["Jonas", "Lukas", "Felix", "Niklas", "Moritz", "Tim", "Leon", "Jannik", "Florian", "Paul"], ["Hofmann", "Krüger", "Lindner", "Vogel", "Schäfer", "Albrecht", "Sommerfeld", "Engel", "Busch", "Ritter"]],
  Brazil: [["Gabriel", "Matheus", "Vitor", "Rafael", "Caio", "Luan", "Igor", "Danilo", "Renan", "Davi"], ["Albuquerque", "Moreira", "Teixeira", "Barbosa", "Nascimento", "Cavalcanti", "Prado", "Siqueira", "Rezende", "Pinheiro"]],
  Portugal: [["Tomás", "Rodrigo", "Diogo", "Gonçalo", "Afonso", "Duarte", "Nuno", "Tiago", "Martim", "Simão"], ["Carvalho", "Figueiredo", "Magalhães", "Antunes", "Fonseca", "Valente", "Sequeira", "Lobo", "Gaspar", "Mendonça"]],
  Netherlands: [["Daan", "Sem", "Thijs", "Bram", "Lars", "Jesse", "Niels", "Joep", "Milan", "Stijn"], ["Bakker", "Visser", "Smit", "Meijer", "Mulder", "van Leeuwen", "Hendriks", "Kuipers", "de Graaf", "Brouwer"]],
  Nigeria: [["Chidi", "Emeka", "Tunde", "Ifeanyi", "Sola", "Kelechi", "Obinna", "Femi", "Uche", "Dayo"], ["Okonkwo", "Adeyemi", "Eze", "Nwosu", "Balogun", "Okafor", "Adebayo", "Uzoma", "Afolabi", "Onyekachi"]],
  Italy: [["Lorenzo", "Matteo", "Alessandro", "Riccardo", "Davide", "Federico", "Simone", "Tommaso", "Andrea", "Nicolò"], ["Ferraro", "Bellini", "Colombo", "Marchetti", "Rinaldi", "Galli", "Conti", "Moretti", "Lombardi", "Testa"]],
  Argentina: [["Santiago", "Facundo", "Nicolás", "Joaquín", "Agustín", "Franco", "Thiago", "Valentín", "Bautista", "Lucio"], ["Acosta", "Ledesma", "Quiroga", "Sosa", "Ojeda", "Aguirre", "Molina", "Villalba", "Benítez", "Cabral"]],
};

const LEAGUE_INFO: Record<League, { strength: number; country: string; clubs: string[] }> = {
  "England 1": { strength: 1.0, country: "England", clubs: ["Northbridge FC", "Ashford Rovers", "Kingsport City", "Harrowgate United"] },
  "England 2": { strength: 0.55, country: "England", clubs: ["Millbrook Town", "Wexley Athletic", "Stanmoor FC"] },
  "Spain 1": { strength: 0.85, country: "Spain", clubs: ["Real Alcora", "Atlético Brezo", "CF Mirador"] },
  "Germany 1": { strength: 0.8, country: "Germany", clubs: ["FC Rheinfeld", "SV Oberwald", "Borussia Kessel"] },
  "Italy 1": { strength: 0.8, country: "Italy", clubs: ["AC Valloria", "US Montecielo", "Sporting Lagona"] },
  "France 1": { strength: 0.7, country: "France", clubs: ["Olympique Vaudran", "AS Belmont", "FC Saint-Rives"] },
  "Netherlands 1": { strength: 0.5, country: "Netherlands", clubs: ["FC Waterhaven", "SC Dorpveld", "Lindegracht '08"] },
  "Portugal 1": { strength: 0.5, country: "Portugal", clubs: ["SC Ribeira", "CD Alvorada", "FC Serrano"] },
};

const SQUAD: Position[] = ["CB", "CB", "FB", "FB", "DM", "CM", "CM", "AM", "W", "W", "ST", "ST"];

// Mean per position, in order CB, FB, DM, CM, AM, W, ST. Spread is a share of the mean (or absolute for %).
const PROFILE: Record<MetricId, { mean: number[]; spread: number }> = {
  xg: { mean: [0.04, 0.05, 0.05, 0.12, 0.25, 0.3, 0.46], spread: 0.35 },
  goals: { mean: [0, 0, 0, 0, 0, 0, 0], spread: 0 }, // derived from xG
  shots: { mean: [0.6, 0.7, 0.8, 1.4, 2.2, 2.5, 3.1], spread: 0.3 },
  xa: { mean: [0.03, 0.12, 0.07, 0.13, 0.24, 0.23, 0.13], spread: 0.35 },
  key_passes: { mean: [0.4, 1.1, 0.9, 1.5, 2.4, 2.1, 1.1], spread: 0.3 },
  prog_passes: { mean: [4.5, 5.0, 6.5, 6.0, 4.5, 2.8, 1.4], spread: 0.25 },
  prog_carries: { mean: [1.0, 2.2, 1.6, 2.0, 3.2, 4.5, 1.8], spread: 0.3 },
  dribbles: { mean: [0.3, 0.9, 0.6, 1.0, 1.9, 2.8, 1.1], spread: 0.35 },
  pass_pct: { mean: [88, 80, 87, 85, 79, 76, 71], spread: 4 },
  tackles_int: { mean: [3.4, 3.6, 4.2, 3.0, 1.8, 1.6, 0.9], spread: 0.25 },
  aerial_pct: { mean: [64, 48, 54, 46, 36, 32, 47], spread: 8 },
  recoveries: { mean: [5.5, 5.6, 7.0, 6.0, 4.3, 4.0, 3.0], spread: 0.2 },
};
const POSITION_INDEX: Record<Position, number> = { CB: 0, FB: 1, DM: 2, CM: 3, AM: 4, W: 5, ST: 6 };
const HEIGHT: Record<Position, number> = { CB: 188, FB: 178, DM: 182, CM: 180, AM: 176, W: 175, ST: 184 };

function metricsFor(position: Position, quality: number): Record<MetricId, number> {
  const i = POSITION_INDEX[position];
  const out = {} as Record<MetricId, number>;
  for (const [id, { mean, spread }] of Object.entries(PROFILE) as [MetricId, (typeof PROFILE)[MetricId]][]) {
    const m = mean[i]!;
    const z = 0.55 * quality + 0.85 * normal();
    const isPct = id.endsWith("_pct");
    const value = isPct ? m + spread * z : m * (1 + spread * z);
    out[id] = isPct ? round(clamp(value, 15, 95), 0.1) : round(Math.max(0, value), 0.01);
  }
  out.goals = round(Math.max(0, out.xg * (1 + 0.25 * normal())), 0.01);
  return out;
}

function marketValue(quality: number, strength: number, age: number): number {
  const ageAdj = age <= 21 ? 0.2 : age <= 26 ? 0.3 : age <= 29 ? 0 : age <= 31 ? -0.5 : -1;
  return clamp(round(Math.exp(1.2 + 0.75 * quality + 1.4 * strength + ageAdj), 0.5), 0.5, 120);
}

const players: Player[] = [];
const usedNames = new Set<string>();

for (const [league, info] of Object.entries(LEAGUE_INFO) as [League, (typeof LEAGUE_INFO)[League]][]) {
  for (const club of info.clubs) {
    for (const position of SQUAD) {
      const nationality = rand() < 0.5 ? info.country : pick(Object.keys(NAMES));
      const [firsts, lasts] = NAMES[nationality]!;
      let name: string;
      do name = `${pick(firsts)} ${pick(lasts)}`;
      while (usedNames.has(name));
      usedNames.add(name);

      const age = Math.round(clamp(25.5 + 3.8 * normal(), 18, 35));
      const quality = 0.6 * info.strength + normal();
      const footRoll = rand();
      const foot: Foot = footRoll < 0.08 ? "both" : footRoll < (position === "FB" ? 0.5 : 0.28) ? "left" : "right";

      players.push({
        id: `p${String(players.length + 1).padStart(3, "0")}`,
        name,
        age,
        nationality,
        position,
        foot,
        height_cm: Math.round(HEIGHT[position] + 5 * normal()),
        club,
        league,
        minutes: Math.round(clamp(2100 + 700 * normal(), 450, 3420) / 10) * 10,
        market_value_m: marketValue(quality, info.strength, age),
        contract_until: 2027 + Math.floor(rand() * 5),
        metrics: metricsFor(position, quality),
      });
    }
  }
}

writeFileSync(new URL("../data/players.json", import.meta.url), JSON.stringify(players, null, 1) + "\n");
console.log(`Wrote ${players.length} players`);
