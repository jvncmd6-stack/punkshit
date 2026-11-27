import { ENV } from '../config/env.js';
import { escHtml } from '../services/syncEngine.js';

export const DEFAULT_GREET =
  'Wih, ada nyawa baru nyasar ke markas. Selamat datang, {mention}.\n\n' +
  'Cetak PunkID lo dulu biar sah jadi warga, terus baca Pasal & Help biar kaga salah tingkah di tongkrongan. Warga ke-{count} resmi tercatat.';

export const DEFAULT_BYE =
  'Yah, {name} ({username}) cabut dari markas.\n\n' +
  'Yaudah deh, akses PunkID resmi ditutup & dihapus. Sisa warga di tongkrongan sekarang {count} orang.';

export const DEFAULT_PASAL =
  '📜 <b>PASAL & ATURAN TONGKRONGAN</b>\n\n' +
  '<blockquote>' +
  '<b>01. ATURAN TONGKRONGAN</b>\n' +
  '1. Toxic dan bercanda bebas sewajarnya. Dilarang membawa SARA, menghina personal, atau melewati batas.\n' +
  '2. Dilarang keras membuat CDC (Circle Dalam Circle), kubu-kubuan, atau memecah solidaritas grup.\n' +
  '3. Dilarang pilih-pilih teman, sengaja mengabaikan, atau mengucilkan sesama member.\n' +
  '4. Wajib saling menghargai. Bercanda boleh, tapi tetap tahu batas dan jangan gampang memancing konflik.' +
  '</blockquote>\n\n' +
  '<blockquote>' +
  '<b>02. AKTIVITAS & KETERTIBAN</b>\n' +
  '1. Dilarang numnam atau pasif total. Member tidak aktif akan dikeluarkan melalui cleaning berkala.\n' +
  '2. Member yang ingin keluar wajib izin atau pamit kepada pengurus terlebih dahulu.\n' +
  '3. Seluruh member wajib subscribe channel resmi dan aktif menggunakan bot PUNKSHIT.OS.\n' +
  '4. Dilarang membuat drama, menyebarkan konflik, atau mengganggu kenyamanan tongkrongan.\n' +
  '5. Setiap pelanggaran akan dikenakan teguran, peringatan, hingga dikeluarkan dari grup sesuai tingkat pelanggaran.' +
  '</blockquote>';

export const DEFAULT_HELP =
  '🆘 <b>PUSAT BANTUAN PUNKSHIT.OS</b>\n\n' +
  '<blockquote>' +
  '1. 🪪 Cetak identitas PunkID melalui menu utama WebApp.\n' +
  '2. 🎧 Request lagu Spotify melalui Radio Gang atau kirim MP3 ke PC Bot Mas Raka.\n' +
  '3. 🛒 Jual-beli barang dan jasa melalui Lapak Punkshit menggunakan PSC (ketik <code>/item nama</code> untuk pamer item di grup).\n' +
  '4. 🎮 Mainkan mini-game di Arena Gabut untuk mengumpulkan Arcade XP, naik level, dan klaim hadiah Arcade Pass.' +
  '</blockquote>\n\n' +
  '<i>Ketik /tutor untuk panduan lengkap setiap aplikasi di Mini App.</i>';

