(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;

  var spCache = {};

  function cleanSpotify(raw) {
    var s = String(raw || '').trim();
    if (!s) return '';
    return s.replace(/open\.spotify\.com\/intl-[a-zA-Z-]+\//i, 'open.spotify.com/');
  }

  function renderPublicSpotify(rawUrl) {
    var url = cleanSpotify(rawUrl);
    if (!url) return '';
    var key = 'psk_sp_card_v2_' + url;
    var cached = spCache[url];
    if (!cached) {
      try {
        var saved = localStorage.getItem(key);
        if (saved) { cached = JSON.parse(saved); spCache[url] = cached; }
      } catch (e) {}
    }

    if (!cached) {
      fetch('https://open.spotify.com/oembed?url=' + encodeURIComponent(url))
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (!d || !d.title) return;
          var meta = { title: d.title, artist: d.author_name || 'Spotify', cover: d.thumbnail_url || '' };
          spCache[url] = meta;
          try { localStorage.setItem(key, JSON.stringify(meta)); } catch (e) {}
          var tEl = document.getElementById('pub-sp-title');
          var aEl = document.getElementById('pub-sp-artist');
          var cEl = document.getElementById('pub-sp-cover');
          if (tEl) tEl.textContent = meta.title;
          if (aEl) aEl.textContent = meta.artist;
          if (cEl && meta.cover) { cEl.src = meta.cover; cEl.style.display = 'block'; }
        }).catch(function () {});
    }

    var title = (cached && cached.title) ? cached.title : 'Memuat lagu...';
    var artist = (cached && cached.artist) ? cached.artist : 'Spotify';
    var cover = (cached && cached.cover) ? cached.cover : '';

    return (
      '<a href="' + C.esc(url) + '" target="_blank" rel="noopener noreferrer" ' +
         'style="display:flex;align-items:center;gap:11px;margin-top:10px;padding:8px 12px 8px 8px;' +
         'background:#232326;border:1px solid rgba(255,255,255,.08);border-radius:14px;text-decoration:none;color:#fff">' +
        '<div style="width:48px;height:48px;border-radius:9px;overflow:hidden;flex-shrink:0;background:linear-gradient(135deg,#1DB954,#14532d)">' +
          '<img id="pub-sp-cover" src="' + C.esc(cover) + '" style="width:100%;height:100%;object-fit:cover;' + (cover ? 'display:block' : 'display:none') + '">' +
        '</div>' +
        '<div style="flex:1;min-width:0;text-align:left">' +
          '<div id="pub-sp-title" style="font-size:14px;font-weight:600;color:#f5f5f7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + C.esc(title) + '</div>' +
          '<div id="pub-sp-artist" style="font-size:12px;color:#9a9aa1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + C.esc(artist) + '</div>' +
        '</div>' +
        '<span style="color:#1DB954;font-weight:800;font-size:13px">▶</span>' +
      '</a>'
    );
  }

  function renderPublicGifts(u) {
    var ids = Array.isArray(u.pinnedGifts) ? u.pinnedGifts : (u.pinnedGiftId ? [u.pinnedGiftId] : []);
    if (!ids.length) return '';
    var badges = ids.map(function (gid) {
      var it = C.findItem(gid);
      if (!it) return '';
      return (
        '<div style="display:inline-flex;align-items:center;gap:5px;padding:3px 9px 3px 5px;' +
                    'background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:999px">' +
          C.renderItemVisual(it, 20, false) +
          '<span style="font-size:11px;font-weight:600;color:#f5f5f7">' + C.esc(it.name) + '</span>' +
        '</div>'
      );
    }).filter(Boolean);
    return badges.length ? '<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:5px;margin-top:8px">' + badges.join('') + '</div>' : '';
  }

  function renderPublicCard(u, itemCount) {
    var dg = (u.memberNo || 'PSK-0001').replace('PSK-', '');
    var rk = C.rankInfo(u.streak || 0);
    var skinItem = u.equippedSkinId ? C.findItem(u.equippedSkinId) : null;
    var skinCls = skinItem && skinItem.skinClass ? ' ' + skinItem.skinClass : '';

    return (
      '<div class="flip" data-act="pid-flip" role="button" tabindex="0" style="margin:12px 0">' +
        '<div class="cd">' +
          '<div class="fc' + skinCls + '">' +
            '<div class="cr"><b class="br">PUNKSHIT.OS</b><span>' + C.esc(rk.title) + '</span></div>' +
            '<div class="cr">' +
              '<div style="display:flex;align-items:center;gap:10px">' +
                C.renderAvatar(u, 'mini') +
                '<div style="text-align:left"><div style="font-weight:700;font-size:15px">' + C.esc(u.name) + '</div><small style="opacity:.8">' + (u.username ? '@' + C.esc(u.username) : C.esc(u.memberNo)) + '</small></div>' +
              '</div>' +
              '<span style="font-size:20px;opacity:.85">)))</span>' +
            '</div>' +
            '<div>' +
              '<div class="cn">PSK ' + C.esc(dg) + ' •••• ••••</div>' +
              '<div class="cr"><b>' + C.esc(u.presence || '☕ Nongki Dulu') + '</b><small>WARGA MARKAS</small></div>' +
            '</div>' +
          '</div>' +
          '<div class="fc fb">' +
            '<div class="mag"></div>' +
            '<div class="sig">' + C.esc(u.name) + '</div>' +
            '<div class="stt">' +
              '<div><b>' + (u.streak || 0) + '</b>Streak</div>' +
              '<div><b>' + (u.best || 0) + '</b>Terbaik</div>' +
              '<div><b>' + (u.cred || 0) + '</b>Cred</div>' +
              '<div><b>' + (itemCount || 0) + '</b>Item</div>' +
            '</div>' +
            '<div class="tn">Official Member Card · Tap untuk memutar</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  window.openWargaProfile = async function (targetIdOrUsn) {
    if (!targetIdOrUsn) return;
    if (S.user && (String(S.user.id) === String(targetIdOrUsn) || (S.user.username && S.user.username.toLowerCase() === String(targetIdOrUsn).toLowerCase()))) {
      S.curApp = 'gue';
      C.refresh();
      return;
    }

    C.sheet('<div style="padding:28px;text-align:center;color:var(--mut)">Memuat profil warga...</div>');

    try {
      var res = await API.get('/api/users/profile/' + encodeURIComponent(targetIdOrUsn));
      var u = res.user;
      var rk = C.rankInfo(u.streak || 0);
      var bannerStyle = u.bannerUrl
        ? 'background-image:url(\'' + C.esc(API.assetUrl(u.bannerUrl)) + '\');background-size:cover;background-position:center'
        : 'background:radial-gradient(circle at 25% 20%,#8FC7FF,transparent 55%),linear-gradient(135deg,#176BFF,#0b2a6e)';
      var roleBadge = (u.role && u.role !== 'member') ? '<span class="role-tag">' + C.esc(u.role) + '</span>' : '';

      var sparkBtn = u.username
        ? '<button class="btn b2" style="margin:0;flex:1" data-act="wg-spark-invite" data-usn="' + C.esc(u.username) + '">🔥 Ajak Spark</button>'
        : '';

      C.sheet(
        '<div class="pc" style="margin-bottom:10px">' +
          '<div class="cv" style="' + bannerStyle + '"></div>' +
          '<div class="pb">' +
            C.renderAvatar(u, 'full') +
            '<div class="nm">' + C.esc(u.name) + ' ' + roleBadge + '</div>' +
            '<div class="hd">' + C.esc(u.memberNo || 'PSK-0001') + (u.username ? ' · @' + C.esc(u.username) : '') + ' · ' + rk.title + '</div>' +
            (u.bio ? '<p class="bio">' + C.esc(u.bio) + '</p>' : '') +
            renderPublicGifts(u) +
            (u.spotifyUrl ? renderPublicSpotify(u.spotifyUrl) : '') +
          '</div>' +
        '</div>' +
        renderPublicCard(u, res.itemCount) +
        '<div style="display:flex;gap:8px;margin-top:10px">' +
          '<button class="btn" style="margin:0;flex:1" data-act="wg-sapa" data-uid="' + C.esc(u.id) + '" data-name="' + C.esc(u.name) + '">👋 Sapa di Grup</button>' +
          sparkBtn +
        '</div>'
      );
    } catch (err) {
      C.sheet(
        '<h2>Profil Tidak Ditemukan</h2>' +
        '<p class="sub">' + C.esc(err.message) + '</p>' +
        '<button class="btn b2" data-act="shut">TUTUP</button>'
      );
    }
  };
})();
