#!/usr/bin/env node
/**
 * Importa questões do ENEM via API pública enem.dev e salva em src/data/questions.json.
 *
 * Uso: node scripts/import-enem.mjs
 *
 * Flags (via env):
 *   YEAR_START (default 2014)
 *   YEAR_END   (default 2023)
 *   LANGUAGE   ("ingles" ou "espanhol", default "ingles" — filtra língua estrangeira)
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "src", "data", "questions.json");

const BASE = "https://api.enem.dev/v1";
const YEAR_START = Number(process.env.YEAR_START ?? 2014);
const YEAR_END = Number(process.env.YEAR_END ?? 2023);
const LANGUAGE = process.env.LANGUAGE ?? "ingles";
const PAGE_SIZE = 50;

const DISCIPLINE_TO_AREA = {
  linguagens: "linguagens",
  "ciencias-humanas": "humanas",
  "ciencias-natureza": "natureza",
  matematica: "matematica",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url, attempt = 0) {
  const res = await fetch(url);
  if (res.status === 429) {
    const wait = Math.min(60_000, 2000 * Math.pow(2, attempt));
    process.stdout.write(`[429 wait ${wait}ms] `);
    await sleep(wait);
    if (attempt >= 6) throw new Error(`GET ${url} → 429 (esgotado)`);
    return fetchJson(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.json();
}

async function fetchYear(year) {
  const all = [];
  let offset = 0;
  while (true) {
    const url = `${BASE}/exams/${year}/questions?limit=${PAGE_SIZE}&offset=${offset}&language=${LANGUAGE}`;
    const data = await fetchJson(url);
    all.push(...data.questions);
    if (!data.metadata.hasMore) break;
    offset += PAGE_SIZE;
    await sleep(800);
  }
  return all;
}

function normalize(q) {
  const area = DISCIPLINE_TO_AREA[q.discipline];
  if (!area) return null;

  const alternativas = (q.alternatives ?? [])
    .filter((a) => a.letter && (a.text || a.file))
    .map((a) => ({
      letra: a.letter,
      texto: a.text ?? "",
      correta: !!a.isCorrect,
      imagem: a.file ?? null,
    }));

  if (alternativas.length < 2) return null;
  if (!alternativas.some((a) => a.correta)) return null;

  return {
    id: `enem-${q.year}-${q.index}${q.language ? "-" + q.language : ""}`,
    area,
    ano: q.year,
    tema: q.title ?? `ENEM ${q.year} — Q${q.index}`,
    dificuldade: "media",
    enunciado: q.context ?? "",
    introducaoAlternativas: q.alternativesIntroduction ?? "",
    contextoImagens: Array.isArray(q.files) ? q.files : [],
    alternativas,
    resolucao: `Gabarito oficial: ${alternativas.find((a) => a.correta)?.letra ?? "—"}.`,
    language: q.language ?? null,
    index: q.index,
  };
}

async function main() {
  console.log(`Importando ENEM ${YEAR_START}–${YEAR_END} (língua: ${LANGUAGE})…`);
  const all = [];
  for (let year = YEAR_START; year <= YEAR_END; year++) {
    process.stdout.write(`  ${year}… `);
    try {
      const raw = await fetchYear(year);
      const normalized = raw.map(normalize).filter(Boolean);
      console.log(`${normalized.length} questões`);
      all.push(...normalized);
    } catch (err) {
      console.log(`ERRO: ${err.message}`);
    }
  }

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(all, null, 2), "utf8");

  const byArea = all.reduce((acc, q) => {
    acc[q.area] = (acc[q.area] ?? 0) + 1;
    return acc;
  }, {});
  const byYear = all.reduce((acc, q) => {
    acc[q.ano] = (acc[q.ano] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`\n✓ Salvo em ${OUT}`);
  console.log(`  Total: ${all.length}`);
  console.log(`  Por área:`, byArea);
  console.log(`  Por ano:`, byYear);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
