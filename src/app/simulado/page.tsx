"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  loadCurrent,
  saveCurrent,
  archiveSimulation,
} from "@/lib/simulation-store";
import { useAntiCheat } from "@/lib/use-anticheat";
import type { Simulation, AntiCheatEvent } from "@/lib/types";
import { QuestionBody, AlternativeContent } from "@/components/QuestionBody";

function formatTime(ms: number): string {
  if (ms < 0) ms = 0;
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const AREA_LABEL: Record<string, string> = {
  linguagens: "Linguagens",
  humanas: "Humanas",
  natureza: "Natureza",
  matematica: "Matemática",
};

export default function SimuladoPage() {
  const router = useRouter();
  const [sim, setSim] = useState<Simulation | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [lastViolation, setLastViolation] = useState<AntiCheatEvent | null>(null);
  const simRef = useRef<Simulation | null>(null);
  const questionEnterRef = useRef<number>(0);

  useEffect(() => {
    const s = loadCurrent();
    if (!s || s.status !== "em_andamento") {
      router.replace("/");
      return;
    }
    setSim(s);
    simRef.current = s;
    questionEnterRef.current = Date.now();
  }, [router]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const update = useCallback((updater: (s: Simulation) => Simulation) => {
    setSim((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      simRef.current = next;
      saveCurrent(next);
      return next;
    });
  }, []);

  const finalizar = useCallback(
    (status: Simulation["status"], extraEvent?: AntiCheatEvent) => {
      const current = simRef.current;
      if (!current) return;
      const finalized: Simulation = {
        ...current,
        status,
        finishedAt: Date.now(),
        anticheatEvents: extraEvent
          ? [...current.anticheatEvents, extraEvent]
          : current.anticheatEvents,
      };
      saveCurrent(finalized);
      archiveSimulation(finalized);
      simRef.current = finalized;
      if (status === "interrompido_saida") {
        router.replace("/interrompido");
      } else {
        router.replace("/resultado");
      }
    },
    [router]
  );

  const handleViolation = useCallback((ev: AntiCheatEvent) => {
    setLastViolation(ev);
    setSim((prev) => {
      if (!prev) return prev;
      const next = { ...prev, anticheatEvents: [...prev.anticheatEvents, ev] };
      simRef.current = next;
      saveCurrent(next);
      return next;
    });
    setTimeout(() => setLastViolation(null), 2500);
  }, []);

  const handleInterrupt = useCallback(
    (ev: AntiCheatEvent) => {
      finalizar("interrompido_saida", ev);
    },
    [finalizar]
  );

  useAntiCheat({
    enabled: !!sim && sim.status === "em_andamento",
    startedAt: sim?.startedAt ?? 0,
    onViolation: handleViolation,
    onInterrupt: handleInterrupt,
    graceMs: 2500,
  });

  if (!sim) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p style={{ color: "var(--color-ink-3)" }}>Carregando…</p>
      </main>
    );
  }

  const tempoDecorridoMs = now - sim.startedAt;
  const questaoAtual = sim.questions[sim.currentIndex];
  const respostaAtual = sim.answers[questaoAtual.id];
  const total = sim.questions.length;
  const isUltima = sim.currentIndex === total - 1;

  const registrarTempoAtual = (s: Simulation): Simulation => {
    const delta = Date.now() - questionEnterRef.current;
    const a = s.answers[questaoAtual.id];
    return {
      ...s,
      answers: {
        ...s.answers,
        [questaoAtual.id]: { ...a, tempoGastoMs: a.tempoGastoMs + delta },
      },
    };
  };

  const escolherAlternativa = (letra: string) => {
    update((s) => {
      const a = s.answers[questaoAtual.id];
      return {
        ...s,
        answers: {
          ...s.answers,
          [questaoAtual.id]: { ...a, letraEscolhida: letra },
        },
      };
    });
  };

  const toggleRevisao = () => {
    update((s) => {
      const a = s.answers[questaoAtual.id];
      return {
        ...s,
        answers: {
          ...s.answers,
          [questaoAtual.id]: { ...a, marcadaRevisao: !a.marcadaRevisao },
        },
      };
    });
  };

  const irPara = (idx: number) => {
    if (idx < 0 || idx >= total) return;
    update((s) => {
      const withTime = registrarTempoAtual(s);
      questionEnterRef.current = Date.now();
      return { ...withTime, currentIndex: idx };
    });
  };

  const proxima = () => irPara(sim.currentIndex + 1);
  const anterior = () => irPara(sim.currentIndex - 1);

  const entregar = () => {
    if (!confirm("Deseja finalizar o simulado? Esta ação não pode ser desfeita.")) return;
    const final = registrarTempoAtual(simRef.current!);
    simRef.current = final;
    saveCurrent(final);
    finalizar("finalizado");
  };

  const respondidas = sim.questions.filter(
    (q) => sim.answers[q.id].letraEscolhida !== null
  ).length;

  return (
    <div
      className="simulado-active flex-1 flex flex-col"
      style={{ background: "var(--color-paper-2)" }}
    >
      {lastViolation && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-md shadow-lg z-50 text-sm"
          style={{ background: "var(--color-err)", color: "white" }}
        >
          Ação bloqueada: {descreverViolacao(lastViolation.type)}
        </div>
      )}

      <header
        className="border-b px-6 py-3 flex items-center justify-between"
        style={{
          background: "var(--color-paper)",
          borderColor: "var(--color-line)",
        }}
      >
        <div className="flex items-center gap-4">
          <span
            className="serif text-lg font-semibold"
            style={{ color: "var(--color-ink)" }}
          >
            Gabarita
          </span>
          <span className="text-sm" style={{ color: "var(--color-ink-2)" }}>
            Questão{" "}
            <span
              className="font-semibold"
              style={{ color: "var(--color-ink)" }}
            >
              {sim.currentIndex + 1}
            </span>{" "}
            de {total}
          </span>
        </div>
        <div
          className="flex items-center gap-2"
          style={{ color: "var(--color-ink-2)" }}
        >
          <span
            className="text-xs uppercase tracking-widest"
            style={{ color: "var(--color-ink-3)" }}
          >
            Tempo
          </span>
          <span
            className="text-xl font-mono font-semibold tabular-nums"
            style={{ color: "var(--color-ink)" }}
          >
            {formatTime(tempoDecorridoMs)}
          </span>
        </div>
        <div className="text-sm" style={{ color: "var(--color-ink-2)" }}>
          Respondidas:{" "}
          <span
            className="font-semibold"
            style={{ color: "var(--color-ink)" }}
          >
            {respondidas}/{total}
          </span>
        </div>
      </header>

      <main className="flex-1 flex min-h-0">
        <aside
          className="w-52 border-r p-4 overflow-y-auto"
          style={{
            background: "var(--color-paper)",
            borderColor: "var(--color-line)",
          }}
        >
          <h3
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "var(--color-ink-3)" }}
          >
            Navegação
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {sim.questions.map((q, i) => {
              const a = sim.answers[q.id];
              const atual = i === sim.currentIndex;
              const respondida = a.letraEscolhida !== null;
              const marcada = a.marcadaRevisao;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => irPara(i)}
                  className="relative w-10 h-10 rounded-md text-sm font-semibold border transition-colors"
                  style={{
                    background: atual
                      ? "var(--color-accent)"
                      : respondida
                      ? "var(--color-accent-soft)"
                      : "transparent",
                    color: atual
                      ? "white"
                      : respondida
                      ? "var(--color-accent)"
                      : "var(--color-ink-2)",
                    borderColor: atual
                      ? "var(--color-accent)"
                      : "var(--color-line)",
                  }}
                >
                  {i + 1}
                  {marcada && (
                    <span
                      className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2"
                      style={{
                        background: "var(--color-warn)",
                        borderColor: "var(--color-paper)",
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide"
                style={{
                  background: "var(--color-accent)",
                  color: "white",
                }}
              >
                ENEM {questaoAtual.ano}
              </span>
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border"
                style={{
                  borderColor: "var(--color-line-strong)",
                  color: "var(--color-ink-2)",
                }}
              >
                {AREA_LABEL[questaoAtual.area] ?? questaoAtual.area}
              </span>
              {questaoAtual.language && (
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border capitalize"
                  style={{
                    borderColor: "var(--color-line-strong)",
                    color: "var(--color-ink-2)",
                  }}
                >
                  {questaoAtual.language}
                </span>
              )}
              {questaoAtual.index && (
                <span
                  className="text-xs ml-auto"
                  style={{ color: "var(--color-ink-3)" }}
                >
                  Questão {questaoAtual.index} da prova
                </span>
              )}
            </div>

            <div className="card p-6 mb-6">
              <QuestionBody question={questaoAtual} />
            </div>

            <div className="space-y-2">
              {questaoAtual.alternativas.map((alt) => {
                const selecionada = respostaAtual.letraEscolhida === alt.letra;
                return (
                  <button
                    key={alt.letra}
                    type="button"
                    onClick={() => escolherAlternativa(alt.letra)}
                    className="w-full text-left p-4 rounded-lg border transition-colors"
                    style={{
                      borderColor: selecionada
                        ? "var(--color-accent)"
                        : "var(--color-line)",
                      background: selecionada
                        ? "var(--color-accent-soft)"
                        : "var(--color-paper)",
                    }}
                  >
                    <div className="flex gap-3">
                      <span
                        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm"
                        style={{
                          background: selecionada
                            ? "var(--color-accent)"
                            : "var(--color-paper-2)",
                          color: selecionada
                            ? "white"
                            : "var(--color-ink-2)",
                        }}
                      >
                        {alt.letra}
                      </span>
                      <div className="flex-1 pt-1">
                        <AlternativeContent texto={alt.texto} imagem={alt.imagem} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <footer
        className="border-t px-6 py-3 flex items-center justify-between"
        style={{
          background: "var(--color-paper)",
          borderColor: "var(--color-line)",
        }}
      >
        <button
          type="button"
          onClick={anterior}
          disabled={sim.currentIndex === 0}
          className="btn-ghost disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Anterior
        </button>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggleRevisao}
            className="px-4 py-2 rounded-md text-sm border transition-colors"
            style={{
              borderColor: respostaAtual.marcadaRevisao
                ? "var(--color-warn)"
                : "var(--color-line-strong)",
              background: respostaAtual.marcadaRevisao
                ? "var(--color-warn-soft)"
                : "transparent",
              color: respostaAtual.marcadaRevisao
                ? "var(--color-warn)"
                : "var(--color-ink-2)",
            }}
          >
            {respostaAtual.marcadaRevisao ? "★ Marcada" : "☆ Marcar para revisão"}
          </button>

          <button
            type="button"
            onClick={entregar}
            className="px-4 py-2 rounded-md text-sm font-medium border"
            style={{
              borderColor: "var(--color-ok)",
              background: "var(--color-ok)",
              color: "white",
            }}
          >
            Finalizar
          </button>
        </div>

        <button
          type="button"
          onClick={proxima}
          disabled={isUltima}
          className="btn-primary disabled:opacity-40"
        >
          Próxima →
        </button>
      </footer>
    </div>
  );
}

function descreverViolacao(tipo: AntiCheatEvent["type"]): string {
  switch (tipo) {
    case "copy_attempt":
      return "copiar está desabilitado";
    case "paste_attempt":
      return "colar está desabilitado";
    case "context_menu":
      return "menu de contexto desabilitado";
    case "devtools_shortcut":
      return "atalho bloqueado";
    default:
      return "ação não permitida";
  }
}
