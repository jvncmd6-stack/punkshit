(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;
  var L = window.PunkLapak || {};

  C.Views.lapak = L.renderLapak;
  C.Views.lapakwarga = L.renderLapakWarga;

  // Guard anti-double listener agar tombol tidak pernah ke-trigger 2x
  if (window.__punkLapakBound) return;
  window.__punkLapakBound = true;

  document.addEventListener('click', async function (e) {
    var t = e.target.closest('[data-act]');
    if (!t || t.disabled) return;
    var act = t.getAttribute('data-act');

    if (act === 'lp-tab') {
      S.curTab.lapak = t.getAttribute('data-tab');
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
