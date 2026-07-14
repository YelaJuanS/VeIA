import { Redis } from "@upstash/redis";

// Vercel KV hoy se provisiona como "Upstash for Redis" desde el Marketplace de
// Vercel. Según cómo se conecte, las variables llegan con prefijo KV_ (naming
// clásico), UPSTASH_ o un prefijo personalizado elegido al conectar. Buscamos
// primero los nombres estándar y, si no, cualquier variable con el sufijo REST.
const env = process.env;

function pick(exactNames, suffixes) {
  for (const n of exactNames) if (env[n]) return env[n];
  const key = Object.keys(env).find(
    (k) => !k.includes("READ_ONLY") && suffixes.some((s) => k.endsWith(s))
  );
  return key ? env[key] : undefined;
}

const url = pick(
  ["KV_REST_API_URL", "UPSTASH_REDIS_REST_URL"],
  ["_REST_API_URL", "REDIS_REST_URL"]
);
const token = pick(
  ["KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN"],
  ["_REST_API_TOKEN", "REDIS_REST_TOKEN"]
);

export const redis = url && token ? new Redis({ url, token }) : null;

// Nombres (no valores) de las env vars relacionadas con Redis presentes en el
// deploy — para diagnosticar la conexión desde /api/results sin exponer secretos.
export function redisEnvDiagnostic() {
  return Object.keys(env).filter((k) => /KV|UPSTASH|REDIS/i.test(k));
}

// Normaliza el nombre de canal para usarlo como campo de hash.
export function cleanCanal(canal) {
  return String(canal || "directo")
    .trim()
    .toLowerCase()
    .replace(/[^\w\-áéíóúñ]/gi, "-")
    .slice(0, 64) || "directo";
}

// Las listas guardan JSON; Upstash a veces lo devuelve ya parseado.
export function parseEntry(entry) {
  if (typeof entry === "string") {
    try {
      return JSON.parse(entry);
    } catch {
      return { raw: entry };
    }
  }
  return entry;
}
