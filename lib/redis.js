import { Redis } from "@upstash/redis";

// Vercel KV hoy se provisiona como "Upstash for Redis" desde el Marketplace de
// Vercel. Según cómo se conecte, las variables llegan con prefijo KV_ (naming
// clásico de Vercel KV) o UPSTASH_ (naming de Upstash). Soportamos ambos.
const url =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis = url && token ? new Redis({ url, token }) : null;

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
