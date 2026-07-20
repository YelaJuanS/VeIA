import { NextResponse } from "next/server";
import { redis } from "../../../lib/redis";

// Endpoint único de eventos del test de usabilidad (S7). Recibe lotes:
// { sessionId, events: [{ id, type, ts, t, screen, data }] } — incluidos los
// enviados con navigator.sendBeacon (Blob application/json).

const TYPES = new Set([
  "task_start",
  "screen_view",
  "tap",
  "report_submitted",
  "location_changed",
  "notify_opt_in",
  "share_intent",
  "value_moment_reached",
  "hesitation",
  "backtrack",
  "dead_tap",
  "task_complete",
  "task_abandon",
  "feedback",
]);

function cleanData(data, maxStr) {
  const out = {};
  if (!data || typeof data !== "object") return out;
  for (const [k, v] of Object.entries(data)) {
    const key = String(k).slice(0, 40);
    if (typeof v === "number" || typeof v === "boolean") out[key] = v;
    else out[key] = String(v ?? "").slice(0, maxStr);
  }
  return out;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = String(body.sessionId || "").slice(0, 64);
    const events = Array.isArray(body.events) ? body.events.slice(0, 50) : [];
    if (!sessionId || events.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Faltan sessionId o events" },
        { status: 400 }
      );
    }

    const serverTs = new Date().toISOString();
    let hasStart = false;
    const entries = [];
    for (const ev of events) {
      if (!ev || !TYPES.has(ev.type)) continue;
      if (ev.type === "task_start") hasStart = true;
      entries.push(
        JSON.stringify({
          id: String(ev.id || "").slice(0, 64),
          sessionId,
          type: ev.type,
          ts: String(ev.ts || "").slice(0, 40),
          t: Number(ev.t) || 0,
          screen: String(ev.screen || "").slice(0, 40),
          data: cleanData(ev.data, ev.type === "feedback" ? 2000 : 300),
          serverTs,
        })
      );
    }
    if (entries.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Sin eventos válidos" },
        { status: 400 }
      );
    }

    if (!redis) return NextResponse.json({ ok: false, kv: false });

    await redis.lpush("log:mvp:events", ...entries);
    if (hasStart) await redis.sadd("stats:mvp:sessions", sessionId);
    return NextResponse.json({ ok: true, stored: entries.length });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
