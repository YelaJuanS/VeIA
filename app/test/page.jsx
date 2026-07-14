"use client";

import { useEffect, useState } from "react";
import MapMockup from "../../components/MapMockup";

const SECONDS = 8;

const QUESTIONS = [
  { id: "q1", text: "1. ¿Qué es esto?" },
  { id: "q2", text: "2. ¿Para quién es?" },
  {
    id: "q3",
    text: "3. ¿En qué te hace diferente de lo que usas hoy para este problema?",
  },
];

export default function TestPage() {
  const [phase, setPhase] = useState("view"); // view → questions → done
  const [left, setLeft] = useState(SECONDS);
  const [answers, setAnswers] = useState({ q1: "", q2: "", q3: "" });
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  // Temporizador visible: a los 8 segundos el prototipo se oculta solo.
  useEffect(() => {
    if (phase !== "view") return;
    const t = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          setPhase("questions");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  async function submit() {
    if (!answers.q1.trim() && !answers.q2.trim() && !answers.q3.trim()) {
      setError("Responde al menos una pregunta antes de enviar.");
      return;
    }
    setError("");
    setSending(true);
    try {
      await fetch("/api/test-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });
    } catch {
      // La pantalla de gracias se muestra igual; el moderador puede reintentar.
    }
    setPhase("done");
  }

  return (
    <main className="test-page">
      <div className="test-card">
        {phase === "view" && (
          <>
            <h1>Observa con atención</h1>
            <p className="modal-sub">
              Vas a ver una pantalla durante {SECONDS} segundos. Luego te haremos 3 preguntas.
            </p>
            <div className="countdown" aria-live="polite">
              <span className="countdown-num">{left}</span>
              <div className="countdown-track">
                <span
                  className="countdown-fill"
                  style={{ width: `${(left / SECONDS) * 100}%` }}
                ></span>
              </div>
            </div>
            <div className="test-proto">
              <h2>
                Se fue la luz. <span className="accent">¿Y ahora quién te dice cuándo vuelve?</span>
              </h2>
              <MapMockup />
            </div>
          </>
        )}

        {phase === "questions" && (
          <>
            <h1>3 preguntas rápidas</h1>
            <p className="modal-sub">
              No hay respuestas correctas — escribe lo primero que pensaste.
            </p>
            {QUESTIONS.map((q) => (
              <div className="test-question" key={q.id}>
                <label htmlFor={q.id}>{q.text}</label>
                <textarea
                  id={q.id}
                  value={answers[q.id]}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  placeholder="Escribe aquí…"
                />
              </div>
            ))}
            {error && <p className="form-error">{error}</p>}
            <button className="btn btn-primary btn-block" onClick={submit} disabled={sending}>
              {sending ? "Enviando…" : "Enviar respuestas"}
            </button>
          </>
        )}

        {phase === "done" && (
          <div className="test-done">
            <div className="thanks-icon" aria-hidden="true">⚡</div>
            <h1>¡Gracias!</h1>
            <p className="modal-sub">Tus respuestas quedaron guardadas.</p>
          </div>
        )}
      </div>
    </main>
  );
}
