import { OL, TH, SC, LG, VB } from "./config.js";

export const mix = (h, m, t) => {
  const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)), A = p(h), B = p(m);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
};

export let CR = 1, CRt = 1, SPD = 1;
export const setCR = v => { CR = v; };
export const setSPD = v => { SPD = v; };

const Y = v => v < 150 ? 150 - (150 - v) * CR : v;

// Siluet api utama yang lebih proporsional & organik
export const bodyD = (t = 0) => {
  const a = Math.sin(t * 2.1) * 3.5;
  const b = Math.sin(t * 2.6 + 1.1) * 4.5;
  const c = Math.sin(t * 2.3 + 2.2) * 4.5;
  const d = Math.sin(t * 2.9 + 3.1) * 3.5;
  const y = Math.sin(t * 3.2) * 2;
  return `M150 334C88 334 54 294 56 238C58 198 76 176 80 148C80 ${Y(130)} ${66 + a * 0.45} ${Y(114)} ${72 + a} ${Y(90 + y)}C${90 + a * 0.5} ${Y(102)} 100 ${Y(114)} 106 ${Y(125)}C104 ${Y(96)} ${116 + b * 0.45} ${Y(62)} ${134 + b} ${Y(38 - y)}C${142 + b * 0.45} ${Y(64)} 145 ${Y(80)} 150 ${Y(94)}C${160 + c * 0.4} ${Y(64)} ${178 + c * 0.5} ${Y(46)} ${196 + c} ${Y(34 + y)}C${194 + c * 0.45} ${Y(62)} 198 ${Y(82)} 203 ${Y(98)}C214 ${Y(80)} ${228 + d * 0.45} ${Y(72)} ${240 + d} ${Y(76 - y)}C${235 + d * 0.45} ${Y(96)} 234 ${Y(112)} 232 ${Y(128)}C246 154 246 194 244 238C246 294 212 334 150 334Z`;
};

