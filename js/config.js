(function () {
  var params = new URLSearchParams(window.location.search);
  var apiFromUrl = params.get('api');
  var routeParam = params.get('startapp') || '';

  // Cek juga parameter startapp dari Telegram WebApp (ketika dibuka dari tombol Grup/Channel)
  var tgStart = (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.start_param) || '';
  var rawStart = tgStart || routeParam;

  if (rawStart && rawStart.indexOf('__') !== -1) {
    var parts = rawStart.split('__');
    routeParam = parts[0];
    try {
      var b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      var decodedApi = atob(b64);
      if (decodedApi && decodedApi.indexOf('http') === 0) {
        apiFromUrl = decodedApi;
      }
    } catch (e) {}
  }

  if (apiFromUrl) {
    localStorage.setItem('psk_api_url', apiFromUrl.replace(/\/$/, ''));
  }

  var savedApi = localStorage.getItem('psk_api_url') || '';

  window.PUNK_CONFIG = {
    API_URL: savedApi,
    INITIAL_ROUTE: routeParam,
    GROUP_URL: '',
    CHANNEL_URL: '',

    ICONS: {
      absen:    '<svg viewBox="0 0 24 24"><path d="M12 2c1 4-2 6-2 9a4 4 0 008 0c0-2-1-4-1-6 3 2 5 5 5 9a10 10 0 11-20 0c0-5 4-9 10-12z"/></svg>',
      kas:      '<svg viewBox="0 0 24 24"><path d="M3 7a3 3 0 013-3h12a3 3 0 013 3v10a3 3 0 01-3 3H6a3 3 0 01-3-3V7zm13 5a2 2 0 100 .01V12z"/></svg>',
      lapak:    '<svg viewBox="0 0 24 24"><path d="M4 9l1.5-5h13L20 9v2a3 3 0 01-2 2.8V20H6v-6.2A3 3 0 014 11V9zm6 6v3h4v-3h-4z"/></svg>',
      arena:    '<svg viewBox="0 0 24 24"><path d="M6 7h12a4 4 0 013.9 4.9l-1 4.5A2.5 2.5 0 0118.5 18c-1 0-1.8-.5-2.3-1.3L15 15H9l-1.2 1.7A2.6 2.6 0 015.5 18a2.5 2.5 0 01-2.4-1.6l-1-4.5A4 4 0 016 7zm2 3v2H6v2h2v2h2v-2h2v-2h-2v-2H8zm7.5 1a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4zm2.5 2a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z"/></svg>',
      warga:    '<svg viewBox="0 0 24 24"><path d="M9 11a4 4 0 100-8 4 4 0 000 8zm7 1a3 3 0 100-6 3 3 0 000 6zM2 19a6 6 0 0112 0v1H2v-1zm13 1v-1a6 6 0 00-1.3-3.7A5 5 0 0122 19v1h-7z"/></svg>',
      fame:     '<svg viewBox="0 0 24 24"><path d="M7 3h10v3h3v3a5 5 0 01-4.2 4.9A6 6 0 0113 16.9V19h4v2H7v-2h4v-2.1a6 6 0 01-2.8-3A5 5 0 014 9V6h3V3z"/></svg>',
      kotak:    '<svg viewBox="0 0 24 24"><path d="M4 5h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2zm0 2v.4l8 5.1 8-5.1V7H4z"/></svg>',
      sidang:   '<svg viewBox="0 0 24 24"><path d="M18 3v18l-6-4H5a2 2 0 01-2-2V9a2 2 0 012-2h7l6-4zM6 17h3l1 4H7l-1-4z"/></svg>',
      wanted:   '<svg viewBox="0 0 24 24"><path d="M10.5 3a7.5 7.5 0 015.9 12.1l4.7 4.7-1.4 1.4-4.7-4.7A7.5 7.5 0 1110.5 3zm0 2a5.5 5.5 0 100 11 5.5 5.5 0 000-11z"/></svg>',
      radio:    '<svg viewBox="0 0 24 24"><path d="M4 13a8 8 0 0116 0v6a2 2 0 01-2 2h-2v-7h2v-1a6 6 0 00-12 0v1h2v7H6a2 2 0 01-2-2v-6z"/></svg>',
      event:    '<svg viewBox="0 0 24 24"><path d="M7 2h2v2h6V2h2v2h3a2 2 0 012 2v14a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2h3V2zm13 8H4v10h16V10z"/></svg>',
      meme:     '<svg viewBox="0 0 24 24"><path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm4.5 4a1.8 1.8 0 100 3.6 1.8 1.8 0 000-3.6zM4 17h16l-5-6.5-4 5-2.5-3L4 17z"/></svg>',
      misi:     '<svg viewBox="0 0 24 24"><path d="M9 2h6v2h4a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2h4V2zm1.5 13.6l6.2-6.2-1.4-1.4-4.8 4.8-2.3-2.3-1.4 1.4 3.7 3.7z"/></svg>',
      kapsul:   '<svg viewBox="0 0 24 24"><path d="M6 2h12v3l-4 5 4 5v7H6v-7l4-5-4-5V2zm3 15v3h6v-3l-3-3.8L9 17z"/></svg>',
      rules:    '<svg viewBox="0 0 24 24"><path d="M12 2l8 3.5v6.2c0 5.1-3.4 9.7-8 11.3-4.6-1.6-8-6.2-8-11.3V5.5L12 2zm-1 6v6h2V8h-2zm0 8v2h2v-2h-2z"/></svg>',
      dalang:   '<svg viewBox="0 0 24 24"><path d="M3 18l2-11 7 5 7-5 2 11H3zm2 2h14v2H5v-2z"/></svg>',
      home:     '<svg viewBox="0 0 24 24"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg>',
      user:     '<svg viewBox="0 0 24 24"><path d="M12 12a5 5 0 100-10 5 5 0 000 10zm-8 9a8 8 0 0116 0H4z"/></svg>',
      group:    '<svg viewBox="0 0 24 24"><path d="M4 4h16a2 2 0 012 2v10a2 2 0 01-2 2H8l-4 4V6a2 2 0 012-2z"/></svg>',
      channel:  '<svg viewBox="0 0 24 24"><path d="M21 4L3 11.2l6.2 2.2L17.8 7l-6.6 7.6 5.4 2.1L21 4zM9 15.2V20l2.8-3.4L9 15.2z"/></svg>',
      qr:       '<svg viewBox="0 0 24 24"><path d="M3 3h7v7H3V3zm2 2v3h3V5H5zm9-2h7v7h-7V3zm2 2v3h3V5h-3zM3 14h7v7H3v-7zm2 2v3h3v-3H5zm9-2h3v3h-3v-3zm4 0h3v3h-3v-3zm-4 4h3v3h-3v-3zm4 0h3v3h-3v-3z"/></svg>',
      spotify:  '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.5 14.4a.6.6 0 01-.8.2c-2.3-1.4-5.2-1.7-8.6-.9a.6.6 0 11-.3-1.2c3.8-.8 7-.5 9.5 1.1.3.2.4.6.2.8zm1.2-2.7a.8.8 0 01-1.1.3c-2.6-1.6-6.6-2.1-9.7-1.1a.8.8 0 11-.5-1.5c3.5-1.1 7.9-.5 10.9 1.3.4.2.5.7.4 1zm.1-2.8C14.6 9 9.4 8.8 6.4 9.7a.9.9 0 11-.5-1.8c3.5-1 9.2-.8 12.8 1.3a.9.9 0 01-.9 1.7z"/></svg>',
      bell:     '<svg viewBox="0 0 24 24"><path d="M12 2a6 6 0 016 6v5l2 2v1H4v-1l2-2V8a6 6 0 016-6zm-2 16h4a2 2 0 01-4 0z"/></svg>'
    },

    BASE_GRID: [
      { id: 'absen',  label: 'Absen Nyawa',  color: 'c-yellow', badgeKey: 'absen' },
      { id: 'kas',    label: 'Kas Rusuh',    color: 'c-blue' },
      { id: 'lapak',  label: 'Lapak Rongsok',color: 'c-cyan' },
      { id: 'arena',  label: 'Arena Gabut',  color: 'c-purple', badgeKey: 'arena' },
      { id: 'warga',  label: 'Warga Punk',   color: 'c-green' },
      { id: 'fame',   label: 'Hall of Fame', color: 'c-amber' },
      { id: 'kotak',  label: 'Kotak Rahasia',color: 'c-pink' },
      { id: 'sidang', label: 'Sidang Warga', color: 'c-indigo' },
      { id: 'wanted', label: 'Wanted Board', color: 'c-orange' },
      { id: 'radio',  label: 'Radio Gang',   color: 'c-teal' },
      { id: 'event',  label: 'Event & Rusuh',color: 'c-red' },
      { id: 'meme',   label: 'Meme Board',   color: 'c-sky' },
      { id: 'misi',   label: 'Misi Jalanan', color: 'c-lime' },
      { id: 'kapsul', label: 'Time Capsule', color: 'c-slate' },
      { id: 'rules',  label: 'Pasal & Help', color: 'c-dark' }
    ],

    DOCK: [
      { id: 'home',    label: 'Markas',  icon: 'home',    color: 'c-blue' },
      { id: 'gue',     label: 'Gue',     icon: 'user',    color: 'c-yellow' },
      { id: 'group',   label: 'Grup',    icon: 'group',   color: 'c-green', external: 'GROUP_URL' },
      { id: 'channel', label: 'Channel', icon: 'channel', color: 'c-cyan',  external: 'CHANNEL_URL' }
    ],

    PRESENCE_LIST: [
      '☕ Nongki Dulu',
      '🎮 Gas Mabar',
      '💀 Lagi Buntu',
      '🎧 Dengerin Lagu',
      '🚬 Butuh Asupan',
      '😴 mode Mayat'
    ]
  };
})();
