import type { RedacaoRascunho, RedacaoTema } from "./types";

const RASCUNHO_KEY = "gabarita:redacao:rascunho";
const HIST_KEY = "gabarita:redacao:historico";

export function loadRascunho(): RedacaoRascunho | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(RASCUNHO_KEY);
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as RedacaoRascunho;
    // retrocompat: rascunhos antigos sem status/anticheatEvents
    if (!r.status) r.status = "em_andamento";
    if (!r.anticheatEvents) r.anticheatEvents = [];
    return r;
  } catch {
    return null;
  }
}

export function criarRascunho(tema: RedacaoTema): RedacaoRascunho {
  const agora = Date.now();
  return {
    id: `red-${tema.id}-${agora}`,
    temaId: tema.id,
    tema: tema.tema,
    texto: "",
    criadoEm: agora,
    atualizadoEm: agora,
    finalizadoEm: null,
    status: "em_andamento",
    anticheatEvents: [],
  };
}

export function saveRascunho(r: RedacaoRascunho) {
  if (typeof window === "undefined") return;
  localStorage.setItem(RASCUNHO_KEY, JSON.stringify(r));
}

export function clearRascunho() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(RASCUNHO_KEY);
}

export function loadHistorico(): RedacaoRascunho[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(HIST_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as RedacaoRascunho[];
  } catch {
    return [];
  }
}

export function addAoHistorico(r: RedacaoRascunho) {
  if (typeof window === "undefined") return;
  const hist = loadHistorico();
  hist.unshift(r);
  localStorage.setItem(HIST_KEY, JSON.stringify(hist.slice(0, 50)));
}

export function removerDoHistorico(id: string) {
  if (typeof window === "undefined") return;
  const hist = loadHistorico().filter((r) => r.id !== id);
  localStorage.setItem(HIST_KEY, JSON.stringify(hist));
}

export function contarLinhas(texto: string): number {
  if (!texto.trim()) return 0;
  // ENEM conta ~95 caracteres por linha em média
  const chars = texto.length;
  const linhasPorQuebra = texto.split("\n").length;
  const linhasEstimadas = Math.max(linhasPorQuebra, Math.ceil(chars / 85));
  return linhasEstimadas;
}

export function contarPalavras(texto: string): number {
  const t = texto.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}