export function renderTutorMiniAppText(page = 'overview') {
  if (page === '1') {
    return (
      '🪪 <b>PANDUAN 1/4 · MARKAS, PUNKID & GIFT</b>\n\n' +
      '<blockquote>' +
      '<b>🏠 Markas & Absen Harian</b>\n' +
      '• Tap <b>Absen</b> tiap hari untuk kumpulin <b>PSC</b> & jaga <b>Streak</b>.\n' +
      '• Ganti <b>Presence</b> (<i>Nongki, Mabar, AFK, Nugas</i>) biar warga tahu statusmu.' +
      '</blockquote>\n\n' +
      '<blockquote>' +
      '<b>🎖️ Title Pangkat vs Role Tag</b>\n' +
      '• <b>Title (Pangkat):</b> Naik otomatis dari jumlah <b>Streak</b> (<i>Warga Baru → Anak Tongkrongan → Sepuh → Legenda</i>).\n' +
      '• <b>Role Tag:</b> Badge khusus pengurus (<i>Owner / Admin / Moderator</i>).' +
      '</blockquote>\n\n' +
      '<blockquote>' +
      '<b>🪪 Kartu PunkID 2 Sisi & Gudang Gift</b>\n' +
      '• <b>Tap Kartu:</b> Memutar kartu untuk lihat sisi belakang (Bio, Lagu Spotify, & Koleksi).\n' +
      '• <b>Border & Skin:</b> Klik <i>Equip</i> di Gudang untuk menghias avatar & kartu.\n' +
      '• <b>Fungsi Gift / Collectible:</b> Bisa di-<b>Pin</b> (maks. 6 gift) agar tampil di kartu PunkID, atau dikirim ke warga lain sebagai hadiah.\n' +
      '• <b>Ulang Tahun:</b> Klaim kado <b>+150 PSC & +5 Cred</b> di menu Warga tepat di hari-H!' +
      '</blockquote>'
    );
  }

  if (page === '2') {
    return (
      '💰 <b>PANDUAN 2/4 · EKONOMI, LAPAK & SPARK</b>\n\n' +
      '<blockquote>' +
      '<b>💳 Dompet PSC & Street Cred</b>\n' +
      '• <b>PSC:</b> Mata uang belanja & saweran antarwarga.\n' +
      '• <b>Street Cred:</b> Poin reputasi dari rajin absen, kirim hadiah, & ikut event.\n' +
      '• <b>Transfer & Gift:</b> Buka profil warga → pilih <b>Transfer PSC</b> atau <b>Kirim Gift</b> dari gudang (pengirim gift dapat <b>+2 Cred</b> & notif masuk langsung ke PC penerima).' +
      '</blockquote>\n\n' +
      '<blockquote>' +
      '<b>🛒 Lapak Rongsok vs Lapak Warga</b>\n' +
      '• <b>Lapak Rongsok:</b> Toko resmi (jual <i>Border, Card Skin, & Gift langka</i>).\n' +
      '• <b>Lapak Warga:</b> Pasar bebas—kamu bisa pasang dagangan/jasa sendiri dan dibayar pakai <b>PSC</b> oleh warga lain.\n' +
      '• <b>Pamer di Grup:</b> Ketik <code>/item nama_item</code> di grup untuk menampilkan preview item secara langsung.' +
      '</blockquote>\n\n' +
      '<blockquote>' +
      '<b>🔥 Spark Buddies (Maks. 3 Slot)</b>\n' +
      '• Undang partner lewat <code>@username</code> → partner ACC via bot / <code>/acc</code>.\n' +
      '• Setor harian lewat tombol di Spark Buddies atau ketik <code>/setor</code> (1x/hari) dan aktif chat bareng di grup untuk menaikkan <b>Spark Streak</b> (7 hari berturut-turut = kasus mingguan selesai + bonus <b>100 PSC</b>).' +
      '</blockquote>'
    );
  }

  if (page === '3') {
    return (
      '🕹️ <b>PANDUAN 3/4 · ARENA & SOSIAL WARGA</b>\n\n' +
      '<blockquote>' +
      '<b>🎮 Arena Gabut 2.0 (7 Mini-Games)</b>\n' +
      '• Mainkan <i>Mancing Galatama, Gosok Nasib, Mesin Rongsok, Reaction Rush, Punk Trivia, Gebuk Siapa,</i> & <i>Adu Ingatan</i>.\n' +
      '• Jual hasil tangkapan di tab <b>Koleksi</b> jadi <b>PSC</b>, klaim <b>Quest</b> untuk naik level <b>Arcade Pass</b>, & aktifkan <b>Spark Shield</b> jika punya pasangan Spark.' +
      '</blockquote>\n\n' +
      '<blockquote>' +
      '<b>👥 Fitur Sosial Menu Warga</b>\n' +
      '• <b>Daftar Warga:</b> Intip kartu PunkID, <b>👋 Sapa</b> (notif via PC), atau kirim hadiah.\n' +
      '• <b>🔎 Wanted Board:</b> Cari tim mabar/voice (auto-post grup, hangus <b>24 jam</b>).\n' +
      '• <b>📮 Kotak Rahasia:</b> Kirim Menfess anonim & balas arsipnya (arsip hangus <b>7 hari</b>).\n' +
      '• <b>🗳️ Sidang & 🎧 Radio:</b> Ikut voting polling & request lagu OS.\n' +
      '• <b>🏆 Klasemen:</b> Peringkat Top Sultan PSC, Street Cred, & Spark Streak.' +
      '</blockquote>'
    );
  }

  if (page === '4') {
    return (
      '🎭 <b>PANDUAN 4/4 · KALENDER, MUSEUM & DALANG</b>\n\n' +
      '<blockquote>' +
      '<b>📅 Kalender & Time Capsule</b>\n' +
      '• <b>Jadwal Event:</b> Cek agenda mabar/OS dan tekan <b>RSVP Hadir</b>.\n' +
      '• <b>Time Capsule:</b> Tulis pesan untuk masa depan dan kunci dengan tanggal buka (tersegel sampai hari-H tiba).' +
      '</blockquote>\n\n' +
      '<blockquote>' +
      '<b>🏛️ Museum & Buku Pasal</b>\n' +
      '• <b>Museum Markas:</b> Galeri arsip meme, foto, & momen ikonik tongkrongan.\n' +
      '• <b>Pasal Aturan:</b> Tata tertib resmi yang wajib dipatuhi warga.' +
      '</blockquote>\n\n' +
      '<blockquote>' +
      '<b>👁️ POV Pengurus (Ruang Dalang)</b>\n' +
      '• Menu eksklusif <i>Owner / Admin / Moderator</i> di Mini App:\n' +
      '  – Moderasi ACC / Tolak <b>Menfess</b> masuk & kurasi <b>Item Collab</b>.\n' +
      '  – Bekukan sementara akun warga bermasalah (<i>Freeze / Unfreeze</i>).\n' +
      '  – Ajukan hadiah/pencairan PSC warga (wajib ACC <b>Owner Markas</b> sebelum cair).' +
      '</blockquote>'
    );
  }

  return (
    '📱 <b>TUTOR MINI APP — PUNKSHIT.OS</b>\n\n' +
    'Pilih salah satu topik di bawah untuk melihat panduan lengkap sesuai fitur & peran kamu:\n\n' +
    '<blockquote>' +
    '• <b>🪪 PunkID & Gift:</b> Absen, Title otomatis, Kartu 2 sisi, Pin Gift, & Kado Ultah.\n' +
    '• <b>💰 Lapak & Spark:</b> Transfer PSC, Kirim Hadiah, Jualan, & Spark Buddies.\n' +
    '• <b>🕹️ Arena & Warga:</b> 7 Mini-Games, Wanted Board, Menfess, & Klasemen.\n' +
    '• <b>🎭 Event & Dalang:</b> Time Capsule, Museum, & akses Pengurus Markas.' +
    '</blockquote>'
  );
}

