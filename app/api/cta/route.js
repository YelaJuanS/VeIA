import { NextResponse } from "next/server";
import { redis, cleanCanal } from "../../../lib/redis";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!redis) return NextResponse.json({ ok: false, kv: false });

    const canal = cleanCanal(body.canal);
    const location = String(body.location || "unknown").slice(0, 40);
    await Promise.all([
      redis.incr("stats:cta:total"),
      redis.hincrby("stats:cta:by_canal", canal, 1),
      redis.lpush(
        "log:cta",
        JSON.stringify({ ts: new Date().toISOString(), canal, location })
      ),
    ]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
