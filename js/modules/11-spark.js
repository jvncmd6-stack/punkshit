(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;

  var pollTimer = null;

  function cleanUsn(v) {
    return String(v || '').trim().replace(/^@+/, '').toLowerCase();
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

  function buildUserPayload() {
    var tgUser =
      (window.Telegram &&
        window.Telegram.WebApp &&
        window.Telegram.WebApp.initDataUnsafe &&
        window.Telegram.WebApp.initDataUnsafe.user) ||
      {};
    var u = S.user || {};
    var usn = cleanUsn(u.username || u.usn || u.tg_username || tgUser.username);
    return {
      id: u.id || u.telegram_id || tgUser.id || null,
      username: usn,
      name: u.name || tgUser.first_name || usn || 'Warga',
      rank: u.rank || u.role || 'Warga Markas',
      sparkBuddy: u.sparkBuddy || null
    };
  }

  function resolveMembersList() {
    var raw = S.members || S.warga || S.users || [];
    return (Array.isArray(raw) ? raw : Object.values(raw || []))
      .map(function (m) {
        return {
          id: m.id || m.telegram_id || null,
          username: cleanUsn(m.username || m.usn || m.tg_username),
          name: m.name || m.first_name || '',
          rank: m.rank || m.role || m.title || 'Warga Punk'
        };
      })
      .filter(function (m) {
        return !!m.username;
      });
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
        if (stData && typeof stData === 'object' && 'sparkBuddy' in stData) {
          userPayload.sparkBuddy = stData.sparkBuddy || null;
          if (S.user) S.user.sparkBuddy = stData.sparkBuddy || null;
        }
      }

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
          C.notify('Spark Buddies', 'Info', resp.message);
        }
        if (S.user) S.user.sparkBuddy = resp.sparkBuddy || null;
        syncSparkData();
      }
    } catch (err) {
      if (C.notify) {
        C.notify('Spark Error', 'Gagal Kirim', err.message || 'Gagal menghubungi server.');
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
    }, 3500);
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
      '?v=11' +
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

  window.addEventListener('message', function (ev) {
    var d = ev.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'SPARK_REQUEST_SYNC') {
      syncSparkData();
    } else if (
      ['SPARK_INVITE_SEND', 'SPARK_INVITE_ACCEPT', 'SPARK_INVITE_DECLINE', 'SPARK_INVITE_CANCEL', 'SPARK_UNPAIR'].indexOf(
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

  C.Views.spark = renderSparkApp;
})();
