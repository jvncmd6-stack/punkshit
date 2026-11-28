import { E } from "./config.js";
import { bodyD, coreD, CR, CRt, setCR, setSPD } from "./avatar.js";

const $ = id => document.getElementById(id);
const hap = () => { try { navigator.vibrate && navigator.vibrate(6); } catch (_) {} };

const RM = matchMedia("(prefers-reduced-motion:reduce)").matches;
const C = { ...E.Happy };
const P = { x: 0, y: 0, on: 0 };
const G = 3200;

let R = {}, ph = 0, pb = 0, ps = 0, pw = 0, y = 0, vy = 0, q = 0, qv = 0, nx = 1.5, cr = 0, last = 0, bk = 0, nb = 2, ex = 0, ey = 0, wx = 0, wy = 0, nw = 1, pxs = 0, pys = 0, PT = "", TT = "", emberCd = 0.35;

export function bindPetDOM() {
  const SV = $("svg");
  const f = s => [...SV.querySelectorAll(s)];
  R = {
    pet: SV.querySelector(".pet"),
    bp: f(".bp"),
    cp: f(".cp"),
    face: SV.querySelector(".face-grp"),
    head: SV.querySelector(".head-grp"),
    gsh: SV.querySelector(".gsh"),
    leg: f(".leg"),
    pp: f(".pp"),
    eye: f(".eye"),
    arm: f(".arm")
  };
}

export function applyPetFrame() {
  const tl = $("tilt");

  // Update siluet api luar & inti api dalam di 60 FPS penuh
  if (R.bp && R.bp.length) {
    const d = bodyD(ph);
    R.bp.forEach(p => p.setAttribute("d", d));
  }
  if (R.cp && R.cp.length) {
    const cd = coreD(ph);
    R.cp.forEach(p => p.setAttribute("d", cd));
  }

  if (R.pet) R.pet.setAttribute("transform", PT);

  // 2.5D Head-Turn Parallax pada wajah & secondary bounce pada topi
  const fx = (pxs * 7.5 + ex * 0.25).toFixed(1);
  const fy = (pys * 5.5 + ey * 0.2).toFixed(1);
  if (R.face) {
    R.face.setAttribute("transform", `translate(${fx} ${fy})`);
  }
  if (R.head) {
    const hx = (pxs * 5.2).toFixed(1);
    const hy = (pys * 3.8 + q * 16).toFixed(1);
    const hrot = (pxs * 3.2 - qv * 0.35).toFixed(2);
    R.head.setAttribute("transform", `translate(${hx} ${hy}) rotate(${hrot} 150 130)`);
  }

  // Bayangan lantai mengecil & memudar saat melompat ke udara
  if (R.gsh) {
    const jumpFactor = Math.max(0.55, 1 - y / 140);
    R.gsh.setAttribute("transform", `translate(150 356) scale(${jumpFactor.toFixed(3)} ${jumpFactor.toFixed(3)}) translate(-150 -356)`);
    R.gsh.style.opacity = Math.max(0.35, jumpFactor).toFixed(2);
  }

  // Kaki memanjang sedikit saat melompat
  if (R.leg && R.leg.length) {
    const legLift = Math.min(8, y * 0.18).toFixed(1);
    R.leg.forEach((lg, idx) => {
      const sway = idx === 0 ? -legLift : legLift * 0.6;
      lg.setAttribute("transform", y > 1 ? `translate(0 ${(-legLift * 0.4).toFixed(1)}) rotate(${sway} ${idx === 0 ? 124 : 176} 320)` : "");
    });
  }

  if (R.pp) {
    const pt = `translate(${ex.toFixed(1)} ${ey.toFixed(1)})`;
    R.pp.forEach(p => p.setAttribute("transform", pt));
  }
  if (R.eye) {
    const sy = bk > 0 ? 1 - .92 * Math.sin((1 - bk / .14) * Math.PI) : 1;
    R.eye.forEach(e => {
      const x = e.dataset.x;
      e.setAttribute("transform", sy < .999 ? `translate(${x} 218) scale(1 ${sy.toFixed(2)}) translate(-${x} -218)` : "");
    });
  }
  if (R.arm) {
    R.arm.forEach(a => {
      const m = +a.dataset.m, s = m ? -1 : 1;
      const ang = (m && +a.dataset.g)
        ? Math.sin(pw) * 2.5
        : C.up * 136 * s + C.wv * Math.sin(pw * 1.1 + m * 1.9) + (1 - C.up) * Math.sin(ps * 1.3 + m * 2.1) * 4.5 * s - s * q * 64;
      a.setAttribute("transform", `rotate(${ang.toFixed(1)} ${m ? 236 : 64} 264)`);
    });
  }
  if (tl) tl.style.transform = TT;
}