export function renderKamusText() {
  return (
    '📖 <b>KAMUS COMMAND WARGA — MAS RAKA</b>\n\n' +
    '<blockquote>' +
    '<b>1. Menu Utama & Panduan:</b>\n' +
    '• <code>/start</code> — Buka menu utama markas\n' +
    '• <code>/tutor</code> — Panduan lengkap semua fitur Mini App\n' +
    '• <code>/pasal</code> — Baca pasal & aturan tongkrongan\n' +
    '• <code>/help</code> — Pusat bantuan warga\n' +
    '• <code>/myid</code> — Cek Telegram ID akun kamu' +
    '</blockquote>\n\n' +
    '<blockquote>' +
    '<b>2. Lapak, Spark Buddies & Dompet:</b>\n' +
    '• <code>/item nama_item</code> — Pamer item Lapak Rongsok / Lapak Warga di grup\n' +
    '• <code>/spark</code> — Buka menu Spark Buddies\n' +
    '• <code>/setor</code> — Setor harian nyalain api Spark (1x/hari)\n' +
    '• <code>/acc</code> — Terima ajakan Spark yang masuk\n' +
    '• <code>/cekpsc</code> — Cek saldo PSC & Street Cred' +
    '</blockquote>\n\n' +
    '<blockquote>' +
    '<b>3. Radio Gang (OS):</b>\n' +
    '• <code>/antrean</code> — Cek daftar titipan lagu OS\n' +
    '• <code>/req Judul | Link</code> — Nitip lagu Spotify' +
    '</blockquote>'
  );
}

export function renderAdminCmdText(warehouseId, greetMedia, byeMedia) {
  return (
    '⚙️ <b>COMMAND ADMIN — KEAMANAN, EKONOMI & SYSTEM</b>\n\n' +
    '<blockquote>' +
    `• Grup ID: <code>${escHtml(ENV.GROUP_ID || 'Kosong')}</code>\n` +
    `• Channel ID: <code>${escHtml(ENV.CHANNEL_ID || 'Kosong')}</code>\n` +
    `• Gudang Musik: <b>${warehouseId ? 'Terhubung' : 'Belum Diset'}</b>\n` +
    `• Media Greet: <b>${greetMedia ? greetMedia.split(':')[0].toUpperCase() : 'Kosong'}</b> | Bye: <b>${byeMedia ? byeMedia.split(':')[0].toUpperCase() : 'Kosong'}</b>` +
    '</blockquote>\n\n' +
    '<b>Keamanan & Penertiban Warga:</b>\n' +
    '• <code>/freeze @username alasan</code> — Bekukan akun warga bermasalah\n' +
    '• <code>/unfreeze @username</code> — Pulihkan akun warga\n' +
    '• <code>/delwarga @username</code> — Hapus permanen PunkID (Khusus Owner)\n\n' +
    '<b>Ekonomi PSC & Role (Wajib Izin Owner):</b>\n' +
    '• <code>/givepsc @username 500 alasan</code> — Ajukan/cairkan PSC (Admin masuk antrean izin Owner)\n' +
    '• <code>/cekpsc @username</code> — Cek saldo & role warga\n' +
    '• <code>/setrole @username admin</code> — Atur role (Khusus Owner)\n\n' +
    '<b>Kurasi Lapak & Radio Gang:</b>\n' +
    '• <code>/list_collab</code> | <code>/acc_collab ID</code> | <code>/tolak_collab ID</code>\n' +
    '• <code>/restock ID stok</code> | <code>/hapus_lapak ID</code>\n' +
    '• <code>/done 12</code> | <code>/clearradio</code> — Kelola antrean Radio Gang\n\n' +
    '<b>Atur Sambutan Masuk (Greet) & Keluar (Bye):</b>\n' +
    '• <code>/setgreet teks baru</code> | <code>/setbye teks baru</code>\n' +
    '• <code>/setgreetmedia</code> | <code>/setbyemedia</code> (reply GIF/Stiker)\n' +
    '• <code>/delgreetmedia</code> | <code>/delbyemedia</code>\n' +
    '• <code>/setpasal teks</code> | <code>/sethelp teks</code>'
  );
}
