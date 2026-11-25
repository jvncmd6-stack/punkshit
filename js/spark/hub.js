import { FREE_SLOTS, MAX_SLOTS, SLOT_PRICES } from "./config.js";
import { $, hap, normUsn, day, store, toast } from "./state.js";

export function renderHub({ onOpenSlot, onSendAction, onSendInvite }) {
  const { MY_USN, PAIRS, INCOMING, OUTGOING, UNLOCKED_SLOTS, WARGA_MEMBERS, LOCAL_SETOR_DAY } = store;

  const heroTitle = document.querySelector(".pg-hero h2");
  if (heroTitle) heroTitle.textContent = `Spark Buddies (${UNLOCKED_SLOTS}/${MAX_SLOTS} Slot)`;

  const badge = $("myUsnBadge");
  if (badge) {
    badge.textContent = MY_USN
      ? `🆔 @${MY_USN} • ${PAIRS.length}/${UNLOCKED_SLOTS} Slot Terisi`
      : `⚠️ @username belum terdeteksi`;
  }

  const grid = $("slotsGrid");
  let cardsHtml = "";

  for (let i = 0; i < MAX_SLOTS; i++) {
    const slotNum = i + 1;
    if (i < UNLOCKED_SLOTS) {
      if (i < PAIRS.length) {
        const p = PAIRS[i];
        const q1 = ((p.g1?.gap || 0) >= 5 && (p.g1?.msg || 0) >= 2) || Boolean(p.hasSetorToday || p.litToday) || LOCAL_SETOR_DAY === day();
        const q2 = (p.g2?.gap || 0) >= 5 && (p.g2?.msg || 0) >= 2;
        const stTxt = (q1 && q2)
          ? "🔥 Nyala Hari Ini"
          : (q1 && !q2
              ? "⏳ Nunggu Partner Setor"
              : (!q1 && q2 ? "⏳ Giliran Kamu Setor!" : "⏳ Belum Setor Hari Ini"));
        cardsHtml += `<div class="slot-card active" data-open-slot="${i}">
          <div class="sc-left">
            <div class="sc-ico">${(q1 && q2) ? "🔥" : "⏳"}</div>
            <div class="sc-info">
              <b>Slot ${slotNum}: @${p.partnerUsername}</b>
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
              <b>Slot ${slotNum}: @${out.targetUsername}</b>
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
              <b>Slot ${slotNum}: Kosong ${slotNum <= FREE_SLOTS ? "(Gratis)" : "(VIP)"}</b>
              <small>Tap untuk ajak teman di bawah</small>
            </div>
          </div>
          <span class="sc-act sec">Ajak</span>
        </div>`;
      }
    } else {
      const price = SLOT_PRICES[slotNum] || 500;
      const isNextUnlockable = slotNum === UNLOCKED_SLOTS + 1;
      cardsHtml += `<div class="slot-card locked" style="opacity:${isNextUnlockable ? "1" : ".65"};border:1px dashed rgba(255,214,51,.35)">
        <div class="sc-left">
          <div class="sc-ico">🔒</div>
          <div class="sc-info">
            <b>Slot ${slotNum}: Slot Tambahan VIP</b>
            <small>${isNextUnlockable ? `Buka permanen seharga ${price} PSC` : `Buka Slot ${slotNum - 1} terlebih dahulu`}</small>
          </div>
        </div>
        ${isNextUnlockable
          ? `<button class="sc-act" style="background:#FFD633;color:#0a0f1c;font-weight:800" data-unlock-slot="${slotNum}" data-price="${price}">🔓 ${price} PSC</button>`
          : `<span class="sc-act sec">Terkunci</span>`}
      </div>`;
    }
  }
  grid.innerHTML = cardsHtml;

  grid.querySelectorAll("[data-open-slot]").forEach(el => {
    el.onclick = () => onOpenSlot(Number(el.dataset.openSlot));
  });
  grid.querySelectorAll("[data-cancel-to]").forEach(btn => {
    btn.onclick = async e => {
      e.stopPropagation();
      const target = btn.dataset.cancelTo;
      store.OUTGOING = store.OUTGOING.filter(x => normUsn(x.targetUsername) !== target);
      renderHub({ onOpenSlot, onSendAction, onSendInvite });
      await onSendAction({ type: "SPARK_INVITE_CANCEL", targetUsername: target });
      toast("Ajakan dibatalkan");
    };
  });
  grid.querySelectorAll("[data-focus-input]").forEach(el => {
    el.onclick = () => { $("partnerInput").focus(); hap(); };
  });
  grid.querySelectorAll("[data-unlock-slot]").forEach(btn => {
    btn.onclick = async e => {
      e.stopPropagation();
      const sNum = Number(btn.dataset.unlockSlot);
      const price = Number(btn.dataset.price);
      if (!confirm(`Buka Slot Spark #${sNum} permanen dengan ${price} PSC?`)) return;
      btn.disabled = true;
      btn.textContent = "Membuka...";
      const res = await onSendAction({ type: "SPARK_UNLOCK_SLOT" });
      if (!res || !res.ok) btn.disabled = false;
    };
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
      if (store.PAIRS.length >= store.UNLOCKED_SLOTS) {
        return toast(`Slot penuh! Maksimal ${store.UNLOCKED_SLOTS} partner.`);
      }
      store.INCOMING = store.INCOMING.filter(x => normUsn(x.fromUsername) !== from);
      if (!store.PAIRS.some(x => normUsn(x.partnerUsername) === from)) {
        store.PAIRS.push({ partnerUsername: from, streak: 0, xp: 0, g1: { gap: 0, msg: 0 }, g2: { gap: 0, msg: 0 } });
      }
      await onSendAction({ type: "SPARK_INVITE_ACCEPT", fromUsername: from, byUsername: store.MY_USN });
      renderHub({ onOpenSlot, onSendAction, onSendInvite });
      toast(`🔥 Sah! Terhubung dengan @${from}!`);
    };
  });
  incWrap.querySelectorAll("[data-dec-from]").forEach(btn => {
    btn.onclick = async () => {
      const from = btn.dataset.decFrom;
      store.INCOMING = store.INCOMING.filter(x => normUsn(x.fromUsername) !== from);
      renderHub({ onOpenSlot, onSendAction, onSendInvite });
      await onSendAction({ type: "SPARK_INVITE_DECLINE", fromUsername: from, byUsername: store.MY_USN });
      toast(`Ajakan dari @${from} ditolak`);
    };
  });

  const totalUsed = store.PAIRS.length + store.OUTGOING.length;
  $("inviteFormWrap").hidden = totalUsed >= store.UNLOCKED_SLOTS;

  const wrap = $("wargaList"), lbl = $("wargaListLabel");
  const existingSet = new Set([
    normUsn(store.MY_USN),
    ...store.PAIRS.map(p => normUsn(p.partnerUsername)),
    ...store.OUTGOING.map(o => normUsn(o.targetUsername))
  ]);
  const others = WARGA_MEMBERS.filter(m => {
    const usn = normUsn(m.username || m.usn);
    return usn && !existingSet.has(usn);
  });

  if (!others.length) {
    lbl.textContent = "Cara Ajak Teman";
    wrap.innerHTML = `<div class="pg-rules">Ketik <b>@username</b> temanmu di kolom atas lalu klik <b>Kirim Ajakan</b>. Slot 1–4 gratis, Slot 5–7 bisa dibuka pakai PSC!</div>`;
    return;
  }

  lbl.textContent = `Pilih @Username Warga Markas (${others.length})`;
  wrap.innerHTML = others.slice(0, 25).map(m => {
    const usn = normUsn(m.username || m.usn);
    const dispName = m.name ? ` (${m.name})` : "";
    const rank = m.rank || m.title || "Warga Punk";
    return `<div class="pg-user"><div class="pg-user-info"><b>@${usn}${dispName}</b><small>${rank}</small></div><button class="pg-invite" data-usn="${usn}">Ajak @${usn}</button></div>`;
  }).join("");
  wrap.querySelectorAll("[data-usn]").forEach(btn => {
    btn.onclick = () => onSendInvite(btn.dataset.usn);
  });
}
