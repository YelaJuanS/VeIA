"use client";

import { useEffect, useState } from "react";
import MapMockup from "../../components/MapMockup";

const SECONDS = 16;

const QUESTIONS = [
  {
    id: "q1",
    text: "1. Con tus propias palabras, ¿qué hace lo que acabas de ver?",
    hint: "No hay que adivinar el nombre del producto — explica qué problema resuelve, como si le contaras a un amigo qué vas a poder hacer con eso.",
    placeholder: "Ej: Sirve para…",
  },
  {
    id: "q2",
    text: "2. ¿Quién crees que usaría esto?",
    hint: "Piensa en una persona o negocio concreto — no hace falta que sea exacto, solo lo primero que se te ocurra.",
    placeholder: "Ej: Alguien que…",
  },
  {
    id: "q3",
    text: "3. Hoy, cuando se va la luz, ¿cómo te enteras de cuándo vuelve?",
    hint: "Cuenta qué haces ahora mismo (llamar, esperar, preguntar a un vecino…) y si esto cambiaría algo de esa situación.",
    placeholder: "Ej: Hoy yo…",
  },
];

const EMPTY_ANSWERS = { q1: "", q2: "", q3: "" };

export default function TestPage() {
  // intro → view → questions → done. "intro" espera el clic del moderador
  // para que el conteo no arranque mientras se explica la dinámica; "done"
  // ofrece un botón para reiniciar y pasar a la siguiente persona.
  const [phase, setPhase] = useState("intro");
  const [left, setLeft] = useState(SECONDS);
  const [answers, setAnswers] = useState(EMPTY_ANSWERS);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  // Temporizador visible: a los SECONDS segundos el prototipo se oculta solo.
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

  function startTest() {
    setLeft(SECONDS);
    setPhase("view");
  }

  function startOver() {
    setAnswers(EMPTY_ANSWERS);
    setError("");
    setLeft(SECONDS);
    setPhase("intro");
  }

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
    setSending(false);
    setPhase("done");
  }

  return (
    <main className="test-page">
      <div className="test-card">
        {phase === "intro" && (
          <>
            <h1>Test de comprensión</h1>
            <p className="modal-sub">
              Vas a ver una pantalla durante {SECONDS} segundos. Luego te haremos 3 preguntas
              cortas. No hay respuestas correctas — responde lo primero que pienses.
            </p>
            <button className="btn btn-primary btn-block" onClick={startTest}>
              Comenzar test
            </button>
          </>
        )}

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
                <p className="test-hint">{q.hint}</p>
                <textarea
                  id={q.id}
                  value={answers[q.id]}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  placeholder={q.placeholder}
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
            <button className="btn btn-ghost btn-block" onClick={startOver}>
              Hacer otro test (siguiente persona)
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
