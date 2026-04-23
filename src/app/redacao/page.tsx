"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import {
  clearRascunho,
  loadHistorico,
  loadRascunho,
  removerDoHistorico,
} from "@/lib/redacao-store";
import temasData from "@/data/temas.json";
import type { RedacaoRascunho, RedacaoTema } from "@/lib/types";

const TEMAS = temasData as RedacaoTema[];

const AREA_LABEL: Record<string, string> = {
  sociedade: "Sociedade",
  meio_ambiente: "Meio Ambiente",
  tecnologia: "Tecnologia",
  educacao: "Educação",
  saude: "Saúde",
  cultura: "Cultura",
  politica: "Política",
};

function sortearTemas(n: number): RedacaoTema[] {
  const copia = [...TEMAS];
  const out: RedacaoTema[] = [];
  for (let i = 0; i < n && copia.length; i++) {
    const idx = Math.floor(Math.random() * copia.length);
    out.push(copia.splice(idx, 1)[0]);
  }
  return out;
}

export default function RedacaoHomePage() {
  const router = useRouter();
  const [sorteados, setSorteados] = useState<RedacaoTema[]>(() => sortearTemas(3));
  const [rascunho, setRascunho] = useState<RedacaoRascunho | null>(null);
  const [historico, setHistorico] = useState<RedacaoRascunho[]>([]);
  const [confirmando, setConfirmando] = useState<string | null>(null);

  useEffect(() => {
    setRascunho(loadRascunho());
    setHistorico(loadHistorico());
  }, []);

  const descartarRascunho = () => {
    if (confirmando !== "rascunho") {
      setConfirmando("rascunho");
      setTimeout(() => setConfirmando((c) => (c === "rascunho" ? null : c)), 3000);
      return;
    }
    clearRascunho();
    setRascunho(null);
    setConfirmando(null);
  };

  const excluirHistorico = (id: string) => {
    if (confirmando !== id) {
      setConfirmando(id);
      setTimeout(() => setConfirmando((c) => (c === id ? null : c)), 3000);
      return;
    }
    removerDoHistorico(id);
    setHistorico((prev) => prev.filter((r) => r.id !== id));
    setConfirmando(null);
  };

  const escolher = (t: RedacaoTema) => {
    router.push(`/redacao/pre-redacao?tema=${encodeURIComponent(t.id)}`);
  };

  return (
    <>
      <AppHeader />
      <main className="flex-1 px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <header className="mb-8">
            <h1 className="serif text-4xl font-semibold mb-2">Redação</h1>
            <p style={{ color: "var(--color-ink-2)" }}>
              Temas gerados a partir de notícias atuais no formato ENEM.{" "}
              {TEMAS.length} temas disponíveis no banco.
            </p>
          </header>

          {rascunho && rascunho.status === "em_andamento" && (
            <div
              className="rounded-lg border p-5 mb-6"
              style={{
                background: "var(--color-warn-soft)",
                borderColor: "var(--color-warn)",
              }}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <h3
                    className="text-xs font-semibold uppercase tracking-widest mb-1"
                    style={{ color: "var(--color-warn)" }}
                  >
                    Rascunho salvo
                  </h3>
                  <p
                    className="text-sm mb-1"
                    style={{ color: "var(--color-ink)" }}
                  >
                    <strong>{rascunho.tema}</strong>
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--color-ink-3)" }}
                  >
                    {rascunho.texto.length} caracteres · salvo em{" "}
                    {new Date(rascunho.atualizadoEm).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/redacao/escrever?tema=${encodeURIComponent(rascunho.temaId)}`}
                  className="btn-primary text-sm flex-1 text-center"
                >
                  Continuar
                </Link>
                <button
                  type="button"
                  onClick={descartarRascunho}
                  className="btn-ghost text-sm whitespace-nowrap"
                  style={
                    confirmando === "rascunho"
                      ? {
                          borderColor: "var(--color-err)",
                          color: "var(--color-err)",
                        }
                      : undefined
                  }
                >
                  {confirmando === "rascunho" ? "Confirmar?" : "Descartar"}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <h2 className="serif text-2xl font-semibold">Temas sorteados</h2>
            <button
              type="button"
              onClick={() => setSorteados(sortearTemas(3))}
              className="btn-ghost text-sm"
            >
              Sortear outros
            </button>
          </div>

          <div className="space-y-3 mb-10">
            {sorteados.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => escolher(t)}
                className="w-full text-left rounded-lg border p-5 transition-colors hover:border-[var(--color-accent)]"
                style={{
                  borderColor: "var(--color-line)",
                  background: "var(--color-paper)",
                }}
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide uppercase"
                    style={{
                      background: "var(--color-accent)",
                      color: "white",
                    }}
                  >
                    {AREA_LABEL[t.areaFoco] ?? t.areaFoco}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: "var(--color-ink-3)" }}
                  >
                    Fonte: {t.origem.fonte}
                  </span>
                </div>
                <h3
                  className="serif text-lg font-semibold mb-2"
                  style={{ color: "var(--color-ink)" }}
                >
                  {t.tema}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {t.palavrasChave.slice(0, 5).map((p, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-0.5 rounded-md"
                      style={{
                        background: "var(--color-paper-2)",
                        color: "var(--color-ink-2)",
                        border: "1px solid var(--color-line)",
                      }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>

          {historico.length > 0 && (
            <section>
              <h2 className="serif text-2xl font-semibold mb-4">
                Redações anteriores
              </h2>
              <div className="space-y-2">
                {historico.slice(0, 10).map((r) => {
                  const interrompida = r.status === "interrompida_saida";
                  return (
                    <div
                      key={r.id}
                      className="rounded-md border p-3 text-sm flex items-center justify-between gap-3"
                      style={{
                        borderColor: interrompida
                          ? "var(--color-err)"
                          : "var(--color-line)",
                        background: "var(--color-paper)",
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div
                          className="font-medium truncate flex items-center gap-2"
                          style={{ color: "var(--color-ink)" }}
                        >
                          {interrompida && (
                            <span
                              className="inline-block text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                              style={{
                                background: "var(--color-err-soft)",
                                color: "var(--color-err)",
                              }}
                            >
                              Interrompida
                            </span>
                          )}
                          <span className="truncate">{r.tema}</span>
                        </div>
                        <div
                          className="text-xs mt-0.5"
                          style={{ color: "var(--color-ink-3)" }}
                        >
                          {new Date(
                            r.finalizadoEm ?? r.atualizadoEm
                          ).toLocaleDateString("pt-BR")}{" "}
                          · {r.texto.length} caracteres
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => excluirHistorico(r.id)}
                        className="text-xs px-2 py-1 rounded-md border transition-colors whitespace-nowrap"
                        style={{
                          borderColor:
                            confirmando === r.id
                              ? "var(--color-err)"
                              : "var(--color-line-strong)",
                          color:
                            confirmando === r.id
                              ? "var(--color-err)"
                              : "var(--color-ink-3)",
                        }}
                        aria-label="Excluir"
                      >
                        {confirmando === r.id ? "Confirmar?" : "Excluir"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
