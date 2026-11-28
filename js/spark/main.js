import {
  FREE_SLOTS, MAX_SLOTS, TH, gen, TABS, DUO_MISSIONS, LV, XP, RN, DN,
  GFL, U, NECK, E
} from "./config.js";
import { renderPetSVG, getPreviewSVG, VB } from "./avatar.js";
import {
  bindPetDOM, applyPetFrame, bumpPet, burstSparks,
  startAnimationLoop, initInteractions
} from "./animation.js";
import {
  $, hap, normUsn, fmtUsn, day, store,
  lvl, unl, need, toast,
  isMeQualified, isPartnerQualified, explainHourglassStatus,
  saveCurrentPetStyle, doSave, save, load, autoDetectIdentity
} from "./state.js";
import { renderHub } from "./hub.js";

let styleSyncTimer = null;

function scheduleStyleSync() {
  const partner = normUsn(store.S.p2);
  if (!partner || store.VIEW_MODE !== "stage") return;
  store.STYLE_SYNC_LOCK_UNTIL = Date.now() + 4500;
  const snap = saveCurrentPetStyle();
  save();

  clearTimeout(styleSyncTimer);
  styleSyncTimer = setTimeout(() => {
    const latestSnap = saveCurrentPetStyle() || snap;
    if (!latestSnap || !store.S.p2) return;
    sendActionToServer({
      type: "SPARK_UPDATE_STYLE",
      fromUsername: normUsn(store.MY_USN),
      targetUsername: normUsn(store.S.p2),
      petName: latestSnap.nm,
      style: latestSnap
    }, true);
  }, 550);
}

function draw() {
  const lv = lvl();
  const { html, st } = renderPetSVG(store.S, lv);
  $("svg").innerHTML = html;
  bindPetDOM();
  applyPetFrame();
  hud(lv, st);
  lvCheck();
  save();
}

function loadActivePairIntoStage() {
  const { S, PAIRS, PET_STYLES, MY_USN, UNLOCKED_SLOTS } = store;
  if (store.ACTIVE_IDX >= PAIRS.length) store.ACTIVE_IDX = Math.max(0, PAIRS.length - 1);
  const p = PAIRS[store.ACTIVE_IDX];
  S.p1 = MY_USN;
  if (!p) {
    S.p2 = "";
    S.days = 0;
    S.xp = 0;
    S.g1 = { gap: 0, msg: 0 };
    S.g2 = { gap: 0, msg: 0 };
    S.hasSetorToday = false;
    S.caseCompleted = false;
    return;
  }
  S.p2 = normUsn(p.partnerUsername);
  S.days = Number(p.streak) || 0;
  S.xp = Number(p.xp) || 0;
  S.g1 = p.g1 || { gap: 0, msg: 0 };
  S.g2 = p.g2 || { gap: 0, msg: 0 };
  S.hasSetorToday = Boolean(p.hasSetorToday || p.litToday || (S.g1.gap >= 5 && S.g1.msg >= 2));
  S.caseCompleted = Boolean(p.caseCompleted);

  if (S.hasSetorToday) {
    S.last = day();
    store.LOCAL_SETOR_DAY = day();
  }

  $("stageTitle").textContent = "@" + S.p2;
  $("stageSub").textContent = `Slot ${store.ACTIVE_IDX + 1}/${UNLOCKED_SLOTS} • One Group`;
  const hubBtn = $("hubBackBtn");
  if (hubBtn) hubBtn.textContent = `‹ ${UNLOCKED_SLOTS} Slot`;

  const isEditingLocally = Date.now() < store.STYLE_SYNC_LOCK_UNTIL || document.activeElement === $("nm");
  if (!isEditingLocally) {
    const serverStyle = p.petStyle && typeof p.petStyle === "object" ? p.petStyle : null;
    const st = serverStyle || PET_STYLES[S.p2] || null;
    const resolvedName = String(p.petName || (st && st.nm) || S.p2.toUpperCase().slice(0, 12)).slice(0, 14);

    if ($("nm") && $("nm").textContent !== resolvedName) {
      $("nm").textContent = resolvedName;
    }

    if (st) {
      S.theme = TH[st.theme] ? st.theme : "Api";
      S.outfit = st.outfit || "Jaket Punk";
      S.head = st.head || "Beanie";
      S.face = st.face || "Normal";
      S.extra = Array.isArray(st.extra) ? new Set(st.extra) : new Set(["Peniti"]);
      S.emo = E[st.emo] ? st.emo : "Happy";
      PET_STYLES[S.p2] = Object.assign({}, st, { nm: resolvedName });
    } else {
      S.theme = "Api";
      S.outfit = "Jaket Punk";
      S.head = "Beanie";
      S.face = "Normal";
      S.extra = new Set(["Peniti"]);
      S.emo = "Happy";
    }
  }
}

