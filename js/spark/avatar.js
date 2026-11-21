import { OL, TH, SC, LG, VB } from "./config.js";

export const mix = (h, m, t) => {
  const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)), A = p(h), B = p(m);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
};

export let CR = 1, CRt = 1, SPD = 1;
export const setCR = v => { CR = v; };
export const setSPD = v => { SPD = v; };

const Y = v => v < 150 ? 150 - (150 - v) * CR : v;

export const bodyD = (t = 0) => {
  const a = Math.sin(t * 2.1) * 4, b = Math.sin(t * 2.6 + 1) * 5, c = Math.sin(t * 2.3 + 2) * 5, d = Math.sin(t * 2.9 + 3) * 4, y = Math.sin(t * 3.3) * 2;
  return `M150 334C88 334 50 292 52 236C54 196 78 178 82 150C82 ${Y(132)} ${66 + a / 2} ${Y(116)} ${70 + a} ${Y(88 + y)}C${90 + a / 2} ${Y(100)} 100 ${Y(112)} 106 ${Y(124)}C104 ${Y(96)} ${116 + b / 2} ${Y(62)} ${132 + b} ${Y(36 - y)}C${140 + b / 2} ${Y(62)} 144 ${Y(78)} 148 ${Y(92)}C158 ${Y(62)} ${178 + c / 2} ${Y(44)} ${198 + c} ${Y(30 + y)}C${196 + c / 2} ${Y(60)} 200 ${Y(80)} 204 ${Y(96)}C216 ${Y(78)} ${232 + d / 2} ${Y(70)} ${246 + d} ${Y(72 - y)}C${240 + d / 2} ${Y(92)} 238 ${Y(108)} 236 ${Y(124)}C252 150 252 190 248 236C250 292 212 334 150 334Z`;
};

