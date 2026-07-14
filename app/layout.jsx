import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata = {
  title: "VeIA — Ve tu energía volver, en tiempo real",
  description:
    "VeIA te muestra en un mapa dónde está la falla eléctrica, cómo avanza la reparación y a qué hora vuelve tu energía. Deja de esperar a ciegas.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>",
  },
  openGraph: {
    title: "VeIA — Ve tu energía volver, en tiempo real",
    description:
      "Seguimiento en tiempo real de fallas eléctricas: mapa, estado de la reparación y hora estimada de restablecimiento.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
