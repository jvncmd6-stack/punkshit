import { OL, TH, SC, LG, VB } from "./config.js";

export const mix = (h, m, t) => {
  const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)), A = p(h), B = p(m);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
};

export let CR = 1, CRt = 1, SPD = 1;
export const setCR = v => { CR = v; };
export const setSPD = v => { SPD = v; };

const Y = v => v < 150 ? 150 - (150 - v) * CR : v;

// Siluet api luar yang organik
export const bodyD = (t = 0) => {
  const a = Math.sin(t * 2.1) * 4;
  const b = Math.sin(t * 2.6 + 1.1) * 5;
  const c = Math.sin(t * 2.3 + 2.2) * 5;
  const d = Math.sin(t * 2.9 + 3.1) * 4;
  const y = Math.sin(t * 3.2) * 2.5;
  return `M150 334C88 334 54 294 56 238C58 198 76 176 80 148C80 ${Y(130)} ${66 + a * 0.45} ${Y(114)} ${72 + a} ${Y(90 + y)}C${90 + a * 0.5} ${Y(102)} 100 ${Y(114)} 106 ${Y(125)}C104 ${Y(96)} ${116 + b * 0.45} ${Y(62)} ${134 + b} ${Y(38 - y)}C${142 + b * 0.45} ${Y(64)} 145 ${Y(80)} 150 ${Y(94)}C${160 + c * 0.4} ${Y(64)} ${178 + c * 0.5} ${Y(46)} ${196 + c} ${Y(34 + y)}C${194 + c * 0.45} ${Y(62)} 198 ${Y(82)} 203 ${Y(98)}C214 ${Y(80)} ${228 + d * 0.45} ${Y(72)} ${240 + d} ${Y(76 - y)}C${235 + d * 0.45} ${Y(96)} 234 ${Y(112)} 232 ${Y(128)}C246 154 246 194 244 238C246 294 212 334 150 334Z`;
};

// Siluet inti api dalam (bergerak beda fase)
export const coreD = (t = 0) => {
  const f1 = Math.sin(t * 2.8 + 0.8) * 3.5;
  const f2 = Math.cos(t * 3.1 + 1.7) * 4;
  const f3 = Math.sin(t * 2.5 + 2.9) * 3.5;
  const wy = Math.cos(t * 3.4) * 2.5;
  return `M150 322C104 322 80 288 82 244C84 210 102 190 ${116 + f1 * 0.5} ${Y(164 + wy)}C${124 + f1 * 0.4} ${Y(182)} 132 ${Y(188)} ${138 + f2 * 0.5} ${Y(166 - wy)}C${146 + f2 * 0.4} ${Y(140)} ${156 + f2 * 0.7} ${Y(122)} ${166 + f2} ${Y(106 + wy)}C${166 + f2 * 0.4} ${Y(134)} 172 ${Y(152)} ${182 + f3 * 0.5} ${Y(164)}C${192 + f3 * 0.5} ${Y(150)} ${202 + f3 * 0.7} ${Y(146)} ${208 + f3} ${Y(152 - wy)}C204 176 216 204 218 244C220 288 196 322 150 322Z`;
};

