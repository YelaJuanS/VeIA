"use client";

import { useState } from "react";

function pct(clicks, visits) {
  if (!visits) return "—";
  return ((clicks / visits) * 100).toFixed(1) + "%";
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

// Un solo CSV plano con todos los datos crudos, una fila por evento.
function buildCsv(data) {
  const cols = [
    "tipo", "timestamp", "canal", "location", "nombre", "contacto",
    "sector", "tipo_lugar", "tipo_falla", "q1", "q2", "q3",
  ];
  const rows = [cols.join(",")];
  (data.logs?.visits || []).forEach((e) =>
    rows.push([ "visita", e.ts, e.canal, "", "", "", "", "", "", "", "", "" ].map(csvEscape).join(","))
  );
  (data.logs?.cta || []).forEach((e) =>
    rows.push([ "cta_click", e.ts, e.canal, e.location, "", "", "", "", "", "", "", "" ].map(csvEscape).join(","))
  );
  (data.leads || []).forEach((e) =>
    rows.push([
      "lead", e.ts, e.canal, "", e.nombre, e.contacto,
      e.sector, e.tipoLugar, e.tipoFalla, "", "", "",
    ].map(csvEscape).join(","))
  );
  (data.test || []).forEach((e) =>
    rows.push([ "test", e.ts, "", "", "", "", "", "", "", e.q1, e.q2, e.q3 ].map(csvEscape).join(","))
  );
  return rows.join("\n");
}

/* ─────────────── MVP S7 — test de usabilidad ─────────────── */

const MVP_SCREENS = ["inicio", "reporte", "mapa", "detalle"];
const MVP_SCREEN_LABELS = {
  inicio: "Entrada",
  reporte: "Reporte",
  mapa: "Mapa vivo",
  detalle: "Detalle",
};

// Dedupe por id (sendBeacon + fetch pueden duplicar) y orden cronológico.
function dedupeMvpEvents(events) {
  const seen = new Set();
  const out = [];
  for (const e of events || []) {
    if (!e || !e.type) continue;
    if (e.id) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
    }
    out.push(e);
  }
  return out;
}

function summarizeMvpSession(id, evs) {
  evs.sort((a, b) => (Number(a.t) || 0) - (Number(b.t) || 0));
  const find = (t) => evs.find((e) => e.type === t);
  const count = (t) => evs.filter((e) => e.type === t).length;
  const start = find("task_start");
  const value = find("value_moment_reached");
  const complete = find("task_complete");
  const abandon = find("task_abandon");
  const feedback = find("feedback");
  const report = find("report_submitted");

  // Permanencia por pantalla (suma de screen_view)
  const dwell = {};
  for (const e of evs) {
    if (e.type !== "screen_view") continue;
    const s = e.data?.screen || e.screen;
    if (s) dwell[s] = (dwell[s] || 0) + (Number(e.data?.durationMs) || 0);
  }
  let topScreen = "—";
  let topMs = 0;
  for (const [s, ms] of Object.entries(dwell)) {
    if (ms > topMs) { topScreen = s; topMs = ms; }
  }

  const lastT = evs.reduce((m, e) => Math.max(m, Number(e.t) || 0), 0);
  return {
    id,
    nombre: report?.data?.nombre || "",
    lugar: report?.data?.lugar || "",
    alcance: report?.data?.alcance || "",
    startTs: start?.ts || evs[0]?.ts || "",
    reachedValue: !!value,
    timeToValueMs: value ? Number(value.data?.timeToValueMs) || null : null,
    outcome: complete ? "completada" : abandon ? "abandonada" : "incompleta",
    backtracks: count("backtrack"),
    deadTaps: count("dead_tap"),
    hesitations: count("hesitation"),
    topScreen,
    topMs,
    totalMs: (complete && Number(complete.data?.totalMs)) || lastT,
    screensVisited: new Set(
      evs.map((e) => e.screen).filter((s) => MVP_SCREENS.includes(s))
    ),
    feedback: feedback ? feedback.data : null,
    events: evs,
  };
}

