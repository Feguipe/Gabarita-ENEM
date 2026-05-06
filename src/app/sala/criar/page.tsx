"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { criarSala } from "@/lib/sala-store";
import { isSupabaseConfigured } from "@/lib/supabase";
import { filterPool, pickQuestions } from "@/lib/simulation-store";
import type { Area, SalaConfig, SimulationConfig } from "@/lib/types";

const TEMPO_OPCOES: { valor: number; label: string }[] = [
  { valor: 0, label: "Sem limite (cada aluno no seu ritmo)" },
  { valor: 180, label: "3 minutos por questão" },
  { valor: 300, label: "5 minutos por questão (recomendado)" },
  { valor: 480, label: "8 minutos por questão" },
  { valor: 600, label: "10 minutos por questão" },
];

const AREAS: { value: Area | "misto"; label: string; hint: string }[] = [
  { value: "misto", label: "Misto", hint: "Todas as áreas" },
  { value: "linguagens", label: "Linguagens", hint: "Português, literatura, língua estrangeira" },
  { value: "humanas", label: "Humanas", hint: "História, geografia, filosofia, sociologia" },
  { value: "natureza", label: "Natureza", hint: "Biologia, química, física" },
  { value: "matematica", label: "Matemática", hint: "Matemática e suas tecnologias" },
];

const LINGUAS: {
  value: NonNullable<SimulationConfig["language"]>;
  label: string;
}[] = [
  { value: "ingles", label: "Inglês" },
  { value: "espanhol", label: "Espanhol" },
  { value: "sem_estrangeira", label: "Sem língua estrangeira" },
];

const QUICK_QUANTIDADES = [5, 10, 20, 45];