function openStageForSlot(idx) {
  saveCurrentPetStyle();
  store.ACTIVE_IDX = idx;
  store.VIEW_MODE = "stage";
  loadActivePairIntoStage();
  $("pairGate").hidden = true;
  draw();
  ui();
  explainHourglassStatus(false);
  hap();
}

function openHubScreen() {
  saveCurrentPetStyle();
  store.VIEW_MODE = "hub";
  $("pairGate").hidden = false;
  renderHub({
    onOpenSlot: openStageForSlot,
    onSendAction: sendActionToServer,
    onSendInvite: sendInvite
  });
  hap();
}

$("hubBackBtn").onclick = openHubScreen;

function hud(lv, st) {
  const { S, MY_USN } = store;
  const [, M, , bo] = TH[S.theme] || TH.Api, a = XP[lv - 1], b = XP[lv], mx = lv >= 10;
  document.documentElement.style.setProperty("--ac", M);
  document.documentElement.style.setProperty("--gl", bo);
  $("num").textContent = S.days;
  const q1 = isMeQualified();
  const q2 = isPartnerQualified();

  let stLabel = "⏳ Belum Nyala (Tap Info)";
  if (S.caseCompleted) stLabel = "🏁 Kasus Mingguan Selesai";
  else if (q1 && q2) stLabel = S.days >= 3 ? "🔥 Api Aman" : "🔥 Qualified Hari Ini";
  else if (q1 && !q2) stLabel = "⏳ Nunggu Partner Setor";
  else if (!q1 && q2) stLabel = "⏳ Giliran Kamu Setor!";
  else if (S.days >= 3) stLabel = "🚨 Critical Spark";

  const sbEl = $("sb");
  sbEl.textContent = stLabel;
  sbEl.style.cursor = "pointer";
  sbEl.onclick = () => explainHourglassStatus(true);

  const u1 = fmtUsn(S.p1 || MY_USN) || "@gue", u2 = fmtUsn(S.p2) || "@partner";
  $("p1Name").textContent = u1;
  $("p2Name").textContent = u2;
  $("g1Lbl").textContent = u1.slice(0, 12);
  $("g2Lbl").textContent = u2.slice(0, 12);

  const g1ValEl = $("g1Val");
  const g2ValEl = $("g2Val");
  g1ValEl.textContent = `${Math.min(5, S.g1.gap)}/5 GAP · ${Math.min(2, S.g1.msg)}/2 ${q1 ? "✅" : "⏳"}`;
  g2ValEl.textContent = `${Math.min(5, S.g2.gap)}/5 GAP · ${Math.min(2, S.g2.msg)}/2 ${q2 ? "✅" : "⏳"}`;
  g1ValEl.style.cursor = "pointer";
  g2ValEl.style.cursor = "pointer";
  g1ValEl.onclick = () => explainHourglassStatus(true);
  g2ValEl.onclick = () => explainHourglassStatus(true);

  $("rare").textContent = RN[st];
  $("lvc").textContent = "Lv " + lv + " · " + LV[lv - 1];
  $("fill").style.width = (mx ? 100 : (S.xp - a) / (b - a) * 100) + "%";
  $("bt").textContent = mx ? "MAX" : `${S.xp - a} / ${b - a} XP`;
  $("bh").textContent = mx ? "Level tertinggi" : `${b - S.xp} XP lagi naik level`;
  ciUpd();
}

