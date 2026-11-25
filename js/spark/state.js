import { FREE_SLOTS, MAX_SLOTS, TH, TABS, XP, U, UD } from "./config.js";

export const $ = id => document.getElementById(id);
export const hap = () => { try { navigator.vibrate && navigator.vibrate(6); } catch (_) {} };
export const normUsn = raw => String(raw || "").trim().replace(/^@+/, "").replace(/\s+/g, "").toLowerCase();
export const fmtUsn = u => (u ? "@" + normUsn(u) : "");

export const dk = d => d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
export const day = () => dk(new Date());

export const store = {
  DIRECT_API: "",
  DIRECT_TMA: "",
  MY_USN: "",
  PAIRS: [],
  INCOMING: [],
  OUTGOING: [],
  ACTIVE_IDX: 0,
  PET_STYLES: {},
  VIEW_MODE: "hub",
  UNLOCKED_SLOTS: FREE_SLOTS,
  SETOR_LOCK: false,
  LOCAL_SETOR_DAY: "",
  LAST_SAND_HINT_KEY: "",
  tab: 0,
  gf: "Semua",
  LL: 0,
  EB: null,
  SEEN: new Set(),
  SEED: 1,
  WARGA_MEMBERS: [],
  HS: [],
  S: {
    p1: "", p2: "", g1: { gap: 0, msg: 0 }, g2: { gap: 0, msg: 0 },
    theme: "Api", outfit: "Jaket Punk", head: "Beanie", face: "Normal",
    extra: new Set(["Peniti"]), bolts: 1, emo: "Happy", xp: 0, days: 0, last: "",
    hasSetorToday: false, caseCompleted: false
  }
};

export const lvl = () => XP.filter(x => store.S.xp >= x).length;
export const unl = v => lvl() >= (U[v] || 1) && store.S.days >= (UD[v] || 0);
export const need = v => [(U[v] || 1) > 1 ? "Lv " + U[v] : "", UD[v] ? UD[v] + " hari" : ""].filter(Boolean).join(" & ");

let tt;
export function toast(m, dur = 3200) {
  const e = $("toast");
  if (!e) return;
  e.textContent = m;
  e.classList.add("on");
  clearTimeout(tt);
  tt = setTimeout(() => e.classList.remove("on"), dur);
}

export function isMeQualified() {
  const { S, LOCAL_SETOR_DAY } = store;
  return (S.g1.gap >= 5 && S.g1.msg >= 2) || Boolean(S.hasSetorToday) || LOCAL_SETOR_DAY === day();
}

export function isPartnerQualified() {
  const { S } = store;
  return (S.g2.gap >= 5 && S.g2.msg >= 2);
}

export function explainHourglassStatus(forceShow = false) {
  const { S } = store;
  if (!S.p2) return;
  const q1 = isMeQualified();
  const q2 = isPartnerQualified();
  if (q1 && q2) {
    if (forceShow) toast(`🔥 Target berdua hari ini sudah penuh! Api aman (${S.days} hari).`, 3400);
    return;
  }

  let hint = "";
  if (!q1 && !q2) {
    hint = `⏳ Tanda pasir: Kalian berdua belum setor! Klik "Setor Aktivitas Gue" di bawah atau chat min. 5x (jeda) di grup & ajak ${fmtUsn(S.p2)}.`;
  } else if (!q1 && q2) {
    hint = `⏳ Tanda pasir: ${fmtUsn(S.p2)} sudah setor! Sekarang giliranmu klik "Setor Aktivitas Gue" atau chat 5x di grup biar api nyala.`;
  } else if (q1 && !q2) {
    hint = `⏳ Tanda pasir: Targetmu sudah aman! Tinggal tunggu ${fmtUsn(S.p2)} klik "Setor Aktivitas" atau chat 5x di grup hari ini.`;
  }

  const key = `${day()}:${S.p2}:${q1 ? 1 : 0}:${q2 ? 1 : 0}`;
  if (forceShow || store.LAST_SAND_HINT_KEY !== key) {
    store.LAST_SAND_HINT_KEY = key;
    toast(hint, 4800);
  }
}