export function bumpPet(height = 22, qForce = .6) {
  if (y === 0 && cr <= 0) {
    vy = Math.sqrt(2 * G * height);
    qv -= qForce;
  }
  burstSparks();
}

export function burstSparks() {
  if (RM) return;
  const stg = $("stage");
  if (!stg) return;
  for (let i = 0; i < 8; i++) {
    const e = document.createElement("i");
    const a = i / 8 * 6.283 + Math.random() * .5;
    const r = 68 + Math.random() * 52;
    e.className = "spk";
    e.style.setProperty("--x", Math.cos(a) * r + "px");
    e.style.setProperty("--y", Math.sin(a) * r * .8 - 22 + "px");
    if (i % 2) e.style.background = "var(--ac)";
    stg.appendChild(e);
    setTimeout(() => e.remove(), 620);
  }
}

// Percikan bara api halus yang terus naik dari rambut api
function spawnAmbientEmber() {
  if (RM) return;
  const stg = $("stage");
  if (!stg) return;
  const e = document.createElement("i");
  const startX = (Math.random() - 0.5) * 90;
  const driftX = startX + (Math.random() - 0.5) * 45;
  const riseY = -95 - Math.random() * 65;
  e.className = "spk";
  e.style.width = "5px";
  e.style.height = "5px";
  e.style.marginLeft = startX.toFixed(1) + "px";
  e.style.marginTop = "-35px";
  e.style.background = Math.random() > 0.4 ? "var(--gl)" : "var(--ac)";
  e.style.boxShadow = "0 0 8px var(--ac)";
  e.style.setProperty("--x", driftX.toFixed(1) + "px");
  e.style.setProperty("--y", riseY.toFixed(1) + "px");
  stg.appendChild(e);
  setTimeout(() => e.remove(), 620);
}

