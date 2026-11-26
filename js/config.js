(function () {
  var params = new URLSearchParams(window.location.search);
  var apiFromUrl = params.get('api') || '';
  var routeParam = params.get('startapp') || '';

  var tgStart = '';
  try {
    tgStart = (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.start_param) || '';
  } catch (e) {}

  var rawStart = tgStart || routeParam;
  if (rawStart && rawStart.indexOf('__') !== -1) {
    var parts = rawStart.split('__');
    routeParam = parts[0];
    var encoded = parts[1] || '';
    if (encoded.indexOf('r_') === 0) {
      apiFromUrl = 'https://' + encoded.slice(2) + '.up.railway.app';
    } else {
      try {
        var b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
        var decodedUrl = atob(b64);
        if (decodedUrl && decodedUrl.indexOf('http') === 0) {
          apiFromUrl = decodedUrl;
        }
      } catch (e) {}
    }
  }

  if (apiFromUrl && apiFromUrl.indexOf('http') === 0) {
    try {
      localStorage.setItem('psk_api_url', apiFromUrl.replace(/\/$/, ''));
    } catch (e) {}
  }

  var savedApi = '';
  try {
    localStorage.removeItem('psk_spark_api');
    savedApi = localStorage.getItem('psk_api_url') || '';
  } catch (e) {}

  var env = window.__ENV__ || {};
  var finalApi = (savedApi || env.API_URL || '').replace(/\/$/, '');

  window.PUNK_CONFIG = {
    API_URL: finalApi,
    SPARK_API_URL: finalApi,
    INITIAL_ROUTE: routeParam,
    GROUP_URL: env.GROUP_URL || '',
    CHANNEL_URL: env.CHANNEL_URL || '',

    ICONS: {
      markas:     ['Markas',        '#8FC7FF', '#176BFF', 'M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z'],
      absen:      ['Absen',         '#FFE666', '#D97706', 'M12 2c1 4-2 6-2 9a4 4 0 008 0c0-2-1-4-1-6 3 2 5 5 5 9a10 10 0 11-20 0c0-5 4-9 10-12z'],
      spark:      ['Spark Buddies', '#FFD24A', '#EA580C', 'M13 2L4 14h7l-1 8 9-12h-7l1-8z'],
      kas:        ['Kas Rusuh',     '#93C5FD', '#1D4ED8', 'M3 7a3 3 0 013-3h12a3 3 0 013 3v10a3 3 0 01-3 3H6a3 3 0 01-3-3V7zm13 5a2 2 0 100 .01V12z'],
      lapak:      ['Lapak Rongsok', '#67E8F9', '#0E7490', 'M4 9l1.5-5h13L20 9v2a3 3 0 01-2 2.8V20H6v-6.2A3 3 0 014 11V9zm6 6v3h4v-3h-4z'],
      lapakwarga: ['Lapak Warga',   '#FDE047', '#CA8A04', 'M3 9l2-5h14l2 5v2a3 3 0 01-2 2.8V20H5v-6.2A3 3 0 013 11V9zm5 5v4h8v-4H8z'],
      arena:      ['Arena Gabut',   '#D8B4FE', '#7E22CE', 'M6 7h12a4 4 0 013.9 4.9l-1 4.5A2.5 2.5 0 0118.5 18c-1 0-1.8-.5-2.3-1.3L15 15H9l-1.2 1.7A2.6 2.6 0 015.5 18a2.5 2.5 0 01-2.4-1.6l-1-4.5A4 4 0 016 7zm2 3v2H6v2h2v2h2v-2h2v-2h-2v-2H8zm7.5 1a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4zm2.5 2a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z'],
      warga:      ['Warga Punk',    '#86EFAC', '#15803D', 'M9 11a4 4 0 100-8 4 4 0 000 8zm7 1a3 3 0 100-6 3 3 0 000 6zM2 19a6 6 0 0112 0v1H2v-1zm13 1v-1a6 6 0 00-1.3-3.7A5 5 0 0122 19v1h-7z'],
      fame:       ['Hall of Fame',  '#FDE047', '#B45309', 'M7 3h10v3h3v3a5 5 0 01-4.2 4.9A6 6 0 0113 16.9V19h4v2H7v-2h4v-2.1a6 6 0 01-2.8-3A5 5 0 014 9V6h3V3z'],
      kotak:      ['Kotak Rahasia', '#F9A8D4', '#BE185D', 'M4 5h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2zm0 2v.4l8 5.1 8-5.1V7H4z'],
      sidang:     ['Sidang Warga',  '#A5B4FC', '#4338CA', 'M18 3v18l-6-4H5a2 2 0 01-2-2V9a2 2 0 012-2h7l6-4zM6 17h3l1 4H7l-1-4z'],
      wanted:     ['Wanted Board',  '#FDBA74', '#C2410C', 'M10.5 3a7.5 7.5 0 015.9 12.1l4.7 4.7-1.4 1.4-4.7-4.7A7.5 7.5 0 1110.5 3zm0 2a5.5 5.5 0 100 11 5.5 5.5 0 000-11z'],
      radio:      ['Radio Gang',    '#5EEAD4', '#0F766E', 'M4 13a8 8 0 0116 0v6a2 2 0 01-2 2h-2v-7h2v-1a6 6 0 00-12 0v1h2v7H6a2 2 0 01-2-2v-6z'],
      event:      ['Event & Rusuh', '#FCA5A5', '#B91C1C', 'M7 2h2v2h6V2h2v2h3a2 2 0 012 2v14a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2h3V2zm13 8H4v10h16V10z'],
      meme:       ['Meme Board',    '#7DD3FC', '#0369A1', 'M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm4.5 4a1.8 1.8 0 100 3.6 1.8 1.8 0 000-3.6zM4 17h16l-5-6.5-4 5-2.5-3L4 17z'],
      museum:     ['Museum Markas', '#FCD34D', '#B45309', 'M12 2L2 7v2h20V7L12 2zm-7 9v7H3v2h18v-2h-2v-7h-2v7h-3v-7h-2v7H9v-7H7v7H5v-7H5z'],
      misi:       ['Misi Jalanan',  '#BEF264', '#4D7C0F', 'M9 2h6v2h4a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2h4V2zm1.5 13.6l6.2-6.2-1.4-1.4-4.8 4.8-2.3-2.3-1.4 1.4 3.7 3.7z'],
      kapsul:     ['Time Capsule',  '#CBD5E1', '#334155', 'M6 2h12v3l-4 5 4 5v7H6v-7l4-5-4-5V2zm3 15v3h6v-3l-3-3.8L9 17z'],
      rules:      ['Pasal & Help',  '#94A3B8', '#1E293B', 'M12 2l8 3.5v6.2c0 5.1-3.4 9.7-8 11.3-4.6-1.6-8-6.2-8-11.3V5.5L12 2zm-1 6v6h2V8h-2zm0 8v2h2v-2h-2z'],
      dalang:     ['Ruang Dalang',  '#FDE047', '#DC2626', 'M3 18l2-11 7 5 7-5 2 11H3zm2 2h14v2H5v-2z'],
      gue:        ['PunkID Gue',    '#FFE666', '#EAB308', 'M12 12a5 5 0 100-10 5 5 0 000 10zm-8 9a8 8 0 0116 0H4z'],
      group:      ['Grup Markas',   '#86EFAC', '#16A34A', 'M4 4h16a2 2 0 012 2v10a2 2 0 01-2 2H8l-4 4V6a2 2 0 012-2z'],
      channel:    ['Channel Info',  '#67E8F9', '#0284C7', 'M21 4L3 11.2l6.2 2.2L17.8 7l-6.6 7.6 5.4 2.1L21 4zM9 15.2V20l2.8-3.4L9 15.2z']
    },

    BASE_GRID: [
      'absen', 'spark', 'kas', 'lapak',
      'lapakwarga', 'arena', 'warga', 'fame',
      'kotak', 'sidang', 'wanted', 'radio',
      'event', 'meme', 'museum', 'misi',
      'kapsul', 'rules'
    ],

    DOCK: ['markas', 'gue', 'group', 'channel'],

    RING_NAMES: ['Biru Neon', 'Emas', 'Hijau Toxic', 'Ungu Cyber'],

    DEFAULT_ITEMS: [
      {
        id: 'def-crown',
        type: 'gift',
        name: 'Mahkota Rongsok',
        price: 50,
        rarity: 'rare',
        colors: ['#FFE666', '#D97706'],
        svgPath: 'M15 75 L25 30 L50 52 L75 30 L85 75 Z M15 80 H85 V88 H15 Z'
      }
    ],

    PRESENCE_LIST: [
      '⚡ Lagi Banyak Energi',
      '🎧 Lost in Playlist',
      '🎮 Butuh Party',
      '☕ Ngopi & Nyimak',
      '💸 Financially AFK',
      '👻 Menghilang dari Radar',
      '💬 Open Buat Ngobrol',
      '🫠 Social Battery 1%',
      '💤 AFK Sebentar',
      '👀 Cuma Jadi CCTV',
      '💌 Open Mutualan',
      '🌙 Penghuni Jam Rawan'
    ]
  };
})();
