"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadCurrent, calculateScore } from "@/lib/simulation-store";
import type { Simulation } from "@/lib/types";
import { AppHeader } from "@/components/AppHeader";

export default function InterrompidoPage() {
  const router = useRouter();
  const [sim, setSim] = useState<Simulation | null>(null);

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
  const ultimoEvento = sim.anticheatEvents[sim.anticheatEvents.length - 1];

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
                Simulado encerrado
              </h1>
            </div>

            <p
              className="mb-5 leading-relaxed"
              style={{ color: "var(--color-ink-2)" }}
            >
              Seu simulado foi interrompido porque {descreverCausa(ultimoEvento?.type)}.
              Conforme as regras, sair da página durante a prova encerra o simulado
              imediatamente.
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
                Resultado parcial
              </div>
              <div
                className="serif text-xl font-semibold"
                style={{ color: "var(--color-ink)" }}
              >
                {score.acertos} de {score.total} acertos (
                {score.percentual.toFixed(1)}%)
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.push("/resultado")}
                className="btn-ghost flex-1"
              >
                Ver revisão detalhada
              </button>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="btn-primary flex-1"
              >
                Novo simulado
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
