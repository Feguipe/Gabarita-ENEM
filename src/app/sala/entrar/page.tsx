"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import {
  buscarSalaPorCodigo,
  entrarNaSala,
  salvarParticipanteLocal as salvarParticipanteSala,
} from "@/lib/sala-store";
import {
  buscarOficinaPorCodigo,
  entrarNaOficina,
  salvarParticipanteLocal as salvarParticipanteOficina,
} from "@/lib/oficina-store";
import { gerarNickname } from "@/lib/nicknames";

type Tipo = "sala" | "oficina";

interface CodigoVerificado {
  tipo: Tipo;
  id: string;
  status: string;
}

function EntrarSalaInner() {
  const router = useRouter();
  const params = useSearchParams();
  const codigoInicial = (params.get("codigo") ?? "").toUpperCase();

  const [codigo, setCodigo] = useState(codigoInicial);
  const [etapa, setEtapa] = useState<"codigo" | "nickname">("codigo");
  const [nickname, setNickname] = useState("");
  const [trocas, setTrocas] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [verificado, setVerificado] = useState<CodigoVerificado | null>(null);

  useEffect(() => {
    if (etapa === "nickname" && !nickname) {
      setNickname(gerarNickname());
    }
  }, [etapa, nickname]);

  const verificarCodigo = async () => {
    const c = codigo.trim().toUpperCase();
    if (c.length < 4) {
      setErro("Digite o código completo.");
      return;
    }
    setVerificando(true);
    setErro(null);

    // Tenta sala primeiro
    const sala = await buscarSalaPorCodigo(c);
    if (sala) {
      if (sala.status === "em_andamento") {
        setErro(
          "Esta sala já começou — o professor não está aceitando mais participantes."
        );
        setVerificando(false);
        return;
      }
      if (sala.status === "encerrada" || sala.status === "expirada") {
        setErro("Esta sala foi encerrada.");
        setVerificando(false);
        return;
      }
      setCodigo(c);
      setVerificado({ tipo: "sala", id: sala.id, status: sala.status });
      setEtapa("nickname");
      setVerificando(false);
      return;
    }

    // Tenta oficina
    const oficina = await buscarOficinaPorCodigo(c);
    if (oficina) {
      if (oficina.status === "em_andamento") {
        setErro(
          "A oficina já começou — o professor não está aceitando mais participantes."
        );
        setVerificando(false);
        return;
      }
      if (oficina.status === "encerrada" || oficina.status === "expirada") {
        setErro("Esta oficina foi encerrada.");
        setVerificando(false);
        return;
      }
      setCodigo(c);
      setVerificado({ tipo: "oficina", id: oficina.id, status: oficina.status });
      setEtapa("nickname");
      setVerificando(false);
      return;
    }

    setErro("Código inválido ou sala/oficina expirada.");
    setVerificando(false);
  };

  // Quando há código inicial pela URL, dispara verificação automática
  useEffect(() => {
    if (codigoInicial && !verificado && !erro) {
      verificarCodigo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trocarNick = () => {
    if (trocas >= 5) return;
    setNickname(gerarNickname());
    setTrocas((t) => t + 1);
  };

  const entrar = async () => {
    if (!verificado) return;
    setVerificando(true);
    setErro(null);

    if (verificado.tipo === "sala") {
      const p = await entrarNaSala(verificado.id, nickname);
      if (!p) {
        setErro(
          "Não foi possível entrar na sala. Tente outro nick (talvez já esteja em uso)."
        );
        setVerificando(false);
        return;
      }
      salvarParticipanteSala(codigo, p.id, nickname);
      router.push(`/sala/${codigo}/aluno`);
      return;
    }

    if (verificado.tipo === "oficina") {
      const p = await entrarNaOficina(verificado.id, nickname);
      if (!p) {
        setErro(
          "Não foi possível entrar na oficina. Tente outro nick (talvez já esteja em uso)."
        );
        setVerificando(false);
        return;
      }
      salvarParticipanteOficina(codigo, p.id, nickname);
      router.push(`/oficina/${codigo}/aluno`);
      return;
    }
  };

  const labelTipo =
    verificado?.tipo === "oficina" ? "oficina" : "sala";

  return (
    <>
      <AppHeader />
      <main className="flex-1 px-6 py-12">
        <div className="max-w-md mx-auto">
          <header className="mb-8">
            <span
              className="inline-block text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: "var(--color-accent)" }}
            >
              Entrar
            </span>
            <h1 className="serif text-3xl md:text-4xl font-semibold mb-2">
              {etapa === "codigo"
                ? "Digite o código"
                : "Escolha seu nick anônimo"}
            </h1>
            <p style={{ color: "var(--color-ink-2)" }}>
              {etapa === "codigo"
                ? "Você recebeu um código do seu professor? Pode ser de uma sala de simulado ou de uma oficina de redação — o app detecta automaticamente."
                : `Você participa anonimamente. O nick é gerado automaticamente — se não gostar, sorteia outro.`}
            </p>
          </header>

          {etapa === "codigo" ? (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="codigo"
                  className="block text-xs font-semibold uppercase tracking-widest mb-2"
                  style={{ color: "var(--color-ink-3)" }}
                >
                  Código
                </label>
                <input
                  id="codigo"
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") verificarCodigo();
                  }}
                  placeholder="Ex: BCDF-1234"
                  maxLength={20}
                  autoFocus
                  className="input w-full text-center font-mono text-xl tracking-widest"
                />
              </div>

              {erro && (
                <div
                  className="rounded-md border p-3 text-sm"
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
                  onClick={verificarCodigo}
                  disabled={verificando}
                  className="btn-primary flex-1 py-3 text-base"
                >
                  {verificando ? "Verificando…" : "Continuar"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                className="rounded-lg border p-6 text-center"
                style={{
                  background: "var(--color-accent-soft)",
                  borderColor: "var(--color-accent)",
                }}
              >
                <div
                  className="text-xs font-semibold uppercase tracking-widest mb-2"
                  style={{ color: "var(--color-accent)" }}
                >
                  Você será conhecido como
                </div>
                <div
                  className="serif text-2xl md:text-3xl font-semibold mb-3"
                  style={{ color: "var(--color-ink)" }}
                >
                  {nickname}
                </div>
                <button
                  type="button"
                  onClick={trocarNick}
                  disabled={trocas >= 5}
                  className="btn-ghost text-sm"
                >
                  {trocas >= 5
                    ? "Trocas esgotadas"
                    : `🎲 Sortear outro (${5 - trocas} restantes)`}
                </button>
              </div>

              <div
                className="text-xs text-center"
                style={{ color: "var(--color-ink-3)" }}
              >
                Entrando em {labelTipo}{" "}
                <strong style={{ color: "var(--color-ink-2)" }}>{codigo}</strong>
              </div>

              {erro && (
                <div
                  className="rounded-md border p-3 text-sm"
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
                  onClick={() => {
                    setEtapa("codigo");
                    setVerificado(null);
                  }}
                  className="btn-ghost"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={entrar}
                  disabled={verificando}
                  className="btn-primary flex-1 py-3 text-base"
                >
                  {verificando ? "Entrando…" : `Entrar na ${labelTipo}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

export default function EntrarSalaPage() {
  return (
    <Suspense fallback={null}>
      <EntrarSalaInner />
    </Suspense>
  );
}
