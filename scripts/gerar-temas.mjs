// Gera temas de redação a partir de notícias atuais (RSS) + Gemini.
// Uso: node scripts/gerar-temas.mjs
// Requer: GEMINI_API_KEY em .env.local

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";
import { XMLParser } from "fast-xml-parser";

// ---------- config ----------
const NUM_TEMAS = Number(process.env.NUM_TEMAS || 20);
const MAX_NOTICIAS_POR_FEED = 30;

const FEEDS = [
  { fonte: "G1", url: "https://g1.globo.com/rss/g1/" },
  { fonte: "G1 - Ciência", url: "https://g1.globo.com/rss/g1/ciencia-e-saude/" },
  { fonte: "G1 - Educação", url: "https://g1.globo.com/rss/g1/educacao/" },
  { fonte: "G1 - Meio Ambiente", url: "https://g1.globo.com/rss/g1/natureza/" },
  { fonte: "Folha - Cotidiano", url: "https://feeds.folha.uol.com.br/cotidiano/rss091.xml" },
  { fonte: "Folha - Ciência", url: "https://feeds.folha.uol.com.br/ciencia/rss091.xml" },
  { fonte: "Folha - Ambiente", url: "https://feeds.folha.uol.com.br/ambiente/rss091.xml" },
  { fonte: "BBC Brasil", url: "https://feeds.bbci.co.uk/portuguese/rss.xml" },
];

// Palavras que indicam tema NÃO-enem (fofoca, crimes pontuais, esportes, etc.)
const BLOCKLIST = [
  /\b(morre|morto|morreu|morta|mata|matou|assassin|homic[íi]d|tiroteio|estupr|sequestr|pedof)\b/i,
  /\b(influenciador|influencer|youtuber|tiktoker|streamer)\b/i,
  /\b(preso|pres[ao]|detido|flagrante|operaç[ãa]o policial)\b/i,
  /\b(bbb|big brother|reality|celebridade|fofoca|namoro|solteir|affair)\b/i,
  /\b(flamengo|palmeiras|corinthians|são paulo fc|brasileirão|libertadores|copa do|neymar|vinicius)\b/i,
  /\b(loteria|mega-sena|lotof|quina)\b/i,
  /\b(previsão do tempo|chuva forte|temperatura mínima|alagament|enxurrada|acidente na)\b/i,
  /\b(bolsonaro|lula|dino|moraes|stf|pl |pt )\b/i, // evita temas muito partidarizados
  /\bv[íi]deo[s]? sexu|conte[úu]do [ií]ntimo|nude/i,
];

// Palavras que indicam ENEM-friendly (boost)
const ENEM_FRIENDLY = [
  /\b(educaç|escola|universidade|professor|aluno|ensino)\b/i,
  /\b(clima|ambiente|sustent|poluiç|desmat|amazôn|aquecimento)\b/i,
  /\b(tecnologia|intelig[êe]ncia artificial|ia |algoritmo|redes sociais|digital)\b/i,
  /\b(saúde|mental|depressão|ansiedade|pandemia|sus)\b/i,
  /\b(desigualdade|pobreza|racism|preconceito|violência contra|feminic|gênero|lgbt)\b/i,
  /\b(democr|política|eleição|direito|cidadania|constituç)\b/i,
  /\b(cultura|leitura|literatura|patrimônio|indígena|quilomb)\b/i,
  /\b(trabalho|emprego|aposentadoria|reforma)\b/i,
  /\b(fake news|desinformação|liberdade de expressão)\b/i,
];

// ---------- env ----------
function carregarEnv() {
  const envPath = ".env.local";
  if (!existsSync(envPath)) return;
  const linhas = readFileSync(envPath, "utf-8").split("\n");
  for (const linha of linhas) {
    const m = linha.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
carregarEnv();

if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes("COLE_SUA_KEY")) {
  console.error("Erro: GEMINI_API_KEY não configurada em .env.local");
  process.exit(1);
}

// ---------- RSS ----------
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  cdataPropName: "__cdata",
});