function tog(v) {
  const { S } = store;
  if (S.extra.has(v)) return S.extra.delete(v);
  if (NECK.includes(v)) NECK.forEach(n => S.extra.delete(n));
  S.extra.add(v);
}

function lock(v, b) {
  toast("Terbuka di " + need(v));
  b.classList.remove("shake");
  void b.offsetWidth;
  b.classList.add("shake");
  hap();
}

function tabsInit() {
  TABS.forEach(([n], i) => {
    const b = document.createElement("button");
    b.textContent = n;
    b.onclick = () => { if (store.tab != i) { store.tab = i; ui(); hap(); } };
    $("tabs").appendChild(b);
  });
}

function mark() {
  const { S, tab } = store;
  const k = TABS[tab][1];
  $("body").querySelectorAll(".it").forEach(b => {
    const on = k == "extra" ? S.extra.has(b.dataset.v) : S[k] == b.dataset.v;
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", on);
  });
}

function ui() {
  const { S, tab, gf, SEEN } = store;
  const tb = $("tabs"), bd = $("body"), gfe = $("gf"), [, k, list] = TABS[tab];
  [...tb.children].forEach((b, i) => b.classList.toggle("on", i == tab));
  const on = tb.children[tab];
  tb.scrollTo({ left: on.offsetLeft - (tb.clientWidth - on.offsetWidth) / 2, behavior: "smooth" });
  bd.innerHTML = "";
  gfe.innerHTML = "";
  $("sc").scrollTop = 0;
  gfe.hidden = ["theme", "emo", "missions"].includes(k);

  GFL.forEach(([g, t]) => {
    const b = document.createElement("button");
    b.textContent = t;
    b.className = gf == g ? "on" : "";
    b.onclick = () => { store.gf = g; ui(); hap(); };
    gfe.appendChild(b);
  });

  if (k == "missions") {
    bd.className = "missions";
    bd.innerHTML = DUO_MISSIONS.map(m => `<div class="ms-card"><div><b>${m.title}</b><small>${m.desc}</small></div><span class="ms-xp">${m.xp}</span></div>`).join("") +
      `<button class="reset" id="unpairBtn">Putuskan Slot Ini (${fmtUsn(S.p2)})</button>`;
    $("unpairBtn").onclick = async () => {
      const target = S.p2;
      if (!target) return;
      if (confirm(`Putuskan koneksi Spark Buddies dengan ${fmtUsn(target)}?`)) {
        delete store.PET_STYLES[target];
        store.PAIRS = store.PAIRS.filter(x => normUsn(x.partnerUsername) !== target);
        store.ACTIVE_IDX = 0;
        await sendActionToServer({ type: "SPARK_UNPAIR", targetUsername: target });
        openHubScreen();
      }
    };
    return;
  }

  bd.className = "grid";
  const currentLv = lvl();
  list.filter(v => gf == "Semua" || ["theme", "emo"].includes(k) || v == "Polos" || v == "Normal" || gen(v) == gf).forEach(v => {
    const b = document.createElement("button");
    b.className = "it";
    b.dataset.v = v;
    if (!unl(v)) b.classList.add("lk");
    else if (!SEEN.has(v)) b.classList.add("nu");
    b.setAttribute("aria-label", DN[v] || v);
    b.innerHTML = (k == "theme"
      ? `<i class="dot" style="background:linear-gradient(${TH[v][0]},${TH[v][2]})"></i>`
      : `<svg class="pvw" viewBox="${VB[k]}">${getPreviewSVG(S, currentLv, k, v)}</svg>`
    ) + `<span>${DN[v] || v}</span>${unl(v) ? "" : `<small>${need(v)}</small>`}`;
    b.onclick = () => {
      if (!unl(v)) return lock(v, b);
      snapPush();
      k == "extra" ? tog(v) : S[k] = v;
      if (k == "emo") store.EB = null;
      draw();
      mark();
      scheduleStyleSync();
      hap();
      bumpPet();
    };
    bd.appendChild(b);
  });
  list.forEach(v => unl(v) && SEEN.add(v));
  save();
  tabsUpd();
  mark();
}

