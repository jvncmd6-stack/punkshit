import {
  MAX_SLOTS, TH, gen, TABS, DUO_MISSIONS, LV, XP, RN, DN,
  GFL, U, UD, NECK, E
} from "./config.js";
import { renderPetSVG, getPreviewSVG, VB } from "./avatar.js";
import {
  bindPetDOM, applyPetFrame, bumpPet, burstSparks,
  startAnimationLoop, initInteractions
} from "./animation.js";

const $ = id => document.getElementById(id);
const hap = () => { try { navigator.vibrate && navigator.vibrate(6); } catch (_) {} };
const normUsn = raw => String(raw || "").trim().replace(/^@+/, "").replace(/\s+/g, "").toLowerCase();
const fmtUsn = u => u ? "@" + normUsn(u) : "";

let DIRECT_API = "", DIRECT_TMA = "";

function autoDetectIdentity() {
  let detectedUsn = "", detectedMembers = [];
  try {
    const qp = new URLSearchParams(location.search);
    if (qp.get("usn")) detectedUsn = normUsn(qp.get("usn"));
    if (qp.get("api")) DIRECT_API = String(qp.get("api")).replace(/\/+$/, "");
    if (qp.get("tma")) DIRECT_TMA = String(qp.get("tma"));
    if (qp.get("members")) {
      const m = JSON.parse(qp.get("members"));
      if (Array.isArray(m)) detectedMembers = m;
    }
  } catch (_) {}
  try {
    const tgSelf = window.Telegram?.WebApp, tgParent = window.parent?.Telegram?.WebApp;
    const u = tgSelf?.initDataUnsafe?.user || tgParent?.initDataUnsafe?.user;
    if (u && u.username) detectedUsn = normUsn(u.username);
    if (!DIRECT_TMA) DIRECT_TMA = tgSelf?.initData || tgParent?.initData || "";
  } catch (_) {}
  try {
    const p = window.parent;
    if (p && p !== window) {
      if (!DIRECT_API && p.PUNK_CONFIG?.API_URL) DIRECT_API = String(p.PUNK_CONFIG.API_URL).replace(/\/+$/, "");
      const pu = p.PunkCore?.S?.user || p.STATE?.user || p.PUNK?.user || p.CURRENT_USER;
      if (pu && (pu.username || pu.usn)) detectedUsn = normUsn(pu.username || pu.usn);
      const pm = p.PunkCore?.S?.members || p.STATE?.members || p.STATE?.warga || p.WARGA || p.PUNK?.members;
      if (Array.isArray(pm) && pm.length) detectedMembers = pm;
    }
  } catch (_) {}
  try {
    if (!DIRECT_API) {
      const lsApi = localStorage.getItem("psk_api_url");
      if (lsApi) DIRECT_API = String(lsApi).replace(/\/+$/, "");
    }
  } catch (_) {}
  return { usn: detectedUsn, members: detectedMembers };
}

let MY_USN = "", PAIRS = [], INCOMING = [], OUTGOING = [], ACTIVE_IDX = 0, PET_STYLES = {}, VIEW_MODE = "hub";
let S = {
  p1: "", p2: "", g1: { gap: 0, msg: 0 }, g2: { gap: 0, msg: 0 },
  theme: "Api", outfit: "Jaket Punk", head: "Beanie", face: "Normal",
  extra: new Set(["Peniti"]), bolts: 1, emo: "Happy", xp: 0, days: 0, last: ""
};
let tab = 0, gf = "Semua", LL = 0, EB = null;
let SEEN = new Set(), SEED = 1, WARGA_MEMBERS = [];
const HS = [];

const lvl = () => XP.filter(x => S.xp >= x).length;
const unl = v => lvl() >= (U[v] || 1) && S.days >= (UD[v] || 0);
const need = v => [(U[v] || 1) > 1 ? "Lv " + U[v] : "", UD[v] ? UD[v] + " hari" : ""].filter(Boolean).join(" & ");

