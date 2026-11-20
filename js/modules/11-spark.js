(function () {
  var C = window.PunkCore;
  var S = C.S;

  function cleanUsn(v) {
    return String(v || '').trim().replace(/^@+/, '').toLowerCase();
  }

  function buildUserPayload() {
    var tgUser = (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) || {};
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

  async function resolveMembersList() {
    var raw = S.members || S.warga || S.users || [];
    if ((!raw || !raw.length) && window.PUNK_CONFIG && window.PUNK_CONFIG.API_URL) {
      try {
        var base = window.PUNK_CONFIG.API_URL.replace(/\/$/, '');
        var res = await fetch(base + '/api/warga');
        if (res.ok) {
          var data = await res.json();
          raw = Array.isArray(data) ? data : (data.members || data.warga || data.users || []);
          if (raw.length) S.members = raw;
        }
      } catch (e) {}
    }
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
      var list = await resolveMembersList();
      frame.contentWindow.postMessage({
        type: 'PUNK_SYNC',
        user: userPayload,
        members: list
      }, '*');
    } catch (e) {}
  }

  function forwardSparkAction(data) {
    // Sinkronkan state lokal PunkCore.S sementara
    if (S.user) {
      if (data.type === 'SPARK_INVITE_SEND') {
        S.user.sparkBuddy = { status: 'outgoing', targetUsername: cleanUsn(data.targetUsername) };
      } else if (data.type === 'SPARK_INVITE_ACCEPT') {
        S.user.sparkBuddy = { status: 'paired', partnerUsername: cleanUsn(data.fromUsername), streak: 0, xp: 0 };
      } else if (data.type === 'SPARK_INVITE_DECLINE' || data.type === 'SPARK_INVITE_CANCEL' || data.type === 'SPARK_UNPAIR') {
        S.user.sparkBuddy = null;
      }
    }

    // Kirim ke Backend API PUNKSHIT.OS
    if (window.PUNK_CONFIG && window.PUNK_CONFIG.API_URL) {
      var base = window.PUNK_CONFIG.API_URL.replace(/\/$/, '');
      var initData = (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) || '';
      fetch(base + '/api/spark/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({}, data, { initData: initData }))
      })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (resp) {
          if (resp && resp.sparkBuddy && S.user) {
            S.user.sparkBuddy = resp.sparkBuddy;
            syncSparkData();
          }
        })
        .catch(function () {});
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
      }
    });

    var me = buildUserPayload();
    var qs = '?v=4' + (me.username ? '&usn=' + encodeURIComponent(me.username) : '');

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
    } else if (['SPARK_INVITE_SEND', 'SPARK_INVITE_ACCEPT', 'SPARK_INVITE_DECLINE', 'SPARK_INVITE_CANCEL', 'SPARK_UNPAIR'].indexOf(d.type) !== -1) {
      forwardSparkAction(d);
    }
  });

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-act="close"], [data-act="app"]');
    if (!btn) return;
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
