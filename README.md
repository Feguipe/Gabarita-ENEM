# Gabarita — Simulador de ENEM

App para praticar o ENEM: 1.800+ questões oficiais com simulado cronometrado, anti-cola e revisão detalhada; geração de redações dissertativas a partir de notícias atuais com exportação em PDF.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind v4
- localStorage para persistência
- Gemini (Google AI Studio) — usado apenas no pipeline offline de geração de temas

## Rodando localmente

```bash
npm install
npm run dev
```

Abra http://localhost:3000

## Módulos

### Simulado

Banco de questões em `src/data/questions.json`, importadas do [enem.dev](https://enem.dev) via `scripts/import-enem.mjs`. Cada simulado tem anti-cola (bloqueia copy/paste/Alt+Tab/botão direito) e revisão completa ao final.

### Redação

Temas ENEM gerados a partir de notícias reais (RSS de G1, Folha e BBC Brasil), em `src/data/temas.json`. Editor com mesmo anti-cola + bloqueio estrito de paste. Exportação em PDF com proposta, redação e ficha de correção das 5 competências.

## Atualizando o banco de temas

Temas são atualizados **automaticamente toda segunda-feira** via GitHub Actions (`.github/workflows/gerar-temas.yml`).

Para rodar manualmente (local ou na UI do GitHub Actions → "Run workflow"):

```bash
# configure GEMINI_API_KEY em .env.local (não commitado)
npm run gerar-temas
```

O script:

1. Busca notícias de RSS públicos
2. Filtra por temas ENEM-friendly e descarta sensacionalismo/fofoca
3. Deduplica
4. Envia cada notícia ao Gemini 2.5 Flash (free tier) para gerar a proposta no formato ENEM
5. Salva em `src/data/temas.json`

**Custo em produção: zero.** A geração roda offline (na sua máquina ou nos servidores do GitHub Actions), e o app em produção só lê JSON estático.

## Deploy

Projeto estático Next.js — deploy em Vercel, Netlify ou similar. Nenhuma variável de ambiente é necessária em produção.

## Secrets (GitHub Actions)

Para o workflow semanal funcionar, configure em `Settings → Secrets and variables → Actions`:

- `GEMINI_API_KEY` — chave do Google AI Studio (https://aistudio.google.com/apikey)
