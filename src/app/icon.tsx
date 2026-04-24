import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1e40af",
          color: "#ffffff",
          fontFamily: "serif",
          fontSize: 44,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          borderRadius: 12,
        }}
      >
        G
      </div>
    ),
    { ...size }
  );
}
