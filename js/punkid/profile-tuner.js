(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;
  window.PunkIDMod = window.PunkIDMod || {};

  function isVideoAsset(url) {
    return /\.(webm|mp4)(\?.*)?$/i.test(String(url || '').trim());
  }

  function getPinnedList(u) {
    if (!u) return [];
    if (Array.isArray(u.pinnedGifts)) return u.pinnedGifts;
    return u.pinnedGiftId ? [u.pinnedGiftId] : [];
  }

  function getBorderAdjKey(uid, borderId) {
    return 'punk_border_adj_' + String(uid) + '_' + String(borderId);
  }

  function loadBorderAdj(u, borderId) {
    var uid = u && u.id;
    if (u && u.borderAdj && typeof u.borderAdj === 'object' && u.borderAdj[borderId]) {
      var srv = u.borderAdj[borderId];
      return {
        scale: Math.max(0.6, Math.min(1.6, Number(srv.scale) || 1)),
        x: Math.max(-35, Math.min(35, Number(srv.x) || 0)),
        y: Math.max(-45, Math.min(45, Number(srv.y) || 0))
      };
    }
    try {
      var raw = localStorage.getItem(getBorderAdjKey(uid, borderId));
      if (raw) {
        var p = JSON.parse(raw);
        return {
          scale: Math.max(0.6, Math.min(1.6, Number(p.scale) || 1)),
          x: Math.max(-35, Math.min(35, Number(p.x) || 0)),
          y: Math.max(-45, Math.min(45, Number(p.y) || 0))
        };
      }
    } catch (e) {}
    return { scale: 1, x: 0, y: 0 };
  }

  function getGiftAdjKey(uid, giftId) {
    return 'punk_gift_adj_' + String(uid) + '_' + String(giftId);
  }

  function loadGiftAdj(u, giftId, slotIdx) {
    var uid = u && u.id;
    var defaultSlots = [
      { x: -74,  y: -52, rot: -10 },
      { x:  74,  y: -52, rot:  10 },
      { x: -116, y: -12, rot: -14 },
      { x:  116, y: -12, rot:  14 },
      { x: -86,  y:  28, rot:  -8 },
      { x:  86,  y:  28, rot:   8 }
    ];
    var fallback = defaultSlots[slotIdx] || { x: 0, y: -78, rot: 0 };

    if (u && u.giftAdj && typeof u.giftAdj === 'object' && u.giftAdj[giftId]) {
      var srv = u.giftAdj[giftId];
      var hasSrvRot = srv.rot !== undefined && srv.rot !== null && srv.rot !== '';
      var srvRot = hasSrvRot ? Number(srv.rot) : fallback.rot;
      if (isNaN(srvRot)) srvRot = fallback.rot;
      return {
        scale: Math.max(0.5, Math.min(2.2, Number(srv.scale) || 1)),
        x: Math.max(-145, Math.min(145, Number(srv.x) || 0)),
        y: Math.max(-110, Math.min(65, Number(srv.y) || 0)),
        rot: Math.max(-45, Math.min(45, Math.round(srvRot)))
      };
    }
    try {
      var raw = localStorage.getItem(getGiftAdjKey(uid, giftId));
      if (raw) {
        var p = JSON.parse(raw);
        var hasLocRot = p.rot !== undefined && p.rot !== null && p.rot !== '';
        var locRot = hasLocRot ? Number(p.rot) : fallback.rot;
        if (isNaN(locRot)) locRot = fallback.rot;
        return {
          scale: Math.max(0.5, Math.min(2.2, Number(p.scale) || 1)),
          x: Math.max(-145, Math.min(145, Number(p.x) || 0)),
          y: Math.max(-110, Math.min(65, Number(p.y) || 0)),
          rot: Math.max(-45, Math.min(45, Math.round(locRot)))
        };
      }
    } catch (e) {}
    return { scale: 1, x: fallback.x, y: fallback.y, rot: fallback.rot };
  }

  function openBorderTuneSheet(borderId) {
    var u = S.user || {};
    var bItem = C.findItem(borderId);
    if (!bItem) return;

    var cur = loadBorderAdj(u, bItem.id);
    var photoSrc = u.photoUrl ? API.assetUrl(u.photoUrl) : '';
    var rawBorderUrl = bItem.imageUrl || bItem.image_url || '';
    var borderSrc = rawBorderUrl ? API.assetUrl(rawBorderUrl) : '';
    var initTransform = 'translate(' + cur.x + 'px,' + cur.y + 'px) scale(' + (cur.scale * 1.24).toFixed(3) + ')';

    var overlayHtml = '';
    if (borderSrc) {
      overlayHtml = isVideoAsset(rawBorderUrl)
        ? '<video id="bt-prev-img" src="' + C.esc(borderSrc) + '" autoplay loop muted playsinline style="position:absolute;inset:0;width:92px;height:92px;object-fit:contain;pointer-events:none;z-index:6;transform:' + initTransform + '"></video>'
        : '<img id="bt-prev-img" src="' + C.esc(borderSrc) + '" style="position:absolute;inset:0;width:92px;height:92px;object-fit:contain;pointer-events:none;z-index:6;transform:' + initTransform + '">';
    } else {
      overlayHtml = '<div id="bt-prev-img" style="position:absolute;inset:-4px;border-radius:50%;border:3px solid #38bdf8;pointer-events:none;z-index:6;transform:translate(' + cur.x + 'px,' + cur.y + 'px) scale(' + cur.scale + ')"></div>';
    }

    C.sheet(
      '<h2>🎯 Atur Posisi & Ukuran Border</h2>' +
      '<p class="sub">Pratinjau skala asli <b>92px</b> (tersimpan ke server & tampil di semua warga).</p>' +

      '<div style="display:grid;place-items:center;padding:28px 0;background:radial-gradient(circle,rgba(56,189,248,.14),rgba(15,23,42,.92));border:1px solid rgba(255,255,255,.12);border-radius:16px;margin:10px 0">' +
        '<div style="position:relative;width:92px;height:92px">' +
          '<div style="width:92px;height:92px;border-radius:50%;overflow:hidden;border:2.5px dashed rgba(92,225,255,.75);background:#1e293b;display:grid;place-items:center">' +
            (photoSrc ? '<img src="' + C.esc(photoSrc) + '" style="width:100%;height:100%;object-fit:cover">' : '<b style="font-size:28px">' + C.esc((u.name || '?')[0].toUpperCase()) + '</b>') +
          '</div>' +
          overlayHtml +
        '</div>' +
      '</div>' +

      '<label>UKURAN / SKALA (<span id="bt-val-s">' + Math.round(cur.scale * 100) + '%</span>)</label>' +
      '<input id="bt-scale" type="range" min="60" max="160" value="' + Math.round(cur.scale * 100) + '">' +

      '<label>GESER KIRI / KANAN (<span id="bt-val-x">' + cur.x + 'px</span>)</label>' +
      '<input id="bt-x" type="range" min="-35" max="35" value="' + cur.x + '">' +

      '<label>GESER ATAS / BAWAH (<span id="bt-val-y">' + cur.y + 'px</span>)</label>' +
      '<input id="bt-y" type="range" min="-45" max="45" value="' + cur.y + '">' +

      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">' +
        '<button type="button" class="btn b2" id="bt-reset">↺ Reset Tengah</button>' +
        '<button type="button" class="btn" id="bt-save">💾 Simpan Posisi</button>' +
      '</div>'
    );

    var elS = document.getElementById('bt-scale');
    var elX = document.getElementById('bt-x');
    var elY = document.getElementById('bt-y');
    var prev = document.getElementById('bt-prev-img');

    function syncPreview() {
      var sc = (Number(elS.value) || 100) / 100;
      var px = Number(elX.value) || 0;
      var py = Number(elY.value) || 0;
      document.getElementById('bt-val-s').textContent = Math.round(sc * 100) + '%';
      document.getElementById('bt-val-x').textContent = px + 'px';
      document.getElementById('bt-val-y').textContent = py + 'px';
      if (prev) {
        var mult = borderSrc ? 1.24 : 1;
        prev.style.transform = 'translate(' + px + 'px,' + py + 'px) scale(' + (sc * mult).toFixed(3) + ')';
      }
    }

    elS.oninput = syncPreview;
    elX.oninput = syncPreview;
    elY.oninput = syncPreview;

    document.getElementById('bt-reset').onclick = function () {
      elS.value = '100';
      elX.value = '0';
      elY.value = '0';
      syncPreview();
    };

    document.getElementById('bt-save').onclick = async function () {
      var btnSave = document.getElementById('bt-save');
      btnSave.disabled = true;
      btnSave.textContent = 'Menyimpan...';

      var payload = {
        scale: (Number(elS.value) || 100) / 100,
        x: Number(elX.value) || 0,
        y: Number(elY.value) || 0
      };
      try {
        localStorage.setItem(getBorderAdjKey(u.id, bItem.id), JSON.stringify(payload));
      } catch (e) {}

      var nextBorderMap = Object.assign({}, (u.borderAdj && typeof u.borderAdj === 'object') ? u.borderAdj : {});
      nextBorderMap[bItem.id] = payload;

      try {
        var res = await API.post('/api/profile/tuner', { borderAdj: nextBorderMap });
        if (res && res.user) S.user = res.user;
      } catch (err) {
        if (S.user) S.user.borderAdj = nextBorderMap;
      }

      C.shut();
      C.refresh();
      C.notify('Mas Raka', 'Posisi Border Tersimpan 🎯', 'Ukuran & posisi ' + bItem.name + ' udah sinkron ke seluruh profil warga!');
    };
  }

  function openGiftTuneSheet(initialGiftId) {
    var u = S.user || {};
    var pinnedIds = getPinnedList(u).slice(0, 6);
    var giftItems = pinnedIds.map(function (gid, idx) {
      var found = C.findItem(gid);
      return found ? { item: found, slotIdx: idx } : null;
    }).filter(Boolean);

    if (!giftItems.length) return;

    var activeIdx = 0;
    if (initialGiftId) {
      for (var i = 0; i < giftItems.length; i++) {
        if (String(giftItems[i].item.id) === String(initialGiftId)) {
          activeIdx = i;
          break;
        }
      }
    }

    var stateMap = {};
    giftItems.forEach(function (g) {
      stateMap[g.item.id] = loadGiftAdj(u, g.item.id, g.slotIdx);
    });

    var bannerStyle = u.bannerUrl
      ? 'background-image:url(\'' + C.esc(API.assetUrl(u.bannerUrl)) + '\');background-size:cover;background-position:center'
      : 'background:radial-gradient(circle at 25% 20%,#8FC7FF,transparent 55%),linear-gradient(135deg,#176BFF,#0b2a6e)';

    var photoSrc = u.photoUrl ? API.assetUrl(u.photoUrl) : '';
    var selectorPills = giftItems.map(function (g, idx) {
      return '<button type="button" class="chip' + (idx === activeIdx ? ' on' : '') + '" data-gt-idx="' + idx + '">' +
        C.esc(g.item.name) +
      '</button>';
    }).join('');

    var pinsPreviewHtml = giftItems.map(function (g, idx) {
      var st = stateMap[g.item.id];
      var sz = Math.round(28 * st.scale);
      var isSelected = idx === activeIdx;
      return (
        '<div class="gt-pin-node" data-gt-node="' + idx + '" ' +
             'style="position:absolute;left:50%;top:50%;' +
             'transform:translate(calc(-50% + ' + st.x + 'px),calc(-50% + ' + st.y + 'px)) rotate(' + st.rot + 'deg);' +
             'z-index:' + (isSelected ? '9' : '7') + ';cursor:grab;touch-action:none;' +
             'outline:' + (isSelected ? '1.5px dashed #38BDF8' : 'none') + ';border-radius:8px;padding:4px">' +
          C.renderItemVisual(g.item, sz, false) +
        '</div>'
      );
    }).join('');

    var activeData = stateMap[giftItems[activeIdx].item.id];

    C.sheet(
      '<h2>🎁 Atur Posisi, Ukuran & Kemiringan Gift</h2>' +
      '<p class="sub">Geser langsung gift di pratinjau atau atur ukuran & kemiringannya di bawah.</p>' +

      '<div class="chips" id="gt-pills" style="margin-bottom:10px">' + selectorPills + '</div>' +

      '<div id="gt-canvas" style="border-radius:18px;overflow:visible;border:1px solid rgba(255,255,255,.15);background:#0f1626;padding-bottom:46px;margin-bottom:10px;user-select:none">' +
        '<div style="height:150px;border-radius:18px 18px 0 0;position:relative;' + bannerStyle + '">' +
          '<div style="position:absolute;inset:0;border-radius:18px 18px 0 0;background:linear-gradient(180deg,rgba(11,17,30,.05) 0%,rgba(15,22,38,.85) 85%,#0f1626 100%)"></div>' +
        '</div>' +
        '<div style="display:flex;justify-content:center;margin-top:-50px;position:relative;z-index:5">' +
          '<div style="position:relative;width:92px;height:92px">' +
            '<div style="width:92px;height:92px;border-radius:50%;overflow:hidden;border:3px solid #0f1626;box-shadow:0 6px 18px rgba(0,0,0,.5);background:#1e293b;display:grid;place-items:center">' +
              (photoSrc ? '<img src="' + C.esc(photoSrc) + '" style="width:100%;height:100%;object-fit:cover">' : '<b style="font-size:28px">' + C.esc((u.name || '?')[0].toUpperCase()) + '</b>') +
            '</div>' +
            pinsPreviewHtml +
          '</div>' +
        '</div>' +
      '</div>' +

      '<label>UKURAN GIFT (<span id="gt-val-s">' + Math.round(activeData.scale * 100) + '%</span>)</label>' +
      '<input id="gt-scale" type="range" min="50" max="220" value="' + Math.round(activeData.scale * 100) + '">' +

      '<label>KEMIRINGAN / ROTASI (<span id="gt-val-r">' + activeData.rot + '°</span>)</label>' +
      '<input id="gt-rot" type="range" min="-45" max="45" value="' + activeData.rot + '">' +

      '<label>GESER KIRI / KANAN (<span id="gt-val-x">' + activeData.x + 'px</span>)</label>' +
      '<input id="gt-x" type="range" min="-145" max="145" value="' + activeData.x + '">' +

      '<label>GESER ATAS / BAWAH (<span id="gt-val-y">' + activeData.y + 'px</span>)</label>' +
      '<input id="gt-y" type="range" min="-110" max="65" value="' + activeData.y + '">' +

      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">' +
        '<button type="button" class="btn b2" id="gt-reset">↺ Reset Semua</button>' +
        '<button type="button" class="btn" id="gt-save">💾 Simpan Layout</button>' +
      '</div>'
    );

    var elS = document.getElementById('gt-scale');
    var elR = document.getElementById('gt-rot');
    var elX = document.getElementById('gt-x');
    var elY = document.getElementById('gt-y');

    function refreshNodes() {
      giftItems.forEach(function (g, idx) {
        var st = stateMap[g.item.id];
        var node = document.querySelector('[data-gt-node="' + idx + '"]');
        if (!node) return;
        var isSel = idx === activeIdx;
        node.style.transform = 'translate(calc(-50% + ' + st.x + 'px),calc(-50% + ' + st.y + 'px)) rotate(' + st.rot + 'deg)';
        node.style.zIndex = isSel ? '9' : '7';
        node.style.outline = isSel ? '1.5px dashed #38BDF8' : 'none';
        var g3 = node.querySelector('.g3');
        if (g3) g3.style.setProperty('--s', Math.round(28 * st.scale) + 'px');
      });
    }

    function loadSlidersForActive() {
      var g = giftItems[activeIdx];
      var st = stateMap[g.item.id];
      elS.value = String(Math.round(st.scale * 100));
      elR.value = String(st.rot);
      elX.value = String(st.x);
      elY.value = String(st.y);
      document.getElementById('gt-val-s').textContent = Math.round(st.scale * 100) + '%';
      document.getElementById('gt-val-r').textContent = st.rot + '°';
      document.getElementById('gt-val-x').textContent = st.x + 'px';
      document.getElementById('gt-val-y').textContent = st.y + 'px';
      refreshNodes();
    }

    function onSliderInput() {
      var g = giftItems[activeIdx];
      var st = stateMap[g.item.id];
      st.scale = (Number(elS.value) || 100) / 100;
      st.rot = Math.max(-45, Math.min(45, Number(elR.value) || 0));
      st.x = Number(elX.value) || 0;
      st.y = Number(elY.value) || 0;
      document.getElementById('gt-val-s').textContent = Math.round(st.scale * 100) + '%';
      document.getElementById('gt-val-r').textContent = st.rot + '°';
      document.getElementById('gt-val-x').textContent = st.x + 'px';
      document.getElementById('gt-val-y').textContent = st.y + 'px';
      refreshNodes();
    }

    elS.oninput = onSliderInput;
    elR.oninput = onSliderInput;
    elX.oninput = onSliderInput;
    elY.oninput = onSliderInput;

    // Direct Touch / Pointer Drag di pratinjau gift
    var dragState = null;
    document.querySelectorAll('.gt-pin-node').forEach(function (node) {
      node.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        var idx = Number(node.getAttribute('data-gt-node')) || 0;
        activeIdx = idx;
        document.querySelectorAll('#gt-pills [data-gt-idx]').forEach(function (b) {
          b.classList.toggle('on', Number(b.getAttribute('data-gt-idx')) === idx);
        });
        loadSlidersForActive();
        var g = giftItems[activeIdx];
        var st = stateMap[g.item.id];
        dragState = { startX: ev.clientX, startY: ev.clientY, origX: st.x, origY: st.y };
        node.setPointerCapture(ev.pointerId);
      });

      node.addEventListener('pointermove', function (ev) {
        if (!dragState) return;
        var g = giftItems[activeIdx];
        var st = stateMap[g.item.id];
        st.x = Math.max(-145, Math.min(145, Math.round(dragState.origX + (ev.clientX - dragState.startX))));
        st.y = Math.max(-110, Math.min(65, Math.round(dragState.origY + (ev.clientY - dragState.startY))));
        elX.value = String(st.x);
        elY.value = String(st.y);
        document.getElementById('gt-val-x').textContent = st.x + 'px';
        document.getElementById('gt-val-y').textContent = st.y + 'px';
        refreshNodes();
      });

      node.addEventListener('pointerup', function () {
        dragState = null;
      });
    });

    document.querySelectorAll('#gt-pills [data-gt-idx]').forEach(function (btn) {
      btn.onclick = function () {
        document.querySelectorAll('#gt-pills [data-gt-idx]').forEach(function (b) { b.classList.remove('on'); });
        btn.classList.add('on');
        activeIdx = Number(btn.getAttribute('data-gt-idx')) || 0;
        loadSlidersForActive();
      };
    });

    document.getElementById('gt-reset').onclick = function () {
      var emptyU = Object.assign({}, u, { giftAdj: null });
      giftItems.forEach(function (g) {
        try { localStorage.removeItem(getGiftAdjKey(u.id, g.item.id)); } catch (e) {}
        stateMap[g.item.id] = loadGiftAdj(emptyU, g.item.id, g.slotIdx);
      });
      loadSlidersForActive();
    };

    document.getElementById('gt-save').onclick = async function () {
      var btnSave = document.getElementById('gt-save');
      btnSave.disabled = true;
      btnSave.textContent = 'Menyimpan...';

      var nextGiftMap = Object.assign({}, (u.giftAdj && typeof u.giftAdj === 'object') ? u.giftAdj : {});
      giftItems.forEach(function (g) {
        var st = stateMap[g.item.id];
        nextGiftMap[g.item.id] = st;
        try {
          localStorage.setItem(getGiftAdjKey(u.id, g.item.id), JSON.stringify(st));
        } catch (e) {}
      });

      try {
        var res = await API.post('/api/profile/tuner', { giftAdj: nextGiftMap });
        if (res && res.user) S.user = res.user;
      } catch (err) {
        if (S.user) S.user.giftAdj = nextGiftMap;
      }

      C.shut();
      C.refresh();
      C.notify('Mas Raka', 'Layout Gift Tersimpan 🎁', 'Ukuran, kemiringan & posisi gift udah sinkron ke seluruh profil warga!');
    };
  }

  window.PunkIDMod.getPinnedList = getPinnedList;
  window.PunkIDMod.openBorderTuneSheet = openBorderTuneSheet;
  window.PunkIDMod.openGiftTuneSheet = openGiftTuneSheet;
})();
