(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var CFG = window.PUNK_CONFIG;
  var S = C.S;

  var pendingShopFile = null;

  function isItemEquipped(u, item) {
    if (!u || !item) return false;
    if (item.type === 'border') return u.equippedBorderId === item.id;
    if (item.type === 'skin') return u.equippedSkinId === item.id;
    if (item.type === 'gift') {
      var pins = Array.isArray(u.pinnedGifts) ? u.pinnedGifts : (u.pinnedGiftId ? [u.pinnedGiftId] : []);
      return pins.indexOf(item.id) !== -1;
    }
    return false;
  }

  function renderLapak() {
    var u = S.user;
    var tab = S.curTab.lapak || 'all';
    var items = (S.catalog && S.catalog.length) ? S.catalog : CFG.DEFAULT_ITEMS;

    var filtered = items.filter(function (it) {
      if (tab === 'all') return true;
      return it.type === tab;
    });

    var tabsHtml =
      '<div class="tabs">' +
        '<button class="tab' + (tab === 'all' ? ' on' : '') + '" data-act="lp-tab" data-tab="all">Semua</button>' +
        '<button class="tab' + (tab === 'gift' ? ' on' : '') + '" data-act="lp-tab" data-tab="gift">🎁 Gift</button>' +
        '<button class="tab' + (tab === 'border' ? ' on' : '') + '" data-act="lp-tab" data-tab="border">🖼️ Avatar Border</button>' +
        '<button class="tab' + (tab === 'skin' ? ' on' : '') + '" data-act="lp-tab" data-tab="skin">🪪 Card Skin</button>' +
      '</div>';

    return (
      '<p class="bal">Saldo: <b>' + (u.psc || 0) + ' PSC</b> · Gudang Barang: ' + (S.inv ? S.inv.length : 0) + ' item</p>' +
      tabsHtml +
      (filtered.length
        ? '<div class="gg">' +
            filtered.map(function (it) {
              var owned = (S.inv || []).some(function (x) { return x.itemId === it.id; });
              var equipped = isItemEquipped(u, it);
              var stockTag = (it.stock != null && it.stock >= 0) ? '<span class="stk">Sisa ' + it.stock + '</span>' : '';
              var badgeOwned = equipped
                ? ' · TERPASANG'
                : (owned ? ' · DIMILIKI' : '');
              return (
                '<button class="gc" data-act="lp-detail" data-id="' + C.esc(it.id) + '">' +
                  stockTag +
                  C.renderItemVisual(it, 82, false) +
                  '<b>' + C.esc(it.name) + '</b>' +
                  '<small>' + C.esc(it.rarity || 'Rare') + badgeOwned + '</small>' +
                  '<span class="pr">' + it.price + ' PSC</span>' +
                '</button>'
              );
            }).join('') +
          '</div>'
        : '<div class="emp">Belum ada item di kategori ini.</div>')
    );
  }

  // Tampilan Lapak Warga ala Shopee (Profil Toko + Etalase Multi-Media + Transaksi Beli)
  function renderLapakWarga() {
    var u = S.user || {};
    var tab = S.curTab.lapakwarga || 'all';
    var allItems = S.market || [];
    var orders = S.marketOrders || [];

    var myCount = allItems.filter(function (m) { return String(m.seller_id) === String(u.id); }).length;

    var shopHeader =
      '<div style="position:relative;border-radius:18px;overflow:hidden;margin-bottom:14px;border:1px solid rgba(255,255,255,.12);background:linear-gradient(135deg,#ea580c 0%,#9a3412 45%,#0f172a 100%)">' +
        '<div style="padding:16px 14px;background:radial-gradient(circle at top right,rgba(255,214,51,.25),transparent 60%)">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px">' +
            '<div style="display:flex;align-items:center;gap:11px">' +
              C.renderAvatar(u, 'mini') +
              '<div>' +
                '<div style="display:flex;align-items:center;gap:6px">' +
                  '<b style="font-size:15px;color:#fff">' + C.esc(u.name || 'Warga') + ' Official</b>' +
                  '<span style="background:#FFD633;color:#000;font-size:9px;font-weight:800;padding:2px 6px;border-radius:4px">STAR+</span>' +
                '</div>' +
                '<small style="color:rgba(255,255,255,.9);display:block;margin-top:2px">Saldo: <b>' + (u.psc || 0) + ' PSC</b> · Etalase: ' + myCount + ' Produk</small>' +
              '</div>' +
            '</div>' +
            '<button class="pill" style="background:#fff;color:#ea580c;font-weight:800" data-act="lw-new-sheet">+ Jual</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var tabsHtml =
      '<div class="tabs">' +
        '<button class="tab' + (tab === 'all' ? ' on' : '') + '" data-act="lw-tab" data-tab="all">🏬 Etalase (' + allItems.length + ')</button>' +
        '<button class="tab' + (tab === 'mine' ? ' on' : '') + '" data-act="lw-tab" data-tab="mine">📦 Toko Gue (' + myCount + ')</button>' +
        '<button class="tab' + (tab === 'orders' ? ' on' : '') + '" data-act="lw-tab" data-tab="orders">🧾 Order (' + orders.length + ')</button>' +
      '</div>';

    if (tab === 'orders') {
      var ordersHtml = orders.length
        ? '<div class="grp">' +
            orders.map(function (o) {
              var isBuyer = String(o.buyer_id) === String(u.id);
              var badge = isBuyer
                ? '<span class="pill" style="background:#EF444433;color:#FCA5A5">BELI -' + o.price + ' PSC</span>'
                : '<span class="pill" style="background:#34C75933;color:#6df0a0">LAKU +' + o.price + ' PSC</span>';
              var partner = isBuyer ? ('Pelapak: ' + C.esc(o.seller_name)) : ('Pembeli: ' + C.esc(o.buyer_name));
              return (
                '<div class="rw">' +
                  '<div>' +
                    '<b>' + C.esc(o.item_title) + '</b>' +
                    '<small>' + partner + (o.note ? (' · "' + C.esc(o.note) + '"') : '') + '</small>' +
                  '</div>' +
                  badge +
                '</div>'
              );
            }).join('') +
          '</div>'
        : '<div class="emp">Belum ada riwayat transaksi jual-beli di Lapak Warga.</div>';

      return shopHeader + tabsHtml + ordersHtml;
    }

    var filtered = allItems.filter(function (m) {
      if (tab === 'mine') return String(m.seller_id) === String(u.id);
      return true;
    });

    var gridHtml = filtered.length
      ? '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
          filtered.map(function (m) {
            var mediaUrl = m.image_url || m.imageUrl || '';
            var isWebm = /\.webm$/i.test(mediaUrl);
            var isSold = m.status === 'sold';
            var mediaBox = '';

            if (mediaUrl) {
              var fullSrc = C.esc(API.assetUrl(mediaUrl));
              mediaBox = isWebm
                ? '<video src="' + fullSrc + '" autoplay loop muted playsinline style="width:100%;height:145px;object-fit:cover;display:block;background:#080B12' + (isSold ? ';opacity:.45' : '') + '"></video>'
                : '<img src="' + fullSrc + '" alt="" style="width:100%;height:145px;object-fit:cover;display:block;background:#080B12' + (isSold ? ';opacity:.45' : '') + '">';
            } else {
              mediaBox = '<div style="width:100%;height:130px;background:linear-gradient(135deg,#1e293b,#0f172a);display:grid;place-items:center;color:#64748b;font-size:12px">🛍️ Produk Warga</div>';
            }

            return (
              '<div class="gc" style="padding:0;overflow:hidden;text-align:left;align-items:stretch;justify-content:space-between;cursor:pointer" data-act="lw-detail" data-id="' + C.esc(m.id) + '">' +
                '<div style="position:relative">' +
                  mediaBox +
                  '<span style="position:absolute;top:6px;left:6px;background:rgba(15,23,42,.85);color:#FFD633;font-size:9px;font-weight:700;padding:2px 6px;border-radius:6px">' + C.esc(m.category || 'Etalase') + '</span>' +
                  (isSold ? '<span style="position:absolute;top:6px;right:6px;background:#EF4444;color:#fff;font-size:9px;font-weight:900;padding:2px 6px;border-radius:6px">SOLD OUT</span>' : '') +
                '</div>' +
                '<div style="padding:9px 10px">' +
                  '<b style="font-size:13px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' + C.esc(m.title) + '</b>' +
                  '<span class="pr" style="display:inline-block;margin-top:5px;font-size:13px">' + C.esc(m.price) + ' PSC</span>' +
                  '<div style="display:flex;align-items:center;justify-content:space-between;gap:5px;margin-top:7px;padding-top:6px;border-top:1px solid rgba(255,255,255,.08)">' +
                    '<small style="font-size:10px;opacity:.85;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">🏪 ' + C.esc(m.seller_name || 'Warga') + '</small>' +
                    '<small style="font-size:10px;color:#38BDF8;font-weight:700">' + (isSold ? 'Terjual' : 'Detail ›') + '</small>' +
                  '</div>' +
                '</div>' +
              '</div>'
            );
          }).join('') +
        '</div>'
      : '<div class="emp">Etalase masih kosong. Klik tombol <b>+ Jual</b> di atas buat pajang barang, stiker, GIF, atau WebM!</div>';

    return shopHeader + tabsHtml + gridHtml;
  }

  function openNewShopItemSheet() {
    pendingShopFile = null;
    C.sheet(
      '<h2>🛍️ Pajang Produk ke Etalase</h2>' +
      '<p class="sub">Upload foto barang, stiker, GIF, atau WebM biar tampil di etalase toko lo.</p>' +

      '<label>MEDIA PRODUK (GAMBAR / STIKER / GIF / WEBM)</label>' +
      '<div class="up-box" id="lw-drop">' +
        '<input type="file" id="lw-file" accept="image/*,video/webm,.gif,.webm" hidden>' +
        '<div id="lw-file-label" style="font-size:13px;font-weight:600;color:var(--gblue)">📁 Tap untuk Pilih File (JPG / PNG / GIF / WEBM)</div>' +
        '<small style="color:var(--mut);font-size:11px">Maksimal ukuran file 10MB</small>' +
      '</div>' +
      '<div id="lw-prev-box" style="display:none;margin:8px 0;text-align:center"></div>' +

      '<label>NAMA PRODUK / JASA</label>' +
      '<input id="lw-title" maxlength="60" placeholder="mis. Stiker Pack / Akun / Jasa Desain">' +

      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
        '<div><label>HARGA (PSC)</label><input id="lw-price" type="number" min="1" value="50"></div>' +
        '<div><label>KATEGORI</label><select id="lw-cat"><option value="Barang">Barang (1x Beli)</option><option value="Stiker / GIF">Stiker / GIF</option><option value="WebM / Video">WebM / Video</option><option value="Jasa">Jasa (Berulang)</option></select></div>' +
      '</div>' +

      '<label>DESKRIPSI PRODUK</label>' +
      '<textarea id="lw-desc" rows="2" maxlength="200" placeholder="Jelasin detail barang atau cara transaksi..."></textarea>' +

      '<button class="btn" data-act="lw-save">PAJANG DI ETALASE SEKARANG</button>'
    );

    var drop = document.getElementById('lw-drop');
    var inp = document.getElementById('lw-file');
    var lbl = document.getElementById('lw-file-label');
    var prevBox = document.getElementById('lw-prev-box');

    drop.onclick = function () { inp.click(); };
    inp.onchange = function () {
      var file = inp.files && inp.files[0];
      if (!file) return;
      pendingShopFile = file;
      lbl.innerHTML = '✅ File dipilih: <b>' + C.esc(file.name) + '</b>';
      lbl.style.color = '#34C759';

      var url = URL.createObjectURL(file);
      prevBox.style.display = 'block';
      if (/\.webm$/i.test(file.name) || file.type === 'video/webm') {
        prevBox.innerHTML = '<video src="' + url + '" autoplay loop muted playsinline style="max-height:130px;border-radius:10px"></video>';
      } else {
        prevBox.innerHTML = '<img src="' + url + '" style="max-height:130px;border-radius:10px">';
      }
    };
  }

  function openShopItemDetail(m) {
    if (!m) return;
    var u = S.user || {};
    var isSold = m.status === 'sold';
    var isMine = String(m.seller_id) === String(u.id);
    var myPsc = Number(u.psc) || 0;
    var price = Number(m.price) || 0;
    var enough = myPsc >= price;

    var mediaUrl = m.image_url || m.imageUrl || '';
    var fullSrc = mediaUrl ? C.esc(API.assetUrl(mediaUrl)) : '';
    var mediaHtml = '';
    if (fullSrc) {
      mediaHtml = /\.webm$/i.test(mediaUrl)
        ? '<video src="' + fullSrc + '" autoplay loop muted playsinline style="width:100%;max-height:210px;object-fit:contain;border-radius:12px;background:#080B12;margin-bottom:10px"></video>'
        : '<img src="' + fullSrc + '" style="width:100%;max-height:210px;object-fit:contain;border-radius:12px;background:#080B12;margin-bottom:10px">';
    }

    var actionSection = '';
    if (isSold) {
      actionSection =
        '<button class="btn b2" disabled style="opacity:.65">SUDAH TERJUAL' + (m.buyer_name ? (' KE ' + C.esc(m.buyer_name.toUpperCase())) : '') + '</button>' +
        '<button class="btn b2" data-act="shut">TUTUP DETAIL</button>';
    } else if (isMine) {
      actionSection =
        '<button class="btn b2" style="color:#FCA5A5" data-act="lw-delete" data-id="' + C.esc(m.id) + '">🗑️ HAPUS DAGANGAN DARI ETALASE</button>' +
        '<button class="btn" data-act="shut">TUTUP DETAIL</button>';
    } else {
      var btnTitle = m.category === 'Jasa' ? ('🛒 PESAN JASA · ' + price + ' PSC') : ('🛒 BELI SEKARANG · ' + price + ' PSC');
      actionSection =
        '<div style="background:rgba(255,255,255,.05);padding:9px 11px;border-radius:10px;margin:10px 0;font-size:12px">' +
          'Saldo PSC Lu: <b style="color:#FFD633">' + myPsc + ' PSC</b> ' +
          (enough
            ? '<span style="color:#6df0a0">(Sisa nanti: ' + (myPsc - price) + ' PSC)</span>'
            : '<span style="color:#FCA5A5">(Saldo kurang ' + (price - myPsc) + ' PSC)</span>') +
        '</div>' +
        '<label>CATATAN / KONTAK UNTUK PELAPAK (OPSIONAL)</label>' +
        '<input id="lw-buy-note" maxlength="100" placeholder="Contoh: Cek DM Tele ya / Detail pesanan...">' +
        '<button class="btn" data-act="lw-buy" data-id="' + C.esc(m.id) + '"' + (enough ? '' : ' disabled') + '>' + btnTitle + '</button>' +
        '<button class="btn b2" data-act="shut">BATAL</button>';
    }

    C.sheet(
      mediaHtml +
      '<div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.05);padding:8px 10px;border-radius:10px;margin-bottom:10px">' +
        '<div><b style="font-size:13px">🏪 Toko ' + C.esc(m.seller_name || 'Warga') + '</b><small style="display:block;font-size:11px">Pelapak Terverifikasi Markas</small></div>' +
        '<span class="pill">' + C.esc(m.category || 'Etalase') + '</span>' +
      '</div>' +
      '<h2>' + C.esc(m.title) + '</h2>' +
      '<div style="color:#FFD633;font-size:18px;font-weight:800;margin:4px 0">' + price + ' PSC</div>' +
      '<p class="sub">' + C.esc(m.description || 'Tidak ada deskripsi tambahan.') + '</p>' +
      actionSection
    );
  }

  function openItemDetail(item) {
    if (!item) return;
    var u = S.user;
    var owned = (S.inv || []).some(function (x) { return x.itemId === item.id; });
    var equipped = isItemEquipped(u, item);
    var soldOut = (item.stock != null && item.stock === 0);

    var previewHtml = '';
    if (item.type === 'border' && item.imageUrl) {
      var initial = C.esc((u.name || '?')[0].toUpperCase());
      var pfp = u.photoUrl
        ? '<img class="pfp" src="' + C.esc(API.assetUrl(u.photoUrl)) + '" alt="">'
        : '<span>' + initial + '</span>';
      previewHtml =
        '<div class="try-box">' +
          pfp +
          '<img class="dc-border" src="' + C.esc(API.assetUrl(item.imageUrl)) + '" alt="">' +
        '</div>' +
        '<small style="color:#6df0a0;font-weight:600;display:block;margin-bottom:6px">✨ Live Preview di Avatar Telegram Lo</small>';
    } else {
      previewHtml = '<div style="display:grid;place-items:center">' + C.renderItemVisual(item, 150, true) + '</div>';
    }

    var primaryBtnHtml = '';
    if (owned && item.type !== 'gift') {
      primaryBtnHtml =
        '<button class="btn' + (equipped ? ' b2' : '') + '" data-act="lp-equip-toggle" data-id="' + C.esc(item.id) + '">' +
          (equipped ? '🚫 Lepas dari Profil' : '✨ Pasang di Profil') +
        '</button>';
    } else {
      var buyLabel = soldOut ? 'STOK HABIS' : ('Beli Sekarang · ' + item.price + ' PSC');
      primaryBtnHtml =
        '<button class="btn" data-act="lp-buy" data-id="' + C.esc(item.id) + '"' + (soldOut ? ' disabled' : '') + '>' + buyLabel + '</button>';
    }

    var giftEquipSection = '';
    if (item.type === 'gift' && owned) {
      giftEquipSection =
        '<button class="btn' + (equipped ? ' b2' : '') + '" data-act="lp-equip-toggle" data-id="' + C.esc(item.id) + '">' +
          (equipped ? '🚫 Lepas Gift dari Profil' : '📌 Pasang Gift di Profil') +
        '</button>';
    }

    var sendGiftSection = '';
    if (item.type === 'gift') {
      sendGiftSection =
        '<button class="btn b2" data-act="lp-toggle-send">🎁 Kirim sebagai Hadiah ke Warga</button>' +
        '<div id="lp-send-box" hidden>' +
          '<label>USERNAME PENERIMA</label>' +
          '<input id="lp-to" placeholder="@username" maxlength="32">' +
          '<input id="lp-msg" placeholder="Pesan ucapan (opsional)" maxlength="70">' +
          '<button class="btn" data-act="lp-send-gift" data-id="' + C.esc(item.id) + '">Kirim Gift · ' + item.price + ' PSC</button>' +
        '</div>';
    }

    C.sheet(
      previewHtml +
      '<h2>' + C.esc(item.name) + '</h2>' +
      '<p class="sub">' + C.esc(item.rarity || 'Rare') + ' · ' + C.esc(item.desc || 'Item eksklusif Lapak Rongsok.') + '</p>' +
      primaryBtnHtml +
      giftEquipSection +
      sendGiftSection
    );
  }

  C.Views.lapak = renderLapak;
  C.Views.lapakwarga = renderLapakWarga;

  document.addEventListener('click', async function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var act = t.getAttribute('data-act');

    if (act === 'lp-tab') {
      S.curTab.lapak = t.getAttribute('data-tab');
      C.refresh();
    } else if (act === 'lw-tab') {
      S.curTab.lapakwarga = t.getAttribute('data-tab');
      C.refresh();
    } else if (act === 'lw-new-sheet') {
      openNewShopItemSheet();
    } else if (act === 'lw-detail') {
      var sid = t.getAttribute('data-id');
      var found = (S.market || []).find(function (x) { return String(x.id) === String(sid); });
      openShopItemDetail(found);
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
        t.textContent = '🗑️ HAPUS DAGANGAN DARI ETALASE';
        C.notify('Mas Raka', 'Gagal Hapus', err.message);
      }
    } else if (act === 'lw-save') {
      var title = (document.getElementById('lw-title').value || '').trim();
      var price = Number(document.getElementById('lw-price').value) || 0;
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
        fd.append('category', category);
        fd.append('description', description);
        if (pendingShopFile) {
          fd.append('media', pendingShopFile);
        }

        await API.upload('/api/shop', fd);
        pendingShopFile = null;
        var listRes = await API.get('/api/shop');
        S.market = listRes.items || [];
        S.marketOrders = listRes.orders || [];
        C.shut();
        C.refresh();
        C.notify('Mas Raka', 'Lapak Warga', 'Produk "' + title + '" resmi masuk etalase!');
      } catch (err) {
        t.disabled = false;
        t.textContent = 'PAJANG DI ETALASE SEKARANG';
        C.notify('Mas Raka', 'Gagal Upload', err.message);
      }
    } else if (act === 'lp-detail') {
      var item = C.findItem(t.getAttribute('data-id'));
      openItemDetail(item);
    } else if (act === 'lp-equip-toggle') {
      var eqId = t.getAttribute('data-id');
      var eqItem = C.findItem(eqId);
      if (!eqItem) return;
      var currentlyEquipped = isItemEquipped(S.user, eqItem);
      var eqType = eqItem.type === 'gift' ? 'pin' : eqItem.type;
      var payloadItemId = eqItem.type === 'gift'
        ? eqItem.id
        : (currentlyEquipped ? null : eqItem.id);

      t.disabled = true;
      try {
        var eqRes = await API.post('/api/profile/equip', { type: eqType, itemId: payloadItemId });
        if (eqRes.user) S.user = eqRes.user;
        C.shut();
        C.refresh();
        C.notify('Mas Raka', 'Profil Updated', currentlyEquipped ? (eqItem.name + ' dilepas dari profil.') : (eqItem.name + ' dipasang di profil!'));
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
        C.notify('Mas Raka', 'Saldo Kurang', 'Dompet lu lagi cosplay gurun Sahara. Absen atau ikut saweran dulu!');
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
        C.notify('Mas Raka', 'Lapak Rongsok', it.name + ' berhasil dibeli! Cek tab Gue atau tap item buat pasang.');
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
      if (to.length < 3) {
        C.notify('Mas Raka', 'Validasi', 'Masukkan @username penerima dengan benar.');
        return;
      }
      if ((S.user.psc || 0) < git.price) {
        C.notify('Mas Raka', 'Saldo Kurang', 'Saldo PSC lu belum cukup buat traktir warga.');
        return;
      }
      t.disabled = true;
      t.textContent = 'Mengirim...';
      try {
        var res = await API.post('/api/gift/send', { itemId: gid, toUsername: to, message: msg });
        S.user = res.user;
        C.shut();
        C.refresh();
        C.notify('Mas Raka', '→ Grup Punkshit', S.user.name + ' ngirim ' + git.name + ' ke ' + to + '!');
      } catch (err) {
        t.disabled = false;
        t.textContent = 'Kirim Gift · ' + git.price + ' PSC';
        C.notify('Mas Raka', 'Gagal Kirim', err.message);
      }
    }
  });
})();
