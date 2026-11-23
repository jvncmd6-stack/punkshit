(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;

  window.PunkDalang = window.PunkDalang || {};

  // 1. TAB KEAMANAN & KENYAMANAN (Moderasi Menfess + Penertiban Warga)
  function renderSecurityTab(data) {
    var list = data.pendingMenfess || [];
    var users = data.users || [];

    var menfessHtml = list.length
      ? list.map(function (m) {
          return (
            '<div class="rw" style="flex-direction:column;align-items:flex-start">' +
              '<b style="color:var(--yel)">📮 ' + C.esc(m.category) + '</b>' +
              '<div style="font-size:14px;margin:6px 0">' + C.esc(m.text) + '</div>' +
              '<div style="display:flex;gap:8px;width:100%">' +
                '<button class="pill" style="flex:1;background:#34C759;color:#000;font-weight:800" data-act="dl-mf-approve" data-id="' + C.esc(m.id) + '">✅ Tayangkan</button>' +
                '<button class="pill b-danger" data-act="dl-mf-reject" data-id="' + C.esc(m.id) + '">Tolak</button>' +
              '</div>' +
            '</div>'
          );
        }).join('')
      : '<div class="rw"><small>Antrean Kotak Rahasia bersih cuy, belum ada pesan baru.</small></div>';

    var safetyTools =
      '<div class="grp" style="padding:14px;margin-bottom:16px">' +
        '<label>PENERTIBAN AKUN WARGA (FREEZE / UNFREEZE)</label>' +
        '<input id="dl-frz-user" placeholder="Telegram ID atau @username warga">' +
        '<input id="dl-frz-reason" placeholder="Catatan alasan (mis. Spam berulang di papan publik)">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px">' +
          '<button class="btn b2" style="margin:0;color:#FCA5A5" data-act="dl-freeze" data-mode="freeze">🧊 Bekukan Sementara</button>' +
          '<button class="btn b2" style="margin:0;color:#6df0a0" data-act="dl-freeze" data-mode="unfreeze">✅ Pulihkan Akun</button>' +
        '</div>' +
      '</div>' +
      '<div class="grp" style="margin-bottom:16px">' +
        '<div class="rw">' +
          '<div><b>🧹 Bersihkan Papan Wanted Board</b><small>Hapus lowongan yang sudah selesai atau tidak relevan.</small></div>' +
          '<button class="pill" data-act="dl-clear-wanted">Bersihkan</button>' +
        '</div>' +
      '</div>';

    return (
      '<h3 class="gh">🛡️ PENJAGA KENYAMANAN & KEAMANAN</h3>' +
      safetyTools +
      '<h3 class="gh">📮 MODERASI KOTAK RAHASIA (' + list.length + ')</h3>' +
      '<div class="grp">' + menfessHtml + '</div>' +
      (users.length
        ? '<h3 class="gh">DAFTAR WARGA TERBARU (' + users.length + ')</h3>' +
          '<div class="grp">' +
            users.slice(0, 8).map(function (w) {
              var frozenTag = w.isFrozen ? ' <span class="role-tag" style="background:#ef444433;color:#fca5a5">DIBEKUKAN</span>' : '';
              return '<div class="rw"><div><b>' + C.esc(w.name) + frozenTag + '</b><small>' + (w.username ? '@' + C.esc(w.username) : C.esc(w.id)) + ' · ' + C.esc(w.role || 'member') + '</small></div></div>';
            }).join('') +
          '</div>'
        : '')
    );
  }

  // 2. TAB KURASI COLLAB & LAPAK RONGSOK
  function renderCatalogTab(data) {
    var items = S.catalog || [];
    var collabs = data.pendingCollabs || [];

    var collabSection =
      '<h3 class="gh">🎨 KURASI ITEM COLLAB WARGA (' + collabs.length + ')</h3>' +
      '<div class="grp" style="margin-bottom:16px">' +
        (collabs.length
          ? collabs.map(function (c) {
              return (
                '<div class="rw" style="flex-direction:column;align-items:flex-start">' +
                  '<div style="display:flex;align-items:center;gap:10px;width:100%">' +
                    (c.image_url ? '<img src="' + C.esc(API.assetUrl(c.image_url)) + '" style="width:48px;height:48px;object-fit:contain;border-radius:8px;background:#080B12">' : '') +
                    '<div><b>' + C.esc(c.name) + '</b><small>Kreator: ' + C.esc(c.creator_name) + ' · ' + C.esc(c.type) + ' · ' + c.price + ' PSC</small></div>' +
                  '</div>' +
                  '<div style="display:flex;gap:8px;width:100%;margin-top:8px">' +
                    '<button class="pill" style="flex:1;background:#34C759;color:#000;font-weight:800" data-act="dl-collab-acc" data-id="' + C.esc(c.id) + '">✅ ACC Rilis</button>' +
                    '<button class="pill b-danger" data-act="dl-collab-rej" data-id="' + C.esc(c.id) + '">Tolak</button>' +
                  '</div>' +
                '</div>'
              );
            }).join('')
          : '<div class="rw"><small>Belum ada pengajuan item collab baru dari warga.</small></div>') +
      '</div>';

    return (
      '<button class="btn" style="margin-top:0;margin-bottom:16px" data-act="dl-new-item-sheet">+ Tambah Gift / Avatar Border Resmi</button>' +
      collabSection +
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

  // 3. TAB ASISTEN TUGAS PENGURUS (Templat Broadcast, Event & Polling)
  function renderAssistantTab() {
    return (
      '<h3 class="gh">⚡ TEMPLAT PENGUMUMAN CEPAT</h3>' +
      '<div class="chips" style="margin-bottom:10px">' +
        '<button type="button" class="chip" data-act="dl-tpl" data-tpl="absen">🔥 Ingatkan Absen</button>' +
        '<button type="button" class="chip" data-act="dl-tpl" data-tpl="event">🎮 Ajak Mabar / OS</button>' +
        '<button type="button" class="chip" data-act="dl-tpl" data-tpl="lapak">🛍️ Info Lapak Warga</button>' +
      '</div>' +

      '<div class="grp" style="padding:14px;margin-bottom:16px">' +
        '<select id="dl-bc-target">' +
          '<option value="both">Grup & Channel Sekaligus</option>' +
          '<option value="group">Hanya Grup Tongkrongan</option>' +
          '<option value="channel">Hanya Channel Resmi</option>' +
        '</select>' +
        '<textarea id="dl-bc-text" rows="3" placeholder="Tulis pengumuman resmi dari Mas Raka..."></textarea>' +
        '<button class="btn" style="margin-top:4px" data-act="dl-broadcast">KIRIM PENGUMUMAN SEKARANG</button>' +
      '</div>' +

      '<h3 class="gh">📅 BUAT AGENDA / EVENT BARU</h3>' +
      '<div class="grp" style="padding:14px;margin-bottom:16px">' +
        '<input id="dl-ev-title" placeholder="Judul Event (mis. Game Night: Gartic)">' +
        '<input id="dl-ev-date" placeholder="Waktu (mis. Sabtu, 20.00 WIB)">' +
        '<input id="dl-ev-reward" placeholder="Apresiasi (mis. 200 PSC + Badge)">' +
        '<button class="btn" style="margin-top:4px" data-act="dl-create-event">PUBLISH EVENT & UMUMKAN</button>' +
      '</div>' +

      '<h3 class="gh">🗳️ BUKA SIDANG WARGA (POLLING)</h3>' +
      '<div class="grp" style="padding:14px">' +
        '<input id="dl-pl-q" placeholder="Pertanyaan Sidang (mis. Malam minggu ngapain?)">' +
        '<input id="dl-pl-opts" placeholder="Pilihan dipisah koma (mis. Mabar, Movie Night, Karaoke)">' +
        '<button class="btn" style="margin-top:4px" data-act="dl-create-poll">BUKA SIDANG DI GRUP</button>' +
      '</div>'
    );
  }

  // 4. TAB BRANKAS PSC & IZIN OWNER (Admin hanya bisa ajukan, Owner yang ACC)
  function renderVaultTab(data, isOwnerFlag) {
    var reqs = data.pscRequests || [];

    var requestForm =
      '<h3 class="gh">📝 AJUKAN DISTRIBUSI PSC (WAJIB IZIN OWNER)</h3>' +
      '<div class="grp" style="padding:14px;margin-bottom:16px">' +
        '<small style="display:block;color:#94a3b8;margin-bottom:8px">Demi keamanan kas markas, setiap pengajuan hadiah atau kompensasi PSC dari admin harus mendapat persetujuan Owner terlebih dahulu.</small>' +
        '<input id="dl-req-user" placeholder="Telegram ID atau @username penerima">' +
        '<input id="dl-req-amt" type="number" min="1" max="5000" placeholder="Nominal PSC yang diajukan">' +
        '<input id="dl-req-reason" placeholder="Keperluan (mis. Juara 1 Mini Game Malam Minggu)">' +
        '<button class="btn" style="margin-top:4px" data-act="dl-req-psc">KIRIM PENGAJUAN KE OWNER</button>' +
      '</div>';

    var approvalQueue =
      '<h3 class="gh">🔐 ANTREAN PERSETUJUAN OWNER (' + reqs.length + ')</h3>' +
      '<div class="grp" style="margin-bottom:16px">' +
        (reqs.length
          ? reqs.map(function (r) {
              return (
                '<div class="rw" style="flex-direction:column;align-items:flex-start">' +
                  '<b>💰 ' + r.amount + ' PSC → ' + C.esc(r.target_name || r.target) + '</b>' +
                  '<small>Diajukan oleh: ' + C.esc(r.requester_name) + ' · Alasan: ' + C.esc(r.reason) + '</small>' +
                  (isOwnerFlag
                    ? '<div style="display:flex;gap:8px;width:100%;margin-top:8px">' +
                        '<button class="pill" style="flex:1;background:#34C759;color:#000;font-weight:800" data-act="dl-req-approve" data-id="' + C.esc(r.id) + '">✅ Izinkan & Cairkan</button>' +
                        '<button class="pill b-danger" data-act="dl-req-reject" data-id="' + C.esc(r.id) + '">Tolak</button>' +
                      '</div>'
                    : '<span class="pill" style="margin-top:6px;opacity:.7">⏳ Menunggu Izin Owner</span>') +
                '</div>'
              );
            }).join('')
          : '<div class="rw"><small>Tidak ada pengajuan PSC yang menunggu persetujuan.</small></div>') +
      '</div>';

    if (!isOwnerFlag) {
      return requestForm + approvalQueue;
    }

    return (
      approvalQueue +
      requestForm +
      '<h3 class="gh">👑 EKSEKUSI LANGSUNG OWNER (PSC)</h3>' +
      '<div class="grp" style="padding:14px;margin-bottom:16px">' +
        '<input id="dl-psc-user" placeholder="Telegram ID atau @username warga">' +
        '<input id="dl-psc-amt" type="number" placeholder="Nominal PSC (pakai minus -50 untuk tarik)">' +
        '<input id="dl-psc-reason" placeholder="Alasan (mis. Koreksi Saldo)">' +
        '<button class="btn" style="margin-top:4px" data-act="dl-adjust-psc">EKSEKUSI LANGSUNG</button>' +
      '</div>' +

      '<h3 class="gh">🛡️ KELOLA ROLE PENGURUS</h3>' +
      '<div class="grp" style="padding:14px;margin-bottom:16px">' +
        '<input id="dl-rl-user" placeholder="Telegram ID atau @username warga">' +
        '<select id="dl-rl-role">' +
          '<option value="admin">Admin (Keamanan, Kurasi, Event — PSC wajib izin Owner)</option>' +
          '<option value="moderator">Moderator (Moderasi Menfess & Ketertiban)</option>' +
          '<option value="member">Member Biasa (Cabut Akses Pengurus)</option>' +
        '</select>' +
        '<button class="btn" style="margin-top:4px" data-act="dl-set-role">SIMPAN ROLE</button>' +
      '</div>' +

      '<h3 class="gh">📜 AUDIT LOG TERBARU</h3>' +
      '<div class="grp">' +
        ((data.logs && data.logs.length)
          ? data.logs.slice(0, 10).map(function (lg) {
              return '<div class="rw"><div><b>' + C.esc(lg.action) + '</b><small>' + C.esc(lg.detail) + '</small></div></div>';
            }).join('')
          : '<div class="rw"><small>Belum ada catatan audit.</small></div>') +
      '</div>'
    );
  }

  window.PunkDalang.renderSecurityTab = renderSecurityTab;
  window.PunkDalang.renderCatalogTab = renderCatalogTab;
  window.PunkDalang.renderAssistantTab = renderAssistantTab;
  window.PunkDalang.renderVaultTab = renderVaultTab;
})();