let tt;
function toast(m) {
  const e = $("toast");
  e.textContent = m;
  e.classList.add("on");
  clearTimeout(tt);
  tt = setTimeout(() => e.classList.remove("on"), 2500);
}

function draw() {
  const lv = lvl();
  const { html, st } = renderPetSVG(S, lv);
  $("svg").innerHTML = html;
  bindPetDOM();
  applyPetFrame();
  hud(lv, st);
  lvCheck();
  save();
}

function saveCurrentPetStyle() {
  const key = normUsn(S.p2);
  if (!key) return;
  PET_STYLES[key] = {
    nm: $("nm").textContent,
    theme: S.theme,
    outfit: S.outfit,
    head: S.head,
    face: S.face,
    extra: [...S.extra],
    emo: EB || S.emo
  };
}

function loadActivePairIntoStage() {
  if (ACTIVE_IDX >= PAIRS.length) ACTIVE_IDX = Math.max(0, PAIRS.length - 1);
  const p = PAIRS[ACTIVE_IDX];
  S.p1 = MY_USN;
  if (!p) {
    S.p2 = ""; S.days = 0; S.xp = 0; S.g1 = { gap: 0, msg: 0 }; S.g2 = { gap: 0, msg: 0 };
    return;
  }
  S.p2 = normUsn(p.partnerUsername);
  S.days = Number(p.streak) || 0;
  S.xp = Number(p.xp) || 0;
  S.g1 = p.g1 || { gap: 0, msg: 0 };
  S.g2 = p.g2 || { gap: 0, msg: 0 };
  $("stageTitle").textContent = "@" + S.p2;
  $("stageSub").textContent = `Slot ${ACTIVE_IDX + 1}/${MAX_SLOTS} • One Group`;

  const st = PET_STYLES[S.p2];
  if (st) {
    if (st.nm) $("nm").textContent = String(st.nm).slice(0, 14);
    if (TH[st.theme]) S.theme = st.theme;
    if (st.outfit) S.outfit = st.outfit;
    if (st.head) S.head = st.head;
    if (st.face) S.face = st.face;
    if (Array.isArray(st.extra)) S.extra = new Set(st.extra);
    if (E[st.emo]) S.emo = st.emo;
  } else {
    $("nm").textContent = S.p2.toUpperCase().slice(0, 12);
  }
}

function openStageForSlot(idx) {
  saveCurrentPetStyle();
  ACTIVE_IDX = idx;
  VIEW_MODE = "stage";
  loadActivePairIntoStage();
  $("pairGate").hidden = true;
  draw();
  ui();
  hap();
}

function openHubScreen() {
  saveCurrentPetStyle();
  VIEW_MODE = "hub";
  $("pairGate").hidden = false;
  renderHub();
  hap();
}

$("hubBackBtn").onclick = openHubScreen;

function hud(lv, st) {
  const [, M, , bo] = TH[S.theme] || TH.Api, a = XP[lv - 1], b = XP[lv], mx = lv >= 10;
  document.documentElement.style.setProperty("--ac", M);
  document.documentElement.style.setProperty("--gl", bo);
  $("num").textContent = S.days;
  const q1 = S.g1.gap >= 5 && S.g1.msg >= 2, q2 = S.g2.gap >= 5 && S.g2.msg >= 2;
  let stLabel = "🔒 Belum Nyala";
  if (q1 && q2) stLabel = S.days >= 3 ? "🔥 Api Aman" : "🔥 Qualified Hari Ini";
  else if (q1 || q2) stLabel = "⏳ Nunggu Partner";
  else if (S.days >= 3) stLabel = "🚨 Critical Spark";
  $("sb").textContent = stLabel;
  const u1 = fmtUsn(S.p1 || MY_USN) || "@gue", u2 = fmtUsn(S.p2) || "@partner";
  $("p1Name").textContent = u1;
  $("p2Name").textContent = u2;
  $("g1Lbl").textContent = u1.slice(0, 12);
  $("g2Lbl").textContent = u2.slice(0, 12);
  $("g1Val").textContent = `${S.g1.gap}/5 GAP · ${S.g1.msg}/2 ${q1 ? "✅" : "⏳"}`;
  $("g2Val").textContent = `${S.g2.gap}/5 GAP · ${S.g2.msg}/2 ${q2 ? "✅" : "⏳"}`;
  $("rare").textContent = RN[st];
  $("lvc").textContent = "Lv " + lv + " · " + LV[lv - 1];
  $("fill").style.width = (mx ? 100 : (S.xp - a) / (b - a) * 100) + "%";
  $("bt").textContent = mx ? "MAX" : `${S.xp - a} / ${b - a} XP`;
  $("bh").textContent = mx ? "Level tertinggi" : `${b - S.xp} XP lagi naik level`;
  ciUpd();
}

