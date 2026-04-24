"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Area, SimulationConfig } from "@/lib/types";
import { QUESTIONS, getAvailableYears } from "@/lib/questions-data";
import {
  createSimulation,
  clearCurrent,
  filterPool,
} from "@/lib/simulation-store";
import { AppHeader } from "@/components/AppHeader";

const AREAS: { value: Area | "misto"; label: string; hint: string }[] = [
  { value: "misto", label: "Misto", hint: "Todas as áreas" },
  { value: "linguagens", label: "Linguagens", hint: "Português, literatura, inglês/espanhol" },
  { value: "humanas", label: "Humanas", hint: "História, geografia, filosofia, sociologia" },
  { value: "natureza", label: "Natureza", hint: "Biologia, química, física" },
  { value: "matematica", label: "Matemática", hint: "Matemática e suas tecnologias" },
];

const QUICK_QUANTIDADES = [10, 20, 45, 90];

const LINGUAS: { value: NonNullable<SimulationConfig["language"]>; label: string }[] = [
  { value: "ingles", label: "Inglês" },
  { value: "espanhol", label: "Espanhol" },
  { value: "sem_estrangeira", label: "Sem língua estrangeira" },
];

const DIFICULDADES: {
  value: NonNullable<SimulationConfig["dificuldade"]>;
  label: string;
}[] = [
  { value: "qualquer", label: "Todas" },
  { value: "facil", label: "Fácil" },
  { value: "media", label: "Média" },
  { value: "dificil", label: "Difícil" },
];

export default function HomePage() {
  const router = useRouter();
  const anos = useMemo(() => getAvailableYears(), []);
  const anoRecente = anos[0] ?? 2023;
  const anoAntigo = anos[anos.length - 1] ?? 2014;

  const [area, setArea] = useState<Area | "misto">("misto");
  const [quantidade, setQuantidade] = useState(20);
  const [language, setLanguage] =
    useState<NonNullable<SimulationConfig["language"]>>("ingles");
  const [dificuldade, setDificuldade] =
    useState<NonNullable<SimulationConfig["dificuldade"]>>("qualquer");

  const poolFiltrado = useMemo(
    () =>
      filterPool({
        area,
        quantidade: 0,
        tempoMinutos: 0,
        language,
        dificuldade,
      }),
    [area, language, dificuldade]
  );
  const disponivel = poolFiltrado.length;

  const handleStart = () => {
    if (quantidade < 1 || quantidade > disponivel) return;
    clearCurrent();
    createSimulation({
      area,
      quantidade,
      tempoMinutos: 0,
      language,
      dificuldade,
    });
    router.push("/pre-prova");
  };

  return (
    <>
      <AppHeader />
      <main className="flex-1 px-6 py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 md:mb-10">
            <h1 className="serif text-3xl md:text-4xl font-semibold leading-tight mb-3">
              Monte seu simulado
            </h1>
            <p
              className="text-base leading-relaxed mb-5"
              style={{ color: "var(--color-ink-2)" }}
            >
              {QUESTIONS.length.toLocaleString("pt-BR")} questões oficiais do ENEM, de{" "}
              {anoAntigo} a {anoRecente}. Escolha a área, a quantidade e comece.
            </p>
            <div
              className="rounded-md border p-3 text-sm flex items-start gap-3"
              style={{
                background: "var(--color-warn-soft)",
                borderColor: "var(--color-warn)",
                color: "var(--color-ink)",
              }}
            >
              <span
                className="text-base leading-none mt-0.5"
                aria-hidden="true"
              >
                ⚡
              </span>
              <div>
                <strong>Protocolo anti-cola ativo:</strong> sair da aba, Alt+Tab
                ou copiar/colar encerra o simulado imediatamente. É o mesmo rigor
                da prova real.
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <section>
              <SectionLabel>Área do conhecimento</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AREAS.map((a) => {
                  const active = area === a.value;
                  return (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() => setArea(a.value)}
                      className="text-left p-4 rounded-lg border transition-colors"
                      style={{
                        borderColor: active
                          ? "var(--color-accent)"
                          : "var(--color-line)",
                        background: active
                          ? "var(--color-accent-soft)"
                          : "var(--color-paper)",
                      }}
                    >
                      <div
                        className="font-medium"
                        style={{ color: "var(--color-ink)" }}
                      >
                        {a.label}
                      </div>
                      <div
                        className="text-xs mt-0.5"
                        style={{ color: "var(--color-ink-3)" }}
                      >
                        {a.hint}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {(area === "linguagens" || area === "misto") && (
              <section>
                <SectionLabel>Língua estrangeira</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {LINGUAS.map((l) => {
                    const active = language === l.value;
                    return (
                      <button
                        key={l.value}
                        type="button"
                        onClick={() => setLanguage(l.value)}
                        className="px-4 py-2 rounded-md text-sm border transition-colors"
                        style={{
                          borderColor: active
                            ? "var(--color-accent)"
                            : "var(--color-line-strong)",
                          background: active
                            ? "var(--color-accent-soft)"
                            : "transparent",
                          color: active
                            ? "var(--color-accent)"
                            : "var(--color-ink-2)",
                        }}
                      >
                        {l.label}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <section>
              <SectionLabel>Dificuldade</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {DIFICULDADES.map((d) => {
                  const active = dificuldade === d.value;
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setDificuldade(d.value)}
                      className="px-4 py-2 rounded-md text-sm border transition-colors"
                      style={{
                        borderColor: active
                          ? "var(--color-accent)"
                          : "var(--color-line-strong)",
                        background: active
                          ? "var(--color-accent-soft)"
                          : "transparent",
                        color: active
                          ? "var(--color-accent)"
                          : "var(--color-ink-2)",
                      }}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <SectionLabel>Quantidade de questões</SectionLabel>
              <div className="flex flex-wrap gap-2 mb-3">
                {QUICK_QUANTIDADES.map((n) => {
                  const active = quantidade === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setQuantidade(n)}
                      disabled={n > disponivel}
                      className="px-4 py-2 rounded-md text-sm font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        borderColor: active
                          ? "var(--color-accent)"
                          : "var(--color-line-strong)",
                        background: active
                          ? "var(--color-accent-soft)"
                          : "transparent",
                        color: active
                          ? "var(--color-accent)"
                          : "var(--color-ink-2)",
                      }}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={disponivel}
                  value={quantidade}
                  onChange={(e) => setQuantidade(Number(e.target.value))}
                  className="input max-w-[140px]"
                />
                <span
                  className="text-sm"
                  style={{ color: "var(--color-ink-3)" }}
                >
                  de {disponivel.toLocaleString("pt-BR")} disponíveis
                </span>
              </div>
            </section>

            {quantidade > disponivel && (
              <div
                className="text-sm rounded-md p-3 border"
                style={{
                  background: "var(--color-err-soft)",
                  borderColor: "var(--color-err)",
                  color: "var(--color-err)",
                }}
              >
                Quantidade maior que o disponível. Reduza para no máximo {disponivel} ou mude os filtros.
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={handleStart}
                disabled={quantidade < 1 || quantidade > disponivel}
                className="btn-primary w-full py-3.5 text-base"
              >
                Iniciar simulado
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-xs font-semibold uppercase tracking-widest mb-3"
      style={{ color: "var(--color-ink-3)" }}
    >
      {children}
    </h2>
  );
}
