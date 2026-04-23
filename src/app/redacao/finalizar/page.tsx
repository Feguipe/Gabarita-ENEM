"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import {
  addAoHistorico,
  clearRascunho,
  contarLinhas,
  contarPalavras,
  loadRascunho,
} from "@/lib/redacao-store";
import temasData from "@/data/temas.json";
import type { RedacaoTema, RedacaoRascunho } from "@/lib/types";

const TEMAS = temasData as RedacaoTema[];

export default function FinalizarPage() {
  const router = useRouter();
  const [rascunho, setRascunho] = useState<RedacaoRascunho | null>(null);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    const r = loadRascunho();
    if (!r) {
      router.replace("/redacao");
      return;
    }
    setRascunho(r);
  }, [router]);

  const tema = useMemo<RedacaoTema | null>(() => {
    if (!rascunho) return null;
    return TEMAS.find((t) => t.id === rascunho.temaId) ?? null;
  }, [rascunho]);

  if (!rascunho || !tema) {
    return (
      <>
        <AppHeader />
        <main className="flex-1 flex items-center justify-center">
          <p style={{ color: "var(--color-ink-3)" }}>Carregando…</p>
        </main>
      </>
    );
  }

  const linhas = contarLinhas(rascunho.texto);
  const palavras = contarPalavras(rascunho.texto);
  const caracteres = rascunho.texto.length;

  const exportarPDF = async () => {
    setExportando(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const margemX = 20;
      const margemY = 20;
      const larguraUtil = 210 - margemX * 2;
      let y = margemY;

      // Cabeçalho
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Redação ENEM", margemX, y);
      y += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(
        `Gerado em ${new Date().toLocaleDateString("pt-BR")} · Gabarita`,
        margemX,
        y
      );
      y += 10;

      // Tema
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Tema", margemX, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      const temaLinhas = doc.splitTextToSize(tema.tema, larguraUtil);
      doc.text(temaLinhas, margemX, y);
      y += temaLinhas.length * 6 + 6;

      // Proposta (textos motivadores)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Proposta", margemX, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      for (const tm of tema.textosMotivadores) {
        if (y > 260) {
          doc.addPage();
          y = margemY;
        }
        doc.setFont("helvetica", "bold");
        doc.text(tm.rotulo, margemX, y);
        y += 4;
        doc.setFont("helvetica", "normal");
        const linhasTexto = doc.splitTextToSize(tm.conteudo, larguraUtil);
        for (const ln of linhasTexto) {
          if (y > 275) {
            doc.addPage();
            y = margemY;
          }
          doc.text(ln, margemX, y);
          y += 4;
        }
        y += 3;
      }

      // Redação
      if (y > 240) {
        doc.addPage();
        y = margemY;
      }
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Redação do candidato", margemX, y);
      y += 6;
      doc.setFont("times", "normal");
      doc.setFontSize(11);
      const paragrafos = rascunho.texto.split(/\n+/).filter((p) => p.trim());
      for (const p of paragrafos) {
        const linhasTexto = doc.splitTextToSize(p, larguraUtil);
        for (const ln of linhasTexto) {
          if (y > 275) {
            doc.addPage();
            y = margemY;
          }
          doc.text(ln, margemX, y);
          y += 6;
        }
        y += 3;
      }

      // Checklist ENEM
      doc.addPage();
      y = margemY;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Ficha de correção — 5 competências ENEM", margemX, y);
      y += 10;

      const competencias = [
        [
          "Competência 1",
          "Domínio da modalidade escrita formal da língua portuguesa",
        ],
        [
          "Competência 2",
          "Compreensão da proposta e aplicação de conceitos de várias áreas do conhecimento para desenvolver o tema, dentro dos limites estruturais do texto dissertativo-argumentativo em prosa",
        ],
        [
          "Competência 3",
          "Seleção, relação, organização e interpretação de informações, fatos, opiniões e argumentos em defesa de um ponto de vista",
        ],
        [
          "Competência 4",
          "Conhecimento dos mecanismos linguísticos necessários para a construção da argumentação",
        ],
        [
          "Competência 5",
          "Elaboração de proposta de intervenção para o problema abordado, respeitando os direitos humanos",
        ],
      ];

      doc.setFontSize(10);
      for (const [titulo, desc] of competencias) {
        if (y > 250) {
          doc.addPage();
          y = margemY;
        }
        doc.setFont("helvetica", "bold");
        doc.text(titulo, margemX, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        const linhasDesc = doc.splitTextToSize(desc, larguraUtil);
        doc.text(linhasDesc, margemX, y);
        y += linhasDesc.length * 4 + 2;

        // Campo de nota
        doc.setFont("helvetica", "bold");
        doc.text("Nota (0-200):", margemX, y);
        doc.line(margemX + 30, y, margemX + 60, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text("Comentários:", margemX, y);
        y += 4;
        for (let i = 0; i < 3; i++) {
          doc.line(margemX, y, margemX + larguraUtil, y);
          y += 5;
        }
        doc.setFontSize(10);
        y += 4;
      }

      // Total
      if (y > 260) {
        doc.addPage();
        y = margemY;
      }
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Nota final (0-1000):", margemX, y);
      doc.line(margemX + 45, y, margemX + 85, y);

      const nomeArquivo = `redacao-${tema.tema
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 40)}-${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(nomeArquivo);

      // Salva no histórico e limpa rascunho
      addAoHistorico({ ...rascunho, finalizadoEm: Date.now() });
      clearRascunho();
    } finally {
      setExportando(false);
    }
  };

  const voltar = () => {
    router.push("/redacao/escrever?tema=" + encodeURIComponent(tema.id));
  };

  return (
    <>
      <AppHeader />
      <main className="flex-1 px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <header className="mb-8">
            <span
              className="inline-block text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: "var(--color-accent)" }}
            >
              Pré-visualização
            </span>
            <h1 className="serif text-3xl font-semibold mb-2">{tema.tema}</h1>
            <div
              className="flex gap-4 text-sm flex-wrap"
              style={{ color: "var(--color-ink-3)" }}
            >
              <span>
                {linhas} linhas · {palavras} palavras · {caracteres} caracteres
              </span>
            </div>
          </header>

          <div
            className="rounded-lg border p-8 mb-6 text-base leading-loose whitespace-pre-wrap"
            style={{
              background: "var(--color-paper)",
              borderColor: "var(--color-line)",
              color: "var(--color-ink)",
              fontFamily:
                '"Lora", ui-serif, Georgia, Cambria, "Times New Roman", serif',
            }}
          >
            {rascunho.texto || (
              <span style={{ color: "var(--color-ink-3)" }}>
                Redação em branco.
              </span>
            )}
          </div>

          <div
            className="rounded-lg border p-5 mb-6"
            style={{
              background: "var(--color-accent-soft)",
              borderColor: "var(--color-accent)",
            }}
          >
            <h3
              className="text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: "var(--color-accent)" }}
            >
              O PDF inclui
            </h3>
            <ul
              className="text-sm space-y-1 list-disc pl-5"
              style={{ color: "var(--color-ink)" }}
            >
              <li>Tema + proposta completa com textos motivadores</li>
              <li>Sua redação formatada</li>
              <li>
                Ficha de correção com as 5 competências ENEM e campos em branco
                para o professor avaliar
              </li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={voltar} className="btn-ghost">
              Continuar editando
            </button>
            <button
              type="button"
              onClick={exportarPDF}
              disabled={exportando}
              className="btn-primary flex-1"
            >
              {exportando ? "Gerando PDF…" : "Baixar PDF"}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