const BODY = bodyD(0);
const st3 = (w = 3.8) => `stroke="${OL}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

function mouth(e, st = 2) {
  const R = "#7a1622", T = "#ff7a8a";
  const fg = (x, y, s = 1) => st < 1 ? "" : `<path d="M${x} ${y}l${9 * s} 0l${-4.5 * s} ${10 * s}z" fill="#fff" ${st3(1.5)}/>`;
  if (["Excited", "Celebrating", "Dancing"].includes(e)) {
    return `<path d="M114 256Q150 248 186 256Q181 300 150 300Q119 300 114 256Z" fill="${R}" ${st3(3.4)}/><ellipse cx="150" cy="289" rx="15" ry="7.5" fill="${T}"/>${fg(122, 257)}${fg(169, 257, .85)}`;
  }
  if (e === "Surprised") {
    return `<ellipse cx="150" cy="281" rx="13" ry="17" fill="${R}" ${st3(3.4)}/><ellipse cx="150" cy="289" rx="7.5" ry="5.5" fill="${T}"/>`;
  }
  if (e === "Angry") {
    return `<path d="M118 283Q150 265 182 283Q150 301 118 283Z" fill="#fff" ${st3(3.6)}/><path d="M133 276v14M150 273v20M167 276v14" ${st3(2)}/>`;
  }
  if (e === "Waiting") {
    return `<path d="M130 273Q150 270 170 269" ${st3(5.2)} fill="none"/>`;
  }
  if (e === "Worried") {
    return `<path d="M124 275q6.5-7 13 0t13 0t13 0t13 0" fill="none" ${st3(4.2)}/>`;
  }
  if (e === "Crying") {
    return `<path d="M124 286Q150 260 176 286" fill="none" ${st3(5.2)}/>`;
  }
  if (e === "Sleepy") {
    return `<path d="M126 268Q150 284 174 266" fill="none" ${st3(4.5)}/>`;
  }
  return `<path d="M124 259Q150 254 176 258Q171 287 150 287Q129 287 124 259Z" fill="${R}" ${st3(3.4)}/><ellipse cx="150" cy="279" rx="11" ry="5.5" fill="${T}"/>${fg(130, 259, .9)}${fg(161, 258, .75)}`;
}

export function renderPetSVG(S, lv) {
  const [L, M, D, bo] = TH[S.theme] || TH.Api;
  const e = S.emo, st = Math.ceil(lv / 2) - 1, s = SC[st], Ls = LG[st], O = S.outfit, H = S.head, X = S.extra, G = X.has("Gitar");
  const coreLight = mix(L, "#ffffff", 0.55);
  const rimCol = mix(L, "#ffffff", 0.35);

  let h = `<defs>
  <linearGradient id="bd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${L}"/><stop offset=".52" stop-color="${M}"/><stop offset="1" stop-color="${D}"/></linearGradient>
  <linearGradient id="core" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${coreLight}" stop-opacity=".92"/><stop offset=".65" stop-color="${L}" stop-opacity=".55"/><stop offset="1" stop-color="${M}" stop-opacity="0"/></linearGradient>
  <radialGradient id="sh" cx=".5" cy=".46" r=".6"><stop offset=".65" stop-color="${D}" stop-opacity="0"/><stop offset="1" stop-color="${mix(D, "#000000", .55)}" stop-opacity=".48"/></radialGradient>
  <radialGradient id="ey" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="${mix(M, "#000000", .18)}"/><stop offset="1" stop-color="${mix(D, "#000000", .68)}"/></radialGradient>
  <radialGradient id="st" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#7c7c8a"/></radialGradient>
  <linearGradient id="bk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3c3c4a"/><stop offset="1" stop-color="#14141c"/></linearGradient>
  <linearGradient id="hd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a888ff"/><stop offset="1" stop-color="#6538cc"/></linearGradient>
  <linearGradient id="gd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff4b8"/><stop offset=".5" stop-color="#ffd23f"/><stop offset="1" stop-color="#c98500"/></linearGradient>
  <linearGradient id="rd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6252"/><stop offset="1" stop-color="#9e0e22"/></linearGradient>
  <linearGradient id="bg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="${bo}"/></linearGradient>
  <radialGradient id="au"><stop offset=".3" stop-color="${bo}" stop-opacity=".45"/><stop offset="1" stop-color="${bo}" stop-opacity="0"/></radialGradient>
  <radialGradient id="hl"><stop offset="0" stop-color="#fff" stop-opacity=".68"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <radialGradient id="ck"><stop offset="0" stop-color="#ff3d78" stop-opacity=".52"/><stop offset="1" stop-color="#ff3d78" stop-opacity="0"/></radialGradient>
  <pattern id="fl" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="#d94e1f"/><rect y="6" width="18" height="5" fill="#181820" opacity=".52"/><rect x="6" width="5" height="18" fill="#181820" opacity=".52"/></pattern>
  <pattern id="pl" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#a81024"/><rect y="6" width="16" height="4" fill="#181820" opacity=".78"/><rect x="6" width="4" height="16" fill="#181820" opacity=".78"/></pattern>
  <clipPath id="cp"><path class="bp" d="${BODY}"/></clipPath>
  <clipPath id="cpCloth"><path d="M36 274Q150 306 264 274L276 346Q150 364 24 346Z"/></clipPath>
  </defs>`;

  // Bayangan pijakan lantai
  h += `<ellipse cx="150" cy="356" rx="${108 * s}" ry="12" fill="#000" opacity=".5"/><ellipse cx="150" cy="356" rx="${108 * s}" ry="12" fill="none" stroke="${M}" stroke-width="2.5" opacity=".75"/>`;

  CRt = [.52, .76, 1, 1.16, 1.28][st] * ({ Worried: .62, Crying: .58, Sleepy: .72, Excited: 1.12, Celebrating: 1.15, Angry: 1.28, Surprised: 1.18, Love: 1.05 }[e] || 1);
  SPD = { Excited: 2.2, Celebrating: 2.5, Worried: 3.1, Sleepy: .5, Dancing: 1.8 }[e] || 1;

  if (st >= 3) h += `<circle cx="150" cy="204" r="${st === 4 ? 170 : 144}" fill="url(#au)"/>`;
  if (st === 4) {
    h += `<g class="orb">${[0, 120, 240].map(a => `<g transform="rotate(${a} 150 200)"><polygon points="0,0 14,0 8,18 20,18 -3,46 3,24 -7,24" transform="translate(143 24)" fill="url(#bg2)" ${st3(2.4)}/></g>`).join("")}</g>`;
  }
  if (S.bolts) {
    h += [["28,94 52,94 42,126 64,126 26,180 35,142 16,142", 0], ["262,54 286,54 276,86 296,86 258,138 266,102 248,102", .9]]
      .map(([p, d]) => `<polygon class="bolt" style="animation-delay:${d}s" points="${p}" fill="url(#bg2)" ${st3(2.8)}/>`).join("");
  }

  h += `<g transform="translate(150 350) scale(${s}) translate(-150 -350)"><g transform="translate(0 ${-Ls})"><g class="pet">`;

  // Kaki & Sepatu kecil yang lebih rapi
  const leg = x => `<path d="M${x} 320L${x - 1} ${338 + Ls}" stroke="${OL}" stroke-width="18" stroke-linecap="round"/><path d="M${x} 320L${x - 1} ${338 + Ls}" stroke="${D}" stroke-width="11" stroke-linecap="round"/><ellipse cx="${x + (x < 150 ? -7 : 7)}" cy="${341 + Ls}" rx="20" ry="9.5" fill="url(#bd)" ${st3(3.6)}/>`;
  h += leg(124) + leg(176);

  // Badan Api + Inner Core 3D + Rim Highlight
  h += `<path class="bp" d="${BODY}" fill="url(#bd)" ${st3(4.6)}/>`;
  h += `<path class="bp" d="${BODY}" fill="url(#sh)"/>`;
  h += `<path d="M150 322C104 322 80 288 82 244C84 210 102 190 116 164C124 182 132 188 138 166C146 140 156 122 166 106C166 134 172 152 182 164C192 150 202 146 208 152C204 176 216 204 218 244C220 288 196 322 150 322Z" fill="url(#core)"/>`;
  h += `<ellipse cx="96" cy="182" rx="9" ry="26" transform="rotate(-14 96 182)" fill="url(#hl)"/>`;
  h += `<path d="M234 178Q242 214 236 254" fill="none" stroke="${rimCol}" stroke-width="3.5" stroke-linecap="round" opacity=".55"/>`;

  // Tanda petir kecil di dahi (sembunyikan jika ketutup topi rendah)
  const hideForeheadMark = ["Beanie", "Snapback", "Ikat Kepala", "Bucket"].includes(H);
  if (!hideForeheadMark) {
    h += `<polygon points="155,118 146,118 150,129 143,129 154,147 151,134 159,134" fill="${bo}" ${st3(1.8)}/>`;
  }

  if (st >= 3) {
    h += `<path d="M86 282l12-12-6 14 14-10M214 282l-12-12 6 14-14-10M96 318l10-8-4 12 12-8M204 318l-10-8 4 12-12-8" fill="none" stroke="${bo}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  if (st === 4) {
    h += `<ellipse cx="150" cy="12" rx="44" ry="8.5" fill="none" stroke="#ffd21f" stroke-width="4.5"/>`;
  }

  // Bayangan kontak di bawah kerah baju
  if (O !== "Polos") {
    h += `<path d="M62 282Q150 314 238 282" fill="none" stroke="#000" stroke-width="8" stroke-linecap="round" opacity=".24"/>`;
  }

  // KOSTUM / BAJU dengan kerah, lipatan, dan volume nyata (tidak bodypaint)
  if (O === "Hoodie") {
    h += `<g clip-path="url(#cp)"><path d="M44 282Q150 314 256 282L268 350H32Z" fill="url(#hd)" ${st3(3.6)}/><path d="M88 286Q150 324 212 286Q194 314 150 316Q106 314 88 286Z" fill="#522eb0" ${st3(3)}/><path d="M132 308v24M168 308v24" ${st3(2.8)} stroke="#f3ebff"/><circle cx="132" cy="333" r="3" fill="#f3ebff"/><circle cx="168" cy="333" r="3" fill="#f3ebff"/><path d="M102 328Q150 320 198 328L204 348H96Z" fill="#00000024" ${st3(2.5)}/></g>`;
  }
  if (O === "Jaket Punk") {
    h += `<g clip-path="url(#cp)"><path d="M44 278Q150 306 256 278L268 350H32Z" fill="url(#bk)" ${st3(3.6)}/><path d="M118 294L150 342L182 294Z" fill="#2a2a35"/><path d="M90 284L134 334L108 346L82 304Z" fill="#363644" ${st3(3)}/><path d="M210 284L166 334L192 346L218 304Z" fill="#363644" ${st3(3)}/><path d="M150 312V346" stroke="#b4b4c4" stroke-width="3" stroke-dasharray="4 3"/>${[[94, 302], [105, 318], [206, 302], [195, 318]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.8" fill="url(#st)" ${st3(1.4)}/>`).join("")}</g>`;
  }
  if (O === "Singlet") {
    h += `<g clip-path="url(#cp)"><path d="M74 284L96 280Q150 314 204 280L226 284L236 350H64Z" fill="url(#bk)" ${st3(3.6)}/><path d="M96 280Q150 314 204 280" fill="none" stroke="${bo}" stroke-width="3.5"/><text x="150" y="328" text-anchor="middle" font-size="14" font-weight="900" letter-spacing="1" fill="${bo}" font-family="Impact,Arial Black,sans-serif">PUNKSHIT</text></g>`;
  }
  if (O === "Dress Tartan") {
    h += `<g clip-path="url(#cp)"><path d="M48 286Q150 312 252 286L268 350H32Z" fill="url(#pl)" ${st3(3.6)}/><path d="M108 288L150 310L192 288L178 278L150 296L122 278Z" fill="#fff" ${st3(2.8)}/><path d="M150 302l-14-8v16zM150 302l14-8v16z" fill="#ff4fa3" ${st3(2.2)}/><circle cx="150" cy="302" r="4.5" fill="#ffd23f" ${st3(1.8)}/></g>`;
  }
  if (O === "Kaos Petir") {
    h += `<g clip-path="url(#cp)"><path d="M56 288Q150 316 244 288L252 350H48Z" fill="#f2f2f7" ${st3(3.6)}/><path d="M106 292Q150 320 194 292" fill="none" stroke="#1b1b24" stroke-width="6.5" stroke-linecap="round"/><polygon points="157,310 138,310 147,330 136,330 162,356 151,328 162,328" fill="${M}" ${st3(2.3)}/></g>`;
  }
  if (O === "Rompi Jeans") {
    h += `<g clip-path="url(#cp)"><path d="M44 282Q96 298 130 288L134 350H32Z" fill="#3a6ea8" ${st3(3.6)}/><path d="M256 282Q204 298 170 288L166 350H268Z" fill="#3a6ea8" ${st3(3.6)}/><path d="M122 290V346M178 290V346" stroke="#93c5fd" stroke-width="2" stroke-dasharray="4 3"/>${[[126, 308], [174, 308], [126, 330], [174, 330]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.8" fill="url(#st)" ${st3(1.4)}/>`).join("")}</g>`;
  }
  if (O === "Flanel") {
    h += `<g clip-path="url(#cp)"><path d="M48 286Q150 312 252 286L268 350H32Z" fill="url(#fl)" ${st3(3.6)}/><path d="M150 304V350" stroke="#1b1b22" stroke-width="3"/><path d="M106 290L150 322L194 290L150 302Z" fill="#b53d12" ${st3(2.8)}/><circle cx="150" cy="316" r="3" fill="#fff"/><circle cx="150" cy="332" r="3" fill="#fff"/></g>`;
  }
  if (O === "Tengkorak") {
    h += `<g clip-path="url(#cp)"><path d="M56 288Q150 316 244 288L252 350H48Z" fill="#181820" ${st3(3.6)}/><path d="M106 292Q150 320 194 292" fill="none" stroke="#363646" stroke-width="6" stroke-linecap="round"/><ellipse cx="150" cy="326" rx="16" ry="14" fill="#f4f1ea"/><rect x="142" y="336" width="16" height="9" rx="2.5" fill="#f4f1ea"/><circle cx="143" cy="325" r="4" fill="#181820"/><circle cx="157" cy="325" r="4" fill="#181820"/></g>`;
  }
  if (O === "Jersey") {
    h += `<g clip-path="url(#cp)"><path d="M56 288Q150 316 244 288L252 350H48Z" fill="#dc2f0c" ${st3(3.6)}/><path d="M106 292L150 318L194 292" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/><text x="150" y="346" text-anchor="middle" font-size="34" font-weight="900" fill="#fff" font-family="ui-rounded,Arial Black,sans-serif">07</text></g>`;
  }
  if (O === "Kaos Garis") {
    h += `<g clip-path="url(#cp)"><path d="M56 288Q150 316 244 288L252 350H48Z" fill="#f6f3ec" ${st3(3.6)}/><path d="M50 310H250M50 325H250M50 340H250" stroke="#2554b8" stroke-width="6"/><path d="M106 292Q150 320 194 292" fill="none" stroke="#2554b8" stroke-width="6.5" stroke-linecap="round"/></g>`;
  }

  // AKSESORIS LEHER & DADA (Digambar di atas kerah baju agar tidak ketelan baju)
  if (X.has("Rantai")) {
    h += `<path d="M96 290Q150 340 204 290" fill="none" stroke="${OL}" stroke-width="10" stroke-linecap="round"/><path d="M96 290Q150 340 204 290" fill="none" stroke="url(#gd)" stroke-width="6.5" stroke-linecap="round" stroke-dasharray="8 3"/>`;
  }
  if (X.has("Choker")) {
    h += `<path d="M98 288Q150 314 202 288" fill="none" stroke="#181820" stroke-width="8.5" stroke-linecap="round"/><circle cx="150" cy="303" r="6.5" fill="none" stroke="url(#st)" stroke-width="2.8"/>`;
  }
  if (X.has("Syal")) {
    h += `<path d="M174 304L188 342L166 338L160 306Z" fill="#b82208" ${st3(3)}/><path d="M84 286Q150 322 216 286L222 305Q150 344 78 305Z" fill="#e63912" ${st3(3.4)}/><path d="M92 296Q150 328 208 296" fill="none" stroke="#ffd23f" stroke-width="2.5" stroke-dasharray="5 5"/>`;
  }
  if (X.has("Pin Petir")) {
    h += `<g transform="translate(106 318)"><circle r="12.5" fill="#181820" ${st3(2.4)}/><polygon points="2,-8 -6,1 0,1 -3,8 6,-1 0,-1" fill="#ffd21f"/></g>`;
  }
  if (X.has("Stiker")) {
    h += [[196, 326, 1.05, "#39d0ff"], [104, 342, .8, "#ff5fb0"]].map(([x, y, k, c]) => `<polygon transform="translate(${x} ${y}) scale(${k})" points="0,-11 3.2,-3.4 11,-3.4 4.8,1.8 7,9.5 0,5 -7,9.5 -4.8,1.8 -11,-3.4 -3.2,-3.4" fill="${c}" ${st3(2)}/>`).join("");
  }

  // LENGAN + CUFF LENGAN BAJU + GITAR
  const sl = O === "Hoodie" ? "#9a74ee" : O === "Jaket Punk" ? "#2b2b36" : O === "Dress Tartan" ? "#f4f1ea" : O === "Kaos Petir" ? "#f2f2f7" : O === "Flanel" ? "#d94e1f" : O === "Tengkorak" ? "#181820" : O === "Jersey" ? "#dc2f0c" : O === "Kaos Garis" ? "#f6f3ec" : M;
  const hasSleeve = !["Polos", "Singlet", "Rompi Jeans"].includes(O);
  const base = st === 0;

  const arm = m => {
    const Xx = x => m ? 300 - x : x;
    let p, hx, hy;
    if (m && G) {
      p = "M236 266Q262 280 242 298";
      hx = 242;
      hy = 298;
    } else {
      p = `M${Xx(64)} 264Q${Xx(base ? 48 : 38)} ${base ? 278 : 288} ${Xx(base ? 50 : 42)} ${base ? 298 : 312}`;
      hx = Xx(base ? 50 : 42);
      hy = base ? 298 : 312;
    }
    return `<g class="arm" data-m="${m}" data-g="${m && G ? 1 : 0}">
      <path d="${p}" fill="none" stroke="${OL}" stroke-width="20" stroke-linecap="round"/>
      <path d="${p}" fill="none" stroke="${sl}" stroke-width="13.5" stroke-linecap="round"/>
      ${hasSleeve ? `<circle cx="${hx}" cy="${hy - 7}" r="8.5" fill="${sl}" ${st3(2.4)}/>` : ""}
      <circle cx="${hx}" cy="${hy}" r="9.5" fill="url(#bd)" ${st3(3.4)}/>
      ${X.has("Gelang") ? `<rect x="${hx - 9.5}" y="${hy - 15}" width="19" height="7" rx="3" fill="#181820" ${st3(2.2)}/><circle cx="${hx}" cy="${hy - 11.5}" r="2" fill="url(#st)"/>` : ""}
    </g>`;
  };

  const guitar = `<g transform="translate(222 336) rotate(24)">
    <rect x="-4.5" y="-122" width="9" height="96" fill="#4a3226" ${st3(2.8)}/>
    <path d="M-3 -110v82M0 -110v82M3 -110v82" stroke="#e5e7eb" stroke-width="1" opacity=".85"/>
    <rect x="-8.5" y="-138" width="17" height="20" rx="4" fill="#1e1e26" ${st3(2.8)}/>
    <path d="M0 -28C-30 -34 -35 -6 -22 6C-33 22 -22 52 0 50C22 52 33 22 22 6C35 -6 30 -34 0 -28Z" fill="url(#rd)" ${st3(3.4)}/>
    <circle cx="0" cy="6" r="10" fill="#2a0a10" ${st3(2)}/>
    <rect x="-10" y="26" width="20" height="5" rx="2" fill="#1e1e26"/>
  </g>`;

  h += arm(0) + (G ? guitar : "") + arm(1);

  // WAJAH: MATA, ALIS, PIPI, MASKER, MULUT
  const g = e === "Waiting" ? 9 : 0;
  const eye = (x, d) => e === "Wink" && d < 0
    ? `<path d="M166 222Q190 204 214 222" fill="none" ${st3(5.5)}/>`
    : `<g class="eye" data-x="${x}">
        <ellipse cx="${x}" cy="218" rx="28" ry="31" fill="#fff" ${st3(3.8)}/>
        <g class="pp">
          <circle cx="${x + d * 3.5 + g}" cy="221" r="21" fill="${mix(D, "#000000", .45)}"/>
          <circle cx="${x + d * 3.5 + g}" cy="221" r="18" fill="url(#ey)"/>
          <circle cx="${x + d * 3.5 + g}" cy="222" r="9" fill="#120508"/>
          <circle cx="${x + d * 3.5 + g + 6.5}" cy="212" r="7" fill="#fff"/>
          <circle cx="${x + d * 3.5 + g - 5.5}" cy="229" r="3.5" fill="#fff"/>
          ${e === "Love" ? `<path d="M${x + d * 3.5} 244C${x + d * 3.5 - 32} 221 ${x + d * 3.5 - 20} 195 ${x + d * 3.5} 212C${x + d * 3.5 + 20} 195 ${x + d * 3.5 + 32} 221 ${x + d * 3.5} 244Z" fill="#ff2f6e" ${st3(2.8)}/>` : ""}
        </g>
      </g>`;

  const brow = {
    Worried: ["M80 184L134 174", "M220 184L166 174"],
    Excited: ["M80 178Q108 162 136 176", "M220 178Q192 162 164 176"],
    Sleepy: ["M82 186Q108 180 134 190", "M218 186Q192 180 166 190"],
    Angry: ["M76 170L136 198", "M224 170L164 198"],
    Surprised: ["M84 168Q108 154 134 166", "M216 168Q192 154 166 166"],
    Love: ["M84 184Q108 173 134 182", "M216 184Q192 173 166 182"]
  }[e] || (st === 0 ? ["M84 182Q108 171 134 182", "M216 182Q192 171 166 182"] : ["M80 178L136 194", "M164 190Q190 170 220 180"]);

  // Rona pipi dasar
  h += `<ellipse cx="88" cy="254" rx="15" ry="9.5" fill="url(#ck)"/><ellipse cx="212" cy="254" rx="15" ry="9.5" fill="url(#ck)"/>`;

  // Mata & Alis (Jika Kacamata aktif, alis di bawah lensa + lensa punya frame & kilau)
  if (S.face === "Kacamata") {
    h += `<path d="${brow[0]}M${brow[1].slice(1)}" fill="none" ${st3(8.5)}/>`;
    h += `<g>
      <path d="M74 212L58 205M226 212L242 205" fill="none" ${st3(4.5)}/>
      <rect x="74" y="188" width="66" height="54" rx="22" fill="#12121a" ${st3(4)}/>
      <rect x="160" y="188" width="66" height="54" rx="22" fill="#12121a" ${st3(4)}/>
      <path d="M140 210Q150 204 160 210" fill="none" ${st3(5)}/>
      <path d="M88 198L104 232M102 198L114 224M174 198L190 232M188 198L200 224" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity=".25"/>
    </g>`;
  } else {
    if (e === "Sleepy") {
      h += `<path d="M82 220Q108 240 134 220M166 220Q192 240 218 220" fill="none" ${st3(5.5)}/>`;
    } else {
      h += (st === 0 ? `<g transform="translate(150 222) scale(1.08) translate(-150 -222)">${eye(108, 1) + eye(192, -1)}</g>` : eye(108, 1) + eye(192, -1));
    }
    if (S.face === "Bulu Mata" && e !== "Sleepy") {
      h += `<path d="M83 203q-9-2-14-11M87 195q-7-5-9-14M94 190q-4-7-4-13M217 203q9-2 14-11M213 195q7-5 9-14M206 190q4-7 4-13" fill="none" ${st3(4)}/>`;
    }
    h += `<path d="${brow[0]}M${brow[1].slice(1)}" fill="none" ${st3(9)}/>`;
  }

  // Mulut / Masker / Bandana (dengan tali & lipatan agar menyatu ke kepala)
  if (S.face === "Bandana") {
    h += `<path d="M62 246L84 256M238 246L216 256" stroke="#7a0d1d" stroke-width="4" stroke-linecap="round"/>`;
    h += `<path d="M82 252Q150 278 218 252L210 296Q150 326 90 296Z" fill="url(#rd)" ${st3(3.4)}/>`;
    h += `<path d="M98 268Q150 288 202 268M106 282Q150 300 194 282" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-dasharray="4 6" opacity=".55"/>`;
  } else if (S.face === "Masker") {
    h += `<path d="M60 244L88 252M64 274L92 282M240 244L212 252M236 274L208 282" stroke="#d1d5db" stroke-width="3" stroke-linecap="round"/>`;
    h += `<path d="M88 248Q150 238 212 248L206 296Q150 320 94 296Z" fill="#1c1c26" ${st3(3.4)}/>`;
    h += `<path d="M150 244V308M104 266Q150 274 196 266M106 282Q150 290 194 282" fill="none" stroke="#3f3f52" stroke-width="2.2" stroke-linecap="round"/>`;
  } else {
    h += mouth(e, st);
  }

  // Detail Wajah Opsional (Tanpa plester hardcode yang nabrak!)
  if (S.face === "Kumis") {
    h += `<path d="M150 258C138 247 114 249 106 264C121 262 136 264 150 264C164 264 179 262 194 264C186 249 162 247 150 258Z" fill="#181820" ${st3(2.4)}/>`;
  }
  if (S.face === "Bintik") {
    h += [[92, 245], [103, 252], [85, 258], [208, 245], [197, 252], [215, 258]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.4" fill="#7a3a1a" opacity=".78"/>`).join("");
  }
  if (S.face === "Pipi Merah") {
    h += `<ellipse cx="86" cy="254" rx="16" ry="10" fill="#ff2f6e" opacity=".62"/><ellipse cx="214" cy="254" rx="16" ry="10" fill="#ff2f6e" opacity=".62"/><path d="M80 256l6-6M88 258l6-6M208 256l6-6M216 258l6-6" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".6"/>`;
  }
  if (S.face === "Parut Petir") {
    h += `<polygon points="86,168 99,168 92,184 102,184 84,206 88,191 79,191" fill="#ff5a4a" ${st3(1.8)}/>`;
  }

  // Air mata / keringat reaksi
  if (e === "Crying") {
    h += `<path class="tear" d="M86 248q-7 15 0 22q7-7 0-22z" fill="#6fd2ff" ${st3(1.5)}/><path class="tear" style="animation-delay:.5s" d="M214 248q-7 15 0 22q7-7 0-22z" fill="#6fd2ff" ${st3(1.5)}/>`;
  }
  if (e === "Worried") {
    h += `<path class="tear" style="animation-duration:1.8s" d="M230 132q-9 16 0 22q9-6 0-22z" fill="#6fd2ff" ${st3(1.5)}/>`;
  }

  // Peniti di tepi pipi/badan
  if (X.has("Peniti")) {
    h += `<g transform="translate(56 236) rotate(-18)"><rect x="-4" y="-11" width="8" height="22" rx="4" fill="none" stroke="#e5e7eb" stroke-width="3"/><circle cx="0" cy="8" r="3" fill="#9ca3af"/></g>`;
  }

  // AKSESORIS KEPALA dengan Contact Shadow & Volume
  const bolt = (x, y, k, r) => `<polygon points="0,0 20,0 12,26 28,26 -4,66 4,34 -10,34" transform="translate(${x} ${y}) rotate(${r}) scale(${k})" fill="url(#bg2)" ${st3(2.8)}/>`;

  if (H === "Beanie") {
    h += `<path d="M62 146Q150 176 238 146" fill="none" stroke="#000" stroke-width="8" stroke-linecap="round" opacity=".28"/>`;
    h += `<path d="M64 134C58 58 118 36 162 40C212 45 242 90 236 134Z" fill="url(#bk)" ${st3(3.8)}/>`;
    h += `<path d="M112 46Q102 88 104 128M154 41Q150 86 150 130M194 48Q198 88 196 128" fill="none" stroke="#4b4b5e" stroke-width="2" opacity=".65"/>`;
    h += `<path d="M60 126Q150 156 240 126L240 148Q150 178 60 148Z" fill="#2d2d3a" ${st3(3.8)}/>`;
    h += `<rect x="182" y="133" width="24" height="13" rx="3" fill="${bo}" ${st3(2)}/>`;
  }
  if (H === "Snapback") {
    h += `<path d="M64 144Q150 170 236 144" fill="none" stroke="#000" stroke-width="8" stroke-linecap="round" opacity=".28"/>`;
    h += `<path d="M68 138C64 64 118 44 158 46C210 50 238 92 232 138Z" fill="url(#rd)" ${st3(3.8)}/>`;
    h += `<circle cx="150" cy="45" r="5" fill="#7a0d1d" ${st3(2)}/>`;
    h += `<path d="M60 136Q150 162 240 136Q284 144 286 160Q218 172 150 158Q96 156 60 136Z" fill="#7a0d1d" ${st3(3.8)}/>`;
  }
  if (H === "Ikat Kepala") {
    h += `<path d="M58 144Q150 174 242 144" fill="none" stroke="#000" stroke-width="7" stroke-linecap="round" opacity=".25"/>`;
    h += `<path d="M58 124Q150 154 242 124L242 146Q150 176 58 146Z" fill="url(#rd)" ${st3(3.8)}/>`;
    h += `<path d="M58 135Q150 165 242 135" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="6 6" opacity=".65"/>`;
  }
  if (H === "Jambul Petir") {
    h += bolt(124, -10, .88, -12) + bolt(188, -16, .98, 10) + bolt(156, 4, .7, 0);
  }
  if (H === "Pita Besar") {
    h += `<g transform="translate(108 106) rotate(-18)"><path d="M0 0C-24-24-42-8-36 13C-28 26-10 15 0 0Z" fill="#ff5fb0" ${st3(3.4)}/><path d="M0 0C24-24 42-8 36 13C28 26 10 15 0 0Z" fill="#ff5fb0" ${st3(3.4)}/><circle r="7.5" fill="#d92682" ${st3(2.8)}/></g>`;
  }
  if (H === "Bucket") {
    h += `<path d="M54 144Q150 170 246 144" fill="none" stroke="#000" stroke-width="8" stroke-linecap="round" opacity=".28"/>`;
    h += `<path d="M66 134C60 76 100 58 150 58C200 58 240 76 234 134Z" fill="#decb92" ${st3(3.8)}/>`;
    h += `<path d="M52 134Q150 112 248 134Q248 158 150 162Q52 158 52 134Z" fill="#bfa96e" ${st3(3.8)}/>`;
    h += `<path d="M64 126Q150 144 236 126" fill="none" stroke="#8c7642" stroke-width="3"/>`;
  }
  if (H === "Mohawk") {
    h += `<path d="M106 116L116 28L134 80L150 10L166 80L184 28L194 116Z" fill="#ff3d78" ${st3(3.8)}/>`;
    h += `<path d="M122 114L130 56L142 94L150 38L158 94L170 56L178 114Z" fill="#ff85ab" opacity=".65"/>`;
  }
  if (H === "Telinga Kucing") {
    h += `<g>
      <path d="M82 126L68 52L126 98Z" fill="url(#bd)" ${st3(3.8)}/>
      <path d="M87 116L77 67L116 98Z" fill="#ff85b3"/>
      <path d="M218 126L232 52L174 98Z" fill="url(#bd)" ${st3(3.8)}/>
      <path d="M213 116L223 67L184 98Z" fill="#ff85b3"/>
    </g>`;
  }
  if (H === "Mahkota") {
    h += `<g transform="translate(0 28)">
      <ellipse cx="150" cy="100" rx="50" ry="8" fill="#000" opacity=".28"/>
      <path d="M102 92L110 38L130 64L150 26L170 64L190 38L198 92Z" fill="url(#gd)" ${st3(3.6)}/>
      <rect x="100" y="86" width="100" height="14" rx="5" fill="url(#gd)" ${st3(3.4)}/>
      <circle cx="150" cy="93" r="4" fill="#ef4444"/>
      <circle cx="122" cy="93" r="3" fill="#38bdf8"/>
      <circle cx="178" cy="93" r="3" fill="#38bdf8"/>
    </g>`;
  }
  if (H === "Headphone") {
    h += `<path d="M60 198C52 54 248 54 240 198" fill="none" stroke="#181820" stroke-width="13" stroke-linecap="round"/>`;
    h += `<path d="M98 76Q150 62 202 76" fill="none" stroke="#4b4b5e" stroke-width="5" stroke-linecap="round"/>`;
    h += `<rect x="42" y="184" width="26" height="54" rx="13" fill="#272733" ${st3(3.6)}/><rect x="62" y="190" width="7" height="42" rx="3.5" fill="#4b4b5e"/>`;
    h += `<rect x="232" y="184" width="26" height="54" rx="13" fill="#272733" ${st3(3.6)}/><rect x="231" y="190" width="7" height="42" rx="3.5" fill="#4b4b5e"/>`;
  }

  // Simbol Reaksi Melayang
  if (e === "Love") {
    h += [[220, 120, 0], [238, 100, .8], [200, 98, 1.6]].map(([x, y, d]) => `<text class="zz" style="animation-delay:${d}s" x="${x}" y="${y}" font-size="22" fill="#ff3d78">♥</text>`).join("");
  }
  if (e === "Angry") h += `<text class="zz" x="226" y="120" font-size="30">💢</text>`;
  if (e === "Surprised") h += `<text class="zz" x="226" y="124" font-size="38" font-weight="900" fill="#fff" ${st3(1.5)}>!</text>`;
  if (e === "Sleepy") h += `<text class="zz" x="226" y="126" font-size="30" font-weight="900" fill="#fff">Z</text>`;
  if (e === "Waiting") {
    h += [0, .25, .5].map((d, i) => `<circle class="dt" style="animation-delay:${d}s" cx="${222 + i * 16}" cy="130" r="5" fill="#fff"/>`).join("");
  }
  if (e === "Celebrating") {
    h += [[40, 70, "#ff3b6b"], [256, 60, "#39d0ff"], [90, 18, "#ffd21f"], [220, 10, "#7dea2b"]].map(([x, y, k], i) => `<g class="cf" style="animation-delay:${i * .35}s"><rect x="${x}" y="${y}" width="10" height="10" rx="3" fill="${k}"/></g>`).join("");
  }

  h += `</g></g>`;

  if (st >= 3 || e === "Excited" || e === "Wink") {
    h += [[30, 60], [266, 130], [44, 280], [250, 24]].map(([x, y], i) => `<path class="sp" style="animation-delay:${i * .4}s" d="M${x} ${y - 11}Q${x} ${y} ${x + 11} ${y}Q${x} ${y} ${x} ${y + 11}Q${x} ${y} ${x - 11} ${y}Q${x} ${y} ${x} ${y - 11}Z" fill="#fff" ${st3(1.5)}/>`).join("");
  }
  h += `</g>`;
  return { html: h, st };
}

const PV_CACHE = {};
let pvn = 0;

export function getPreviewSVG(S, lv, k, v) {
  const ck = k + ":" + v;
  if (PV_CACHE[ck]) return PV_CACHE[ck];
  const clone = { ...S, extra: new Set(S.extra) };
  if (k === "extra") clone.extra.add(v);
  else clone[k] = v;
  if (k !== "emo") clone.emo = "Happy";
  const c = CRt, sp = SPD;
  let h;
  try {
    h = renderPetSVG(clone, lv).html;
  } finally {
    CRt = c;
    SPD = sp;
  }
  const p = "t" + (pvn++) + "_";
  return PV_CACHE[ck] = h.replace(/(id="|url\(#)(\w+)/g, `$1${p}$2`);
}

export { VB };
