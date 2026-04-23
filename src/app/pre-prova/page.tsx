"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadCurrent } from "@/lib/simulation-store";
import type { Simulation } from "@/lib/types";
import { AppHeader } from "@/components/AppHeader";

export default function PreProvaPage() {
  const router = useRouter();
  const [sim, setSim] = useState<Simulation | null>(null);
  const [checks, setChecks] = useState({
    ambiente: false,
    notificacoes: false,
    regras: false,
  });

  useEffect(() => {
    const s = loadCurrent();
    if (!s) {
      router.replace("/");
      return;
    }
    setSim(s);
  }, [router]);

  const tudoMarcado = checks.ambiente && checks.notificacoes && checks.regras;

  const iniciar = () => {
    router.push("/simulado");
  };

  if (!sim) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p style={{ color: "var(--color-ink-3)" }}>Carregando…</p>
      </main>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="flex-1 px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <header className="mb-8">
            <h1 className="serif text-3xl font-semibold mb-2">Antes de começar</h1>
            <p style={{ color: "var(--color-ink-2)" }}>
              {sim.questions.length} questões · cronômetro crescente, sem limite de tempo
            </p>
          </header>

          <div
            className="rounded-lg border p-5 mb-8"
            style={{
              background: "var(--color-warn-soft)",
              borderColor: "var(--color-warn)",
            }}
          >
            <h2
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: "var(--color-warn)" }}
            >
              Regras do simulado
            </h2>
            <ul
              className="text-sm space-y-2 list-disc pl-5"
              style={{ color: "var(--color-ink)" }}
            >
              <li>
                <strong>Sair da aba, trocar de janela ou dar Alt+Tab encerra o simulado
                imediatamente.</strong>
              </li>
              <li>Copiar, colar, clicar com o botão direito e atalhos do navegador estão bloqueados.</li>
              <li>O tempo é registrado (crescente), mas não há limite para terminar.</li>
              <li>Você pode finalizar a qualquer momento pelo botão no rodapé.</li>
            </ul>
          </div>

          <div className="space-y-4 mb-8">
            {[
              {
                key: "ambiente" as const,
                label:
                  "Estou em um ambiente tranquilo e com abas/aplicativos desnecessários fechados.",
              },
              {
                key: "notificacoes" as const,
                label:
                  "Desativei as notificações do sistema (elas podem encerrar o simulado).",
              },
              {
                key: "regras" as const,
                label:
                  "Entendo que sair da aba, trocar de janela ou dar Alt+Tab encerrará meu simulado imediatamente.",
              },
            ].map((c) => (
              <label key={c.key} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checks[c.key]}
                  onChange={(e) => setChecks({ ...checks, [c.key]: e.target.checked })}
                  className="mt-1 w-4 h-4 accent-[var(--color-accent)]"
                />
                <span className="text-sm" style={{ color: "var(--color-ink-2)" }}>
                  {c.label}
                </span>
              </label>
            ))}
          </div>

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
              disabled={!tudoMarcado}
              className="btn-primary flex-1 py-3.5 text-base"
            >
              Iniciar simulado
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
