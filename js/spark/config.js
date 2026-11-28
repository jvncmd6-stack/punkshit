export const FREE_SLOTS = 4;
export const MAX_SLOTS = 7;
export const SLOT_PRICES = { 5: 150, 6: 300, 7: 500 };
export const OL = "#26101c";

export const TH = {
  Api: ["#ffd24a", "#ff8a1f", "#e0360f", "#fff35c"],
  Biru: ["#9be8ff", "#2f8cff", "#1c47e0", "#fff35c"],
  Toxic: ["#eaff7a", "#7dea2b", "#18a83a", "#e65cff"],
  Pink: ["#ffd6ec", "#ff7ac0", "#ff2f8e", "#59f0ff"],
  Ungu: ["#e6d0ff", "#a66bff", "#6a2cff", "#ffe94d"],
  Merah: ["#ffb3a0", "#ff4a3a", "#a8100f", "#ffe14d"],
  Emas: ["#fff6b0", "#ffc81f", "#c97a00", "#ff4fd8"],
  Tosca: ["#b8fff0", "#18d6b8", "#087c86", "#ffef5c"],
  Putih: ["#ffffff", "#cfd6ea", "#7c86b0", "#ff6a3d"]
};

export const GN = {
  "Dress Tartan": "Cewek", "Pita Besar": "Cewek",
  "Bulu Mata": "Cewek", "Choker": "Cewek", "Telinga Kucing": "Cewek", "Pipi Merah": "Cewek",
  "Kaos Petir": "Cowok", "Rompi Jeans": "Cowok", "Jambul Petir": "Cowok",
  "Kumis": "Cowok", Tengkorak: "Cowok",
  Mohawk: "Cowok", "Parut Petir": "Cowok"
};

export const gen = v => GN[v] || "Unisex";

export const TABS = [
  ["Baju", "outfit", ["Polos", "Hoodie", "Jaket Punk", "Singlet", "Dress Tartan", "Kaos Petir", "Rompi Jeans", "Flanel", "Tengkorak", "Jersey", "Kaos Garis"]],
  ["Kepala", "head", ["Polos", "Beanie", "Snapback", "Ikat Kepala", "Pita Besar", "Jambul Petir", "Bucket", "Mohawk", "Telinga Kucing", "Mahkota", "Headphone"]],
  ["Muka", "face", ["Normal", "Kacamata", "Bandana", "Bulu Mata", "Kumis", "Masker", "Bintik", "Pipi Merah", "Parut Petir"]],
  ["Gear", "extra", ["Gitar", "Rantai", "Gelang", "Peniti", "Choker", "Syal", "Pin Petir", "Stiker"]],
  ["Warna", "theme", Object.keys(TH)],
  ["Reaksi", "emo", ["Happy", "Excited", "Waiting", "Worried", "Dancing", "Crying", "Celebrating", "Sleepy", "Love", "Angry", "Surprised", "Wink"]],
  ["Misi Duo", "missions", []]
];

export const DUO_MISSIONS = [
  { title: "Both Online", desc: "Keduanya memenuhi target 5 GAP & 2 pesan valid harian", xp: "+10 XP" },
  { title: "Reply Chain", desc: "Saling membalas pesan di grup markas", xp: "+5 XP" },
  { title: "Group Regulars", desc: "Qualified selama 3 hari berturut-turut", xp: "+20 XP" },
  { title: "Event Partners", desc: "Mengikuti event grup yang sama", xp: "+15 XP" },
  { title: "Seven Days Strong", desc: "Mencapai streak 7 hari bersama", xp: "+50 XP" },
  { title: "Double Trouble", desc: "Menyelesaikan 3 misi bersama", xp: "+30 XP" }
];

export const LV = [
  "Baby Spark", "Tiny Trouble", "Little Spark", "Happy Chaos", "Growing Spark",
  "Bright Buddy", "Super Spark", "Neon Buddy", "Royal Spark", "Legendary Spark"
];

export const XP = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 99999];
export const SC = [.74, .84, .92, .97, 1];
export const LG = [0, 8, 16, 22, 28];
export const RN = ["Common", "Common", "Rare", "Rare", "Epic"];
export const DN = { Polos: "Tanpa" };