function limparTexto(s) {
  if (!s) return "";
  if (typeof s === "object") s = s.__cdata || s["#text"] || "";
  return String(s)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#\d+;/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function buscarFeed(feed) {
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": "Mozilla/5.0 (Gabarita ENEM tema-generator)" },
    });
    if (!res.ok) {
      console.warn(`  ✗ ${feed.fonte}: HTTP ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const json = parser.parse(xml);
    const items = json?.rss?.channel?.item ?? json?.feed?.entry ?? [];
    const arr = Array.isArray(items) ? items : [items];
    return arr.slice(0, MAX_NOTICIAS_POR_FEED).map((it) => ({
      fonte: feed.fonte,
      titulo: limparTexto(it.title),
      resumo: limparTexto(it.description || it.summary || ""),
      url: typeof it.link === "string" ? it.link : it.link?.["@_href"] || "",
      dataPub: it.pubDate || it.published || "",
    })).filter((n) => n.titulo && n.titulo.length > 10);
  } catch (err) {
    console.warn(`  ✗ ${feed.fonte}: ${err.message}`);
    return [];
  }
}

function pontuarNoticia(n) {
  const texto = `${n.titulo} ${n.resumo}`;
  if (BLOCKLIST.some((re) => re.test(texto))) return -100;
  let score = 0;
  for (const re of ENEM_FRIENDLY) if (re.test(texto)) score += 2;
  if (n.resumo.length > 80) score += 1;
  return score;
}

// ---------- Gemini ----------
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `Você é um professor especialista em redação do ENEM. Sua tarefa é transformar uma notícia atual em uma proposta de redação no estilo oficial do ENEM.

REGRAS DO FORMATO ENEM:
- Tema dissertativo-argumentativo sobre problema social, ambiental, cultural, científico ou político brasileiro.
- O tema deve ser FORMULADO como: "Desafios para [fazer algo] no Brasil" / "[Tema] na sociedade brasileira" / "Caminhos para [superar algo]" — sempre focado no Brasil.
- 3 textos motivadores curtos (cada um 60-120 palavras), baseados na notícia fornecida, mas reescritos com suas palavras — NÃO copie verbatim. Podem ser: (I) fato/contexto, (II) dado/estatística/citação plausível, (III) outra perspectiva.
- Comando final padrão do ENEM, pedindo dissertação com proposta de intervenção respeitando DH.

Retorne APENAS JSON válido, sem markdown fences, sem comentários, neste formato exato:
{
  "tema": "Título do tema",
  "areaFoco": "sociedade|meio_ambiente|tecnologia|educacao|saude|cultura|politica",
  "palavrasChave": ["palavra1","palavra2","palavra3"],
  "textosMotivadores": [
    {"rotulo":"Texto I","conteudo":"..."},
    {"rotulo":"Texto II","conteudo":"..."},
    {"rotulo":"Texto III","conteudo":"..."}
  ],
  "comando": "A partir da leitura dos textos motivadores e com base nos conhecimentos construídos ao longo de sua formação, redija texto dissertativo-argumentativo em modalidade escrita formal da língua portuguesa sobre o tema \\"...\\", apresentando proposta de intervenção que respeite os direitos humanos. Selecione, organize e relacione, de forma coerente e coesa, argumentos e fatos para defesa de seu ponto de vista."
}`;

// Avalia em lote quais notícias rendem bom tema ENEM. Uma única chamada.
// Retorna array com os índices (0-based) das notícias aprovadas, em ordem de qualidade.
async function curarNoticias(candidatas, quantasAprovar) {
  if (candidatas.length === 0) return [];
  const lista = candidatas
    .map((n, i) => `${i}. [${n.fonte}] ${n.titulo}\n   ${n.resumo.slice(0, 220)}`)
    .join("\n\n");

  const systemCurador = `Você é um professor de redação do ENEM com 20 anos de experiência. Sua tarefa é selecionar, entre notícias jornalísticas recentes, aquelas que rendem os melhores temas de redação no formato ENEM.

CRITÉRIOS DE APROVAÇÃO (uma notícia precisa atender a todos):
1. Trata de problema social, ambiental, cultural, científico ou político brasileiro/global com impacto no Brasil.
2. Permite discussão com proposta de intervenção respeitando direitos humanos.
3. Não é fofoca, crime pontual, esporte, celebridade, nem política partidária acirrada.
4. Tem profundidade conceitual suficiente — evita notícias rasas, promocionais ou puramente factuais.
5. NÃO banaliza tragédia individual (assassinato específico, desaparecimento, acidente).

Retorne APENAS um JSON válido no formato:
{"aprovadas": [<indice1>, <indice2>, ...], "justificativa": "breve explicação em 1 frase sobre critérios aplicados"}

Os índices devem estar em ordem decrescente de qualidade (melhor primeiro). Retorne no máximo ${quantasAprovar} índices.`;

  try {
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `CANDIDATAS:\n\n${lista}\n\nSelecione as ${quantasAprovar} melhores.`,
      config: {
        systemInstruction: systemCurador,
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });
    const j = JSON.parse(res.text);
    const aprovadas = Array.isArray(j?.aprovadas) ? j.aprovadas : [];
    return aprovadas
      .filter((i) => Number.isInteger(i) && i >= 0 && i < candidatas.length)
      .slice(0, quantasAprovar);
  } catch (err) {
    console.warn(`  (curadoria falhou: ${err.message} — usando ordem de pontuação)`);
    return candidatas.map((_, i) => i).slice(0, quantasAprovar);
  }
}

async function gerarTema(noticia, tentativa = 0) {
  const prompt = `NOTÍCIA DE ORIGEM (use como inspiração, reescreva com suas palavras):

Fonte: ${noticia.fonte}
Título: ${noticia.titulo}
Resumo: ${noticia.resumo}

Transforme em proposta de redação ENEM seguindo o formato exigido.`;

  try {
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.8,
        responseMimeType: "application/json",
      },
    });

    const texto = res.text;
    try {
      return JSON.parse(texto);
    } catch {
      const m = texto.match(/\{[\s\S]*\}/);
      if (m) return JSON.parse(m[0]);
      throw new Error(`JSON inválido: ${texto.slice(0, 200)}`);
    }
  } catch (err) {
    const msg = err.message || String(err);
    // 429 com retryDelay: espera e tenta 1x (503 também: sobrecarga temporária)
    if (tentativa < 1 && /429|503|RESOURCE_EXHAUSTED|UNAVAILABLE/i.test(msg)) {
      const m = msg.match(/retry in (\d+(?:\.\d+)?)s/i);
      const esperaMs = m ? Math.min(Math.ceil(Number(m[1]) * 1000) + 1000, 65000) : 30000;
      process.stdout.write(`(aguarda ${Math.round(esperaMs / 1000)}s) `);
      await new Promise((r) => setTimeout(r, esperaMs));
      return gerarTema(noticia, tentativa + 1);
    }
    throw err;
  }
}

// ---------- main ----------
function slugify(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function main() {
  console.log("📰 Buscando notícias...");
  const todas = [];
  for (const feed of FEEDS) {
    const items = await buscarFeed(feed);
    console.log(`  ✓ ${feed.fonte}: ${items.length} itens`);
    todas.push(...items);
  }
  console.log(`Total: ${todas.length} notícias`);

  console.log("\n🔎 Filtrando e pontuando...");
  // Deduplica por título normalizado
  const vistos = new Set();
  const unicas = todas.filter((n) => {
    const chave = n.titulo.toLowerCase().replace(/[^\wàáâãéêíóôõúç ]/gi, "").slice(0, 60);
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
  console.log(`Após deduplicação: ${unicas.length} notícias únicas`);

  const pontuadas = unicas
    .map((n) => ({ ...n, score: pontuarNoticia(n) }))
    .filter((n) => n.score > 0)
    .sort((a, b) => b.score - a.score);
  console.log(`Após filtro: ${pontuadas.length} notícias ENEM-friendly`);

  // Top candidatas — vamos pedir ao Gemini curar as 40 melhores (1 chamada)
  // e depois gerar tema completo só pras NUM_TEMAS aprovadas.
  const CANDIDATAS_PARA_CURAR = Math.min(pontuadas.length, 40);
  const preSelecionadas = [];
  const contFonte = {};
  for (const n of pontuadas) {
    const c = contFonte[n.fonte] || 0;
    if (c >= 6) continue;
    preSelecionadas.push(n);
    contFonte[n.fonte] = c + 1;
    if (preSelecionadas.length >= CANDIDATAS_PARA_CURAR) break;
  }
  console.log(`Pré-selecionadas: ${preSelecionadas.length}`);

  console.log("\n🧐 Curando candidatas via Gemini (1 chamada)...");
  const indicesAprovados = await curarNoticias(preSelecionadas, NUM_TEMAS);
  const selecionadas = indicesAprovados.map((i) => preSelecionadas[i]);
  console.log(`Aprovadas pela curadoria: ${selecionadas.length}`);

  console.log("\n🤖 Gerando temas via Gemini...");
  const temas = [];
  for (let i = 0; i < selecionadas.length; i++) {
    const n = selecionadas[i];
    process.stdout.write(`  [${i + 1}/${selecionadas.length}] ${n.titulo.slice(0, 60)}... `);
    try {
      const tema = await gerarTema(n);
      temas.push({
        id: `tema-${Date.now()}-${slugify(tema.tema)}`,
        tema: tema.tema,
        areaFoco: tema.areaFoco,
        palavrasChave: tema.palavrasChave,
        textosMotivadores: tema.textosMotivadores,
        comando: tema.comando,
        origem: { fonte: n.fonte, titulo: n.titulo, url: n.url },
        geradoEm: new Date().toISOString(),
      });
      console.log("✓");
      await new Promise((r) => setTimeout(r, 500)); // respeita rate limit
    } catch (err) {
      console.log(`✗ ${err.message}`);
    }
  }

  // Estratégia: merge novos + banco existente + evergreen (fallback).
  // Prioridade: temas novos > banco anterior > evergreen curados.
  // Piso mínimo de 15 temas no banco final (senão adiciona evergreens).
  const MAX_BANCO = 40;
  const PISO_BANCO = 15;
  const OUT_PATH = "src/data/temas.json";
  const EVERGREEN_PATH = "src/data/temas-evergreen.json";

  let existentes = [];
  try {
    existentes = JSON.parse(readFileSync(OUT_PATH, "utf-8"));
    if (!Array.isArray(existentes)) existentes = [];
  } catch {
    existentes = [];
  }

  let evergreen = [];
  try {
    evergreen = JSON.parse(readFileSync(EVERGREEN_PATH, "utf-8"));
    if (!Array.isArray(evergreen)) evergreen = [];
  } catch {
    evergreen = [];
  }

  const temEvergreenFallback = evergreen.length > 0;

  if (temas.length === 0 && existentes.length < PISO_BANCO && !temEvergreenFallback) {
    console.error(`\n✗ Nenhum tema novo gerado e banco existente (${existentes.length}) abaixo do piso. Abortando sem sobrescrever.`);
    process.exit(1);
  }

  // Dedup por tema normalizado (primeiras 50 chars, lowercase)
  const chaveTema = (t) => (t.tema || "").toLowerCase().slice(0, 50);
  const vistosTemas = new Set();
  const mesclados = [];

  const adicionar = (arr) => {
    for (const t of arr) {
      if (mesclados.length >= MAX_BANCO) return;
      const k = chaveTema(t);
      if (vistosTemas.has(k)) continue;
      vistosTemas.add(k);
      mesclados.push(t);
    }
  };

  adicionar(temas);      // 1º novos
  adicionar(existentes); // 2º banco anterior
  if (mesclados.length < PISO_BANCO) {
    adicionar(evergreen); // 3º evergreen só se necessário
  }

  const qtdEvergreen = mesclados.filter((t) =>
    t.id?.startsWith?.("evergreen-")
  ).length;
  const qtdNovos = temas.length;
  const qtdPreservados = mesclados.length - qtdNovos - qtdEvergreen;

  console.log(`\n💾 Salvando ${mesclados.length} temas em ${OUT_PATH}`);
  console.log(
    `   (${qtdNovos} novos + ${qtdPreservados} do banco anterior + ${qtdEvergreen} evergreen)`
  );
  writeFileSync(OUT_PATH, JSON.stringify(mesclados, null, 2), "utf-8");
  console.log("Pronto.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
