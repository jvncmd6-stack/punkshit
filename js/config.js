window.PunkCore = (function () {
  var CFG = window.PUNK_CONFIG;
  var API = window.PunkAPI;
  var tg = window.Telegram && window.Telegram.WebApp;
  var $ = function (id) { return document.getElementById(id); };

  var S = {
    user: null,
    inv: [],
    catalog: [],
    onlineUsers: [],
    feed: [],
    missions: [],
    events: [],
    wanted: [],
    polls: [],
    market: [],
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

  function ico(id) {
    var i = (CFG.ICONS && CFG.ICONS[id]) || ['App', '#8FC7FF', '#176BFF', 'M12 2L2 7l10 5 10-5-10-5z'];
    return '<div class="ic" style="--a:' + i[1] + ';--b:' + i[2] + '"><svg viewBox="0 0 24 24"><path d="' + i[3] + '"/></svg></div>';
  }

  function findItem(id) {
    if (!id) return null;
    var all = (S.catalog && S.catalog.length) ? S.catalog : (CFG.DEFAULT_ITEMS || []);
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) return all[i];
    }
    return null;
  }

  function renderItemVisual(item, size, draggable) {
    if (!item) return '';
    var dragAttr = draggable ? ' data-d' : '';
    if (item.imageUrl) {
      var src = esc(API.assetUrl(item.imageUrl));
      return '<div class="g3"' + dragAttr + ' style="--s:' + size + 'px;--gl:#8FC7FF66"><div class="rot"><img src="' + src + '" alt="' + esc(item.name) + '"></div></div>';
    }
    var cols = item.colors || ['#cfeaff', '#176BFF'];
    var d = item.svgPath || (CFG.DEFAULT_ITEMS && CFG.DEFAULT_ITEMS[0] && CFG.DEFAULT_ITEMS[0].svgPath) || '';
    var layers = '';
    for (var i = 0; i < 10; i++) {
      var t = Math.round((i / 9) * 100);
      var z = ((i - 4.5) * 0.014).toFixed(3);
      var stroke = (i === 9) ? ' stroke="#fff" stroke-opacity=".75" stroke-width="2.5" stroke-linejoin="round"' : '';
      layers += '<svg viewBox="0 0 100 100" style="transform:translateZ(calc(var(--s)*' + z + '))"><path d="' + d + '" fill="color-mix(in srgb,' + cols[0] + ' ' + t + '%,' + cols[1] + ')"' + stroke + '/></svg>';
    }
    return '<div class="g3"' + dragAttr + ' style="--s:' + size + 'px;--gl:' + cols[1] + '99"><div class="rot">' + layers + '</div></div>';
  }

  function renderAvatar(u, mode) {
    if (!u) return '';
    var initial = esc((u.name || '?')[0].toUpperCase());
    var photo = u.photoUrl
      ? '<img class="pfp" src="' + esc(API.assetUrl(u.photoUrl)) + '" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'">'
      : '';
    var fallback = '<span style="' + (u.photoUrl ? 'display:none' : '') + '">' + initial + '</span>';

    var borderHtml = '';
    if (u.equippedBorderUrl) {
      borderHtml = '<img class="dc-border" src="' + esc(API.assetUrl(u.equippedBorderUrl)) + '" alt="">';
    }

    var pinHtml = '';
    if (u.pinnedGiftId && mode !== 'mini') {
      var giftItem = findItem(u.pinnedGiftId);
      if (giftItem) {
        pinHtml = '<div class="av-gift-pin" title="' + esc(giftItem.name) + '" style="position:absolute;right:-6px;bottom:-6px;z-index:5;background:rgba(15,23,42,.94);border:1.5px solid rgba(255,255,255,.24);border-radius:50%;padding:3px;box-shadow:0 4px 12px rgba(0,0,0,.55);pointer-events:none">' +
          renderItemVisual(giftItem, 26, false) +
        '</div>';
      }
    }

    if (mode === 'mini') {
      return '<div class="mini-av">' + photo + fallback + borderHtml + '</div>';
    }
    var ringCls = 'r' + (Number(u.ringStyle) || 0);
    return '<div class="av-wrap" style="position:relative">' +
      '<div class="ring ' + ringCls + '">' + photo + fallback + '</div>' +
      borderHtml +
      pinHtml +
    '</div>';
  }

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

  function notify(who, tag, txt) {
    var b = $('ban');
    if (!b) return;
    b.innerHTML =
      '<div class="ic" style="--a:#FFD633;--b:#c28a00" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3v3M5 9h14v9a2 2 0 01-2 2H7a2 2 0 01-2-2zM9 13h.01M15 13h.01M9 16.5h6"/></svg></div>' +
      '<div><b>' + esc(who) + '<em>' + esc(tag) + '</em></b><span>' + esc(txt) + '</span></div>';
    b.classList.add('on');
    clearTimeout(banTimer);
    banTimer = setTimeout(function () { b.classList.remove('on'); }, 4200);
  }

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

  function openExternalLink(url, label) {
    if (!url) {
      return notify('Mas Raka', 'Belum Diatur', 'Link ' + label + ' belum diisi di Railway Variables.');
    }
    if (tg && tg.openTelegramLink && url.indexOf('t.me/') !== -1) {
      tg.openTelegramLink(url);
    } else if (tg && tg.openLink) {
      tg.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  }

  function renderHome() {
    var gridList = (CFG.BASE_GRID || []).slice();
    var role = S.user && S.user.role;
    if (role === 'owner' || role === 'admin' || role === 'moderator') {
      if (gridList.indexOf('dalang') === -1) gridList.push('dalang');
    }

    $('grid').innerHTML = gridList.map(function (id) {
      var label = (CFG.ICONS && CFG.ICONS[id] && CFG.ICONS[id][0]) || id;
      return '<button class="app" data-act="app" data-id="' + id + '">' + ico(id) + '<span>' + esc(label) + '</span></button>';
    }).join('');

    $('dock').innerHTML = (CFG.DOCK || []).map(function (id) {
      var label = (CFG.ICONS && CFG.ICONS[id] && CFG.ICONS[id][0]) || id;
      return '<button class="app" data-act="app" data-id="' + id + '" aria-label="' + esc(label) + '">' + ico(id) + '</button>';
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

  // Fallback Views untuk Absen Nyawa, Time Capsule (kapsul), Lapak Warga (lapakwarga), & Pasal (rules)
  function getFallbackView(id) {
    if (id === 'absen') {
      var u = S.user || {};
      var rk = rankInfo(u.streak);
      return '<div class="card">' +
        '<h3>🔥 Absen Nyawa Harian</h3>' +
        '<p class="sub">Streak saat ini: <b>' + (u.streak || 0) + ' hari</b> (' + rk.title + ')</p>' +
        '<p class="sub">Bonus hari ini: <b>+' + rk.bonus + ' PSC</b> & +2 Street Cred.</p>' +
        '<button class="btn" data-act="core-absen">ABSEN NYAWA SEKARANG</button>' +
      '</div>';
    }

    if (id === 'kapsul' || id === 'capsule') {
      return '<div class="card">' +
        '<h3>⏳ Time Capsule</h3>' +
        '<p class="sub">Tulis pesan rahasia buat diri lu sendiri di masa depan.</p>' +
        '<label>TANGGAL BUKA KAPSUL</label>' +
        '<input id="cap-date" type="date">' +
        '<label>ISI PESAN KAPSUL</label>' +
        '<textarea id="cap-msg" rows="3" maxlength="300" placeholder="Pesan buat gue di masa depan..."></textarea>' +
        '<button class="btn" data-act="core-capsule">SEGEL TIME CAPSULE</button>' +
      '</div>';
    }

    if (id === 'lapakwarga') {
      var curUid = S.user && String(S.user.id);
      var isAdmin = S.user && (S.user.role === 'owner' || S.user.role === 'admin');
      var itemsHtml = (S.market || []).map(function (m) {
        var canClose = (String(m.sellerId) === curUid) || isAdmin;
        return '<div class="card" style="margin-top:10px">' +
          '<div style="display:flex;justify-content:space-between;align-items:center">' +
            '<b>[' + esc(m.category) + '] ' + esc(m.title) + '</b>' +
            (canClose ? '<button class="pill" style="background:rgba(255,69,58,.2);color:#ff6b6b" data-act="core-market-close" data-id="' + esc(m.id) + '">Tutup</button>' : '') +
          '</div>' +
          '<p class="sub" style="margin:6px 0">' + esc(m.description) + '</p>' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">' +
            '<span style="color:#FFD633;font-weight:700">' + esc(m.price) + '</span>' +
            '<small>Pelapak: ' + esc(m.sellerUsername ? '@' + m.sellerUsername : m.sellerName) + '</small>' +
          '</div>' +
        '</div>';
      }).join('') || '<p class="sub" style="margin-top:12px">Belum ada lapak warga yang buka.</p>';

      return '<div class="card">' +
        '<h3>🏪 Buka Lapak Barang / Jasa</h3>' +
        '<label>KATEGORI</label>' +
        '<select id="lp-cat"><option value="Barang">Barang</option><option value="Jasa">Jasa</option></select>' +
        '<label>NAMA BARANG / JASA</label>' +
        '<input id="lp-title" maxlength="50" placeholder="Contoh: Joki Rank / Akun / Desain">' +
        '<label>HARGA / MAHAR</label>' +
        '<input id="lp-price" maxlength="25" placeholder="Contoh: 50 PSC atau Rp 25.000">' +
        '<label>DESKRIPSI SINGKAT</label>' +
        '<textarea id="lp-desc" rows="2" maxlength="160" placeholder="Detail barang/jasa & cara kontak..."></textarea>' +
        '<button class="btn" data-act="core-market-create">BUKA LAPAK SEKARANG</button>' +
      '</div>' + itemsHtml;
    }

    if (id === 'rules' || id === 'pasal' || id === 'help') {
      return '<div class="card">' +
        '<h3>📜 Pasal & Panduan Markas</h3>' +
        '<p class="sub"><b>Pasal 1:</b> Dilarang spam link phising, SARA, atau drama merusak tongkrongan.</p>' +
        '<p class="sub"><b>Pasal 2:</b> Transaksi di Lapak Warga wajib jujur; segala bentuk penipuan berujung ban permanen.</p>' +
        '<p class="sub"><b>Pasal 3:</b> Kumpulkan PSC lewat Absen Nyawa, Arena Game, dan bagi rezeki lewat Saweran.</p>' +
      '</div>';
    }

    return '<div class="emp">' + ico(id) + 'Modul dalam pengembangan.</div>';
  }

  function openApp(id, el) {
    if (id === 'group' || id === 'grup') {
      return openExternalLink(CFG.GROUP_URL, 'Grup Markas');
    }
    if (id === 'channel' || id === 'ch') {
      return openExternalLink(CFG.CHANNEL_URL, 'Channel Info');
    }

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
    var meta = (CFG.ICONS && CFG.ICONS[id]) || [id];
    $('lt').textContent = $('nt').textContent = meta[0];
    $('nav-extra').innerHTML = '';

    if (id === 'lapakwarga') {
      API.get('/api/market').then(function (r) {
        S.market = r.list || [];
        if (S.curApp === 'lapakwarga') refresh();
      }).catch(function () {});
    }

    $('bd').innerHTML = Views[id] ? Views[id]() : getFallbackView(id);
    bindDrag($('bd'));
    $('sc').scrollTop = 0;
    $('nav').classList.remove('s');
    av.classList.add('open');
    $('home').classList.add('bk');
  }

  function refresh() {
    if (S.curApp) {
      $('bd').innerHTML = Views[S.curApp] ? Views[S.curApp]() : getFallbackView(S.curApp);
      bindDrag($('bd'));
    }
    renderHome();
  }

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

  async function syncFromServer(silent) {
    var dot = $('sync-dot');
    try {
      var data = await API.get('/api/me');
      if (dot) dot.style.background = '#34C759';

      if (data.config) {
        CFG.GROUP_URL = data.config.groupUrl || CFG.GROUP_URL || '';
        CFG.CHANNEL_URL = data.config.channelUrl || CFG.CHANNEL_URL || '';
      }

      if (data.user) {
        S.user = data.user;
        S.inv = data.inv || [];
        S.catalog = data.catalog || CFG.DEFAULT_ITEMS || [];
        S.onlineUsers = data.onlineUsers || [];
        S.feed = data.feed || [];
        S.missions = data.missions || [];
        S.events = data.events || [];
        S.wanted = data.wanted || [];
        S.polls = data.polls || [];
        refresh();

        if (!silent) {
          var startParam = (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) || CFG.INITIAL_ROUTE;
          if (startParam && (Views[startParam] || (CFG.ICONS && CFG.ICONS[startParam]))) {
            openApp(startParam);
          }
        }
      } else {
        S.catalog = data.catalog || CFG.DEFAULT_ITEMS || [];
        renderHome();
        openWelcomeSheet();
      }
    } catch (err) {
      if (dot) dot.style.background = '#FF453A';
      renderHome();
      if (!silent) {
        notify('Mas Raka', 'Offline Mode', 'Gagal terhubung ke Railway. Pastikan API_URL sudah benar.');
      }
    }
  }

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
    } else if (act === 'core-absen') {
      t.disabled = true;
      try {
        var resAbs = await API.post('/api/absen', {});
        S.user = resAbs.user;
        if (resAbs.feed) S.feed = resAbs.feed;
        refresh();
        notify('Mas Raka', 'Absen Nyawa', resAbs.message || ('+' + resAbs.earned + ' PSC masuk!'));
      } catch (err) {
        t.disabled = false;
        notify('Mas Raka', 'Gagal Absen', err.message);
      }
    } else if (act === 'core-capsule') {
      var unlockDate = ($('cap-date').value || '').trim();
      var message = ($('cap-msg').value || '').trim();
      if (!unlockDate || message.length < 5) {
        return notify('Mas Raka', 'Lengkapi Data', 'Tanggal dan pesan minimal 5 karakter.');
      }
      t.disabled = true;
      try {
        await API.post('/api/capsule', { unlockDate: unlockDate, message: message });
        $('cap-msg').value = '';
        notify('Mas Raka', 'Time Capsule', 'Pesan berhasil disegel sampai ' + unlockDate + '!');
      } catch (err) {
        notify('Mas Raka', 'Error', err.message);
      } finally {
        t.disabled = false;
      }
    } else if (act === 'core-market-create') {
      var category = $('lp-cat').value;
      var title = ($('lp-title').value || '').trim();
      var price = ($('lp-price').value || '').trim();
      var description = ($('lp-desc').value || '').trim();
      t.disabled = true;
      try {
        await API.post('/api/market/create', { category: category, title: title, price: price, description: description });
        var listRes = await API.get('/api/market');
        S.market = listRes.list || [];
        refresh();
        notify('Mas Raka', 'Lapak Warga', 'Lapak "' + title + '" berhasil dibuka!');
      } catch (err) {
        t.disabled = false;
        notify('Mas Raka', 'Gagal Buka Lapak', err.message);
      }
    } else if (act === 'core-market-close') {
      var marketId = t.getAttribute('data-id');
      t.disabled = true;
      try {
        await API.post('/api/market/close', { marketId: marketId });
        var listRes = await API.get('/api/market');
        S.market = listRes.list || [];
        refresh();
        notify('Mas Raka', 'Lapak Warga', 'Lapak berhasil ditutup.');
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
