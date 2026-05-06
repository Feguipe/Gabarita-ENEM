"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Supabase usa "anon key" historicamente, mas dashboards recentes chamam de
// "publishable key". Aceita os dois nomes pra evitar pegadinha de config.
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let cached: SupabaseClient | null = null;

/**
 * Cliente Supabase singleton (lado cliente apenas).
 * Retorna null se as variáveis de ambiente não estão configuradas —
 * páginas devem mostrar mensagem amigável nesse caso.
 */
export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (cached) return cached;
  cached = createClient(url, anonKey, {
    auth: { persistSession: false }, // não precisamos de auth — sala é via código
  });
  return cached;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}
