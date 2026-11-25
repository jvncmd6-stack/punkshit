(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;

  var pendingItemFile = null;
  var adminData = {
    pendingMenfess: [],
    pendingCollabs: [],
    pscRequests: [],
    users: [],
    logs: [],
    loaded: false
  };

  function isOwner() { return S.user && S.user.role === 'owner'; }
  function isAdminOrOwner() { return S.user && (S.user.role === 'owner' || S.user.role === 'admin'); }
  function isWebmUrl(url) { return /\.(webm|mp4)(\?.*)?$/i.test(String(url || '').trim()); }

  async function fetchAdminPanel() {
    adminData.loaded = true;
    try {
      var res = await API.get('/api/admin/overview');
      adminData.pendingMenfess = res.pendingMenfess || [];
      adminData.pendingCollabs = res.pendingCollabs || [];
      adminData.pscRequests = res.pscRequests || [];
      adminData.users = res.users || [];
      adminData.logs = res.logs || [];
      if (S.curApp === 'dalang') C.refresh();
    } catch (e) {
      C.notify('Mas Raka', 'Ruang Dalang', e.message || 'Gagal memuat data pengurus.');
    }
  }

  function renderSecurityTab() {
    var mfList = adminData.pendingMenfess.map(function (m) {
      return '<div class="card" style="padding:12px;margin-bottom:8px;border:1px solid rgba(255,255,255,.1)">' +
        '<div style="display:flex;justify-content:space-between;align-items:center">' +
          '<span class="pill">' + C.esc((m.category || 'UMUM').toUpperCase()) + '</span>' +
          '<small style="opacity:.6">ID: ' + C.esc(m.id) + '</small>' +
        '</div>' +
        '<p style="margin:8px 0;font-size:13px;line-height:1.45">"' + C.esc(m.text) + '"</p>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
          '<button class="btn" style="padding:8px;font-size:12px" data-act="dl-mf-approve" data-id="' + C.esc(m.id) + '">✅ Tayangkan</button>' +
          '<button class="btn b2" style="padding:8px;font-size:12px;color:#FCA5A5" data-act="dl-mf-reject" data-id="' + C.esc(m.id) + '">❌ Tolak</button>' +
        '</div>' +
      '</div>';
    }).join('') || '<div class="rw"><small>Tidak ada antrean Kotak Rahasia pending.</small></div>';

    var frozenList = (adminData.users || []).filter(function (u) { return Number(u.isFrozen) === 1; });
    var frozenHtml = frozenList.length
      ? frozenList.map(function (u) {
          return '<div class="rw"><div><b>🧊 ' + C.esc(u.name) + '</b><small>@' + C.esc(u.username || u.id) + '</small></div>' +
            '<button class="pill" data-act="dl-unfreeze-quick" data-target="' + C.esc(u.id) + '">Pulihkan</button></div>';
        }).join('')
      : '<div class="rw"><small>Tidak ada akun warga yang sedang dibekukan.</small></div>';

    return (
      '<div class="card">' +
        '<h3>🧊 Penertiban & Freeze Akun</h3>' +
        '<p class="sub">Bekukan sementara warga bermasalah agar tidak bisa belanja, kirim menfess, atau transfer PSC.</p>' +
        '<label>TARGET WARGA (@username atau Telegram ID)</label>' +
        '<input id="dl-frz-user" placeholder="Contoh: @username atau 123456789">' +
        '<label>ALASAN PENERTIBAN</label>' +
        '<input id="dl-frz-reason" placeholder="Contoh: Spam / melanggar pasal">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">' +
          '<button class="btn" style="background:#DC2626" data-act="dl-freeze" data-mode="freeze">🧊 Bekukan Akun</button>' +
          '<button class="btn b2" data-act="dl-freeze" data-mode="unfreeze">☀️ Pulihkan Akun</button>' +
        '</div>' +
      '</div>' +
      '<div class="card" style="margin-top:12px"><h3>Daftar Akun Dibekukan</h3><div class="grp">' + frozenHtml + '</div></div>' +
      '<div class="card" style="margin-top:12px"><h3>📮 Moderasi Kotak Rahasia (' + adminData.pendingMenfess.length + ')</h3>' + mfList + '</div>' +
      '<div class="card" style="margin-top:12px">' +
        '<h3>🧹 Bersihkan Wanted Board</h3>' +
        '<p class="sub">Hapus seluruh postingan Wanted mabar/voice yang menumpuk.</p>' +
        '<button class="btn b2" data-act="dl-clear-wanted">BERSIHKAN WANTED BOARD</button>' +
      '</div>'
    );
  }

  function renderCatalogTab() {
    var colHtml = adminData.pendingCollabs.map(function (c) {
      var mediaHtml = '';
      if (c.image_url) {
        var resolved = C.esc(API.assetUrl(c.image_url));
        mediaHtml = isWebmUrl(c.image_url)
          ? '<video src="' + resolved + '" autoplay loop muted playsinline style="width:52px;height:52px;border-radius:10px;object-fit:cover;background:#0f172a"></video>'
          : '<img src="' + resolved + '" style="width:52px;height:52px;border-radius:10px;object-fit:cover;background:#0f172a">';
      }
      return '<div class="card" style="padding:12px;margin-bottom:8px">' +
        '<div style="display:flex;gap:10px;align-items:center">' +
          mediaHtml +
          '<div style="flex:1">' +
            '<span class="pill">' + C.esc((c.type || 'item').toUpperCase()) + '</span> <b>' + C.esc(c.name) + '</b>' +
            '<div style="font-size:12px;color:#FFD633">' + c.price + ' PSC · oleh ' + C.esc(c.creator_name) + '</div>' +
            '<small style="opacity:.75">' + C.esc(c.desc || '') + '</small>' +
          '</div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">' +
          '<button class="btn" style="padding:8px;font-size:12px" data-act="dl-collab-acc" data-id="' + C.esc(c.id) + '">✅ ACC & Rilis</button>' +
          '<button class="btn b2" style="padding:8px;font-size:12px;color:#FCA5A5" data-act="dl-collab-rej" data-id="' + C.esc(c.id) + '">❌ Tolak</button>' +
        '</div>' +
      '</div>';
    }).join('') || '<div class="rw"><small>Belum ada pengajuan item collab baru.</small></div>';

    var catalogRows = (S.catalog || []).map(function (it) {
      var isArchived = Boolean(it.isArchived);
      return '<div class="rw" style="gap:8px">' +
        '<div style="min-width:0;flex:1">' +
          '<b>' + C.esc(it.name) + '</b>' +
          (isArchived ? ' <span class="lim-tag">ARSIP</span>' : '') +
          '<small>' + C.esc(it.type) + ' · ' + it.price + ' PSC (' + C.esc(it.rarity || 'Rare') + ')</small>' +
        '</div>' +
        '<div style="display:flex;gap:5px;flex-shrink:0">' +
          (!isArchived
            ? '<button class="pill" style="color:#FDE047;font-size:11px" title="Tarik dari toko & jadikan Limited (koleksi warga aman)" data-act="dl-archive-item" data-id="' + C.esc(it.id) + '">📦 Limited</button>'
            : '') +
          '<button class="pill" style="color:#FCA5A5;background:rgba(220,38,38,.18);font-size:11px" title="Hapus permanen dari katalog & gudang" data-act="dl-force-del-ask" data-id="' + C.esc(it.id) + '" data-name="' + C.esc(it.name) + '">🗑️ Hapus</button>' +
        '</div>' +
      '</div>';
    }).join('') || '<div class="rw"><small>Katalog kosong.</small></div>';

    return (
      '<div class="card">' +
        '<div style="display:flex;justify-content:space-between;align-items:center">' +
          '<div><h3>🏪 Lapak Rongsok Resmi</h3><p class="sub">Tambah atau kelola item eksklusif markas.</p></div>' +
          '<button class="pill" style="background:#2563EB;color:#fff;font-weight:800" data-act="dl-new-item-sheet">+ Item</button>' +
        '</div>' +
      '</div>' +
      '<div class="card" style="margin-top:12px"><h3>🎨 Kurasi Collab Warga (' + adminData.pendingCollabs.length + ')</h3>' + colHtml + '</div>' +
      '<div class="card" style="margin-top:12px"><h3>📦 Daftar Item Katalog (' + (S.catalog || []).length + ')</h3><p class="sub" style="margin-bottom:8px"><b>📦 Limited</b> = tarik dari toko (koleksi warga tetap aman). <b>🗑️ Hapus</b> = hapus permanen (untuk item bug/rusak).</p><div class="grp">' + catalogRows + '</div></div>'
    );
  }

  function renderAssistantTab() {
    return (
      '<div class="card">' +
        '<h3>📢 Broadcast Pengumuman</h3>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0">' +
          '<button class="pill" data-act="dl-tpl" data-tpl="absen">🔥 Reminder Absen</button>' +
          '<button class="pill" data-act="dl-tpl" data-tpl="event">🎮 Ajak Mabar</button>' +
          '<button class="pill" data-act="dl-tpl" data-tpl="lapak">🛍️ Promo Lapak</button>' +
        '</div>' +
        '<select id="dl-bc-target"><option value="both">Grup & Channel Resmi</option><option value="group">Grup Markas Saja</option><option value="channel">Channel Info Saja</option></select>' +
        '<textarea id="dl-bc-text" rows="3" placeholder="Tulis pengumuman resmi dari Mas Raka..."></textarea>' +
        '<button class="btn" data-act="dl-broadcast">KIRIM PENGUMUMAN</button>' +
      '</div>' +
      '<div class="card" style="margin-top:12px">' +
        '<h3>📅 Buat Jadwal Event</h3>' +
        '<input id="dl-ev-title" placeholder="Judul Event (mis. Mabar MLBB / Karaoke OS)">' +
        '<input id="dl-ev-date" placeholder="Waktu (mis. Sabtu, 21.00 WIB)">' +
        '<input id="dl-ev-reward" placeholder="Hadiah (mis. 300 PSC + Street Cred)">' +
        '<button class="btn" data-act="dl-create-event">TERBITKAN EVENT</button>' +
      '</div>' +
      '<div class="card" style="margin-top:12px">' +
        '<h3>🗳️ Buka Sidang Warga (Polling)</h3>' +
        '<input id="dl-pl-q" placeholder="Pertanyaan sidang...">' +
        '<input id="dl-pl-opts" placeholder="Pilihan dipisah koma (mis. Setuju, Tolak, Netral)">' +
        '<button class="btn" data-act="dl-create-poll">BUKA SIDANG SEKARANG</button>' +
      '</div>'
    );
  }

  function renderVaultTab() {
    var ownerMode = isOwner();
    var reqHtml = adminData.pscRequests.map(function (r) {
      var btns = ownerMode
        ? '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">' +
            '<button class="btn" style="padding:7px;font-size:12px" data-act="dl-req-approve" data-id="' + C.esc(r.id) + '">✅ ACC Cairkan</button>' +
            '<button class="btn b2" style="padding:7px;font-size:12px;color:#FCA5A5" data-act="dl-req-reject" data-id="' + C.esc(r.id) + '">❌ Tolak</button>' +
          '</div>'
        : '<div style="font-size:11px;color:#FACC15;margin-top:4px">⏳ Menunggu ACC Owner</div>';

      return '<div class="card" style="padding:10px;margin-bottom:8px">' +
        '<div><b>+' + r.amount + ' PSC</b> untuk <b>' + C.esc(r.target_name) + '</b></div>' +
        '<small>Diajukan: ' + C.esc(r.requester_name) + ' · Alasan: "' + C.esc(r.reason) + '"</small>' +
        btns +
      '</div>';
    }).join('') || '<div class="rw"><small>Tidak ada antrean pengajuan PSC.</small></div>';

    var logRows = adminData.logs.slice(0, 12).map(function (l) {
      return '<div class="rw"><div><b>' + C.esc(l.action) + '</b><small>' + C.esc(l.detail) + '</small></div></div>';
    }).join('') || '<div class="rw"><small>Belum ada catatan audit.</small></div>';

    var userListHtml = adminData.users.slice(0, 30).map(function (usr) {
      return '<div class="rw">' +
        '<div><b>' + C.esc(usr.name) + '</b> <small>(' + C.esc(usr.role || 'member') + ')</small>' +
        '<small style="color:#FFD633">💰 ' + (usr.psc || 0) + ' PSC · ⭐ ' + (usr.cred || 0) + ' Cred · ID: ' + C.esc(usr.id) + '</small></div>' +
      '</div>';
    }).join('');

    var topForm = ownerMode
      ? '<div class="card">' +
          '<h3>👑 Brankas PSC Langsung (Khusus Owner)</h3>' +
          '<input id="dl-psc-user" placeholder="Target (@username atau ID)">' +
          '<input id="dl-psc-amt" type="number" placeholder="Nominal PSC (mis. 500 atau -200)">' +
          '<input id="dl-psc-reason" placeholder="Catatan audit...">' +
          '<button class="btn" data-act="dl-adjust-psc">EKSEKUSI SALDO PSC</button>' +
        '</div>' +
        '<div class="card" style="margin-top:12px">' +
          '<h3>🛡️ Atur Jabatan Pengurus</h3>' +
          '<input id="dl-rl-user" placeholder="Target (@username atau ID)">' +
          '<select id="dl-rl-role"><option value="member">Member Biasa</option><option value="moderator">Moderator</option><option value="admin">Admin Markas</option></select>' +
          '<button class="btn b2" data-act="dl-set-role">SIMPAN JABATAN</button>' +
        '</div>'
      : '<div class="card">' +
          '<h3>💰 Ajukan Hadiah / Pencairan PSC</h3>' +
          '<p class="sub">Pengajuan dari Admin wajib mendapat persetujuan Owner sebelum saldo cair ke warga.</p>' +
          '<input id="dl-req-user" placeholder="Target penerima (@username atau ID)">' +
          '<input id="dl-req-amt" type="number" min="1" max="5000" placeholder="Nominal PSC (1 - 5000)">' +
          '<input id="dl-req-reason" placeholder="Alasan pemberian (mis. Juara Event Mabar)">' +
          '<button class="btn" data-act="dl-req-psc">KIRIM PENGAJUAN KE OWNER</button>' +
        '</div>';

    return (
      topForm +
      '<div class="card" style="margin-top:12px"><h3>🔐 Antrean Izin Pencairan PSC (' + adminData.pscRequests.length + ')</h3>' + reqHtml + '</div>' +
      '<div class="card" style="margin-top:12px"><h3>📜 Audit Log Pengurus</h3><div class="grp">' + logRows + '</div></div>' +
      '<div class="card" style="margin-top:12px"><h3>👥 Data Warga (' + adminData.users.length + ')</h3><div class="grp">' + userListHtml + '</div></div>'
    );
  }

  function renderDalang() {
    var u = S.user;
    if (!u || (u.role !== 'owner' && u.role !== 'admin' && u.role !== 'moderator')) {
      return '<div class="emp">⛔ Akses khusus pengurus PUNKSHIT.OS ya cuy.</div>';
    }

    if (!adminData.loaded) fetchAdminPanel();

    var tab = S.curTab.dalang || 'mod';
    var badgeMod = adminData.pendingMenfess.length;
    var badgeCol = adminData.pendingCollabs.length;
    var badgeReq = adminData.pscRequests.length;

    var tabsHtml = '<div class="tabs">';
    tabsHtml += '<button class="tab' + (tab === 'mod' ? ' on' : '') + '" data-act="dl-tab" data-tab="mod">🛡️ Keamanan' + (badgeMod ? ' (' + badgeMod + ')' : '') + '</button>';
    if (isAdminOrOwner()) {
      tabsHtml += '<button class="tab' + (tab === 'lapak' ? ' on' : '') + '" data-act="dl-tab" data-tab="lapak">🎨 Lapak' + (badgeCol ? ' (' + badgeCol + ')' : '') + '</button>';
      tabsHtml += '<button class="tab' + (tab === 'event' ? ' on' : '') + '" data-act="dl-tab" data-tab="event">📢 Asisten</button>';
      tabsHtml += '<button class="tab' + (tab === 'owner' ? ' on' : '') + '" data-act="dl-tab" data-tab="owner">' + (isOwner() ? '👑 Brankas' : '💰 Izin PSC') + (badgeReq ? ' (' + badgeReq + ')' : '') + '</button>';
    }
    tabsHtml += '</div>';

    if (tab === 'mod') return tabsHtml + renderSecurityTab();
    if (tab === 'lapak' && isAdminOrOwner()) return tabsHtml + renderCatalogTab();
    if (tab === 'event' && isAdminOrOwner()) return tabsHtml + renderAssistantTab();
    if (tab === 'owner' && isAdminOrOwner()) return tabsHtml + renderVaultTab();
    return tabsHtml + renderSecurityTab();
  }

  function openNewItemSheet() {
    pendingItemFile = null;
    var u = S.user || {};
    var initial = C.esc((u.name || '?')[0].toUpperCase());
    var pfp = u.photoUrl
      ? '<img class="pfp" src="' + C.esc(API.assetUrl(u.photoUrl)) + '" alt="">'
      : '<span>' + initial + '</span>';

    C.sheet(
      '<h2>+ Tambah Item Lapak Resmi</h2>' +
      '<p class="sub">Upload aset <i>PNG / GIF / WEBP / WEBM</i> transparan buat dijadiin Gift, Border, atau Skin.</p>' +
      '<label>TIPE ITEM</label>' +
      '<select id="ni-type">' +
        '<option value="border">🖼️ Avatar Border</option>' +
        '<option value="gift">🎁 Gift Koleksi</option>' +
        '<option value="skin">🪪 PunkID Card Skin</option>' +
      '</select>' +
      '<label>FILE VISUAL (PNG / GIF / WEBP / WEBM)</label>' +
      '<div class="up-box" id="ni-drop">' +
        '<input type="file" id="ni-file" accept="image/png,image/webp,image/gif,video/webm,.webm" hidden>' +
        '<div id="ni-file-lbl" style="font-size:13px;font-weight:600;color:var(--gblue)">📁 Pilih File Item (Maks. 10MB)</div>' +
      '</div>' +
      '<div id="ni-preview-area" style="display:none;margin:10px 0">' +
        '<div class="try-box" id="ni-try-box">' + pfp + '<div id="ni-prev-slot"></div></div>' +
      '</div>' +
      '<label>NAMA ITEM</label><input id="ni-name" maxlength="32" placeholder="mis. Crimson Aura Border">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
        '<input id="ni-price" type="number" min="1" value="150" placeholder="Harga PSC">' +
        '<select id="ni-rarity"><option>Common</option><option selected>Rare</option><option>Epic</option><option>Legendary</option><option>Limited</option></select>' +
      '</div>' +
      '<input id="ni-stock" type="number" min="1" placeholder="Stok terbatas (kosongkan = unlimited)">' +
      '<input id="ni-desc" maxlength="80" placeholder="Deskripsi singkat item...">' +
      '<button class="btn" data-act="dl-save-item">PUBLISH KE LAPAK RONGSOK</button>'
    );

    var drop = document.getElementById('ni-drop');
    var inp = document.getElementById('ni-file');
    var lbl = document.getElementById('ni-file-lbl');
    var prevArea = document.getElementById('ni-preview-area');
    var prevSlot = document.getElementById('ni-prev-slot');
    var typeSel = document.getElementById('ni-type');

    drop.onclick = function () { inp.click(); };
    inp.onchange = function () {
      var file = inp.files && inp.files[0];
      if (!file) return;
      pendingItemFile = file;
      lbl.innerHTML = '✅ File siap: <b>' + C.esc(file.name) + '</b>';
      lbl.style.color = '#34C759';
      var objUrl = URL.createObjectURL(file);
      var isVid = /\.webm$/i.test(file.name) || file.type === 'video/webm';
      var isBorder = typeSel.value === 'border';
      var clsAttr = isBorder ? ' class="dc-border"' : '';
      var styAttr = !isBorder ? ' style="width:96px;height:96px;object-fit:contain;position:relative;z-index:8"' : '';

      prevSlot.innerHTML = isVid
        ? '<video src="' + objUrl + '" autoplay loop muted playsinline' + clsAttr + styAttr + '></video>'
        : '<img src="' + objUrl + '"' + clsAttr + styAttr + ' alt="">';
      prevArea.style.display = 'block';
    };
  }

  C.Views.dalang = renderDalang;

  if (window.__punkDalangBound) return;
  window.__punkDalangBound = true;

  document.addEventListener('click', async function (e) {
    var t = e.target.closest('[data-act]');
    if (!t || t.disabled) return;
    var act = t.getAttribute('data-act');

    if (act === 'dl-tab') {
      S.curTab.dalang = t.getAttribute('data-tab');
      C.refresh();
    } else if (act === 'dl-tpl') {
      var tpl = t.getAttribute('data-tpl');
      var box = document.getElementById('dl-bc-text');
      if (!box) return;
      if (tpl === 'absen') box.value = '🔥 Absen harian udah dibuka cuy! Jangan lupa mampir ke Markas biar streak aman dan dompet nambah.';
      else if (tpl === 'event') box.value = '🎮 Warga tongkrongan merapat! Agenda mabar & nongkrong bareng sebentar lagi mulai. Cek detailnya di menu Event ya!';
      else if (tpl === 'lapak') box.value = '🛍️ Etalase Lapak Warga & Lapak Rongsok lagi rame karya baru nih! Yuk mampir dan dukung kreator markas.';
    } else if (act === 'dl-new-item-sheet') {
      openNewItemSheet();
    } else if (act === 'dl-save-item') {
      var name = (document.getElementById('ni-name').value || '').trim();
      var price = Number(document.getElementById('ni-price').value);
      if (name.length < 2 || !price || !pendingItemFile) {
        return C.notify('Mas Raka', 'Cek Isian', 'Pastikan nama, harga, dan file visual sudah diisi ya cuy.');
      }
      t.disabled = true;
      try {
        var fd = new FormData();
        fd.append('asset', pendingItemFile);
        fd.append('type', document.getElementById('ni-type').value);
        fd.append('name', name);
        fd.append('price', String(price));
        fd.append('rarity', document.getElementById('ni-rarity').value);
        var stk = document.getElementById('ni-stock').value.trim();
        if (stk !== '') fd.append('stock', stk);
        fd.append('desc', (document.getElementById('ni-desc').value || '').trim());

        var res = await API.upload('/api/admin/items', fd);
        if (res.catalog) S.catalog = res.catalog;
        pendingItemFile = null;
        C.shut();
        C.refresh();
        C.notify('Mas Raka', 'Lapak Rongsok', 'Mantap! Item "' + name + '" resmi dirilis ke katalog.');
      } catch (err) {
        t.disabled = false;
        C.notify('Mas Raka', 'Belum Berhasil', err.message);
      }
    } else if (act === 'dl-archive-item') {
      t.disabled = true;
      try {
        var aRes = await API.del('/api/admin/items/' + encodeURIComponent(t.getAttribute('data-id')));
        if (aRes.catalog) S.catalog = aRes.catalog;
        C.refresh();
        C.notify('Mas Raka', 'Arsip Limited', aRes.message || 'Item ditarik & dijadikan Limited.');
      } catch (err) { t.disabled = false; C.notify('Mas Raka', 'Info', err.message); }
    } else if (act === 'dl-force-del-ask') {
      var fId = t.getAttribute('data-id');
      var fName = t.getAttribute('data-name') || 'Item ini';
      C.sheet(
        '<h2>🗑️ Hapus Permanen Item?</h2>' +
        '<p class="sub">Item <b>"' + C.esc(fName) + '"</b> akan dihapus permanen dari katalog Lapak Rongsok, gudang seluruh warga, dan profil yang memakainya.</p>' +
        '<button class="btn" style="background:#DC2626" data-act="dl-force-del-confirm" data-id="' + C.esc(fId) + '">YA, HAPUS PERMANEN</button>' +
        '<button class="btn b2" data-act="shut">BATAL</button>'
      );
    } else if (act === 'dl-force-del-confirm') {
      t.disabled = true;
      t.textContent = 'Menghapus Permanen...';
      try {
        var fRes = await API.del('/api/admin/items/' + encodeURIComponent(t.getAttribute('data-id')) + '?force=1');
        if (fRes.catalog) S.catalog = fRes.catalog;
        C.shut();
        C.refresh();
        C.notify('Mas Raka', 'Hapus Permanen', fRes.message || 'Item berhasil dihapus permanen.');
      } catch (err) {
        t.disabled = false;
        t.textContent = 'YA, HAPUS PERMANEN';
        C.notify('Mas Raka', 'Info', err.message);
      }
    } else if (act === 'dl-collab-acc' || act === 'dl-collab-rej') {
      t.disabled = true;
      try {
        var cRes = await API.post('/api/admin/collab/review', { id: t.getAttribute('data-id'), decision: act === 'dl-collab-acc' ? 'approve' : 'reject' });
        if (cRes.catalog) S.catalog = cRes.catalog;
        fetchAdminPanel();
        C.notify('Mas Raka', 'Kurasi Collab', act === 'dl-collab-acc' ? 'Item collab resmi rilis di Lapak Rongsok!' : 'Pengajuan collab ditolak.');
      } catch (err) { t.disabled = false; C.notify('Mas Raka', 'Info', err.message); }
    } else if (act === 'dl-freeze') {
      var fUser = (document.getElementById('dl-frz-user').value || '').trim();
      var fReason = (document.getElementById('dl-frz-reason').value || '').trim();
      var mode = t.getAttribute('data-mode');
      if (!fUser) return C.notify('Mas Raka', 'Cek Target', 'Masukkan ID atau @username warga dulu ya.');
      t.disabled = true;
      try {
        await API.post('/api/admin/users/freeze', { target: fUser, mode: mode, reason: fReason });
        fetchAdminPanel();
        C.notify('Mas Raka', 'Keamanan Markas 🛡️', mode === 'freeze' ? 'Akun warga dibekukan sementara demi ketertiban.' : 'Akses akun warga sudah dipulihkan.');
      } catch (err) { C.notify('Mas Raka', 'Info', err.message); } finally { t.disabled = false; }
    } else if (act === 'dl-unfreeze-quick') {
      t.disabled = true;
      try {
        await API.post('/api/admin/users/freeze', { target: t.getAttribute('data-target'), mode: 'unfreeze', reason: 'Dipulihkan pengurus' });
        fetchAdminPanel();
        C.notify('Mas Raka', 'Keamanan Markas 🛡️', 'Akun warga berhasil dipulihkan.');
      } catch (err) { t.disabled = false; C.notify('Mas Raka', 'Info', err.message); }
    } else if (act === 'dl-clear-wanted') {
      t.disabled = true;
      try {
        var wRes = await API.post('/api/wanted/clear', {});
        S.wanted = wRes.wanted || [];
        C.notify('Mas Raka', 'Wanted Bersih', 'Papan Wanted Board sudah dibersihkan.');
      } catch (err) { C.notify('Mas Raka', 'Info', err.message); } finally { t.disabled = false; }
    } else if (act === 'dl-broadcast') {
      var text = (document.getElementById('dl-bc-text').value || '').trim();
      if (text.length < 3) return;
      t.disabled = true;
      try {
        await API.post('/api/admin/broadcast', { target: document.getElementById('dl-bc-target').value, text: text });
        document.getElementById('dl-bc-text').value = '';
        C.notify('Mas Raka', 'Pengumuman Terkirim 📢', 'Sip, pengumuman udah diteruskan!');
      } catch (err) { C.notify('Mas Raka', 'Info', err.message); } finally { t.disabled = false; }
    } else if (act === 'dl-create-event') {
      var title = (document.getElementById('dl-ev-title').value || '').trim();
      var dateText = (document.getElementById('dl-ev-date').value || '').trim();
      if (!title || !dateText) return;
      t.disabled = true;
      try {
        var eRes = await API.post('/api/admin/events', { title: title, dateText: dateText, rewardText: (document.getElementById('dl-ev-reward').value || '').trim() });
        if (eRes.events) S.events = eRes.events;
        document.getElementById('dl-ev-title').value = '';
        C.notify('Mas Raka', 'Event Terbit 📅', 'Jadwal event udah masuk kalender & diumumkan!');
      } catch (err) { C.notify('Mas Raka', 'Info', err.message); } finally { t.disabled = false; }
    } else if (act === 'dl-create-poll') {
      var q = (document.getElementById('dl-pl-q').value || '').trim();
      var opts = (document.getElementById('dl-pl-opts').value || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      if (!q || opts.length < 2) return C.notify('Mas Raka', 'Cek Pilihan', 'Isi pertanyaan dan minimal 2 pilihan dipisah koma ya.');
      t.disabled = true;
      try {
        var pRes = await API.post('/api/admin/polls', { question: q, options: opts });
        if (pRes.polls) S.polls = pRes.polls;
        document.getElementById('dl-pl-q').value = '';
        document.getElementById('dl-pl-opts').value = '';
        C.notify('Mas Raka', 'Sidang Dibuka 🗳️', 'Polling udah aktif di grup!');
      } catch (err) { C.notify('Mas Raka', 'Info', err.message); } finally { t.disabled = false; }
    } else if (act === 'dl-mf-approve' || act === 'dl-mf-reject') {
      t.disabled = true;
      try {
        var mRes = await API.post('/api/admin/menfess/review', { id: t.getAttribute('data-id'), decision: act === 'dl-mf-approve' ? 'approve' : 'reject' });
        adminData.pendingMenfess = mRes.pendingMenfess || [];
        C.refresh();
        C.notify('Mas Raka', 'Moderasi', act === 'dl-mf-approve' ? 'Menfess ditayangkan!' : 'Menfess ditolak.');
      } catch (err) { t.disabled = false; C.notify('Mas Raka', 'Info', err.message); }
    } else if (act === 'dl-req-psc') {
      var rqUser = (document.getElementById('dl-req-user').value || '').trim();
      var rqAmt = Number(document.getElementById('dl-req-amt').value);
      var rqReason = (document.getElementById('dl-req-reason').value || '').trim();
      if (!rqUser || !rqAmt || rqAmt < 1 || rqReason.length < 3) {
        return C.notify('Mas Raka', 'Cek Pengajuan', 'Isi target warga, nominal PSC, dan alasannya dulu ya cuy.');
      }
      t.disabled = true;
      try {
        await API.post('/api/admin/economy/request', { target: rqUser, amount: rqAmt, reason: rqReason });
        document.getElementById('dl-req-amt').value = '';
        document.getElementById('dl-req-reason').value = '';
        fetchAdminPanel();
        C.notify('Mas Raka', 'Menunggu Izin Owner 🔐', 'Pengajuan ' + rqAmt + ' PSC sudah dikirim ke Owner untuk disetujui.');
      } catch (err) { C.notify('Mas Raka', 'Info', err.message); } finally { t.disabled = false; }
    } else if (act === 'dl-req-approve' || act === 'dl-req-reject') {
      t.disabled = true;
      try {
        await API.post('/api/admin/economy/review', { id: t.getAttribute('data-id'), decision: act === 'dl-req-approve' ? 'approve' : 'reject' });
        fetchAdminPanel();
        C.notify('Mas Raka', 'Brankas Owner 👑', act === 'dl-req-approve' ? 'Izin diberikan! Saldo PSC otomatis cair ke warga.' : 'Pengajuan PSC ditolak.');
      } catch (err) { t.disabled = false; C.notify('Mas Raka', 'Info', err.message); }
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
        C.notify('Mas Raka', 'Brankas Owner 👑', 'Saldo warga berhasil diperbarui & dicatat di Audit Log.');
      } catch (err) { C.notify('Mas Raka', 'Info', err.message); } finally { t.disabled = false; }
    } else if (act === 'dl-set-role') {
      var rUser = (document.getElementById('dl-rl-user').value || '').trim();
      var rVal = document.getElementById('dl-rl-role').value;
      if (!rUser) return;
      t.disabled = true;
      try {
        await API.post('/api/admin/roles', { target: rUser, role: rVal });
        fetchAdminPanel();
        C.notify('Mas Raka', 'Role Pengurus 🛡️', 'Hak akses pengurus berhasil diperbarui.');
      } catch (err) { C.notify('Mas Raka', 'Info', err.message); } finally { t.disabled = false; }
    }
  });
})();
