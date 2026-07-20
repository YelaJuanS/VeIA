// La página del MVP es un client component y no puede exportar metadata,
// así que el título propio de ReparApp vive en este layout.
export const metadata = {
  title: "ReparApp — Tu energía, en tiempo real",
  description:
    "Prototipo de seguimiento en vivo de fallas eléctricas: reporta el corte y mira avanzar a la brigada con el tiempo estimado de restablecimiento.",
};

export default function MvpLayout({ children }) {
  return children;
}
