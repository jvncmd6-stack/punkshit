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

  function isVideoAsset(url) {
    return /\.(webm|mp4)(\?.*)?$/i.test(String(url || '').trim());
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
      if (isVideoAsset(imgSrc)) {
        return '<div class="g3"' + dragAttr + ' style="--s:' + size + 'px;--gl:#8FC7FF66"><div class="rot"><video src="' + src + '" autoplay loop muted playsinline style="width:100%;height:100%;object-fit:contain;pointer-events:none"></video></div></div>';
      }
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

  function getSavedBorderData(uid, borderId) {
    if (!uid || !borderId) return null;
    try {
      var raw = localStorage.getItem('punk_border_adj_' + String(uid) + '_' + String(borderId));
      if (!raw) return null;
      var p = JSON.parse(raw);
      return {
        scale: Math.max(0.6, Math.min(1.6, Number(p.scale) || 1)),
        x: Math.max(-35, Math.min(35, Number(p.x) || 0)),
        y: Math.max(-45, Math.min(45, Number(p.y) || 0))
      };
    } catch (e) {
      return null;
    }
  }

  function getSavedGiftData(uid, giftId) {
    if (!uid || !giftId) return null;
    try {
      var raw = localStorage.getItem('punk_gift_adj_' + String(uid) + '_' + String(giftId));
      if (!raw) return null;
      var p = JSON.parse(raw);
      return {
        scale: Math.max(0.5, Math.min(2.2, Number(p.scale) || 1)),
        x: Math.max(-145, Math.min(145, Number(p.x) || 0)),
        y: Math.max(-110, Math.min(65, Number(p.y) || 0))
      };
    } catch (e) {
      return null;
    }
  }

  function renderBorderOverlay(u, isMini) {
    if (!u) return '';
    var bItem = u.equippedBorderId ? findItem(u.equippedBorderId) : null;
    var borderUrl = u.equippedBorderUrl || (bItem && (bItem.imageUrl || bItem.image_url)) || '';
    var adj = (u.id && u.equippedBorderId) ? getSavedBorderData(u.id, u.equippedBorderId) : null;

    if (borderUrl) {
      var resolvedUrl = esc(API.assetUrl(borderUrl));
      var ratio = isMini ? (42 / 92) : 1;
      var tx = adj ? (adj.x * ratio).toFixed(2) : '0';
      var ty = adj ? (adj.y * ratio).toFixed(2) : '0';
      var sc = adj ? (adj.scale * 1.24).toFixed(3) : '1.24';
      var hasCustom = adj && (adj.scale !== 1 || adj.x !== 0 || adj.y !== 0);

      var styleStr = isMini
        ? 'position:absolute;inset:0;width:42px;height:42px;transform:translate(' + tx + 'px,' + ty + 'px) scale(' + sc + ');pointer-events:none;z-index:6;object-fit:contain'
        : (hasCustom ? 'transform:translate(' + tx + 'px,' + ty + 'px) scale(' + sc + ');animation:none' : '');

      if (isVideoAsset(borderUrl)) {
        return '<video class="dc-border" src="' + resolvedUrl + '" autoplay loop muted playsinline' +
          (styleStr ? ' style="' + styleStr + '"' : '') + '></video>';
      }
      return '<img class="dc-border" src="' + resolvedUrl + '"' +
        (styleStr ? ' style="' + styleStr + '"' : '') + ' alt="">';
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
      var found = findItem(gid);
      if (found) return found;
      if (Array.isArray(u.pinnedGiftItems)) {
        for (var k = 0; k < u.pinnedGiftItems.length; k++) {
          if (String(u.pinnedGiftItems[k].id) === String(gid)) return u.pinnedGiftItems[k];
        }
      }
      return null;
    }).filter(Boolean);

    if (!items.length) return '';

    var defaultSlots = [
      { x: -74,  y: -52, rot: -10, dur: '3.2s', delay: '0s' },
      { x:  74,  y: -52, rot:  10, dur: '3.6s', delay: '-1.1s' },
      { x: -116, y: -12, rot: -14, dur: '4.0s', delay: '-2.0s' },
      { x:  116, y: -12, rot:  14, dur: '3.4s', delay: '-0.6s' },
      { x: -86,  y:  28, rot:  -8, dur: '3.8s', delay: '-1.7s' },
      { x:  86,  y:  28, rot:   8, dur: '3.5s', delay: '-2.4s' }
    ];

    return items.map(function (giftItem, idx) {
      var base = defaultSlots[idx] || { x: 0, y: -78, rot: 0, dur: '3.5s', delay: '0s' };
      var custom = u.id ? getSavedGiftData(u.id, giftItem.id) : null;
      var posX = custom ? custom.x : base.x;
      var posY = custom ? custom.y : base.y;
      var gScale = custom ? custom.scale : 1;
      var visualSize = Math.round(28 * gScale);

      return (
        '<div class="av-gift-pin" data-gift-id="' + esc(giftItem.id) + '" title="' + esc(giftItem.name) + '" ' +
             'style="position:absolute;left:50%;top:50%;' +
             'transform:translate(calc(-50% + ' + posX + 'px),calc(-50% + ' + posY + 'px));' +
             'z-index:7;pointer-events:none">' +
          '<div class="gift-live-bob" style="--rot:' + base.rot + 'deg;animation-duration:' + base.dur + ';animation-delay:' + base.delay + '">' +
            renderItemVisual(giftItem, visualSize, false) +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  function renderAvatar(u, mode) {
    if (!u) return '';
    var isMini = mode === 'mini';
    var initial = esc((u.name || '?')[0].toUpperCase());
    var photoSrc = u.photoUrl || u.avatar || '';

    if (isMini) {
      var miniPhoto = photoSrc
        ? '<img class="pfp" src="' + esc(API.assetUrl(photoSrc)) + '" alt="" style="width:42px;height:42px;max-width:42px;max-height:42px;border-radius:50%;object-fit:cover;display:block" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'">'
        : '';
      var miniFallback = '<span style="width:42px;height:42px;border-radius:50%;place-items:center;background:linear-gradient(135deg,#176BFF,#0b2a6e);font-weight:700;font-size:16px;' + (photoSrc ? 'display:none' : 'display:grid') + '">' + initial + '</span>';
      return '<div class="mini-av" style="position:relative;width:42px;height:42px;min-width:42px;flex:none;display:grid;place-items:center">' +
        miniPhoto + miniFallback + renderBorderOverlay(u, true) +
      '</div>';
    }

    var photo = photoSrc
      ? '<img class="pfp" src="' + esc(API.assetUrl(photoSrc)) + '" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'">'
      : '';
    var fallback = '<span style="' + (photoSrc ? 'display:none' : '') + '">' + initial + '</span>';
    var borderHtml = renderBorderOverlay(u, false);
    var pinHtml = renderOrbitGifts(u);
    var ringCls = 'r' + (Number(u.ringStyle) || 0);

    return '<div class="av-wrap" style="position:relative;width:92px;height:92px;margin:0 auto;z-index:4;display:grid;place-items:center;overflow:visible">' +
      '<div class="ring ' + ringCls + '" style="width:92px;height:92px;border-radius:50%">' + photo + fallback + '</div>' +
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
    getSavedBorderData: getSavedBorderData,
    getSavedGiftData: getSavedGiftData,
    renderItemVisual: renderItemVisual,
    renderAvatar: renderAvatar,
    bindDrag: bindDrag
  };
})();
