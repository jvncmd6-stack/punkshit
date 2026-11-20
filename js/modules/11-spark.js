(function () {
  var C = window.PunkCore;
  var S = C.S;

  var pollTimer = null;

  function getApiBase() {
    var url = '';
    try {
      url =
        (window.PUNK_CONFIG && (window.PUNK_CONFIG.API_URL || window.PUNK_CONFIG.SPARK_API_URL)) ||
        localStorage.getItem('psk_api_url') ||
        '';
    } catch (e) {}
    return String(url || '').replace(/\/+$/, '');
  }

  function getInitData() {
    return (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) || '';
  }

  function cleanUsn(v) {
    return String(v || '').trim().replace(/^@+/, '').toLowerCase();
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

  async function resolveMembersList() {
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
      var list = await resolveMembersList();
      var base = getApiBase();

      if (userPayload.username && base) {
        try {
          var stRes = await fetch(
            base + '/api/spark/status?username=' + encodeURIComponent(userPayload.username) + '&_t=' + Date.now(),
            {
              headers: {
                Authorization: 'tma ' + getInitData()
              }
            }
          );
          if (stRes.ok) {
            var stData = await stRes.json();
            userPayload.sparkBuddy = stData.sparkBuddy || null;
            if (S.user) S.user.sparkBuddy = stData.sparkBuddy || null;
          }
        } catch (e) {}
      }

      frame.contentWindow.postMessage(
        {
          type: 'PUNK_SYNC',
          user: userPayload,
          members: list
        },
        '*'
      );
    } catch (e) {}
  }

  function forwardSparkAction(data) {
    var me = buildUserPayload();
    if (S.user) {
      if (data.type === 'SPARK_INVITE_SEND') {
        S.user.sparkBuddy = { status: 'outgoing', targetUsername: cleanUsn(data.targetUsername) };
      } else if (data.type === 'SPARK_INVITE_ACCEPT') {
        S.user.sparkBuddy = { status: 'paired', partnerUsername: cleanUsn(data.fromUsername), streak: 0, xp: 0 };
      } else if (
        data.type === 'SPARK_INVITE_DECLINE' ||
        data.type === 'SPARK_INVITE_CANCEL' ||
        data.type === 'SPARK_UNPAIR'
      ) {
        S.user.sparkBuddy = null;
      }
    }

    var base = getApiBase();
    if (!base) return;

    var payload = Object.assign({}, data, {
      fromUsername: data.fromUsername || me.username,
      byUsername: me.username,
      actorId: me.id,
      actorName: me.name
    });

    fetch(base + '/api/spark/action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'tma ' + getInitData()
      },
      body: JSON.stringify(payload)
    })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (resp) {
        if (resp) {
          if (!resp.ok && resp.message && C.notify) {
            C.notify('Spark Buddies', 'Info', resp.message);
          }
          if (S.user) S.user.sparkBuddy = resp.sparkBuddy || null;
          syncSparkData();
        }
      })
      .catch(function () {});
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
    }, 5000);
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
    var qs = '?v=8' + (me.username ? '&usn=' + encodeURIComponent(me.username) : '');

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
      forwardSparkAction(d);
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
