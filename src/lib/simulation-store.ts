"use client";

import type { Simulation, SimulationConfig, Question, Answer } from "./types";
import { QUESTIONS } from "./questions-data";

const STORAGE_KEY = "simulados:current";
const HISTORY_KEY = "simulados:history";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function filterPool(config: SimulationConfig): Question[] {
  let pool = QUESTIONS;
  if (config.area !== "misto") pool = pool.filter((q) => q.area === config.area);
  if (config.anoMin !== undefined) pool = pool.filter((q) => q.ano >= config.anoMin!);
  if (config.anoMax !== undefined) pool = pool.filter((q) => q.ano <= config.anoMax!);
  if (config.language) {
    if (config.language === "sem_estrangeira") {
      pool = pool.filter((q) => !q.language);
    } else {
      pool = pool.filter((q) => !q.language || q.language === config.language);
    }
  }
  if (config.dificuldade && config.dificuldade !== "qualquer") {
    pool = pool.filter((q) => q.dificuldade === config.dificuldade);
  }
  return pool;
}

export function pickQuestions(config: SimulationConfig): Question[] {
  const pool = filterPool(config);
  const shuffled = shuffle(pool);
  return shuffled.slice(0, Math.min(config.quantidade, shuffled.length));
}

export function createSimulation(config: SimulationConfig): Simulation {
  const questions = pickQuestions(config);
  const answers: Record<string, Answer> = {};
  for (const q of questions) {
    answers[q.id] = {
      questionId: q.id,
      letraEscolhida: null,
      tempoGastoMs: 0,
      marcadaRevisao: false,
    };
  }
  const sim: Simulation = {
    id: `sim_${Date.now()}`,
    config,
    questions,
    answers,
    currentIndex: 0,
    startedAt: Date.now(),
    finishedAt: null,
    status: "em_andamento",
    anticheatEvents: [],
  };
  saveCurrent(sim);
  return sim;
}

export function saveCurrent(sim: Simulation): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sim));
}

export function loadCurrent(): Simulation | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Simulation;
  } catch {
    return null;
  }
}

export function clearCurrent(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function archiveSimulation(sim: Simulation): void {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(HISTORY_KEY);
  const history: Simulation[] = raw ? JSON.parse(raw) : [];
  history.unshift(sim);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
}

export function calculateScore(sim: Simulation): {
  acertos: number;
  total: number;
  percentual: number;
  tempoMedioMs: number;
} {
  let acertos = 0;
  let totalTempo = 0;
  for (const q of sim.questions) {
    const a = sim.answers[q.id];
    if (!a) continue;
    totalTempo += a.tempoGastoMs;
    const correta = q.alternativas.find((x) => x.correta);
    if (correta && a.letraEscolhida === correta.letra) acertos++;
  }
  const total = sim.questions.length;
  return {
    acertos,
    total,
    percentual: total > 0 ? (acertos / total) * 100 : 0,
    tempoMedioMs: total > 0 ? totalTempo / total : 0,
  };
}
