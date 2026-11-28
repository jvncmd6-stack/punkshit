export const CRED_RANKS = [
  { minCred: 600, title: "Sesepuh Akut",       badge: "👑", color: "#ffd23f" },
  { minCred: 350, title: "Pentolan Markas",    badge: "🔥", color: "#c084fc" },
  { minCred: 200, title: "Biang Rame",         badge: "⚡", color: "#ff5a36" },
  { minCred: 100, title: "Anak Nongkrong",     badge: "🎸", color: "#ff8a1f" },
  { minCred: 50,  title: "Warga Tetap",        badge: "🧢", color: "#38bdf8" },
  { minCred: 20,  title: "Baru Kenal",         badge: "🥤", color: "#4ade80" },
  { minCred: 0,   title: "Anak Nyasar",        badge: "🛹", color: "#9ca3af" }
];

export const SHOP_TITLES = [
  { id: "sider",    name: "Sider Abadi",           price: 100, minCred: 10,  desc: "Cuma baca doang, munculnya pas ada gratisan." },
  { id: "yapping",  name: "Tukang Yapping",        price: 150, minCred: 20,  desc: "Ngetik panjang lebar tapi intinya nggak ada." },
  { id: "beban",    name: "Beban Grup",            price: 180, minCred: 25,  desc: "Nggak ngapa-ngapain tapi paling kenceng minta jatah." },
  { id: "admin",    name: "Admin Jalur Belakang",  price: 250, minCred: 50,  desc: "Gayanya udah kayak yang punya grup." },
  { id: "spill",    name: "Spill Master",          price: 300, minCred: 75,  desc: "Gudangnya info bocoran & drama terbaru." },
  { id: "kalong",   name: "Raja Jam Kalong",       price: 350, minCred: 90,  desc: "Baru hidup di atas jam 1 pagi." },
  { id: "fomo",     name: "Korban FOMO",           price: 450, minCred: 120, desc: "Apa pun yang lagi rame pasti langsung ikut." },
  { id: "sepuh",    name: "Sepuh Turun Gunung",    price: 650, minCred: 200, desc: "Muka lama yang bikin grup langsung rame." },
  { id: "donatur",  name: "Donatur Tanpa Syarat",  price: 900, minCred: 300, desc: "Saldo PSC numpuk, kerjanya pamer kekayaan." }
];

export const ACHIEVEMENT_TITLES = [
  { id: "first_fire",   name: "Bestie Jalur Api",  req: "Streak Spark 7 hari tanpa bolong" },
  { id: "cctv",         name: "CCTV Grup",         req: "Setor harian 14 hari berturut-turut" },
  { id: "kang_goreng",  name: "Kang Goreng",       req: "Selesaikan 10 misi atau event grup" },
  { id: "mak_comblang", name: "Mak Comblang",      req: "Ajak 5 warga baru masuk & aktif" },
  { id: "gak_napak",    name: "Gak Napak Tanah",   req: "Punya 3 slot Spark Lv 5+ aktif" }
];

export const SPARK_LEVEL_NAMES = [
  "Lowkey Spark",
  "Mulai Nyala",
  "Satu Vibe",
  "Gaspol",
  "Gacor",
  "Menyala Abangku",
  "Overheat",
  "Suhu",
  "Gak Ada Obat",
  "God Tier"
];

export function getDuoBondTitle(streak = 0) {
  const d = Number(streak) || 0;
  if (d >= 30) return "Lengket Kayak Lem";
  if (d >= 14) return "Sehidup Semati";
  if (d >= 7)  return "Partner Yapping";
  if (d >= 3)  return "Satu Frekuensi";
  return "Baru Nimbrung";
}

export function getRankByCred(cred = 0) {
  const c = Number(cred) || 0;
  return CRED_RANKS.find(r => c >= r.minCred) || CRED_RANKS[CRED_RANKS.length - 1];
}
