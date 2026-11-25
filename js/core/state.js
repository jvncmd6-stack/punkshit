window.PunkCoreState = (function () {
  var CFG = window.PUNK_CONFIG;
  var API = window.PunkAPI;

  var S = {
    user: null,
    inv: [],
    catalog: [],
    onlineUsers: [],
    feed: [],
    missions: [],
    events: [],
    wanted: [],
    polls: [],
    market: [],
    marketOrders: [],
    rulesHelp: { pasal: '', help: '' },
    adminStats: { totalUsers: 0, totalWaitingRadio: 0, users: [] },
    curApp: '',
    curTab: {}
  };

  var Views = {};

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return '&#' + c.charCodeAt(0) + ';';
    });
  }

  function rankInfo(streak) {
    var n = Number(streak) || 0;
    if (n >= 60) return { title: '👑 Fosil Punkshit', bonus: 15 };
    if (n >= 30) return { title: '⚡ Pentolan Punkshit', bonus: 10 };
    if (n >= 14) return { title: '🔥 Biang Kerok', bonus: 7 };
    if (n >= 7)  return { title: '☕ Tukang Nongki', bonus: 5 };
    if (n >= 4)  return { title: '🚬 Anak Titipan', bonus: 3 };
    return { title: '🌱 Anak Bawang', bonus: 2 };
  }

  function ico(id) {
    var i = (CFG.ICONS && CFG.ICONS[id]) || ['#8FC7FF', '#176BFF', 'M12 2L2 7l10 5 10-5-10-5z'];
    if (Array.isArray(i) && i.length >= 4) {
      return '<div class="ic" style="--a:' + i[1] + ';--b:' + i[2] + '"><svg viewBox="0 0 24 24"><path d="' + i[3] + '"/></svg></div>';
    }
    return '<div class="ic" style="--a:#8FC7FF;--b:#176BFF"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg></div>';
  }

  function findItem(id) {
    if (!id) return null;
    var target = String(id).trim().toLowerCase();
    var pools = [S.catalog || [], CFG.DEFAULT_ITEMS || []];
    for (var p = 0; p < pools.length; p++) {
      var list = pools[p];
      for (var i = 0; i < list.length; i++) {
        var cid = String(list[i].id || list[i].itemId || '').trim().toLowerCase();
        if (cid === target) return list[i];
      }
    }
    var invList = Array.isArray(S.inv) ? S.inv : [];
    for (var j = 0; j < invList.length; j++) {
      var entry = invList[j];
      if (!entry || typeof entry !== 'object') continue;
      var eid = String(entry.itemId || entry.item_id || entry.id || '').trim().toLowerCase();
      if (eid === target && (entry.name || entry.imageUrl || entry.image_url)) {
        return entry;
      }
    }
    return null;
  }

  function renderItemVisual(item, size, draggable) {
    if (!item) return '';
    var dragAttr = draggable ? ' data-d' : '';
    var imgSrc = item.imageUrl || item.image_url || item.url || '';
    if (imgSrc) {
      var src = esc(API.assetUrl(imgSrc));
      return '<div class="g3"' + dragAttr + ' style="--s:' + size + 'px;--gl:#8FC7FF66"><div class="rot"><img src="' + src + '" alt="' + esc(item.name || 'Item') + '"></div></div>';
    }
    var cols = (Array.isArray(item.colors) && item.colors.length >= 2) ? item.colors : ['#cfeaff', '#176BFF'];
    var fallbackPath = 'M50 10 L86 36 L72 86 L28 86 L14 36 Z';
    var d = item.svgPath || item.svg_path || (CFG.DEFAULT_ITEMS && CFG.DEFAULT_ITEMS[0] && CFG.DEFAULT_ITEMS[0].svgPath) || fallbackPath;
    var layers = '';
    for (var i = 0; i < 10; i++) {
      var t = Math.round((i / 9) * 100);
      var z = ((i - 4.5) * 0.014).toFixed(3);
      var stroke = (i === 9) ? ' stroke="#fff" stroke-opacity=".75" stroke-width="2.5" stroke-linejoin="round"' : '';
      layers += '<svg viewBox="0 0 100 100" style="transform:translateZ(calc(var(--s)*' + z + '))"><path d="' + d + '" fill="color-mix(in srgb,' + cols[0] + ' ' + t + '%,' + cols[1] + ')"' + stroke + '/></svg>';
    }
    return '<div class="g3"' + dragAttr + ' style="--s:' + size + 'px;--gl:' + cols[1] + '99"><div class="rot">' + layers + '</div></div>';
  }

  function getSavedBorderTransform(uid, borderId) {
    if (!uid || !borderId) return '';
    try {
      var raw = localStorage.getItem('punk_border_adj_' + String(uid) + '_' + String(borderId));
      if (!raw) return '';
      var p = JSON.parse(raw);
      var sc = Math.max(0.6, Math.min(1.6, Number(p.scale) || 1));
      var x = Math.max(-35, Math.min(35, Number(p.x) || 0));
      var y = Math.max(-45, Math.min(45, Number(p.y) || 0));
      if (sc === 1 && x === 0 && y === 0) return '';
      return 'transform:translate(' + x + 'px,' + y + 'px) scale(' + (sc * 1.24).toFixed(3) + ');animation:none';
    } catch (e) {
      return '';
    }
  }

  function renderBorderOverlay(u, isMini) {
    if (!u) return '';
    var bItem = u.equippedBorderId ? findItem(u.equippedBorderId) : null;
    var borderUrl = u.equippedBorderUrl || (bItem && (bItem.imageUrl || bItem.image_url)) || '';
    var customStyle = (!isMini && u.id && u.equippedBorderId)
      ? getSavedBorderTransform(u.id, u.equippedBorderId)
      : '';

    if (borderUrl) {
      return '<img class="dc-border" src="' + esc(API.assetUrl(borderUrl)) + '"' +
        (customStyle ? ' style="' + customStyle + '"' : '') + ' alt="">';
    }
    if (bItem) {
      var cols = bItem.colors || ['#8FC7FF', '#176BFF'];
      return '<div class="dc-border-fx ' + esc(bItem.skinClass || '') + '" style="--bc1:' + esc(cols[0]) + ';--bc2:' + esc(cols[1]) + '"></div>';
    }
    return '';
  }

  function renderOrbitGifts(u) {
    var rawIds = Array.isArray(u.pinnedGifts)
      ? u.pinnedGifts
      : (u.pinnedGiftId ? [u.pinnedGiftId] : []);
    var items = rawIds.slice(0, 6).map(function (gid) {
      return findItem(gid);
    }).filter(Boolean);

    if (!items.length) return '';

    var angles = [-28, 28, -62, 62, -96, 96];
    var radius = 64;

    return items.map(function (giftItem, idx) {
      var deg = angles[idx] != null ? angles[idx] : (idx * 60);
      var rad = (deg * Math.PI) / 180;
      var dx = Math.round(Math.sin(rad) * radius);
      var dy = Math.round(-Math.cos(rad) * radius);
      return (
        '<div class="av-gift-pin" title="' + esc(giftItem.name) + '" ' +
             'style="position:absolute;left:50%;top:50%;' +
             'transform:translate(calc(-50% + ' + dx + 'px),calc(-50% + ' + dy + 'px));' +
             'z-index:7;background:rgba(15,23,42,.95);border:1.5px solid rgba(255,255,255,.26);' +
             'border-radius:50%;padding:3px;box-shadow:0 4px 12px rgba(0,0,0,.6);pointer-events:none">' +
          renderItemVisual(giftItem, 22, false) +
        '</div>'
      );
    }).join('');
  }

  function renderAvatar(u, mode) {
    if (!u) return '';
    var isMini = mode === 'mini';
    var initial = esc((u.name || '?')[0].toUpperCase());
    var photoSrc = u.photoUrl || u.avatar || '';
    var photo = photoSrc
      ? '<img class="pfp" src="' + esc(API.assetUrl(photoSrc)) + '" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'">'
      : '';
    var fallback = '<span style="' + (photoSrc ? 'display:none' : '') + '">' + initial + '</span>';
    var borderHtml = renderBorderOverlay(u, isMini);

    if (isMini) {
      return '<div class="mini-av">' + photo + fallback + borderHtml + '</div>';
    }

    var pinHtml = renderOrbitGifts(u);
    var ringCls = 'r' + (Number(u.ringStyle) || 0);
    return '<div class="av-wrap" style="position:relative">' +
      '<div class="ring ' + ringCls + '">' + photo + fallback + '</div>' +
      borderHtml +
      pinHtml +
    '</div>';
  }

  function bindDrag(root) {
    if (!root) return;
    root.querySelectorAll('.g3[data-d]').forEach(function (g) {
      var o = g.firstChild, x, y, ry = 0, rx = 0, on = 0, tm;
      g.onpointerdown = function (e) {
        on = 1; x = e.clientX; y = e.clientY;
        clearTimeout(tm); o.style.animation = 'none';
        g.setPointerCapture(e.pointerId);
      };
      g.onpointermove = function (e) {
        if (!on) return;
        ry += (e.clientX - x) * 0.9;
        rx -= (e.clientY - y) * 0.9;
        x = e.clientX; y = e.clientY;
        o.style.transform = 'rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
      };
      g.onpointerup = g.onpointercancel = function () {
        on = 0;
        tm = setTimeout(function () { o.style.animation = ''; o.style.transform = ''; }, 2400);
      };
    });
  }

  return {
    S: S,
    Views: Views,
    esc: esc,
    rankInfo: rankInfo,
    ico: ico,
    findItem: findItem,
    renderItemVisual: renderItemVisual,
    renderAvatar: renderAvatar,
    bindDrag: bindDrag
  };
})();
