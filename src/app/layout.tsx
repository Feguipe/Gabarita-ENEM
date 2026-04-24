import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://gabarita-enem.vercel.app"),
  title: {
    default: "Gabarita — Simulados ENEM grátis com anti-cola e redação",
    template: "%s · Gabarita",
  },
  description:
    "Treine para o ENEM com 1.800+ questões oficiais (2014–2023), simulados cronometrados com protocolo anti-cola e redações com temas atuais. 100% gratuito.",
  keywords: [
    "ENEM",
    "simulado ENEM",
    "redação ENEM",
    "questões ENEM",
    "vestibular",
    "preparação ENEM",
    "simulado online grátis",
  ],
  authors: [{ name: "Gabarita" }],
  applicationName: "Gabarita",
  category: "education",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://gabarita-enem.vercel.app",
    siteName: "Gabarita",
    title: "Gabarita — Simulados ENEM grátis com anti-cola e redação",
    description:
      "1.800+ questões oficiais (2014–2023), simulados com anti-cola e redações com temas atuais. 100% grátis.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gabarita — Simulados ENEM grátis",
    description:
      "Questões oficiais, anti-cola e redações com temas atuais. 100% grátis.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f6" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1917" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const themeInitScript = `
(function() {
  try {
    var t = localStorage.getItem('gabarita:theme') || 'system';
    var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col transition-colors">
        <ThemeProvider>{children}</ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
