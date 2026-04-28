"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";

export function AppHeader({ hideThemeToggle = false }: { hideThemeToggle?: boolean }) {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const isRedacao = pathname?.startsWith("/redacao");
  const isSugestoes = pathname?.startsWith("/sugestoes");
  const isHome = !isRedacao && !isSugestoes;

  const cycle = () => {
    setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light");
  };

  const icon =
    theme === "light" ? "☀" : theme === "dark" ? "🌙" : "🖥";
  const label =
    theme === "light" ? "Claro" : theme === "dark" ? "Escuro" : "Sistema";

  return (
    <header
      className="border-b"
      style={{ borderColor: "var(--color-line)", background: "var(--color-paper)" }}
    >
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-baseline gap-2 group">
            <span
              className="serif text-2xl font-semibold tracking-tight"
              style={{ color: "var(--color-ink)" }}
            >
              Gabarita
            </span>
            <span
              className="text-xs tracking-widest uppercase"
              style={{ color: "var(--color-ink-3)" }}
            >
              ENEM
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-md transition-colors"
              style={{
                color: isHome ? "var(--color-ink)" : "var(--color-ink-3)",
                background: isHome ? "var(--color-accent-soft)" : "transparent",
                fontWeight: isHome ? 600 : 400,
              }}
            >
              Simulado
            </Link>
            <Link
              href="/redacao"
              className="px-3 py-1.5 rounded-md transition-colors"
              style={{
                color: isRedacao ? "var(--color-ink)" : "var(--color-ink-3)",
                background: isRedacao ? "var(--color-accent-soft)" : "transparent",
                fontWeight: isRedacao ? 600 : 400,
              }}
            >
              Redação
            </Link>
            <Link
              href="/sugestoes"
              className="px-3 py-1.5 rounded-md transition-colors"
              style={{
                color: isSugestoes ? "var(--color-ink)" : "var(--color-ink-3)",
                background: isSugestoes ? "var(--color-accent-soft)" : "transparent",
                fontWeight: isSugestoes ? 600 : 400,
              }}
            >
              Sugestões
            </Link>
          </nav>
        </div>
        {!hideThemeToggle && (
          <button
            type="button"
            onClick={cycle}
            className="text-xs px-3 py-1.5 rounded-md border flex items-center gap-1.5 transition-colors"
            style={{
              borderColor: "var(--color-line-strong)",
              color: "var(--color-ink-2)",
            }}
            title={`Tema: ${theme}`}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        )}
      </div>
    </header>
  );
}