$("rnd").onclick = () => {
  const { S } = store;
  snapPush();
  const pk = a => a[Math.floor(Math.random() * a.length)];
  TABS.forEach(([, k, l]) => { if (l.length && k != "extra") S[k] = pk(l.filter(unl)); });
  S.extra = new Set();
  TABS[3][2].filter(unl).sort(() => Math.random() - .5).slice(0, 1 + Math.floor(Math.random() * 3)).forEach(tog);
  draw();
  ui();
  scheduleStyleSync();
  bumpPet();
};

addEventListener("pagehide", doSave);
document.addEventListener("visibilitychange", () => document.hidden && doSave());
document.querySelectorAll("[contenteditable]").forEach(el => {
  el.addEventListener("keydown", e => { if (e.key == "Enter") { e.preventDefault(); el.blur(); } });
  el.addEventListener("input", () => {
    if (el.textContent.length > 14) {
      el.textContent = el.textContent.slice(0, 14);
    }
    scheduleStyleSync();
  });
  el.addEventListener("blur", () => {
    const clean = String(el.textContent || "").replace(/[\r\n]+/g, " ").trim().slice(0, 14);
    el.textContent = clean || (store.S.p2 ? store.S.p2.toUpperCase().slice(0, 12) : "BARA");
    scheduleStyleSync();
  });
});

$("clearBtn").onclick = () => { $("card").classList.add("clear-mode"); hap(); };
$("exitClear").onclick = () => { $("card").classList.remove("clear-mode"); hap(); };

function lvCheck() {
  const l = lvl(), p = store.LL;
  store.LL = l;
  tabsUpd();
  if (p && l > p) {
    if (TABS[store.tab][1] != "missions") ui();
    levelUp(l, Object.keys(U).filter(k => U[k] > p && U[k] <= l).length);
  }
}

function levelUp(l, n) {
  const { S } = store;
  toast(`Naik ke Lv ${l}: ${LV[l - 1]}${n ? ` · ${n} item baru` : ""}`);
  burstSparks();
  setTimeout(burstSparks, 220);
  bumpPet(40, .8);
  if (S.emo != "Celebrating") {
    store.EB = S.emo;
    S.emo = "Celebrating";
    draw();
    setTimeout(() => {
      if (S.emo == "Celebrating" && store.EB) {
        S.emo = store.EB;
        store.EB = null;
        draw();
      }
    }, 2800);
  }
}

function ciUpd() {
  const b = $("ci");
  if (!b) return;
  if (store.SETOR_LOCK) {
    b.textContent = "Menyetor...";
    b.disabled = true;
    return;
  }
  const done = isMeQualified();
  b.disabled = false;
  if (store.S.caseCompleted) {
    b.textContent = "Kasus Selesai ✓";
    b.classList.add("done");
  } else if (done) {
    b.textContent = "Sudah Setor ✓";
    b.classList.add("done");
  } else {
    b.textContent = "Setor Aktivitas Gue";
    b.classList.remove("done");
  }
}

async function checkin() {
  if (store.SETOR_LOCK) return;
  if (isMeQualified()) {
    explainHourglassStatus(true);
    return;
  }

  const { S, MY_USN } = store;
  store.SETOR_LOCK = true;
  store.LOCAL_SETOR_DAY = day();
  S.last = day();
  S.hasSetorToday = true;
  S.g1 = { gap: Math.max(5, S.g1.gap), msg: Math.max(2, S.g1.msg) };

  store.PAIRS = store.PAIRS.map((p) => {
    if (normUsn(p.partnerUsername) === normUsn(S.p2)) {
      return Object.assign({}, p, {
        g1: { gap: Math.max(5, p.g1?.gap || 0), msg: Math.max(2, p.g1?.msg || 0) },
        hasSetorToday: true,
        litToday: true
      });
    }
    return p;
  });

  draw();
  bumpPet();
  hap();

  try {
    const res = await sendActionToServer({
      type: "SPARK_SETOR",
      fromUsername: normUsn(MY_USN),
      targetUsername: normUsn(S.p2)
    });
    if (res && res.message) {
      toast(res.message, 4200);
    } else if (isPartnerQualified()) {
      toast(`🔥 Api Spark menyala penuh bareng ${fmtUsn(S.p2)}!`, 3800);
    } else {
      toast(`✅ Setoran tercatat! Tunggu ${fmtUsn(S.p2)} setor/chat 5x di grup hari ini.`, 4500);
    }
  } finally {
    store.SETOR_LOCK = false;
    ciUpd();
  }
}

