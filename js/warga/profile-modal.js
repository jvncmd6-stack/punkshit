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

  function openTransferPscSheet(targetUid, targetName) {
    var myBal = S.user ? (S.user.psc || 0) : 0;
    C.sheet(
      '<h2>💸 Transfer PSC</h2>' +
      '<p class="sub">Kirim saldo PSC ke <b>' + C.esc(targetName) + '</b> (Saldo kamu: <b>' + myBal + ' PSC</b>).</p>' +
      '<label>NOMINAL PSC (MIN. 10)</label>' +
      '<input id="tf-amt" type="number" min="10" max="5000" value="50">' +
      '<label>PESAN / CATATAN (OPSIONAL)</label>' +
      '<input id="tf-note" maxlength="60" placeholder="Buat jajan di Lapak Rongsok...">' +
      '<button class="btn" data-act="wg-tf-submit" data-uid="' + C.esc(targetUid) + '">KIRIM PSC SEKARANG</button>'
    );
  }

  function openSendGiftSheet(targetUid, targetName) {
    var inv = S.inv || [];
    if (!inv.length) {
      return C.sheet(
        '<h2>🎁 Kirim Gift</h2>' +
        '<p class="sub">Gudang barang kamu masih kosong. Beli item dulu di Lapak Rongsok!</p>' +
        '<button class="btn b2" data-act="shut">TUTUP</button>'
      );
    }

    var optionsHtml = inv.map(function (entry) {
      var it = C.findItem(entry.itemId);
      var label = it ? (it.name + ' [' + (it.rarity || 'Rare') + ']') : entry.itemId;
      return '<option value="' + entry.id + '">' + C.esc(label) + '</option>';
    }).join('');

    C.sheet(
      '<h2>🎁 Kirim Gift ke ' + C.esc(targetName) + '</h2>' +
      '<p class="sub">Pilih item dari gudang kamu untuk dihadiahkan (dapat +2 Street Cred!).</p>' +
      '<label>PILIH ITEM DARI GUDANG</label>' +
      '<select id="gf-inv-id">' + optionsHtml + '</select>' +
      '<label>UCAPAN HADIAH (OPSIONAL)</label>' +
      '<input id="gf-note" maxlength="60" placeholder="Hadiah spesial buat lo...">' +
      '<button class="btn" data-act="wg-gift-submit" data-uid="' + C.esc(targetUid) + '">KIRIM HADIAH</button>'
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
        ? '<button class="btn b2" style="margin:0" data-act="wg-spark-invite" data-usn="' + C.esc(u.username) + '">🔥 Spark</button>'
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
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">' +
          '<button class="btn" style="margin:0" data-act="wg-sapa" data-uid="' + C.esc(u.id) + '" data-name="' + C.esc(u.name) + '">👋 Sapa</button>' +
          sparkBtn +
          '<button class="btn b2" style="margin:0" data-act="wg-tf-open" data-uid="' + C.esc(u.id) + '" data-name="' + C.esc(u.name) + '">💸 Transfer PSC</button>' +
          '<button class="btn b2" style="margin:0" data-act="wg-gift-open" data-uid="' + C.esc(u.id) + '" data-name="' + C.esc(u.name) + '">🎁 Kirim Gift</button>' +
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

  document.addEventListener('click', async function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var act = t.getAttribute('data-act');

    if (act === 'wg-tf-open') {
      openTransferPscSheet(t.getAttribute('data-uid'), t.getAttribute('data-name'));
    } else if (act === 'wg-tf-submit') {
      var uid = t.getAttribute('data-uid');
      var amt = Number(document.getElementById('tf-amt').value) || 0;
      var note = (document.getElementById('tf-note').value || '').trim();
      t.disabled = true;
      try {
        var res = await API.post('/api/social/transfer-psc', { targetUserId: uid, amount: amt, note: note });
        if (res.user) S.user = res.user;
        C.shut();
        C.refresh();
        C.notify('Mas Raka', 'Transfer Berhasil', res.message);
      } catch (err) {
        t.disabled = false;
        C.notify('Mas Raka', 'Gagal Transfer', err.message);
      }
    } else if (act === 'wg-gift-open') {
      openSendGiftSheet(t.getAttribute('data-uid'), t.getAttribute('data-name'));
    } else if (act === 'wg-gift-submit') {
      var gUid = t.getAttribute('data-uid');
      var invId = Number(document.getElementById('gf-inv-id').value);
      var gNote = (document.getElementById('gf-note').value || '').trim();
      t.disabled = true;
      try {
        var gRes = await API.post('/api/social/send-gift', { targetUserId: gUid, invId: invId, note: gNote });
        if (gRes.user) S.user = gRes.user;
        if (gRes.inv) S.inv = gRes.inv;
        C.shut();
        C.refresh();
        C.notify('Mas Raka', 'Gift Terkirim!', gRes.message);
      } catch (err) {
        t.disabled = false;
        C.notify('Mas Raka', 'Gagal Kirim', err.message);
      }
    }
  });
})();
