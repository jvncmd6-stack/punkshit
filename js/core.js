window.PunkCore = (function () {
  var CFG = window.PUNK_CONFIG;
  var API = window.PunkAPI;
  var ST = window.PunkCoreState;
  var FB = window.PunkCoreFallback;
  var S = ST.S;
  var Views = ST.Views;
  var esc = ST.esc;
  var ico = ST.ico;
  var bindDrag = ST.bindDrag;
  var tg = window.Telegram && window.Telegram.WebApp;
  var $ = function (id) { return document.getElementById(id); };
  var banTimer = null;

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
    if (!url) return notify('Mas Raka', 'Belum Diatur', 'Link ' + label + ' belum diisi di Railway Variables.');
    if (tg && tg.openTelegramLink && url.indexOf('t.me/') !== -1) tg.openTelegramLink(url);
    else if (tg && tg.openLink) tg.openLink(url);
    else window.open(url, '_blank');
  }

  function renderHome() {
    var gridList = (CFG.BASE_GRID || []).slice();
    var role = S.user && S.user.role;
    if ((role === 'owner' || role === 'admin' || role === 'moderator') && gridList.indexOf('dalang') === -1) {
      gridList.push('dalang');
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
      $('wp').textContent = S.user.psc || S.user.cred || 0;
      $('ws').textContent = 'Streak ' + (S.user.streak || 0) + ' hari';
    }

    var online = S.onlineUsers || [];
    $('wc').textContent = online.length + ' warga nongki di markas';
    var colors = ['#FFD633', '#8FC7FF', '#34C759', '#FF9ad5', '#c8b6ff'];
    $('wf').innerHTML = online.slice(0, 5).map(function (w, idx) {
      var pUrl = w.photoUrl || w.avatar || '';
      return pUrl
        ? '<img src="' + esc(API.assetUrl(pUrl)) + '" alt="">'
        : '<i style="background:' + colors[idx % colors.length] + '">' + esc((w.name || '?')[0].toUpperCase()) + '</i>';
    }).join('') || '<i style="background:#FFD633">P</i>';
  }

  function openApp(id, el) {
    if (id === 'grup' || id === 'group') return openExternalLink(CFG.GROUP_URL, 'Grup Markas');
    if (id === 'channel' || id === 'ch') return openExternalLink(CFG.CHANNEL_URL, 'Channel Markas');

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
      API.get('/api/shop').then(function (r) {
        S.market = r.items || [];
        S.marketOrders = r.orders || [];
        if (S.curApp === 'lapakwarga') refresh();
      }).catch(function () {});
    } else if (id === 'rules' || id === 'pasal' || id === 'help') {
      API.get('/api/rules-help').then(function (r) {
        S.rulesHelp = r || {};
        if (S.curApp === id) refresh();
      }).catch(function () {});
    } else if (id === 'dalang') {
      API.get('/api/admin/stats').then(function (r) {
        S.adminStats = r || { totalUsers: 0, totalWaitingRadio: 0, users: [] };
        if (S.curApp === 'dalang') refresh();
      }).catch(function () {});
    }

    $('bd').innerHTML = Views[id] ? Views[id]() : FB.getFallbackView(id);
    bindDrag($('bd'));
    $('sc').scrollTop = 0;
    $('nav').classList.remove('s');
    av.classList.add('open');
    $('home').classList.add('bk');
  }

  function refresh() {
    if (S.curApp) {
      $('bd').innerHTML = Views[S.curApp] ? Views[S.curApp]() : FB.getFallbackView(S.curApp);
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
          var startParam = tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param;
          if (startParam && (Views[startParam] || (CFG.ICONS && CFG.ICONS[startParam]))) openApp(startParam);
        }
      } else {
        S.catalog = data.catalog || CFG.DEFAULT_ITEMS || [];
        renderHome();
        openWelcomeSheet();
      }
    } catch (err) {
      if (dot) dot.style.background = '#FF453A';
      renderHome();
      if (!silent) notify('Mas Raka', 'Offline Mode', 'Gagal terhubung ke Railway. Pastikan API_URL sudah benar.');
    }
  }

  document.addEventListener('click', async function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var act = t.getAttribute('data-act');

    if (act === 'app') openApp(t.getAttribute('data-id'), t);
    else if (act === 'close') { $('av').classList.remove('open'); $('home').classList.remove('bk'); S.curApp = ''; }
    else if (act === 'shut') shut();
    else if (act === 'search') openApp('warga');
    else if (act === 'core-reg') {
      var name = ($('nk').value || '').trim();
      if (name.length < 2) return;
      t.disabled = true;
      try {
        var res = await API.post('/api/register', { name: name });
        S.user = res.user; S.inv = res.inv || [];
        shut(); refresh();
        notify('Mas Raka', '→ Grup Punkshit', 'NEW CHARACTER UNLOCKED! ' + S.user.name + ' resmi jadi warga.');
        setTimeout(function () { openApp('gue'); }, 600);
      } catch (err) { t.disabled = false; notify('Mas Raka', 'Error', err.message); }
    } else if (act === 'core-absen') {
      t.disabled = true;
      try {
        var resAbs = await API.post('/api/absen', {});
        S.user = resAbs.user;
        if (resAbs.feed) S.feed = resAbs.feed;
        refresh();
        notify('Mas Raka', 'Absen', resAbs.message || ('+' + resAbs.earned + ' PSC masuk!'));
      } catch (err) { t.disabled = false; notify('Mas Raka', 'Gagal Absen', err.message); }
    } else if (act === 'core-capsule') {
      var unlockDate = ($('cap-date').value || '').trim();
      var message = ($('cap-msg').value || '').trim();
      if (!unlockDate || message.length < 5) return notify('Mas Raka', 'Lengkapi Data', 'Tanggal dan pesan minimal 5 karakter.');
      t.disabled = true;
      try {
        await API.post('/api/capsule', { unlockDate: unlockDate, message: message });
        $('cap-msg').value = '';
        notify('Mas Raka', 'Time Capsule', 'Pesan berhasil disegel sampai ' + unlockDate + '!');
      } catch (err) { notify('Mas Raka', 'Error', err.message); } finally { t.disabled = false; }
    } else if (act === 'core-shop-tab') {
      S.curTab.lapakwarga = t.getAttribute('data-tab');
      refresh();
    } else if (act === 'core-admin-coin-modal') {
      var uid = t.getAttribute('data-uid'), uname = t.getAttribute('data-uname');
      sheet('<h2>💰 Atur Koin PSC</h2><p class="sub">Warga: <b>' + esc(uname) + '</b></p><label>NOMINAL KOIN</label><input id="adm-coin-amt" type="number" placeholder="100 atau -50"><button class="btn" data-act="core-admin-coin-submit" data-uid="' + esc(uid) + '">SIMPAN</button>');
    } else if (act === 'core-admin-coin-submit') {
      var targetUid = t.getAttribute('data-uid'), amt = Number($('adm-coin-amt').value);
      if (!amt) return notify('Mas Raka', 'Admin', 'Masukkan nominal koin dulu.');
      t.disabled = true;
      try {
        await API.post('/api/admin/add-coin', { targetUserId: targetUid, amount: amt });
        shut();
        S.adminStats = await API.get('/api/admin/stats');
        refresh();
        notify('Mas Raka', 'Admin Panel', 'Saldo koin warga berhasil diperbarui!');
      } catch (err) { t.disabled = false; notify('Mas Raka', 'Error', err.message); }
    }
  });

  $('sc').onscroll = function () { $('nav').classList.toggle('s', $('sc').scrollTop > 34); };

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
    rankInfo: ST.rankInfo,
    findItem: ST.findItem,
    renderItemVisual: ST.renderItemVisual,
    renderAvatar: ST.renderAvatar,
    bindDrag: bindDrag,
    notify: notify,
    sheet: sheet,
    shut: shut,
    openApp: openApp,
    refresh: refresh,
    sync: syncFromServer
  };
})();
