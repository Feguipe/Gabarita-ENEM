import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";

export default function NotFound() {
  return (
    <>
      <AppHeader />
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-md text-center">
          <div
            className="serif text-6xl font-semibold mb-3"
            style={{ color: "var(--color-ink-3)" }}
          >
            404
          </div>
          <h1 className="serif text-2xl font-semibold mb-3">
            Página não encontrada
          </h1>
          <p
            className="mb-6 leading-relaxed"
            style={{ color: "var(--color-ink-2)" }}
          >
            A página que você procura não existe ou foi movida. Volte para a
            home e escolha o que quer praticar.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/" className="btn-primary">
              Ir para simulado
            </Link>
            <Link href="/redacao" className="btn-ghost">
              Ir para redação
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
