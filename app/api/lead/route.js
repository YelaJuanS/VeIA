import { NextResponse } from "next/server";
import { redis, cleanCanal } from "../../../lib/redis";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const nombre = String(body.nombre || "").trim().slice(0, 120);
    const contacto = String(body.contacto || "").trim().slice(0, 120);
    if (!nombre || !contacto) {
      return NextResponse.json({ ok: false, error: "Faltan campos" }, { status: 400 });
    }
    if (!redis) return NextResponse.json({ ok: false, kv: false });

    await redis.lpush(
      "log:leads",
      JSON.stringify({
        ts: new Date().toISOString(),
        canal: cleanCanal(body.canal),
        nombre,
        contacto,
        sector: String(body.sector || "").slice(0, 120),
        tipoLugar: String(body.tipoLugar || "").slice(0, 80),
        tipoFalla: String(body.tipoFalla || "").slice(0, 80),
      })
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