const BODY = bodyD(0);
const st3 = (w = 4) => `stroke="${OL}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

function mouth(e, st = 2) {
  const R = "#7a1622", T = "#ff7a8a";
  const fg = (x, y, s = 1) => st < 1 ? "" : `<path d="M${x} ${y}l${10 * s} 0l${-5 * s} ${12 * s}z" fill="#fff" ${st3(1.6)}/>`;
  if (["Excited", "Celebrating", "Dancing"].includes(e)) return `<path d="M110 256Q150 246 190 256Q184 304 150 304Q116 304 110 256Z" fill="${R}" ${st3(3.5)}/><ellipse cx="150" cy="292" rx="16" ry="8" fill="${T}"/>${fg(120, 257)}${fg(170, 257, .8)}`;
  if (e == "Surprised") return `<ellipse cx="150" cy="284" rx="14" ry="19" fill="${R}" ${st3(3.5)}/><ellipse cx="150" cy="292" rx="8" ry="6" fill="${T}"/>`;
  if (e == "Angry") return `<path d="M116 286Q150 266 184 286Q150 306 116 286Z" fill="#fff" ${st3(4)}/><path d="M132 278v16M150 275v22M168 278v16" ${st3(2)}/>`;
  if (e == "Waiting") return `<path d="M128 274L172 270" ${st3(6)} fill="none"/>`;
  if (e == "Worried") return `<path d="M122 276q7-8 14 0t14 0t14 0t14 0" fill="none" ${st3(4.5)}/>`;
  if (e == "Crying") return `<path d="M122 288Q150 258 178 288" fill="none" ${st3(6)}/>`;
  if (e == "Sleepy") return `<path d="M124 268Q150 288 178 264" fill="none" ${st3(5)}/>`;
  return `<path d="M122 260Q150 254 178 258Q172 290 148 290Q126 288 122 260Z" fill="${R}" ${st3(3.5)}/><ellipse cx="150" cy="282" rx="12" ry="6" fill="${T}"/>${fg(128, 260)}${fg(160, 259, .7)}`;
}

export function renderPetSVG(S, lv) {
  const [L, M, D, bo] = TH[S.theme] || TH.Api;
  const e = S.emo, st = Math.ceil(lv / 2) - 1, s = SC[st], Ls = LG[st], O = S.outfit, H = S.head, X = S.extra, G = X.has("Gitar");
  let h = `<defs>
  <linearGradient id="bd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${L}"/><stop offset=".5" stop-color="${M}"/><stop offset="1" stop-color="${D}"/></linearGradient>
  <radialGradient id="sh" cx=".5" cy=".5" r=".62"><stop offset=".68" stop-color="${D}" stop-opacity="0"/><stop offset="1" stop-color="${mix(D, "#000000", .5)}" stop-opacity=".45"/></radialGradient>
  <radialGradient id="ey" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="${mix(M, "#000000", .2)}"/><stop offset="1" stop-color="${mix(D, "#000000", .65)}"/></radialGradient>
  <radialGradient id="st" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#8a8a96"/></radialGradient>
  <linearGradient id="bk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4a58"/><stop offset="1" stop-color="#14141a"/></linearGradient>
  <linearGradient id="hd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b79bff"/><stop offset="1" stop-color="#7448dc"/></linearGradient>
  <linearGradient id="gd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2a8"/><stop offset="1" stop-color="#d99a00"/></linearGradient>
  <linearGradient id="rd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6a5a"/><stop offset="1" stop-color="#b01228"/></linearGradient>
  <linearGradient id="bg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="${bo}"/></linearGradient>
  <radialGradient id="au"><stop offset=".35" stop-color="${bo}" stop-opacity=".42"/><stop offset="1" stop-color="${bo}" stop-opacity="0"/></radialGradient>
  <radialGradient id="hl"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <radialGradient id="ck"><stop offset="0" stop-color="#ff3d78" stop-opacity=".6"/><stop offset="1" stop-color="#ff3d78" stop-opacity="0"/></radialGradient>
  <pattern id="fl" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="#d9531e"/><rect y="6" width="18" height="5" fill="#1b1b22" opacity=".55"/><rect x="6" width="5" height="18" fill="#1b1b22" opacity=".55"/></pattern>
  <pattern id="pl" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#b01228"/><rect y="6" width="16" height="4" fill="#1b1b22" opacity=".8"/><rect x="6" width="4" height="16" fill="#1b1b22" opacity=".8"/></pattern>
  <clipPath id="cp"><path class="bp" d="${BODY}"/></clipPath></defs>`;
  h += `<ellipse cx="150" cy="356" rx="${112 * s}" ry="13" fill="#000" opacity=".45"/><ellipse cx="150" cy="356" rx="${112 * s}" ry="13" fill="none" stroke="${M}" stroke-width="3"/>`;
  CRt = [.5, .75, 1, 1.18, 1.3][st] * ({ Worried: .6, Crying: .55, Sleepy: .7, Excited: 1.12, Celebrating: 1.15, Angry: 1.3, Surprised: 1.2, Love: 1.05 }[e] || 1);
  SPD = { Excited: 2.2, Celebrating: 2.5, Worried: 3.2, Sleepy: .5, Dancing: 1.8 }[e] || 1;
  if (st >= 3) h += `<circle cx="150" cy="200" r="${st == 4 ? 172 : 146}" fill="url(#au)"/>`;
  if (st == 4) h += `<g class="orb">${[0, 120, 240].map(a => `<g transform="rotate(${a} 150 200)"><polygon points="0,0 14,0 8,18 20,18 -3,46 3,24 -7,24" transform="translate(143 24)" fill="url(#bg2)" ${st3(2.5)}/></g>`).join("")}</g>`;
  if (S.bolts) h += [["26,92 52,92 42,126 66,126 24,184 34,144 14,144", 0], ["264,50 290,50 280,84 302,84 262,140 270,102 252,102", .9]].map(([p, d]) => `<polygon class="bolt" style="animation-delay:${d}s" points="${p}" fill="url(#bg2)" ${st3(3)}/>`).join("");
  h += `<g transform="translate(150 350) scale(${s}) translate(-150 -350)"><g transform="translate(0 ${-Ls})"><g class="pet">`;
  const leg = x => `<path d="M${x} 318L${x - 2} ${338 + Ls}" stroke="${OL}" stroke-width="19" stroke-linecap="round"/><path d="M${x} 318L${x - 2} ${338 + Ls}" stroke="${M}" stroke-width="12" stroke-linecap="round"/><ellipse cx="${x + (x < 150 ? -8 : 8)}" cy="${340 + Ls}" rx="21" ry="10" fill="url(#bd)" ${st3(4)}/>`;
  h += leg(122) + leg(178);
  h += `<path class="bp" d="${BODY}" fill="url(#bd)" ${st3(5)}/><path class="bp" d="${BODY}" fill="url(#sh)"/><ellipse cx="150" cy="250" rx="64" ry="62" fill="url(#hl)" opacity=".5"/><ellipse cx="96" cy="176" rx="11" ry="30" transform="rotate(-16 96 176)" fill="url(#hl)"/>`;
  h += `<polygon points="156,114 146,114 150,126 142,126 154,146 151,132 160,132" transform="translate(0 -2)" fill="${bo}" ${st3(2)}/>`;
  if (st >= 3) h += `<path d="M86 282l12-12-6 14 14-10M214 282l-12-12 6 14-14-10M96 318l10-8-4 12 12-8M204 318l-10-8 4 12-12-8" fill="none" stroke="${bo}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (st == 4) h += `<ellipse cx="150" cy="10" rx="46" ry="9" fill="none" stroke="#ffd21f" stroke-width="5"/>`;
  if (O == "Hoodie") h += `<g clip-path="url(#cp)"><path d="M40 284Q150 316 260 284L272 400H28Z" fill="url(#hd)" ${st3(3.5)}/><path d="M92 290Q150 326 208 290" fill="none" stroke="#5b36b8" stroke-width="11" stroke-linecap="round"/><path d="M130 306v26M170 306v26" ${st3(3)} stroke="#efe6ff"/><path d="M98 332Q150 322 202 332L210 372H90Z" fill="#0002" ${st3(3)}/></g>`;
  if (O == "Jaket Punk") h += `<g clip-path="url(#cp)"><path d="M40 278Q150 306 260 278L272 400H28Z" fill="url(#bk)" ${st3(3.5)}/><path d="M92 286L134 340L106 352L84 308Z" fill="#33333f" ${st3(3)}/><path d="M208 286L166 340L194 352L216 308Z" fill="#33333f" ${st3(3)}/><path d="M150 312V400" ${st3(3)} stroke="#9a9aa8"/>${[[94, 304], [106, 322], [206, 304], [194, 322], [116, 296], [184, 296]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.5" fill="url(#st)" ${st3(1.5)}/>`).join("")}<path d="M128 358h14l-3 12h-8z" fill="${bo}" ${st3(2)}/></g>`;
  if (O == "Singlet") h += `<g clip-path="url(#cp)"><path d="M70 290Q150 314 230 290L240 400H60Z" fill="url(#bk)" ${st3(3.5)}/><text x="150" y="336" text-anchor="middle" font-size="17" font-weight="900" fill="${bo}" font-family="Impact,Arial Black,sans-serif">PUNKSHIT</text></g>`;
  if (O == "Dress Tartan") h += `<g clip-path="url(#cp)"><path d="M44 288Q150 312 256 288L272 400H28Z" fill="url(#pl)" ${st3(3.5)}/><path d="M46 300Q150 326 254 300" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="3 7" stroke-linecap="round" opacity=".8"/><path d="M150 300l-17-10v20zM150 300l17-10v20z" fill="#fff" ${st3(2.5)}/><circle cx="150" cy="300" r="5" fill="#ff5fb0" ${st3(2)}/></g>`;
  if (O == "Kaos Petir") h += `<g clip-path="url(#cp)"><path d="M56 290Q150 316 244 290L252 400H48Z" fill="#ececf2" ${st3(3.5)}/><path d="M104 294Q150 322 196 294" fill="none" stroke="#1b1b22" stroke-width="7" stroke-linecap="round"/><polygon points="158,316 136,316 146,340 134,340 164,376 152,336 164,336" fill="${M}" ${st3(2.5)}/></g>`;
  if (O == "Rompi Jeans") h += `<g clip-path="url(#cp)"><path d="M40 284Q92 298 130 288L136 400H28Z" fill="#3f73ad" ${st3(3.5)}/><path d="M260 284Q208 298 170 288L164 400H272Z" fill="#3f73ad" ${st3(3.5)}/>${[[124, 312], [176, 312], [124, 338], [176, 338]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.5" fill="url(#st)" ${st3(1.5)}/>`).join("")}<circle cx="84" cy="344" r="9" fill="${M}" ${st3(2)}/></g>`;
  if (O == "Flanel") h += `<g clip-path="url(#cp)"><path d="M44 288Q150 312 256 288L272 400H28Z" fill="url(#fl)" ${st3(3.5)}/><path d="M150 304V400" stroke="#1b1b22" stroke-width="3"/><path d="M104 292L150 326L196 292L150 304Z" fill="#b9420f" ${st3(3)}/></g>`;
  if (O == "Tengkorak") h += `<g clip-path="url(#cp)"><path d="M56 290Q150 316 244 290L252 400H48Z" fill="#1b1b22" ${st3(3.5)}/><ellipse cx="150" cy="334" rx="19" ry="17" fill="#f4f1ea"/><rect x="140" y="346" width="20" height="12" rx="3" fill="#f4f1ea"/><circle cx="142" cy="333" r="5" fill="#1b1b22"/><circle cx="158" cy="333" r="5" fill="#1b1b22"/></g>`;
  if (O == "Jersey") h += `<g clip-path="url(#cp)"><path d="M56 290Q150 316 244 290L252 400H48Z" fill="#e0360f" ${st3(3.5)}/><path d="M104 294Q150 322 196 294" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/><text x="150" y="360" text-anchor="middle" font-size="44" font-weight="900" fill="#fff" font-family="ui-rounded,Arial Black,sans-serif">07</text></g>`;
  if (O == "Kaos Garis") h += `<g clip-path="url(#cp)"><path d="M56 290Q150 316 244 290L252 400H48Z" fill="#f4f1ea" ${st3(3.5)}/><path d="M50 316H250M50 334H250M50 352H250M50 370H250" stroke="#2f5fbf" stroke-width="7"/><path d="M104 294Q150 322 196 294" fill="none" stroke="#2f5fbf" stroke-width="7" stroke-linecap="round"/></g>`;
  const sl = O == "Hoodie" ? "#9a74ee" : O == "Jaket Punk" ? "#2b2b36" : O == "Dress Tartan" ? "#f4f1ea" : O == "Kaos Petir" ? "#ececf2" : O == "Flanel" ? "#d9531e" : O == "Tengkorak" ? "#1b1b22" : O == "Jersey" ? "#e0360f" : O == "Kaos Garis" ? "#f4f1ea" : M, base = st == 0;
  const arm = m => {
    const Xx = x => m ? 300 - x : x;
    let p, hx, hy;
    if (m && G) { p = "M238 264Q266 278 247 298"; hx = 247; hy = 298; }
    else { p = `M${Xx(62)} 264Q${Xx(base ? 46 : 36)} ${base ? 278 : 288} ${Xx(base ? 48 : 40)} ${base ? 298 : 314}`; hx = Xx(base ? 48 : 40); hy = base ? 298 : 314; }
    return `<g class="arm" data-m="${m}" data-g="${m && G ? 1 : 0}"><path d="${p}" fill="none" stroke="${OL}" stroke-width="21" stroke-linecap="round"/><path d="${p}" fill="none" stroke="${sl}" stroke-width="14" stroke-linecap="round"/><circle cx="${hx}" cy="${hy}" r="10" fill="url(#bd)" ${st3(3.5)}/>${X.has("Gelang") ? `<rect x="${hx - 10}" y="${hy - 18}" width="20" height="8" rx="3" fill="#1b1b22" ${st3(2.5)}/>` : ""}</g>`;
  };
  const guitar = `<g transform="translate(227 342) rotate(22)"><rect x="-5" y="-126" width="10" height="100" fill="#3a2a22" ${st3(3)}/><rect x="-9" y="-142" width="18" height="22" rx="4" fill="#222" ${st3(3)}/><path d="M0 -30C-32 -36 -38 -6 -24 6C-36 24 -24 56 0 54C24 56 36 24 24 6C38 -6 32 -36 0 -30Z" fill="url(#rd)" ${st3(3.5)}/></g>`;
  h += arm(0) + (G ? guitar : "") + arm(1);
  const g = e == "Waiting" ? 10 : 0;
  const eye = (x, d) => e == "Wink" && d < 0 ? `<path d="M164 224Q192 204 220 224" fill="none" ${st3(6)}/>` : `<g class="eye" data-x="${x}"><ellipse cx="${x}" cy="218" rx="31" ry="34" fill="#fff" ${st3(4)}/><g class="pp"><circle cx="${x + d * 4 + g}" cy="221" r="23" fill="${mix(D, "#000000", .45)}"/><circle cx="${x + d * 4 + g}" cy="221" r="20" fill="url(#ey)"/><circle cx="${x + d * 4 + g}" cy="222" r="10" fill="#120508"/><circle cx="${x + d * 4 + g + 7}" cy="211" r="8" fill="#fff"/><circle cx="${x + d * 4 + g - 6}" cy="230" r="4" fill="#fff"/>${e == "Love" ? `<path d="M${x + d * 4} 246C${x + d * 4 - 36} 222 ${x + d * 4 - 22} 194 ${x + d * 4} 212C${x + d * 4 + 22} 194 ${x + d * 4 + 36} 222 ${x + d * 4} 246Z" fill="#ff2f6e" ${st3(3)}/>` : ""}</g></g>`;
  const brow = {
    Worried: ["M76 184L134 172", "M224 184L166 172"],
    Excited: ["M76 178Q106 160 136 176", "M224 178Q194 160 164 176"],
    Sleepy: ["M78 184Q106 178 134 188", "M222 184Q194 178 166 188"],
    Angry: ["M72 168L136 198", "M228 168L164 198"],
    Surprised: ["M80 166Q106 152 134 164", "M220 166Q194 152 166 164"],
    Love: ["M80 184Q106 172 134 182", "M220 184Q194 172 166 182"]
  }[e] || (st == 0 ? ["M80 182Q106 170 134 182", "M220 182Q194 170 166 182"] : ["M76 176L136 194", "M164 190Q192 168 224 178"]);
  h += `<ellipse cx="86" cy="256" rx="16" ry="10" fill="url(#ck)"/><ellipse cx="214" cy="256" rx="16" ry="10" fill="url(#ck)"/>`;
  if (S.face == "Kacamata") h += `<g><circle cx="108" cy="218" r="35" fill="#101018" ${st3(4)}/><circle cx="192" cy="218" r="35" fill="#101018" ${st3(4)}/><path d="M143 214Q150 208 157 214M73 212L54 206M227 212L246 206" fill="none" ${st3(5)}/></g>`;
  else if (e == "Sleepy") h += `<path d="M78 220Q108 242 138 220M162 220Q192 242 222 220" fill="none" ${st3(6)}/>`;
  else h += (st == 0 ? `<g transform="translate(150 224) scale(1.1) translate(-150 -224)">${eye(108, 1) + eye(192, -1)}</g>` : eye(108, 1) + eye(192, -1));
  if (S.face == "Bulu Mata" && e != "Sleepy") h += `<path d="M80 202q-10-2-16-12M84 194q-8-6-10-16M92 188q-4-8-4-14M220 202q10-2 16-12M216 194q8-6 10-16M208 188q4-8 4-14" fill="none" ${st3(4.5)}/>`;
  h += `<path d="${brow[0]}M${brow[1].slice(1)}" fill="none" ${st3(10)}/>`;
  if (S.face == "Bandana") h += `<path d="M80 252Q150 284 220 252L214 298Q150 330 86 298Z" fill="url(#rd)" ${st3(3.5)}/>`;
  else if (S.face == "Masker") h += `<path d="M86 248Q150 236 214 248L208 302Q150 330 92 302Z" fill="#1b1b22" ${st3(3.5)}/>`;
  else h += mouth(e, st);
  if (S.face == "Kumis") h += `<path d="M150 260C138 248 112 250 104 266C120 264 136 266 150 266C164 266 180 264 196 266C188 250 162 248 150 260Z" fill="#1b1b22" ${st3(2.5)}/>`;
  if (S.face == "Bintik") h += [[92, 246], [104, 254], [84, 260], [208, 246], [196, 254], [216, 260]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#7a3a1a" opacity=".75"/>`).join("");
  if (S.face == "Pipi Merah") h += [0, 1].map(m => `<g transform="${m ? "translate(300 0) scale(-1 1)" : ""}"><ellipse cx="84" cy="258" rx="17" ry="11" fill="#ff2f6e" opacity=".6"/></g>`).join("");
  if (S.face == "Parut Petir") h += `<polygon points="84,166 98,166 91,184 102,184 82,208 86,192 77,192" fill="#ff6a5a" ${st3(1.8)}/>`;
  h += `<g transform="translate(206 262) rotate(-24)"><rect x="-17" y="-8" width="34" height="16" rx="6" fill="#f4c9a0" ${st3(2.5)}/><rect x="-6" y="-8" width="12" height="16" fill="#e0a878"/></g>`;
  if (e == "Crying") h += `<path class="tear" d="M84 250q-8 16 0 24q8-8 0-24z" fill="#6fd2ff" ${st3(1.5)}/><path class="tear" style="animation-delay:.5s" d="M216 250q-8 16 0 24q8-8 0-24z" fill="#6fd2ff" ${st3(1.5)}/>`;
  if (e == "Worried") h += `<path class="tear" style="animation-duration:1.8s" d="M232 130q-10 18 0 24q10-6 0-24z" fill="#6fd2ff" ${st3(1.5)}/>`;
  if (H == "Beanie") h += `<path d="M62 134C56 54 120 30 164 36C216 42 246 90 238 134Z" fill="url(#bk)" ${st3(4)}/><path d="M60 126Q150 158 240 126L240 150Q150 182 60 150Z" fill="#33333f" ${st3(4)}/><path d="M60 138Q150 170 240 138" fill="none" stroke="${bo}" stroke-width="4"/><circle cx="194" cy="92" r="14" fill="${M}" ${st3(3)}/>`;
  if (H == "Snapback") h += `<path d="M66 140C62 60 120 40 160 42C214 46 242 92 236 140Z" fill="url(#rd)" ${st3(4)}/><path d="M58 138Q150 164 242 138Q290 146 292 164Q220 176 150 162Q96 160 58 138Z" fill="#7a0d1d" ${st3(4)}/>`;
  if (H == "Ikat Kepala") h += `<path d="M56 124Q150 156 244 124L244 148Q150 180 56 148Z" fill="url(#rd)" ${st3(4)}/>`;
  const bolt = (x, y, k, r) => `<polygon points="0,0 20,0 12,26 28,26 -4,66 4,34 -10,34" transform="translate(${x} ${y}) rotate(${r}) scale(${k})" fill="url(#bg2)" ${st3(3)}/>`;
  if (H == "Jambul Petir") h += bolt(124, -14, .9, -12) + bolt(190, -20, 1, 10) + bolt(158, 0, .7, 0);
  if (H == "Jepit Petir") h += bolt(84, 112, .55, -20) + bolt(98, 134, .42, -30);
  if (H == "Pita Besar") h += `<g transform="translate(112 92) rotate(-18)"><path d="M0 0C-24-26-44-8-38 14C-30 28-10 16 0 0Z" fill="#ff5fb0" ${st3(3.5)}/><path d="M0 0C24-26 44-8 38 14C30 28-10 16 0 0Z" fill="#ff5fb0" ${st3(3.5)}/><circle r="8" fill="#e0338a" ${st3(3)}/></g>`;
  if (H == "Bucket") h += `<path d="M64 136C58 76 100 58 150 58C200 58 242 76 236 136Z" fill="#d9c58a" ${st3(4)}/><path d="M50 136Q150 112 250 136Q250 160 150 164Q50 160 50 136Z" fill="#b9a46a" ${st3(4)}/>`;
  if (H == "Mohawk") h += `<path d="M104 114L116 24L134 78L150 6L168 78L186 24L196 114Z" fill="#ff3d78" ${st3(4)}/>`;
  if (H == "Telinga Kucing") h += `<path d="M80 120L66 46L126 92Z" fill="url(#bd)" ${st3(4)}/><path d="M220 120L234 46L174 92Z" fill="url(#bd)" ${st3(4)}/>`;
  if (H == "Mahkota") h += `<g transform="translate(0 22)"><path d="M100 90L108 34L130 62L150 24L170 62L192 34L200 90Z" fill="url(#gd)" ${st3(4)}/><rect x="98" y="86" width="104" height="14" rx="5" fill="url(#gd)" ${st3(3.5)}/></g>`;
  if (H == "Headphone") h += `<path d="M62 204C54 52 246 52 238 204" fill="none" stroke="#1b1b22" stroke-width="14" stroke-linecap="round"/><rect x="44" y="188" width="30" height="58" rx="14" fill="#2b2b36" ${st3(4)}/><rect x="226" y="188" width="30" height="58" rx="14" fill="#2b2b36" ${st3(4)}/>`;
  if (X.has("Rantai")) h += `<path d="M92 292Q150 346 208 292" fill="none" stroke="url(#gd)" stroke-width="7" stroke-linecap="round" stroke-dasharray="9 3"/>`;
  if (X.has("Choker")) h += `<path d="M96 290Q150 318 204 290" fill="none" stroke="#1b1b22" stroke-width="7" stroke-linecap="round"/>`;
  if (X.has("Kalung Spike")) h += `<path d="M98 288Q150 316 202 288" fill="none" stroke="#2b2b36" stroke-width="9" stroke-linecap="round"/>`;
  if (X.has("Peniti")) h += `<circle cx="54" cy="238" r="8" fill="none" stroke="#d8d8e0" stroke-width="3.5"/>`;
  if (X.has("Syal")) h += `<path d="M82 288Q150 326 218 288L224 308Q150 350 76 308Z" fill="#e0360f" ${st3(3.5)}/>`;
  if (X.has("Tindik")) h += [[58, 246], [242, 246]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="none" stroke="#d8d8e0" stroke-width="3.5"/>`).join("");
  if (X.has("Pin Petir")) h += `<circle cx="112" cy="322" r="12" fill="#ffd21f" ${st3(2.5)}/>`;
  if (X.has("Stiker")) h += [[196, 330, 1.1, "#39d0ff"], [104, 348, .8, "#ff5fb0"]].map(([x, y, k, c]) => `<polygon transform="translate(${x} ${y}) scale(${k})" points="0,-11 3.2,-3.4 11,-3.4 4.8,1.8 7,9.5 0,5 -7,9.5 -4.8,1.8 -11,-3.4 -3.2,-3.4" fill="${c}" ${st3(2)}/>`).join("");
  if (e == "Love") h += [[220, 120, 0], [238, 100, .8], [200, 98, 1.6]].map(([x, y, d]) => `<text class="zz" style="animation-delay:${d}s" x="${x}" y="${y}" font-size="22" fill="#ff3d78">♥</text>`).join("");
  if (e == "Angry") h += `<text class="zz" x="226" y="120" font-size="30">💢</text>`;
  if (e == "Surprised") h += `<text class="zz" x="226" y="124" font-size="38" font-weight="900" fill="#fff" ${st3(1.5)}>!</text>`;
  if (e == "Sleepy") h += `<text class="zz" x="226" y="126" font-size="30" font-weight="900" fill="#fff">Z</text>`;
  if (e == "Waiting") h += [0, .25, .5].map((d, i) => `<circle class="dt" style="animation-delay:${d}s" cx="${222 + i * 16}" cy="130" r="5" fill="#fff"/>`).join("");
  if (e == "Celebrating") h += [[40, 70, "#ff3b6b"], [256, 60, "#39d0ff"], [90, 18, "#ffd21f"], [220, 10, "#7dea2b"]].map(([x, y, k], i) => `<g class="cf" style="animation-delay:${i * .35}s"><rect x="${x}" y="${y}" width="10" height="10" rx="3" fill="${k}"/></g>`).join("");
  h += `</g></g>`;
  if (st >= 3 || e == "Excited" || e == "Wink") h += [[30, 60], [266, 130], [44, 280], [250, 24]].map(([x, y], i) => `<path class="sp" style="animation-delay:${i * .4}s" d="M${x} ${y - 11}Q${x} ${y} ${x + 11} ${y}Q${x} ${y} ${x} ${y + 11}Q${x} ${y} ${x - 11} ${y}Q${x} ${y} ${x} ${y - 11}Z" fill="#fff" ${st3(1.5)}/>`).join("");
  h += `</g>`;
  return { html: h, st };
}

const PV_CACHE = {};
let pvn = 0;

export function getPreviewSVG(S, lv, k, v) {
  const ck = k + ":" + v;
  if (PV_CACHE[ck]) return PV_CACHE[ck];
  const clone = { ...S, extra: new Set(S.extra) };
  if (k == "extra") clone.extra.add(v);
  else clone[k] = v;
  if (k != "emo") clone.emo = "Happy";
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