const BODY = bodyD(0);
const CORE = coreD(0);
const st3 = (w = 3.6) => `stroke="${OL}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

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
  const coreLight = mix(L, "#ffffff", 0.58);
  const rimCol = mix(L, "#ffffff", 0.38);

  let h = `<defs>
  <linearGradient id="bd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${L}"/><stop offset=".52" stop-color="${M}"/><stop offset="1" stop-color="${D}"/></linearGradient>
  <linearGradient id="core" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${coreLight}" stop-opacity=".95"/><stop offset=".65" stop-color="${L}" stop-opacity=".55"/><stop offset="1" stop-color="${M}" stop-opacity="0"/></linearGradient>
  <radialGradient id="sh" cx=".5" cy=".46" r=".6"><stop offset=".65" stop-color="${D}" stop-opacity="0"/><stop offset="1" stop-color="${mix(D, "#000000", .55)}" stop-opacity=".48"/></radialGradient>
  <radialGradient id="ey" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="${mix(M, "#000000", .18)}"/><stop offset="1" stop-color="${mix(D, "#000000", .68)}"/></radialGradient>
  <radialGradient id="st" cx=".3" cy=".25" r=".85"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#c4c9d4"/><stop offset="1" stop-color="#5a606e"/></radialGradient>
  <linearGradient id="bk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#454756"/><stop offset=".45" stop-color="#22232c"/><stop offset="1" stop-color="#111217"/></linearGradient>
  <linearGradient id="hd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b497ff"/><stop offset=".55" stop-color="#7c4dff"/><stop offset="1" stop-color="#4e26b8"/></linearGradient>
  <linearGradient id="dn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5a94d6"/><stop offset=".5" stop-color="#3568a8"/><stop offset="1" stop-color="#1e406e"/></linearGradient>
  <linearGradient id="gd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff8cc"/><stop offset=".45" stop-color="#ffd23f"/><stop offset="1" stop-color="#b57400"/></linearGradient>
  <linearGradient id="rd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6b5b"/><stop offset=".55" stop-color="#d62235"/><stop offset="1" stop-color="#870a1b"/></linearGradient>
  <linearGradient id="bg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="${bo}"/></linearGradient>
  <radialGradient id="au"><stop offset=".3" stop-color="${bo}" stop-opacity=".45"/><stop offset="1" stop-color="${bo}" stop-opacity="0"/></radialGradient>
  <radialGradient id="hl"><stop offset="0" stop-color="#fff" stop-opacity=".72"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <radialGradient id="ck"><stop offset="0" stop-color="#ff3d78" stop-opacity=".52"/><stop offset="1" stop-color="#ff3d78" stop-opacity="0"/></radialGradient>
  <pattern id="fl" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="#d94e1f"/><rect y="6" width="18" height="5" fill="#181820" opacity=".52"/><rect x="6" width="5" height="18" fill="#181820" opacity=".52"/><rect y="2" width="18" height="1.5" fill="#ffd27d" opacity=".35"/></pattern>
  <pattern id="pl" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#a81024"/><rect y="6" width="16" height="4" fill="#181820" opacity=".78"/><rect x="6" width="4" height="16" fill="#181820" opacity=".78"/><rect y="12" width="16" height="1.2" fill="#facc15" opacity=".65"/><rect x="12" width="1.2" height="16" fill="#facc15" opacity=".65"/></pattern>
  <clipPath id="cp"><path class="bp" d="${BODY}"/></clipPath>
  </defs>`;

  // Bayangan & pantulan cahaya lantai dinamis
  h += `<g class="gsh" data-s="${s}">
    <ellipse cx="150" cy="356" rx="${114 * s}" ry="14" fill="${M}" opacity=".24"/>
    <ellipse cx="150" cy="356" rx="${104 * s}" ry="11.5" fill="#000" opacity=".52"/>
    <ellipse cx="150" cy="356" rx="${104 * s}" ry="11.5" fill="none" stroke="${M}" stroke-width="2.4" opacity=".8"/>
  </g>`;

  CRt = [.52, .76, 1, 1.16, 1.28][st] * ({ Worried: .62, Crying: .58, Sleepy: .72, Excited: 1.12, Celebrating: 1.15, Angry: 1.28, Surprised: 1.18, Love: 1.05 }[e] || 1);
  SPD = { Excited: 2.2, Celebrating: 2.5, Worried: 3.1, Sleepy: .5, Dancing: 1.8 }[e] || 1;

  if (st >= 3) h += `<circle class="aura" cx="150" cy="204" r="${st === 4 ? 170 : 144}" fill="url(#au)"/>`;
  if (st === 4) {
    h += `<g class="orb">${[0, 120, 240].map(a => `<g transform="rotate(${a} 150 200)"><polygon points="0,0 14,0 8,18 20,18 -3,46 3,24 -7,24" transform="translate(143 24)" fill="url(#bg2)" ${st3(2.4)}/></g>`).join("")}</g>`;
  }
  if (S.bolts) {
    h += [["28,94 52,94 42,126 64,126 26,180 35,142 16,142", 0], ["262,54 286,54 276,86 296,86 258,138 266,102 248,102", .9]]
      .map(([p, d]) => `<polygon class="bolt" style="animation-delay:${d}s" points="${p}" fill="url(#bg2)" ${st3(2.8)}/>`).join("");
  }

  h += `<g transform="translate(150 350) scale(${s}) translate(-150 -350)"><g transform="translate(0 ${-Ls})"><g class="pet">`;

  // Kaki & Sepatu dengan sol & highlight
  const leg = (x, idx) => {
    const sx = x + (x < 150 ? -7 : 7);
    const sy = 341 + Ls;
    return `<g class="leg" data-i="${idx}">
      <path d="M${x} 320L${x - 1} ${338 + Ls}" stroke="${OL}" stroke-width="18" stroke-linecap="round"/>
      <path d="M${x} 320L${x - 1} ${338 + Ls}" stroke="${D}" stroke-width="11" stroke-linecap="round"/>
      <ellipse cx="${sx}" cy="${sy}" rx="20" ry="9.5" fill="url(#bd)" ${st3(3.4)}/>
      <path d="M${sx - 15} ${sy + 3}Q${sx} ${sy + 7} ${sx + 15} ${sy + 3}" fill="none" stroke="${OL}" stroke-width="2.5" stroke-linecap="round"/>
      <ellipse cx="${sx - 3}" cy="${sy - 3}" rx="8" ry="2.5" fill="#fff" opacity=".32"/>
    </g>`;
  };
  h += leg(124, 0) + leg(176, 1);

  // Badan Api + Inner Core 3D + Rim Highlight
  h += `<path class="bp" d="${BODY}" fill="url(#bd)" ${st3(4.6)}/>`;
  h += `<path class="bp" d="${BODY}" fill="url(#sh)"/>`;
  h += `<path class="cp" d="${CORE}" fill="url(#core)"/>`;
  h += `<ellipse cx="96" cy="182" rx="9" ry="26" transform="rotate(-14 96 182)" fill="url(#hl)"/>`;
  h += `<path d="M234 178Q242 214 236 254" fill="none" stroke="${rimCol}" stroke-width="3.5" stroke-linecap="round" opacity=".58"/>`;

  // Tanda petir kecil di dahi
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
    h += `<path d="M60 282Q150 315 240 282" fill="none" stroke="#000" stroke-width="9" stroke-linecap="round" opacity=".26"/>`;
  }

  // KOSTUM / BAJU REALISTIS (Jahitan, Kerah, Kancing, Ritsleting, Lipatan Kain)
  if (O === "Hoodie") {
    h += `<g clip-path="url(#cp)">
      <path d="M44 282Q150 314 256 282L268 350H32Z" fill="url(#hd)" ${st3(3.6)}/>
      <path d="M84 285Q150 326 216 285Q198 318 150 320Q102 318 84 285Z" fill="#4c25b5" ${st3(3)}/>
      <path d="M98 292Q150 322 202 292" fill="none" stroke="#c8b6ff" stroke-width="1.8" opacity=".5"/>
      <path d="M132 308C130 318 131 326 132 334M168 308C170 318 169 326 168 334" fill="none" stroke="#f3ebff" stroke-width="2.6" stroke-linecap="round"/>
      <rect x="129.5" y="331" width="5" height="6" rx="1.5" fill="#d8b4fe"/>
      <rect x="165.5" y="331" width="5" height="6" rx="1.5" fill="#d8b4fe"/>
      <path d="M100 328Q150 320 200 328L208 348H92Z" fill="#3a1994" ${st3(2.4)}/>
      <path d="M102 330L96 346M198 330L204 346" stroke="#c8b6ff" stroke-width="1.5" stroke-dasharray="3 3" opacity=".6"/>
    </g>`;
  }
  if (O === "Jaket Punk") {
    h += `<g clip-path="url(#cp)">
      <path d="M44 278Q150 306 256 278L268 350H32Z" fill="url(#bk)" ${st3(3.6)}/>
      <path d="M114 292L150 344L186 292Z" fill="#18181f"/>
      <path d="M150 312V348" stroke="#9ca3af" stroke-width="3.2" stroke-dasharray="3.5 2.5"/>
      <rect x="146" y="316" width="8" height="10" rx="2" fill="url(#st)" ${st3(1.4)}/>
      <path d="M88 283L136 334L108 346L78 304Z" fill="#363847" ${st3(3)}/>
      <path d="M212 283L164 334L192 346L222 304Z" fill="#363847" ${st3(3)}/>
      <path d="M92 288L128 328M208 288L172 328" stroke="#6b7280" stroke-width="1.5" stroke-dasharray="3 3" opacity=".7"/>
      ${[[94, 300], [105, 316], [206, 300], [195, 316]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.2" fill="url(#st)" ${st3(1.5)}/><circle cx="${x - 1}" cy="${y - 1}" r="1.2" fill="#fff"/>`).join("")}
    </g>`;
  }
  if (O === "Singlet") {
    h += `<g clip-path="url(#cp)">
      <path d="M72 284L96 279Q150 314 204 279L228 284L238 350H62Z" fill="url(#bk)" ${st3(3.6)}/>
      <path d="M96 279Q150 314 204 279" fill="none" stroke="${bo}" stroke-width="4.2" stroke-linecap="round"/>
      <path d="M74 285L66 346M226 285L234 346" fill="none" stroke="#4b5563" stroke-width="2" stroke-dasharray="3 3"/>
      <text x="150" y="328" text-anchor="middle" font-size="14" font-weight="900" letter-spacing="1.2" fill="${bo}" font-family="Impact,Arial Black,sans-serif">PUNKSHIT</text>
    </g>`;
  }
  if (O === "Dress Tartan") {
    h += `<g clip-path="url(#cp)">
      <path d="M48 286Q150 312 252 286L268 350H32Z" fill="url(#pl)" ${st3(3.6)}/>
      <path d="M116 312L110 348M150 314V348M184 312L190 348" stroke="#000" stroke-width="3" opacity=".32"/>
      <path d="M106 287L150 311L194 287L180 276L150 295L120 276Z" fill="#f8fafc" ${st3(2.8)}/>
      <path d="M112 288L150 307L188 288" fill="none" stroke="#cbd5e1" stroke-width="1.5"/>
      <path d="M150 302l-15-8.5v17zM150 302l15-8.5v17z" fill="#ff3d8b" ${st3(2.2)}/><circle cx="150" cy="302" r="4.8" fill="#ffd23f" ${st3(1.8)}/>
    </g>`;
  }
  if (O === "Kaos Petir") {
    h += `<g clip-path="url(#cp)">
      <path d="M56 288Q150 316 244 288L252 350H48Z" fill="#f2f2f7" ${st3(3.6)}/>
      <path d="M106 292Q150 320 194 292" fill="none" stroke="#1b1b24" stroke-width="7" stroke-linecap="round"/>
      <path d="M62 294Q82 316 74 344M238 294Q218 316 226 344" fill="none" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round"/>
      <polygon points="157,308 138,308 147,328 136,328 162,354 151,326 162,326" fill="${M}" ${st3(2.3)}/>
    </g>`;
  }
  if (O === "Rompi Jeans") {
    h += `<g clip-path="url(#cp)">
      <path d="M44 282Q96 298 130 288L134 350H32Z" fill="url(#dn)" ${st3(3.6)}/>
      <path d="M256 282Q204 298 170 288L166 350H268Z" fill="url(#dn)" ${st3(3.6)}/>
      <path d="M84 316H118V336H84Z" fill="#274e82" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="3 2"/>
      <path d="M182 316H216V336H182Z" fill="#274e82" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="3 2"/>
      <path d="M122 290V346M178 290V346" stroke="#f59e0b" stroke-width="1.8" stroke-dasharray="3.5 2.5"/>
      ${[[126, 306], [174, 306], [126, 328], [174, 328]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="url(#st)" ${st3(1.5)}/>`).join("")}
    </g>`;
  }
  if (O === "Flanel") {
    h += `<g clip-path="url(#cp)">
      <path d="M48 286Q150 312 252 286L268 350H32Z" fill="url(#fl)" ${st3(3.6)}/>
      <rect x="143" y="302" width="14" height="48" fill="#b83b12" stroke="#1b1b22" stroke-width="2.2"/>
      <path d="M104 289L150 320L196 289L184 278L150 298L116 278Z" fill="#c2410c" ${st3(2.8)}/>
      <circle cx="150" cy="314" r="3.2" fill="#f8fafc" ${st3(1.2)}/><circle cx="150" cy="330" r="3.2" fill="#f8fafc" ${st3(1.2)}/>
    </g>`;
  }
  if (O === "Tengkorak") {
    h += `<g clip-path="url(#cp)">
      <path d="M56 288Q150 316 244 288L252 350H48Z" fill="#181820" ${st3(3.6)}/>
      <path d="M106 292Q150 320 194 292" fill="none" stroke="#363646" stroke-width="6.5" stroke-linecap="round"/>
      <ellipse cx="150" cy="324" rx="16" ry="13.5" fill="#f4f1ea"/>
      <rect x="141" y="334" width="18" height="9" rx="2.5" fill="#f4f1ea"/>
      <path d="M146 336v7M150 336v7M154 336v7" stroke="#181820" stroke-width="1.6"/>
      <circle cx="143" cy="323" r="4.2" fill="#181820"/><circle cx="157" cy="323" r="4.2" fill="#181820"/>
      <polygon points="150,327 148,331 152,331" fill="#181820"/>
    </g>`;
  }
  if (O === "Jersey") {
    h += `<g clip-path="url(#cp)">
      <path d="M56 288Q150 316 244 288L252 350H48Z" fill="#dc2f0c" ${st3(3.6)}/>
      <path d="M104 291L150 320L196 291" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round"/>
      <path d="M104 291L150 320L196 291" fill="none" stroke="#181820" stroke-width="2" stroke-linecap="round"/>
      <text x="150" y="346" text-anchor="middle" font-size="33" font-weight="900" fill="#fff" stroke="#181820" stroke-width="1.5" font-family="ui-rounded,Arial Black,sans-serif">07</text>
    </g>`;
  }
  if (O === "Kaos Garis") {
    h += `<g clip-path="url(#cp)">
      <path d="M56 288Q150 316 244 288L252 350H48Z" fill="#f6f3ec" ${st3(3.6)}/>
      <path d="M50 309H250M50 324H250M50 339H250" stroke="#1d4ed8" stroke-width="6"/>
      <path d="M106 292Q150 320 194 292" fill="none" stroke="#1d4ed8" stroke-width="7" stroke-linecap="round"/>
    </g>`;
  }

  // GEAR LEHER & DADA (Tali rantai berulir, Choker ring metal, Syal berlipat)
  if (X.has("Rantai")) {
    h += `<path d="M96 290Q150 342 204 290" fill="none" stroke="${OL}" stroke-width="10.5" stroke-linecap="round"/>
      <path d="M96 290Q150 342 204 290" fill="none" stroke="url(#gd)" stroke-width="6.5" stroke-linecap="round" stroke-dasharray="7 3.5"/>
      <path d="M98 289Q150 339 202 289" fill="none" stroke="#fff8cc" stroke-width="1.8" stroke-linecap="round" stroke-dasharray="3 7.5"/>`;
  }
  if (X.has("Choker")) {
    h += `<path d="M98 288Q150 314 202 288" fill="none" stroke="#181820" stroke-width="9" stroke-linecap="round"/>
      <path d="M102 287Q150 311 198 287" fill="none" stroke="#4b5563" stroke-width="1.6" stroke-linecap="round"/>
      <circle cx="150" cy="303" r="7" fill="none" stroke="${OL}" stroke-width="4.5"/>
      <circle cx="150" cy="303" r="7" fill="none" stroke="url(#st)" stroke-width="2.6"/>`;
  }
  if (X.has("Syal")) {
    h += `<path d="M174 304L190 344L165 339L160 306Z" fill="#a81d05" ${st3(3)}/>
      <path d="M170 340L168 348M178 342L177 350M186 343L186 351" stroke="#ffd23f" stroke-width="2" stroke-linecap="round"/>
      <path d="M84 286Q150 322 216 286L222 305Q150 344 78 305Z" fill="#e63912" ${st3(3.4)}/>
      <path d="M92 296Q150 328 208 296" fill="none" stroke="#ffd23f" stroke-width="2.4" stroke-dasharray="5 5"/>
      <rect x="160" y="294" width="18" height="16" rx="6" fill="#c92a0a" ${st3(2.8)}/>`;
  }
  if (X.has("Pin Petir")) {
    h += `<g transform="translate(106 318)">
      <circle r="13" fill="url(#st)" ${st3(2.4)}/>
      <circle r="10.2" fill="#181820"/>
      <polygon points="2,-7.5 -5.5,1 0,1 -2.5,7.5 5.5,-1 0,-1" fill="#ffd21f"/>
    </g>`;
  }
  if (X.has("Stiker")) {
    h += [[196, 326, 1.05, "#39d0ff"], [104, 342, .8, "#ff5fb0"]].map(([x, y, k, c]) => `<g transform="translate(${x} ${y}) scale(${k})">
      <polygon points="0,-12 3.5,-3.8 12,-3.8 5.2,2 7.6,10.5 0,5.5 -7.6,10.5 -5.2,2 -12,-3.8 -3.5,-3.8" fill="#fff" ${st3(2.2)}/>
      <polygon points="0,-9 2.6,-2.8 9,-2.8 3.9,1.5 5.7,7.8 0,4.1 -5.7,7.8 -3.9,1.5 -9,-2.8 -2.6,-2.8" fill="${c}"/>
    </g>`).join("");
  }

  // LENGAN + CUFF + GITAR KONTOUR
  const sl = O === "Hoodie" ? "#8b5cf6" : O === "Jaket Punk" ? "#262730" : O === "Dress Tartan" ? "#f4f1ea" : O === "Kaos Petir" ? "#f2f2f7" : O === "Flanel" ? "#d94e1f" : O === "Tengkorak" ? "#181820" : O === "Jersey" ? "#dc2f0c" : O === "Kaos Garis" ? "#f6f3ec" : M;
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
      ${hasSleeve ? `<ellipse cx="${hx}" cy="${hy - 7}" rx="9.5" ry="5" fill="${sl}" ${st3(2.4)}/>` : ""}
      <circle cx="${hx}" cy="${hy}" r="9.5" fill="url(#bd)" ${st3(3.4)}/>
      ${X.has("Gelang") ? `<rect x="${hx - 9.5}" y="${hy - 15}" width="19" height="7.5" rx="3" fill="#181820" ${st3(2.2)}/><circle cx="${hx - 4}" cy="${hy - 11.2}" r="1.8" fill="url(#st)"/><circle cx="${hx + 4}" cy="${hy - 11.2}" r="1.8" fill="url(#st)"/>` : ""}
    </g>`;
  };

  const guitar = `<g transform="translate(222 336) rotate(24)">
    <rect x="-4.5" y="-122" width="9" height="96" fill="#4a3226" ${st3(2.8)}/>
    <path d="M-4 -106h8M-4 -90h8M-4 -74h8M-4 -58h8M-4 -42h8" stroke="#d4a373" stroke-width="1.2"/>
    <rect x="-8.5" y="-140" width="17" height="22" rx="4" fill="#1e1e26" ${st3(2.8)}/>
    <circle cx="-10.5" cy="-134" r="2.2" fill="url(#st)"/><circle cx="-10.5" cy="-125" r="2.2" fill="url(#st)"/>
    <circle cx="10.5" cy="-134" r="2.2" fill="url(#st)"/><circle cx="10.5" cy="-125" r="2.2" fill="url(#st)"/>
    <path d="M0 -28C-30 -34 -35 -6 -22 6C-33 22 -22 52 0 50C22 52 33 22 22 6C35 -6 30 -34 0 -28Z" fill="url(#rd)" ${st3(3.4)}/>
    <path d="M6 -14C20 -12 24 6 14 20C10 24 6 20 8 10C10 2 4 -8 6 -14Z" fill="#f8fafc" opacity=".9"/>
    <circle cx="0" cy="6" r="10.5" fill="#2a0a10" stroke="#ffd23f" stroke-width="2"/>
    <path d="M-2.5 -126v154M0 -126v154M2.5 -126v154" stroke="#f3f4f6" stroke-width="1" opacity=".88"/>
    <rect x="-11" y="26" width="22" height="6" rx="2" fill="#1e1e26"/>
  </g>`;

  h += arm(0) + (G ? guitar : "") + arm(1);

  // GRUP WAJAH DENGAN 2.5D PARALLAX (.face-grp)
  h += `<g class="face-grp">`;
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

  h += `<ellipse cx="88" cy="254" rx="15" ry="9.5" fill="url(#ck)"/><ellipse cx="212" cy="254" rx="15" ry="9.5" fill="url(#ck)"/>`;

  if (S.face === "Kacamata") {
    h += `<path d="${brow[0]}M${brow[1].slice(1)}" fill="none" ${st3(8.5)}/>`;
    h += `<g>
      <path d="M74 212L58 205M226 212L242 205" fill="none" ${st3(5)}/>
      <rect x="72" y="187" width="68" height="56" rx="22" fill="#12121a" ${st3(4)}/>
      <rect x="160" y="187" width="68" height="56" rx="22" fill="#12121a" ${st3(4)}/>
      <rect x="76" y="191" width="60" height="48" rx="18" fill="none" stroke="#3f3f52" stroke-width="1.8"/>
      <rect x="164" y="191" width="60" height="48" rx="18" fill="none" stroke="#3f3f52" stroke-width="1.8"/>
      <path d="M140 209Q150 202 160 209" fill="none" ${st3(5.5)}/>
      <circle cx="78" cy="202" r="2.2" fill="url(#st)"/><circle cx="222" cy="202" r="2.2" fill="url(#st)"/>
      <path d="M88 198L104 232M102 198L114 224M174 198L190 232M188 198L200 224" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity=".28"/>
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

  if (S.face === "Bandana") {
    h += `<path d="M62 246L84 256M238 246L216 256" stroke="#7a0d1d" stroke-width="4" stroke-linecap="round"/>`;
    h += `<path d="M82 252Q150 278 218 252L210 296Q150 326 90 296Z" fill="url(#rd)" ${st3(3.4)}/>`;
    h += `<path d="M98 268Q150 288 202 268M106 282Q150 300 194 282" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-dasharray="4 6" opacity=".6"/>`;
    h += `<circle cx="150" cy="282" r="4" fill="none" stroke="#fff" stroke-width="2" opacity=".7"/>`;
  } else if (S.face === "Masker") {
    h += `<path d="M60 244L88 252M64 274L92 282M240 244L212 252M236 274L208 282" stroke="#e5e7eb" stroke-width="3.2" stroke-linecap="round"/>`;
    h += `<path d="M88 248Q150 238 212 248L206 296Q150 320 94 296Z" fill="#1c1c26" ${st3(3.4)}/>`;
    h += `<path d="M126 244Q150 241 174 244" fill="none" stroke="#6b7280" stroke-width="3" stroke-linecap="round"/>`;
    h += `<path d="M150 244V308M104 266Q150 274 196 266M106 282Q150 290 194 282" fill="none" stroke="#3f3f52" stroke-width="2.2" stroke-linecap="round"/>`;
  } else {
    h += mouth(e, st);
  }

  if (S.face === "Kumis") {
    h += `<path d="M150 258C138 247 114 249 106 264C121 262 136 264 150 264C164 264 179 262 194 264C186 249 162 247 150 258Z" fill="#181820" ${st3(2.4)}/>`;
    h += `<path d="M120 256Q134 252 146 259M180 256Q166 252 154 259" fill="none" stroke="#4b5563" stroke-width="1.6" stroke-linecap="round"/>`;
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

  if (e === "Crying") {
    h += `<path class="tear" d="M86 248q-7 15 0 22q7-7 0-22z" fill="#6fd2ff" ${st3(1.5)}/><path class="tear" style="animation-delay:.5s" d="M214 248q-7 15 0 22q7-7 0-22z" fill="#6fd2ff" ${st3(1.5)}/>`;
  }
  if (e === "Worried") {
    h += `<path class="tear" style="animation-duration:1.8s" d="M230 132q-9 16 0 22q9-6 0-22z" fill="#6fd2ff" ${st3(1.5)}/>`;
  }

  if (X.has("Peniti")) {
    h += `<g transform="translate(56 236) rotate(-18)">
      <rect x="-4" y="-11" width="8" height="22" rx="4" fill="none" stroke="${OL}" stroke-width="4.5"/>
      <rect x="-4" y="-11" width="8" height="22" rx="4" fill="none" stroke="url(#st)" stroke-width="2.5"/>
      <rect x="-3.5" y="5" width="7" height="6" rx="2" fill="url(#st)" ${st3(1.2)}/>
    </g>`;
  }
  h += `</g>`; // Tutup .face-grp

  // GRUP KEPALA / TOPI REALISTIS (.head-grp)
  h += `<g class="head-grp">`;
  const bolt = (x, y, k, r) => `<polygon points="0,0 20,0 12,26 28,26 -4,66 4,34 -10,34" transform="translate(${x} ${y}) rotate(${r}) scale(${k})" fill="url(#bg2)" ${st3(2.8)}/>`;

  if (H === "Beanie") {
    h += `<path d="M62 146Q150 176 238 146" fill="none" stroke="#000" stroke-width="8" stroke-linecap="round" opacity=".28"/>`;
    h += `<path d="M64 134C58 58 118 36 162 40C212 45 242 90 236 134Z" fill="url(#bk)" ${st3(3.8)}/>`;
    h += `<path d="M112 46Q102 88 104 128M154 41Q150 86 150 130M194 48Q198 88 196 128" fill="none" stroke="#4b5563" stroke-width="2" opacity=".65"/>`;
    h += `<path d="M60 126Q150 156 240 126L240 148Q150 178 60 148Z" fill="#2d2d3a" ${st3(3.8)}/>`;
    h += `<path d="M84 134v18M112 140v18M140 142v18M168 141v18M218 132v18" stroke="#4b5563" stroke-width="2" opacity=".55"/>`;
    h += `<rect x="182" y="133" width="24" height="13" rx="3" fill="${bo}" ${st3(2)}/>`;
  }
  if (H === "Snapback") {
    h += `<path d="M64 144Q150 170 236 144" fill="none" stroke="#000" stroke-width="8" stroke-linecap="round" opacity=".28"/>`;
    h += `<path d="M68 138C64 64 118 44 158 46C210 50 238 92 232 138Z" fill="url(#rd)" ${st3(3.8)}/>`;
    h += `<path d="M150 46Q122 86 118 138M150 46Q182 86 186 138" fill="none" stroke="#7a0d1d" stroke-width="2" opacity=".6"/>`;
    h += `<circle cx="150" cy="45" r="5.5" fill="#7a0d1d" ${st3(2)}/>`;
    h += `<circle cx="122" cy="76" r="2.2" fill="#7a0d1d"/><circle cx="180" cy="76" r="2.2" fill="#7a0d1d"/>`;
    h += `<path d="M60 136Q150 162 240 136Q284 144 286 160Q218 172 150 158Q96 156 60 136Z" fill="#7a0d1d" ${st3(3.8)}/>`;
    h += `<path d="M168 149Q224 156 274 154" fill="none" stroke="#fca5a5" stroke-width="1.5" stroke-dasharray="4 3" opacity=".6"/>`;
  }
  if (H === "Ikat Kepala") {
    h += `<path d="M58 144Q150 174 242 144" fill="none" stroke="#000" stroke-width="7" stroke-linecap="round" opacity=".25"/>`;
    h += `<path d="M58 124Q150 154 242 124L242 146Q150 176 58 146Z" fill="url(#rd)" ${st3(3.8)}/>`;
    h += `<path d="M58 135Q150 165 242 135" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="6 6" opacity=".65"/>`;
    h += `<rect x="142" y="136" width="16" height="16" rx="5" fill="#9e0e22" ${st3(2.6)}/>`;
  }
  if (H === "Jambul Petir") {
    h += bolt(124, -10, .88, -12) + bolt(188, -16, .98, 10) + bolt(156, 4, .7, 0);
  }
  if (H === "Pita Besar") {
    h += `<g transform="translate(108 106) rotate(-18)">
      <path d="M0 0C-26-26-44-8-38 14C-30 28-10 16 0 0Z" fill="#ff5fb0" ${st3(3.4)}/>
      <path d="M-6 2C-18-8-28-2-26 6" fill="none" stroke="#be185d" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M0 0C26-26 44-8 38 14C30 28 10 16 0 0Z" fill="#ff5fb0" ${st3(3.4)}/>
      <path d="M6 2C18-8 28-2 26 6" fill="none" stroke="#be185d" stroke-width="2.4" stroke-linecap="round"/>
      <rect x="-7" y="-8" width="14" height="16" rx="6" fill="#d92682" ${st3(2.8)}/>
    </g>`;
  }
  if (H === "Bucket") {
    h += `<path d="M54 144Q150 170 246 144" fill="none" stroke="#000" stroke-width="8" stroke-linecap="round" opacity=".28"/>`;
    h += `<path d="M66 134C60 76 100 58 150 58C200 58 240 76 234 134Z" fill="#decb92" ${st3(3.8)}/>`;
    h += `<circle cx="102" cy="96" r="2.5" fill="#786334"/><circle cx="198" cy="96" r="2.5" fill="#786334"/>`;
    h += `<path d="M52 134Q150 112 248 134Q248 158 150 162Q52 158 52 134Z" fill="#bfa96e" ${st3(3.8)}/>`;
    h += `<path d="M64 126Q150 144 236 126" fill="none" stroke="#8c7642" stroke-width="3"/>`;
    h += `<path d="M58 142Q150 160 242 142M64 149Q150 166 236 149" fill="none" stroke="#8c7642" stroke-width="1.4" stroke-dasharray="4 3"/>`;
  }
  if (H === "Mohawk") {
    h += `<path d="M106 116L116 28L134 80L150 10L166 80L184 28L194 116Z" fill="#ff3d78" ${st3(3.8)}/>`;
    h += `<path d="M122 114L130 56L142 94L150 38L158 94L170 56L178 114Z" fill="#ff85ab" opacity=".7"/>`;
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
      <circle cx="110" cy="36" r="4" fill="url(#gd)" ${st3(2)}/><circle cx="150" cy="24" r="4.5" fill="url(#gd)" ${st3(2)}/><circle cx="190" cy="36" r="4" fill="url(#gd)" ${st3(2)}/>
      <rect x="100" y="86" width="100" height="14" rx="5" fill="url(#gd)" ${st3(3.4)}/>
      <circle cx="150" cy="93" r="4.5" fill="#ef4444" stroke="#7f1d1d" stroke-width="1.2"/>
      <circle cx="122" cy="93" r="3.5" fill="#38bdf8" stroke="#0c4a6e" stroke-width="1.2"/>
      <circle cx="178" cy="93" r="3.5" fill="#38bdf8" stroke="#0c4a6e" stroke-width="1.2"/>
    </g>`;
  }
  if (H === "Headphone") {
    h += `<path d="M60 198C52 54 248 54 240 198" fill="none" stroke="#181820" stroke-width="14" stroke-linecap="round"/>`;
    h += `<path d="M96 75Q150 60 204 75" fill="none" stroke="#4b4b5e" stroke-width="6" stroke-linecap="round"/>`;
    h += `<rect x="40" y="182" width="28" height="58" rx="14" fill="#272733" ${st3(3.6)}/><rect x="46" y="192" width="12" height="38" rx="6" fill="#3f3f52"/><rect x="62" y="188" width="8" height="46" rx="4" fill="#52526b"/>`;
    h += `<rect x="232" y="182" width="28" height="58" rx="14" fill="#272733" ${st3(3.6)}/><rect x="242" y="192" width="12" height="38" rx="6" fill="#3f3f52"/><rect x="230" y="188" width="8" height="46" rx="4" fill="#52526b"/>`;
  }
  h += `</g>`; // Tutup .head-grp

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
