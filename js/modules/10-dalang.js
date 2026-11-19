(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;

  var pendingItemFile = null;
  var adminData = { pendingMenfess: [], users: [], logs: [], loaded: false };

  function isOwner() { return S.user && S.user.role === 'owner'; }
  function isAdminOrOwner() { return S.user && (S.user.role === 'owner' || S.user.role === 'admin'); }

  async function fetchAdminPanel() {
    adminData.loaded = true;
    try {
      var res = await API.get('/api/admin/overview');
      adminData.pendingMenfess = res.pendingMenfess || [];
      adminData.users = res.users || [];
      adminData.logs = res.logs || [];
      if (S.curApp === 'dalang') C.refresh();
    } catch (e) {}
  }

  function renderDalang() {
    var u = S.user;
    if (!u || (u.role !== 'owner' && u.role !== 'admin' && u.role !== 'moderator')) {
      return '<div class="emp">⛔ Akses ditolak. Khusus pengurus PUNKSHIT.OS.</div>';
    }

    if (!adminData.loaded) {
      fetchAdminPanel();
    }

    var tab = S.curTab.dalang || (isAdminOrOwner() ? 'lapak' : 'mod');

    var tabsHtml = '<div class="tabs">';
    if (isAdminOrOwner()) {
      tabsHtml += '<button class="tab' + (tab === 'lapak' ? ' on' : '') + '" data-act="dl-tab" data-tab="lapak">🛒 Lapak & Border</button>';
      tabsHtml += '<button class="tab' + (tab === 'event' ? ' on' : '') + '" data-act="dl-tab" data-tab="event">📢 Event & Info</button>';
    }
    tabsHtml += '<button class="tab' + (tab === 'mod' ? ' on' : '') + '" data-act="dl-tab" data-tab="mod">📮 Moderasi (' + adminData.pendingMenfess.length + ')</button>';
    if (isOwner()) {
      tabsHtml += '<button class="tab' + (tab === 'owner' ? ' on' : '') + '" data-act="dl-tab" data-tab="owner">👑 Owner & PSC</button>';
    }
    tabsHtml += '</div>';

    // =========================================================
    // TAB 1: KELOLA LAPAK RONGSOK (TAMBAH GIFT & DISCORD BORDER)
    // =========================================================
    if (tab === 'lapak' && isAdminOrOwner()) {
      var items = S.catalog || [];
      return (
        tabsHtml +
        '<button class="btn" style="margin-top:0;margin-bottom:16px" data-act="dl-new-item-sheet">+ Tambah Gift / Discord Border Baru</button>' +
        '<h3 class="gh">KATALOG LAPAK AKTIF (' + items.length + ')</h3>' +
        '<div class="grp">' +
          items.map(function (it) {
            var typeLabel = it.type === 'border' ? '🖼️ Border' : it.type === 'skin' ? '🪪 Skin' : '🎁 Gift';
            var stockTxt = (it.stock != null && it.stock >= 0) ? ' · Stok: ' + it.stock : ' · Unlimited';
            return (
              '<div class="rw">' +
                '<div style="display:flex;align-items:center;gap:10px">' +
                  C.renderItemVisual(it, 44, false) +
                  '<div><b>' + C.esc(it.name) + '</b><small>' + typeLabel + ' · ' + it.price + ' PSC' + stockTxt + '</small></div>' +
                '</div>' +
                '<button class="pill b-danger" data-act="dl-del-item" data-id="' + C.esc(it.id) + '">Hapus</button>' +
              '</div>'
            );
          }).join('') +
        '</div>'
      );
    }

    // =========================================================
    // TAB 2: BUAT EVENT, POLLING & BROADCAST MAS RAKA
    // =========================================================
    if (tab === 'event' && isAdminOrOwner()) {
      return (
        tabsHtml +
        '<h3 class="gh">BROADCAST PENGUMUMAN (GRUP & CHANNEL)</h3>' +
        '<div class="grp" style="padding:14px;margin-bottom:16px">' +
          '<select id="dl-bc-target">' +
            '<option value="both">Grup & Channel Sekaligus</option>' +
            '<option value="group">Hanya Grup Tongkrongan</option>' +
            '<option value="channel">Hanya Channel Resmi</option>' +
          '</select>' +
          '<textarea id="dl-bc-text" placeholder="Tulis pengumuman resmi dari Mas Raka..."></textarea>' +
          '<button class="btn" style="margin-top:4px" data-act="dl-broadcast">KIRIM PENGUMUMAN SEKARANG</button>' +
        '</div>' +

        '<h3 class="gh">BUAT EVENT BARU (KALENDER KEKACAUAN)</h3>' +
        '<div class="grp" style="padding:14px;margin-bottom:16px">' +
          '<input id="dl-ev-title" placeholder="Judul Event (mis. Game Night: Gartic)">' +
          '<input id="dl-ev-date" placeholder="Waktu (mis. Sabtu, 20.00 WIB)">' +
          '<input id="dl-ev-reward" placeholder="Hadiah (mis. 200 PSC + Badge)">' +
          '<button class="btn" style="margin-top:4px" data-act="dl-create-event">PUBLISH EVENT & UMUMKAN</button>' +
        '</div>' +

        '<h3 class="gh">BUKA SIDANG WARGA (POLLING)</h3>' +
        '<div class="grp" style="padding:14px">' +
          '<input id="dl-pl-q" placeholder="Pertanyaan Sidang (mis. Malam minggu ngapain?)">' +
          '<input id="dl-pl-opts" placeholder="Pilihan dipisah koma (mis. Mabar, Movie Night, Karaoke)">' +
          '<button class="btn" style="margin-top:4px" data-act="dl-create-poll">BUKA SIDANG DI GRUP</button>' +
        '</div>'
      );
    }

    // =========================================================
    // TAB 3: MODERASI KOTAK RAHASIA (MENFESS)
    // =========================================================
    if (tab === 'mod') {
      var list = adminData.pendingMenfess || [];
      return (
        tabsHtml +
        '<h3 class="gh">ANTREAN KOTAK RAHASIA (MENFESS)</h3>' +
        '<div class="grp">' +
          (list.length
            ? list.map(function (m) {
                return (
                  '<div class="rw" style="flex-direction:column;align-items:flex-start">' +
                    '<b style="color:var(--yel)">📮 ' + C.esc(m.category) + '</b>' +
                    '<div style="font-size:14px;margin:6px 0">' + C.esc(m.text) + '</div>' +
                    '<div style="display:flex;gap:8px;width:100%">' +
                      '<button class="pill" style="flex:1" data-act="dl-mf-approve" data-id="' + C.esc(m.id) + '">✅ Tayangkan ke Channel & Grup</button>' +
                      '<button class="pill b-danger" data-act="dl-mf-reject" data-id="' + C.esc(m.id) + '">Tolak</button>' +
                    '</div>' +
                  '</div>'
                );
              }).join('')
            : '<div class="rw"><small>Antrean menfess bersih. Tidak ada pesan tertunda.</small></div>') +
        '</div>'
      );
    }

    // =========================================================
    // TAB 4: KONTROL OWNER (SUNTIK PSC, BADGE & ROLE ADMIN)
    // =========================================================
    if (tab === 'owner' && isOwner()) {
      return (
        tabsHtml +
        '<h3 class="gh">MANAJEMEN EKONOMI (SUNTIK / TARIK PSC)</h3>' +
        '<div class="grp" style="padding:14px;margin-bottom:16px">' +
          '<input id="dl-psc-user" placeholder="Telegram ID atau @username warga">' +
          '<input id="dl-psc-amt" type="number" placeholder="Nominal PSC (pakai minus -50 untuk tarik)">' +
          '<input id="dl-psc-reason" placeholder="Alasan (mis. Hadiah Juara Event)">' +
          '<button class="btn" style="margin-top:4px" data-act="dl-adjust-psc">EKSEKUSI SALDO PSC</button>' +
        '</div>' +

        '<h3 class="gh">KELOLA ROLE PENGURUS (ADMIN / MODERATOR)</h3>' +
        '<div class="grp" style="padding:14px;margin-bottom:16px">' +
          '<input id="dl-rl-user" placeholder="Telegram ID atau @username warga">' +
          '<select id="dl-rl-role">' +
            '<option value="admin">Admin (Kelola Lapak, Border, Event, Moderasi)</option>' +
            '<option value="moderator">Moderator (Moderasi Menfess & Konten)</option>' +
            '<option value="member">Member Biasa (Cabut Akses Pengurus)</option>' +
          '</select>' +
          '<button class="btn" style="margin-top:4px" data-act="dl-set-role">SIMPAN ROLE</button>' +
        '</div>' +

        '<h3 class="gh">AUDIT LOG TERBARU</h3>' +
        '<div class="grp">' +
          (adminData.logs.length
            ? adminData.logs.slice(0, 10).map(function (lg) {
                return '<div class="rw"><div><b>' + C.esc(lg.action) + '</b><small>' + C.esc(lg.detail) + '</small></div></div>';
              }).join('')
            : '<div class="rw"><small>Belum ada catatan audit.</small></div>') +
        '</div>'
      );
    }

    return tabsHtml;
  }

  // Sheet Tambah Item Lapak (Gift / Discord-Style Avatar Border / Card Skin)
  function openNewItemSheet() {
    pendingItemFile = null;
    var u = S.user;
    var initial = C.esc((u.name || '?')[0].toUpperCase());
    var pfp = u.photoUrl
      ? '<img class="pfp" src="' + C.esc(API.assetUrl(u.photoUrl)) + '" alt="">'
      : '<span>' + initial + '</span>';

    C.sheet(
      '<h2>+ Tambah Item Lapak</h2>' +
      '<p class="sub">Upload aset <i>PNG / GIF / WEBP</i> transparan buat dijadiin Gift atau Avatar Border ala Discord!</p>' +

      '<label>TIPE ITEM</label>' +
      '<select id="ni-type">' +
        '<option value="border">🖼️ Avatar Border (Bingkai Foto Profil ala Discord)</option>' +
        '<option value="gift">🎁 Gift Koleksi / Hadiah Warga</option>' +
        '<option value="skin">🪪 PunkID Card Skin</option>' +
      '</select>' +

      '<label>UPLOAD FILE VISUAL (PNG / GIF / WEBP TRANSAPARAN)</label>' +
      '<div class="up-box" id="ni-drop">' +
        '<input type="file" id="ni-file" accept="image/png,image/webp,image/gif" hidden>' +
        '<div style="font-size:13px;font-weight:600;color:var(--gblue)">📁 Pilih File Border / Gift (Maks. 3MB)</div>' +
        '<small style="color:var(--mut);font-size:11px">Gunakan PNG/GIF/WEBP transparan rasio 1:1 agar pas di avatar</small>' +
      '</div>' +

      // Live Preview Box (Langsung nampilin Border di Avatar Admin/Owner!)
      '<div id="ni-preview-area" style="display:none;margin:10px 0">' +
        '<small style="color:#6df0a0;font-weight:700;display:block;margin-bottom:4px">LIVE PREVIEW DI AVATAR:</small>' +
        '<div class="try-box">' + pfp + '<img id="ni-prev-img" class="dc-border" src="" alt=""></div>' +
      '</div>' +

      '<label>NAMA ITEM</label>' +
      '<input id="ni-name" maxlength="32" placeholder="mis. Cyber Flame Border">' +

      '<label>HARGA (PSC) & RARITY</label>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
        '<input id="ni-price" type="number" min="1" value="150" placeholder="Harga PSC">' +
        '<select id="ni-rarity"><option>Common</option><option selected>Rare</option><option>Epic</option><option>Legendary</option><option>Limited</option></select>' +
      '</div>' +

      '<label>STOK TERBATAS (KOSONGKAN = UNLIMITED)</label>' +
      '<input id="ni-stock" type="number" min="1" placeholder="mis. 10 (atau kosongkan)">' +

      '<label>DESKRIPSI SINGKAT</label>' +
      '<input id="ni-desc" maxlength="80" placeholder="Bingkai api biru menyala buat sepuh markas.">' +

      '<button class="btn" data-act="dl-save-item">PUBLISH KE LAPAK RONGSOK</button>'
    );

    var drop = document.getElementById('ni-drop');
    var inp = document.getElementById('ni-file');
    var prevArea = document.getElementById('ni-preview-area');
    var prevImg = document.getElementById('ni-prev-img');
    var typeSel = document.getElementById('ni-type');

    drop.onclick = function () { inp.click(); };
    inp.onchange = function () {
      var file = inp.files && inp.files[0];
      if (!file) return;
      if (file.size > 3 * 1024 * 1024) {
        C.notify('Mas Raka', 'File Kegedean', 'Maksimal ukuran file 3MB.');
        return;
      }
      pendingItemFile = file;
      prevImg.src = URL.createObjectURL(file);
      prevArea.style.display = 'block';
      prevImg.className = (typeSel.value === 'border') ? 'dc-border' : '';
      if (typeSel.value !== 'border') {
        prevImg.style.cssText = 'width:96px;height:96px;object-fit:contain;position:relative;z-index:8';
      } else {
        prevImg.style.cssText = '';
      }
    };
  }

  C.Views.dalang = renderDalang;

  document.addEventListener('click', async function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var act = t.getAttribute('data-act');

    if (act === 'dl-tab') {
      S.curTab.dalang = t.getAttribute('data-tab');
      C.refresh();
    } else if (act === 'dl-new-item-sheet') {
      openNewItemSheet();
    } else if (act === 'dl-save-item') {
      var type = document.getElementById('ni-type').value;
      var name = (document.getElementById('ni-name').value || '').trim();
      var price = Number(document.getElementById('ni-price').value);
      var rarity = document.getElementById('ni-rarity').value;
      var stockRaw = document.getElementById('ni-stock').value.trim();
      var desc = (document.getElementById('ni-desc').value || '').trim();

      if (name.length < 2 || !price || price < 1) {
        C.notify('Mas Raka', 'Validasi', 'Nama item dan harga PSC wajib diisi.');
        return;
      }
      if (!pendingItemFile) {
        C.notify('Mas Raka', 'File Kosong', 'Pilih file gambar/GIF untuk item ini terlebih dahulu.');
        return;
      }

      t.disabled = true;
      t.textContent = 'Mengunggah ke Server...';
      try {
        var fd = new FormData();
        fd.append('asset', pendingItemFile);
        fd.append('type', type);
        fd.append('name', name);
        fd.append('price', String(price));
        fd.append('rarity', rarity);
        if (stockRaw !== '') fd.append('stock', stockRaw);
        fd.append('desc', desc);

        var res = await API.upload('/api/admin/items', fd);
        if (res.catalog) S.catalog = res.catalog;
        pendingItemFile = null;
        C.shut();
        C.refresh();
        C.notify('Mas Raka', '→ Grup & Channel', 'ITEM BARU DI LAPAK: ' + name + ' resmi dirilis!');
      } catch (err) {
        t.disabled = false;
        t.textContent = 'PUBLISH KE LAPAK RONGSOK';
        C.notify('Mas Raka', 'Gagal Publish', err.message);
      }
    } else if (act === 'dl-del-item') {
      var id = t.getAttribute('data-id');
      t.disabled = true;
      try {
        var res = await API.del('/api/admin/items/' + encodeURIComponent(id));
        if (res.catalog) S.catalog = res.catalog;
        C.refresh();
        C.notify('Mas Raka', 'Dihapus', 'Item dihapus dari katalog Lapak Rongsok.');
      } catch (err) {
        t.disabled = false;
        C.notify('Mas Raka', 'Gagal', err.message);
      }
    } else if (act === 'dl-broadcast') {
      var target = document.getElementById('dl-bc-target').value;
      var text = (document.getElementById('dl-bc-text').value || '').trim();
      if (text.length < 3) return;
      t.disabled = true;
      try {
        await API.post('/api/admin/broadcast', { target: target, text: text });
        document.getElementById('dl-bc-text').value = '';
        C.notify('Mas Raka', 'Broadcast Terkirim', 'Pengumuman berhasil dikirim!');
      } catch (err) {
        C.notify('Mas Raka', 'Gagal', err.message);
      } finally {
        t.disabled = false;
      }
    } else if (act === 'dl-create-event') {
      var title = (document.getElementById('dl-ev-title').value || '').trim();
      var dateText = (document.getElementById('dl-ev-date').value || '').trim();
      var rewardText = (document.getElementById('dl-ev-reward').value || '').trim();
      if (!title || !dateText) return;
      t.disabled = true;
      try {
        var res = await API.post('/api/admin/events', { title: title, dateText: dateText, rewardText: rewardText });
        if (res.events) S.events = res.events;
        document.getElementById('dl-ev-title').value = '';
        C.notify('Mas Raka', 'Event Published', 'Jadwal event terbit di Kalender & diumumkan ke Grup/Channel!');
      } catch (err) {
        C.notify('Mas Raka', 'Gagal', err.message);
      } finally {
        t.disabled = false;
      }
    } else if (act === 'dl-create-poll') {
      var q = (document.getElementById('dl-pl-q').value || '').trim();
      var opts = (document.getElementById('dl-pl-opts').value || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      if (!q || opts.length < 2) {
        C.notify('Mas Raka', 'Validasi', 'Isi pertanyaan dan minimal 2 pilihan dipisah koma.');
        return;
      }
      t.disabled = true;
      try {
        var res = await API.post('/api/admin/polls', { question: q, options: opts });
        if (res.polls) S.polls = res.polls;
        document.getElementById('dl-pl-q').value = '';
        document.getElementById('dl-pl-opts').value = '';
        C.notify('Mas Raka', 'Sidang Dibuka', 'Polling aktif & diumumkan ke Grup!');
      } catch (err) {
        C.notify('Mas Raka', 'Gagal', err.message);
      } finally {
        t.disabled = false;
      }
    } else if (act === 'dl-mf-approve' || act === 'dl-mf-reject') {
      var mid = t.getAttribute('data-id');
      var decision = (act === 'dl-mf-approve') ? 'approve' : 'reject';
      t.disabled = true;
      try {
        var res = await API.post('/api/admin/menfess/review', { id: mid, decision: decision });
        adminData.pendingMenfess = res.pendingMenfess || [];
        C.refresh();
        C.notify('Mas Raka', 'Moderasi', decision === 'approve' ? 'Menfess ditayangkan ke Channel & Grup!' : 'Menfess ditolak.');
      } catch (err) {
        t.disabled = false;
        C.notify('Mas Raka', 'Gagal', err.message);
      }
    } else if (act === 'dl-adjust-psc') {
      var targetUser = (document.getElementById('dl-psc-user').value || '').trim();
      var amount = Number(document.getElementById('dl-psc-amt').value);
      var reason = (document.getElementById('dl-psc-reason').value || '').trim();
      if (!targetUser || !amount) return;
      t.disabled = true;
      try {
        await API.post('/api/admin/economy/adjust', { target: targetUser, amount: amount, reason: reason });
        document.getElementById('dl-psc-amt').value = '';
        fetchAdminPanel();
        C.notify('Mas Raka', 'Ekonomi Updated', 'Saldo warga berhasil diperbarui & dicatat di Audit Log.');
      } catch (err) {
        C.notify('Mas Raka', 'Gagal', err.message);
      } finally {
        t.disabled = false;
      }
    } else if (act === 'dl-set-role') {
      var rUser = (document.getElementById('dl-rl-user').value || '').trim();
      var rVal = document.getElementById('dl-rl-role').value;
      if (!rUser) return;
      t.disabled = true;
      try {
        await API.post('/api/admin/roles', { target: rUser, role: rVal });
        fetchAdminPanel();
        C.notify('Mas Raka', 'Role Updated', 'Hak akses pengurus berhasil diperbarui.');
      } catch (err) {
        C.notify('Mas Raka', 'Gagal', err.message);
      } finally {
        t.disabled = false;
      }
    }
  });
})();
