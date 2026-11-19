(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var CFG = window.PUNK_CONFIG;
  var S = C.S;

  var pendingBannerFile = null;

  function renderPunkCard(u) {
    var dg = (u.memberNo || 'PSK-0001').replace('PSK-', '');
    var rk = C.rankInfo(u.streak);
    var skinItem = u.equippedSkinId ? C.findItem(u.equippedSkinId) : null;
    var skinCls = skinItem && skinItem.skinClass ? ' ' + skinItem.skinClass : '';

    return (
      '<div class="flip" data-act="pid-flip" role="button" tabindex="0" aria-label="Kartu PunkID. Tap untuk memutar">' +
        '<div class="cd">' +
          '<div class="fc' + skinCls + '">' +
            '<div class="cr"><b class="br">PUNKSHIT.OS</b><span>' + C.esc(rk.title) + '</span></div>' +
            '<div class="cr">' +
              '<div style="display:flex;align-items:center;gap:10px">' +
                C.renderAvatar(u, 'mini') +
                '<div><div style="font-weight:700;font-size:15px">' + C.esc(u.name) + '</div><small style="opacity:.8">' + (u.username ? '@' + C.esc(u.username) : C.esc(u.memberNo)) + '</small></div>' +
              '</div>' +
              '<span style="font-size:20px;opacity:.85">)))</span>' +
            '</div>' +
            '<div>' +
              '<div class="cn">PSK ' + C.esc(dg) + ' •••• ••••</div>' +
              '<div class="cr"><b>' + C.esc(u.presence || '☕ Nongki Dulu') + '</b><small>SALDO ' + (u.psc || 0) + ' PSC</small></div>' +
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

  function renderGue() {
    var u = S.user;
    var rk = C.rankInfo(u.streak);
    var pinnedItem = u.pinnedGiftId ? C.findItem(u.pinnedGiftId) : null;

    var bannerStyle = u.bannerUrl
      ? 'background-image:url(\'' + C.esc(API.assetUrl(u.bannerUrl)) + '\');background-size:cover;background-position:center'
      : 'background:radial-gradient(circle at 25% 20%,#8FC7FF,transparent 55%),linear-gradient(135deg,#176BFF,#0b2a6e)';

    var gifts = (S.inv || []).filter(function (x) {
      var it = C.findItem(x.itemId);
      return it && it.type === 'gift';
    });
    var borders = (S.inv || []).filter(function (x) {
      var it = C.findItem(x.itemId);
      return it && it.type === 'border';
    });

    var roleBadge = (u.role && u.role !== 'member')
      ? '<span class="role-tag">' + C.esc(u.role) + '</span>'
      : '';

    return (
      '<div class="pc" style="margin-bottom:18px">' +
        '<div class="cv" style="' + bannerStyle + '">' +
          (pinnedItem ? C.renderItemVisual(pinnedItem, 92, true) : '') +
        '</div>' +
        '<div class="pb">' +
          C.renderAvatar(u, 'full') +
          '<div class="nm">' + C.esc(u.name) + ' ' + roleBadge + '</div>' +
          '<div class="hd">' + C.esc(u.memberNo || 'PSK-0001') + (u.username ? ' · @' + C.esc(u.username) : '') + ' · ' + rk.title + '</div>' +
          (u.bio ? '<p class="bio">' + C.esc(u.bio) + '</p>' : '') +
          (u.spotifyUrl ? '<a class="sp" href="' + C.esc(u.spotifyUrl) + '" target="_blank" rel="noopener noreferrer">♫ Spotify Playlist / Track</a>' : '') +
          '<div style="display:flex;gap:8px;margin-top:10px">' +
            '<button class="btn b2" style="margin-top:0;flex:1" data-act="pid-edit">Edit Profil & Banner</button>' +
            '<button class="btn b2" style="margin-top:0;width:auto;padding:0 14px" data-act="pid-sync-tele" title="Sinkron ulang foto & nama dari Telegram">🔄 Tele</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<h3 class="gh">STATUS AKTIVITAS (LIVE PRESENCE)</h3>' +
      '<div class="grp" style="margin-bottom:18px">' +
        '<div class="rw">' +
          '<div><b>' + C.esc((u.presence || '☕ Nongki Dulu').replace(/undefined/gi, '').trim() || '☕ Nongki Dulu') + '</b><small>Tampil di daftar warga aktif (otomatis reset 6 jam)</small></div>' +
          '<button class="pill" data-act="pid-presence-sheet">Ganti</button>' +
        '</div>' +
      '</div>' +

      '<h3 class="gh">KARTU PUNKID (TAP UNTUK PUTAR)</h3>' +
      renderPunkCard(u) +

      '<h3 class="gh">AVATAR BORDER (DISCORD STYLE) · TAP PASANG</h3>' +
      (borders.length
        ? '<div class="hs" style="margin-bottom:14px">' +
            '<button data-act="pid-equip-border" data-id="" class="' + (!u.equippedBorderId ? 'on' : '') + '"><div style="height:56px;display:grid;place-items:center;font-size:20px">🚫</div>Lepas</button>' +
            borders.map(function (x) {
              var it = C.findItem(x.itemId);
              var active = u.equippedBorderId === it.id;
              return '<button data-act="pid-equip-border" data-id="' + C.esc(it.id) + '" class="' + (active ? 'on' : '') + '">' + C.renderItemVisual(it, 56, false) + C.esc(it.name) + '</button>';
            }).join('') +
          '</div>'
        : '<div class="grp" style="margin-bottom:14px"><div class="rw"><small>Belum punya Avatar Border. Beli di Lapak Rongsok!</small></div></div>') +

      '<h3 class="gh">KOLEKSI GIFT · TAP PASANG DI PROFIL & BANNER</h3>' +
      (gifts.length
        ? '<div class="hs">' +
            gifts.map(function (x) {
              var it = C.findItem(x.itemId);
              var active = u.pinnedGiftId === it.id;
              return '<button data-act="pid-pin-gift" data-id="' + C.esc(it.id) + '" class="' + (active ? 'on' : '') + '">' + C.renderItemVisual(it, 58, false) + C.esc(it.name) + '</button>';
            }).join('') +
          '</div>'
        : '<div class="grp"><div class="rw"><small>Gudang gift kosong. Beli di Lapak Rongsok atau dapet dari warga lain.</small></div></div>')
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
      '<p class="sub">Upload foto/GIF latar belakang atau ubah bio profil lo.</p>' +

      '<label>LATAR BELAKANG PROFIL (UPLOAD GAMBAR / GIF)</label>' +
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
      '<input id="ed-sp" value="' + C.esc(u.spotifyUrl || '') + '" placeholder="https://open.spotify.com/...">' +

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
        C.notify('Mas Raka', 'File Kegedean', 'Maksimal ukuran banner 5MB ya bro.');
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
      '☕ Nongki Dulu',
      '🎮 Lagi Mabar',
      '🎧 Dengerin Lagu',
      '💻 Ngoding / Kerja',
      '😴 Mode Turu',
      '🔥 Siap Rusuh'
    ];

    C.sheet(
      '<h2>Siapa yang Masih Hidup?</h2>' +
      '<p class="sub">Pilih status tongkrongan lo sekarang. Muncul di daftar warga aktif.</p>' +
      '<div class="chips" style="justify-content:center">' +
        list.map(function (p) {
          var label = (typeof p === 'string') ? p : ((p.e || '') + ' ' + (p.t || '')).trim();
          return '<button class="chip' + (cur === label ? ' on' : '') + '" data-act="pid-set-presence" data-val="' + C.esc(label) + '">' + C.esc(label) + '</button>';
        }).join('') +
      '</div>'
    );
  }

  document.addEventListener('click', async function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var act = t.getAttribute('data-act');

    if (act === 'pid-flip') {
      t.classList.toggle('on');
    } else if (act === 'pid-edit') {
      openEditProfileSheet();
    } else if (act === 'pid-pick-ring') {
      document.querySelectorAll('#ed-rings .chip').forEach(function (c) { c.classList.remove('on'); });
      t.classList.add('on');
    } else if (act === 'pid-save-profile') {
      var name = (document.getElementById('ed-name').value || '').trim();
      var bio = (document.getElementById('ed-bio').value || '').trim();
      var sp = (document.getElementById('ed-sp').value || '').trim();
      var activeRing = document.querySelector('#ed-rings .chip.on');
      var ringStyle = activeRing ? Number(activeRing.getAttribute('data-idx')) : 0;

      if (name.length < 2) {
        C.notify('Mas Raka', 'Validasi', 'Nama minimal 2 huruf.');
        return;
      }

      t.disabled = true;
      t.textContent = 'Menyimpan...';
      try {
        if (pendingBannerFile) {
          var fd = new FormData();
          fd.append('banner', pendingBannerFile);
          var upRes = await API.upload('/api/profile/banner', fd);
          if (upRes.user) S.user = upRes.user;
        }
        var res = await API.post('/api/profile', {
          name: name,
          bio: bio,
          spotifyUrl: sp,
          ringStyle: ringStyle
        });
        if (res.user) S.user = res.user;
        pendingBannerFile = null;
        C.shut();
        C.refresh();
        C.notify('Mas Raka', 'Profil Updated', 'Tampilan PunkID lo udah diperbarui.');
      } catch (err) {
        t.disabled = false;
        t.textContent = 'SIMPAN PERUBAHAN';
        C.notify('Mas Raka', 'Gagal Simpan', err.message);
      }
    } else if (act === 'pid-sync-tele') {
      t.disabled = true;
      try {
        var res = await API.post('/api/profile/sync-telegram', {});
        if (res.user) S.user = res.user;
        C.refresh();
        C.notify('Mas Raka', 'Auto-Sync Tele', 'Foto profil & info Telegram lo berhasil ditarik ulang!');
      } catch (err) {
        C.notify('Mas Raka', 'Gagal Sync', err.message);
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
        C.notify('Mas Raka', 'Status Updated', 'Status lo sekarang: ' + val);
      } catch (err) {
        C.notify('Mas Raka', 'Error', err.message);
      }
    } else if (act === 'pid-equip-border') {
      var borderId = t.getAttribute('data-id') || null;
      try {
        var res = await API.post('/api/profile/equip', { type: 'border', itemId: borderId });
        if (res.user) S.user = res.user;
        C.refresh();
        C.notify('Mas Raka', 'Avatar Border', borderId ? 'Border terpasang ke foto profil!' : 'Border dilepas.');
      } catch (err) {
        C.notify('Mas Raka', 'Error', err.message);
      }
    } else if (act === 'pid-pin-gift') {
      var giftId = t.getAttribute('data-id');
      var nextPin = (S.user.pinnedGiftId === giftId) ? null : giftId;
      try {
        var res = await API.post('/api/profile/equip', { type: 'pin', itemId: nextPin });
        if (res.user) S.user = res.user;
        C.refresh();
        C.notify('Mas Raka', 'Gift Profil', nextPin ? 'Gift dipasang di profil & banner!' : 'Gift dilepas.');
      } catch (err) {
        C.notify('Mas Raka', 'Error', err.message);
      }
    }
  });
})();
