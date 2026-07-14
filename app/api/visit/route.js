import { NextResponse } from "next/server";
import { redis, cleanCanal } from "../../../lib/redis";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!redis) return NextResponse.json({ ok: false, kv: false });

    const canal = cleanCanal(body.canal);
    await Promise.all([
      redis.incr("stats:visits:total"),
      redis.hincrby("stats:visits:by_canal", canal, 1),
      redis.lpush(
        "log:visits",
        JSON.stringify({ ts: new Date().toISOString(), canal })
      ),
    ]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
