"use client";

import { useCallback, useEffect, useRef, useState, use } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import {
  atualizarRedacaoOficina,
  buscarOficinaPorCodigo,
  getParticipanteLocal,
} from "@/lib/oficina-store";
import { useAntiCheat } from "@/lib/use-anticheat";
import { contarLinhas, contarPalavras } from "@/lib/redacao-store";
import type { AntiCheatEvent, Oficina } from "@/lib/types";

type Etapa = "espera" | "redacao" | "concluida";

export default function AlunoOficinaPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = use(params);
  const router = useRouter();

  const [oficina, setOficina] = useState<Oficina | null>(null);
  const [etapa, setEtapa] = useState<Etapa>("espera");
  const [meuParticipanteId, setMeuParticipanteId] = useState<string | null>(null);
  const [meuNick, setMeuNick] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [violacaoFlash, setViolacaoFlash] = useState<AntiCheatEvent | null>(null);
  const [encerrando, setEncerrando] = useState(false);

  const [texto, setTexto] = useState("");
  const [agora, setAgora] = useState(0);
  const startedAtRef = useRef<number>(0);
  const finalizadaRef = useRef(false);

  // Carrega dados locais
  useEffect(() => {
    const local = getParticipanteLocal(codigo);
    if (!local) {
      router.replace(`/sala/entrar?codigo=${codigo}`);
      return;
    }
    setMeuParticipanteId(local.participanteId);
    setMeuNick(local.nickname);
  }, [codigo, router]);

  // Polling: oficina (a cada 3s na espera, 8s na redação)
  useEffect(() => {
    if (!meuParticipanteId) return;
    let cancelled = false;
    const carregar = async () => {
      const o = await buscarOficinaPorCodigo(codigo);
      if (cancelled) return;
      if (!o) {
        setErro("Oficina não encontrada.");
        setLoading(false);
        return;
      }
      setOficina(o);

      if (o.status === "em_andamento" && etapa === "espera") {
        startedAtRef.current = Date.now();
        await atualizarRedacaoOficina(meuParticipanteId, {
          started_at: new Date().toISOString(),
        });
        setEtapa("redacao");
      }
      if (
        (o.status === "encerrada" || o.status === "expirada") &&
        etapa !== "concluida"
      ) {
        // Auto-finaliza se a sala foi encerrada antes
        if (etapa === "redacao" && !finalizadaRef.current) {
          await finalizar(true);
        } else {
          setEtapa("concluida");
        }
      }
      setLoading(false);
    };
    carregar();
    const intervalo = etapa === "espera" ? 3000 : 8000;
    const id = setInterval(carregar, intervalo);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo, meuParticipanteId, etapa]);

  // Cronômetro
  useEffect(() => {
    if (etapa !== "redacao" || !oficina) return;
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [etapa, oficina]);

  // Autosave a cada 4s (não a cada keystroke pra não estourar API)
  useEffect(() => {
    if (etapa !== "redacao" || !meuParticipanteId) return;
    const id = setTimeout(() => {
      atualizarRedacaoOficina(meuParticipanteId, {
        texto,
        caracteres: texto.length,
        linhas: contarLinhas(texto),
      });
    }, 4000);
    return () => clearTimeout(id);
  }, [texto, etapa, meuParticipanteId]);

  const finalizar = useCallback(
    async (auto = false) => {
      if (finalizadaRef.current || !meuParticipanteId) return;
      finalizadaRef.current = true;
      setEncerrando(true);
      await atualizarRedacaoOficina(meuParticipanteId, {
        finished_at: new Date().toISOString(),
        texto,
        caracteres: texto.length,
        linhas: contarLinhas(texto),
      });
      setEtapa("concluida");
      void auto;
    },
    [meuParticipanteId, texto]
  );

  // Anti-cheat
  const handleViolation = useCallback((ev: AntiCheatEvent) => {
    setViolacaoFlash(ev);
    setTimeout(() => setViolacaoFlash(null), 2500);
  }, []);
  const handleInterrupt = useCallback(() => {
    finalizar(true);
  }, [finalizar]);

  useAntiCheat({
    enabled:
      etapa === "redacao" && !!oficina?.config?.modoRigoroso && !encerrando,
    startedAt: startedAtRef.current,
    onViolation: handleViolation,
    onInterrupt: handleInterrupt,
    strictPaste: true,
  });

  // Auto-finaliza quando tempo esgota
  const finalizarRef = useRef<() => void>(() => {});
  useEffect(() => {
    finalizarRef.current = () => finalizar(true);
  }, [finalizar]);

  useEffect(() => {
    if (etapa !== "redacao" || !oficina?.config.tempoMin) return;
    const limite = oficina.config.tempoMin * 60_000;
    const decorrido = agora - startedAtRef.current;
    if (decorrido >= limite) {
      finalizarRef.current();
    }
  }, [agora, etapa, oficina]);

  // ============== Render ==============

  if (loading) {
    return (
      <>
        <AppHeader />
        <main className="flex-1 flex items-center justify-center">
          <p style={{ color: "var(--color-ink-3)" }}>Carregando…</p>
        </main>
      </>
    );
  }

  if (erro) {
    return (
      <>
        <AppHeader />
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="text-center max-w-md">
            <p className="mb-4" style={{ color: "var(--color-ink-2)" }}>
              {erro}
            </p>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="btn-primary"
            >
              Voltar para home
            </button>
          </div>
        </main>
      </>
    );
  }

  if (!oficina) return null;

  if (etapa === "espera") {
    return (
      <OficinaEspera
        oficina={oficina}
        meuNick={meuNick ?? "Você"}
        onSair={() => router.push("/")}
      />
    );
  }

  if (etapa === "concluida") {
    return (
      <OficinaConcluida
        oficina={oficina}
        meuNick={meuNick ?? "Você"}
        onSair={() => router.push("/")}
      />
    );
  }

  // etapa === "redacao"
  const tempoLimiteMs = (oficina.config.tempoMin ?? 0) * 60_000;
  const decorridoMs = agora - startedAtRef.current;
  const restanteMs =
    tempoLimiteMs > 0 ? Math.max(0, tempoLimiteMs - decorridoMs) : null;

  const linhas = contarLinhas(texto);
  const palavras = contarPalavras(texto);
  const caracteres = texto.length;

  const bloquear = (e: React.SyntheticEvent) => {
    if (oficina.config.modoRigoroso) e.preventDefault();
  };

  return (
    <>
      <AppHeader />
      <main className="flex-1 px-4 md:px-6 py-4 md:py-8">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-4 lg:gap-6">
          <section
            className="rounded-lg border p-4 md:p-6 overflow-y-auto lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-6rem)]"
            style={{
              background: "var(--color-paper)",
              borderColor: "var(--color-line)",
            }}
            onCopy={bloquear}
            onCut={bloquear}
          >
            <div className="mb-4">
              <span
                className="inline-block text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: "var(--color-accent)" }}
              >
                Proposta · Oficina {oficina.codigo}
              </span>
              <h1
                className="serif text-xl md:text-2xl font-semibold leading-snug"
                style={{ color: "var(--color-ink)" }}
              >
                {oficina.tema_snapshot.tema}
              </h1>
            </div>

            <div
              className="space-y-4 text-sm leading-relaxed select-none"
              style={{ userSelect: "none" }}
            >
              {oficina.tema_snapshot.textosMotivadores.map((tm, i) => (
                <div key={i}>
                  <div
                    className="text-xs font-semibold mb-1 uppercase tracking-widest"
                    style={{ color: "var(--color-ink-3)" }}
                  >
                    {tm.rotulo}
                  </div>
                  <p style={{ color: "var(--color-ink)" }}>{tm.conteudo}</p>
                </div>
              ))}
            </div>

            <div
              className="mt-6 pt-4 border-t text-sm leading-relaxed italic select-none"
              style={{
                borderColor: "var(--color-line)",
                color: "var(--color-ink-2)",
                userSelect: "none",
              }}
            >
              {oficina.tema_snapshot.comando}
            </div>
          </section>

          <section className="flex flex-col">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "var(--color-ink-3)" }}
                >
                  Sua redação · {meuNick}
                </span>
                {restanteMs !== null && (
                  <span
                    className="inline-flex items-center gap-1 font-mono text-sm px-2 py-0.5 rounded"
                    style={{
                      background:
                        restanteMs < 5 * 60_000
                          ? "var(--color-err-soft)"
                          : restanteMs < 15 * 60_000
                          ? "var(--color-warn-soft)"
                          : "var(--color-paper-2)",
                      color:
                        restanteMs < 5 * 60_000
                          ? "var(--color-err)"
                          : restanteMs < 15 * 60_000
                          ? "var(--color-warn)"
                          : "var(--color-ink-2)",
                      border: "1px solid var(--color-line)",
                    }}
                  >
                    ⏱ {fmtRestante(restanteMs)}
                  </span>
                )}
              </div>
              <div
                className="flex gap-3 text-xs font-mono"
                style={{ color: "var(--color-ink-2)" }}
              >
                <span>
                  Linhas:{" "}
                  <strong
                    style={{
                      color:
                        linhas >= 7 && linhas <= 30
                          ? "var(--color-ok)"
                          : "var(--color-ink)",
                    }}
                  >
                    {linhas}
                  </strong>
                  /30
                </span>
                <span className="hidden sm:inline">Palavras: {palavras}</span>
                <span className="hidden md:inline">
                  Caracteres: {caracteres}
                </span>
              </div>
            </div>

            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onPaste={bloquear}
              onCopy={bloquear}
              onCut={bloquear}
              onDrop={bloquear}
              onContextMenu={bloquear}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder={
                oficina.config.modoRigoroso
                  ? "Comece a escrever sua dissertação. Copiar e colar estão bloqueados. O autosave roda a cada 4 segundos."
                  : "Comece a escrever sua dissertação. O autosave roda a cada 4 segundos."
              }
              className="flex-1 rounded-lg border p-5 text-base leading-loose resize-none min-h-[500px] outline-none transition-colors focus:border-[var(--color-accent)]"
              style={{
                background: "var(--color-paper)",
                borderColor:
                  violacaoFlash?.type === "paste_attempt" ||
                  violacaoFlash?.type === "copy_attempt"
                    ? "var(--color-err)"
                    : "var(--color-line)",
                color: "var(--color-ink)",
                fontFamily:
                  '"Lora", ui-serif, Georgia, Cambria, "Times New Roman", serif',
              }}
            />

            {violacaoFlash && (
              <div
                className="mt-2 rounded-md px-3 py-2 text-xs"
                style={{
                  background: "var(--color-err-soft)",
                  color: "var(--color-err)",
                  border: "1px solid var(--color-err)",
                }}
              >
                Ação bloqueada na redação.
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => finalizar(false)}
                disabled={linhas < 5 || encerrando}
                className="btn-primary flex-1"
              >
                {encerrando ? "Enviando…" : "Finalizar e enviar redação"}
              </button>
            </div>

            {linhas > 0 && linhas < 7 && (
              <p
                className="text-xs mt-2"
                style={{ color: "var(--color-ink-3)" }}
              >
                O ENEM espera entre 7 e 30 linhas. Você está em {linhas}.
              </p>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

// ============== Sub-componentes ==============

function OficinaEspera({
  oficina,
  meuNick,
  onSair,
}: {
  oficina: Oficina;
  meuNick: string;
  onSair: () => void;
}) {
  return (
    <>
      <AppHeader />
      <main className="flex-1 px-6 py-12">
        <div className="max-w-xl mx-auto">
          <div className="mb-6">
            <span
              className="inline-block text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: "var(--color-accent)" }}
            >
              Oficina {oficina.codigo}
            </span>
            <h1 className="serif text-2xl md:text-3xl font-semibold mb-2">
              Aguardando o professor iniciar
            </h1>
            <p style={{ color: "var(--color-ink-2)" }}>
              Você é{" "}
              <strong style={{ color: "var(--color-ink)" }}>{meuNick}</strong>.
              Quando o professor iniciar, a redação começa automaticamente.
            </p>
          </div>

          <div
            className="rounded-md border p-4 mb-6"
            style={{
              background: "var(--color-paper)",
              borderColor: "var(--color-line)",
            }}
          >
            <div
              className="text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: "var(--color-ink-3)" }}
            >
              Tema
            </div>
            <p style={{ color: "var(--color-ink)" }}>
              {oficina.tema_snapshot.tema}
            </p>
          </div>

          <div
            className="rounded-md border p-4 mb-6 text-sm"
            style={{
              background: "var(--color-paper)",
              borderColor: "var(--color-line)",
            }}
          >
            <div
              className="text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: "var(--color-ink-3)" }}
            >
              Configuração
            </div>
            <ul className="space-y-1" style={{ color: "var(--color-ink-2)" }}>
              <li>
                ⏱{" "}
                {oficina.config.tempoMin === 0
                  ? "Sem limite de tempo"
                  : `${oficina.config.tempoMin} minutos`}
              </li>
              <li>
                {oficina.config.modoRigoroso
                  ? "🔒 Anti-cola estrito ativo"
                  : "🟢 Modo de estudo (sem anti-cola)"}
              </li>
            </ul>
          </div>

          <div className="flex justify-center">
            <button type="button" onClick={onSair} className="btn-ghost text-sm">
              Sair da oficina
            </button>
          </div>
        </div>
      </main>
    </>
  );
}

function OficinaConcluida({
  oficina,
  meuNick,
  onSair,
}: {
  oficina: Oficina;
  meuNick: string;
  onSair: () => void;
}) {
  return (
    <>
      <AppHeader />
      <main className="flex-1 px-6 py-12">
        <div className="max-w-xl mx-auto">
          <div
            className="rounded-lg border p-8 text-center"
            style={{
              background: "var(--color-paper)",
              borderColor: "var(--color-ok)",
            }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl mx-auto mb-4"
              style={{
                background: "var(--color-ok-soft)",
                color: "var(--color-ok)",
              }}
            >
              ✓
            </div>
            <h1 className="serif text-2xl md:text-3xl font-semibold mb-3">
              Redação enviada
            </h1>
            <p
              className="mb-6 leading-relaxed"
              style={{ color: "var(--color-ink-2)" }}
            >
              Sua redação foi enviada como{" "}
              <strong style={{ color: "var(--color-ink)" }}>{meuNick}</strong> ao
              professor da oficina <strong>{oficina.codigo}</strong>. Aguarde a
              correção que será compartilhada por fora do app.
            </p>
            <button type="button" onClick={onSair} className="btn-primary">
              Voltar para home
            </button>
          </div>
        </div>
      </main>
    </>
  );
}

function fmtRestante(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