export const GFL = [
  ["Semua", "Semua"],
  ["Cewek", "♀ Cewek"],
  ["Cowok", "♂ Cowok"],
  ["Unisex", "⚥ Unisex"]
];

export const U = {
  Singlet: 2, "Kaos Petir": 2, "Kaos Garis": 3, "Rompi Jeans": 3, Flanel: 4, "Dress Tartan": 4, Tengkorak: 5, Jersey: 6,
  Snapback: 2, "Ikat Kepala": 2, Bucket: 3, "Pita Besar": 3, "Telinga Kucing": 4, Headphone: 4, Mohawk: 5, "Jambul Petir": 6, Mahkota: 8,
  Kacamata: 2, Bandana: 2, "Bulu Mata": 3, Kumis: 3, Bintik: 3, "Pipi Merah": 4, Masker: 5, "Parut Petir": 6,
  Rantai: 2, Gitar: 3, Choker: 3, "Pin Petir": 3, Syal: 5, Stiker: 6,
  Toxic: 2, Pink: 2, Ungu: 3, Merah: 4, Tosca: 5,
  Crying: 2, Dancing: 2, Wink: 3, Surprised: 3, Love: 4, Angry: 4, Celebrating: 6
};

export const UD = { Emas: 30, Putih: 100 };
export const NECK = ["Rantai", "Choker", "Syal"];

export const E = {
  Happy: { br: .022, bf: 1.7, h: 24, hi: 5.2, sw: 1.6, sf: .8, sh: 0, dy: 0, ln: 0, up: 0, wv: 0, sp: 1 },
  Excited: { br: .02, bf: 4, h: 14, hi: .55, sw: 3, sf: 1.8, sh: 0, dy: 0, ln: 0, up: 1, wv: 14, sp: 2.2 },
  Waiting: { br: .012, bf: 1.3, h: 0, hi: 0, sw: 3.5, sf: .3, sh: 0, dy: 0, ln: 0, up: 0, wv: 0, sp: .9 },
  Worried: { br: .012, bf: 5, h: 0, hi: 0, sw: 0, sf: 1, sh: 1.5, dy: 2, ln: 0, up: .08, wv: 3, sp: 3 },
  Dancing: { br: .02, bf: 2, h: 12, hi: .67, sw: 6, sf: .75, sh: 0, dy: 0, ln: 0, up: 1, wv: 10, sp: 1.8 },
  Crying: { br: .02, bf: 1.8, h: 0, hi: 0, sw: 1, sf: .9, sh: 0, dy: 4, ln: 0, up: 0, wv: 0, sp: .8 },
  Celebrating: { br: .02, bf: 3, h: 34, hi: .85, sw: 5, sf: 1.2, sh: 0, dy: 0, ln: 0, up: 1, wv: 14, sp: 2.5 },
  Sleepy: { br: .03, bf: .8, h: 0, hi: 0, sw: 0, sf: 1, sh: 0, dy: 6, ln: 6, up: 0, wv: 0, sp: .45 },
  Love: { br: .025, bf: 2, h: 10, hi: 1.8, sw: 4, sf: .6, sh: 0, dy: 0, ln: 0, up: .5, wv: 3, sp: 1.2 },
  Angry: { br: .015, bf: 5, h: 0, hi: 0, sw: 0, sf: 1, sh: 1.1, dy: 5, ln: 0, up: 0, wv: 0, sp: 2.6 },
  Surprised: { br: .01, bf: 2, h: 28, hi: 4, sw: 0, sf: 1, sh: 0, dy: 0, ln: 0, up: .45, wv: 2, sp: 1.4 },
  Wink: { br: .022, bf: 1.7, h: 18, hi: 3.2, sw: 3, sf: .8, sh: 0, dy: 0, ln: 0, up: 0, wv: 0, sp: 1.1 }
};

export const VB = {
  outfit: "30 240 240 150",
  head: "40 0 220 190",
  face: "60 160 180 170",
  extra: "20 200 260 180",
  emo: "20 60 260 300"
};
