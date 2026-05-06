"use client";

import { getSupabase } from "./supabase";
import { gerarCodigoSala, gerarCodigoAdmin } from "./nicknames";
import type {
  Oficina,
  OficinaConfig,
  ParticipanteOficina,
  RedacaoTema,
} from "./types";

const ADMIN_KEY_PREFIX = "gabarita:oficina-admin:";
const PARTICIPANTE_KEY_PREFIX = "gabarita:oficina-participante:";

// ============== Persistência local ==============

export function salvarAdminLocal(codigo: string, codigoAdmin: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ADMIN_KEY_PREFIX + codigo, codigoAdmin);
}

export function getAdminLocal(codigo: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ADMIN_KEY_PREFIX + codigo);
}

export function salvarParticipanteLocal(
  oficinaCodigo: string,
  participanteId: string,
  nickname: string
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    PARTICIPANTE_KEY_PREFIX + oficinaCodigo,
    JSON.stringify({ participanteId, nickname })
  );
}

export function getParticipanteLocal(
  oficinaCodigo: string
): { participanteId: string; nickname: string } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PARTICIPANTE_KEY_PREFIX + oficinaCodigo);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ============== Operações Supabase ==============

export async function criarOficina(
  config: OficinaConfig,
  tema: RedacaoTema
): Promise<{ oficina: Oficina; codigoAdmin: string } | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const codigo = gerarCodigoSala();
  const codigoAdmin = gerarCodigoAdmin();

  const { data, error } = await supabase
    .from("oficinas")
    .insert({
      codigo,
      codigo_admin: codigoAdmin,
      config,
      tema_id: tema.id,
      tema_snapshot: tema,
      status: "aberta",
    })
    .select()
    .single();

  if (error || !data) {
    console.error("Erro ao criar oficina:", error);
    return null;
  }

  salvarAdminLocal(codigo, codigoAdmin);
  return { oficina: data as Oficina, codigoAdmin };
}

export async function buscarOficinaPorCodigo(
  codigo: string
): Promise<Oficina | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("oficinas")
    .select("*")
    .eq("codigo", codigo)
    .maybeSingle();

  if (error || !data) return null;
  return data as Oficina;
}

export async function listarParticipantesOficina(
  oficinaId: string
): Promise<ParticipanteOficina[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("participantes_oficina")
    .select("*")
    .eq("oficina_id", oficinaId)
    .order("joined_at", { ascending: true });

  if (error || !data) return [];
  return data as ParticipanteOficina[];
}

export async function entrarNaOficina(
  oficinaId: string,
  nickname: string
): Promise<ParticipanteOficina | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("participantes_oficina")
    .insert({
      oficina_id: oficinaId,
      nickname,
      texto: "",
    })
    .select()
    .single();

  if (error || !data) {
    console.error("Erro ao entrar na oficina:", error);
    return null;
  }
  return data as ParticipanteOficina;
}

export async function iniciarOficina(
  oficinaId: string,
  codigoAdmin: string
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from("oficinas")
    .update({
      status: "em_andamento",
      started_at: new Date().toISOString(),
    })
    .eq("id", oficinaId)
    .eq("codigo_admin", codigoAdmin);

  return !error;
}

export async function encerrarOficina(
  oficinaId: string,
  codigoAdmin: string
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from("oficinas")
    .update({ status: "encerrada" })
    .eq("id", oficinaId)
    .eq("codigo_admin", codigoAdmin);

  return !error;
}

export async function atualizarRedacaoOficina(
  participanteId: string,
  patch: Partial<
    Pick<
      ParticipanteOficina,
      "started_at" | "finished_at" | "texto" | "caracteres" | "linhas"
    >
  >
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from("participantes_oficina")
    .update(patch)
    .eq("id", participanteId);

  return !error;
}
