(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var CFG = window.PUNK_CONFIG;
  var S = C.S;
  var M = window.PunkIDMod = window.PunkIDMod || {};

  var pendingBannerFile = null;

  function getTongkronganTier(u) {
    var cred = Number(u.cred) || 0;
    var best = Math.max(Number(u.best) || 0, Number(u.streak) || 0);
    if (cred >= 300 && best >= 14) return { icon: '👑', title: 'Sepuh / Fosil' };
    if (cred >= 100 && best >= 7) return { icon: '🔥', title: 'Pentolan Gang' };
    if (cred >= 25 && best >= 3) return { icon: '☕', title: 'Anak Nongkrong' };
    return { icon: '🌱', title: 'Warga Baru' };
  }

  function compressBannerIfNeeded(file) {
    return new Promise(function (resolve) {
      if (!file || file.type === 'image/gif' || !file.type.startsWith('image/')) {
        resolve(file);
        return;
      }
      var img = new Image();
      var objUrl = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(objUrl);
        var maxW = 1280;
        var w = img.width;
        var h = img.height;
        if (w <= maxW && file.size <= 1.2 * 1024 * 1024) {
          resolve(file);
          return;
        }
        if (w > maxW) {
          h = Math.round(h * (maxW / w));
          w = maxW;
        }
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(function (blob) {
          resolve(blob ? new File([blob], 'banner.jpg', { type: 'image/jpeg' }) : file);
        }, 'image/jpeg', 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(objUrl); resolve(file); };
      img.src = objUrl;
    });
  }

  function renderPunkCard(u) {
    var dg = (u.memberNo || 'PSK-0001').replace('PSK-', '');
    var tier = getTongkronganTier(u);
    var skinItem = u.equippedSkinId ? C.findItem(u.equippedSkinId) : null;
    var skinCls = skinItem && skinItem.skinClass ? ' ' + skinItem.skinClass : '';
    var hasShield = Number(u.streakShield || u.streak_shield || 0) > 0;

    return (
      '<div class="flip" data-act="pid-flip" role="button" tabindex="0" aria-label="Kartu PunkID. Tap untuk memutar">' +
        '<div class="cd">' +
          '<div class="fc' + skinCls + '">' +
            '<div class="cr"><b class="br">PUNKSHIT.OS</b><span>' + tier.icon + ' ' + C.esc(tier.title) + '</span></div>' +
            '<div class="cr">' +
              '<div style="display:flex;align-items:center;gap:10px">' +
                C.renderAvatar(u, 'mini') +
                '<div><div style="font-weight:700;font-size:15px">' + C.esc(u.name) + '</div><small style="opacity:.8">' + (u.username ? '@' + C.esc(u.username) : C.esc(u.memberNo)) + '</small></div>' +
              '</div>' +
              '<span style="font-size:18px;opacity:.9">' + (hasShield ? '🛡️' : ')))') + '</span>' +
            '</div>' +
            '<div>' +
              '<div class="cn">PSK ' + C.esc(dg) + ' •••• ••••</div>' +
              '<div class="cr"><b>' + C.esc(u.presence || '☕ Nongki Santai') + '</b><small>SALDO ' + (u.psc || 0) + ' PSC</small></div>' +
            '</div>' +
          '</div>' +
          '<div class="fc fb">' +
            '<div class="mag"></div>' +
            '<div class="sig">' + C.esc(u.name) + '</div>' +
            '<div class="stt">' +
              '<div><b>' + (u.streak || 0) + '</b>Streak</div>' +
              '<div><b>' + (u.best || 0) + '</b>Terbaik</div>' +
              '<div><b>' + (u.cred || 0) + '</b>Cred</div>' +
              '<div><b>' + (S.inv ? S.inv.length : 0) + '</b>Item</div>' +
            '</div>' +
            '<div class="tn">Official Member Card · Tap kartu untuk memutar</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function groupInventoryByType(type) {
    var map = {};
    var list = [];
    (S.inv || []).forEach(function (x) {
      var it = C.findItem(x.itemId);
      if (!it || it.type !== type) return;
      if (!map[it.id]) {
        map[it.id] = { item: it, count: 1 };
        list.push(map[it.id]);
      } else {
        map[it.id].count += 1;
      }
    });
    return list;
  }

  function limitedTag(it) {
    if (!it) return '';
    var isLim = it.isLimited || it.isArchived || String(it.rarity || '').toLowerCase().indexOf('limited') !== -1;
    return isLim ? '<span class="lim-tag">✦ LIMITED</span>' : '';
  }

  function renderGue() {
    var u = S.user || {};
    var tier = getTongkronganTier(u);

    var bannerStyle = u.bannerUrl
      ? 'background-image:url(\'' + C.esc(API.assetUrl(u.bannerUrl)) + '\');background-size:cover;background-position:center'
      : 'background:radial-gradient(circle at 25% 20%,#8FC7FF,transparent 55%),linear-gradient(135deg,#176BFF,#0b2a6e)';

    var gifts = groupInventoryByType('gift');
    var borders = groupInventoryByType('border');
    var skins = groupInventoryByType('skin');
    var pinnedIds = M.getPinnedList ? M.getPinnedList(u) : (Array.isArray(u.pinnedGifts) ? u.pinnedGifts : []);

    var roleBadge = (u.role && u.role !== 'member')
      ? '<span class="role-tag">' + C.esc(u.role) + '</span>'
      : '';

    return (
      '<div class="pc" style="margin-bottom:18px;overflow:visible">' +
        '<div class="cv" style="' + bannerStyle + '"></div>' +
        '<div class="pb">' +
          '<div class="av-slot">' +
            C.renderAvatar(u, 'full') +
          '</div>' +
          '<div class="nm">' + C.esc(u.name) + ' ' + roleBadge + '</div>' +
          '<div class="hd">' + C.esc(u.memberNo || 'PSK-0001') + (u.username ? ' · @' + C.esc(u.username) : '') + ' · ' + tier.icon + ' ' + tier.title + '</div>' +
          (u.bio ? '<p class="bio">' + C.esc(u.bio) + '</p>' : '') +
          (u.spotifyUrl && M.renderSpotifyCard ? M.renderSpotifyCard(u.spotifyUrl) : '') +
          '<div style="display:flex;gap:8px;margin-top:12px">' +
            '<button class="btn b2" style="margin-top:0;flex:1" data-act="pid-edit">Edit Profil & Banner</button>' +
            '<button class="btn b2" style="margin-top:0;width:auto;padding:0 12px" data-act="pid-copy-id" title="Salin Nomor PunkID">🪪 ID</button>' +
            '<button class="btn b2" style="margin-top:0;width:auto;padding:0 12px" data-act="pid-sync-tele" title="Sinkron ulang foto & nama dari Telegram">🔄 Tele</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<h3 class="gh">STATUS AKTIVITAS (LIVE PRESENCE)</h3>' +
      '<div class="grp" style="margin-bottom:18px">' +
        '<div class="rw">' +
          '<div><b>' + C.esc((u.presence || '☕ Nongki Santai').replace(/undefined/gi, '').trim() || '☕ Nongki Santai') + '</b><small>Tampil di daftar warga aktif (otomatis reset 6 jam)</small></div>' +
          '<button class="pill" data-act="pid-presence-sheet">Ganti</button>' +
        '</div>' +
      '</div>' +

      '<h3 class="gh">KARTU PUNKID (TAP UNTUK PUTAR)</h3>' +
      renderPunkCard(u) +

      '<h3 class="gh">CARD SKIN · TAP PASANG / LEPAS</h3>' +
      (skins.length
        ? '<div class="hs" style="margin-bottom:14px">' +
            '<button data-act="pid-equip-skin" data-id="" class="' + (!u.equippedSkinId ? 'on' : '') + '"><div style="height:56px;display:grid;place-items:center;font-size:20px">🪪</div>Default</button>' +
            skins.map(function (entry) {
              var it = entry.item;
              var active = u.equippedSkinId === it.id;
              return '<button data-act="pid-equip-skin" data-id="' + C.esc(it.id) + '" class="' + (active ? 'on' : '') + '">' + C.renderItemVisual(it, 56, false) + '<span>' + C.esc(it.name) + '</span>' + limitedTag(it) + '</button>';
            }).join('') +
          '</div>'
        : '<div class="grp" style="margin-bottom:14px"><div class="rw"><small>Belum punya Card Skin. Mampir ke Lapak Rongsok buat cek koleksinya!</small></div></div>') +

      '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px">' +
        '<h3 class="gh" style="margin:0">AVATAR BORDER · TAP PASANG</h3>' +
        (u.equippedBorderId ? '<button class="pill" style="font-size:11px" data-act="pid-tune-border" data-id="' + C.esc(u.equippedBorderId) + '">🎯 Atur Posisi</button>' : '') +
      '</div>' +
      (borders.length
        ? '<div class="hs" style="margin-bottom:14px;margin-top:8px">' +
            '<button data-act="pid-equip-border" data-id="" class="' + (!u.equippedBorderId ? 'on' : '') + '"><div style="height:56px;display:grid;place-items:center;font-size:20px">🚫</div>Lepas</button>' +
            borders.map(function (entry) {
              var it = entry.item;
              var active = u.equippedBorderId === it.id;
              var qtyTag = entry.count > 1 ? ' (x' + entry.count + ')' : '';
              return '<button data-act="pid-equip-border" data-id="' + C.esc(it.id) + '" class="' + (active ? 'on' : '') + '">' + C.renderItemVisual(it, 56, false) + '<span>' + C.esc(it.name + qtyTag) + '</span>' + limitedTag(it) + '</button>';
            }).join('') +
          '</div>'
        : '<div class="grp" style="margin-bottom:14px;margin-top:8px"><div class="rw"><small>Belum punya Avatar Border. Cek koleksi di Lapak Rongsok yuk!</small></div></div>') +

      '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px">' +
        '<h3 class="gh" style="margin:0">ORBIT GIFT DI LUAR PP (' + pinnedIds.length + '/6 PINNED)</h3>' +
        (pinnedIds.length ? '<button class="pill" style="font-size:11px" data-act="pid-tune-gift">🎯 Atur Gift</button>' : '') +
      '</div>' +
      (gifts.length
        ? '<div class="hs" style="margin-top:8px">' +
            '<button data-act="pid-pin-gift" data-id="" class="' + (!pinnedIds.length ? 'on' : '') + '"><div style="height:58px;display:grid;place-items:center;font-size:20px">🚫</div>Reset Pin</button>' +
            gifts.map(function (entry) {
              var it = entry.item;
              var active = pinnedIds.indexOf(it.id) !== -1;
              var qtyTag = entry.count > 1 ? ' (x' + entry.count + ')' : '';
              return '<button data-act="pid-pin-gift" data-id="' + C.esc(it.id) + '" class="' + (active ? 'on' : '') + '">' + C.renderItemVisual(it, 58, false) + '<span>' + C.esc(it.name + qtyTag) + '</span>' + limitedTag(it) + '</button>';
            }).join('') +
          '</div>'
        : '<div class="grp" style="margin-top:8px"><div class="rw"><small>Gudang gift masih kosong cuy. Beli di Lapak Rongsok atau tunggu kiriman warga lain!</small></div></div>')
    );
  }

  C.Views.gue = renderGue;
  C.renderPunkCard = renderPunkCard;

  function openEditProfileSheet() {
    var u = S.user;
    pendingBannerFile = null;
    var curBanner = u.bannerUrl ? API.assetUrl(u.bannerUrl) : '';
    var ringNames = CFG.RING_NAMES || ['Biru Neon', 'Emas', 'Hijau Toxic', 'Ungu Cyber'];

    C.sheet(
      '<h2 style="margin-bottom:4px">Edit Profil & Banner</h2>' +
      '<p class="sub">Upload foto/GIF latar belakang atau atur bio profil lo biar makin kece.</p>' +

      '<label>LATAR BELAKANG PROFIL (GAMBAR / GIF)</label>' +
      '<div class="up-box" id="bn-drop">' +
        '<input type="file" id="bn-file" accept="image/*" hidden>' +
        '<div style="font-size:13px;font-weight:600;color:var(--gblue)">📁 Pilih File dari Galeri (Maks. 5MB)</div>' +
        '<small style="color:var(--mut);font-size:11.5px">Mendukung JPG, PNG, WEBP, atau GIF animasi</small>' +
        (curBanner ? '<img id="bn-prev" class="up-prev" src="' + C.esc(curBanner) + '" alt="Preview">' : '<img id="bn-prev" class="up-prev" style="display:none" alt="Preview">') +
      '</div>' +

      '<label>NAMA PANGGILAN TONGKRONGAN</label>' +
      '<input id="ed-name" maxlength="24" value="' + C.esc(u.name) + '">' +

      '<label>BIO SINGKAT</label>' +
      '<input id="ed-bio" maxlength="90" value="' + C.esc(u.bio || '') + '" placeholder="Tulis bio lo...">' +

      '<label>LINK SPOTIFY (OPSIONAL)</label>' +
      '<input id="ed-sp" value="' + C.esc(u.spotifyUrl || '') + '" placeholder="https://open.spotify.com/track/...">' +

      '<label>WARNA RING DASAR AVATAR</label>' +
      '<div class="chips" id="ed-rings">' +
        ringNames.map(function (n, idx) {
          return '<button type="button" class="chip' + (Number(u.ringStyle) === idx ? ' on' : '') + '" data-act="pid-pick-ring" data-idx="' + idx + '">' + C.esc(n) + '</button>';
        }).join('') +
      '</div>' +

      '<button class="btn" data-act="pid-save-profile">SIMPAN PERUBAHAN</button>'
    );

    var box = document.getElementById('bn-drop');
    var inp = document.getElementById('bn-file');
    var prev = document.getElementById('bn-prev');

    box.onclick = function () { inp.click(); };
    inp.onchange = function () {
      var file = inp.files && inp.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        C.notify('Mas Raka', 'Ukuran File', 'Maksimal ukuran banner 5MB ya cuy.');
        return;
      }
      pendingBannerFile = file;
      prev.src = URL.createObjectURL(file);
      prev.style.display = 'block';
    };
  }

  function openPresenceSheet() {
    var cur = S.user.presence || '';
    var list = CFG.PRESENCE_LIST || [
      '☕ Nongki Santai',
      '🔥 On Fire',
      '🎮 Push Arena',
      '🎨 Lagi Berkarya',
      '🎧 Dengerin Lagu',
      '🛌 Mode Rebahan'
    ];

    C.sheet(
      '<h2>Update Status Tongkrongan</h2>' +
      '<p class="sub">Pilih suasana hati atau aktivitas lo sekarang biar warga lain tahu.</p>' +
      '<div class="chips" style="justify-content:center">' +
        list.map(function (p) {
          var label = (typeof p === 'string') ? p : ((p.e || '') + ' ' + (p.t || '')).trim();
          return '<button class="chip' + (cur === label ? ' on' : '') + '" data-act="pid-set-presence" data-val="' + C.esc(label) + '">' + C.esc(label) + '</button>';
        }).join('') +
      '</div>'
    );
  }

  if (window.__punkIdBound) return;
  window.__punkIdBound = true;

  document.addEventListener('click', async function (e) {
    var t = e.target.closest('[data-act]');
    if (!t || t.disabled) return;
    var act = t.getAttribute('data-act');

    if (act === 'pid-flip') {
      t.classList.toggle('on');
    } else if (act === 'pid-copy-id') {
      var u = S.user || {};
      var txt = '🪪 ' + (u.name || 'Warga') + ' · ' + (u.memberNo || 'PSK-0001') + (u.username ? ' (@' + u.username + ')' : '');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).catch(function () {});
      }
      C.notify('Mas Raka', 'PunkID Disalin 🪪', 'Nomor kartu ' + (u.memberNo || 'PSK-0001') + ' udah disalin ke clipboard!');
    } else if (act === 'pid-edit') {
      openEditProfileSheet();
    } else if (act === 'pid-tune-border') {
      if (M.openBorderTuneSheet) M.openBorderTuneSheet(t.getAttribute('data-id'));
    } else if (act === 'pid-tune-gift') {
      if (M.openGiftTuneSheet) M.openGiftTuneSheet(t.getAttribute('data-id') || '');
    } else if (act === 'pid-pick-ring') {
      document.querySelectorAll('#ed-rings .chip').forEach(function (c) { c.classList.remove('on'); });
      t.classList.add('on');
    } else if (act === 'pid-save-profile') {
      var name = (document.getElementById('ed-name').value || '').trim();
      var bio = (document.getElementById('ed-bio').value || '').trim();
      var rawSp = (document.getElementById('ed-sp').value || '').trim();
      var sp = M.normalizeSpotifyUrl ? M.normalizeSpotifyUrl(rawSp) : rawSp;
      var activeRing = document.querySelector('#ed-rings .chip.on');
      var ringStyle = activeRing ? Number(activeRing.getAttribute('data-idx')) : 0;

      if (name.length < 2) {
        C.notify('Mas Raka', 'Cek Nama', 'Nama panggilan minimal 2 huruf ya cuy.');
        return;
      }

      t.disabled = true;
      t.textContent = 'Menyimpan...';
      try {
        if (pendingBannerFile) {
          var readyFile = await compressBannerIfNeeded(pendingBannerFile);
          var fd = new FormData();
          fd.append('banner', readyFile);
          var upRes = await API.upload('/api/profile/banner', fd);
          if (upRes.user) S.user = upRes.user;
        }
        var res = await API.post('/api/profile', { name: name, bio: bio, spotifyUrl: sp, ringStyle: ringStyle });
        if (res.user) S.user = res.user;
        pendingBannerFile = null;
        C.shut();
        C.refresh();
        C.notify('Mas Raka', 'Profil Diperbarui ✨', 'Sip, tampilan PunkID lo sekarang makin kece!');
      } catch (err) {
        t.disabled = false;
        t.textContent = 'SIMPAN PERUBAHAN';
        C.notify('Mas Raka', 'Belum Berhasil', err.message);
      }
    } else if (act === 'pid-sync-tele') {
      t.disabled = true;
      try {
        var res = await API.post('/api/profile/sync-telegram', {});
        if (res.user) S.user = res.user;
        C.refresh();
        C.notify('Mas Raka', 'Sinkron Telegram 🔄', 'Foto profil & info Telegram terbaru udah ditarik!');
      } catch (err) {
        C.notify('Mas Raka', 'Gagal Sinkron', err.message);
      } finally {
        t.disabled = false;
      }
    } else if (act === 'pid-presence-sheet') {
      openPresenceSheet();
    } else if (act === 'pid-set-presence') {
      var val = t.getAttribute('data-val');
      try {
        var res = await API.post('/api/presence', { status: val });
        if (res.user) S.user = res.user;
        if (res.onlineUsers) S.onlineUsers = res.onlineUsers;
        C.shut();
        C.refresh();
        C.notify('Mas Raka', 'Status Updated', 'Mantap, status lo sekarang: ' + val);
      } catch (err) {
        C.notify('Mas Raka', 'Info', err.message);
      }
    } else if (act === 'pid-equip-skin') {
      var rawSkinId = t.getAttribute('data-id') || '';
      var nextSkin = (!rawSkinId || S.user.equippedSkinId === rawSkinId) ? null : rawSkinId;
      try {
        var res = await API.post('/api/profile/equip', { type: 'skin', itemId: nextSkin });
        if (res.user) S.user = res.user;
        C.refresh();
        C.notify('Mas Raka', 'Card Skin', nextSkin ? 'Card Skin berhasil dipasang ke kartu PunkID!' : 'Card Skin dilepas (kembali default).');
      } catch (err) {
        C.notify('Mas Raka', 'Info', err.message);
      }
    } else if (act === 'pid-equip-border') {
      var rawBorderId = t.getAttribute('data-id') || '';
      var nextBorder = (!rawBorderId || S.user.equippedBorderId === rawBorderId) ? null : rawBorderId;
      try {
        var res = await API.post('/api/profile/equip', { type: 'border', itemId: nextBorder });
        if (res.user) S.user = res.user;
        C.refresh();
        C.notify('Mas Raka', 'Avatar Border', nextBorder ? 'Border terpasang! Tap "🎯 Atur Posisi" kalau mau geser/zoom.' : 'Border dilepas.');
      } catch (err) {
        C.notify('Mas Raka', 'Info', err.message);
      }
    } else if (act === 'pid-pin-gift') {
      var rawGiftId = t.getAttribute('data-id') || '';
      var beforeList = M.getPinnedList ? M.getPinnedList(S.user) : [];
      var wasPinned = rawGiftId && beforeList.indexOf(rawGiftId) !== -1;
      try {
        var res = await API.post('/api/profile/equip', { type: 'pin', itemId: rawGiftId || null });
        if (res.user) S.user = res.user;
        C.refresh();
        var afterList = M.getPinnedList ? M.getPinnedList(S.user) : [];
        var msg = !rawGiftId
          ? 'Pin gift di-reset.'
          : (wasPinned ? 'Gift dilepas dari pin utama.' : 'Gift dipasang! Tap "🎯 Atur Gift" buat atur besar kecil & posisinya (' + afterList.length + '/6).');
        C.notify('Mas Raka', 'Orbit Gift Profil', msg);
      } catch (err) {
        C.notify('Mas Raka', 'Info', err.message);
      }
    }
  });
})();
