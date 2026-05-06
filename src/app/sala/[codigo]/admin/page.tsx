"use client";

import { useEffect, useMemo, useState, use } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import {
  buscarSalaPorCodigo,
  encerrarSala,
  getAdminLocal,
  iniciarSala,
  listarParticipantes,
  questionsFromIds,
} from "@/lib/sala-store";
import { QUESTIONS } from "@/lib/questions-data";
import { QuestionBody } from "@/components/QuestionBody";
import type { ParticipanteSala, Question, Sala } from "@/lib/types";

export default function SalaAdminPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = use(params);
  const router = useRouter();

  const [sala, setSala] = useState<Sala | null>(null);
  const [participantes, setParticipantes] = useState<ParticipanteSala[]>([]);
  const [codigoAdmin, setCodigoAdmin] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [aba, setAba] = useState<"painel" | "gabarito">("painel");

  const questoesSala = useMemo<Question[]>(() => {
    if (!sala) return [];
    return questionsFromIds(sala.question_ids, QUESTIONS);
  }, [sala]);

  // Carrega código admin do localStorage
  useEffect(() => {
    const c = getAdminLocal(codigo);
    setCodigoAdmin(c);
    if (!c) {
      setErro(
        "Você não é o administrador desta sala neste navegador. Apenas quem criou a sala pode controlá-la."
      );
    }
  }, [codigo]);

  // Carrega sala e participantes (poll a cada 4s)
  useEffect(() => {
    let cancelled = false;
    const carregar = async () => {
      const s = await buscarSalaPorCodigo(codigo);
      if (cancelled) return;
      if (!s) {
        setErro("Sala não encontrada ou expirada.");
        setLoading(false);
        return;
      }
      setSala(s);
      const p = await listarParticipantes(s.id);
      if (!cancelled) {
        setParticipantes(p);
        setLoading(false);
      }
    };
    carregar();
    const id = setInterval(carregar, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [codigo]);

  const copiarCodigo = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {}
  };

  const compartilhar = async () => {
    const url = `${window.location.origin}/sala/entrar?codigo=${codigo}`;
    const text = `Entre na minha sala de estudos do ENEM no Gabarita!\nCódigo: ${codigo}\n${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Sala Gabarita", text, url });
        return;
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(text);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {}
  };

  const iniciar = async () => {
    if (!sala || !codigoAdmin) return;
    if (participantes.length === 0) {
      const ok = confirm(
        "Nenhum aluno entrou ainda. Iniciar mesmo assim? (depois ninguém mais pode entrar)"
      );
      if (!ok) return;
    }
    const ok = await iniciarSala(sala.id, codigoAdmin);
    if (!ok) {
      setErro("Falha ao iniciar a sala. Tente novamente.");
      return;
    }
  };

  const encerrar = async () => {
    if (!sala || !codigoAdmin) return;
    const ok = confirm("Encerrar a sala? Os alunos não poderão continuar.");
    if (!ok) return;
    await encerrarSala(sala.id, codigoAdmin);
  };

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

  if (erro && !sala) {
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

  const finalizados = participantes.filter((p) => p.finished_at).length;
  const emAndamento = sala.status === "em_andamento";
  const encerrada = sala.status === "encerrada" || sala.status === "expirada";

  return (
    <>
      <AppHeader />
      <main className="flex-1 px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <span
              className="inline-block text-xs font-semibold uppercase tracking-widest mb-1"
              style={{ color: "var(--color-accent)" }}
            >
              Sala de estudos · Painel do professor
            </span>
            <h1 className="serif text-2xl md:text-3xl font-semibold">
              {labelStatus(sala.status)}
            </h1>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b" style={{ borderColor: "var(--color-line)" }}>
            <button
              type="button"
              onClick={() => setAba("painel")}
              className="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
              style={{
                borderColor: aba === "painel" ? "var(--color-accent)" : "transparent",
                color: aba === "painel" ? "var(--color-accent)" : "var(--color-ink-3)",
              }}
            >
              Painel
            </button>
            <button
              type="button"
              onClick={() => setAba("gabarito")}
              className="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
              style={{
                borderColor: aba === "gabarito" ? "var(--color-accent)" : "transparent",
                color: aba === "gabarito" ? "var(--color-accent)" : "var(--color-ink-3)",
              }}
            >
              Prova com gabarito ({questoesSala.length})
            </button>
          </div>
          {/* Bloco do código grande pra compartilhar */}
          {aba === "painel" && !emAndamento && !encerrada && (
            <div
              className="rounded-lg border p-6 mb-6 text-center"
              style={{
                background: "var(--color-accent-soft)",
                borderColor: "var(--color-accent)",
              }}
            >
              <div
                className="text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: "var(--color-accent)" }}
              >
                Compartilhe este código
              </div>
              <div
                className="font-mono text-4xl md:text-5xl font-bold tracking-widest mb-4"
                style={{ color: "var(--color-ink)" }}
              >
                {codigo}
              </div>
              <div className="flex gap-2 justify-center flex-wrap">
                <button
                  type="button"
                  onClick={copiarCodigo}
                  className="btn-ghost text-sm"
                >
                  {copiado ? "✓ Copiado" : "Copiar código"}
                </button>
                <button
                  type="button"
                  onClick={compartilhar}
                  className="btn-ghost text-sm"
                >
                  Compartilhar link
                </button>
              </div>
            </div>
          )}

          {/* Configuração */}
          {aba === "painel" && (
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
              Configuração da sala
            </div>
            <ul className="space-y-1" style={{ color: "var(--color-ink-2)" }}>
              <li>📚 {sala.config.quantidade} questões · {labelAreaConfig(sala.config.area)}</li>
              <li>
                ⏱{" "}
                {sala.config.tempoPorQuestaoSeg === 0
                  ? "Sem limite de tempo"
                  : `${Math.round(sala.config.tempoPorQuestaoSeg / 60)} minutos por questão`}
              </li>
              <li>
                {sala.config.modoRigoroso
                  ? "🔒 Anti-cola ativo (modo prova rigorosa)"
                  : "🟢 Modo de estudo (anti-cola desativado)"}
              </li>
            </ul>
          </div>
          )}

          {/* Aba: Prova com gabarito */}
          {aba === "gabarito" && (
            <ProvaComGabarito questoes={questoesSala} participantes={participantes} />
          )}

          {/* Lista de participantes / ranking */}
          {aba === "painel" && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "var(--color-ink-3)" }}
              >
                {emAndamento || encerrada
                  ? `Ranking (${finalizados}/${participantes.length} finalizaram)`
                  : `Participantes (${participantes.length})`}
              </h2>
            </div>

            {participantes.length === 0 ? (
              <div
                className="rounded-md border border-dashed p-8 text-center text-sm"
                style={{
                  borderColor: "var(--color-line)",
                  color: "var(--color-ink-3)",
                }}
              >
                Aguardando alunos entrarem na sala…
              </div>
            ) : (
              <ListaParticipantes
                participantes={participantes}
                mostrarRanking={emAndamento || encerrada}
              />
            )}
          </section>
          )}

          {/* Botões de ação */}
          {aba === "painel" && !emAndamento && !encerrada && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="btn-ghost"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={iniciar}
                disabled={!codigoAdmin}
                className="btn-primary flex-1 py-3.5 text-base"
              >
                Iniciar simulado pra todos
              </button>
            </div>
          )}

          {aba === "painel" && emAndamento && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={encerrar}
                disabled={!codigoAdmin}
                className="btn-ghost"
                style={{
                  borderColor: "var(--color-err)",
                  color: "var(--color-err)",
                }}
              >
                Encerrar sala antes da hora
              </button>
            </div>
          )}

          {aba === "painel" && encerrada && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="btn-primary flex-1"
              >
                Voltar para home
              </button>
            </div>
          )}

          {erro && sala && (
            <div
              className="rounded-md border p-3 mt-4 text-sm"
              style={{
                background: "var(--color-warn-soft)",
                borderColor: "var(--color-warn)",
                color: "var(--color-ink-2)",
              }}
            >
              {erro}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function ProvaComGabarito({
  questoes,
  participantes,
}: {
  questoes: Question[];
  participantes: ParticipanteSala[];
}) {
  const [expandidas, setExpandidas] = useState<Record<string, boolean>>({});

  if (questoes.length === 0) {
    return (
      <div
        className="rounded-md border border-dashed p-8 text-center text-sm mb-6"
        style={{
          borderColor: "var(--color-line)",
          color: "var(--color-ink-3)",
        }}
      >
        Nenhuma questão encontrada para esta sala.
      </div>
    );
  }

  // Estatística por questão (% acerto da turma — só conta quem respondeu)
  const stats = questoes.map((q) => {
    const correta = q.alternativas.find((a) => a.correta)?.letra;
    const responderam = participantes.filter((p) => p.respostas?.[q.id]);
    const acertaram = responderam.filter(
      (p) => p.respostas[q.id] === correta
    ).length;
    const pct =
      responderam.length > 0 ? (acertaram / responderam.length) * 100 : 0;
    return { acertaram, total: responderam.length, pct };
  });

  return (
    <div className="space-y-3 mb-6">
      <div
        className="rounded-md border p-3 text-xs"
        style={{
          background: "var(--color-warn-soft)",
          borderColor: "var(--color-warn)",
          color: "var(--color-ink)",
        }}
      >
        💡 <strong>Apenas você (professor) vê esta aba.</strong> Os alunos não
        têm acesso ao gabarito durante o simulado.
      </div>
      {questoes.map((q, idx) => {
        const correta = q.alternativas.find((a) => a.correta);
        const aberto = expandidas[q.id];
        const s = stats[idx];
        return (
          <div
            key={q.id}
            className="rounded-lg overflow-hidden border"
            style={{
              borderColor: "var(--color-line)",
              background: "var(--color-paper)",
            }}
          >
            <button
              type="button"
              onClick={() =>
                setExpandidas({ ...expandidas, [q.id]: !aberto })
              }
              className="w-full p-4 flex items-center justify-between text-left gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{
                    background: "var(--color-ok)",
                    color: "white",
                  }}
                >
                  {correta?.letra ?? "?"}
                </span>
                <div className="min-w-0">
                  <div
                    className="text-sm font-semibold truncate"
                    style={{ color: "var(--color-ink)" }}
                  >
                    Questão {idx + 1} · ENEM {q.ano}
                  </div>
                  <div
                    className="text-xs mt-0.5"
                    style={{ color: "var(--color-ink-3)" }}
                  >
                    {q.area}
                    {s.total > 0 && (
                      <>
                        {" · "}
                        <span
                          style={{
                            color:
                              s.pct >= 70
                                ? "var(--color-ok)"
                                : s.pct >= 40
                                ? "var(--color-warn)"
                                : "var(--color-err)",
                          }}
                        >
                          {s.acertaram}/{s.total} acertaram ({Math.round(s.pct)}%)
                        </span>
                      </>
                    )}
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
                  {q.alternativas.map((a) => {
                    const isCorreta = a.correta;
                    return (
                      <div
                        key={a.letra}
                        className="p-3 rounded-md border flex gap-2 items-start"
                        style={{
                          background: isCorreta
                            ? "var(--color-ok-soft)"
                            : "var(--color-paper-2)",
                          borderColor: isCorreta
                            ? "var(--color-ok)"
                            : "var(--color-line)",
                        }}
                      >
                        <span
                          className="font-semibold"
                          style={{ color: "var(--color-ink)" }}
                        >
                          {a.letra})
                        </span>
                        <div
                          className="flex-1"
                          style={{ color: "var(--color-ink)" }}
                        >
                          {a.texto}
                        </div>
                        {isCorreta && (
                          <span
                            className="text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap"
                            style={{ color: "var(--color-ok)" }}
                          >
                            ✓ Gabarito
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {q.resolucao && (
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
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ListaParticipantes({
  participantes,
  mostrarRanking,
}: {
  participantes: ParticipanteSala[];
  mostrarRanking: boolean;
}) {
  const ordenados = mostrarRanking
    ? [...participantes].sort((a, b) => {
        if (a.finished_at && !b.finished_at) return -1;
        if (!a.finished_at && b.finished_at) return 1;
        if (b.acertos !== a.acertos) return b.acertos - a.acertos;
        return a.tempo_total_ms - b.tempo_total_ms;
      })
    : participantes;

  return (
    <div className="space-y-2">
      {ordenados.map((p, i) => {
        const finalizado = !!p.finished_at;
        const posicao = mostrarRanking ? i + 1 : null;
        return (
          <div
            key={p.id}
            className="rounded-md border p-3 flex items-center gap-3"
            style={{
              background: finalizado
                ? "var(--color-ok-soft)"
                : "var(--color-paper)",
              borderColor: finalizado ? "var(--color-ok)" : "var(--color-line)",
            }}
          >
            {posicao !== null && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{
                  background:
                    posicao === 1
                      ? "var(--color-warn)"
                      : posicao === 2
                      ? "var(--color-line-strong)"
                      : posicao === 3
                      ? "var(--color-warn-soft)"
                      : "var(--color-paper-2)",
                  color:
                    posicao <= 3
                      ? "var(--color-ink)"
                      : "var(--color-ink-3)",
                }}
              >
                {posicao}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div
                className="font-medium truncate"
                style={{ color: "var(--color-ink)" }}
              >
                {p.nickname}
              </div>
              <div
                className="text-xs"
                style={{ color: "var(--color-ink-3)" }}
              >
                {finalizado
                  ? `${p.acertos}/${p.total} acertos · ${fmtMs(p.tempo_total_ms)}`
                  : p.started_at
                  ? "Em andamento…"
                  : "Esperando começar"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function fmtMs(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function labelStatus(s: string): string {
  switch (s) {
    case "aberta":
      return "Aguardando alunos";
    case "em_andamento":
      return "Simulado em andamento";
    case "encerrada":
      return "Sala encerrada";
    case "expirada":
      return "Sala expirada";
    default:
      return "Sala";
  }
}

function labelAreaConfig(area: string): string {
  switch (area) {
    case "linguagens":
      return "Linguagens";
    case "humanas":
      return "Humanas";
    case "natureza":
      return "Natureza";
    case "matematica":
      return "Matemática";
    case "misto":
      return "Misto";
    default:
      return area;
  }
}