function tog(v) {
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
    b.onclick = () => { if (tab != i) { tab = i; ui(); hap(); } };
    $("tabs").appendChild(b);
  });
}

function mark() {
  const k = TABS[tab][1];
  $("body").querySelectorAll(".it").forEach(b => {
    const on = k == "extra" ? S.extra.has(b.dataset.v) : S[k] == b.dataset.v;
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", on);
  });
}

function ui() {
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
    b.onclick = () => { gf = g; ui(); hap(); };
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
        delete PET_STYLES[target];
        PAIRS = PAIRS.filter(x => normUsn(x.partnerUsername) !== target);
        ACTIVE_IDX = 0;
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
      if (k == "emo") EB = null;
      draw();
      mark();
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
  snapPush();
  const pk = a => a[Math.floor(Math.random() * a.length)];
  TABS.forEach(([, k, l]) => { if (l.length && k != "extra") S[k] = pk(l.filter(unl)); });
  S.extra = new Set();
  TABS[3][2].filter(unl).sort(() => Math.random() - .5).slice(0, 1 + Math.floor(Math.random() * 3)).forEach(tog);
  draw();
  ui();
  bumpPet();
};

const K = "punkshit.spark.v4";
let svT;
function doSave() {
  saveCurrentPetStyle();
  try {
    localStorage.setItem(K, JSON.stringify({ PAIRS, INCOMING, OUTGOING, ACTIVE_IDX, PET_STYLES, seen: [...SEEN], tab, gf }));
  } catch (_) {}
}
function save() { clearTimeout(svT); svT = setTimeout(doSave, 250); }
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(K));
    if (!d) return;
    if (Array.isArray(d.PAIRS)) PAIRS = d.PAIRS;
    if (Array.isArray(d.INCOMING)) INCOMING = d.INCOMING;
    if (Array.isArray(d.OUTGOING)) OUTGOING = d.OUTGOING;
    if (typeof d.ACTIVE_IDX === "number") ACTIVE_IDX = d.ACTIVE_IDX;
    if (d.PET_STYLES && typeof d.PET_STYLES === "object") PET_STYLES = d.PET_STYLES;
    tab = Math.min(TABS.length - 1, +d.tab || 0);
    gf = d.gf || "Semua";
    if (d.seen) { SEEN = new Set(d.seen); SEED = 0; }
  } catch (_) {}
}

addEventListener("pagehide", doSave);
document.addEventListener("visibilitychange", () => document.hidden && doSave());
document.querySelectorAll("[contenteditable]").forEach(el => {
  el.addEventListener("keydown", e => { if (e.key == "Enter") { e.preventDefault(); el.blur(); } });
  el.addEventListener("input", save);
});

$("clearBtn").onclick = () => { $("card").classList.add("clear-mode"); hap(); };
$("exitClear").onclick = () => { $("card").classList.remove("clear-mode"); hap(); };

