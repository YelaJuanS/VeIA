import { NextResponse } from "next/server";
import { redis } from "../../../lib/redis";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const q1 = String(body.q1 || "").trim().slice(0, 2000);
    const q2 = String(body.q2 || "").trim().slice(0, 2000);
    const q3 = String(body.q3 || "").trim().slice(0, 2000);
    if (!q1 && !q2 && !q3) {
      return NextResponse.json({ ok: false, error: "Respuestas vacías" }, { status: 400 });
    }
    if (!redis) return NextResponse.json({ ok: false, kv: false });

    await redis.lpush(
      "log:test",
      JSON.stringify({ ts: new Date().toISOString(), q1, q2, q3 })
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
