/* Inera Doctor Hub — Web knowledge connector. Free, keyless public medical sources called directly from the browser:
   - NLM Clinical Tables: RxTerms (all US-listed drugs, strengths & forms) and ICD-10-CM search
   - openFDA drug labels (official prescribing information; no key needed: 240 req/min, 1,000/day per IP)
   - MedlinePlus Connect (NIH patient-education topics by ICD-10 code; JSONP)
   Results are cached on the device for 7 days. Everything degrades gracefully to the offline knowledge base. */
(function () {
  "use strict";
  var TTL = 7 * 24 * 3600 * 1000, PREFIX = "idhw:";
  function cacheGet(k) {
    try { var v = JSON.parse(localStorage.getItem(PREFIX + k) || "null"); if (v && Date.now() - v.t < TTL) return v.d; } catch (e) { /* ignore */ }
    return undefined;
  }
  function cacheSet(k, d) {
    try { localStorage.setItem(PREFIX + k, JSON.stringify({ t: Date.now(), d: d })); }
    catch (e) { try { Object.keys(localStorage).forEach(function (x) { if (x.indexOf(PREFIX) === 0) localStorage.removeItem(x); }); } catch (e2) { /* ignore */ } }
  }
  function getJSON(url, timeoutMs) {
    var hit = cacheGet(url);
    if (hit !== undefined) return Promise.resolve(hit);
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, timeoutMs || 9000);
    return fetch(url, ctrl ? { signal: ctrl.signal } : {}).then(function (r) {
      clearTimeout(timer);
      if (r.status === 404) return null;
      if (r.status === 429) throw new Error("rate");
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    }).then(function (d) { cacheSet(url, d); return d; }, function (e) { clearTimeout(timer); throw e; });
  }
  var jsonpN = 0;
  function jsonp(url, timeoutMs) {
    var hit = cacheGet(url);
    if (hit !== undefined) return Promise.resolve(hit);
    return new Promise(function (resolve, reject) {
      var cb = "__idhJsonp" + (++jsonpN) + "_" + Date.now();
      var s = document.createElement("script"), done = false;
      var timer = setTimeout(function () { if (!done) { done = true; cleanup(); reject(new Error("timeout")); } }, timeoutMs || 9000);
      function cleanup() { try { delete window[cb]; } catch (e) { window[cb] = undefined; } if (s.parentNode) s.parentNode.removeChild(s); }
      window[cb] = function (data) { if (done) return; done = true; clearTimeout(timer); cleanup(); cacheSet(url, data); resolve(data); };
      s.onerror = function () { if (done) return; done = true; clearTimeout(timer); cleanup(); reject(new Error("network")); };
      s.src = url + (url.indexOf("?") >= 0 ? "&" : "?") + "callback=" + cb;
      document.head.appendChild(s);
    });
  }

  function drugSearch(q) {
    q = String(q || "").trim(); if (q.length < 2) return Promise.resolve([]);
    var url = "https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?maxList=15&ef=STRENGTHS_AND_FORMS&terms=" + encodeURIComponent(q);
    return getJSON(url).then(function (d) {
      if (!Array.isArray(d)) return [];
      var names = d[1] || [], ext = (d[2] && d[2].STRENGTHS_AND_FORMS) || [];
      return names.map(function (n, i) { return { name: n, strengths: (ext[i] || []).map(function (x) { return String(x).trim(); }) }; });
    });
  }
  function icdSearch(q) {
    q = String(q || "").trim(); if (q.length < 2) return Promise.resolve([]);
    var url = "https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&maxList=15&terms=" + encodeURIComponent(q);
    return getJSON(url).then(function (d) {
      if (!Array.isArray(d)) return [];
      return (d[3] || []).map(function (row) { return { code: row[0], name: row[1] }; });
    });
  }
  /* "pregabalin (Oral Pill)" -> "pregabalin"; "Acetaminophen / Codeine (Oral Pill)" -> "acetaminophen" */
  function baseName(n) { return String(n || "").replace(/\(.*?\)/g, "").split("/")[0].trim().toLowerCase(); }
  var SECTIONS = [
    ["boxed_warning", "Boxed warning"], ["indications_and_usage", "Indications"], ["dosage_and_administration", "Dosage & administration"],
    ["contraindications", "Contraindications"], ["warnings_and_cautions", "Warnings & precautions"], ["warnings", "Warnings"],
    ["drug_interactions", "Drug interactions"], ["pregnancy", "Pregnancy"], ["use_in_specific_populations", "Specific populations"],
    ["adverse_reactions", "Adverse reactions"], ["overdosage", "Overdosage"]
  ];
  function fdaLabel(name) {
    var n = baseName(name).replace(/["\\]/g, "");
    if (!n) return Promise.resolve(null);
    var term = encodeURIComponent('"' + n + '"');
    var url = "https://api.fda.gov/drug/label.json?limit=1&search=openfda.generic_name:" + term + "+openfda.substance_name:" + term + "+openfda.brand_name:" + term;
    return getJSON(url, 10000).then(function (d) {
      if (!d || !d.results || !d.results.length) return null;
      var r = d.results[0], out = { query: n, generic: ((r.openfda || {}).generic_name || [n])[0], brand: ((r.openfda || {}).brand_name || [])[0] || "", sections: [] };
      SECTIONS.forEach(function (s) {
        var v = r[s[0]];
        if (v && v.length) out.sections.push({ key: s[0], title: s[1], text: v.join("\n").replace(/\s+\n/g, "\n").trim() });
      });
      out.version = r.effective_time || "";
      return out;
    });
  }
  function medline(icd) {
    icd = String(icd || "").trim(); if (!icd) return Promise.resolve([]);
    var url = "https://connect.medlineplus.gov/service?mainSearchCriteria.v.cs=2.16.840.1.113883.6.90&mainSearchCriteria.v.c=" + encodeURIComponent(icd) + "&informationRecipient.languageCode.c=en&knowledgeResponseType=application/javascript";
    return jsonp(url).then(function (d) {
      var e = (d && d.feed && d.feed.entry) || [];
      return e.map(function (x) {
        var link = (x.link && x.link[0] && x.link[0].href) || "";
        var sum = (x.summary && x.summary._value) || "";
        var tmp = document.createElement("div"); tmp.innerHTML = sum;
        return { title: (x.title && x.title._value) || "MedlinePlus topic", url: link, summary: (tmp.textContent || "").replace(/\s+/g, " ").trim() };
      }).filter(function (x) { return /^https:\/\//.test(x.url); });
    });
  }
  /* find mentions of another drug inside a label's interaction / warning text */
  function mentions(label, otherNames) {
    if (!label) return [];
    var hits = [];
    label.sections.filter(function (s) { return /interactions|warnings|contraindications|boxed/.test(s.key); }).forEach(function (s) {
      var sentences = s.text.split(/[.;]\s+/);
      otherNames.forEach(function (o) {
        var re = new RegExp("\\b" + o.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
        sentences.forEach(function (sn) { if (re.test(sn) && hits.length < 6) hits.push({ other: o, section: s.title, text: sn.slice(0, 400) }); });
      });
    });
    return hits;
  }
  window.IDHWeb = { drugSearch: drugSearch, icdSearch: icdSearch, fdaLabel: fdaLabel, medline: medline, mentions: mentions, baseName: baseName,
    online: function () { return navigator.onLine !== false; } };
})();
