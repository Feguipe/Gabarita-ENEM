"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadCurrent, calculateScore, clearCurrent } from "@/lib/simulation-store";
import type { Simulation } from "@/lib/types";
import { QuestionBody, AlternativeContent } from "@/components/QuestionBody";
import { AppHeader } from "@/components/AppHeader";

function fmtMs(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

const AREA_LABEL: Record<string, string> = {
  linguagens: "Linguagens",
  humanas: "Humanas",
  natureza: "Natureza",
  matematica: "Matemática",
};

export default function ResultadoPage() {
  const router = useRouter();
  const [sim, setSim] = useState<Simulation | null>(null);
  const [expandidas, setExpandidas] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const s = loadCurrent();
    if (!s) {
      router.replace("/");
      return;
    }
    setSim(s);
  }, [router]);

  if (!sim) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p style={{ color: "var(--color-ink-3)" }}>Carregando…</p>
      </main>
    );
  }

  const score = calculateScore(sim);
  const duracao = (sim.finishedAt ?? sim.startedAt) - sim.startedAt;

  const voltar = () => {
    clearCurrent();
    router.push("/");
  };

  return (
    <>
      <AppHeader />
      <main className="flex-1 px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="serif text-3xl md:text-4xl font-semibold mb-2">
                Resultado do simulado
              </h1>
              <p style={{ color: "var(--color-ink-2)" }}>
                Status:{" "}
                <span
                  className="font-semibold"
                  style={{ color: "var(--color-ink)" }}
                >
                  {sim.status === "finalizado" && "Finalizado"}
                  {sim.status === "interrompido_tempo" && "Tempo esgotado"}
                  {sim.status === "interrompido_saida" && "Interrompido"}
                  {sim.status === "em_andamento" && "Em andamento"}
                </span>
              </p>
            </div>
            <CompartilharResultado
              acertos={score.acertos}
              total={score.total}
              percentual={score.percentual}
            />
          </header>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <Card label="Acertos" value={`${score.acertos}/${score.total}`} />
            <Card label="Aproveitamento" value={`${score.percentual.toFixed(1)}%`} />
            <Card label="Duração total" value={fmtMs(duracao)} />
            <Card label="Tempo médio/questão" value={fmtMs(score.tempoMedioMs)} />
          </div>

          {sim.anticheatEvents.length > 0 && (
            <div
              className="rounded-lg border p-4 mb-8"
              style={{
                background: "var(--color-warn-soft)",
                borderColor: "var(--color-warn)",
              }}
            >
              <h3
                className="text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: "var(--color-warn)" }}
              >
                Eventos de auditoria ({sim.anticheatEvents.length})
              </h3>
              <ul
                className="text-xs space-y-1 max-h-32 overflow-y-auto"
                style={{ color: "var(--color-ink-2)" }}
              >
                {sim.anticheatEvents.map((ev, i) => (
                  <li key={i}>
                    [{fmtMs(ev.elapsedMs)}] {ev.type}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <h2 className="serif text-2xl font-semibold mb-4">Revisão das questões</h2>
          <div className="space-y-3 mb-8">
            {sim.questions.map((q, idx) => {
              const a = sim.answers[q.id];
              const correta = q.alternativas.find((x) => x.correta);
              const acertou = !!correta && a.letraEscolhida === correta.letra;
              const naoRespondida = a.letraEscolhida === null;
              const aberto = expandidas[q.id];

              const borderColor = naoRespondida
                ? "var(--color-line-strong)"
                : acertou
                ? "var(--color-ok)"
                : "var(--color-err)";

              return (
                <div
                  key={q.id}
                  className="rounded-lg overflow-hidden border"
                  style={{
                    borderColor,
                    background: "var(--color-paper)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setExpandidas({ ...expandidas, [q.id]: !aberto })}
                    className="w-full p-4 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{
                          background: naoRespondida
                            ? "var(--color-paper-2)"
                            : acertou
                            ? "var(--color-ok)"
                            : "var(--color-err)",
                          color: naoRespondida
                            ? "var(--color-ink-2)"
                            : "white",
                        }}
                        aria-label={
                          acertou ? "Acerto" : naoRespondida ? "Em branco" : "Erro"
                        }
                      >
                        {naoRespondida ? "–" : acertou ? "✓" : "✗"}
                      </span>
                      <div>
                        <div
                          className="text-sm font-semibold flex items-center gap-2 flex-wrap"
                          style={{ color: "var(--color-ink)" }}
                        >
                          <span>Questão {idx + 1}</span>
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide"
                            style={{
                              background: "var(--color-accent)",
                              color: "white",
                            }}
                          >
                            ENEM {q.ano}
                          </span>
                          {q.index && (
                            <span
                              className="text-xs"
                              style={{ color: "var(--color-ink-3)" }}
                            >
                              Q{q.index}
                            </span>
                          )}
                        </div>
                        <div
                          className="text-xs mt-0.5"
                          style={{ color: "var(--color-ink-3)" }}
                        >
                          {AREA_LABEL[q.area] ?? q.area} · {fmtMs(a.tempoGastoMs)}
                        </div>
                      </div>
                    </div>
                    <span style={{ color: "var(--color-ink-3)" }}>
                      {aberto ? "▲" : "▼"}
                    </span>
                  </button>

                  {aberto && (
                    <div
                      className="border-t p-5 space-y-4"
                      style={{ borderColor: "var(--color-line)" }}
                    >
                      <QuestionBody question={q} />
                      <div className="space-y-2">
                        {q.alternativas.map((alt) => {
                          const suaEscolha = a.letraEscolhida === alt.letra;
                          const ehCorreta = alt.correta;
                          const bg = ehCorreta
                            ? "var(--color-ok-soft)"
                            : suaEscolha
                            ? "var(--color-err-soft)"
                            : "var(--color-paper-2)";
                          const bc = ehCorreta
                            ? "var(--color-ok)"
                            : suaEscolha
                            ? "var(--color-err)"
                            : "var(--color-line)";
                          return (
                            <div
                              key={alt.letra}
                              className="p-3 rounded-md border"
                              style={{ background: bg, borderColor: bc }}
                            >
                              <div className="flex gap-2 items-start">
                                <span
                                  className="font-semibold"
                                  style={{ color: "var(--color-ink)" }}
                                >
                                  {alt.letra})
                                </span>
                                <div className="flex-1">
                                  <AlternativeContent
                                    texto={alt.texto}
                                    imagem={alt.imagem}
                                  />
                                </div>
                                {ehCorreta && (
                                  <span
                                    className="text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap"
                                    style={{ color: "var(--color-ok)" }}
                                  >
                                    Correta
                                  </span>
                                )}
                                {suaEscolha && !ehCorreta && (
                                  <span
                                    className="text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap"
                                    style={{ color: "var(--color-err)" }}
                                  >
                                    Sua resposta
                                  </span>
                                )}
                              </div>
                              {suaEscolha && !ehCorreta && alt.explicacaoDistrator && (
                                <p
                                  className="text-xs mt-2 pl-6"
                                  style={{ color: "var(--color-err)" }}
                                >
                                  {alt.explicacaoDistrator}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div
                        className="rounded-md border p-4"
                        style={{
                          background: "var(--color-accent-soft)",
                          borderColor: "var(--color-accent)",
                        }}
                      >
                        <h4
                          className="text-xs font-semibold uppercase tracking-widest mb-2"
                          style={{ color: "var(--color-accent)" }}
                        >
                          Resolução
                        </h4>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "var(--color-ink)" }}
                        >
                          {q.resolucao}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button type="button" onClick={voltar} className="btn-primary">
            Novo simulado
          </button>
        </div>
      </main>
    </>
  );
}

function CompartilharResultado({
  acertos,
  total,
  percentual,
}: {
  acertos: number;
  total: number;
  percentual: number;
}) {
  const [feedback, setFeedback] = useState<"copiado" | null>(null);

  const texto = `Fiz um simulado no Gabarita: ${acertos}/${total} acertos (${percentual.toFixed(
    1
  )}%).\n\nTreine ENEM grátis em https://gabarita-enem.vercel.app`;

  const handleClick = async () => {
    const shareData: ShareData = {
      title: "Meu resultado no Gabarita",
      text: texto,
      url: "https://gabarita-enem.vercel.app",
    };
    try {
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        navigator.canShare?.(shareData) !== false
      ) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // usuário cancelou ou API indisponível — cai pro clipboard
    }
    try {
      await navigator.clipboard.writeText(texto);
      setFeedback("copiado");
      setTimeout(() => setFeedback(null), 2200);
    } catch {
      // último fallback: nada
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="btn-ghost text-sm whitespace-nowrap"
      title="Compartilhar resultado"
    >
      {feedback === "copiado" ? "✓ Copiado" : "Compartilhar"}
    </button>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div
        className="text-xs uppercase tracking-widest"
        style={{ color: "var(--color-ink-3)" }}
      >
        {label}
      </div>
      <div
        className="serif text-2xl font-semibold mt-1"
        style={{ color: "var(--color-ink)" }}
      >
        {value}
      </div>
    </div>
  );
}