export function saveCurrentPetStyle() {
  const { S, PET_STYLES, EB } = store;
  const key = normUsn(S.p2);
  if (!key) return;
  const nmEl = $("nm");
  PET_STYLES[key] = {
    nm: nmEl ? nmEl.textContent : S.p2.toUpperCase().slice(0, 12),
    theme: S.theme,
    outfit: S.outfit,
    head: S.head,
    face: S.face,
    extra: [...S.extra],
    emo: EB || S.emo
  };
}

const STORAGE_KEY = "punkshit.spark.v5";
let svT;

export function doSave() {
  saveCurrentPetStyle();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      PAIRS: store.PAIRS,
      INCOMING: store.INCOMING,
      OUTGOING: store.OUTGOING,
      UNLOCKED_SLOTS: store.UNLOCKED_SLOTS,
      ACTIVE_IDX: store.ACTIVE_IDX,
      PET_STYLES: store.PET_STYLES,
      seen: [...store.SEEN],
      tab: store.tab,
      gf: store.gf
    }));
  } catch (_) {}
}

export function save() {
  clearTimeout(svT);
  svT = setTimeout(doSave, 250);
}

export function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!d) return;
    if (Array.isArray(d.PAIRS)) store.PAIRS = d.PAIRS;
    if (Array.isArray(d.INCOMING)) store.INCOMING = d.INCOMING;
    if (Array.isArray(d.OUTGOING)) store.OUTGOING = d.OUTGOING;
    if (typeof d.UNLOCKED_SLOTS === "number") {
      store.UNLOCKED_SLOTS = Math.max(FREE_SLOTS, Math.min(MAX_SLOTS, d.UNLOCKED_SLOTS));
    }
    if (typeof d.ACTIVE_IDX === "number") store.ACTIVE_IDX = d.ACTIVE_IDX;
    if (d.PET_STYLES && typeof d.PET_STYLES === "object") store.PET_STYLES = d.PET_STYLES;
    store.tab = Math.min(TABS.length - 1, +d.tab || 0);
    store.gf = d.gf || "Semua";
    if (d.seen) {
      store.SEEN = new Set(d.seen);
      store.SEED = 0;
    }
  } catch (_) {}
}

export function autoDetectIdentity() {
  let detectedUsn = "", detectedMembers = [];
  try {
    const qp = new URLSearchParams(location.search);
    if (qp.get("usn")) detectedUsn = normUsn(qp.get("usn"));
    if (qp.get("api")) store.DIRECT_API = String(qp.get("api")).replace(/\/+$/, "");
    if (qp.get("tma")) store.DIRECT_TMA = String(qp.get("tma"));
    if (qp.get("members")) {
      const m = JSON.parse(qp.get("members"));
      if (Array.isArray(m)) detectedMembers = m;
    }
  } catch (_) {}
  try {
    const tgSelf = window.Telegram?.WebApp, tgParent = window.parent?.Telegram?.WebApp;
    const u = tgSelf?.initDataUnsafe?.user || tgParent?.initDataUnsafe?.user;
    if (u && u.username) detectedUsn = normUsn(u.username);
    if (!store.DIRECT_TMA) store.DIRECT_TMA = tgSelf?.initData || tgParent?.initData || "";
  } catch (_) {}
  try {
    const p = window.parent;
    if (p && p !== window) {
      if (!store.DIRECT_API && p.PUNK_CONFIG?.API_URL) {
        store.DIRECT_API = String(p.PUNK_CONFIG.API_URL).replace(/\/+$/, "");
      }
      const pu = p.PunkCore?.S?.user || p.STATE?.user || p.PUNK?.user || p.CURRENT_USER;
      if (pu && (pu.username || pu.usn)) detectedUsn = normUsn(pu.username || pu.usn);
      const pm = p.PunkCore?.S?.members || p.STATE?.members || p.STATE?.warga || p.WARGA || p.PUNK?.members;
      if (Array.isArray(pm) && pm.length) detectedMembers = pm;
    }
  } catch (_) {}
  try {
    if (!store.DIRECT_API) {
      const lsApi = localStorage.getItem("psk_api_url");
      if (lsApi) store.DIRECT_API = String(lsApi).replace(/\/+$/, "");
    }
  } catch (_) {}
  if (detectedUsn) store.MY_USN = detectedUsn;
  if (detectedMembers.length) store.WARGA_MEMBERS = detectedMembers;
}
