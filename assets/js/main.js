/* Future Investment — site interactions */
(function () {
  "use strict";

  var SITE = {
    whatsapp: "918180970863",
    phone: "+918180970863",
    email: "akhileshtiwari837@gmail.com"
  };
  window.FI_SITE = SITE;

  document.documentElement.classList.remove("no-js");

  /* ---------- WhatsApp helper ---------- */
  function waLink(text) {
    return "https://wa.me/" + SITE.whatsapp + "?text=" + encodeURIComponent(text);
  }
  window.FI_waLink = waLink;

  function openWhatsApp(text) {
    var w = window.open(waLink(text), "_blank", "noopener");
    if (!w) window.location.href = waLink(text);
  }
  window.FI_openWhatsApp = openWhatsApp;

  /* ---------- Header shadow ---------- */
  var header = document.querySelector(".site-header");
  function onScroll() {
    if (header) header.classList.toggle("scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile nav ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("primary-nav");
  function setNav(open) {
    document.body.classList.toggle("nav-open", open);
    if (toggle) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }
  }
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setNav(!document.body.classList.contains("nav-open"));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a, button")) setNav(false);
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Animated counters ---------- */
  var counters = document.querySelectorAll("[data-count]");
  function runCounter(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
    var numEl = el.querySelector(".num") || el;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { numEl.textContent = target.toLocaleString("en-IN", { minimumFractionDigits: decimals }); return; }
    var start = null, dur = 1800;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      numEl.textContent = (target * eased).toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if (counters.length && "IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { runCounter(entry.target); cio.unobserve(entry.target); }
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { cio.observe(el); });
  } else {
    counters.forEach(runCounter);
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Appointment modal ---------- */
  var modal = document.getElementById("appointment-modal");
  var lastFocus = null;
  function openModal(service) {
    if (!modal) return;
    lastFocus = document.activeElement;
    var select = modal.querySelector("select[name=service]");
    if (select && service) {
      var match = Array.prototype.find.call(select.options, function (o) { return o.value === service; });
      if (!match) {
        match = new Option(service, service);
        select.add(match, 1);
      }
      select.value = service;
    }
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    setTimeout(function () {
      var first = modal.querySelector("input, select, textarea");
      if (first) first.focus({ preventScroll: true });
    }, 60);
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  window.FI_openAppointment = openModal;

  document.addEventListener("click", function (e) {
    var trigger = e.target.closest("[data-book]");
    if (trigger) {
      e.preventDefault();
      openModal(trigger.getAttribute("data-book") || "");
      return;
    }
    if (e.target.closest("[data-close-modal]")) closeModal();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (modal && modal.classList.contains("open")) closeModal();
      else if (document.body.classList.contains("nav-open")) setNav(false);
    }
    if (e.key === "Tab" && modal && modal.classList.contains("open")) {
      var f = modal.querySelectorAll("button, input, select, textarea, a[href]");
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Appointment date can't be in the past
  document.querySelectorAll("input[type=date][data-min-today]").forEach(function (el) {
    var d = new Date();
    el.min = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  });

  /* ---------- Lead forms → WhatsApp / Email ---------- */
  function validate(form) {
    var ok = true;
    form.querySelectorAll("[required]").forEach(function (input) {
      var field = input.closest(".form-field");
      var valid = input.type === "checkbox" ? input.checked : input.value.trim() !== "";
      if (valid && input.name === "phone") valid = /^(\+?91[\s-]?)?[6-9]\d{9}$/.test(input.value.replace(/[\s-]/g, ""));
      if (valid && input.type === "email" && input.value) valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value);
      if (field) field.classList.toggle("invalid", !valid);
      if (!valid && ok) { input.focus(); ok = false; }
    });
    return ok;
  }

  function composeMessage(form) {
    var lines = [form.getAttribute("data-title") || "Enquiry from website"];
    lines.push("");
    form.querySelectorAll("[data-label]").forEach(function (input) {
      var v = input.value.trim();
      if (!v) return;
      if (input.type === "date") {
        var d = new Date(v + "T00:00:00");
        if (!isNaN(d)) v = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
      }
      lines.push(input.getAttribute("data-label") + ": " + v);
    });
    return lines.join("\n");
  }

  document.querySelectorAll("form[data-lead-form]").forEach(function (form) {
    form.addEventListener("input", function (e) {
      var field = e.target.closest(".form-field.invalid");
      if (field) field.classList.remove("invalid");
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate(form)) return;
      var via = (e.submitter && e.submitter.getAttribute("data-via")) || "whatsapp";
      var msg = composeMessage(form);
      if (via === "email") {
        var subject = form.getAttribute("data-title") || "Website enquiry";
        window.location.href = "mailto:" + SITE.email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(msg);
      } else {
        openWhatsApp(msg);
      }
      var success = form.querySelector(".form-success");
      if (success) success.classList.add("show");
    });
  });

  /* ---------- "Open now" badge (IST business hours) ---------- */
  var openBadge = document.querySelector("[data-open-now]");
  if (openBadge) {
    try {
      var parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
      var get = function (t) { return (parts.find(function (p) { return p.type === t; }) || {}).value; };
      var day = get("weekday"), mins = parseInt(get("hour"), 10) * 60 + parseInt(get("minute"), 10);
      var open = day !== "Sun" && mins >= 600 && mins < 1140; // Mon–Sat 10:00–19:00
      openBadge.textContent = open ? "Open now" : "Closed now";
      openBadge.classList.toggle("is-closed", !open);
    } catch (err) { openBadge.remove(); }
  }
})();
