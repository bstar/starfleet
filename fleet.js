/* STAR/FLEET. Fills the version, CI and date slots from the GitHub API.
 *
 * The page is complete without this: every slot carries the values that
 * were true when it was last edited. This script asks GitHub for the current
 * ones, unauthenticated, and writes them over the static text. It keeps an
 * hour's cache in localStorage, and when the API is out of reach (offline,
 * rate limit, a repository without tags) it leaves whatever it has.
 *
 * The DOM contract: any element with data-repo="<name>" and data-field=
 * "version" | "tag" | "version-link" | "ci" | "date" is a slot. Nothing is
 * created, only filled. #fleet-status is a one-line summary under the roster.
 */
"use strict";

(function () {
  const OWNER = "bstar";
  const REPOS = ["staramp", "starcord", "starfold", "starkit"];
  const API = "https://api.github.com";
  const CACHE_TTL = 60 * 60 * 1000;          // refetch after an hour
  const MISSING_TTL = 24 * 60 * 60 * 1000;   // remember a 404 on releases for a day
  const KEY = (repo) => "starfleet:v1:" + repo;

  let limited = null;   // Date when the rate limit resets, once we hit it
  let offline = false;

  /* One request. Returns { status, json, headers } and never throws for an
   * HTTP error; a network failure marks the session offline. */
  async function gh(path) {
    if (limited || offline) return { status: 0, json: null };
    let res;
    try {
      res = await fetch(API + path, {
        headers: { Accept: "application/vnd.github+json" },
      });
    } catch (e) {
      offline = true;
      return { status: 0, json: null };
    }
    if ((res.status === 403 || res.status === 429) &&
        res.headers.get("X-RateLimit-Remaining") === "0") {
      const reset = Number(res.headers.get("X-RateLimit-Reset")) * 1000;
      limited = new Date(reset || Date.now() + 15 * 60 * 1000);
      return { status: res.status, json: null };
    }
    let json = null;
    try { json = await res.json(); } catch (e) { /* not JSON; treated as empty */ }
    return { status: res.status, json };
  }

  /* v1.2.3 or 1.2.3, with an optional pre-release suffix that sorts below
   * the release it precedes. Anything else is not a version. */
  function semverKey(name) {
    const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(name || "");
    if (!m) return null;
    return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] ? 0 : 1, m[4] || ""];
  }

  function compareKeys(a, b) {
    for (let i = 0; i < 4; i++) if (a[i] !== b[i]) return a[i] - b[i];
    return a[4] < b[4] ? -1 : a[4] > b[4] ? 1 : 0;
  }

  function readCache(repo) {
    try {
      const raw = localStorage.getItem(KEY(repo));
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function writeCache(repo, data) {
    try { localStorage.setItem(KEY(repo), JSON.stringify(data)); } catch (e) { /* full or blocked */ }
  }

  /* Fetch what the roster shows for one repository. `prev` is the cached
   * record, used to skip the releases call when we know there are none. */
  async function loadRepo(repo, prev) {
    const data = { at: Date.now(), version: null, url: null, ci: null, date: null,
                   releasesMissingAt: prev && prev.releasesMissingAt || null };
    const base = "/repos/" + OWNER + "/" + repo;

    const skipReleases = data.releasesMissingAt && (Date.now() - data.releasesMissingAt) < MISSING_TTL;
    if (!skipReleases) {
      const r = await gh(base + "/releases/latest");
      if (r.status === 200 && r.json && r.json.tag_name) {
        data.version = r.json.tag_name;
        data.url = r.json.html_url;
        data.releasesMissingAt = null;
      } else if (r.status === 404) {
        data.releasesMissingAt = Date.now();
      }
    }

    if (!data.version) {
      const t = await gh(base + "/tags?per_page=100");
      if (t.status === 200 && Array.isArray(t.json)) {
        let best = null;
        for (const tag of t.json) {
          const key = semverKey(tag && tag.name);
          if (key && (!best || compareKeys(key, best.key) > 0)) best = { key, name: tag.name };
        }
        if (best) {
          data.version = best.name;
          data.url = "https://github.com/" + OWNER + "/" + repo + "/releases/tag/" + best.name;
        } else {
          data.version = "unreleased";
          data.url = "https://github.com/" + OWNER + "/" + repo;
        }
      }
    }

    // Last activity is the last push; it does not depend on CI having run.
    const info = await gh(base);
    if (info.status === 200 && info.json && info.json.pushed_at) {
      data.date = String(info.json.pushed_at).slice(0, 10);
    }

    const runs = await gh(base + "/actions/workflows/ci.yml/runs?per_page=1&branch=main");
    if (runs.status === 200 && runs.json && Array.isArray(runs.json.workflow_runs)) {
      const run = runs.json.workflow_runs[0];
      if (!run) data.ci = "none";
      else if (run.conclusion === "success") data.ci = "ok";
      else if (run.conclusion === null && run.status !== "completed") data.ci = "running";
      else data.ci = "fail";
    }

    return data;
  }

  const CI_TEXT = { ok: "[ OK ]", fail: "[FAIL]", running: "[ .. ]", none: "[ -- ]" };
  const CI_CLASS = { ok: "ok", fail: "fail", running: "unknown", none: "unknown" };

  function fill(repo, field, text, cls) {
    document.querySelectorAll('[data-repo="' + repo + '"][data-field="' + field + '"]').forEach((el) => {
      if (field === "version-link") {
        if (text) el.href = text;
        return;
      }
      if (text == null) return;
      el.textContent = text;
      el.classList.remove("ok", "fail", "unknown");
      el.classList.add("live");
      if (cls) el.classList.add(cls);
    });
  }

  function render(repo, data) {
    if (!data) return;
    fill(repo, "version", data.version);
    fill(repo, "tag", data.version && data.version !== "unreleased" ? data.version : null);
    fill(repo, "version-link", data.url);
    if (data.ci) fill(repo, "ci", CI_TEXT[data.ci], CI_CLASS[data.ci]);
    fill(repo, "date", data.date);
  }

  function renderFleetDate(records) {
    const dates = records.map((r) => r && r.date).filter(Boolean).sort();
    if (dates.length) fill("fleet", "date", dates[dates.length - 1]);
  }

  function status(text) {
    const el = document.getElementById("fleet-status");
    if (el) el.textContent = text;
  }

  function hhmm(d) {
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  async function main() {
    const cached = REPOS.map(readCache);
    REPOS.forEach((repo, i) => render(repo, cached[i]));
    renderFleetDate(cached);

    const newest = Math.max(0, ...cached.map((c) => c && c.at || 0));
    const age = Date.now() - newest;
    if (newest && age < CACHE_TTL) {
      status("cached · " + Math.round(age / 60000) + " min old");
      return;
    }

    const results = await Promise.allSettled(REPOS.map((repo, i) => loadRepo(repo, cached[i])));
    const records = results.map((r, i) => {
      if (r.status !== "fulfilled") return cached[i];
      const data = r.value;
      // Keep the old answer for anything this pass could not learn.
      const prev = cached[i] || {};
      for (const k of ["version", "url", "ci", "date"]) if (data[k] == null && prev[k] != null) data[k] = prev[k];
      return data;
    });

    if (limited) {
      status("static · GitHub API rate limit reached, resets " + hhmm(limited));
    } else if (offline) {
      status("static · GitHub API unreachable");
    } else {
      REPOS.forEach((repo, i) => { render(repo, records[i]); writeCache(repo, records[i]); });
      renderFleetDate(records);
      status("live · fetched " + hhmm(new Date()));
    }
  }

  function crt() {
    const link = document.getElementById("crt-toggle");
    const apply = (on) => {
      document.body.classList.toggle("crt", on);
      if (link) link.textContent = on ? "[ CRT: on ]" : "[ CRT: off ]";
    };
    let on = false;
    try { on = localStorage.getItem("starfleet:crt") === "1"; } catch (e) { /* ignore */ }
    apply(on);
    if (link) link.addEventListener("click", (e) => {
      e.preventDefault();
      on = !on;
      apply(on);
      try { localStorage.setItem("starfleet:crt", on ? "1" : "0"); } catch (e) { /* ignore */ }
    });
  }

  crt();
  main().catch(() => status("static"));
})();
