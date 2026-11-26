(function () {
  var C = window.PunkCore;
  window.PunkIDMod = window.PunkIDMod || {};

  var spotifyMetaCache = {};

  function normalizeSpotifyUrl(raw) {
    var s = String(raw || '').trim();
    if (!s) return '';
    return s.replace(/open\.spotify\.com\/intl-[a-zA-Z-]+\//i, 'open.spotify.com/');
  }

  function detectSpotifyType(url) {
    if (/\/playlist\//i.test(url)) return 'Playlist';
    if (/\/album\//i.test(url)) return 'Album';
    if (/\/artist\//i.test(url)) return 'Artist';
    return 'Single';
  }

  function applySpotifyCardDom(meta, cleanUrl) {
    var titleEl = document.getElementById('pid-sp-title');
    var artistEl = document.getElementById('pid-sp-artist');
    var subEl = document.getElementById('pid-sp-sub');
    var coverEl = document.getElementById('pid-sp-cover');

    if (titleEl && meta.title) titleEl.textContent = meta.title;
    if (artistEl) artistEl.textContent = meta.artist || 'Spotify';
    if (subEl) subEl.textContent = meta.sub || ('Spotify · ' + detectSpotifyType(cleanUrl));
    if (coverEl && meta.cover) {
      coverEl.src = meta.cover;
      coverEl.style.display = 'block';
    }
  }

  function hydrateSpotifyCard(cleanUrl) {
    if (!cleanUrl) return;
    var cacheKey = 'psk_sp_card_v2_' + cleanUrl;

    if (!spotifyMetaCache[cleanUrl]) {
      try {
        var saved = localStorage.getItem(cacheKey);
        if (saved) spotifyMetaCache[cleanUrl] = JSON.parse(saved);
      } catch (e) {}
    }

    if (spotifyMetaCache[cleanUrl]) {
      setTimeout(function () { applySpotifyCardDom(spotifyMetaCache[cleanUrl], cleanUrl); }, 0);
      return;
    }

    fetch('https://open.spotify.com/oembed?url=' + encodeURIComponent(cleanUrl))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.title) return;
        var kind = detectSpotifyType(cleanUrl);
        var meta = {
          title: data.title,
          artist: data.author_name || 'Spotify',
          sub: data.title + ' - ' + kind + ' · Spotify',
          cover: data.thumbnail_url || ''
        };
        spotifyMetaCache[cleanUrl] = meta;
        try { localStorage.setItem(cacheKey, JSON.stringify(meta)); } catch (e) {}
        applySpotifyCardDom(meta, cleanUrl);
      })
      .catch(function () {});
  }

  function renderSpotifyCard(rawUrl) {
    var cleanUrl = normalizeSpotifyUrl(rawUrl);
    if (!cleanUrl) return '';

    var cacheKey = 'psk_sp_card_v2_' + cleanUrl;
    var cached = spotifyMetaCache[cleanUrl];
    if (!cached) {
      try {
        var saved = localStorage.getItem(cacheKey);
        if (saved) {
          cached = JSON.parse(saved);
          spotifyMetaCache[cleanUrl] = cached;
        }
      } catch (e) {}
    }

    var kind = detectSpotifyType(cleanUrl);
    var titleText = (cached && cached.title) ? cached.title : 'Memuat lagu...';
    var artistText = (cached && cached.artist) ? cached.artist : 'Spotify';
    var subText = (cached && cached.sub) ? cached.sub : ('Spotify · ' + kind);
    var coverUrl = (cached && cached.cover) ? cached.cover : '';

    hydrateSpotifyCard(cleanUrl);

    return (
      '<a href="' + C.esc(cleanUrl) + '" target="_blank" rel="noopener noreferrer" ' +
         'style="display:flex;align-items:center;gap:13px;margin-top:12px;padding:10px 14px 10px 10px;' +
         'background:#232326;border:1px solid rgba(255,255,255,.07);border-radius:16px;' +
         'text-decoration:none;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.28)">' +
        '<div style="width:62px;height:62px;border-radius:11px;overflow:hidden;flex-shrink:0;' +
                    'background:linear-gradient(135deg,#1DB954,#14532d);display:grid;place-items:center">' +
          '<img id="pid-sp-cover" src="' + C.esc(coverUrl) + '" alt="Cover" ' +
               'style="width:100%;height:100%;object-fit:cover;' + (coverUrl ? 'display:block' : 'display:none') + '">' +
        '</div>' +
        '<div style="flex:1;min-width:0;text-align:left">' +
          '<div id="pid-sp-title" style="font-size:16px;font-weight:600;color:#f5f5f7;line-height:1.25;' +
               'white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + C.esc(titleText) + '</div>' +
          '<div id="pid-sp-artist" style="font-size:13.5px;font-weight:500;color:#9a9aa1;margin-top:2px;' +
               'white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + C.esc(artistText) + '</div>' +
          '<div id="pid-sp-sub" style="font-size:12px;color:#787880;margin-top:2px;' +
               'white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + C.esc(subText) + '</div>' +
        '</div>' +
        '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#ff3b5c" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M6 3l5 5-5 5"/></svg>' +
      '</a>'
    );
  }

  window.PunkIDMod.normalizeSpotifyUrl = normalizeSpotifyUrl;
  window.PunkIDMod.renderSpotifyCard = renderSpotifyCard;
})();