function lvCheck() {
  const l = lvl(), p = LL;
  LL = l;
  tabsUpd();
  if (p && l > p) {
    if (TABS[tab][1] != "missions") ui();
    levelUp(l, Object.keys(U).filter(k => U[k] > p && U[k] <= l).length);
  }
}

function levelUp(l, n) {
  toast(`Naik ke Lv ${l}: ${LV[l - 1]}${n ? ` · ${n} item baru` : ""}`);
  burstSparks();
  setTimeout(burstSparks, 220);
  bumpPet(40, .8);
  if (S.emo != "Celebrating") {
    EB = S.emo;
    S.emo = "Celebrating";
    draw();
    setTimeout(() => { if (S.emo == "Celebrating" && EB) { S.emo = EB; EB = null; draw(); } }, 2800);
  }
}

const dk = d => d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
const day = () => dk(new Date());

function ciUpd() {
  const b = $("ci");
  if (!b) return;
  const done = S.last == day() && S.g1.gap >= 5 && S.g1.msg >= 2;
  b.textContent = done ? "Target Gue Aman ✓" : "Setor Aktivitas Gue";
  b.classList.toggle("done", done);
}

function checkin() {
  const t = day();
  if (S.last !== t) { S.g1 = { gap: 0, msg: 0 }; S.g2 = { gap: 0, msg: 0 }; S.last = t; }
  S.g1.gap += 5;
  S.g1.msg += 2;
  if ((S.g1.gap >= 5 && S.g1.msg >= 2) && (S.g2.gap >= 5 && S.g2.msg >= 2)) {
    S.days += 1;
    S.xp = Math.min(5500, S.xp + 10);
    S.emo = "Happy";
    toast(`🔥 SPARK SECURED! Day ${S.days} · +10 XP`);
  } else {
    S.emo = "Waiting";
    toast(`✅ Aktivitasmu tercatat! Nunggu ${fmtUsn(S.p2)}`);
  }
  draw();
  bumpPet();
}

function seedSeen() { if (SEED) TABS.forEach(t => t[2].filter(unl).forEach(v => SEEN.add(v))); }
function tabsUpd() { [...$("tabs").children].forEach((b, i) => b.classList.toggle("nw", TABS[i][2].some(v => unl(v) && !SEEN.has(v)))); }

const snap = () => JSON.stringify({ a: ["theme", "outfit", "head", "face", "emo"].map(k => S[k]), x: [...S.extra] });
function undoUpd() { $("undo").disabled = !HS.length; }
function snapPush() { HS.push(snap()); if (HS.length > 30) HS.shift(); undoUpd(); }
function undo() {
  const d = HS.pop();
  if (!d) return;
  const o = JSON.parse(d);
  ["theme", "outfit", "head", "face", "emo"].forEach((k, i) => S[k] = o.a[i]);
  S.extra = new Set(o.x);
  EB = null;
  draw();
  mark();
  undoUpd();
  hap();
  toast("Dibatalkan");
}

