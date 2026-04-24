"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import {
  contarLinhas,
  contarPalavras,
  loadRascunho,
  saveRascunho,
} from "@/lib/redacao-store";
import { useAntiCheat } from "@/lib/use-anticheat";
import temasData from "@/data/temas.json";
import type { AntiCheatEvent, RedacaoTema, RedacaoRascunho } from "@/lib/types";

const TEMAS = temasData as RedacaoTema[];

function EscreverInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const temaId = searchParams.get("tema");

  const tema = useMemo(
    () => TEMAS.find((t) => t.id === temaId) ?? null,
    [temaId]
  );

  const [rascunho, setRascunho] = useState<RedacaoRascunho | null>(null);
  const [mounted, setMounted] = useState(false);
  const [violacaoFlash, setViolacaoFlash] = useState<AntiCheatEvent | null>(null);
  const [encerrando, setEncerrando] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());
  const rascunhoRef = useRef<RedacaoRascunho | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Carrega rascunho inicial; se não existir, volta pro briefing
  useEffect(() => {
    if (!tema) return;
    const r = loadRascunho();
    if (!r || r.temaId !== tema.id || r.status !== "em_andamento") {
      router.replace(`/redacao/pre-redacao?tema=${encodeURIComponent(tema.id)}`);
      return;
    }
    setRascunho(r);
    rascunhoRef.current = r;
    setMounted(true);
  }, [tema, router]);

  // Autosave debounced
  useEffect(() => {
    if (!mounted || !rascunho) return;
    const id = setTimeout(() => {
      const atualizado = { ...rascunho, atualizadoEm: Date.now() };
      saveRascunho(atualizado);
      rascunhoRef.current = atualizado;
    }, 500);
    return () => clearTimeout(id);
  }, [rascunho, mounted]);

  // Cronômetro: atualiza a cada 1s quando há tempo limite
  useEffect(() => {
    if (!mounted || !rascunho?.tempoLimiteMin) return;
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [mounted, rascunho?.tempoLimiteMin]);

  // Auto-finaliza quando o tempo esgota
  const finalizarRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (!mounted || encerrando) return;
    const atual = rascunhoRef.current;
    if (!atual?.tempoLimiteMin) return;
    const decorrido = agora - atual.criadoEm;
    if (decorrido >= atual.tempoLimiteMin * 60_000) {
      finalizarRef.current();
    }
  }, [agora, mounted, encerrando]);

  const handleViolation = useCallback((ev: AntiCheatEvent) => {
    setViolacaoFlash(ev);
    const atual = rascunhoRef.current;
    if (atual) {
      const novo = {
        ...atual,
        anticheatEvents: [...atual.anticheatEvents, ev],
      };
      rascunhoRef.current = novo;
      saveRascunho(novo);
    }
    setTimeout(() => setViolacaoFlash(null), 2500);
  }, []);

  const handleInterrupt = useCallback(
    (ev: AntiCheatEvent) => {
      const atual = rascunhoRef.current;
      if (atual) {
        const novo: RedacaoRascunho = {
          ...atual,
          status: "interrompida_saida",
          atualizadoEm: Date.now(),
          finalizadoEm: Date.now(),
          anticheatEvents: [...atual.anticheatEvents, ev],
        };
        saveRascunho(novo);
        rascunhoRef.current = novo;
      }
      setEncerrando(true);
      router.replace("/redacao/interrompido");
    },
    [router]
  );

  useAntiCheat({
    enabled: mounted && !encerrando,
    startedAt: rascunho?.criadoEm ?? Date.now(),
    onViolation: handleViolation,
    onInterrupt: handleInterrupt,
    strictPaste: true,
  });

  const finalizar = useCallback(() => {
    const atual = rascunhoRef.current;
    if (!atual) return;
    const novo: RedacaoRascunho = {
      ...atual,
      status: "finalizada",
      finalizadoEm: Date.now(),
      atualizadoEm: Date.now(),
    };
    saveRascunho(novo);
    rascunhoRef.current = novo;
    setEncerrando(true);
    router.push("/redacao/finalizar");
  }, [router]);

  useEffect(() => {
    finalizarRef.current = finalizar;
  }, [finalizar]);

  if (!tema) {
    return (
      <>
        <AppHeader />
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="text-center">
            <p className="mb-4" style={{ color: "var(--color-ink-2)" }}>
              Tema não encontrado.
            </p>
            <button
              type="button"
              onClick={() => router.push("/redacao")}
              className="btn-primary"
            >
              Voltar para temas
            </button>
          </div>
        </main>
      </>
    );
  }

  if (!rascunho) {
    return (
      <>
        <AppHeader />
        <main className="flex-1 flex items-center justify-center">
          <p style={{ color: "var(--color-ink-3)" }}>Carregando…</p>
        </main>
      </>
    );
  }

  const linhas = contarLinhas(rascunho.texto);
  const palavras = contarPalavras(rascunho.texto);
  const caracteres = rascunho.texto.length;

  const tempoLimiteMs = (rascunho.tempoLimiteMin ?? 0) * 60_000;
  const decorridoMs = agora - rascunho.criadoEm;
  const restanteMs =
    tempoLimiteMs > 0 ? Math.max(0, tempoLimiteMs - decorridoMs) : null;

  const atualizarTexto = (t: string) => {
    setRascunho((prev) => (prev ? { ...prev, texto: t } : prev));
  };

  const bloquear = (e: React.SyntheticEvent) => {
    e.preventDefault();
  };

  return (
    <>
      <AppHeader />
      <main className="flex-1 px-4 md:px-6 py-4 md:py-8">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-4 lg:gap-6">
          <section
            className="rounded-lg border p-4 md:p-6 overflow-y-auto lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-6rem)]"
            style={{
              background: "var(--color-paper)",
              borderColor: "var(--color-line)",
            }}
            onCopy={bloquear}
            onCut={bloquear}
          >
            <div className="mb-4">
              <span
                className="inline-block text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: "var(--color-accent)" }}
              >
                Proposta de redação
              </span>
              <h1
                className="serif text-2xl font-semibold leading-snug"
                style={{ color: "var(--color-ink)" }}
              >
                {tema.tema}
              </h1>
            </div>

            <div
              className="space-y-4 text-sm leading-relaxed select-none"
              style={{ userSelect: "none" }}
            >
              {tema.textosMotivadores.map((tm, i) => (
                <div key={i}>
                  <div
                    className="text-xs font-semibold mb-1 uppercase tracking-widest"
                    style={{ color: "var(--color-ink-3)" }}
                  >
                    {tm.rotulo}
                  </div>
                  <p style={{ color: "var(--color-ink)" }}>{tm.conteudo}</p>
                </div>
              ))}
            </div>

            <div
              className="mt-6 pt-4 border-t text-sm leading-relaxed italic select-none"
              style={{
                borderColor: "var(--color-line)",
                color: "var(--color-ink-2)",
                userSelect: "none",
              }}
            >
              {tema.comando}
            </div>

            <div
              className="mt-4 text-xs"
              style={{ color: "var(--color-ink-3)" }}
            >
              Inspirado em: {tema.origem.fonte}
            </div>
          </section>

          <section className="flex flex-col">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "var(--color-ink-3)" }}
                >
                  Sua redação
                </span>
                {restanteMs !== null && (
                  <span
                    className="inline-flex items-center gap-1 font-mono text-sm px-2 py-0.5 rounded"
                    style={{
                      background:
                        restanteMs < 5 * 60_000
                          ? "var(--color-err-soft)"
                          : restanteMs < 15 * 60_000
                          ? "var(--color-warn-soft)"
                          : "var(--color-paper-2)",
                      color:
                        restanteMs < 5 * 60_000
                          ? "var(--color-err)"
                          : restanteMs < 15 * 60_000
                          ? "var(--color-warn)"
                          : "var(--color-ink-2)",
                      border: "1px solid var(--color-line)",
                    }}
                    title="Tempo restante"
                  >
                    ⏱ {fmtRestante(restanteMs)}
                  </span>
                )}
              </div>
              <div
                className="flex gap-3 text-xs font-mono"
                style={{ color: "var(--color-ink-2)" }}
              >
                <span>
                  Linhas:{" "}
                  <strong
                    style={{
                      color:
                        linhas >= 7 && linhas <= 30
                          ? "var(--color-ok)"
                          : "var(--color-ink)",
                    }}
                  >
                    {linhas}
                  </strong>
                  /30
                </span>
                <span className="hidden sm:inline">Palavras: {palavras}</span>
                <span className="hidden md:inline">
                  Caracteres: {caracteres}
                </span>
              </div>
            </div>

            <textarea
              ref={textareaRef}
              value={rascunho.texto}
              onChange={(e) => atualizarTexto(e.target.value)}
              onPaste={bloquear}
              onCopy={bloquear}
              onCut={bloquear}
              onDrop={bloquear}
              onContextMenu={bloquear}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Comece a escrever sua dissertação aqui. Copiar e colar estão bloqueados. Seu rascunho é salvo automaticamente."
              className="flex-1 rounded-lg border p-5 text-base leading-loose resize-none min-h-[500px] outline-none transition-colors focus:border-[var(--color-accent)]"
              style={{
                background: "var(--color-paper)",
                borderColor:
                  violacaoFlash?.type === "paste_attempt" ||
                  violacaoFlash?.type === "copy_attempt"
                    ? "var(--color-err)"
                    : "var(--color-line)",
                color: "var(--color-ink)",
                fontFamily:
                  '"Lora", ui-serif, Georgia, Cambria, "Times New Roman", serif',
              }}
            />

            {violacaoFlash && (
              <div
                className="mt-2 rounded-md px-3 py-2 text-xs"
                style={{
                  background: "var(--color-err-soft)",
                  color: "var(--color-err)",
                  border: "1px solid var(--color-err)",
                }}
              >
                {descreverViolacao(violacaoFlash.type)}
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => router.push("/redacao")}
                className="btn-ghost"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={finalizar}
                disabled={linhas < 5}
                className="btn-primary flex-1"
              >
                Finalizar e exportar PDF
              </button>
            </div>

            {linhas > 0 && linhas < 7 && (
              <p
                className="text-xs mt-2"
                style={{ color: "var(--color-ink-3)" }}
              >
                O ENEM espera entre 7 e 30 linhas. Você está em {linhas}.
              </p>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

function fmtRestante(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

function descreverViolacao(tipo: AntiCheatEvent["type"]): string {
  switch (tipo) {
    case "copy_attempt":
      return "Copiar está bloqueado na redação.";
    case "paste_attempt":
      return "Colar está bloqueado — a redação deve ser escrita por você.";
    case "context_menu":
      return "O menu do botão direito está desabilitado.";
    case "devtools_shortcut":
      return "Atalhos de ferramentas do navegador estão bloqueados.";
    default:
      return "Ação bloqueada.";
  }
}

export default function EscreverPage() {
  return (
    <Suspense fallback={null}>
      <EscreverInner />
    </Suspense>
  );
}
