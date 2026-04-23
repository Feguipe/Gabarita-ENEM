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

async function gerarTema(noticia) {
  const prompt = `NOTÍCIA DE ORIGEM (use como inspiração, reescreva com suas palavras):

Fonte: ${noticia.fonte}
Título: ${noticia.titulo}
Resumo: ${noticia.resumo}

Transforme em proposta de redação ENEM seguindo o formato exigido.`;

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
    // tenta extrair JSON dentro de fences
    const m = texto.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error(`JSON inválido: ${texto.slice(0, 200)}`);
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

  // Diversifica: pega top mas evita repetir fonte em sequência
  const selecionadas = [];
  const contFonte = {};
  for (const n of pontuadas) {
    const c = contFonte[n.fonte] || 0;
    if (c >= 4) continue;
    selecionadas.push(n);
    contFonte[n.fonte] = c + 1;
    if (selecionadas.length >= NUM_TEMAS) break;
  }
  console.log(`Selecionadas: ${selecionadas.length}`);

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

  console.log(`\n💾 Salvando ${temas.length} temas em src/data/temas.json`);
  writeFileSync("src/data/temas.json", JSON.stringify(temas, null, 2), "utf-8");
  console.log("Pronto.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
