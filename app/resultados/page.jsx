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
      </div>
    </main>
  );
}
