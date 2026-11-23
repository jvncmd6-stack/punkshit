(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;

  var pollTimer = null;
  var sparkRemindedSession = false;

  function cleanUsn(v) {
    return String(v || '').trim().replace(/^@+/, '').toLowerCase();
  }

  function todayKeyWIB() {
    var now = new Date(Date.now() + 7 * 3600000);
    return now.toISOString().slice(0, 10);
  }

  function getApiBase() {
    var u = '';
    try {
      u =
        (window.PUNK_CONFIG && window.PUNK_CONFIG.API_URL) ||
        localStorage.getItem('psk_api_url') ||
        '';
    } catch (e) {}
    return String(u || '').replace(/\/+$/, '');
  }

  function getInitData() {
    return (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) || '';
  }

  function isBuddyLitToday(buddy) {
    if (!buddy || typeof buddy !== 'object') return false;
    if (buddy.litToday === true || buddy.isLitToday === true || buddy.hasSetorToday === true) return true;
    var tKey = todayKeyWIB();
    var lastLit = String(buddy.lastLitDate || buddy.last_lit_date || buddy.lastSetorDate || '').slice(0, 10);
    return lastLit === tKey;
  }

  function isCaseFinished(buddy) {
    if (!buddy || typeof buddy !== 'object') return false;
    var st = String(buddy.caseStatus || buddy.status || '').toUpperCase();
    return buddy.caseCompleted === true || st === 'COMPLETED' || st === 'SOLVED' || st === 'DONE' || st === 'CLOSED';
  }

  function buildUserPayload() {
    var tgUser =
      (window.Telegram &&
        window.Telegram.WebApp &&
        window.Telegram.WebApp.initDataUnsafe &&
        window.Telegram.WebApp.initDataUnsafe.user) ||
      {};
    var u = S.user || {};
    var usn = cleanUsn(u.username || u.usn || u.tg_username || tgUser.username);
    var buddy = u.sparkBuddy || null;
    var buddies = Array.isArray(u.sparkBuddies) ? u.sparkBuddies : (buddy ? [buddy] : []);

    var enrichedBuddies = buddies.map(function (b) {
      var lit = isBuddyLitToday(b);
      var done = isCaseFinished(b);
      return Object.assign({}, b, {
        litToday: lit,
        hasSetorToday: lit,
        setorDisabled: lit || done,
        caseCompleted: done
      });
    });

    var primaryBuddy = enrichedBuddies[0] || null;

    return {
      id: u.id || u.telegram_id || tgUser.id || null,
      username: usn,
      name: u.name || tgUser.first_name || usn || 'Warga',
      rank: u.rank || u.role || 'Warga Markas',
      sparkBuddy: primaryBuddy,
      sparkBuddies: enrichedBuddies,
      hasSetorToday: primaryBuddy ? primaryBuddy.hasSetorToday : false,
      setorDisabled: primaryBuddy ? primaryBuddy.setorDisabled : false,
      caseCompleted: primaryBuddy ? primaryBuddy.caseCompleted : false
    };
  }

  function resolveMembersList() {
    var raw = S.onlineUsers || S.members || S.warga || S.users || [];
    return (Array.isArray(raw) ? raw : Object.values(raw || []))
      .map(function (m) {
        return {
          id: m.id || m.telegram_id || null,
          username: cleanUsn(m.username || m.usn || m.tg_username),
          name: m.name || m.first_name || '',
          rank: m.rank || m.role || m.title || 'Warga Markas'
        };
      })
      .filter(function (m) {
        return !!m.username;
      });
  }

  function maybeNotifyUnlitSpark(userPayload) {
    if (sparkRemindedSession) return;
    var list = userPayload.sparkBuddies || [];
    if (!list.length) return;

    var unlit = list.filter(function (b) {
      return !b.caseCompleted && !b.litToday;
    });

    if (unlit.length && C.notify) {
      sparkRemindedSession = true;
      var partnerName = unlit[0].partnerName || unlit[0].partnerUsername || 'pasangan Spark lo';
      C.notify(
        'Mas Raka',
        'Api Spark Belum Nyala 🔥',
        'Hari ini lo belum setor buat nyalain api bareng @' + String(partnerName).replace(/^@/, '') + '. Yuk nyalain sebelum reset jam 00.00 WIB!'
      );
    }
  }

  async function syncSparkData() {
    var frame = document.getElementById('spark-frame');
    if (!frame || !frame.contentWindow) return;
    try {
      var userPayload = buildUserPayload();
      var list = resolveMembersList();

      if (userPayload.username && API && typeof API.get === 'function') {
        var stData = await API.get(
          '/api/spark/status?username=' + encodeURIComponent(userPayload.username) + '&_t=' + Date.now()
        );
        if (stData && typeof stData === 'object') {
          if ('sparkBuddies' in stData && S.user) S.user.sparkBuddies = stData.sparkBuddies || [];
          if ('sparkBuddy' in stData && S.user) S.user.sparkBuddy = stData.sparkBuddy || null;
          userPayload = buildUserPayload();
        }
      }

      maybeNotifyUnlitSpark(userPayload);

      frame.contentWindow.postMessage(
        {
          type: 'PUNK_SYNC',
          apiBase: getApiBase(),
          initData: getInitData(),
          user: userPayload,
          members: list
        },
        '*'
      );
    } catch (e) {}
  }

  async function forwardSparkAction(data) {
    var me = buildUserPayload();
    if (!API || typeof API.post !== 'function') return;

    // Cegah setor ulang jika hari ini sudah setor atau kasus sudah selesai
    if (data.type === 'SPARK_SETOR' || data.type === 'SPARK_LIGHT') {
      if (me.caseCompleted) {
        if (C.notify) C.notify('Mas Raka', 'Kasus Selesai ✅', 'Kasus Spark ini udah selesai cuy, tombol setor udah dikunci.');
        syncSparkData();
        return;
      }
      if (me.hasSetorToday) {
        if (C.notify) C.notify('Mas Raka', 'Sudah Setor 🔥', 'Lo udah setor hari ini cuy, tinggal tunggu besok ya!');
        syncSparkData();
        return;
      }
    }

    var payload = Object.assign({}, data, {
      fromUsername: data.fromUsername || me.username,
      byUsername: me.username,
      actorId: me.id,
      actorName: me.name
    });

    try {
      var resp = await API.post('/api/spark/action', payload);
      if (resp) {
        if (!resp.ok && resp.message && C.notify) {
          C.notify('Mas Raka', 'Info Spark', resp.message);
        } else if (resp.ok && (data.type === 'SPARK_SETOR' || data.type === 'SPARK_LIGHT') && C.notify) {
          C.notify('Mas Raka', 'Api Spark Menyala 🔥', 'Mantap! Setoran hari ini tercatat dan tombol otomatis dikunci sampai besok.');
        }
        if (S.user) {
          if ('sparkBuddies' in resp) S.user.sparkBuddies = resp.sparkBuddies || [];
          if ('sparkBuddy' in resp) S.user.sparkBuddy = resp.sparkBuddy || null;
        }
        syncSparkData();
      }
    } catch (err) {
      if (C.notify) {
        C.notify('Mas Raka', 'Belum Berhasil', err.message || 'Gagal menghubungi server.');
      }
      syncSparkData();
    }
  }

  function startPolling() {
    stopPolling();
    pollTimer = setInterval(function () {
      var frame = document.getElementById('spark-frame');
      if (!frame) {
        stopPolling();
        return;
      }
      syncSparkData();
    }, 4000);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function renderSparkApp() {
    requestAnimationFrame(function () {
      var lt = document.getElementById('lt');
      var sc = document.getElementById('sc');
      var bd = document.getElementById('bd');
      var nav = document.getElementById('nav');

      if (lt) lt.style.display = 'none';

      var topOffset = 94;
      if (nav) {
        var rect = nav.getBoundingClientRect();
        var parentRect = nav.offsetParent ? nav.offsetParent.getBoundingClientRect() : { top: 0 };
        var calc = Math.round(rect.bottom - parentRect.top);
        if (calc > 40) topOffset = calc;
      }

      if (sc) {
        sc.style.padding = '0';
        sc.style.overflow = 'hidden';
      }
      if (bd) {
        bd.style.paddingTop = topOffset + 'px';
        bd.style.height = '100%';
        bd.style.boxSizing = 'border-box';
      }

      var frame = document.getElementById('spark-frame');
      if (frame) {
        frame.onload = syncSparkData;
        syncSparkData();
        startPolling();
      }
    });

    var me = buildUserPayload();
    var apiBase = getApiBase();
    var initData = getInitData();
    var qs =
      '?v=22&_ts=' + Date.now() +
      (me.username ? '&usn=' + encodeURIComponent(me.username) : '') +
      (apiBase ? '&api=' + encodeURIComponent(apiBase) : '') +
      (initData ? '&tma=' + encodeURIComponent(initData) : '');

    return (
      '<iframe id="spark-frame" src="./spark.html' + qs + '" ' +
        'allow="web-share; clipboard-write" ' +
        'style="width:100%;height:100%;border:0;display:block;background:#07070b">' +
      '</iframe>'
    );
  }

  if (!window.__punkSparkBound) {
    window.__punkSparkBound = true;

    window.addEventListener('message', function (ev) {
      var d = ev.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === 'SPARK_REQUEST_SYNC') {
        syncSparkData();
      } else if (
        ['SPARK_INVITE_SEND', 'SPARK_INVITE_ACCEPT', 'SPARK_INVITE_DECLINE', 'SPARK_INVITE_CANCEL', 'SPARK_UNPAIR', 'SPARK_SETOR', 'SPARK_LIGHT'].indexOf(
          d.type
        ) !== -1
      ) {
        if (!d._directHandled) {
          forwardSparkAction(d);
        }
      }
    });

    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act="close"], [data-act="app"]');
      if (!btn) return;
      stopPolling();
      var lt = document.getElementById('lt');
      var sc = document.getElementById('sc');
      var bd = document.getElementById('bd');
      if (lt) lt.style.display = '';
      if (sc) {
        sc.style.padding = '';
        sc.style.overflow = '';
      }
      if (bd) {
        bd.style.paddingTop = '';
        bd.style.height = '';
        bd.style.boxSizing = '';
      }
    });
  }

  C.Views.spark = renderSparkApp;
})();