function seedSeen() {
  if (store.SEED) TABS.forEach(t => t[2].filter(unl).forEach(v => store.SEEN.add(v)));
}

function tabsUpd() {
  [...$("tabs").children].forEach((b, i) => b.classList.toggle("nw", TABS[i][2].some(v => unl(v) && !store.SEEN.has(v))));
}

const snap = () => JSON.stringify({
  a: ["theme", "outfit", "head", "face", "emo"].map(k => store.S[k]),
  x: [...store.S.extra]
});
function undoUpd() { $("undo").disabled = !store.HS.length; }
function snapPush() { store.HS.push(snap()); if (store.HS.length > 30) store.HS.shift(); undoUpd(); }
function undo() {
  const { S, HS } = store;
  const d = HS.pop();
  if (!d) return;
  const o = JSON.parse(d);
  ["theme", "outfit", "head", "face", "emo"].forEach((k, i) => S[k] = o.a[i]);
  S.extra = new Set(o.x);
  store.EB = null;
  draw();
  mark();
  scheduleStyleSync();
  undoUpd();
  hap();
  toast("Dibatalkan");
}

function applyServerPayload(u) {
  if (!u) return;
  const detUsn = normUsn(u.username || u.usn);
  if (detUsn) store.MY_USN = detUsn;
  if (typeof u.maxSlots === "number") {
    store.UNLOCKED_SLOTS = Math.max(FREE_SLOTS, Math.min(MAX_SLOTS, u.maxSlots));
  }
  const justSetoredToday = store.LOCAL_SETOR_DAY === day();

  if (Array.isArray(u.sparkBuddies)) {
    store.PAIRS = u.sparkBuddies.filter(x => x.status === "paired" && x.partnerUsername).map(x => {
      const partnerUsn = normUsn(x.partnerUsername);
      const serverG1 = x.g1 || { gap: 0, msg: 0 };
      const mergedG1 = justSetoredToday
        ? { gap: Math.max(5, serverG1.gap || 0), msg: Math.max(2, serverG1.msg || 0) }
        : serverG1;
      const doneMe = Boolean(x.hasSetorToday || x.litToday || justSetoredToday || (mergedG1.gap >= 5 && mergedG1.msg >= 2));
      const pStyle = x.petStyle && typeof x.petStyle === "object" ? x.petStyle : null;
      const pName = String(x.petName || (pStyle && pStyle.nm) || "").slice(0, 14);
      if (pStyle && Date.now() >= store.STYLE_SYNC_LOCK_UNTIL) {
        store.PET_STYLES[partnerUsn] = Object.assign({}, pStyle, pName ? { nm: pName } : {});
      }
      return {
        partnerUsername: partnerUsn,
        streak: Number(x.streak) || 0,
        xp: Number(x.xp) || 0,
        g1: mergedG1,
        g2: x.g2 || { gap: 0, msg: 0 },
        hasSetorToday: doneMe,
        litToday: doneMe,
        caseCompleted: Boolean(x.caseCompleted),
        petName: pName,
        petStyle: pStyle
      };
    });
    store.INCOMING = u.sparkBuddies.filter(x => x.status === "incoming" && x.fromUsername).map(x => ({ fromUsername: normUsn(x.fromUsername) }));
    store.OUTGOING = u.sparkBuddies.filter(x => x.status === "outgoing" && x.targetUsername).map(x => ({ targetUsername: normUsn(x.targetUsername) }));
  } else if ("sparkBuddy" in u) {
    const sb = u.sparkBuddy;
    if (!sb) { store.PAIRS = []; store.INCOMING = []; store.OUTGOING = []; }
    else {
      const pUsn = normUsn(sb.partnerUsername || sb.partnerName);
      if (sb.status === "paired" && pUsn) {
        const serverG1 = sb.g1 || { gap: 0, msg: 0 };
        const mergedG1 = justSetoredToday
          ? { gap: Math.max(5, serverG1.gap || 0), msg: Math.max(2, serverG1.msg || 0) }
          : serverG1;
        const doneMe = Boolean(sb.hasSetorToday || sb.litToday || justSetoredToday || (mergedG1.gap >= 5 && mergedG1.msg >= 2));
        const pStyle = sb.petStyle && typeof sb.petStyle === "object" ? sb.petStyle : null;
        const pName = String(sb.petName || (pStyle && pStyle.nm) || "").slice(0, 14);
        if (pStyle && Date.now() >= store.STYLE_SYNC_LOCK_UNTIL) {
          store.PET_STYLES[pUsn] = Object.assign({}, pStyle, pName ? { nm: pName } : {});
        }
        store.PAIRS = [{
          partnerUsername: pUsn,
          streak: Number(sb.streak) || 0,
          xp: Number(sb.xp) || 0,
          g1: mergedG1,
          g2: sb.g2 || { gap: 0, msg: 0 },
          hasSetorToday: doneMe,
          litToday: doneMe,
          caseCompleted: Boolean(sb.caseCompleted),
          petName: pName,
          petStyle: pStyle
        }];
        store.INCOMING = [];
        store.OUTGOING = [];
      } else if (sb.status === "incoming" && sb.fromUsername) {
        store.PAIRS = [];
        store.INCOMING = [{ fromUsername: normUsn(sb.fromUsername) }];
        store.OUTGOING = [];
      } else if (sb.status === "outgoing" && sb.targetUsername) {
        store.PAIRS = [];
        store.INCOMING = [];
        store.OUTGOING = [{ targetUsername: normUsn(sb.targetUsername) }];
      }
    }
  }
}

