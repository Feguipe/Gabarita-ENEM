"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { criarOficina } from "@/lib/oficina-store";
import { isSupabaseConfigured } from "@/lib/supabase";
import temasData from "@/data/temas.json";
import type { OficinaConfig, RedacaoTema } from "@/lib/types";

const TEMAS = temasData as RedacaoTema[];

const TEMPO_OPCOES: { valor: number; label: string }[] = [
  { valor: 0, label: "Sem limite (cada aluno no seu ritmo)" },
  { valor: 60, label: "60 minutos" },
  { valor: 90, label: "90 minutos (oficial ENEM, recomendado)" },
  { valor: 120, label: "120 minutos" },
];

const AREA_LABEL: Record<string, string> = {
  sociedade: "Sociedade",
  meio_ambiente: "Meio Ambiente",
  tecnologia: "Tecnologia",
  educacao: "Educação",
  saude: "Saúde",
  cultura: "Cultura",
  politica: "Política",
};

export default function CriarOficinaPage() {
  const router = useRouter();
  const supaOk = useMemo(() => isSupabaseConfigured(), []);

  const [temaId, setTemaId] = useState<string>(TEMAS[0]?.id ?? "");
  const [tempoMin, setTempoMin] = useState<number>(90);
  const [modoRigoroso, setModoRigoroso] = useState(true);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const tema = useMemo(
    () => TEMAS.find((t) => t.id === temaId) ?? null,
    [temaId]
  );

  const sortear = () => {
    if (TEMAS.length <= 1) return;
    let novo = TEMAS[Math.floor(Math.random() * TEMAS.length)].id;
    if (TEMAS.length > 1) {
      while (novo === temaId) {
        novo = TEMAS[Math.floor(Math.random() * TEMAS.length)].id;
      }
    }
    setTemaId(novo);
  };

  const criar = async () => {
    if (!tema) {
      setErro("Selecione um tema.");
      return;
    }
    if (!supaOk) {
      setErro(
        "Supabase não está configurado neste ambiente. Use o app local ou aguarde o admin configurar a produção."
      );
      return;
    }
    setCriando(true);
    setErro(null);

    const config: OficinaConfig = { tempoMin, modoRigoroso };
    const r = await criarOficina(config, tema);
    if (!r) {
      setErro("Não foi possível criar a oficina. Tente novamente.");
      setCriando(false);
      return;
    }
    router.push(`/oficina/${r.oficina.codigo}/admin`);
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
                Oficinas indisponíveis
              </h1>
              <p style={{ color: "var(--color-ink-2)" }}>
                A oficina de redação precisa de configuração extra do Supabase,
                que ainda não está disponível neste ambiente.
              </p>
            </div>
          </div>
        </main>
      </>
    );
  }

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
              Oficina de redação
            </span>
            <h1 className="serif text-3xl md:text-4xl font-semibold mb-2">
              Configure a oficina
            </h1>
            <p style={{ color: "var(--color-ink-2)" }}>
              Escolha o tema, o tempo e o modo. Cada aluno recebe um link, escreve
              a redação no app e ela aparece aqui pra você corrigir.
            </p>
          </header>

          <div className="space-y-7 mb-8">
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "var(--color-ink-3)" }}
                >
                  Tema da redação
                </h2>
                <button
                  type="button"
                  onClick={sortear}
                  className="text-xs btn-ghost py-1 px-2"
                >
                  🎲 Sortear outro
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-[420px] overflow-y-auto pr-1">
                {TEMAS.map((t) => {
                  const active = temaId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTemaId(t.id)}
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
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide uppercase"
                          style={{
                            background: "var(--color-accent)",
                            color: "white",
                          }}
                        >
                          {AREA_LABEL[t.areaFoco] ?? t.areaFoco}
                        </span>
                      </div>
                      <div
                        className="text-sm font-medium leading-snug"
                        style={{ color: "var(--color-ink)" }}
                      >
                        {t.tema}
                      </div>
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
                Tempo total da redação
              </h2>
              <div className="space-y-2">
                {TEMPO_OPCOES.map((o) => {
                  const active = tempoMin === o.valor;
                  return (
                    <button
                      key={o.valor}
                      type="button"
                      onClick={() => setTempoMin(o.valor)}
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
              <label
                className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border transition-colors"
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
                    Modo prova rigorosa (anti-cola estrito)
                  </div>
                  <div
                    className="text-xs mt-0.5"
                    style={{ color: "var(--color-ink-3)" }}
                  >
                    Sair da aba, copiar/colar ou Alt+Tab encerra a redação. A
                    redação tem que ser 100% escrita pelo aluno.
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
              disabled={criando || !tema}
              className="btn-primary flex-1 py-3.5 text-base"
            >
              {criando ? "Criando oficina…" : "Criar oficina e gerar código"}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
