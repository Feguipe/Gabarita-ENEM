"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import {
  addAoHistorico,
  clearRascunho,
  contarLinhas,
  contarPalavras,
  loadRascunho,
} from "@/lib/redacao-store";
import type { RedacaoRascunho } from "@/lib/types";

export default function RedacaoInterrompidoPage() {
  const router = useRouter();
  const [rascunho, setRascunho] = useState<RedacaoRascunho | null>(null);

  useEffect(() => {
    const r = loadRascunho();
    if (!r) {
      router.replace("/redacao");
      return;
    }
    setRascunho(r);
    // Salva no histórico e limpa rascunho ativo
    if (r.status === "interrompida_saida") {
      addAoHistorico(r);
      clearRascunho();
    }
  }, [router]);

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

  const ultimoEvento =
    rascunho.anticheatEvents[rascunho.anticheatEvents.length - 1];

  const descreverCausa = (tipo?: string) => {
    switch (tipo) {
      case "tab_hidden":
        return "você trocou de aba ou minimizou a janela";
      case "window_blur":
        return "o foco da janela foi perdido (Alt+Tab ou clique em outro app)";
      default:
        return "uma violação do protocolo foi detectada";
    }
  };

  const linhas = contarLinhas(rascunho.texto);
  const palavras = contarPalavras(rascunho.texto);

  return (
    <>
      <AppHeader />
      <main className="flex-1 px-6 py-12">
        <div className="max-w-xl mx-auto">
          <div
            className="rounded-lg border p-8"
            style={{
              background: "var(--color-paper)",
              borderColor: "var(--color-err)",
            }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                style={{
                  background: "var(--color-err-soft)",
                  color: "var(--color-err)",
                }}
              >
                ⚠
              </div>
              <h1
                className="serif text-2xl font-semibold"
                style={{ color: "var(--color-err)" }}
              >
                Redação encerrada
              </h1>
            </div>

            <p
              className="mb-5 leading-relaxed"
              style={{ color: "var(--color-ink-2)" }}
            >
              Sua redação foi interrompida porque {descreverCausa(ultimoEvento?.type)}.
              Conforme as regras, sair da página durante a redação encerra a
              sessão imediatamente.
            </p>

            <div
              className="rounded-md border p-4 mb-6"
              style={{
                background: "var(--color-paper-2)",
                borderColor: "var(--color-line)",
              }}
            >
              <div
                className="text-xs uppercase tracking-widest mb-1"
                style={{ color: "var(--color-ink-3)" }}
              >
                Progresso até o encerramento
              </div>
              <div
                className="serif text-lg font-semibold mb-1"
                style={{ color: "var(--color-ink)" }}
              >
                {rascunho.tema}
              </div>
              <div
                className="text-sm"
                style={{ color: "var(--color-ink-2)" }}
              >
                {linhas} linhas · {palavras} palavras · {rascunho.texto.length}{" "}
                caracteres
              </div>
            </div>

            <p
              className="text-xs mb-6"
              style={{ color: "var(--color-ink-3)" }}
            >
              O que você escreveu foi salvo no histórico de redações.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.push("/redacao")}
                className="btn-primary flex-1"
              >
                Voltar para redações
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
