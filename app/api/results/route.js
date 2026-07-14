import { NextResponse } from "next/server";
import { redis, parseEntry } from "../../../lib/redis";

export const dynamic = "force-dynamic";

// Contraseña del panel /resultados. Puedes sobreescribirla con la variable
// de entorno RESULTS_PASSWORD en Vercel sin tocar el código.
const PASSWORD = process.env.RESULTS_PASSWORD || "veia2026";

export async function GET(req) {
  const pw =
    req.nextUrl.searchParams.get("pw") || req.headers.get("x-password");
  if (pw !== PASSWORD) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!redis) {
    return NextResponse.json(
      { error: "KV no configurado. Conecta Upstash Redis (Vercel KV) al proyecto y redespliega." },
      { status: 503 }
    );
  }

  try {
    const [
      visitsTotal,
      ctaTotal,
      visitsByCanal,
      ctaByCanal,
      leads,
      test,
      logVisits,
      logCta,
    ] = await Promise.all([
      redis.get("stats:visits:total"),
      redis.get("stats:cta:total"),
      redis.hgetall("stats:visits:by_canal"),
      redis.hgetall("stats:cta:by_canal"),
      redis.lrange("log:leads", 0, -1),
      redis.lrange("log:test", 0, -1),
      redis.lrange("log:visits", 0, -1),
      redis.lrange("log:cta", 0, -1),
    ]);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      visits: {
        total: Number(visitsTotal) || 0,
        byCanal: visitsByCanal || {},
      },
      cta: {
        total: Number(ctaTotal) || 0,
        byCanal: ctaByCanal || {},
      },
      leads: (leads || []).map(parseEntry),
      test: (test || []).map(parseEntry),
      logs: {
        visits: (logVisits || []).map(parseEntry),
        cta: (logCta || []).map(parseEntry),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Error leyendo KV: " + (e?.message || "desconocido") },
      { status: 500 }
    );
  }
}
