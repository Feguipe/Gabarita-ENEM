"use client";

import { getSupabase } from "./supabase";
import { gerarCodigoSala, gerarCodigoAdmin } from "./nicknames";
import type {
  Sala,
  SalaConfig,
  ParticipanteSala,
  Question,
} from "./types";

const ADMIN_KEY_PREFIX = "gabarita:sala-admin:";
const PARTICIPANTE_KEY_PREFIX = "gabarita:sala-participante:";

// ============== Persistência local (do lado de quem usa) ==============

/** Salva localmente o código admin de uma sala que ESSE navegador criou */
export function salvarAdminLocal(codigo: string, codigoAdmin: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ADMIN_KEY_PREFIX + codigo, codigoAdmin);
}

export function getAdminLocal(codigo: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ADMIN_KEY_PREFIX + codigo);
}

/** Salva qual nickname/id este navegador está usando como participante */
export function salvarParticipanteLocal(
  salaCodigo: string,
  participanteId: string,
  nickname: string
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    PARTICIPANTE_KEY_PREFIX + salaCodigo,
    JSON.stringify({ participanteId, nickname })
  );
}

export function getParticipanteLocal(
  salaCodigo: string
): { participanteId: string; nickname: string } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PARTICIPANTE_KEY_PREFIX + salaCodigo);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ============== Operações no Supabase ==============

export async function criarSala(
  config: SalaConfig,
  questions: Question[]
): Promise<{ sala: Sala; codigoAdmin: string } | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const codigo = gerarCodigoSala();
  const codigoAdmin = gerarCodigoAdmin();
  const questionIds = questions.map((q) => q.id);

  const { data, error } = await supabase
    .from("salas")
    .insert({
      codigo,
      codigo_admin: codigoAdmin,
      config,
      question_ids: questionIds,
      status: "aberta",
    })
    .select()
    .single();

  if (error || !data) {
    console.error("Erro ao criar sala:", error);
    return null;
  }

  salvarAdminLocal(codigo, codigoAdmin);
  return { sala: data as Sala, codigoAdmin };
}

export async function buscarSalaPorCodigo(
  codigo: string
): Promise<Sala | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("salas")
    .select("*")
    .eq("codigo", codigo)
    .maybeSingle();

  if (error || !data) return null;
  return data as Sala;
}

export async function listarParticipantes(
  salaId: string
): Promise<ParticipanteSala[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("participantes")
    .select("*")
    .eq("sala_id", salaId)
    .order("joined_at", { ascending: true });

  if (error || !data) return [];
  return data as ParticipanteSala[];
}

export async function entrarNaSala(
  salaId: string,
  nickname: string
): Promise<ParticipanteSala | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("participantes")
    .insert({
      sala_id: salaId,
      nickname,
      respostas: {},
    })
    .select()
    .single();

  if (error || !data) {
    console.error("Erro ao entrar na sala:", error);
    return null;
  }
  return data as ParticipanteSala;
}

export async function iniciarSala(
  salaId: string,
  codigoAdmin: string
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from("salas")
    .update({
      status: "em_andamento",
      started_at: new Date().toISOString(),
    })
    .eq("id", salaId)
    .eq("codigo_admin", codigoAdmin);

  return !error;
}

export async function encerrarSala(
  salaId: string,
  codigoAdmin: string
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from("salas")
    .update({ status: "encerrada" })
    .eq("id", salaId)
    .eq("codigo_admin", codigoAdmin);

  return !error;
}

export async function atualizarParticipante(
  participanteId: string,
  patch: Partial<
    Pick<
      ParticipanteSala,
      "started_at" | "finished_at" | "acertos" | "total" | "tempo_total_ms" | "respostas"
    >
  >
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from("participantes")
    .update(patch)
    .eq("id", participanteId);

  return !error;
}

export function questionsFromIds(
  questionIds: string[],
  pool: Question[]
): Question[] {
  const map = new Map(pool.map((q) => [q.id, q]));
  return questionIds.map((id) => map.get(id)).filter(Boolean) as Question[];
}
