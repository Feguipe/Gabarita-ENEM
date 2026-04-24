"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Gabarita - erro capturado:", error);
  }, [error]);

  return (
    <>
      <AppHeader />
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-md text-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mx-auto mb-4"
            style={{
              background: "var(--color-err-soft)",
              color: "var(--color-err)",
            }}
          >
            ⚠
          </div>
          <h1 className="serif text-2xl font-semibold mb-3">
            Algo deu errado
          </h1>
          <p
            className="mb-6 leading-relaxed"
            style={{ color: "var(--color-ink-2)" }}
          >
            Tivemos um problema inesperado ao carregar esta página. Se o
            problema continuar, tente voltar para a home e começar de novo.
          </p>
          {error.digest && (
            <p
              className="text-xs font-mono mb-6"
              style={{ color: "var(--color-ink-3)" }}
            >
              Código: {error.digest}
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <button type="button" onClick={reset} className="btn-primary">
              Tentar de novo
            </button>
            <Link href="/" className="btn-ghost">
              Voltar para home
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