function renderHub() {
  const badge = $("myUsnBadge");
  if (badge) badge.textContent = MY_USN ? `🆔 @${MY_USN} • ${PAIRS.length}/${MAX_SLOTS} Slot Terisi` : `⚠️ @username belum terdeteksi`;

  const grid = $("slotsGrid");
  let cardsHtml = "";
  for (let i = 0; i < MAX_SLOTS; i++) {
    if (i < PAIRS.length) {
      const p = PAIRS[i];
      const q1 = (p.g1?.gap || 0) >= 5 && (p.g1?.msg || 0) >= 2, q2 = (p.g2?.gap || 0) >= 5 && (p.g2?.msg || 0) >= 2;
      const stTxt = (q1 && q2) ? "🔥 Nyala Hari Ini" : (q1 || q2 ? "⏳ Nunggu Partner" : "💤 Belum Setor");
      cardsHtml += `<div class="slot-card active" data-open-slot="${i}">
        <div class="sc-left">
          <div class="sc-ico">🔥</div>
          <div class="sc-info">
            <b>Slot ${i + 1}: @${p.partnerUsername}</b>
            <small>${p.streak || 0} Hari Nyala • ${stTxt}</small>
          </div>
        </div>
        <span class="sc-act">Lihat Api ›</span>
      </div>`;
    } else if (i < PAIRS.length + OUTGOING.length) {
      const out = OUTGOING[i - PAIRS.length];
      cardsHtml += `<div class="slot-card pending">
        <div class="sc-left">
          <div class="sc-ico">⏳</div>
          <div class="sc-info">
            <b>Slot ${i + 1}: @${out.targetUsername}</b>
            <small>Menunggu dia klik Terima / ACC</small>
          </div>
        </div>
        <button class="sc-act danger" data-cancel-to="${out.targetUsername}">Batal</button>
      </div>`;
    } else {
      cardsHtml += `<div class="slot-card empty" data-focus-input="1">
        <div class="sc-left">
          <div class="sc-ico">+</div>
          <div class="sc-info">
            <b>Slot ${i + 1}: Kosong</b>
            <small>Tap untuk ajak teman di bawah</small>
          </div>
        </div>
        <span class="sc-act sec">Ajak</span>
      </div>`;
    }
  }
  grid.innerHTML = cardsHtml;

  grid.querySelectorAll("[data-open-slot]").forEach(el => {
    el.onclick = () => openStageForSlot(Number(el.dataset.openSlot));
  });
  grid.querySelectorAll("[data-cancel-to]").forEach(btn => {
    btn.onclick = async e => {
      e.stopPropagation();
      const target = btn.dataset.cancelTo;
      OUTGOING = OUTGOING.filter(x => normUsn(x.targetUsername) !== target);
      renderHub();
      await sendActionToServer({ type: "SPARK_INVITE_CANCEL", targetUsername: target });
      toast("Ajakan dibatalkan");
    };
  });
  grid.querySelectorAll("[data-focus-input]").forEach(el => {
    el.onclick = () => { $("partnerInput").focus(); hap(); };
  });

  const incWrap = $("incomingListWrap");
  incWrap.innerHTML = INCOMING.map(inv => {
    const u = normUsn(inv.fromUsername);
    return `<div class="pg-box">
      <h3>📩 Ajakan Spark dari @${u}</h3>
      <p>Terima ajakan untuk menyalakan api bersama di slot kosongmu.</p>
      <div class="pg-box-act">
        <button class="pg-btn" data-acc-from="${u}">Terima & Nyalakan 🔥</button>
        <button class="pg-btn danger" data-dec-from="${u}">Tolak</button>
      </div>
    </div>`;
  }).join("");

  incWrap.querySelectorAll("[data-acc-from]").forEach(btn => {
    btn.onclick = async () => {
      const from = btn.dataset.accFrom;
      if (PAIRS.length >= MAX_SLOTS) return toast("Slot penuh! Maksimal 3 partner.");
      INCOMING = INCOMING.filter(x => normUsn(x.fromUsername) !== from);
      if (!PAIRS.some(x => normUsn(x.partnerUsername) === from)) {
        PAIRS.push({ partnerUsername: from, streak: 0, xp: 0, g1: { gap: 0, msg: 0 }, g2: { gap: 0, msg: 0 } });
      }
      await sendActionToServer({ type: "SPARK_INVITE_ACCEPT", fromUsername: from, byUsername: MY_USN });
      renderHub();
      toast(`🔥 Sah! Terhubung dengan @${from}!`);
    };
  });
  incWrap.querySelectorAll("[data-dec-from]").forEach(btn => {
    btn.onclick = async () => {
      const from = btn.dataset.decFrom;
      INCOMING = INCOMING.filter(x => normUsn(x.fromUsername) !== from);
      renderHub();
      await sendActionToServer({ type: "SPARK_INVITE_DECLINE", fromUsername: from, byUsername: MY_USN });
      toast(`Ajakan dari @${from} ditolak`);
    };
  });

  const totalUsed = PAIRS.length + OUTGOING.length;
  $("inviteFormWrap").hidden = totalUsed >= MAX_SLOTS;

  const wrap = $("wargaList"), lbl = $("wargaListLabel");
  const existingSet = new Set([normUsn(MY_USN), ...PAIRS.map(p => normUsn(p.partnerUsername)), ...OUTGOING.map(o => normUsn(o.targetUsername))]);
  const others = WARGA_MEMBERS.filter(m => { const usn = normUsn(m.username || m.usn); return usn && !existingSet.has(usn); });
  if (!others.length) {
    lbl.textContent = "Cara Ajak Teman";
    wrap.innerHTML = `<div class="pg-rules">Ketik <b>@username</b> temanmu di kolom atas (contoh: <b>@kenknow</b>) lalu klik <b>Kirim Ajakan</b>.</div>`;
    return;
  }
  lbl.textContent = `Pilih @Username Warga Markas (${others.length})`;
  wrap.innerHTML = others.slice(0, 25).map(m => {
    const usn = normUsn(m.username || m.usn), dispName = m.name ? ` (${m.name})` : "", rank = m.rank || m.title || "Warga Punk";
    return `<div class="pg-user"><div class="pg-user-info"><b>@${usn}${dispName}</b><small>${rank}</small></div><button class="pg-invite" data-usn="${usn}">Ajak @${usn}</button></div>`;
  }).join("");
  wrap.querySelectorAll("[data-usn]").forEach(btn => { btn.onclick = () => sendInvite(btn.dataset.usn); });
}

