window.PUNK_CONFIG = {
  // Ganti dengan URL deploy Railway Anda (tanpa garis miring di akhir)
  API_URL: 'https://GANTI-INI.up.railway.app',

  // Tautan Grup & Channel untuk tombol navigasi cepat
  GROUP_URL: 'https://t.me/punkshit_group',
  CHANNEL_URL: 'https://t.me/punkshit_channel',

  // Konfigurasi Ikon Aplikasi (10 Modul + Ruang Dalang untuk Admin/Owner)
  ICONS: {
    markas:  ['Markas', '#3b8bff', '#0b3fae', 'M3 11l9-8 9 8M5 9.5V20h14V9.5M10 20v-6h4v6'],
    warga:   ['Warga', '#34C759', '#12803a', 'M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6M16.5 4.5a3 3 0 010 6M18 14c2 .6 3.5 2.6 3.5 5.5'],
    arena:   ['Arena', '#AF52DE', '#5b2490', 'M6 8h12a4 4 0 014 4v3a3 3 0 01-5.2 2L15 15H9l-1.8 2A3 3 0 012 15v-3a4 4 0 014-4zM7 10.5v3M5.5 12h3M16 11h.01M18 13h.01'],
    lapak:   ['Lapak', '#FF9500', '#c24f00', 'M4 8h16v4H4zM5 12v8h14v-8M12 8v12M12 8C10 3.5 6 4.5 7.5 8M12 8c2-4.5 6-3.5 4.5 0'],
    misi:    ['Misi Rusuh', '#FF453A', '#9a1810', 'M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 .5-3-1-5 1-8.5z'],
    kas:     ['Dompet', '#FFD633', '#c28a00', 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v10M14.5 9.5h-3.5a1.7 1.7 0 000 3.4h2a1.7 1.7 0 010 3.4H9.5'],
    event:   ['Kalender', '#5AC8FA', '#1565c0', 'M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2zM3 10h18M8 3v4M16 3v4'],
    radio:   ['Radio Gang', '#FF2D55', '#8f1034', 'M4 15v-3a8 8 0 0116 0v3M4 14h3v6H5.5A1.5 1.5 0 014 18.5zM20 14h-3v6h1.5a1.5 1.5 0 001.5-1.5z'],
    wanted:  ['Wanted', '#8E8E93', '#3a3a3c', 'M11 4a7 7 0 100 14 7 7 0 000-14zM16 16l5 5'],
    museum:  ['Museum', '#4f6bff', '#16203f', 'M3 8h4l2-3h6l2 3h4v12H3zM12 10a3.5 3.5 0 100 7 3.5 3.5 0 000-7z'],
    fame:    ['Hall of Fame', '#FFCC00', '#ff7a00', 'M7 4h10v5a5 5 0 01-10 0zM7 6H4v1a3 3 0 003 3M17 6h3v1a3 3 0 01-3 3M12 14v4M8 20h8'],
    gue:     ['Gue', '#64D2FF', '#176BFF', 'M12 4a4 4 0 100 8 4 4 0 000-8zM4 21c0-4 3.5-7 8-7s8 3 8 7'],
    absen:   ['Absen', '#34C759', '#0f6e32', 'M12 3a9 9 0 100 18 9 9 0 000-18zM8 12l3 3 5-6'],
    sidang:  ['Sidang', '#FF9F0A', '#b04a00', 'M5 20V11M12 20V4M19 20v-6'],
    kotak:   ['Kotak Rahasia', '#5E5CE6', '#2a2a8a', 'M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zM3 7l9 7 9-7'],
    meme:    ['Meme Board', '#FF6AC1', '#a0207a', 'M12 3a9 9 0 100 18 9 9 0 000-18zM8.5 14a4.5 4 0 007 0M9 10h.01M15 10h.01'],
    dalang:  ['Ruang Dalang', '#FF3B30', '#1c1c1e', 'M12 2l3 6 6 .9-4.5 4.4 1 6.2L12 16.5 6.5 19.5l1-6.2L3 8.9 9 8z']
  },

  // Susunan Grid & Dock Default
  BASE_GRID: ['absen', 'misi', 'kas', 'arena', 'event', 'radio', 'wanted', 'sidang', 'kotak', 'meme', 'museum', 'fame'],
  DOCK: ['markas', 'warga', 'lapak', 'gue'],

  // 14 Status "Siapa yang Masih Hidup?" (Bab III - 3.2)
  PRESENCE_LIST: [
    { e: '☕', t: 'Nongki Dulu', d: 'Siap ngobrol' },
    { e: '🎮', t: 'Gas Mabar', d: 'Cari teman main' },
    { e: '🎧', t: 'Mode Budeg', d: 'Lagi denger musik' },
    { e: '💤', t: 'Mati Suri', d: 'AFK' },
    { e: '💻', t: 'Sok Sibuk', d: 'Nugas atau kerja' },
    { e: '🔥', t: 'Cari Ribut', d: 'Siap ikut keseruan' },
    { e: '👀', t: 'Cuma Nyimak', d: 'Silent reader' },
    { e: '💌', t: 'Cari Ayang', d: 'Open kenalan' },
    { e: '🌙', t: 'Night Owl', d: 'Aktif malam' },
    { e: '🎬', t: 'Movie Time', d: 'Lagi nonton' },
    { e: '📸', t: 'Cari Partner JJ', d: 'Mau bikin konten' },
    { e: '🚪', t: 'Keluyuran', d: 'Sedang ada aktivitas lain' },
    { e: '🫠', t: 'Loading Dulu', d: 'Lagi bingung mau ngapain' },
    { e: '🍜', t: 'Isi Bensin', d: 'Lagi makan' }
  ],

  // Fallback Item Bawaan (Jika server belum menambah item dinamis)
  DEFAULT_ITEMS: [
    { id: 'heart', type: 'gift', name: 'Chrome Heart', price: 50, rarity: 'Rare', desc: 'Hati krom buat yang spesial.', colors: ['#cfeaff', '#176BFF'], svgPath: 'M50 88C18 64 8 46 8 33a21 21 0 0142-5 21 21 0 0142 5c0 13-10 31-42 55z' },
    { id: 'bolt', type: 'gift', name: 'Neon Bolt', price: 80, rarity: 'Rare', desc: 'Kilat buat yang selalu on fire.', colors: ['#fff7a0', '#ffb800'], svgPath: 'M60 4L18 56h27l-7 40 44-56H55z' },
    { id: 'star', type: 'gift', name: 'Punk Star', price: 120, rarity: 'Epic', desc: 'Bintang jalanan, bersinar di gang.', colors: ['#ffb3e6', '#9a3cff'], svgPath: 'M50 6l13 28 30 3-22 21 7 30-28-16-28 16 7-30L7 37l30-3z' },
    { id: 'fish', type: 'gift', name: 'Golden Punkfish', price: 300, rarity: 'Legendary', desc: 'Ikan emas langka. Main character luck.', colors: ['#fff3b0', '#e09a00'], svgPath: 'M5 50C22 22 52 20 70 43l23-19v52L70 57C52 80 22 78 5 50z' },
    { id: 'crown', type: 'gift', name: 'Fosil Crown', price: 500, rarity: 'Legendary', desc: 'Mahkota buat fosil sejati markas.', colors: ['#c8f7ff', '#1e8ab8'], svgPath: 'M8 80V28l24 24 18-34 18 34 24-24v52z' }
  ],

  RING_NAMES: ['Polos', 'Emas', 'Neon', 'Pelangi']
};
