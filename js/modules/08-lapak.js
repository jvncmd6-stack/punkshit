(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;
  var L = window.PunkLapak = window.PunkLapak || {};

  function extractInvMap() {
    var rawInv = Array.isArray(S.inv) ? S.inv : [];
    var map = {};
    var order = [];

    rawInv.forEach(function (entry) {
      if (!entry) return;
      var id = '';
      var qty = 1;
      var meta = null;

      if (typeof entry === 'string' || typeof entry === 'number') {
        id = String(entry).trim();
      } else if (typeof entry === 'object') {
        id = String(entry.itemId || entry.item_id || entry.id || entry.key || '').trim();
        qty = Math.max(1, Number(entry.qty || entry.count || entry.amount || 1));
        meta = entry;
      }

      if (!id) return;
      if (!map[id]) {
        map[id] = { id: id, qty: 0, meta: meta };
        order.push(id);
      }
      map[id].qty += qty;
      if (meta && !map[id].meta) map[id].meta = meta;
    });

    return { map: map, order: order, totalCount: order.length };
  }

  function resolveCatalogItem(id, fallbackMeta) {
    var cleanId = String(id || '').trim();
    var catalog = Array.isArray(S.catalog) ? S.catalog : [];
    var found = catalog.find(function (c) {
      return String(c.id || c.itemId || '').trim() === cleanId;
    });
    if (found) return found;

    if (typeof C.findItem === 'function') {
      var viaCore = C.findItem(cleanId);
      if (viaCore) return viaCore;
    }

    var m = fallbackMeta || {};
    return {
      id: cleanId,
      name: m.name || m.title || cleanId.replace(/[_-]+/g, ' ').toUpperCase(),
      type: m.type || (cleanId.indexOf('skin') !== -1 ? 'skin' : cleanId.indexOf('gift') !== -1 ? 'gift' : 'border'),
      rarity: m.rarity || 'Rare',
      price: Number(m.price) || 0,
      stock: m.stock != null ? m.stock : -1,
      imageUrl: m.imageUrl || m.image_url || m.url || '',
      cssClass: m.cssClass || m.css_class || '',
      desc: m.desc || 'Item koleksi warga PUNKSHIT.OS'
    };
  }

  function isItemEquipped(u, it) {
    if (!u || !it) return false;
    var id = String(it.id);
    if (it.type === 'border') return String(u.equippedBorderId || u.equipped_border_id || '') === id;
    if (it.type === 'skin') return String(u.equippedSkinId || u.equipped_skin_id || '') === id;
    if (it.type === 'gift') return String(u.pinnedGiftId || u.pinned_gift_id || '') === id;
    return false;
  }

  function getStockNum(it) {
    if (!it || it.stock === null || it.stock === undefined || it.stock === '') return -1;
    var n = Number(it.stock);
    return Number.isNaN(n) ? -1 : n;
  }

  function openItemDetail(it) {
    if (!it) return;
    var u = S.user || {};
    var invInfo = extractInvMap();
    var ownedEntry = invInfo.map[String(it.id)];
    var ownedQty = ownedEntry ? ownedEntry.qty : 0;
    var owned = ownedQty > 0;
    var equipped = isItemEquipped(u, it);
    var myPsc = Number(u.psc) || 0;
    var price = Number(it.price) || 0;
    var stockNum = getStockNum(it);
    var isOutOfStock = stockNum === 0;
    var maxBuyable = stockNum < 0 ? Math.max(1, Math.min(99, Math.floor(myPsc / Math.max(1, price)))) : Math.min(stockNum, Math.max(1, Math.floor(myPsc / Math.max(1, price))));
    var stockInfo = stockNum < 0 ? 'Stok: Unlimited' : (isOutOfStock ? 'STOK HABIS' : ('Sisa Stok: ' + stockNum));

    var qtySelectorHtml = (!isOutOfStock && price > 0)
      ? '<div style="display:flex;align-items:center;justify-content:center;gap:10px;margin:10px 0 6px">' +
          '<button type="button" class="pill" id="lp-qty-minus" style="font-size:15px;padding:4px 12px;font-weight:900">−</button>' +
          '<span style="font-size:13px;font-weight:800">Jumlah: <b id="lp-qty-val" data-max="' + Math.max(1, maxBuyable) + '" data-price="' + price + '">1</b>x</span>' +
          '<button type="button" class="pill" id="lp-qty-plus" style="font-size:15px;padding:4px 12px;font-weight:900">+</button>' +
        '</div>'
      : '';

    var buyBtnHtml = isOutOfStock
      ? '<button class="btn b2" disabled>🚫 Stok Habis</button>'
      : '<button class="btn" id="lp-buy-btn" data-act="lp-buy" data-id="' + C.esc(it.id) + '"' + (myPsc < price ? ' disabled' : '') + '>' +
          (owned ? '➕ Beli Lagi (1x) · ' : '🛒 Beli Sekarang (1x) · ') + price + ' PSC' +
        '</button>';

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
        qtySelectorHtml +
        buyBtnHtml +
        (owned
          ? '<button class="btn b2" data-act="lp-equip-toggle" data-id="' + C.esc(it.id) + '">' + (equipped ? '📌 Lepas Pin dari Avatar' : '📌 Pasang Pin di Avatar') + '</button>'
          : '');
    } else if (owned) {
      actionBtn =
        '<button class="btn" data-act="lp-equip-toggle" data-id="' + C.esc(it.id) + '">' + (equipped ? '✅ Terpasang (Tap Lepas)' : '✨ Pasang ke Profil') + '</button>' +
        qtySelectorHtml +
        buyBtnHtml;
    } else {
      actionBtn = qtySelectorHtml + buyBtnHtml;
    }

    C.sheet(
      '<div style="display:grid;place-items:center;padding:12px 0">' + C.renderItemVisual(it, 110, true) + '</div>' +
      '<div style="text-align:center">' +
        '<span class="pill">' + C.esc((it.type || 'item').toUpperCase()) + ' · ' + C.esc(it.rarity || 'Rare') + '</span>' +
        (owned ? ' <span class="pill" style="background:#38BDF833;color:#7DD3FC">Dimiliki: ' + ownedQty + 'x</span>' : '') +
        '<h2 style="margin-top:6px">' + C.esc(it.name) + '</h2>' +
        '<div style="color:#FFD633;font-size:16px;font-weight:800;margin:4px 0">' + price + ' PSC <small style="color:' + (isOutOfStock ? '#FCA5A5' : 'var(--mut)') + ';font-weight:600">(' + stockInfo + ')</small></div>' +
        '<p class="sub">' + C.esc(it.desc || 'Item koleksi eksklusif PUNKSHIT.OS') + '</p>' +
      '</div>' +
      actionBtn +
      '<button class="btn b2" data-act="shut">TUTUP</button>'
    );

    var minusBtn = document.getElementById('lp-qty-minus');
    var plusBtn = document.getElementById('lp-qty-plus');
    var qtyEl = document.getElementById('lp-qty-val');
    var buyBtn = document.getElementById('lp-buy-btn');
    if (minusBtn && plusBtn && qtyEl && buyBtn) {
      var updateQtyUi = function (nextQty) {
        var maxQ = Number(qtyEl.getAttribute('data-max')) || 1;
        var unitPrice = Number(qtyEl.getAttribute('data-price')) || price;
        var q = Math.max(1, Math.min(maxQ, nextQty));
        qtyEl.textContent = String(q);
        var total = q * unitPrice;
        buyBtn.disabled = myPsc < total;
        buyBtn.textContent = (owned ? '➕ Beli Lagi (' : '🛒 Beli Sekarang (') + q + 'x) · ' + total + ' PSC';
      };
      minusBtn.onclick = function () { updateQtyUi((Number(qtyEl.textContent) || 1) - 1); };
      plusBtn.onclick = function () { updateQtyUi((Number(qtyEl.textContent) || 1) + 1); };
    }
  }

  function defaultRenderLapak() {
    var u = S.user || {};
    var tab = S.curTab.lapak || 'katalog';
    var catFilter = S.curTab.lpType || 'all';
    var catalog = Array.isArray(S.catalog) ? S.catalog : [];
    var invInfo = extractInvMap();

    var header =
      '<div class="card" style="background:linear-gradient(135deg,rgba(23,107,255,.22),rgba(15,23,42,.92));border:1px solid rgba(143,199,255,.28)">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px">' +
          '<div style="display:flex;align-items:center;gap:10px;min-width:0">' +
            C.renderAvatar(u, 'mini') +
            '<div style="min-width:0">' +
              '<div style="font-weight:800;font-size:14px">LAPAK RONGSOK</div>' +
              '<div style="font-size:11px;opacity:.85">Saldo Lu: <b style="color:#FFD633">' + (u.psc || 0) + ' PSC</b> · Koleksi: <b>' + invInfo.totalCount + '</b></div>' +
            '</div>' +
          '</div>' +
          '<button class="pill" style="background:#2563EB;color:#fff;font-weight:800;flex-shrink:0" data-act="lp-collab-sheet">+ Collab</button>' +
        '</div>' +
      '</div>' +
      '<div class="tabs" style="margin:12px 0">' +
        '<button class="tab' + (tab === 'katalog' ? ' on' : '') + '" data-act="lp-tab" data-tab="katalog">🏪 Katalog Resmi (' + catalog.length + ')</button>' +
        '<button class="tab' + (tab === 'lemari' ? ' on' : '') + '" data-act="lp-tab" data-tab="lemari">🎒 Lemari Gue (' + invInfo.totalCount + ')</button>' +
      '</div>';

    var list = tab === 'lemari'
      ? invInfo.order.map(function (id) {
          var entry = invInfo.map[id];
          return resolveCatalogItem(id, entry && entry.meta);
        })
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
      var ownedEntry = invInfo.map[String(it.id)];
      var ownedQty = ownedEntry ? ownedEntry.qty : 0;
      var owned = ownedQty > 0;
      var eq = isItemEquipped(u, it);
      var stockNum = getStockNum(it);
      var isOut = stockNum === 0;

      var stockBadge = isOut
        ? '<span style="font-size:9px;color:#FCA5A5;font-weight:700">HABIS</span>'
        : (stockNum > 0 ? '<span style="font-size:9px;color:#93C5FD;font-weight:700">Stok ' + stockNum + '</span>' : '');

      var badge = eq
        ? '<span class="pill" style="background:#34C75933;color:#6df0a0;font-size:9px">DIPAKAI' + (ownedQty > 1 ? ' (' + ownedQty + 'x)' : '') + '</span>'
        : (owned
            ? '<span class="pill" style="background:#38BDF833;color:#7DD3FC;font-size:9px">PUNYA ' + ownedQty + 'x</span>'
            : '<span style="color:#FFD633;font-weight:800;font-size:12px">' + it.price + ' PSC</span>');

      return '<div class="card" data-act="lp-detail" data-id="' + C.esc(it.id) + '" style="padding:12px;text-align:center;cursor:pointer;position:relative">' +
        (stockBadge ? '<div style="position:absolute;top:8px;right:8px">' + stockBadge + '</div>' : '') +
        '<div style="display:grid;place-items:center;height:78px">' + C.renderItemVisual(it, 68, false) + '</div>' +
        '<div style="font-weight:700;font-size:13px;margin-top:6px;line-height:1.25">' + C.esc(it.name) + '</div>' +
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
  L.openItemDetail = openItemDetail;
  L.resolveCatalogItem = resolveCatalogItem;

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
      var boughtItem = (S.market || []).find(function (x) { return String(x.id) === String(buyId); }) || {};
      t.disabled = true;
      t.textContent = 'Memproses Transaksi...';
      try {
        var bRes = await API.post('/api/warga-shop/buy', { itemId: buyId, note: buyNote });
        if (bRes.user) S.user = bRes.user;
        if (bRes.items) S.market = bRes.items;
        if (bRes.orders) S.marketOrders = bRes.orders;
        C.shut();
        C.refresh();

        var sellerUsn = (bRes.sellerUsername || boughtItem.seller_username || boughtItem.sellerUsername || '').replace(/^@/, '');
        var sellerLabel = sellerUsn ? ('@' + sellerUsn) : (boughtItem.seller_name || 'Pelapak');

        if (sellerUsn) {
          C.sheet(
            '<h2>✅ Pembelian Berhasil!</h2>' +
            '<p class="sub">Detail transaksi sudah dikirim ke <b>PM Bot</b>. Silakan hubungi penjual <b>@' + C.esc(sellerUsn) + '</b> untuk serah-terima item/jasa.</p>' +
            '<button class="btn" onclick="if(window.Telegram&&window.Telegram.WebApp){window.Telegram.WebApp.openTelegramLink(\'https://t.me/' + C.esc(sellerUsn) + '\')}else{window.open(\'https://t.me/' + C.esc(sellerUsn) + '\',\'_blank\')}">💬 CHAT PENJUAL (@' + C.esc(sellerUsn).toUpperCase() + ')</button>' +
            '<button class="btn b2" data-act="shut">TUTUP</button>'
          );
        } else {
          C.notify('Mas Raka', 'Lapak Warga', bRes.message || ('Transaksi berhasil! Cek PM Bot untuk kontak ' + sellerLabel + '.'));
        }
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
      var itemId = t.getAttribute('data-id');
      var invInfo = extractInvMap();
      var entry = invInfo.map[String(itemId)];
      openItemDetail(resolveCatalogItem(itemId, entry && entry.meta));
    } else if (act === 'lp-equip-toggle') {
      var eqId = t.getAttribute('data-id');
      var eqItem = resolveCatalogItem(eqId);
      if (!eqItem) return;
      var currentlyEquipped = isItemEquipped(S.user, eqItem);
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
      var it = resolveCatalogItem(id);
      var qtyEl = document.getElementById('lp-qty-val');
      var buyQty = qtyEl ? Math.max(1, Number(qtyEl.textContent) || 1) : 1;
      var totalCost = (Number(it.price) || 0) * buyQty;

      if ((S.user.psc || 0) < totalCost) {
        C.notify('Mas Raka', 'Saldo Kurang', 'Dompet lu lagi cosplay gurun Sahara.');
        return;
      }
      t.disabled = true;
      t.textContent = 'Memproses (' + buyQty + 'x)...';
      try {
        var res = await API.post('/api/shop/buy', { itemId: id, qty: buyQty });
        if (res.user) S.user = res.user;
        if (res.inv) S.inv = res.inv;
        if (res.catalog) S.catalog = res.catalog;
        C.shut();
        C.refresh();
        C.notify('Mas Raka', 'Lapak Rongsok', it.name + ' (' + buyQty + 'x) berhasil dibeli!');
      } catch (err) {
        t.disabled = false;
        t.textContent = 'Beli Sekarang (' + buyQty + 'x) · ' + totalCost + ' PSC';
        C.notify('Mas Raka', 'Gagal Beli', err.message);
      }
    } else if (act === 'lp-send-gift') {
      var gid = t.getAttribute('data-id');
      var git = resolveCatalogItem(gid);
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
