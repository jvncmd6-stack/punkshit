window.PunkCore = (function () {
  var CFG = window.PUNK_CONFIG;
  var API = window.PunkAPI;
  var tg = window.Telegram && window.Telegram.WebApp;
  var $ = function (id) { return document.getElementById(id); };

  // State Global Tersinkronisasi dengan Railway
  var S = {
    user: null,          // Data user + auto-sync Telegram (name, username, photoUrl, bannerUrl, role, psc, streak, best, cred, presence)
    inv: [],             // Inventory item milik user
    catalog: [],         // Katalog dinamis Lapak Rongsok (Gift, Border, Skin, Badge) dari server
    onlineUsers: [],     // Daftar warga "Siapa yang Masih Hidup?"
    feed: [],            // Live feed aktivitas grup & Mas Raka
    missions: [],        // Misi harian & mingguan
    events: [],          // Kalender Kekacauan
    wanted: [],          // Wanted Board
    polls: [],           // Sidang Warga
    curApp: '',
    curTab: {}
  };

  var Views = {};
  var banTimer = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return '&#' + c.charCodeAt(0) + ';';
    });
  }

  function rankInfo(streak) {
    var n = Number(streak) || 0;
    if (n >= 60) return { title: '👑 Fosil Punkshit', bonus: 15 };
    if (n >= 30) return { title: '🔥 Biang Kerok', bonus: 10 };
    if (n >= 14) return { title: '🧨 Tukang Rusuh', bonus: 7 };
    if (n >= 7)  return { title: '☕ Warga Tetap', bonus: 5 };
    if (n >= 4)  return { title: '🚬 Anak Gang', bonus: 3 };
    return { title: '🌱 Mayat Baru', bonus: 2 };
  }

  // Render Ikon Aplikasi
  function ico(id) {
    var i = CFG.ICONS[id] || CFG.ICONS.markas;
    return '<div class="ic" style="--a:' + i[1] + ';--b:' + i[2] + '"><svg viewBox="0 0 24 24"><path d="' + i[3] + '"/></svg></div>';
  }

  // Cari Item dari Katalog Server atau Default
  function findItem(id) {
    var all = (S.catalog && S.catalog.length) ? S.catalog : CFG.DEFAULT_ITEMS;
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) return all[i];
    }
    return CFG.DEFAULT_ITEMS[0];
  }

  // Render Visual Item (Mendukung Gambar/GIF Upload dari Admin MAUPUN 3D SVG Layer)
  function renderItemVisual(item, size, draggable) {
    if (!item) return '';
    var dragAttr = draggable ? ' data-d' : '';
    if (item.imageUrl) {
      var src = esc(API.assetUrl(item.imageUrl));
      return '<div class="g3"' + dragAttr + ' style="--s:' + size + 'px;--gl:#8FC7FF66"><div class="rot"><img src="' + src + '" alt="' + esc(item.name) + '"></div></div>';
    }
    var cols = item.colors || ['#cfeaff', '#176BFF'];
    var d = item.svgPath || CFG.DEFAULT_ITEMS[0].svgPath;
    var layers = '';
    for (var i = 0; i < 10; i++) {
      var t = Math.round((i / 9) * 100);
      var z = ((i - 4.5) * 0.014).toFixed(3);
      var stroke = (i === 9) ? ' stroke="#fff" stroke-opacity=".75" stroke-width="2.5" stroke-linejoin="round"' : '';
      layers += '<svg viewBox="0 0 100 100" style="transform:translateZ(calc(var(--s)*' + z + '))"><path d="' + d + '" fill="color-mix(in srgb,' + cols[0] + ' ' + t + '%,' + cols[1] + ')"' + stroke + '/></svg>';
    }
    return '<div class="g3"' + dragAttr + ' style="--s:' + size + 'px;--gl:' + cols[1] + '99"><div class="rot">' + layers + '</div></div>';
  }

  // Render Avatar Telegram Otomatis + Lapisan Discord-Style Border
  function renderAvatar(u, mode) {
    if (!u) return '';
    var initial = esc((u.name || '?')[0].toUpperCase());
    var photo = u.photoUrl ? '<img class="pfp" src="' + esc(API.assetUrl(u.photoUrl)) + '" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'">' : '';
    var fallback = '<span style="' + (u.photoUrl ? 'display:none' : '') + '">' + initial + '</span>';

    // Cek apakah user memakai Discord-style Avatar Border dari Lapak
    var borderHtml = '';
    if (u.equippedBorderUrl) {
      borderHtml = '<img class="dc-border" src="' + esc(API.assetUrl(u.equippedBorderUrl)) + '" alt="">';
    }

    if (mode === 'mini') {
      return '<div class="mini-av">' + photo + fallback + borderHtml + '</div>';
    }
    var ringCls = 'r' + (Number(u.ringStyle) || 0);
    return '<div class="av-wrap"><div class="ring ' + ringCls + '">' + photo + fallback + '</div>' + borderHtml + '</div>';
  }

  // Drag-to-Spin 3D Controller
  function bindDrag(root) {
    if (!root) return;
    root.querySelectorAll('.g3[data-d]').forEach(function (g) {
      var o = g.firstChild, x, y, ry = 0, rx = 0, on = 0, tm;
      g.onpointerdown = function (e) {
        on = 1; x = e.clientX; y = e.clientY;
        clearTimeout(tm); o.style.animation = 'none';
        g.setPointerCapture(e.pointerId);
      };
      g.onpointermove = function (e) {
        if (!on) return;
        ry += (e.clientX - x) * 0.9;
        rx -= (e.clientY - y) * 0.9;
        x = e.clientX; y = e.clientY;
        o.style.transform = 'rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
      };
      g.onpointerup = g.onpointercancel = function () {
        on = 0;
        tm = setTimeout(function () { o.style.animation = ''; o.style.transform = ''; }, 2400);
      };
    });
  }

  // Banner Notifikasi Mas Raka
  function notify(who, tag, txt) {
    var b = $('ban');
    b.innerHTML =
      '<div class="ic" style="--a:#FFD633;--b:#c28a00" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3v3M5 9h14v9a2 2 0 01-2 2H7a2 2 0 01-2-2zM9 13h.01M15 13h.01M9 16.5h6"/></svg></div>' +
      '<div><b>' + esc(who) + '<em>' + esc(tag) + '</em></b><span>' + esc(txt) + '</span></div>';
    b.classList.add('on');
    clearTimeout(banTimer);
    banTimer = setTimeout(function () { b.classList.remove('on'); }, 4200);
  }

  // Bottom Sheet Modal
  function sheet(html) {
    $('sh').innerHTML = '<div class="grab"></div>' + html;
    $('sh').classList.add('open');
    $('scr').classList.add('open');
    bindDrag($('sh'));
  }

  function shut() {
    $('sh').classList.remove('open');
    $('scr').classList.remove('open');
  }

  // Render Home Screen (Otomatis munculkan Ruang Dalang jika Owner/Admin/Moderator)
  function renderHome() {
    var gridList = CFG.BASE_GRID.slice();
    var role = S.user && S.user.role;
    if (role === 'owner' || role === 'admin' || role === 'moderator') {
      gridList.push('dalang');
    }

    $('grid').innerHTML = gridList.map(function (id) {
      return '<button class="app" data-act="app" data-id="' + id + '">' + ico(id) + '<span>' + CFG.ICONS[id][0] + '</span></button>';
    }).join('');

    $('dock').innerHTML = CFG.DOCK.map(function (id) {
      return '<button class="app" data-act="app" data-id="' + id + '" aria-label="' + CFG.ICONS[id][0] + '">' + ico(id) + '</button>';
    }).join('');

    if (S.user) {
      $('wp').textContent = S.user.psc || 0;
      $('ws').textContent = 'Streak ' + (S.user.streak || 0) + ' hari';
    }

    var online = S.onlineUsers || [];
    $('wc').textContent = online.length + ' warga nongki di markas';
    var colors = ['#FFD633', '#8FC7FF', '#34C759', '#FF9ad5', '#c8b6ff'];
    $('wf').innerHTML = online.slice(0, 5).map(function (w, idx) {
      if (w.photoUrl) {
        return '<img src="' + esc(API.assetUrl(w.photoUrl)) + '" alt="">';
      }
      return '<i style="background:' + colors[idx % colors.length] + '">' + esc((w.name || '?')[0].toUpperCase()) + '</i>';
    }).join('') || '<i style="background:#FFD633">P</i>';
  }

  // Buka Modul Aplikasi
  function openApp(id, el) {
    if (!S.user) {
      $('home').classList.remove('shake');
      void $('home').offsetWidth;
      $('home').classList.add('shake');
      return openWelcomeSheet();
    }
    S.curApp = id;
    var av = $('av');
    if (el) {
      var a = el.getBoundingClientRect(), p = $('ph').getBoundingClientRect();
      av.style.transformOrigin = (a.left + a.width / 2 - p.left) + 'px ' + (a.top + a.height / 2 - p.top) + 'px';
    }
    var meta = CFG.ICONS[id] || [id];
    $('lt').textContent = $('nt').textContent = meta[0];
    $('nav-extra').innerHTML = '';
    $('bd').innerHTML = Views[id] ? Views[id]() : '<div class="emp">' + ico(id) + 'Modul dalam pengembangan.</div>';
    bindDrag($('bd'));
    $('sc').scrollTop = 0;
    $('nav').classList.remove('s');
    av.classList.add('open');
    $('home').classList.add('bk');
  }

  function refresh() {
    if (S.curApp && Views[S.curApp]) {
      $('bd').innerHTML = Views[S.curApp]();
      bindDrag($('bd'));
    }
    renderHome();
  }

  // Sheet Registrasi Otomatis Terhubung Akun Telegram
  function openWelcomeSheet() {
    var tgUser = (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) || {};
    var defName = ((tgUser.first_name || '') + ' ' + (tgUser.last_name || '')).trim() || 'Warga Baru';
    sheet(
      '<h1>NEW CHARACTER UNLOCKED!</h1>' +
      '<p class="sub">Akun Telegram lo otomatis terdeteksi. Konfirmasi nama tongkrongan buat cetak <i>PunkID</i> resmi.</p>' +
      '<label for="nk">NAMA TONGKRONGAN (AUTO-SYNC TELE)</label>' +
      '<input id="nk" maxlength="24" value="' + esc(defName.slice(0, 24)) + '" autocomplete="off">' +
      '<button class="btn" data-act="core-reg">AKTIFKAN PUNKID</button>'
    );
  }

  // Sinkronisasi Awal dari Railway Server
  async function syncFromServer(silent) {
    try {
      var data = await API.get('/api/me');
      if (data.user) {
        S.user = data.user;
        S.inv = data.inv || [];
        S.catalog = data.catalog || CFG.DEFAULT_ITEMS;
        S.onlineUsers = data.onlineUsers || [];
        S.feed = data.feed || [];
        S.missions = data.missions || [];
        S.events = data.events || [];
        S.wanted = data.wanted || [];
        S.polls = data.polls || [];
        refresh();
        if (!silent) {
          // Cek parameter deep link ?startapp=...
          var data = await API.get('/api/me');
      if (data.config) {
        CFG.GROUP_URL = data.config.groupUrl || '';
        CFG.CHANNEL_URL = data.config.channelUrl || '';
      }
          var startParam = tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param;
          if (startParam && CFG.ICONS[startParam]) {
            openApp(startParam);
          }
        }
      } else {
        S.catalog = data.catalog || CFG.DEFAULT_ITEMS;
        renderHome();
        openWelcomeSheet();
      }
    } catch (err) {
      renderHome();
      if (!silent) {
        notify('Mas Raka', 'Offline Mode', 'Gagal terhubung ke Railway. Pastikan API_URL sudah benar.');
      }
    }
  }

  // Global Event Listeners
  document.addEventListener('click', async function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var act = t.getAttribute('data-act');

    if (act === 'app') {
      openApp(t.getAttribute('data-id'), t);
    } else if (act === 'close') {
      $('av').classList.remove('open');
      $('home').classList.remove('bk');
      S.curApp = '';
    } else if (act === 'shut') {
      shut();
    } else if (act === 'core-reg') {
      var name = ($('nk').value || '').trim();
      if (name.length < 2) return;
      t.disabled = true;
      try {
        var res = await API.post('/api/register', { name: name });
        S.user = res.user;
        S.inv = res.inv || [];
        shut();
        refresh();
        notify('Mas Raka', '→ Grup Punkshit', 'NEW CHARACTER UNLOCKED! ' + S.user.name + ' resmi jadi warga.');
        setTimeout(function () { openApp('gue'); }, 600);
      } catch (err) {
        t.disabled = false;
        notify('Mas Raka', 'Error', err.message);
      }
    } else if (act === 'search') {
      openApp('warga');
    }
  });

  $('sc').onscroll = function () {
    $('nav').classList.toggle('s', $('sc').scrollTop > 34);
  };

  function tickClock() {
    var d = new Date();
    $('clk').textContent = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  tickClock();
  setInterval(tickClock, 20000);

  // Inisialisasi Telegram WebApp
  try {
    if (tg) {
      tg.ready();
      tg.expand();
      if (tg.setHeaderColor) tg.setHeaderColor('#0a0f1c');
    }
  } catch (e) {}

  renderHome();
  syncFromServer(false);

  return {
    S: S,
    Views: Views,
    esc: esc,
    ico: ico,
    rankInfo: rankInfo,
    findItem: findItem,
    renderItemVisual: renderItemVisual,
    renderAvatar: renderAvatar,
    bindDrag: bindDrag,
    notify: notify,
    sheet: sheet,
    shut: shut,
    openApp: openApp,
    refresh: refresh,
    sync: syncFromServer
  };
})();