function applyServerPayload(u) {
  if (!u) return;
  const detUsn = normUsn(u.username || u.usn);
  if (detUsn) MY_USN = detUsn;
  if (Array.isArray(u.sparkBuddies)) {
    PAIRS = u.sparkBuddies.filter(x => x.status === "paired" && x.partnerUsername).map(x => ({
      partnerUsername: normUsn(x.partnerUsername), streak: Number(x.streak) || 0, xp: Number(x.xp) || 0, g1: x.g1 || { gap: 0, msg: 0 }, g2: x.g2 || { gap: 0, msg: 0 }
    }));
    INCOMING = u.sparkBuddies.filter(x => x.status === "incoming" && x.fromUsername).map(x => ({ fromUsername: normUsn(x.fromUsername) }));
    OUTGOING = u.sparkBuddies.filter(x => x.status === "outgoing" && x.targetUsername).map(x => ({ targetUsername: normUsn(x.targetUsername) }));
  } else if ("sparkBuddy" in u) {
    const sb = u.sparkBuddy;
    if (!sb) { PAIRS = []; INCOMING = []; OUTGOING = []; }
    else {
      const pUsn = normUsn(sb.partnerUsername || sb.partnerName);
      if (sb.status === "paired" && pUsn) { PAIRS = [{ partnerUsername: pUsn, streak: Number(sb.streak) || 0, xp: Number(sb.xp) || 0, g1: sb.g1 || { gap: 0, msg: 0 }, g2: sb.g2 || { gap: 0, msg: 0 } }]; INCOMING = []; OUTGOING = []; }
      else if (sb.status === "incoming" && sb.fromUsername) { PAIRS = []; INCOMING = [{ fromUsername: normUsn(sb.fromUsername) }]; OUTGOING = []; }
      else if (sb.status === "outgoing" && sb.targetUsername) { PAIRS = []; INCOMING = []; OUTGOING = [{ targetUsername: normUsn(sb.targetUsername) }]; }
    }
  }
}

function syncUIState() {
  if (PAIRS.length === 0) VIEW_MODE = "hub";
  if (VIEW_MODE === "hub") {
    $("pairGate").hidden = false;
    renderHub();
  } else {
    $("pairGate").hidden = true;
    loadActivePairIntoStage();
    draw();
  }
  save();
}

