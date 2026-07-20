"use client";

import { useState } from "react";
import tracker from "../../lib/tracker";

// Captura cualitativa post-tarea (S7). Las respuestas quedan ligadas al
// sessionId del participante (evento "feedback" vía /api/track).

const QUESTIONS = [
  {
    id: "q1",
    text: "1. ¿Cómo te sentiste usándolo?",
    hint: "No hay respuestas correctas — describe la sensación: ¿tranquilidad, confusión, confianza, impaciencia…?",
    placeholder: "Ej: Me sentí…",
  },
  {
    id: "q2",
    text: "2. ¿Qué fue lo más claro y lo menos claro?",
    hint: "Algo que entendiste de inmediato, y algo que te costó o te hizo dudar.",
    placeholder: "Ej: Lo más claro fue… / me confundió…",
  },
  {
    id: "q3",
    text: "3. ¿Qué valor le encuentras a esta funcionalidad?",
    hint: "¿Cambiaría algo la próxima vez que se vaya la luz en tu casa? ¿Por qué sí o por qué no?",
    placeholder: "Ej: Me serviría para…",
  },
];

const EMPTY = { q1: "", q2: "", q3: "" };

export default function FeedbackPage() {
  const [answers, setAnswers] = useState(EMPTY);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!answers.q1.trim() && !answers.q2.trim() && !answers.q3.trim()) {
      setError("Responde al menos una pregunta antes de enviar.");
      return;
    }
    setError("");
    setSending(true);
    try {
      await tracker.feedback({
        q1: answers.q1.trim(),
        q2: answers.q2.trim(),
        q3: answers.q3.trim(),
      });
    } catch {
      // La pantalla de gracias se muestra igual; el moderador puede revisar.
    }
    setSending(false);
    setDone(true);
  }

  return (
    <main className="test-page reparapp-theme">
      <div className="test-card">
        {!done ? (
          <>
            <h1>3 preguntas rápidas</h1>
            <p className="modal-sub">
              Gracias por probarlo. Escribe lo primero que pienses — no hay
              respuestas correctas.
            </p>
            {QUESTIONS.map((q) => (
              <div className="test-question" key={q.id}>
                <label htmlFor={q.id}>{q.text}</label>
                <p className="test-hint">{q.hint}</p>
                <textarea
                  id={q.id}
                  value={answers[q.id]}
                  onChange={(e) =>
                    setAnswers({ ...answers, [q.id]: e.target.value })
                  }
                  placeholder={q.placeholder}
                />
              </div>
            ))}
            {error && <p className="form-error">{error}</p>}
            <button
              className="btn btn-primary btn-block"
              onClick={submit}
              disabled={sending}
            >
              {sending ? "Enviando…" : "Enviar respuestas"}
            </button>
          </>
        ) : (
          <div className="test-done">
            <div className="thanks-icon" aria-hidden="true">⚡</div>
            <h1>¡Gracias!</h1>
            <p className="modal-sub">Tus respuestas quedaron guardadas.</p>
            {/* Recarga dura: el tracker genera un sessionId nuevo → nueva
                sesión para el siguiente participante. */}
            <button
              className="btn btn-ghost btn-block"
              onClick={() => (window.location.href = "/mvp")}
            >
              Siguiente participante
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
