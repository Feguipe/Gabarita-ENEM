"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Question } from "@/lib/types";

interface Props {
  question: Question;
}

function isValidImg(src?: string | Blob | null): src is string {
  return typeof src === "string" && src.length > 0 && !src.includes("broken-image");
}

export function QuestionBody({ question }: Props) {
  return (
    <div className="space-y-4">
      {question.enunciado && (
        <div
          className="markdown-body leading-relaxed space-y-3"
          style={{ color: "var(--color-ink)" }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              img: ({ src, alt }) =>
                isValidImg(src) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={src}
                    alt={alt ?? ""}
                    className="rounded-md border max-w-full h-auto my-2"
                    style={{ borderColor: "var(--color-line)" }}
                  />
                ) : null,
            }}
          >
            {question.enunciado}
          </ReactMarkdown>
        </div>
      )}

      {question.contextoImagens && question.contextoImagens.length > 0 && (
        <div className="space-y-3">
          {question.contextoImagens.filter(isValidImg).map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={url}
              alt=""
              className="rounded-md border max-w-full h-auto"
              style={{ borderColor: "var(--color-line)" }}
            />
          ))}
        </div>
      )}

      {question.introducaoAlternativas && (
        <p className="font-medium" style={{ color: "var(--color-ink)" }}>
          {question.introducaoAlternativas}
        </p>
      )}
    </div>
  );
}

export function AlternativeContent({
  texto,
  imagem,
}: {
  texto: string;
  imagem?: string | null;
}) {
  return (
    <div className="space-y-2">
      {texto && <div style={{ color: "var(--color-ink)" }}>{texto}</div>}
      {isValidImg(imagem) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imagem}
          alt=""
          className="rounded-md border max-w-sm h-auto"
          style={{ borderColor: "var(--color-line)" }}
        />
      )}
    </div>
  );
}
