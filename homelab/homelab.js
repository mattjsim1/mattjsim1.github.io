(() => {
  "use strict";

  const LIVE_SNAPSHOT_URL = "https://homelab-telemetry.mattman0396.workers.dev/api/snapshot";
  const STATIC_SNAPSHOT_URL = "data/snapshot.json";
  const LIVE_TIMEOUT_MS = 3500;

  document.querySelectorAll(".group-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const group = btn.dataset.group;
      const list = document.querySelector(`[data-group-list="${group}"]`);
      if (!list) return;
      const expanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!expanded));
      list.classList.toggle("is-collapsed", expanded);
    });
  });

  async function fetchWithTimeout(url, ms, opts = {}) {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), ms) : null;
    try {
      const fetchOpts = controller ? { ...opts, signal: controller.signal } : opts;
      return await fetch(url, fetchOpts);
    } finally {
      if (timer !== null) clearTimeout(timer);
    }
  }

  async function loadSnapshotWithFallback() {
    try {
      const res = await fetchWithTimeout(LIVE_SNAPSHOT_URL, LIVE_TIMEOUT_MS);
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === "object") {
          return { snap: data, source: "live" };
        }
      }
    } catch (_) {
      // Fall back to static snapshot on timeout, network error, or non-200
    }

    const res = await fetch(STATIC_SNAPSHOT_URL, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || typeof data !== "object") return null;
    return { snap: data, source: "static" };
  }

  function formatTimestamp(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function updateStatusFooter(source, sampledAt) {
    const statusEl = document.getElementById("telemetry-status");
    const textEl = document.getElementById("telemetry-status-text");
    const dotEl = statusEl ? statusEl.querySelector(".telemetry-dot") : null;
    if (!textEl) return;

    const formatted = formatTimestamp(sampledAt);
    if (source === "live") {
      if (dotEl) {
        dotEl.classList.remove("is-static");
        dotEl.classList.add("is-live");
      }
      textEl.textContent = formatted
        ? `Live telemetry · Updated ${formatted} - fetched apx. once per hour`
        : "Live telemetry - fetched apx. once per hour";
    } else {
      if (dotEl) {
        dotEl.classList.remove("is-live");
        dotEl.classList.add("is-static");
      }
      textEl.textContent = formatted ? `Static snapshot · ${formatted}` : "Static snapshot";
    }
    if (statusEl && sampledAt) {
      statusEl.title = `Sampled at ${sampledAt}`;
    }
  }

  async function hydrateFromSnapshot() {
    try {
      const loaded = await loadSnapshotWithFallback();
      if (!loaded) {
        updateStatusFooter("static", "");
        return;
      }
      const { snap, source } = loaded;

      if (snap.dockhand) {
        document.getElementById("m-dh-running").textContent = snap.dockhand.running;
        document.getElementById("m-dh-total").textContent = snap.dockhand.total;
        document.getElementById("m-dh-cpu").textContent = `${Number(snap.dockhand.cpuPercent).toFixed(1)}%`;
        document.getElementById("m-dh-mem").textContent = `${Number(snap.dockhand.memPercent).toFixed(1)}%`;
      }

      if (Array.isArray(snap.scrutiny)) {
        const passed = snap.scrutiny.filter((d) => d.device_status === 0).length;
        const failed = snap.scrutiny.length - passed;
        document.getElementById("m-sc-passed").textContent = passed;
        document.getElementById("m-sc-failed").textContent = failed;
      }

      if (Array.isArray(snap.gatus) && snap.gatus.length) {
        let up = 0;
        let totalChecks = 0;
        let okChecks = 0;
        snap.gatus.forEach((ep) => {
          const results = ep.results || [];
          const last = results[results.length - 1];
          if (last && last.success) up += 1;
          results.forEach((r) => {
            totalChecks += 1;
            if (r.success) okChecks += 1;
          });
        });
        const pct = totalChecks ? Math.round((okChecks / totalChecks) * 100) : 100;
        document.getElementById("m-gt-up").textContent = up;
        document.getElementById("m-gt-down").textContent = snap.gatus.length - up;
        document.getElementById("m-gt-pct").textContent = `${pct}%`;
      }

      updateStatusFooter(source, snap.sampledAt);
    } catch (_) {
      updateStatusFooter("static", "");
    }
  }

  hydrateFromSnapshot();
})();
