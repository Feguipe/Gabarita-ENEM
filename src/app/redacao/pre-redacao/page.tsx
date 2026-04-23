"use client";

import { useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { criarRascunho, saveRascunho } from "@/lib/redacao-store";
import temasData from "@/data/temas.json";
import type { RedacaoTema } from "@/lib/types";

const TEMAS = temasData as RedacaoTema[];

function PreRedacaoInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const temaId = searchParams.get("tema");

  const tema = useMemo(
    () => TEMAS.find((t) => t.id === temaId) ?? null,
    [temaId]
  );

  const [checks, setChecks] = useState({
    ambiente: false,
    notificacoes: false,
    regras: false,
    copiarColar: false,
  });

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

  const tudoMarcado =
    checks.ambiente && checks.notificacoes && checks.regras && checks.copiarColar;

  const iniciar = () => {
    const r = criarRascunho(tema);
    saveRascunho(r);
    router.push(`/redacao/escrever?tema=${encodeURIComponent(tema.id)}`);
  };

  return (
    <>
      <AppHeader />
      <main className="flex-1 px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <header className="mb-8">
            <span
              className="inline-block text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: "var(--color-accent)" }}
            >
              Antes de começar
            </span>
            <h1 className="serif text-3xl font-semibold mb-2">{tema.tema}</h1>
            <p style={{ color: "var(--color-ink-2)" }}>
              Simulação estilo ENEM · sem limite de tempo · exportação em PDF ao
              final
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
              Regras da redação
            </h2>
            <ul
              className="text-sm space-y-2 list-disc pl-5"
              style={{ color: "var(--color-ink)" }}
            >
              <li>
                <strong>
                  Sair da aba, trocar de janela ou dar Alt+Tab encerra a
                  redação imediatamente.
                </strong>{" "}
                O que você já escreveu fica salvo.
              </li>
              <li>
                <strong>Copiar, colar, recortar e clicar com o botão direito
                estão bloqueados.</strong> A redação deve ser 100% escrita por
                você.
              </li>
              <li>Atalhos do navegador e DevTools estão bloqueados.</li>
              <li>Seu rascunho é salvo automaticamente enquanto você escreve.</li>
              <li>
                Ao finalizar, você baixa um PDF com a proposta, sua redação e
                uma ficha de correção para o professor.
              </li>
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
                  "Desativei as notificações do sistema (elas podem encerrar a redação).",
              },
              {
                key: "regras" as const,
                label:
                  "Entendo que sair da aba ou trocar de janela encerra a redação imediatamente.",
              },
              {
                key: "copiarColar" as const,
                label:
                  "Entendo que não posso copiar ou colar texto — a redação deve ser escrita inteiramente por mim.",
              },
            ].map((c) => (
              <label
                key={c.key}
                className="flex items-start gap-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checks[c.key]}
                  onChange={(e) =>
                    setChecks({ ...checks, [c.key]: e.target.checked })
                  }
                  className="mt-1 w-4 h-4 accent-[var(--color-accent)]"
                />
                <span
                  className="text-sm"
                  style={{ color: "var(--color-ink-2)" }}
                >
                  {c.label}
                </span>
              </label>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push("/redacao")}
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
              Iniciar redação
            </button>
          </div>
        </div>
      </main>
    </>
  );
}

export default function PreRedacaoPage() {
  return (
    <Suspense fallback={null}>
      <PreRedacaoInner />
    </Suspense>
  );
}
