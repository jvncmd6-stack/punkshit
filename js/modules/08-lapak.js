(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;
  var L = window.PunkLapak = window.PunkLapak || {};

  function isItemEquipped(u, it) {
    if (!u || !it) return false;
    if (it.type === 'border') return String(u.equippedBorderId) === String(it.id);
    if (it.type === 'skin') return String(u.equippedSkinId) === String(it.id);
    if (it.type === 'gift') return String(u.pinnedGiftId) === String(it.id);
    return false;
  }

  function openItemDetail(it) {
    if (!it) return;
    var u = S.user || {};
    var owned = (S.inv || []).indexOf(it.id) !== -1;
    var equipped = isItemEquipped(u, it);
    var myPsc = Number(u.psc) || 0;
    var price = Number(it.price) || 0;
    var stockInfo = (it.stock == null || Number(it.stock) < 0) ? 'Unlimited' : ('Sisa ' + it.stock);

    var actionBtn = '';
    if (it.type === 'gift') {
      actionBtn =
        '<button class="btn" data-act="lp-toggle-send">🎁 KIRIM GIFT KE WARGA (' + price + ' PSC)</button>' +
        '<div id="lp-send-box" hidden style="background:rgba(255,255,255,.05);padding:10px;border-radius:12px;margin-top:8px">' +
          '<label>TARGET PENERIMA (@username)</label>' +
          '<input id="lp-to" placeholder="@username">' +
          '<label>PESAN UCAPAN</label>' +
          '<input id="lp-msg" maxlength="100" placeholder="Tulis pesan manis atau nyindir...">' +
          '<label style="display:flex;align-items:center;gap:6px;margin:8px 0"><input id="lp-anon" type="checkbox"> Kirim sebagai Anonim</label>' +
          '<button class="btn" data-act="lp-send-gift" data-id="' + C.esc(it.id) + '">Kirim Gift · ' + price + ' PSC</button>' +
        '</div>' +
        (owned
          ? '<button class="btn b2" data-act="lp-equip-toggle" data-id="' + C.esc(it.id) + '">' + (equipped ? '📌 Lepas Pin dari Avatar' : '📌 Pasang Pin di Avatar') + '</button>'
          : '');
    } else if (owned) {
      actionBtn = '<button class="btn" data-act="lp-equip-toggle" data-id="' + C.esc(it.id) + '">' + (equipped ? '✅ Terpasang (Tap Lepas)' : '✨ Pasang ke Profil') + '</button>';
    } else {
      actionBtn = '<button class="btn" data-act="lp-buy" data-id="' + C.esc(it.id) + '"' + (myPsc < price ? ' disabled' : '') + '>Beli Sekarang · ' + price + ' PSC</button>';
    }

    C.sheet(
      '<div style="display:grid;place-items:center;padding:12px 0">' + C.renderItemVisual(it, 110, true) + '</div>' +
      '<div style="text-align:center">' +
        '<span class="pill">' + C.esc((it.type || 'item').toUpperCase()) + ' · ' + C.esc(it.rarity || 'Rare') + '</span>' +
        '<h2 style="margin-top:6px">' + C.esc(it.name) + '</h2>' +
        '<div style="color:#FFD633;font-size:17px;font-weight:800;margin:4px 0">' + price + ' PSC <small style="color:var(--mut);font-weight:500">(' + stockInfo + ')</small></div>' +
        '<p class="sub">' + C.esc(it.desc || 'Item koleksi eksklusif PUNKSHIT.OS') + '</p>' +
      '</div>' +
      actionBtn +
      '<button class="btn b2" data-act="shut">TUTUP</button>'
    );
  }

  function defaultRenderLapak() {
    var u = S.user || {};
    var tab = S.curTab.lapak || 'katalog';
    var catFilter = S.curTab.lpType || 'all';
    var catalog = S.catalog || [];
    var inv = S.inv || [];

    var header =
      '<div class="card" style="background:linear-gradient(135deg,rgba(23,107,255,.22),rgba(15,23,42,.92));border:1px solid rgba(143,199,255,.28)">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px">' +
          '<div style="display:flex;align-items:center;gap:10px">' +
            C.renderAvatar(u, 'mini') +
            '<div>' +
              '<div style="font-weight:800;font-size:14px">LAPAK RONGSOK</div>' +
              '<div style="font-size:11px;opacity:.85">Saldo Lu: <b style="color:#FFD633">' + (u.psc || 0) + ' PSC</b> · Koleksi: <b>' + inv.length + '</b></div>' +
            '</div>' +
          '</div>' +
          '<button class="pill" style="background:#2563EB;color:#fff;font-weight:800" data-act="lp-collab-sheet">+ Collab</button>' +
        '</div>' +
      '</div>' +
      '<div class="tabs" style="margin:12px 0">' +
        '<button class="tab' + (tab === 'katalog' ? ' on' : '') + '" data-act="lp-tab" data-tab="katalog">🏪 Katalog Resmi (' + catalog.length + ')</button>' +
        '<button class="tab' + (tab === 'lemari' ? ' on' : '') + '" data-act="lp-tab" data-tab="lemari">🎒 Lemari Gue (' + inv.length + ')</button>' +
      '</div>';

    var list = tab === 'lemari'
      ? catalog.filter(function (it) { return inv.indexOf(it.id) !== -1; })
      : catalog.filter(function (it) { return catFilter === 'all' || it.type === catFilter; });

    var filterBar = tab === 'katalog'
      ? '<div style="display:flex;gap:6px;overflow-x:auto;margin-bottom:10px">' +
          '<button class="pill" style="' + (catFilter === 'all' ? 'background:#2563EB;color:#fff' : '') + '" data-act="lp-type" data-type="all">Semua</button>' +
          '<button class="pill" style="' + (catFilter === 'border' ? 'background:#2563EB;color:#fff' : '') + '" data-act="lp-type" data-type="border">🖼️ Border</button>' +
          '<button class="pill" style="' + (catFilter === 'skin' ? 'background:#2563EB;color:#fff' : '') + '" data-act="lp-type" data-type="skin">🪪 Skin</button>' +
          '<button class="pill" style="' + (catFilter === 'gift' ? 'background:#2563EB;color:#fff' : '') + '" data-act="lp-type" data-type="gift">🎁 Gift</button>' +
        '</div>'
      : '';

    var cards = list.map(function (it) {
      var owned = inv.indexOf(it.id) !== -1;
      var eq = isItemEquipped(u, it);
      var badge = eq
        ? '<span class="pill" style="background:#34C75933;color:#6df0a0;font-size:9px">DIPAKAI</span>'
        : (owned
            ? '<span class="pill" style="background:#38BDF833;color:#7DD3FC;font-size:9px">DIMILIKI</span>'
            : '<span style="color:#FFD633;font-weight:800;font-size:12px">' + it.price + ' PSC</span>');

      return '<div class="card" data-act="lp-detail" data-id="' + C.esc(it.id) + '" style="padding:12px;text-align:center;cursor:pointer">' +
        '<div style="display:grid;place-items:center;height:78px">' + C.renderItemVisual(it, 68, false) + '</div>' +
        '<div style="font-weight:700;font-size:13px;margin-top:6px">' + C.esc(it.name) + '</div>' +
        '<small style="display:block;opacity:.7;font-size:10px;margin:2px 0 6px">' + C.esc((it.type || '').toUpperCase()) + ' · ' + C.esc(it.rarity || 'Rare') + '</small>' +
        badge +
      '</div>';
    }).join('');

    return header + filterBar +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
        (cards || '<div class="card" style="grid-column:1/-1"><p class="sub">' + (tab === 'lemari' ? 'Lemari lu masih kosong. Belanja dulu di Katalog!' : 'Belum ada item di kategori ini.') + '</p></div>') +
      '</div>';
  }

  L.isItemEquipped = L.isItemEquipped || isItemEquipped;
  L.openItemDetail = L.openItemDetail || openItemDetail;

  C.Views.lapak = (typeof L.renderLapak === 'function') ? L.renderLapak : defaultRenderLapak;
  if (typeof L.renderLapakWarga === 'function') {
    C.Views.lapakwarga = L.renderLapakWarga;
  }

  if (window.__punkLapakBound) return;
  window.__punkLapakBound = true;

  document.addEventListener('click', async function (e) {
    var t = e.target.closest('[data-act]');
    if (!t || t.disabled) return;
    var act = t.getAttribute('data-act');

    if (act === 'lp-tab') {
      S.curTab.lapak = t.getAttribute('data-tab');
      C.refresh();
    } else if (act === 'lp-type') {
      S.curTab.lpType = t.getAttribute('data-type');
      C.refresh();
    } else if (act === 'lw-tab') {
      S.curTab.lapakwarga = t.getAttribute('data-tab');
      C.refresh();
    } else if (act === 'lw-cat') {
      S.curTab.lwCat = t.getAttribute('data-cat');
      C.refresh();
    } else if (act === 'lw-new-sheet') {
      L.openNewShopItemSheet();
    } else if (act === 'lp-collab-sheet') {
      L.openCollabSubmitSheet();
    } else if (act === 'lw-detail') {
      var sid = t.getAttribute('data-id');
      var found = (S.market || []).find(function (x) { return String(x.id) === String(sid); });
      L.openShopItemDetail(found);
    } else if (act === 'lw-buy') {
      var buyId = t.getAttribute('data-id');
      var noteEl = document.getElementById('lw-buy-note');
      var buyNote = noteEl ? noteEl.value.trim() : '';
      t.disabled = true;
      t.textContent = 'Memproses Transaksi...';
      try {
        var bRes = await API.post('/api/warga-shop/buy', { itemId: buyId, note: buyNote });
        if (bRes.user) S.user = bRes.user;
        if (bRes.items) S.market = bRes.items;
        if (bRes.orders) S.marketOrders = bRes.orders;
        C.shut();
        C.refresh();
        C.notify('Mas Raka', 'Lapak Warga', bRes.message || 'Transaksi berhasil! Pelapak sudah dikabari.');
      } catch (err) {
        t.disabled = false;
        t.textContent = 'COBA BELI LAGI';
        C.notify('Mas Raka', 'Gagal Beli', err.message);
      }
    } else if (act === 'lw-edit-save') {
      var edId = t.getAttribute('data-id');
      var edTitle = (document.getElementById('lw-ed-title').value || '').trim();
      var edPrice = Number(document.getElementById('lw-ed-price').value) || 1;
      var edStock = parseInt(document.getElementById('lw-ed-stock').value, 10);
      var edDesc = (document.getElementById('lw-ed-desc').value || '').trim();

      t.disabled = true;
      t.textContent = 'Menyimpan...';
      try {
        var eRes = await API.post('/api/warga-shop/edit', {
          itemId: edId,
          title: edTitle,
          price: edPrice,
          stock: Number.isNaN(edStock) ? 1 : edStock,
          description: edDesc
        });
        if (eRes.items) S.market = eRes.items;
        C.shut();
        C.refresh();
        C.notify('Mas Raka', 'Toko Diperbarui', 'Info & stok produk berhasil di-update!');
      } catch (err) {
        t.disabled = false;
        t.textContent = '💾 SIMPAN PERUBAHAN / RESTOCK';
        C.notify('Mas Raka', 'Gagal Update', err.message);
      }
    } else if (act === 'lw-boost') {
      var bstId = t.getAttribute('data-id');
      t.disabled = true;
      t.textContent = 'Menyundul...';
      try {
        var bstRes = await API.post('/api/warga-shop/boost', { itemId: bstId });
        if (bstRes.user) S.user = bstRes.user;
        if (bstRes.items) S.market = bstRes.items;
        C.shut();
        C.refresh();
        C.notify('Mas Raka', 'Sundul Berhasil ⚡', 'Produk lo sekarang naik ke urutan paling atas etalase selama 12 jam!');
      } catch (err) {
        t.disabled = false;
        t.textContent = '⚡ SUNDUL KE ATAS ETALASE (15 PSC)';
        C.notify('Mas Raka', 'Gagal Sundul', err.message);
      }
    } else if (act === 'lw-delete') {
      var delId = t.getAttribute('data-id');
      t.disabled = true;
      t.textContent = 'Menghapus...';
      try {
        var dRes = await API.post('/api/warga-shop/delete', { itemId: delId });
        if (dRes.items) S.market = dRes.items;
        C.shut();
        C.refresh();
        C.notify('Mas Raka', 'Lapak Warga', 'Dagangan berhasil dihapus dari etalase.');
      } catch (err) {
        t.disabled = false;
        t.textContent = '🗑️ HAPUS DARI ETALASE';
        C.notify('Mas Raka', 'Gagal Hapus', err.message);
      }
    } else if (act === 'lw-save') {
      var title = (document.getElementById('lw-title').value || '').trim();
      var price = Number(document.getElementById('lw-price').value) || 0;
      var stock = parseInt(document.getElementById('lw-stock').value, 10);
      var category = document.getElementById('lw-cat').value;
      var description = (document.getElementById('lw-desc').value || '').trim();

      if (title.length < 3) {
        C.notify('Mas Raka', 'Validasi', 'Nama produk minimal 3 karakter cuy.');
        return;
      }

      t.disabled = true;
      t.textContent = 'Mengunggah ke Etalase...';
      try {
        var fd = new FormData();
        fd.append('title', title);
        fd.append('price', String(price));
        fd.append('stock', String(Number.isNaN(stock) ? 1 : stock));
        fd.append('category', category);
        fd.append('description', description);
        if (L.pendingShopFile) fd.append('media', L.pendingShopFile);

        var upRes = await API.upload('/api/shop', fd);
        L.pendingShopFile = null;
        if (upRes && upRes.items) {
          S.market = upRes.items;
          S.marketOrders = upRes.orders || S.marketOrders;
        } else {
          var listRes = await API.get('/api/shop');
          S.market = listRes.items || [];
          S.marketOrders = listRes.orders || [];
        }
        C.shut();
        C.refresh();
        C.notify('Mas Raka', 'Lapak Warga', 'Produk "' + title + '" resmi masuk etalase!');
      } catch (err) {
        t.disabled = false;
        t.textContent = 'PAJANG DI ETALASE SEKARANG';
        C.notify('Mas Raka', 'Gagal Upload', err.message);
      }
    } else if (act === 'lp-collab-send') {
      var cType = document.getElementById('col-type').value;
      var cPrice = Number(document.getElementById('col-price').value) || 150;
      var cName = (document.getElementById('col-name').value || '').trim();
      var cDesc = (document.getElementById('col-desc').value || '').trim();

      if (cName.length < 3 || !L.pendingCollabFile) {
        C.notify('Mas Raka', 'Validasi', 'Isi nama item (min 3 huruf) dan pilih file desainnya dulu!');
        return;
      }

      t.disabled = true;
      t.textContent = 'Mengirim Pengajuan...';
      try {
        var cfd = new FormData();
        cfd.append('type', cType);
        cfd.append('price', String(cPrice));
        cfd.append('name', cName);
        cfd.append('desc', cDesc);
        cfd.append('media', L.pendingCollabFile);

        await API.upload('/api/shop/collab-submit', cfd);
        L.pendingCollabFile = null;
        C.shut();
        C.notify('Mas Raka', 'Collab Diajukan! 🎨', 'Karya "' + cName + '" sudah dikirim ke Admin. Cek notifikasi bot kalau sudah di-ACC!');
      } catch (err) {
        t.disabled = false;
        t.textContent = '🚀 KIRIM PENGAJUAN KE ADMIN';
        C.notify('Mas Raka', 'Gagal Ajukan', err.message);
      }
    } else if (act === 'lp-detail') {
      L.openItemDetail(C.findItem(t.getAttribute('data-id')));
    } else if (act === 'lp-equip-toggle') {
      var eqId = t.getAttribute('data-id');
      var eqItem = C.findItem(eqId);
      if (!eqItem) return;
      var currentlyEquipped = L.isItemEquipped(S.user, eqItem);
      var eqType = eqItem.type === 'gift' ? 'pin' : eqItem.type;
      var payloadItemId = eqItem.type === 'gift' ? eqItem.id : (currentlyEquipped ? null : eqItem.id);

      t.disabled = true;
      try {
        var eqRes = await API.post('/api/profile/equip', { type: eqType, itemId: payloadItemId });
        if (eqRes.user) S.user = eqRes.user;
        C.shut();
        C.refresh();
        C.notify('Mas Raka', 'Profil Updated', currentlyEquipped ? (eqItem.name + ' dilepas.') : (eqItem.name + ' dipasang!'));
      } catch (err) {
        t.disabled = false;
        C.notify('Mas Raka', 'Error', err.message);
      }
    } else if (act === 'lp-toggle-send') {
      var box = document.getElementById('lp-send-box');
      if (box) box.hidden = !box.hidden;
    } else if (act === 'lp-buy') {
      var id = t.getAttribute('data-id');
      var it = C.findItem(id);
      if ((S.user.psc || 0) < it.price) {
        C.notify('Mas Raka', 'Saldo Kurang', 'Dompet lu lagi cosplay gurun Sahara.');
        return;
      }
      t.disabled = true;
      t.textContent = 'Memproses...';
      try {
        var res = await API.post('/api/shop/buy', { itemId: id });
        S.user = res.user;
        if (res.inv) S.inv = res.inv;
        if (res.catalog) S.catalog = res.catalog;
        C.shut();
        C.refresh();
        C.notify('Mas Raka', 'Lapak Rongsok', it.name + ' berhasil dibeli!');
      } catch (err) {
        t.disabled = false;
        t.textContent = 'Beli Sekarang · ' + it.price + ' PSC';
        C.notify('Mas Raka', 'Gagal Beli', err.message);
      }
    } else if (act === 'lp-send-gift') {
      var gid = t.getAttribute('data-id');
      var git = C.findItem(gid);
      var to = (document.getElementById('lp-to').value || '').trim().replace(/^@?/, '@');
      var msg = (document.getElementById('lp-msg').value || '').trim();
      var anonEl = document.getElementById('lp-anon');
      var isAnon = !!(anonEl && anonEl.checked);

      if (to.length < 3) return C.notify('Mas Raka', 'Validasi', 'Masukkan @username penerima.');
      if ((S.user.psc || 0) < git.price) return C.notify('Mas Raka', 'Saldo Kurang', 'Saldo PSC lu belum cukup.');

      t.disabled = true;
      t.textContent = 'Mengirim...';
      try {
        var gRes = await API.post('/api/gift/send', { itemId: gid, toUsername: to, message: msg, anonymous: isAnon });
        S.user = gRes.user;
        C.shut();
        C.refresh();
        C.notify('Mas Raka', 'Gift Terkirim!', git.name + ' terkirim ke ' + to + '!');
      } catch (err) {
        t.disabled = false;
        t.textContent = 'Kirim Gift · ' + git.price + ' PSC';
        C.notify('Mas Raka', 'Gagal Kirim', err.message);
      }
    }
  });
})();
