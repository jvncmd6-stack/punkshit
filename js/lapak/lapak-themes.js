(function () {
  var C = window.PunkCore;
  var S = C.S;
  var L = window.PunkLapak = window.PunkLapak || {};

  var OS_THEMES = {
    'theme-sakura': {
      id: 'theme-sakura',
      type: 'theme',
      name: 'Sakura Velvet OS',
      price: 220,
      rarity: 'Epic',
      stock: -1,
      desc: 'Tampilan lembut nuansa kelopak sakura, rose-magenta, dan kilau kaca hangat.',
      colors: ['#ff9ad5', '#db2777'],
      svgPath: 'M50 12c9 14 24 14 33 5-2 15 8 27 21 33-13 6-23 18-21 33-9-9-24-9-33 5-9-14-24-14-33-5 2-15-8-27-21-33 13-6 23-18 21-33 9 9 24 9 33-5z',
      skinClass: 'theme-sakura',
      wallCss: 'radial-gradient(circle at 20% 18%, rgba(244,114,182,.38), transparent 52%), radial-gradient(circle at 82% 78%, rgba(192,132,252,.32), transparent 55%), linear-gradient(160deg, #1e1024 0%, #120b1c 100%)',
      accent: '#f472b6'
    },
    'theme-carbon': {
      id: 'theme-carbon',
      type: 'theme',
      name: 'Carbon Stealth OS',
      price: 220,
      rarity: 'Epic',
      stock: -1,
      desc: 'Nuansa gelap titanium & baja matte dengan garis cahaya biru elektrik tajam.',
      colors: ['#94a3b8', '#1e293b'],
      svgPath: 'M20 20h60v60H20z',
      skinClass: 'theme-carbon',
      wallCss: 'radial-gradient(circle at 75% 15%, rgba(56,189,248,.22), transparent 50%), radial-gradient(circle at 15% 85%, rgba(71,85,105,.35), transparent 55%), linear-gradient(165deg, #090d16 0%, #05070c 100%)',
      accent: '#38bdf8'
    },
    'theme-mint': {
      id: 'theme-mint',
      type: 'theme',
      name: 'Cyber Mint OS',
      price: 220,
      rarity: 'Epic',
      stock: -1,
      desc: 'Gradasi emerald & mint neon segar dengan atmosfer malam futuristik.',
      colors: ['#6ee7b7', '#059669'],
      svgPath: 'M50 8L90 30v40L50 92 10 70V30z',
      skinClass: 'theme-mint',
      wallCss: 'radial-gradient(circle at 22% 20%, rgba(52,211,153,.32), transparent 52%), radial-gradient(circle at 80% 75%, rgba(34,211,238,.26), transparent 55%), linear-gradient(160deg, #071c1b 0%, #061017 100%)',
      accent: '#34d399'
    }
  };

  function applyActiveOsTheme() {
    var u = S.user || {};
    var themeId = u.equippedThemeId || u.equipped_theme_id || '';
    if (!themeId && u.id) {
      try { themeId = localStorage.getItem('punk_os_theme_' + String(u.id)) || ''; } catch (e) {}
    }
    var ph = document.getElementById('ph');
    var wall = ph ? ph.querySelector('.wall') : null;
    if (!ph) return;

    ph.classList.remove('theme-sakura', 'theme-carbon', 'theme-mint');
    var th = OS_THEMES[themeId];
    if (th) {
      ph.classList.add(th.skinClass);
      ph.style.setProperty('--gblue', th.accent);
      if (wall) wall.style.background = th.wallCss;
    } else {
      ph.style.removeProperty('--gblue');
      if (wall) wall.style.background = '';
    }
  }

  function getMergedCatalogWithThemes() {
    var base = Array.isArray(S.catalog) ? S.catalog.slice() : [];
    var existingIds = {};
    base.forEach(function (it) {
      if (it && it.id) existingIds[String(it.id)] = true;
    });
    Object.keys(OS_THEMES).forEach(function (k) {
      if (!existingIds[k]) {
        base.push(OS_THEMES[k]);
      }
    });
    return base;
  }

  function isLimitedItem(it) {
    if (!it) return false;
    var r = String(it.rarity || '').toLowerCase();
    return Boolean(it.isLimited || it.isArchived || r.indexOf('limited') !== -1);
  }

  function getStockNum(it) {
    if (!it || it.stock === null || it.stock === undefined || it.stock === '') return -1;
    var n = Number(it.stock);
    return Number.isNaN(n) ? -1 : n;
  }

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
    if (OS_THEMES[cleanId]) return OS_THEMES[cleanId];

    var catalog = getMergedCatalogWithThemes();
    var found = catalog.find(function (c) {
      return String(c.id || c.itemId || '').trim() === cleanId;
    });
    if (found) return found;

    if (typeof C.findItem === 'function') {
      var viaCore = C.findItem(cleanId);
      if (viaCore) return viaCore;
    }

    var m = fallbackMeta || {};
    var snap = {};
    if (m.item_snapshot || m.snapshot) {
      try {
        var rawSnap = m.item_snapshot || m.snapshot;
        snap = typeof rawSnap === 'string' ? JSON.parse(rawSnap) : rawSnap;
      } catch (e) {}
    }

    return {
      id: cleanId,
      name: snap.name || m.name || m.title || cleanId.replace(/[_-]+/g, ' ').toUpperCase(),
      type: snap.type || m.type || (cleanId.indexOf('theme') !== -1 ? 'theme' : cleanId.indexOf('skin') !== -1 ? 'skin' : cleanId.indexOf('gift') !== -1 ? 'gift' : 'border'),
      rarity: snap.rarity || m.rarity || 'Limited',
      price: Number(snap.price != null ? snap.price : m.price) || 0,
      stock: 0,
      imageUrl: snap.imageUrl || m.imageUrl || m.image_url || m.url || '',
      colors: snap.colors || m.colors || null,
      svgPath: snap.svgPath || m.svgPath || '',
      skinClass: snap.skinClass || m.skinClass || m.cssClass || '',
      isLimited: true,
      isArchived: true,
      desc: snap.desc || m.desc || 'Item edisi terbatas (Collab / Limited) PUNKSHIT.OS'
    };
  }

  function isItemEquipped(u, it) {
    if (!u || !it) return false;
    var id = String(it.id);
    if (it.type === 'border') return String(u.equippedBorderId || u.equipped_border_id || '') === id;
    if (it.type === 'skin') return String(u.equippedSkinId || u.equipped_skin_id || '') === id;
    if (it.type === 'theme') {
      var curTh = u.equippedThemeId || u.equipped_theme_id || '';
      if (!curTh && u.id) {
        try { curTh = localStorage.getItem('punk_os_theme_' + String(u.id)) || ''; } catch (e) {}
      }
      return String(curTh) === id;
    }
    if (it.type === 'gift') {
      var pins = Array.isArray(u.pinnedGifts) ? u.pinnedGifts.map(String) : [];
      if (pins.length) return pins.indexOf(id) !== -1;
      return String(u.pinnedGiftId || u.pinned_gift_id || '') === id;
    }
    return false;
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
    var archived = Boolean(it.isArchived);
    var limited = isLimitedItem(it);
    var stockNum = archived ? 0 : getStockNum(it);
    var isOutOfStock = archived || stockNum === 0;
    var maxBuyable = stockNum < 0
      ? Math.max(1, Math.min(99, Math.floor(myPsc / Math.max(1, price))))
      : Math.min(stockNum, Math.max(1, Math.floor(myPsc / Math.max(1, price))));
    var stockInfo = archived
      ? 'Edisi Terbatas · Sudah Ditarik dari Toko'
      : (stockNum < 0 ? 'Stok: Unlimited' : (isOutOfStock ? 'STOK HABIS' : ('Sisa Stok: ' + stockNum)));

    var qtySelectorHtml = (!isOutOfStock && price > 0 && it.type !== 'theme')
      ? '<div style="display:flex;align-items:center;justify-content:center;gap:10px;margin:10px 0 6px">' +
          '<button type="button" class="pill" id="lp-qty-minus" style="font-size:15px;padding:4px 12px;font-weight:900">−</button>' +
          '<span style="font-size:13px;font-weight:800">Jumlah: <b id="lp-qty-val" data-max="' + Math.max(1, maxBuyable) + '" data-price="' + price + '">1</b>x</span>' +
          '<button type="button" class="pill" id="lp-qty-plus" style="font-size:15px;padding:4px 12px;font-weight:900">+</button>' +
        '</div>'
      : '';

    var buyBtnHtml = isOutOfStock
      ? '<button class="btn b2" disabled>' + (archived ? '✦ Edisi Limited (Penjualan Ditutup)' : '🚫 Stok Habis') + '</button>'
      : '<button class="btn" id="lp-buy-btn" data-act="lp-buy" data-id="' + C.esc(it.id) + '"' + (myPsc < price ? ' disabled' : '') + '>' +
          (owned ? '➕ Beli Lagi (1x) · ' : '🛒 Beli Sekarang (1x) · ') + price + ' PSC' +
        '</button>';

    var actionBtn = '';
    if (it.type === 'theme') {
      actionBtn = owned
        ? '<button class="btn" data-act="lp-equip-toggle" data-id="' + C.esc(it.id) + '">' + (equipped ? '✅ Tema Aktif (Tap Reset Default)' : '🎨 Terapkan Tema OS') + '</button>'
        : buyBtnHtml;
    } else if (it.type === 'gift') {
      actionBtn =
        (!archived
          ? '<button class="btn" data-act="lp-toggle-send">🎁 KIRIM GIFT KE WARGA (' + price + ' PSC)</button>' +
            '<div id="lp-send-box" hidden style="background:rgba(255,255,255,.05);padding:10px;border-radius:12px;margin-top:8px">' +
              '<label>TARGET PENERIMA (@username)</label>' +
              '<input id="lp-to" placeholder="@username">' +
              '<label>PESAN UCAPAN</label>' +
              '<input id="lp-msg" maxlength="100" placeholder="Tulis pesan manis atau nyindir...">' +
              '<label style="display:flex;align-items:center;gap:6px;margin:8px 0"><input id="lp-anon" type="checkbox"> Kirim sebagai Anonim</label>' +
              '<button class="btn" data-act="lp-send-gift" data-id="' + C.esc(it.id) + '">Kirim Gift · ' + price + ' PSC</button>' +
            '</div>'
          : '') +
        qtySelectorHtml +
        buyBtnHtml +
        (owned
          ? '<button class="btn b2" data-act="lp-equip-toggle" data-id="' + C.esc(it.id) + '">' + (equipped ? '📌 Lepas dari Orbit Profil' : '📌 Pasang di Orbit Profil') + '</button>'
          : '');
    } else if (owned) {
      actionBtn =
        '<button class="btn" data-act="lp-equip-toggle" data-id="' + C.esc(it.id) + '">' + (equipped ? '✅ Terpasang (Tap Lepas)' : '✨ Pasang ke Profil') + '</button>' +
        qtySelectorHtml +
        buyBtnHtml;
    } else {
      actionBtn = qtySelectorHtml + buyBtnHtml;
    }

    var typeLabel = it.type === 'theme' ? 'TEMA OS' : (it.type || 'item').toUpperCase();

    C.sheet(
      '<div style="display:grid;place-items:center;padding:12px 0">' + C.renderItemVisual(it, 110, true) + '</div>' +
      '<div style="text-align:center">' +
        '<span class="pill">' + C.esc(typeLabel) + ' · ' + C.esc(it.rarity || 'Rare') + '</span>' +
        (limited ? ' <span class="lim-tag">✦ LIMITED</span>' : '') +
        (owned ? ' <span class="pill" style="background:#38BDF833;color:#7DD3FC">Dimiliki: ' + ownedQty + 'x</span>' : '') +
        '<h2 style="margin-top:6px">' + C.esc(it.name) + '</h2>' +
        '<div style="color:#FFD633;font-size:16px;font-weight:800;margin:4px 0">' + (price > 0 ? price + ' PSC ' : '') + '<small style="color:' + (isOutOfStock ? '#FCA5A5' : 'var(--mut)') + ';font-weight:600">(' + stockInfo + ')</small></div>' +
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

  L.OS_THEMES = OS_THEMES;
  L.applyActiveOsTheme = applyActiveOsTheme;
  L.getMergedCatalogWithThemes = getMergedCatalogWithThemes;
  L.isLimitedItem = isLimitedItem;
  L.getStockNum = getStockNum;
  L.extractInvMap = extractInvMap;
  L.resolveCatalogItem = resolveCatalogItem;
  L.isItemEquipped = isItemEquipped;
  L.openItemDetail = openItemDetail;

  setInterval(applyActiveOsTheme, 3000);
  setTimeout(applyActiveOsTheme, 600);
})();
