"use client";

import { useEffect, useMemo, useState, use, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import {
  buscarSalaPorCodigo,
  getParticipanteLocal,
  listarParticipantes,
  questionsFromIds,
  atualizarParticipante,
} from "@/lib/sala-store";
import { QUESTIONS } from "@/lib/questions-data";
import { QuestionBody } from "@/components/QuestionBody";
import { useAntiCheat } from "@/lib/use-anticheat";
import type {
  AntiCheatEvent,
  ParticipanteSala,
  Question,
  Sala,
} from "@/lib/types";

type Etapa = "espera" | "simulado" | "ranking";

export default function AlunoSalaPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = use(params);
  const router = useRouter();

  const [sala, setSala] = useState<Sala | null>(null);
  const [participantes, setParticipantes] = useState<ParticipanteSala[]>([]);
  const [meuParticipanteId, setMeuParticipanteId] = useState<string | null>(null);
  const [meuNick, setMeuNick] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<Etapa>("espera");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Estado do simulado
  const [questoes, setQuestoes] = useState<Question[]>([]);
  const [indiceQuestao, setIndiceQuestao] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, string | null>>({});
  const [tempoQuestaoMs, setTempoQuestaoMs] = useState(0);
  const startedAtRef = useRef<number>(0);
  const questaoStartRef = useRef<number>(0);
  const tempoTotalRef = useRef<number>(0);
  const finalizadoRef = useRef(false);

  // Carrega dados locais (id + nick) e sala
  useEffect(() => {
    const local = getParticipanteLocal(codigo);
    if (!local) {
      router.replace(`/sala/entrar?codigo=${codigo}`);
      return;
    }
    setMeuParticipanteId(local.participanteId);
    setMeuNick(local.nickname);
  }, [codigo, router]);

  // Polling: sala + participantes (a cada 3s na espera, 5s rodando)
  useEffect(() => {
    if (!meuParticipanteId) return;
    let cancelled = false;
    const carregar = async () => {
      const s = await buscarSalaPorCodigo(codigo);
      if (cancelled) return;
      if (!s) {
        setErro("Sala não encontrada.");
        setLoading(false);
        return;
      }
      setSala(s);
      const p = await listarParticipantes(s.id);
      if (cancelled) return;
      setParticipantes(p);

      // Decisão de etapa baseada no status da sala
      if (s.status === "em_andamento" && etapa === "espera") {
        // Inicia simulado
        const qs = questionsFromIds(s.question_ids, QUESTIONS);
        setQuestoes(qs);
        startedAtRef.current = Date.now();
        questaoStartRef.current = Date.now();
        await atualizarParticipante(meuParticipanteId, {
          started_at: new Date().toISOString(),
        });
        setEtapa("simulado");
      }
      if (
        (s.status === "encerrada" || s.status === "expirada") &&
        etapa !== "ranking"
      ) {
        setEtapa("ranking");
      }
      setLoading(false);
    };
    carregar();
    const intervalo = etapa === "espera" ? 3000 : 5000;
    const id = setInterval(carregar, intervalo);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [codigo, meuParticipanteId, etapa]);

  // Cronômetro do tempo na questão atual
  useEffect(() => {
    if (etapa !== "simulado") return;
    questaoStartRef.current = Date.now();
    setTempoQuestaoMs(0);
    const id = setInterval(() => {
      setTempoQuestaoMs(Date.now() - questaoStartRef.current);
    }, 500);
    return () => clearInterval(id);
  }, [etapa, indiceQuestao]);

  const finalizarSimulado = useCallback(
    async (motivo: "completo" | "anti_cheat" = "completo") => {
      if (finalizadoRef.current || !meuParticipanteId || !sala) return;
      finalizadoRef.current = true;

      // Calcula acertos finais
      const corretas = questoes.filter((q) => {
        const correta = q.alternativas.find((a) => a.correta)?.letra;
        return correta && respostas[q.id] === correta;
      }).length;

      const tempoTotal =
        tempoTotalRef.current + (Date.now() - questaoStartRef.current);

      await atualizarParticipante(meuParticipanteId, {
        finished_at: new Date().toISOString(),
        acertos: corretas,
        total: questoes.length,
        tempo_total_ms: tempoTotal,
        respostas,
      });

      setEtapa("ranking");
      // Suprime motivo (poderia mostrar toast diferente)
      void motivo;
    },
    [meuParticipanteId, sala, questoes, respostas]
  );

  // Anti-cheat (só se modoRigoroso for true)
  const handleViolation = useCallback((_ev: AntiCheatEvent) => {
    // poderia mostrar toast, mas pra simplificar só registra
  }, []);
  const handleInterrupt = useCallback(() => {
    finalizarSimulado("anti_cheat");
  }, [finalizarSimulado]);

  useAntiCheat({
    enabled: etapa === "simulado" && !!sala?.config?.modoRigoroso,
    startedAt: startedAtRef.current,
    onViolation: handleViolation,
    onInterrupt: handleInterrupt,
    strictPaste: true,
  });

  // Cronômetro de tempo por questão (auto-avança quando esgota)
  useEffect(() => {
    if (etapa !== "simulado" || !sala) return;
    const tempoLimite = sala.config.tempoPorQuestaoSeg;
    if (tempoLimite === 0) return;
    if (tempoQuestaoMs >= tempoLimite * 1000) {
      avancarQuestao();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tempoQuestaoMs, etapa, sala]);

  const responder = (letra: string) => {
    if (!questoes[indiceQuestao]) return;
    setRespostas((prev) => ({
      ...prev,
      [questoes[indiceQuestao].id]: letra,
    }));
  };

  const avancarQuestao = () => {
    tempoTotalRef.current += Date.now() - questaoStartRef.current;
    if (indiceQuestao + 1 >= questoes.length) {
      finalizarSimulado("completo");
    } else {
      setIndiceQuestao((i) => i + 1);
    }
  };

  // ============== Render ==============

  if (loading) {
    return (
      <>
        <AppHeader />
        <main className="flex-1 flex items-center justify-center">
          <p style={{ color: "var(--color-ink-3)" }}>Carregando…</p>
        </main>
      </>
    );
  }

  if (erro) {
    return (
      <>
        <AppHeader />
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="text-center max-w-md">
            <p className="mb-4" style={{ color: "var(--color-ink-2)" }}>
              {erro}
            </p>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="btn-primary"
            >
              Voltar para home
            </button>
          </div>
        </main>
      </>
    );
  }

  if (!sala) return null;

  if (etapa === "espera") {
    return (
      <SalaEspera
        sala={sala}
        participantes={participantes}
        meuNick={meuNick ?? "Você"}
        onSair={() => router.push("/")}
      />
    );
  }

  if (etapa === "simulado") {
    return (
      <SalaSimulado
        sala={sala}
        questoes={questoes}
        indiceQuestao={indiceQuestao}
        respostas={respostas}
        tempoQuestaoMs={tempoQuestaoMs}
        onResponder={responder}
        onAvancar={avancarQuestao}
      />
    );
  }

  // etapa === "ranking"
  return (
    <SalaRanking
      sala={sala}
      participantes={participantes}
      meuNick={meuNick ?? "Você"}
      questoes={questoes.length > 0 ? questoes : questionsFromIds(sala.question_ids, QUESTIONS)}
      onSair={() => router.push("/")}
    />
  );
}

// ====================== Sub-componentes ======================

function SalaEspera({
  sala,
  participantes,
  meuNick,
  onSair,
}: {
  sala: Sala;
  participantes: ParticipanteSala[];
  meuNick: string;
  onSair: () => void;
}) {
  return (
    <>
      <AppHeader />
      <main className="flex-1 px-6 py-12">
        <div className="max-w-xl mx-auto">
          <div className="mb-6">
            <span
              className="inline-block text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: "var(--color-accent)" }}
            >
              Sala {sala.codigo}
            </span>
            <h1 className="serif text-2xl md:text-3xl font-semibold mb-2">
              Aguardando o professor iniciar
            </h1>
            <p style={{ color: "var(--color-ink-2)" }}>
              Você está conectado como{" "}
              <strong style={{ color: "var(--color-ink)" }}>{meuNick}</strong>.
              Quando o professor iniciar, o simulado começa automaticamente.
            </p>
          </div>

          <div
            className="rounded-md border p-4 mb-6 text-sm"
            style={{
              background: "var(--color-paper)",
              borderColor: "var(--color-line)",
            }}
          >
            <div
              className="text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: "var(--color-ink-3)" }}
            >
              Detalhes da sala
            </div>
            <ul className="space-y-1" style={{ color: "var(--color-ink-2)" }}>
              <li>📚 {sala.config.quantidade} questões</li>
              <li>
                ⏱{" "}
                {sala.config.tempoPorQuestaoSeg === 0
                  ? "Sem limite por questão"
                  : `${Math.round(sala.config.tempoPorQuestaoSeg / 60)} min por questão`}
              </li>
              <li>
                {sala.config.modoRigoroso
                  ? "🔒 Anti-cola ativo"
                  : "🟢 Modo de estudo (anti-cola desativado)"}
              </li>
            </ul>
          </div>

          <section className="mb-6">
            <h2
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: "var(--color-ink-3)" }}
            >
              Já estão aqui ({participantes.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {participantes.map((p) => (
                <span
                  key={p.id}
                  className="text-xs px-3 py-1.5 rounded-full"
                  style={{
                    background:
                      p.nickname === meuNick
                        ? "var(--color-accent-soft)"
                        : "var(--color-paper-2)",
                    color:
                      p.nickname === meuNick
                        ? "var(--color-accent)"
                        : "var(--color-ink-2)",
                    border: "1px solid var(--color-line)",
                    fontWeight: p.nickname === meuNick ? 600 : 400,
                  }}
                >
                  {p.nickname}
                  {p.nickname === meuNick && " (você)"}
                </span>
              ))}
            </div>
          </section>

          <div className="flex justify-center">
            <button type="button" onClick={onSair} className="btn-ghost text-sm">
              Sair da sala
            </button>
          </div>
        </div>
      </main>
    </>
  );
}

function SalaSimulado({
  sala,
  questoes,
  indiceQuestao,
  respostas,
  tempoQuestaoMs,
  onResponder,
  onAvancar,
}: {
  sala: Sala;
  questoes: Question[];
  indiceQuestao: number;
  respostas: Record<string, string | null>;
  tempoQuestaoMs: number;
  onResponder: (letra: string) => void;
  onAvancar: () => void;
}) {
  const q = questoes[indiceQuestao];
  if (!q) {
    return (
      <>
        <AppHeader />
        <main className="flex-1 flex items-center justify-center">
          <p style={{ color: "var(--color-ink-3)" }}>Carregando questão…</p>
        </main>
      </>
    );
  }

  const tempoLimite = sala.config.tempoPorQuestaoSeg;
  const tempoRestanteMs =
    tempoLimite > 0 ? Math.max(0, tempoLimite * 1000 - tempoQuestaoMs) : null;
  const escolhida = respostas[q.id] ?? null;

  return (
    <>
      <AppHeader />
      <main className="flex-1 px-4 md:px-6 py-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--color-ink-3)" }}
            >
              Sala {sala.codigo} · Questão {indiceQuestao + 1}/{questoes.length}
            </span>
            {tempoRestanteMs !== null && (
              <span
                className="font-mono text-sm px-2 py-1 rounded"
                style={{
                  background:
                    tempoRestanteMs < 30_000
                      ? "var(--color-err-soft)"
                      : "var(--color-paper-2)",
                  color:
                    tempoRestanteMs < 30_000
                      ? "var(--color-err)"
                      : "var(--color-ink-2)",
                  border: "1px solid var(--color-line)",
                }}
              >
                ⏱ {fmtRestante(tempoRestanteMs)}
              </span>
            )}
          </div>

          <div className="card p-5 md:p-6 mb-4">
            <div
              className="text-xs uppercase tracking-widest mb-3"
              style={{ color: "var(--color-ink-3)" }}
            >
              ENEM {q.ano} · {q.area}
            </div>
            <QuestionBody question={q} />
          </div>

          <div className="space-y-2 mb-6">
            {q.alternativas.map((a) => {
              const ativa = escolhida === a.letra;
              return (
                <button
                  key={a.letra}
                  type="button"
                  onClick={() => onResponder(a.letra)}
                  className="w-full text-left p-3 rounded-md border transition-colors flex gap-3 items-start"
                  style={{
                    background: ativa
                      ? "var(--color-accent-soft)"
                      : "var(--color-paper)",
                    borderColor: ativa
                      ? "var(--color-accent)"
                      : "var(--color-line)",
                  }}
                  onPaste={(e) =>
                    sala.config.modoRigoroso && e.preventDefault()
                  }
                  onCopy={(e) =>
                    sala.config.modoRigoroso && e.preventDefault()
                  }
                >
                  <span
                    className="font-semibold"
                    style={{ color: "var(--color-ink)" }}
                  >
                    {a.letra})
                  </span>
                  <span style={{ color: "var(--color-ink)" }}>{a.texto}</span>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onAvancar}
              className="btn-primary"
            >
              {indiceQuestao + 1 === questoes.length
                ? "Finalizar simulado"
                : "Próxima questão →"}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}

function SalaRanking({
  sala,
  participantes,
  meuNick,
  questoes,
  onSair,
}: {
  sala: Sala;
  participantes: ParticipanteSala[];
  meuNick: string;
  questoes: Question[];
  onSair: () => void;
}) {
  const ordenados = useMemo(() => {
    return [...participantes].sort((a, b) => {
      if (a.finished_at && !b.finished_at) return -1;
      if (!a.finished_at && b.finished_at) return 1;
      if (b.acertos !== a.acertos) return b.acertos - a.acertos;
      return a.tempo_total_ms - b.tempo_total_ms;
    });
  }, [participantes]);

  const minhaPos = ordenados.findIndex((p) => p.nickname === meuNick) + 1;
  const eu = ordenados.find((p) => p.nickname === meuNick);
  const finalizados = ordenados.filter((p) => p.finished_at).length;

  // Estatísticas por questão
  const estatisticasPorQuestao = useMemo(() => {
    return questoes.map((q) => {
      const correta = q.alternativas.find((a) => a.correta)?.letra;
      const responderam = participantes.filter(
        (p) => p.respostas?.[q.id]
      );
      const acertaram = responderam.filter(
        (p) => p.respostas[q.id] === correta
      ).length;
      const pct =
        responderam.length > 0
          ? (acertaram / responderam.length) * 100
          : 0;
      return { q, acertaram, total: responderam.length, pct };
    });
  }, [questoes, participantes]);

  return (
    <>
      <AppHeader />
      <main className="flex-1 px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <header className="mb-6 text-center">
            <span
              className="inline-block text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: "var(--color-accent)" }}
            >
              Sala {sala.codigo} · Ranking
            </span>
            <h1 className="serif text-3xl md:text-4xl font-semibold mb-2">
              {eu?.finished_at
                ? `Você ficou em ${minhaPos}º`
                : "Aguardando você finalizar…"}
            </h1>
            {eu?.finished_at && (
              <p style={{ color: "var(--color-ink-2)" }}>
                {eu.acertos}/{eu.total} acertos · {fmtMs(eu.tempo_total_ms)}
              </p>
            )}
          </header>

          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "var(--color-ink-3)" }}
              >
                Ranking ({finalizados}/{participantes.length} finalizaram)
              </h2>
            </div>
            <div className="space-y-2">
              {ordenados.map((p, i) => {
                const eu = p.nickname === meuNick;
                const finalizado = !!p.finished_at;
                return (
                  <div
                    key={p.id}
                    className="rounded-md border p-3 flex items-center gap-3"
                    style={{
                      background: eu
                        ? "var(--color-accent-soft)"
                        : finalizado
                        ? "var(--color-paper)"
                        : "var(--color-paper-2)",
                      borderColor: eu
                        ? "var(--color-accent)"
                        : "var(--color-line)",
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{
                        background:
                          i + 1 === 1
                            ? "var(--color-warn)"
                            : i + 1 === 2
                            ? "var(--color-line-strong)"
                            : i + 1 === 3
                            ? "var(--color-warn-soft)"
                            : "var(--color-paper-2)",
                        color: "var(--color-ink)",
                      }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-medium truncate"
                        style={{ color: "var(--color-ink)" }}
                      >
                        {p.nickname}
                        {eu && (
                          <span
                            className="text-xs ml-2"
                            style={{ color: "var(--color-accent)" }}
                          >
                            (você)
                          </span>
                        )}
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: "var(--color-ink-3)" }}
                      >
                        {finalizado
                          ? `${p.acertos}/${p.total} acertos · ${fmtMs(p.tempo_total_ms)}`
                          : "ainda fazendo..."}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mb-8">
            <h2
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: "var(--color-ink-3)" }}
            >
              Aproveitamento por questão
            </h2>
            <div className="space-y-2">
              {estatisticasPorQuestao.map((e, i) => {
                const cor =
                  e.pct >= 70
                    ? "var(--color-ok)"
                    : e.pct >= 40
                    ? "var(--color-warn)"
                    : "var(--color-err)";
                return (
                  <div
                    key={e.q.id}
                    className="rounded-md border p-2 text-xs flex items-center gap-3"
                    style={{
                      borderColor: "var(--color-line)",
                      background: "var(--color-paper)",
                    }}
                  >
                    <span
                      className="font-mono w-6 text-right"
                      style={{ color: "var(--color-ink-3)" }}
                    >
                      Q{i + 1}
                    </span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--color-paper-2)" }}>
                      <div
                        className="h-full"
                        style={{ width: `${e.pct}%`, background: cor }}
                      />
                    </div>
                    <span
                      className="font-mono w-20 text-right"
                      style={{ color: "var(--color-ink-2)" }}
                    >
                      {e.acertaram}/{e.total} ({Math.round(e.pct)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="flex justify-center">
            <button type="button" onClick={onSair} className="btn-primary">
              Voltar para home
            </button>
          </div>
        </div>
      </main>
    </>
  );
}

function fmtMs(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function fmtRestante(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m > 0) return `${m}:${String(s).padStart(2, "0")}`;
  return `${s}s`;
}
