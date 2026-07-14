/* VeIA — interacción + analítica
   Cada clic en un botón "Quiero probar VeIA" registra el evento "cta_click"
   en GoatCounter (y en Vercel Analytics como respaldo), y abre el formulario. */

(function () {
  "use strict";

  var overlay = document.getElementById("modal");
  var form = document.getElementById("lead-form");
  var thanks = document.getElementById("thanks");
  var formError = document.getElementById("form-error");
  var nameInput = document.getElementById("lead-name");
  var contactInput = document.getElementById("lead-contact");

  /* ── Analítica ─────────────────────────────────────────── */

  function trackEvent(name, location) {
    // GoatCounter: cuenta el evento con visitantes únicos por evento.
    if (window.goatcounter && typeof window.goatcounter.count === "function") {
      window.goatcounter.count({
        path: name,
        title: name + " (" + location + ")",
        event: true,
      });
    }
    // Vercel Web Analytics: evento personalizado (requiere plan Pro; si no, se ignora).
    if (typeof window.va === "function") {
      window.va("event", { name: name, data: { location: location } });
    }
  }

  /* ── Modal ─────────────────────────────────────────────── */

  function openModal() {
    overlay.hidden = false;
    form.hidden = false;
    thanks.hidden = true;
    formError.hidden = true;
    document.body.style.overflow = "hidden";
    nameInput.focus();
  }

  function closeModal() {
    overlay.hidden = true;
    document.body.style.overflow = "";
  }

  // Todos los botones CTA
  document.querySelectorAll("[data-cta]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      trackEvent("cta_click", btn.getAttribute("data-cta-location") || "unknown");
      openModal();
    });
  });

  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("thanks-close").addEventListener("click", closeModal);

  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !overlay.hidden) closeModal();
  });

  /* ── Formulario ────────────────────────────────────────── */

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var name = nameInput.value.trim();
    var contact = contactInput.value.trim();

    if (!name || !contact) {
      formError.hidden = false;
      return;
    }

    // Registra el lead como evento (el dato de contacto NO se envía a la analítica).
    trackEvent("lead_submit", "form");

    form.hidden = true;
    thanks.hidden = false;
    form.reset();
  });
})();