function CriarSalaInner() {
  const router = useRouter();
  const params = useSearchParams();

  const areaInicial = (params.get("area") as Area | "misto") ?? "misto";
  const qtInicial = Number(params.get("quantidade") ?? 10);
  const langInicial =
    (params.get("language") as NonNullable<SimulationConfig["language"]>) ??
    "ingles";

  const [area, setArea] = useState<Area | "misto">(areaInicial);
  const [quantidade, setQuantidade] = useState(qtInicial);
  const [language, setLanguage] =
    useState<NonNullable<SimulationConfig["language"]>>(langInicial);
  const [tempo, setTempo] = useState<number>(300);
  const [modoRigoroso, setModoRigoroso] = useState(true);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const supaOk = useMemo(() => isSupabaseConfigured(), []);

  const criar = async () => {
    if (!supaOk) {
      setErro(
        "Supabase não está configurado neste ambiente. Use o app local ou aguarde o admin configurar a produção."
      );
      return;
    }
    setCriando(true);
    setErro(null);

    const questions = pickQuestions({
      area,
      quantidade,
      tempoMinutos: 0,
      language,
    });
    if (questions.length === 0) {
      setErro("Nenhuma questão disponível com esses filtros.");
      setCriando(false);
      return;
    }

    const config: SalaConfig = {
      area,
      quantidade: questions.length,
      language,
      tempoPorQuestaoSeg: tempo,
      modoRigoroso,
    };

    const r = await criarSala(config, questions);
    if (!r) {
      setErro("Não foi possível criar a sala. Tente novamente em alguns segundos.");
      setCriando(false);
      return;
    }
    router.push(`/sala/${r.sala.codigo}/admin`);
  };

  if (!supaOk) {
    return (
      <>
        <AppHeader />
        <main className="flex-1 px-6 py-12">
          <div className="max-w-xl mx-auto">
            <div
              className="rounded-lg border p-6 text-center"
              style={{
                background: "var(--color-warn-soft)",
                borderColor: "var(--color-warn)",
              }}
            >
              <h1 className="serif text-2xl font-semibold mb-2">
                Salas de estudo indisponíveis
              </h1>
              <p style={{ color: "var(--color-ink-2)" }}>
                A funcionalidade de salas de estudo precisa de configuração
                extra do Supabase, que ainda não está disponível neste ambiente.
              </p>
            </div>
          </div>
        </main>
      </>
    );
  }

  const filtered = filterPool({
    area,
    quantidade,
    tempoMinutos: 0,
    language,
  });
  const disponivel = filtered.length;
  const qtInvalida = quantidade < 1 || quantidade > disponivel;

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
              Sala de estudos
            </span>
            <h1 className="serif text-3xl md:text-4xl font-semibold mb-2">
              Configure sua sala
            </h1>
            <p style={{ color: "var(--color-ink-2)" }}>
              Escolha a área, a quantidade de questões, o tempo e o modo. Depois
              compartilhe o código com sua turma.
            </p>
          </header>

          <div className="space-y-7 mb-8">
            <section>
              <h2
                className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: "var(--color-ink-3)" }}
              >
                Área do conhecimento
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AREAS.map((a) => {
                  const active = area === a.value;
                  return (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() => setArea(a.value)}
                      className="text-left p-3 rounded-lg border transition-colors"
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
                <h2
                  className="text-xs font-semibold uppercase tracking-widest mb-3"
                  style={{ color: "var(--color-ink-3)" }}
                >
                  Língua estrangeira
                </h2>
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
              <h2
                className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: "var(--color-ink-3)" }}
              >
                Quantidade de questões
              </h2>
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
              {qtInvalida && (
                <div
                  className="text-xs rounded-md p-2 mt-2 border"
                  style={{
                    background: "var(--color-err-soft)",
                    borderColor: "var(--color-err)",
                    color: "var(--color-err)",
                  }}
                >
                  Reduza para no máximo {disponivel} questões ou troque a área.
                </div>
              )}
            </section>

            <section>
              <h2
                className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: "var(--color-ink-3)" }}
              >
                Tempo por questão
              </h2>
              <div className="space-y-2">
                {TEMPO_OPCOES.map((o) => {
                  const active = tempo === o.valor;
                  return (
                    <button
                      key={o.valor}
                      type="button"
                      onClick={() => setTempo(o.valor)}
                      className="w-full text-left p-3 rounded-lg border transition-colors"
                      style={{
                        borderColor: active
                          ? "var(--color-accent)"
                          : "var(--color-line)",
                        background: active
                          ? "var(--color-accent-soft)"
                          : "var(--color-paper)",
                        color: active
                          ? "var(--color-ink)"
                          : "var(--color-ink-2)",
                      }}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <h2
                className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: "var(--color-ink-3)" }}
              >
                Modo prova
              </h2>
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border transition-colors"
                style={{
                  borderColor: modoRigoroso
                    ? "var(--color-accent)"
                    : "var(--color-line)",
                  background: modoRigoroso
                    ? "var(--color-accent-soft)"
                    : "var(--color-paper)",
                }}
              >
                <input
                  type="checkbox"
                  checked={modoRigoroso}
                  onChange={(e) => setModoRigoroso(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-[var(--color-accent)]"
                />
                <div>
                  <div
                    className="font-medium"
                    style={{ color: "var(--color-ink)" }}
                  >
                    Modo prova rigorosa (anti-cola ativo)
                  </div>
                  <div
                    className="text-xs mt-0.5"
                    style={{ color: "var(--color-ink-3)" }}
                  >
                    Sair da aba, copiar/colar ou Alt+Tab encerra o simulado do
                    aluno. Desmarque para um modo de estudo mais leve, sem essas
                    restrições.
                  </div>
                </div>
              </label>
            </section>
          </div>

          {erro && (
            <div
              className="rounded-md border p-3 mb-4 text-sm"
              style={{
                background: "var(--color-err-soft)",
                borderColor: "var(--color-err)",
                color: "var(--color-err)",
              }}
            >
              {erro}
            </div>
          )}

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
              onClick={criar}
              disabled={criando || qtInvalida}
              className="btn-primary flex-1 py-3.5 text-base"
            >
              {criando ? "Criando sala…" : "Criar sala e gerar código"}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}

export default function CriarSalaPage() {
  return (
    <Suspense fallback={null}>
      <CriarSalaInner />
    </Suspense>
  );
}
