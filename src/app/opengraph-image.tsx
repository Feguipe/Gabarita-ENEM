import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Gabarita — Simulados ENEM grátis com anti-cola e redação";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: "80px 96px",
          background:
            "linear-gradient(135deg, #faf9f6 0%, #f3f1ec 60%, #e0e7ff 100%)",
          color: "#1c1917",
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 16,
            marginBottom: 48,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#1c1917",
            }}
          >
            Gabarita
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: "#1e40af",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            ENEM
          </div>
        </div>

        <div
          style={{
            fontSize: 66,
            fontWeight: 600,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            color: "#1c1917",
            marginBottom: 40,
            maxWidth: 950,
            display: "flex",
          }}
        >
          Simulados ENEM grátis com anti-cola e redação com temas atuais
        </div>

        <div style={{ display: "flex", gap: 48, marginTop: "auto" }}>
          <Stat n="1.800+" label="QUESTÕES OFICIAIS" />
          <Stat n="2014–2023" label="ANOS COBERTOS" />
          <Stat n="100%" label="GRATUITO" />
        </div>
      </div>
    ),
    { ...size }
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          fontSize: 42,
          fontWeight: 700,
          color: "#1e40af",
          fontFamily: "sans-serif",
        }}
      >
        {n}
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: "#78716c",
          letterSpacing: "0.12em",
          fontFamily: "sans-serif",
        }}
      >
        {label}
      </div>
    </div>
  );
}