function syncUIState() {
  if (store.PAIRS.length === 0) store.VIEW_MODE = "hub";
  if (store.VIEW_MODE === "hub") {
    $("pairGate").hidden = false;
    renderHub({
      onOpenSlot: openStageForSlot,
      onSendAction: sendActionToServer,
      onSendInvite: sendInvite
    });
  } else {
    $("pairGate").hidden = true;
    loadActivePairIntoStage();
    draw();
    if (TABS[store.tab] && TABS[store.tab][1] !== "missions") {
      mark();
    }
  }
  save();
}

async function sendActionToServer(actionObj, silent = false) {
  const me = normUsn(store.MY_USN);
  const fullPayload = Object.assign({}, actionObj, { fromUsername: actionObj.fromUsername || me, byUsername: me });
  if (store.DIRECT_API) {
    try {
      const res = await fetch(store.DIRECT_API + "/api/spark/action", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "tma " + store.DIRECT_TMA },
        body: JSON.stringify(fullPayload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (!silent) toast("⚠️ Server Error (" + res.status + ")");
        return null;
      }
      if (!silent) {
        if (!data.ok && data.message) toast("⚠️ " + data.message);
        else if (data.ok && actionObj.type === "SPARK_INVITE_SEND") toast("✅ Ajakan terkirim ke @" + normUsn(actionObj.targetUsername) + "!");
        else if (data.ok && actionObj.type === "SPARK_UNLOCK_SLOT") toast(data.message || "🔓 Slot Spark baru terbuka!");
      }
      if (data && ("sparkBuddies" in data || "sparkBuddy" in data || "maxSlots" in data)) {
        applyServerPayload(data);
        if (!silent) syncUIState();
      }
      window.parent && window.parent.postMessage(Object.assign({}, fullPayload, { _directHandled: true }), "*");
      return data;
    } catch (err) {
      if (!silent) toast("⚠️ Gagal konek server");
      return null;
    }
  } else {
    window.parent && window.parent.postMessage(fullPayload, "*");
    return null;
  }
}

