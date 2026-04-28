"use client";

import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";

const TIPOS = [
  { value: "sugestao", label: "Sugestão de melhoria" },
  { value: "bug", label: "Reportar problema" },
  { value: "duvida", label: "Dúvida" },
  { value: "elogio", label: "Elogio" },
  { value: "outro", label: "Outro" },
] as const;

type Status = "idle" | "enviando" | "sucesso" | "erro";

export default function SugestoesPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]["value"]>("sugestao");
  const [mensagem, setMensagem] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [erro, setErro] = useState<string | null>(null);

  const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_KEY;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensagem.trim() || mensagem.trim().length < 10) {
      setErro("Escreva uma mensagem com pelo menos 10 caracteres.");
      return;
    }
    if (!accessKey) {
      setErro(
        "Formulário ainda não configurado pelo administrador. Tente novamente em alguns minutos."
      );
      return;
    }

    setStatus("enviando");
    setErro(null);

    try {
      const tipoLabel = TIPOS.find((t) => t.value === tipo)?.label ?? tipo;
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: accessKey,
          subject: `[Gabarita] ${tipoLabel}${
            nome.trim() ? ` — ${nome.trim()}` : ""
          }`,
          from_name: nome.trim() || "Usuário Gabarita",
          email: email.trim() || "noreply@gabarita.app",
          message: `Tipo: ${tipoLabel}\n\n${mensagem.trim()}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatus("sucesso");
        setNome("");
        setEmail("");
        setTipo("sugestao");
        setMensagem("");
      } else {
        throw new Error(data.message || "Falha ao enviar");
      }
    } catch (err) {
      setStatus("erro");
      setErro(
        err instanceof Error
          ? err.message
          : "Não foi possível enviar agora. Tente de novo em alguns minutos."
      );
    }
  };

  if (status === "sucesso") {
    return (
      <>
        <AppHeader />
        <main className="flex-1 px-6 py-12">
          <div className="max-w-2xl mx-auto">
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
              <h1 className="serif text-2xl font-semibold mb-2">
                Mensagem enviada
              </h1>
              <p
                className="mb-6 leading-relaxed"
                style={{ color: "var(--color-ink-2)" }}
              >
                Obrigado pelo feedback. Toda mensagem é lida — se você deixou
                email, posso responder se precisar de detalhe.
              </p>
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="btn-ghost"
              >
                Enviar outra
              </button>
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
            <h1 className="serif text-3xl md:text-4xl font-semibold mb-3">
              Sugestões e feedback
            </h1>
            <p
              className="leading-relaxed"
              style={{ color: "var(--color-ink-2)" }}
            >
              Tem uma ideia para melhorar o app, encontrou algum problema ou
              quer compartilhar algo? Toda mensagem é lida pessoalmente.
            </p>
          </header>

          <form onSubmit={enviar} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome">Nome (opcional)</Label>
                <input
                  id="nome"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  maxLength={80}
                  className="input w-full"
                  placeholder="Como você quer ser chamado"
                />
              </div>
              <div>
                <Label htmlFor="email">Email (opcional)</Label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={120}
                  className="input w-full"
                  placeholder="Para receber resposta"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="tipo">Tipo</Label>
              <div className="flex flex-wrap gap-2">
                {TIPOS.map((t) => {
                  const active = tipo === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTipo(t.value)}
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
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label htmlFor="mensagem">Mensagem</Label>
              <textarea
                id="mensagem"
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                required
                minLength={10}
                maxLength={2000}
                rows={8}
                className="input w-full resize-y"
                placeholder="Escreva sua sugestão, problema ou comentário em detalhes…"
              />
              <div
                className="text-xs mt-1 text-right"
                style={{ color: "var(--color-ink-3)" }}
              >
                {mensagem.length}/2000
              </div>
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

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={status === "enviando"}
                className="btn-primary"
              >
                {status === "enviando" ? "Enviando…" : "Enviar mensagem"}
              </button>
            </div>

            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--color-ink-3)" }}
            >
              Suas informações vão direto para o email do criador do app, sem
              passar por nenhum servidor intermediário do Gabarita. Não
              guardamos nada em banco de dados.
            </p>
          </form>
        </div>
      </main>
    </>
  );
}

function Label({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-semibold uppercase tracking-widest mb-2"
      style={{ color: "var(--color-ink-3)" }}
    >
      {children}
    </label>
  );
}
