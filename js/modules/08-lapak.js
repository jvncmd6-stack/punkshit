(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var CFG = window.PUNK_CONFIG;
  var S = C.S;

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
              var stockTag = (it.stock != null && it.stock >= 0) ? '<span class="stk">Sisa ' + it.stock + '</span>' : '';
              var badgeOwned = (owned && it.type !== 'gift') ? ' · DIMILIKI' : '';
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

  // Detail Item + Preview Try-On (Khusus Discord-Style Avatar Border)
  function openItemDetail(item) {
    if (!item) return;
    var u = S.user;
    var owned = (S.inv || []).some(function (x) { return x.itemId === item.id; });
    var soldOut = (item.stock != null && item.stock === 0);

    var previewHtml = '';
    if (item.type === 'border' && item.imageUrl) {
      // Live Try-On: Tampilkan foto profil Telegram user dipasangi border ini!
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

    var buyLabel = soldOut ? 'STOK HABIS'
      : (owned && item.type !== 'gift') ? 'SUDAH DIMILIKI'
      : ('Beli Sekarang · ' + item.price + ' PSC');

    var buyDisabled = (soldOut || (owned && item.type !== 'gift')) ? ' disabled' : '';

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
      '<button class="btn" data-act="lp-buy" data-id="' + C.esc(item.id) + '"' + buyDisabled + '>' + buyLabel + '</button>' +
      sendGiftSection
    );
  }

  C.Views.lapak = renderLapak;

  document.addEventListener('click', async function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var act = t.getAttribute('data-act');

    if (act === 'lp-tab') {
      S.curTab.lapak = t.getAttribute('data-tab');
      C.refresh();
    } else if (act === 'lp-detail') {
      var item = C.findItem(t.getAttribute('data-id'));
      openItemDetail(item);
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
        C.notify('Mas Raka', '→ Grup Punkshit', S.user.name + ' baru beli ' + it.name + '! Dompet berkurang, gaya bertambah.');
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