export function startAnimationLoop(getState) {
  function step(ms) {
    const { viewMode, emo } = getState();
    if (document.hidden || viewMode !== "stage") {
      last = ms;
      requestAnimationFrame(step);
      return;
    }
    const dt = Math.min((ms - last) / 1000 || .016, .05);
    last = ms;
    const T = E[emo] || E.Happy;
    const a = 1 - Math.exp(-dt * 6);
    for (const k in C) C[k] += (T[k] - C[k]) * a;

    setSPD(C.sp);
    setCR(CR + (CRt - CR) * (1 - Math.exp(-dt * 4)));

    ph += dt * C.sp;
    pb += dt * C.bf * 6.283;
    ps += dt * C.sf * 6.283;
    pw += dt * (4 + C.sp * 3);

    // Spawn bara api melayang secara berkala
    emberCd -= dt * (0.7 + C.sp * 0.4);
    if (emberCd <= 0) {
      emberCd = 0.35 + Math.random() * 0.45;
      spawnAmbientEmber();
    }

    const H = RM ? 0 : T.h;
    if (T.hi > 0 && H > 0) {
      nx -= dt;
      if (nx <= 0 && y === 0 && cr <= 0) {
        cr = .11;
        nx = T.hi;
      }
    }
    if (cr > 0) {
      cr -= dt;
      if (cr <= 0) vy = Math.sqrt(2 * G * H);
    }
    if (y > 0 || vy > 0) {
      vy -= G * dt;
      y += vy * dt;
      if (y <= 0) {
        qv -= Math.min(-vy, 520) * .0045;
        y = 0;
        vy = 0;
      }
    }
    const tq = y > 0 ? Math.max(-.06, Math.min(.1, vy / 4000)) : (cr > 0 ? -.1 : 0);
    qv += (-300 * (q - tq) - 18 * qv) * dt;
    q += qv * dt;

    const b = Math.sin(pb) * C.br;
    const sy = (1 + q) * (1 + b);
    const sx = (1 - q * .75) * (1 - b * .6);
    const k = 1 - Math.exp(-dt * 8);

    pxs += (P.x * P.on - pxs) * k;
    pys += (P.y * P.on - pys) * k;

    const rot = Math.sin(ps) * C.sw + C.ln + pxs * 4.5;
    const dx = Math.sin(ps) * C.sw * .9 + Math.sin(pw * 5) * C.sh;
    const ty = C.dy - y;

    PT = `translate(${dx.toFixed(1)} ${ty.toFixed(1)}) translate(150 350) rotate(${rot.toFixed(1)}) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) translate(-150 -350)`;
    TT = `translate3d(${(pxs * 12).toFixed(1)}px,${(pys * 8).toFixed(1)}px,0)`;

    if (P.on) {
      wx = P.x * 14;
      wy = P.y * 10;
    } else {
      nw -= dt;
      if (nw <= 0) {
        nw = 1.1 + Math.random() * 2.2;
        wx = (Math.random() - .5) * 14;
        wy = (Math.random() - .5) * 8;
      }
    }
    const ke = 1 - Math.exp(-dt * (P.on ? 14 : 9));
    ex += (wx - ex) * ke;
    ey += (wy - ey) * ke;

    nb -= dt;
    if (bk > 0) bk = Math.max(0, bk - dt);
    else if (nb <= 0) {
      bk = .14;
      nb = 2 + Math.random() * 3.5;
    }

    applyPetFrame();
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

export function initInteractions(toastFn) {
  const stg = $("stage");
  const pm = e => {
    const r = stg.getBoundingClientRect();
    P.x = (e.clientX - r.left) / r.width - .5;
    P.y = (e.clientY - r.top) / r.height - .5;
    P.on = 1;
  };
  const off = () => { P.on = 0; };

  stg.addEventListener("pointermove", pm);
  stg.addEventListener("pointerleave", off);
  stg.addEventListener("pointercancel", off);
  stg.addEventListener("pointerup", e => { if (e.pointerType !== "mouse") off(); });
  stg.addEventListener("pointerdown", e => {
    pm(e);
    if (y === 0 && cr <= 0) {
      vy = Math.sqrt(2 * G * 30);
      qv -= .95;
    } else {
      qv -= .45;
    }
    burstSparks();
    hap();
  });

  // Draggable Bottom Sheet
  const g = $("grab"), sh = $("sheet"), cd = $("card");
  let y0 = 0, h0 = 0, dr = 0;
  function syncSheetState(h) {
    const H = cd.offsetHeight;
    sh.classList.toggle("collapsed", h <= 72);
    cd.classList.toggle("sheet-low", h <= H * 0.24);
  }
  g.addEventListener("pointerdown", e => {
    dr = 1;
    y0 = e.clientY;
    h0 = sh.offsetHeight;
    sh.classList.add("dragging");
    g.setPointerCapture(e.pointerId);
  });
  g.addEventListener("pointermove", e => {
    if (!dr) return;
    const nh = Math.max(54, Math.min(cd.offsetHeight * .72, h0 + y0 - e.clientY));
    sh.style.setProperty("--sh", nh + "px");
    syncSheetState(nh);
  });
  const end = e => {
    if (!dr) return;
    dr = 0;
    sh.classList.remove("dragging");
    const H = cd.offsetHeight, c = sh.offsetHeight;
    const tap = Math.abs(e.clientY - y0) < 5;
    const sn = [54, H * .36, H * .66];
    const target = tap ? (c > H * .25 ? 54 : H * .36) : sn.reduce((a, b) => Math.abs(b - c) < Math.abs(a - c) ? b : a);
    sh.style.setProperty("--sh", target + "px");
    syncSheetState(target);
  };
  g.addEventListener("pointerup", end);
  g.addEventListener("pointercancel", end);

  // Screenshot Modal
  let lastShotBlob = null, lastShotName = "spark-buddy.png";
  $("shot").onclick = async () => {
    try {
      const SV = $("svg");
      const cs = getComputedStyle(document.documentElement);
      const ac = cs.getPropertyValue("--ac").trim() || "#ff8a1f";
      const gl = cs.getPropertyValue("--gl").trim() || ac;
      const W = 1080, Hh = 1350, c = document.createElement("canvas");
      c.width = W; c.height = Hh;
      const x = c.getContext("2d");
      const F = '-apple-system,"SF Pro Rounded",system-ui,sans-serif';
      const rr = (a, b, w, h) => { x.beginPath(); x.roundRect ? x.roundRect(a, b, w, h, h / 2) : x.rect(a, b, w, h); x.fill(); };
      const t = (s, px, py, sz, w, col, al) => { x.font = `${w} ${sz}px ${F}`; x.fillStyle = col; x.textAlign = al || "left"; x.fillText(s, px, py); };

      x.fillStyle = "#07070b"; x.fillRect(0, 0, W, Hh);
      const grad = x.createRadialGradient(540, 1000, 0, 540, 1000, 640);
      grad.addColorStop(0, ac + "88"); grad.addColorStop(1, ac + "00");
      x.fillStyle = grad; x.fillRect(0, 0, W, Hh);

      t("Spark Buddies", 60, 110, 56, 700, "#fff");
      t($("stageSub").textContent || "7 Slots • One Group", 60, 155, 28, 400, "#9a9aa4");

      const rt = $("rare").textContent;
      x.font = `600 30px ${F}`;
      const rw = x.measureText(rt).width + 44;
      x.fillStyle = ac; rr(W - 60 - rw, 70, rw, 52);
      t(rt, W - 60 - rw / 2, 107, 30, 600, "#111", "center");

      t($("num").textContent, 60, 300, 150, 800, ac);
      t("Hari nyala 🔥", 60, 352, 34, 600, "#fff");
      t($("sb").textContent, 60, 396, 28, 600, "#9a9aa4");
      t(`${$("p1Name").textContent}  ×  ${$("p2Name").textContent}`, 60, 444, 28, 700, "#fff");

      const img = await new Promise((ok, no) => {
        const c2 = SV.cloneNode(true);
        c2.setAttribute("width", 640);
        c2.setAttribute("height", 793);
        c2.removeAttribute("style");
        const i = new Image();
        i.onload = () => ok(i);
        i.onerror = no;
        i.src = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(c2)], { type: "image/svg+xml" }));
      });
      x.drawImage(img, 220, 410, 640, 793);

      t($("nm").textContent, 60, 1230, 78, 700, "#fff");
      const lc = $("lvc").textContent;
      x.font = `600 30px ${F}`;
      const lw = x.measureText(lc).width + 44;
      x.fillStyle = "#ffffff2e"; rr(W - 60 - lw, 1182, lw, 52);
      t(lc, W - 60 - lw / 2, 1219, 30, 600, "#fff", "center");

      x.fillStyle = "#ffffff22"; rr(60, 1262, 960, 18);
      const lg = x.createLinearGradient(60, 0, 1020, 0);
      lg.addColorStop(0, gl); lg.addColorStop(1, ac);
      x.fillStyle = lg; rr(60, 1262, Math.max(18, 9.6 * (parseFloat($("fill").style.width) || 0)), 18);
      t($("bt").textContent, 60, 1320, 28, 400, "#9a9aa4");

      const dataUrl = c.toDataURL("image/png");
      lastShotBlob = await new Promise(r => c.toBlob(r, "image/png"));
      lastShotName = "spark-" + ($("nm").textContent.replace(/\W+/g, "") || "buddy") + ".png";
      $("shotImg").src = dataUrl;
      $("shotModal").hidden = false;
      hap();
    } catch (_) {
      toastFn("Gagal bikin gambar");
    }
  };

  $("shotClose").onclick = () => { $("shotModal").hidden = true; };
  $("shotShareBtn").onclick = async () => {
    if (!lastShotBlob) return;
    const fl = new File([lastShotBlob], lastShotName, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [fl] })) {
      try {
        await navigator.share({ files: [fl], title: "Spark Buddies" });
        toastFn("Tersimpan ✓");
        return;
      } catch (e) {
        if (e.name == "AbortError") return;
      }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(lastShotBlob);
    a.download = lastShotName;
    a.click();
    toastFn("Tahan gambar lalu Simpan Foto");
  };
}
