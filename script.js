/* VeIA — demo interactivo + analítica
   Cada clic en "Quiero probar VeIA" registra el evento "cta_click" y abre
   un demo que simula la app: el usuario registra su falla paso a paso y
   en medio del flujo se capturan sus datos de contacto (lead_submit). */

(function () {
  "use strict";

  var overlay = document.getElementById("modal");

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

  /* ── Estado del demo ───────────────────────────────────── */

  var lead = { place: "", placeType: "", faultType: "", name: "", contact: "" };
  var timers = [];

  var steps = {
    1: document.getElementById("step-1"),
    2: document.getElementById("step-2"),
    3: document.getElementById("step-3"),
    4: document.getElementById("step-4"),
  };
  var progress = document.getElementById("demo-progress");
  var progressLabel = document.getElementById("progress-label");
  var progressFill = document.getElementById("progress-fill");

  function goToStep(n) {
    Object.keys(steps).forEach(function (k) {
      steps[k].hidden = Number(k) !== n;
    });
    if (n <= 3) {
      progress.hidden = false;
      progressLabel.textContent = "Paso " + n + " de 3";
      progressFill.style.width = (n / 3) * 100 + "%";
    } else {
      progress.hidden = true;
    }
    var firstInput = steps[n].querySelector("input");
    if (firstInput) firstInput.focus();
  }

  /* ── Abrir / cerrar el demo ────────────────────────────── */

  function openModal() {
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    resetDemo();
    goToStep(1);
  }

  function closeModal() {
    overlay.hidden = true;
    document.body.style.overflow = "";
    timers.forEach(clearTimeout);
    timers = [];
  }

  function resetDemo() {
    lead = { place: "", placeType: "", faultType: "", name: "", contact: "" };
    document.getElementById("demo-place").value = "";
    document.getElementById("lead-name").value = "";
    document.getElementById("lead-contact").value = "";
    document.getElementById("error-1").hidden = true;
    document.getElementById("error-3").hidden = true;
    document.querySelectorAll(".chip.selected, .option.selected").forEach(function (el) {
      el.classList.remove("selected");
    });
    document.querySelectorAll("#demo-steps .step").forEach(function (el) {
      el.classList.remove("done", "active", "revealed");
    });
    document.getElementById("demo-eta").hidden = true;
    timers.forEach(clearTimeout);
    timers = [];
  }

  document.querySelectorAll("[data-cta]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      trackEvent("cta_click", btn.getAttribute("data-cta-location") || "unknown");
      openModal();
    });
  });

  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("demo-close").addEventListener("click", closeModal);
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !overlay.hidden) closeModal();
  });

  /* ── Paso 1: sector + tipo de lugar ────────────────────── */

  document.querySelectorAll("#place-type .chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      document.querySelectorAll("#place-type .chip").forEach(function (c) {
        c.classList.remove("selected");
      });
      chip.classList.add("selected");
      lead.placeType = chip.getAttribute("data-value");
    });
  });

  document.getElementById("next-1").addEventListener("click", function () {
    lead.place = document.getElementById("demo-place").value.trim();
    if (!lead.place || !lead.placeType) {
      document.getElementById("error-1").hidden = false;
      return;
    }
    document.getElementById("error-1").hidden = true;
    goToStep(2);
  });

  /* ── Paso 2: tipo de falla (elegir avanza solo) ────────── */

  document.querySelectorAll("#fault-type .option").forEach(function (opt) {
    opt.addEventListener("click", function () {
      lead.faultType = opt.getAttribute("data-value");
      opt.classList.add("selected");
      timers.push(setTimeout(function () { goToStep(3); }, 250));
    });
  });

  /* ── Paso 3: captura de datos + envío del lead ─────────── */

  // Los leads llegan a este correo vía FormSubmit (https://formsubmit.co).
  // El primer envío dispara un correo de activación: haz clic en "Activate"
  // y desde ahí cada lead llega a tu bandeja de entrada.
  var LEAD_ENDPOINT = "https://formsubmit.co/ajax/juansebastianyela@gmail.com";

  document.getElementById("submit-demo").addEventListener("click", function () {
    lead.name = document.getElementById("lead-name").value.trim();
    lead.contact = document.getElementById("lead-contact").value.trim();

    if (!lead.name || !lead.contact) {
      document.getElementById("error-3").hidden = false;
      return;
    }
    document.getElementById("error-3").hidden = true;

    // Registra el lead como evento (los datos de contacto NO van a la analítica).
    trackEvent("lead_submit", "demo");

    // Envía el lead completo al correo. No bloquea la experiencia si falla la red.
    fetch(LEAD_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        nombre: lead.name,
        contacto: lead.contact,
        sector: lead.place,
        tipo_de_lugar: lead.placeType,
        tipo_de_falla: lead.faultType,
        _subject: "Nuevo lead VeIA 🚀 — " + lead.placeType,
        _template: "table",
        _captcha: "false",
      }),
    }).catch(function () { /* el lead igual quedó contado en la analítica */ });

    startSimulation();
  });

  /* ── Paso 4: simulación de la app en vivo ──────────────── */

  function startSimulation() {
    document.getElementById("ticket-id").textContent =
      "#" + (4000 + Math.floor(Math.random() * 900));
    document.getElementById("confirm-place").textContent =
      lead.place + " · " + lead.faultType;
    goToStep(4);

    var items = document.querySelectorAll("#demo-steps .step");
    // Los estados se van "encendiendo" en secuencia, como en la app real.
    timers.push(setTimeout(function () { items[0].classList.add("done", "revealed"); }, 400));
    timers.push(setTimeout(function () { items[1].classList.add("done", "revealed"); }, 1500));
    timers.push(setTimeout(function () { items[2].classList.add("active", "revealed"); }, 2500));
    timers.push(setTimeout(function () {
      document.getElementById("demo-eta").hidden = false;
    }, 3200));
  }
})();