async function sendActionToServer(actionObj) {
  const me = normUsn(MY_USN);
  const fullPayload = Object.assign({}, actionObj, { fromUsername: actionObj.fromUsername || me, byUsername: me });
  if (DIRECT_API) {
    try {
      const res = await fetch(DIRECT_API + "/api/spark/action", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "tma " + DIRECT_TMA },
        body: JSON.stringify(fullPayload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast("⚠️ Server Error (" + res.status + ")"); return null; }
      if (!data.ok && data.message) toast("⚠️ " + data.message);
      else if (data.ok && actionObj.type === "SPARK_INVITE_SEND") toast("✅ Ajakan terkirim ke @" + normUsn(actionObj.targetUsername) + "!");
      if (data && ("sparkBuddies" in data || "sparkBuddy" in data)) { applyServerPayload(data); syncUIState(); }
      window.parent && window.parent.postMessage(Object.assign({}, fullPayload, { _directHandled: true }), "*");
      return data;
    } catch (err) { toast("⚠️ Gagal konek server"); return null; }
  } else {
    window.parent && window.parent.postMessage(fullPayload, "*");
    return null;
  }
}

async function pollServerStatusDirect() {
  const me = normUsn(MY_USN);
  if (!DIRECT_API || !me) return;
  try {
    const res = await fetch(DIRECT_API + "/api/spark/status?username=" + encodeURIComponent(me) + "&_t=" + Date.now(), {
      headers: { "Authorization": "tma " + DIRECT_TMA }
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data && typeof data === "object" && ("sparkBuddies" in data || "sparkBuddy" in data)) {
      applyServerPayload(data);
      syncUIState();
    }
  } catch (_) {}
}

async function sendInvite(rawUsn) {
  const usn = normUsn(rawUsn);
  if (!usn || usn.length < 3) return toast("Masukkan @username valid!");
  if (!/^[a-z0-9_]{3,32}$/.test(usn)) return toast("Format @username hanya huruf, angka, atau _");
  if (MY_USN && usn === normUsn(MY_USN)) return toast("Nggak bisa konek sama diri sendiri!");
  if (PAIRS.length + OUTGOING.length >= MAX_SLOTS) return toast("Maksimal 3 partner sekaligus!");
  if (PAIRS.some(p => normUsn(p.partnerUsername) === usn)) return toast(`Sudah terhubung dengan @${usn}!`);
  if (OUTGOING.some(o => normUsn(o.targetUsername) === usn)) return toast(`Ajakan ke @${usn} sudah dikirim!`);

  OUTGOING.push({ targetUsername: usn });
  $("partnerInput").value = "";
  renderHub();
  save();
  await sendActionToServer({ type: "SPARK_INVITE_SEND", fromUsername: normUsn(MY_USN), targetUsername: usn });
}

$("partnerConnectBtn").onclick = () => sendInvite($("partnerInput").value);
$("partnerInput").addEventListener("keydown", e => { if (e.key === "Enter") sendInvite($("partnerInput").value); });
$("ci").onclick = checkin;
$("undo").onclick = undo;

/* BOOT SEQUENCE */
load();
const auto = autoDetectIdentity();
if (auto.usn) MY_USN = auto.usn;
if (auto.members.length) WARGA_MEMBERS = auto.members;

seedSeen();
tabsInit();
initInteractions(toast);
VIEW_MODE = "hub";
syncUIState();
ui();
startAnimationLoop(() => ({ viewMode: VIEW_MODE, emo: S.emo }));

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
  if (ev.data.apiBase) DIRECT_API = String(ev.data.apiBase).replace(/\/+$/, "");
  if (ev.data.initData) DIRECT_TMA = String(ev.data.initData);
  if (ev.data.user) applyServerPayload(ev.data.user);
  if (Array.isArray(ev.data.members)) WARGA_MEMBERS = ev.data.members;
  syncUIState();
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