async function pollServerStatusDirect() {
  if (store.SETOR_LOCK) return;
  const me = normUsn(store.MY_USN);
  if (!store.DIRECT_API || !me) return;
  try {
    const res = await fetch(store.DIRECT_API + "/api/spark/status?username=" + encodeURIComponent(me) + "&_t=" + Date.now(), {
      headers: { "Authorization": "tma " + store.DIRECT_TMA }
    });
    if (!res.ok) return;
    const data = await res.json();
    if (store.SETOR_LOCK) return;
    if (data && typeof data === "object" && ("sparkBuddies" in data || "sparkBuddy" in data || "maxSlots" in data)) {
      applyServerPayload(data);
      syncUIState();
    }
  } catch (_) {}
}

async function sendInvite(rawUsn) {
  const usn = normUsn(rawUsn);
  if (!usn || usn.length < 3) return toast("Masukkan @username valid!");
  if (!/^[a-z0-9_]{3,32}$/.test(usn)) return toast("Format @username hanya huruf, angka, atau _");
  if (store.MY_USN && usn === normUsn(store.MY_USN)) return toast("Nggak bisa konek sama diri sendiri!");
  if (store.PAIRS.length + store.OUTGOING.length >= store.UNLOCKED_SLOTS) {
    return toast(`Maksimal ${store.UNLOCKED_SLOTS} partner saat ini! Buka slot VIP dulu.`);
  }
  if (store.PAIRS.some(p => normUsn(p.partnerUsername) === usn)) return toast(`Sudah terhubung dengan @${usn}!`);
  if (store.OUTGOING.some(o => normUsn(o.targetUsername) === usn)) return toast(`Ajakan ke @${usn} sudah dikirim!`);

  store.OUTGOING.push({ targetUsername: usn });
  $("partnerInput").value = "";
  renderHub({
    onOpenSlot: openStageForSlot,
    onSendAction: sendActionToServer,
    onSendInvite: sendInvite
  });
  save();
  await sendActionToServer({ type: "SPARK_INVITE_SEND", fromUsername: normUsn(store.MY_USN), targetUsername: usn });
}

$("partnerConnectBtn").onclick = () => sendInvite($("partnerInput").value);
$("partnerInput").addEventListener("keydown", e => { if (e.key === "Enter") sendInvite($("partnerInput").value); });
$("ci").onclick = checkin;
$("undo").onclick = undo;

/* BOOT SEQUENCE */
load();
autoDetectIdentity();

seedSeen();
tabsInit();
initInteractions(toast);
store.VIEW_MODE = "hub";
syncUIState();
ui();
startAnimationLoop(() => ({ viewMode: store.VIEW_MODE, emo: store.S.emo }));

requestAnimationFrame(() => {
  setTimeout(() => {
    const bl = $("bootLoader");
    if (bl) { bl.classList.add("hide"); setTimeout(() => bl.remove(), 250); }
  }, 150);
});

let syncDone = false;
window.addEventListener("message", ev => {
  if (!ev.data || ev.data.type !== "PUNK_SYNC") return;
  syncDone = true;
  if (ev.data.apiBase) store.DIRECT_API = String(ev.data.apiBase).replace(/\/+$/, "");
  if (ev.data.initData) store.DIRECT_TMA = String(ev.data.initData);
  if (ev.data.user && !store.SETOR_LOCK) applyServerPayload(ev.data.user);
  if (Array.isArray(ev.data.members)) store.WARGA_MEMBERS = ev.data.members;
  if (!store.SETOR_LOCK) syncUIState();
});

pollServerStatusDirect();
setInterval(pollServerStatusDirect, 3500);
let syncTries = 0;
const syncTimer = setInterval(() => {
  if (syncDone || syncTries >= 10) { clearInterval(syncTimer); return; }
  syncTries++;
  window.parent && window.parent.postMessage({ type: "SPARK_REQUEST_SYNC" }, "*");
}, 600);
window.parent && window.parent.postMessage({ type: "SPARK_REQUEST_SYNC" }, "*");
