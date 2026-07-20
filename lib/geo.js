"use client";

// Ubicación real del navegador (Geolocation API + reverse geocoding).
//
// PRIVACIDAD: las coordenadas crudas NO salen de esta función. Al tracker y a
// Redis solo viaja la etiqueta legible (vía y barrio) y la precisión en
// metros. Guardar el GPS exacto de la casa de un participante de un test de
// usabilidad es un riesgo innecesario para lo que el experimento necesita.
//
// Requiere HTTPS (Vercel lo da) y consentimiento explícito del usuario: el
// navegador muestra su propio diálogo de permisos, que no se puede estilizar
// ni evitar.

import { LOCATION } from "./mvp-config";

// Convierte coordenadas en una dirección legible usando Nominatim (OSM):
// sin API key ni facturación. Su política de uso pide volumen bajo, lo que
// encaja con un prototipo de pocas sesiones; para producción real habría que
// pasar a Google/Mapbox con llave.
async function reverseGeocode(lat, lon) {
  try {
    const url =
      "https://nominatim.openstreetmap.org/reverse?format=jsonv2" +
      `&lat=${lat}&lon=${lon}&zoom=17&accept-language=es`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return "";
    const d = await res.json();
    const a = d.address || {};
    const via = [a.road, a.house_number].filter(Boolean).join(" ");
    const zona =
      a.neighbourhood || a.suburb || a.city_district || a.town || a.city || "";
    const label = [via, zona].filter(Boolean).join(" · ");
    if (label) return label;
    return (d.display_name || "").split(",").slice(0, 2).join(",").trim();
  } catch {
    return "";
  }
}

// Devuelve { status, label, accuracy }.
// status: granted | denied | unavailable | timeout | unsupported
export function requestRealLocation() {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ status: "unsupported" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const label = await reverseGeocode(latitude, longitude);
        resolve({
          status: "granted",
          label,
          accuracy: Math.round(accuracy || 0),
        });
      },
      (err) => {
        // 1 PERMISSION_DENIED · 2 POSITION_UNAVAILABLE · 3 TIMEOUT
        const map = { 1: "denied", 2: "unavailable", 3: "timeout" };
        resolve({ status: map[err?.code] || "unavailable" });
      },
      {
        enableHighAccuracy: true,
        timeout: LOCATION.timeoutMs,
        maximumAge: 60000,
      }
    );
  });
}
