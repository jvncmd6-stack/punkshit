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
    return null;
  }

  function getBorderAdjust(u) {
    var uid = u && u.id ? String(u.id) : '';
    var bid = u && u.equippedBorderId ? String(u.equippedBorderId) : '';
    if (!uid || !bid) return { scale: 1, x: 0, y: 0 };
    try {
      var raw = localStorage.getItem('punk_border_adj_' + uid + '_' + bid);
      if (raw) {
        var parsed = JSON.parse(raw);
        return {
          scale: Math.max(0.6, Math.min(1.6, Number(parsed.scale) || 1)),
          x: Math.max(-35, Math.min(35, Number(parsed.x) || 0)),
          y: Math.max(-45, Math.min(45, Number(parsed.y) || 0))
        };
      }
    } catch (e) {}
    return { scale: 1, x: 0, y: 0 };
  }

  function ensureOrbitStyles() {
    if (document.getElementById('punk-orbit-gift-css')) return;
    var st = document.createElement('style');
    st.id = 'punk-orbit-gift-css';
    st.textContent =
      '@keyframes punkGiftOrbitSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}' +
      '@keyframes punkGiftCounterSpin{from{transform:rotate(0deg)}to{transform:rotate(-360deg)}}' +
      '.av-orbit-stage{position:absolute;left:50%;top:50%;width:154px;height:154px;margin-left:-77px;margin-top:-77px;z-index:1;pointer-events:none;animation:punkGiftOrbitSpin 22s linear infinite}' +
      '.av-orbit-arm{position:absolute;left:50%;top:50%;width:0;height:0}' +
      '.av-orbit-node{position:absolute;left:0;top:0;transform:translate(-50%,-50%)}' +
      '.av-orbit-upright{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:radial-gradient(circle at 30% 30%,rgba(30,41,59,.92),rgba(15,23,42,.82));border:1px solid rgba(255,255,255,.18);box-shadow:0 4px 12px rgba(0,0,0,.45),0 0 10px rgba(143,199,255,.22);animation:punkGiftCounterSpin 22s linear infinite}' +
      '.av-wrap .ring{position:relative;z-index:3}' +
      '.av-wrap .dc-border,.av-wrap .dc-border-fx{z-index:4;pointer-events:none}';
    document.head.appendChild(st);
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

  function renderBorderOverlay(u, mode) {
    if (!u) return '';
    var adj = getBorderAdjust(u);
    var isMini = mode === 'mini';
    var tx = isMini ? Math.round(adj.x * 0.42) : adj.x;
    var ty = isMini ? Math.round(adj.y * 0.42) : adj.y;
    var transformStyle = 'transform:translate(' + tx + 'px,' + ty + 'px) scale(' + adj.scale + ');transform-origin:center center;';

    if (u.equippedBorderUrl) {
      return '<img class="dc-border" src="' + esc(API.assetUrl(u.equippedBorderUrl)) + '" alt="" style="' + transformStyle + '">';
    }
    if (u.equippedBorderId) {
      var bItem = findItem(u.equippedBorderId);
      if (bItem) {
        if (bItem.imageUrl || bItem.image_url) {
          return '<img class="dc-border" src="' + esc(API.assetUrl(bItem.imageUrl || bItem.image_url)) + '" alt="" style="' + transformStyle + '">';
        }
        var cols = bItem.colors || ['#8FC7FF', '#176BFF'];
        return '<div class="dc-border-fx ' + esc(bItem.skinClass || '') + '" style="--bc1:' + esc(cols[0]) + ';--bc2:' + esc(cols[1]) + ';' + transformStyle + '"></div>';
      }
    }
    return '';
  }

  function getOrbitGiftItems(u) {
    var rawIds = Array.isArray(u.pinnedGifts) && u.pinnedGifts.length
      ? u.pinnedGifts.slice()
      : (u.pinnedGiftId ? [u.pinnedGiftId] : []);

    // Jika milik user sendiri dan punya koleksi gift lain, ikutkan sampai maksimal 8 gift di orbit
    if (S.user && String(u.id) === String(S.user.id) && Array.isArray(S.inv)) {
      S.inv.forEach(function (entry) {
        var gid = entry && (entry.itemId || entry.id);
        var it = findItem(gid);
        if (it && it.type === 'gift' && rawIds.indexOf(it.id) === -1 && rawIds.length < 8) {
          rawIds.push(it.id);
        }
      });
    }

    return rawIds.map(findItem).filter(Boolean).slice(0, 8);
  }

  function renderOrbitingGifts(u) {
    var items = getOrbitGiftItems(u);
    if (!items.length) return '';
    ensureOrbitStyles();

    var count = items.length;
    // Radius 72px dari pusat avatar (avatar radius ~44px, border ~52px) -> aman & tidak pernah tabrakan
    var radius = 72;
    var nodes = items.map(function (it, idx) {
      var deg = Math.round((360 / count) * idx);
      return (
        '<div class="av-orbit-arm" style="transform:rotate(' + deg + 'deg) translate(' + radius + 'px) rotate(-' + deg + 'deg)">' +
          '<div class="av-orbit-node" title="' + esc(it.name) + '">' +
            '<div class="av-orbit-upright">' +
              renderItemVisual(it, 20, false) +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    return '<div class="av-orbit-stage" aria-hidden="true">' + nodes + '</div>';
  }

  function renderAvatar(u, mode) {
    if (!u) return '';
    var initial = esc((u.name || '?')[0].toUpperCase());
    var photoSrc = u.photoUrl || u.avatar || '';
    var photo = photoSrc
      ? '<img class="pfp" src="' + esc(API.assetUrl(photoSrc)) + '" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'">'
      : '';
    var fallback = '<span style="' + (photoSrc ? 'display:none' : '') + '">' + initial + '</span>';
    var borderHtml = renderBorderOverlay(u, mode);

    if (mode === 'mini') {
      return '<div class="mini-av">' + photo + fallback + borderHtml + '</div>';
    }

    var orbitHtml = renderOrbitingGifts(u);
    var ringCls = 'r' + (Number(u.ringStyle) || 0);
    return '<div class="av-wrap" style="position:relative;overflow:visible">' +
      orbitHtml +
      '<div class="ring ' + ringCls + '">' + photo + fallback + '</div>' +
      borderHtml +
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