function groupMvpSessions(events) {
  const by = new Map();
  for (const e of dedupeMvpEvents(events)) {
    if (!e.sessionId) continue;
    if (!by.has(e.sessionId)) by.set(e.sessionId, []);
    by.get(e.sessionId).push(e);
  }
  const sessions = Array.from(by, ([id, evs]) => summarizeMvpSession(id, evs));
  sessions.sort((a, b) => (a.startTs || "").localeCompare(b.startTs || ""));
  return sessions;
}

// Fricción agregada por pantalla: hesitaciones + dead_taps.
function mvpFrictionByScreen(sessions) {
  const f = {};
  for (const s of sessions) {
    for (const e of s.events) {
      if (e.type !== "hesitation" && e.type !== "dead_tap") continue;
      const sc = e.data?.screen || e.screen || "?";
      f[sc] = (f[sc] || 0) + 1;
    }
  }
  return f;
}

function median(nums) {
  const a = nums.filter((n) => Number.isFinite(n)).sort((x, y) => x - y);
  if (!a.length) return null;
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

function fmtSec(ms) {
  if (ms == null || !Number.isFinite(ms)) return "—";
  return (ms / 1000).toFixed(1).replace(".", ",") + " s";
}

// CSV crudo de eventos del MVP, una fila por evento.
function buildMvpCsv(events) {
  const cols = [
    "sessionId", "type", "ts", "t_ms", "screen", "targetId",
    "interactive", "duration_ms", "from", "to", "nombre", "lugar", "alcance", "extra",
  ];
  const rows = [cols.join(",")];
  for (const e of dedupeMvpEvents(events)) {
    const d = e.data || {};
    const {
      targetId, interactive, durationMs, from, to, nombre, lugar, alcance, ...rest
    } = d;
    rows.push(
      [
        e.sessionId, e.type, e.ts, e.t, e.screen,
        targetId ?? "", interactive ?? "", durationMs ?? "",
        from ?? "", to ?? "", nombre ?? "", lugar ?? "", alcance ?? "",
        Object.keys(rest).length ? JSON.stringify(rest) : "",
      ].map(csvEscape).join(",")
    );
  }
  return rows.join("\n");
}

export default function ResultadosPage() {
  const [pw, setPw] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load(e) {
    e?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/results", { headers: { "x-password": pw } });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Error consultando los datos.");
        setData(null);
      } else {
        setData(json);
      }
    } catch {
      setError("No se pudo conectar con la API.");
    }
    setLoading(false);
  }

  if (!data) {
    return (
      <main className="res-page">
        <form className="res-login" onSubmit={load}>
          <h1>Panel de resultados</h1>
          <input
            type="password"
            placeholder="Contraseña"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoFocus
          />
          {error && <p className="res-error">{error}</p>}
          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Cargando…" : "Entrar"}
          </button>
        </form>
      </main>
    );
  }

  const mvpEvents = data.mvp?.events || [];
  const mvpSessions = groupMvpSessions(mvpEvents);
  const mvpReached = mvpSessions.filter((s) => s.reachedValue);
  const mvpCompleted = mvpSessions.filter((s) => s.outcome === "completada");
  const mvpTtvMedian = median(mvpReached.map((s) => s.timeToValueMs));
  const mvpFriction = mvpFrictionByScreen(mvpSessions);
  const mvpFrictionTop = Object.entries(mvpFriction).sort((a, b) => b[1] - a[1])[0];
  const funnel = [
    ...MVP_SCREENS.map((sc) => ({
      label: MVP_SCREEN_LABELS[sc],
      n: mvpSessions.filter((s) => s.screensVisited.has(sc)).length,
    })),
    { label: "Completó", n: mvpCompleted.length },
  ];

  // Une los canales vistos en visitas y en clics.
  const canales = Array.from(
    new Set([
      ...Object.keys(data.visits.byCanal || {}),
      ...Object.keys(data.cta.byCanal || {}),
    ])
  ).sort();

  return (
    <main className="res-page">
      <div className="container">
        <h1>Resultados Ve<span className="ia-inline">IA</span></h1>
        <p className="res-sub">Generado: {new Date(data.generatedAt).toLocaleString()}</p>

        <div className="res-actions">
          <button
            className="btn btn-primary"
            onClick={() => download("veia-datos.json", JSON.stringify(data, null, 2), "application/json")}
          >
            Descargar JSON
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => download("veia-datos.csv", buildCsv(data), "text/csv")}
          >
            Descargar CSV
          </button>
          <button className="btn btn-ghost" onClick={load}>Actualizar</button>
        </div>

        <div className="kpis">
          <div className="kpi">
            <p className="kpi-label">Visitas</p>
            <p className="kpi-value">{data.visits.total}</p>
          </div>
          <div className="kpi">
            <p className="kpi-label">CTA clicks</p>
            <p className="kpi-value">{data.cta.total}</p>
          </div>
          <div className="kpi">
            <p className="kpi-label">Tasa global</p>
            <p className="kpi-value">{pct(data.cta.total, data.visits.total)}</p>
          </div>
          <div className="kpi">
            <p className="kpi-label">Contactos</p>
            <p className="kpi-value">{data.leads.length}</p>
          </div>
        </div>

        <section className="res-section">
          <h2>Conversión por canal</h2>
          <div className="res-table-wrap">
            <table className="res-table">
              <thead>
                <tr>
                  <th>Canal</th>
                  <th className="num">Visitas</th>
                  <th className="num">CTA clicks</th>
                  <th className="num">Tasa</th>
                </tr>
              </thead>
              <tbody>
                {canales.length === 0 && (
                  <tr><td colSpan="4" className="res-empty">Aún no hay datos.</td></tr>
                )}
                {canales.map((c) => {
                  const v = Number(data.visits.byCanal[c]) || 0;
                  const k = Number(data.cta.byCanal[c]) || 0;
                  return (
                    <tr key={c}>
                      <td>{c}</td>
                      <td className="num">{v}</td>
                      <td className="num">{k}</td>
                      <td className="num">{pct(k, v)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="res-section">
          <h2>Contactos dejados ({data.leads.length})</h2>
          <div className="res-table-wrap">
            <table className="res-table">
              <thead>
                <tr>
                  <th>Fecha</th><th>Nombre</th><th>Contacto</th>
                  <th>Sector</th><th>Tipo de lugar</th><th>Falla</th><th>Canal</th>
                </tr>
              </thead>
              <tbody>
                {data.leads.length === 0 && (
                  <tr><td colSpan="7" className="res-empty">Aún no hay contactos.</td></tr>
                )}
                {data.leads.map((l, i) => (
                  <tr key={i}>
                    <td>{l.ts ? new Date(l.ts).toLocaleString() : "—"}</td>
                    <td>{l.nombre}</td>
                    <td>{l.contacto}</td>
                    <td>{l.sector}</td>
                    <td>{l.tipoLugar}</td>
                    <td>{l.tipoFalla}</td>
                    <td>{l.canal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="res-section">
          <h2>Test cualitativo ({data.test.length} respuestas)</h2>
          {data.test.length === 0 && <p className="res-empty">Aún no hay respuestas del test.</p>}
          {data.test.map((t, i) => (
            <div className="res-answer" key={i}>
              <p className="res-answer-head">
                Respuesta #{data.test.length - i} · {t.ts ? new Date(t.ts).toLocaleString() : "—"}
              </p>
              <p><strong>¿Qué es esto?</strong> {t.q1 || "—"}</p>
              <p><strong>¿Para quién es?</strong> {t.q2 || "—"}</p>
              <p><strong>¿En qué es diferente?</strong> {t.q3 || "—"}</p>
            </div>
          ))}
        </section>

        <section className="res-section">
          <h2>MVP S7 — Test de usabilidad ({mvpSessions.length} participantes)</h2>

          {mvpSessions.length === 0 && (
            <p className="res-empty">Aún no hay sesiones del MVP.</p>
          )}

          {mvpSessions.length > 0 && (
            <>
              <div className="kpis">
                <div className="kpi">
                  <p className="kpi-label">Llegaron al valor</p>
                  <p className="kpi-value">
                    {mvpReached.length}/{mvpSessions.length}
                  </p>
                </div>
                <div className="kpi">
                  <p className="kpi-label">Time-to-value mediano</p>
                  <p className="kpi-value">{fmtSec(mvpTtvMedian)}</p>
                </div>
                <div className="kpi">
                  <p className="kpi-label">Completaron</p>
                  <p className="kpi-value">
                    {mvpCompleted.length}/{mvpSessions.length}
                  </p>
                </div>
                <div className="kpi">
                  <p className="kpi-label">Pantalla con más fricción</p>
                  <p className="kpi-value kpi-value-sm">
                    {mvpFrictionTop
                      ? `${MVP_SCREEN_LABELS[mvpFrictionTop[0]] || mvpFrictionTop[0]} (${mvpFrictionTop[1]})`
                      : "—"}
                  </p>
                </div>
              </div>

              <h3 className="res-subhead">Embudo del flujo</h3>
              <div className="mvp-funnel">
                {funnel.map((f) => (
                  <div className="mvp-funnel-row" key={f.label}>
                    <span className="mvp-funnel-label">{f.label}</span>
                    <span className="mvp-funnel-track">
                      <span
                        className="mvp-funnel-fill"
                        style={{
                          width: `${mvpSessions.length ? (f.n / mvpSessions.length) * 100 : 0}%`,
                        }}
                      ></span>
                    </span>
                    <span className="mvp-funnel-n">{f.n}</span>
                  </div>
                ))}
              </div>

              <h3 className="res-subhead">Por participante</h3>
              <div className="res-table-wrap">
                <table className="res-table">
                  <thead>
                    <tr>
                      <th>Sesión</th>
                      <th>Participante</th>
                      <th>Ubicación detectada</th>
                      <th>Alcance</th>
                      <th>Inicio</th>
                      <th className="num">Time-to-value</th>
                      <th>¿Valor?</th>
                      <th>Resultado</th>
                      <th className="num">Backtracks</th>
                      <th className="num">Dead taps</th>
                      <th className="num">Hesitaciones</th>
                      <th>Mayor permanencia</th>
                      <th className="num">Duración</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mvpSessions.map((s) => (
                      <tr key={s.id}>
                        <td>{s.id.slice(0, 8)}</td>
                        <td>{s.nombre || "—"}</td>
                        <td>{s.lugar || "—"}</td>
                        <td>{s.alcance || "—"}</td>
                        <td>{s.startTs ? new Date(s.startTs).toLocaleString() : "—"}</td>
                        <td className="num">{fmtSec(s.timeToValueMs)}</td>
                        <td>{s.reachedValue ? "Sí" : "No"}</td>
                        <td>{s.outcome}</td>
                        <td className="num">{s.backtracks}</td>
                        <td className="num">{s.deadTaps}</td>
                        <td className="num">{s.hesitations}</td>
                        <td>
                          {s.topScreen !== "—"
                            ? `${MVP_SCREEN_LABELS[s.topScreen] || s.topScreen} (${fmtSec(s.topMs)})`
                            : "—"}
                        </td>
                        <td className="num">{fmtSec(s.totalMs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="res-subhead">Feedback cualitativo</h3>
              {mvpSessions.filter((s) => s.feedback).length === 0 && (
                <p className="res-empty">Aún no hay respuestas de feedback.</p>
              )}
              {mvpSessions
                .filter((s) => s.feedback)
                .map((s) => (
                  <div className="res-answer" key={s.id}>
                    <p className="res-answer-head">
                      Sesión {s.id.slice(0, 8)} ·{" "}
                      {s.startTs ? new Date(s.startTs).toLocaleString() : "—"}
                    </p>
                    <p><strong>¿Cómo te sentiste?</strong> {s.feedback.q1 || "—"}</p>
                    <p><strong>Más / menos claro:</strong> {s.feedback.q2 || "—"}</p>
                    <p><strong>¿Qué valor le encuentras?</strong> {s.feedback.q3 || "—"}</p>
                  </div>
                ))}

              <div className="res-actions">
                <button
                  className="btn btn-ghost"
                  onClick={() =>
                    download("veia-mvp-eventos.csv", buildMvpCsv(mvpEvents), "text/csv")
                  }
                >
                  Descargar CSV eventos MVP
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
