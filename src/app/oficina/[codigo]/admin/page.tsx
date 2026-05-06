"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import {
  buscarOficinaPorCodigo,
  encerrarOficina,
  getAdminLocal,
  iniciarOficina,
  listarParticipantesOficina,
} from "@/lib/oficina-store";
import type { Oficina, ParticipanteOficina } from "@/lib/types";

export default function OficinaAdminPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = use(params);
  const router = useRouter();

  const [oficina, setOficina] = useState<Oficina | null>(null);
  const [participantes, setParticipantes] = useState<ParticipanteOficina[]>([]);
  const [codigoAdmin, setCodigoAdmin] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [aba, setAba] = useState<"painel" | "tema" | "redacoes">("painel");
  const [redacaoExpandida, setRedacaoExpandida] = useState<string | null>(null);
  const [exportandoId, setExportandoId] = useState<string | null>(null);

  useEffect(() => {
    const c = getAdminLocal(codigo);
    setCodigoAdmin(c);
    if (!c) {
      setErro(
        "Você não é o administrador desta oficina neste navegador. Apenas quem criou pode controlá-la."
      );
    }
  }, [codigo]);

  useEffect(() => {
    let cancelled = false;
    const carregar = async () => {
      const o = await buscarOficinaPorCodigo(codigo);
      if (cancelled) return;
      if (!o) {
        setErro("Oficina não encontrada ou expirada.");
        setLoading(false);
        return;
      }
      setOficina(o);
      const p = await listarParticipantesOficina(o.id);
      if (!cancelled) {
        setParticipantes(p);
        setLoading(false);
      }
    };
    carregar();
    const id = setInterval(carregar, 5000);
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
    const text = `Entre na oficina de redação no Gabarita!\nCódigo: ${codigo}\n${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Oficina Gabarita", text, url });
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
    if (!oficina || !codigoAdmin) return;
    if (participantes.length === 0) {
      const ok = confirm(
        "Nenhum aluno entrou ainda. Iniciar mesmo assim? (depois ninguém mais entra)"
      );
      if (!ok) return;
    }
    const ok = await iniciarOficina(oficina.id, codigoAdmin);
    if (!ok) {
      setErro("Falha ao iniciar a oficina.");
      return;
    }
  };

  const encerrar = async () => {
    if (!oficina || !codigoAdmin) return;
    const ok = confirm("Encerrar a oficina? Os alunos não poderão continuar.");
    if (!ok) return;
    await encerrarOficina(oficina.id, codigoAdmin);
  };

  const exportarRedacaoPDF = async (p: ParticipanteOficina) => {
    if (!oficina) return;
    setExportandoId(p.id);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const margemX = 20;
      const larguraUtil = 210 - margemX * 2;
      let y = 20;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Redação ENEM — Oficina", margemX, y);
      y += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(
        `Oficina ${oficina.codigo} · ${p.nickname} · ${
          p.finished_at
            ? new Date(p.finished_at).toLocaleString("pt-BR")
            : new Date().toLocaleString("pt-BR")
        }`,
        margemX,
        y
      );
      y += 10;

      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Tema", margemX, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      const temaLinhas = doc.splitTextToSize(
        oficina.tema_snapshot.tema,
        larguraUtil
      );
      doc.text(temaLinhas, margemX, y);
      y += temaLinhas.length * 6 + 6;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Redação do candidato", margemX, y);
      y += 6;
      doc.setFont("times", "normal");
      doc.setFontSize(11);
      const paragrafos = (p.texto || "").split(/\n+/).filter((x) => x.trim());
      for (const par of paragrafos) {
        const linhas = doc.splitTextToSize(par, larguraUtil);
        for (const ln of linhas) {
          if (y > 275) {
            doc.addPage();
            y = 20;
          }
          doc.text(ln, margemX, y);
          y += 6;
        }
        y += 3;
      }

      // Ficha de correção
      doc.addPage();
      y = 20;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Ficha de correção — 5 competências ENEM", margemX, y);
      y += 10;

      const competencias = [
        ["Competência 1", "Domínio da modalidade escrita formal."],
        [
          "Competência 2",
          "Compreensão da proposta e desenvolvimento do tema dentro dos limites do dissertativo-argumentativo.",
        ],
        [
          "Competência 3",
          "Seleção, organização e interpretação de informações em defesa de um ponto de vista.",
        ],
        ["Competência 4", "Mecanismos linguísticos da argumentação."],
        [
          "Competência 5",
          "Proposta de intervenção respeitando os direitos humanos.",
        ],
      ];
      doc.setFontSize(10);
      for (const [titulo, desc] of competencias) {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
        doc.setFont("helvetica", "bold");
        doc.text(titulo, margemX, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        const linhasDesc = doc.splitTextToSize(desc, larguraUtil);
        doc.text(linhasDesc, margemX, y);
        y += linhasDesc.length * 4 + 2;

        doc.setFont("helvetica", "bold");
        doc.text("Nota (0-200):", margemX, y);
        doc.line(margemX + 30, y, margemX + 60, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text("Comentários:", margemX, y);
        y += 4;
        for (let i = 0; i < 3; i++) {
          doc.line(margemX, y, margemX + larguraUtil, y);
          y += 5;
        }
        doc.setFontSize(10);
        y += 4;
      }

      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Nota final (0-1000):", margemX, y);
      doc.line(margemX + 45, y, margemX + 85, y);

      const nick = p.nickname.replace(/\s+/g, "-").toLowerCase();
      doc.save(`redacao-${oficina.codigo}-${nick}.pdf`);
    } finally {
      setExportandoId(null);
    }
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

  if (erro && !oficina) {
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

  if (!oficina) return null;

  const finalizadas = participantes.filter((p) => p.finished_at).length;
  const emAndamento = oficina.status === "em_andamento";
  const encerrada =
    oficina.status === "encerrada" || oficina.status === "expirada";

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
              Oficina de redação · Painel do professor
            </span>
            <h1 className="serif text-2xl md:text-3xl font-semibold">
              {labelStatus(oficina.status)}
            </h1>
          </div>

          <div
            className="flex gap-1 mb-6 border-b"
            style={{ borderColor: "var(--color-line)" }}
          >
            <TabButton
              ativa={aba === "painel"}
              onClick={() => setAba("painel")}
            >
              Painel
            </TabButton>
            <TabButton ativa={aba === "tema"} onClick={() => setAba("tema")}>
              Tema
            </TabButton>
            <TabButton
              ativa={aba === "redacoes"}
              onClick={() => setAba("redacoes")}
            >
              Redações ({finalizadas}/{participantes.length})
            </TabButton>
          </div>

          {aba === "painel" && (
            <>
              {!emAndamento && !encerrada && (
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
                  Configuração
                </div>
                <ul
                  className="space-y-1"
                  style={{ color: "var(--color-ink-2)" }}
                >
                  <li>
                    ⏱{" "}
                    {oficina.config.tempoMin === 0
                      ? "Sem limite de tempo"
                      : `${oficina.config.tempoMin} minutos por aluno`}
                  </li>
                  <li>
                    {oficina.config.modoRigoroso
                      ? "🔒 Anti-cola estrito"
                      : "🟢 Modo de estudo (anti-cola desativado)"}
                  </li>
                </ul>
              </div>

              <section className="mb-6">
                <h2
                  className="text-xs font-semibold uppercase tracking-widest mb-3"
                  style={{ color: "var(--color-ink-3)" }}
                >
                  {emAndamento || encerrada
                    ? `Status (${finalizadas}/${participantes.length} finalizaram)`
                    : `Participantes (${participantes.length})`}
                </h2>

                {participantes.length === 0 ? (
                  <div
                    className="rounded-md border border-dashed p-8 text-center text-sm"
                    style={{
                      borderColor: "var(--color-line)",
                      color: "var(--color-ink-3)",
                    }}
                  >
                    Aguardando alunos entrarem na oficina…
                  </div>
                ) : (
                  <div className="space-y-2">
                    {participantes.map((p) => {
                      const finalizado = !!p.finished_at;
                      return (
                        <div
                          key={p.id}
                          className="rounded-md border p-3 flex items-center gap-3"
                          style={{
                            background: finalizado
                              ? "var(--color-ok-soft)"
                              : "var(--color-paper)",
                            borderColor: finalizado
                              ? "var(--color-ok)"
                              : "var(--color-line)",
                          }}
                        >
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
                                ? `${p.linhas} linhas · ${p.caracteres} caracteres · finalizada`
                                : p.started_at
                                ? "escrevendo…"
                                : "esperando começar"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {!emAndamento && !encerrada && (
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
                    Iniciar oficina pra todos
                  </button>
                </div>
              )}

              {emAndamento && (
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
                    Encerrar oficina antes da hora
                  </button>
                </div>
              )}

              {encerrada && (
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
            </>
          )}

          {aba === "tema" && (
            <div
              className="rounded-lg border p-6"
              style={{
                background: "var(--color-paper)",
                borderColor: "var(--color-line)",
              }}
            >
              <h2
                className="serif text-xl md:text-2xl font-semibold leading-snug mb-5"
                style={{ color: "var(--color-ink)" }}
              >
                {oficina.tema_snapshot.tema}
              </h2>

              <div className="space-y-4 text-sm leading-relaxed mb-6">
                {oficina.tema_snapshot.textosMotivadores.map((tm, i) => (
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
                className="pt-4 border-t text-sm leading-relaxed italic"
                style={{
                  borderColor: "var(--color-line)",
                  color: "var(--color-ink-2)",
                }}
              >
                {oficina.tema_snapshot.comando}
              </div>
            </div>
          )}

          {aba === "redacoes" && (
            <div className="space-y-3">
              <div
                className="rounded-md border p-3 text-xs"
                style={{
                  background: "var(--color-warn-soft)",
                  borderColor: "var(--color-warn)",
                  color: "var(--color-ink)",
                }}
              >
                💡 Apenas redações <strong>finalizadas</strong> aparecem aqui. Em
                andamento ainda não estão prontas para correção.
              </div>

              {participantes.filter((p) => p.finished_at).length === 0 ? (
                <div
                  className="rounded-md border border-dashed p-8 text-center text-sm"
                  style={{
                    borderColor: "var(--color-line)",
                    color: "var(--color-ink-3)",
                  }}
                >
                  Nenhuma redação finalizada ainda.
                </div>
              ) : (
                participantes
                  .filter((p) => p.finished_at)
                  .map((p) => {
                    const aberto = redacaoExpandida === p.id;
                    return (
                      <div
                        key={p.id}
                        className="rounded-lg overflow-hidden border"
                        style={{
                          borderColor: "var(--color-line)",
                          background: "var(--color-paper)",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setRedacaoExpandida(aberto ? null : p.id)
                          }
                          className="w-full p-4 flex items-center justify-between text-left gap-3"
                        >
                          <div className="min-w-0">
                            <div
                              className="text-sm font-semibold truncate"
                              style={{ color: "var(--color-ink)" }}
                            >
                              {p.nickname}
                            </div>
                            <div
                              className="text-xs mt-0.5"
                              style={{ color: "var(--color-ink-3)" }}
                            >
                              {p.linhas} linhas · {p.caracteres} caracteres ·{" "}
                              {p.finished_at &&
                                new Date(p.finished_at).toLocaleString("pt-BR")}
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
                            <div
                              className="text-base leading-loose whitespace-pre-wrap"
                              style={{
                                color: "var(--color-ink)",
                                fontFamily:
                                  '"Lora", ui-serif, Georgia, Cambria, "Times New Roman", serif',
                              }}
                            >
                              {p.texto || (
                                <span style={{ color: "var(--color-ink-3)" }}>
                                  (vazia)
                                </span>
                              )}
                            </div>
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => exportarRedacaoPDF(p)}
                                disabled={exportandoId === p.id}
                                className="btn-primary text-sm"
                              >
                                {exportandoId === p.id
                                  ? "Gerando…"
                                  : "📄 Baixar PDF para correção"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function TabButton({
  ativa,
  onClick,
  children,
}: {
  ativa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
      style={{
        borderColor: ativa ? "var(--color-accent)" : "transparent",
        color: ativa ? "var(--color-accent)" : "var(--color-ink-3)",
      }}
    >
      {children}
    </button>
  );
}

function labelStatus(s: string): string {
  switch (s) {
    case "aberta":
      return "Aguardando alunos";
    case "em_andamento":
      return "Oficina em andamento";
    case "encerrada":
      return "Oficina encerrada";
    case "expirada":
      return "Oficina expirada";
    default:
      return "Oficina";
  }
}
