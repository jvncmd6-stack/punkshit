(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;

  window.PunkLapak = window.PunkLapak || {};
  window.PunkLapak.pendingShopFile = null;
  window.PunkLapak.pendingCollabFile = null;
  window.PunkLapak.pendingCollabUrl = '';

  function bindMediaPicker(dropId, fileId, labelId, prevId, stateKey, onLoaded) {
    var drop = document.getElementById(dropId);
    var inp = document.getElementById(fileId);
    var lbl = document.getElementById(labelId);
    var prevBox = document.getElementById(prevId);
    if (!drop || !inp) return;

    drop.onclick = function () { inp.click(); };
    inp.onchange = function () {
      var file = inp.files && inp.files[0];
      if (!file) return;
      window.PunkLapak[stateKey] = file;
      lbl.innerHTML = '✅ File siap: <b>' + C.esc(file.name) + '</b>';
      lbl.style.color = '#34C759';

      var url = URL.createObjectURL(file);
      if (stateKey === 'pendingCollabFile') {
        window.PunkLapak.pendingCollabUrl = url;
      }

      if (prevBox) {
        prevBox.style.display = 'block';
        if (/\.webm$/i.test(file.name) || file.type === 'video/webm') {
          prevBox.innerHTML = '<video src="' + url + '" autoplay loop muted playsinline style="max-height:130px;border-radius:10px"></video>';
        } else {
          prevBox.innerHTML = '<img src="' + url + '" style="max-height:130px;border-radius:10px">';
        }
      }

      if (typeof onLoaded === 'function') {
        onLoaded(file, url);
      }
    };
  }

  function openNewShopItemSheet() {
    window.PunkLapak.pendingShopFile = null;
    C.sheet(
      '<h2>🛍️ Pajang Produk ke Etalase</h2>' +
      '<p class="sub">Upload foto barang, stiker, GIF, atau WebM biar tampil di etalase toko lo.</p>' +

      '<label>MEDIA PRODUK (GAMBAR / STIKER / GIF / WEBM)</label>' +
      '<div class="up-box" id="lw-drop">' +
        '<input type="file" id="lw-file" accept="image/*,video/webm,.gif,.webm" hidden>' +
        '<div id="lw-file-label" style="font-size:13px;font-weight:600;color:var(--gblue)">📁 Tap Pilih File (JPG / PNG / GIF / WEBM)</div>' +
        '<small style="color:var(--mut);font-size:11px">Maksimal ukuran file 10MB</small>' +
      '</div>' +
      '<div id="lw-prev-box" style="display:none;margin:8px 0;text-align:center"></div>' +

      '<label>NAMA PRODUK / JASA</label>' +
      '<input id="lw-title" maxlength="60" placeholder="mis. Stiker Pack / Akun / Jasa Desain">' +

      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
        '<div><label>HARGA (PSC)</label><input id="lw-price" type="number" min="1" value="50"></div>' +
        '<div><label>STOK (-1 = UNLIMITED)</label><input id="lw-stock" type="number" min="-1" max="999" value="1"></div>' +
      '</div>' +

      '<label>KATEGORI</label>' +
      '<select id="lw-cat">' +
        '<option value="Barang">Barang</option>' +
        '<option value="Stiker / GIF">Stiker / GIF</option>' +
        '<option value="WebM / Video">WebM / Video</option>' +
        '<option value="Jasa">Jasa</option>' +
      '</select>' +

      '<label>DESKRIPSI PRODUK</label>' +
      '<textarea id="lw-desc" rows="2" maxlength="200" placeholder="Jelasin detail barang atau cara transaksi..."></textarea>' +

      '<button class="btn" data-act="lw-save">PAJANG DI ETALASE SEKARANG</button>'
    );

    bindMediaPicker('lw-drop', 'lw-file', 'lw-file-label', 'lw-prev-box', 'pendingShopFile');
  }

  function openShopItemDetail(m) {
    if (!m) return;
    var u = S.user || {};
    var stockNum = (m.stock == null) ? 1 : Number(m.stock);
    var isSold = m.status === 'sold' || stockNum === 0;
    var isMine = String(m.seller_id) === String(u.id);
    var myPsc = Number(u.psc) || 0;
    var price = Number(m.price) || 0;
    var enough = myPsc >= price;

    var mediaUrl = m.image_url || m.imageUrl || '';
    var fullSrc = mediaUrl ? C.esc(API.assetUrl(mediaUrl)) : '';
    var mediaHtml = '';
    if (fullSrc) {
      mediaHtml = /\.webm$/i.test(mediaUrl)
        ? '<video src="' + fullSrc + '" autoplay loop muted playsinline style="width:100%;max-height:190px;object-fit:contain;border-radius:12px;background:#080B12;margin-bottom:10px"></video>'
        : '<img src="' + fullSrc + '" style="width:100%;max-height:190px;object-fit:contain;border-radius:12px;background:#080B12;margin-bottom:10px">';
    }

    var actionSection = '';
    if (isMine) {
      actionSection =
        '<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);padding:10px;border-radius:12px;margin-top:8px">' +
          '<b style="font-size:12px;color:#FFD633;display:block;margin-bottom:6px">✏️ KELOLA & RESTOCK DAGANGAN</b>' +
          '<label>NAMA PRODUK</label>' +
          '<input id="lw-ed-title" maxlength="60" value="' + C.esc(m.title) + '">' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
            '<div><label>HARGA (PSC)</label><input id="lw-ed-price" type="number" min="1" value="' + price + '"></div>' +
            '<div><label>STOK (-1 = UNLIMITED)</label><input id="lw-ed-stock" type="number" min="-1" max="999" value="' + stockNum + '"></div>' +
          '</div>' +
          '<label>DESKRIPSI</label>' +
          '<textarea id="lw-ed-desc" rows="2" maxlength="200">' + C.esc(m.description || '') + '</textarea>' +
          '<button class="btn" data-act="lw-edit-save" data-id="' + C.esc(m.id) + '">💾 SIMPAN PERUBAHAN / RESTOCK</button>' +
          '<button class="btn b2" style="color:#FFD633" data-act="lw-boost" data-id="' + C.esc(m.id) + '">⚡ SUNDUL KE ATAS ETALASE (15 PSC)</button>' +
          '<button class="btn b2" style="color:#FCA5A5" data-act="lw-delete" data-id="' + C.esc(m.id) + '">🗑️ HAPUS DARI ETALASE</button>' +
        '</div>';
    } else if (isSold) {
      actionSection =
        '<button class="btn b2" disabled style="opacity:.65">STOK HABIS / TERJUAL</button>' +
        '<button class="btn b2" data-act="shut">TUTUP DETAIL</button>';
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
        '<div><b style="font-size:13px">🏪 Toko ' + C.esc(m.seller_name || 'Warga') + '</b><small style="display:block;font-size:11px">Stok: ' + (stockNum < 0 ? 'Unlimited' : stockNum) + ' · Terjual: ' + (m.sold_count || 0) + 'x</small></div>' +
        '<span class="pill">' + C.esc(m.category || 'Etalase') + '</span>' +
      '</div>' +
      '<h2>' + C.esc(m.title) + '</h2>' +
      '<div style="color:#FFD633;font-size:18px;font-weight:800;margin:4px 0">' + price + ' PSC</div>' +
      '<p class="sub">' + C.esc(m.description || 'Tidak ada deskripsi tambahan.') + '</p>' +
      actionSection
    );
  }

  function openCollabSubmitSheet() {
    window.PunkLapak.pendingCollabFile = null;
    window.PunkLapak.pendingCollabUrl = '';
    var u = S.user || {};
    var photoSrc = u.photoUrl ? API.assetUrl(u.photoUrl) : '';
    var initial = C.esc((u.name || '?')[0].toUpperCase());

    C.sheet(
      '<h2>🎨 Ajukan Item Collab</h2>' +
      '<p class="sub">Bisa solo atau tim (<b>maks. 3 orang</b>). Kalau di-ACC admin, semua kreator dapat item gratis & <b>royalti 20% PSC</b> dibagi rata tiap laku!</p>' +

      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
        '<div><label>TIPE ITEM PROFIL</label><select id="col-type"><option value="border">🖼️ Avatar Border</option><option value="skin">🪪 Card Skin</option><option value="gift">🎁 Gift Pin</option></select></div>' +
        '<div><label>AJUAN HARGA (PSC)</label><input id="col-price" type="number" min="50" max="5000" value="150"></div>' +
      '</div>' +

      '<div style="background:rgba(56,189,248,.07);border:1px solid rgba(56,189,248,.22);padding:10px;border-radius:12px;margin-top:8px">' +
        '<b style="font-size:11.5px;color:#7DD3FC;display:block;margin-bottom:4px">🤝 PARTNER COLLAB (OPSIONAL · MAKS. 2 PARTNER)</b>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
          '<input id="col-partner-1" maxlength="32" placeholder="Partner 2 (@username / ID)">' +
          '<input id="col-partner-2" maxlength="32" placeholder="Partner 3 (@username / ID)">' +
        '</div>' +
        '<small id="col-split-info" style="display:block;font-size:10.5px;color:#cbd5e1;margin-top:4px">Solo Creator: Royalti 20% utuh untuk kamu.</small>' +
      '</div>' +

      '<label>FILE DESAIN (PNG TRANSPARAN / GIF / WEBM)</label>' +
      '<div class="up-box" id="col-drop">' +
        '<input type="file" id="col-file" accept="image/png,image/webp,image/gif,video/webm,.png,.gif,.webm" hidden>' +
        '<div id="col-file-label" style="font-size:13px;font-weight:600;color:var(--gblue)">📁 Tap Upload Desain Karya Lo</div>' +
        '<small style="color:var(--mut);font-size:11px">Disarankan PNG transparan / WebM rasio 1:1</small>' +
      '</div>' +

      '<div id="col-stage-wrap" style="margin:10px 0;padding:14px 12px;border-radius:16px;background:radial-gradient(circle,rgba(56,189,248,.14),rgba(15,23,42,.95));border:1px solid rgba(255,255,255,.12)">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
          '<b style="font-size:11.5px;color:#7DD3FC" id="col-stage-title">🎯 PRATINJAU LINGKARAN ACUAN AVATAR</b>' +
          '<button type="button" class="pill" id="col-adj-reset" style="font-size:10px;padding:3px 8px">↺ Reset</button>' +
        '</div>' +

        '<div id="col-stage-canvas" style="display:grid;place-items:center;min-height:148px;position:relative;overflow:hidden">' +
          '<div id="col-avatar-guide" style="position:relative;width:104px;height:104px">' +
            '<div style="width:104px;height:104px;border-radius:50%;overflow:hidden;border:2.5px dashed rgba(92,225,255,.85);box-shadow:0 0 0 4px rgba(92,225,255,.12);background:#1e293b;display:grid;place-items:center">' +
              (photoSrc
                ? '<img src="' + C.esc(photoSrc) + '" style="width:100%;height:100%;object-fit:cover;opacity:.88">'
                : '<b style="font-size:28px;color:#94a3b8">' + initial + '</b>') +
            '</div>' +
            '<div id="col-media-layer" style="position:absolute;inset:-14px;width:132px;height:132px;display:grid;place-items:center;pointer-events:none;transform:translate(0px,0px) scale(1)"></div>' +
          '</div>' +

          '<div id="col-card-guide" style="display:none;position:relative;width:248px;height:146px;border-radius:16px;overflow:hidden;border:2px dashed rgba(92,225,255,.85);background:#0f172a">' +
            '<div id="col-card-media-layer" style="position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;transform:translate(0px,0px) scale(1)"></div>' +
            '<div style="position:relative;z-index:2;padding:10px 12px;display:flex;flex-direction:column;justify-content:space-between;height:100%;background:linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,.55))">' +
              '<div style="display:flex;justify-content:space-between;font-size:9px;font-weight:800;color:#fff"><span>PUNKSHIT.OS</span><span>PREVIEW</span></div>' +
              '<div style="display:flex;align-items:center;gap:8px">' +
                '<div style="width:28px;height:28px;border-radius:50%;border:1.5px solid #fff;background:#1e293b;overflow:hidden;display:grid;place-items:center;font-size:11px;font-weight:800">' +
                  (photoSrc ? '<img src="' + C.esc(photoSrc) + '" style="width:100%;height:100%;object-fit:cover">' : initial) +
                '</div>' +
                '<div style="text-align:left"><div style="font-size:11px;font-weight:700;color:#fff">' + C.esc(u.name || 'Warga') + '</div><div style="font-size:9px;color:#cbd5e1">' + C.esc(u.memberNo || 'PSK-0001') + '</div></div>' +
              '</div>' +
              '<div style="font-size:10px;font-weight:700;color:#FFD633;text-align:left">PSK •••• ••••</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div id="col-sliders-box" style="margin-top:8px">' +
          '<label style="margin-top:4px">BESAR / KECIL (<span id="col-val-s">100%</span>)</label>' +
          '<input id="col-adj-scale" type="range" min="60" max="160" value="100">' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
            '<div><label>POSISI X (<span id="col-val-x">0px</span>)</label><input id="col-adj-x" type="range" min="-40" max="40" value="0"></div>' +
            '<div><label>POSISI Y (<span id="col-val-y">0px</span>)</label><input id="col-adj-y" type="range" min="-45" max="45" value="0"></div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<label>NAMA ITEM COLLAB</label>' +
      '<input id="col-name" maxlength="40" placeholder="mis. Topi Beanie / Cyber Katana">' +

      '<label>DESKRIPSI SINGKAT</label>' +
      '<textarea id="col-desc" rows="2" maxlength="140" placeholder="Ceritain dikit konsep desain item lo..."></textarea>' +

      '<button class="btn" data-act="lp-collab-send">🚀 KIRIM PENGAJUAN KE ADMIN</button>'
    );

    var p1El = document.getElementById('col-partner-1');
    var p2El = document.getElementById('col-partner-2');
    var splitInfo = document.getElementById('col-split-info');
    function updateSplitPreview() {
      var count = 1;
      if (p1El && p1El.value.trim()) count++;
      if (p2El && p2El.value.trim()) count++;
      if (count === 1) {
        splitInfo.textContent = 'Solo Creator (1 orang): Royalti 20% utuh untuk kamu.';
      } else if (count === 2) {
        splitInfo.textContent = 'Duo Collab (2 orang): Royalti 20% dibagi rata (10% + 10%) & masing-masing dapat item gratis.';
      } else {
        splitInfo.textContent = 'Trio Collab (3 orang): Royalti 20% dibagi rata 3 kreator & masing-masing dapat item gratis.';
      }
    }
    if (p1El) p1El.oninput = updateSplitPreview;
    if (p2El) p2El.oninput = updateSplitPreview;

    var typeEl = document.getElementById('col-type');
    var scaleEl = document.getElementById('col-adj-scale');
    var xEl = document.getElementById('col-adj-x');
    var yEl = document.getElementById('col-adj-y');
    var avatarGuide = document.getElementById('col-avatar-guide');
    var cardGuide = document.getElementById('col-card-guide');
    var stageTitle = document.getElementById('col-stage-title');
    var mediaLayer = document.getElementById('col-media-layer');
    var cardMediaLayer = document.getElementById('col-card-media-layer');

    function renderCollabMediaElements(file, url) {
      if (!file || !url) return;
      var isWebm = /\.webm$/i.test(file.name) || file.type === 'video/webm';
      var tagAvatar = isWebm
        ? '<video src="' + url + '" autoplay loop muted playsinline style="width:100%;height:100%;object-fit:contain"></video>'
        : '<img src="' + url + '" style="width:100%;height:100%;object-fit:contain">';
      var tagCard = isWebm
        ? '<video src="' + url + '" autoplay loop muted playsinline style="width:100%;height:100%;object-fit:cover"></video>'
        : '<img src="' + url + '" style="width:100%;height:100%;object-fit:cover">';
      if (mediaLayer) mediaLayer.innerHTML = tagAvatar;
      if (cardMediaLayer) cardMediaLayer.innerHTML = tagCard;
    }

    function updateCollabStage() {
      var kind = typeEl ? typeEl.value : 'border';
      var sc = (Number(scaleEl.value) || 100) / 100;
      var px = Number(xEl.value) || 0;
      var py = Number(yEl.value) || 0;

      document.getElementById('col-val-s').textContent = Math.round(sc * 100) + '%';
      document.getElementById('col-val-x').textContent = px + 'px';
      document.getElementById('col-val-y').textContent = py + 'px';

      if (kind === 'skin') {
        avatarGuide.style.display = 'none';
        cardGuide.style.display = 'block';
        stageTitle.textContent = '🪪 PRATINJAU KARTU PUNKID';
        cardMediaLayer.style.transform = 'translate(' + px + 'px,' + py + 'px) scale(' + sc + ')';
      } else if (kind === 'gift') {
        avatarGuide.style.display = 'block';
        cardGuide.style.display = 'none';
        stageTitle.textContent = '🎁 PRATINJAU ORBIT GIFT DI LUAR AVATAR';
        mediaLayer.style.transform = 'translate(' + (px + 48) + 'px,' + (py - 32) + 'px) scale(' + (sc * 0.34) + ')';
      } else {
        avatarGuide.style.display = 'block';
        cardGuide.style.display = 'none';
        stageTitle.textContent = '🎯 PRATINJAU LINGKARAN ACUAN AVATAR';
        mediaLayer.style.transform = 'translate(' + px + 'px,' + py + 'px) scale(' + sc + ')';
      }
    }

    typeEl.onchange = updateCollabStage;
    scaleEl.oninput = updateCollabStage;
    xEl.oninput = updateCollabStage;
    yEl.oninput = updateCollabStage;

    document.getElementById('col-adj-reset').onclick = function () {
      scaleEl.value = '100';
      xEl.value = '0';
      yEl.value = '0';
      updateCollabStage();
    };

    updateCollabStage();

    bindMediaPicker('col-drop', 'col-file', 'col-file-label', null, 'pendingCollabFile', function (file, url) {
      renderCollabMediaElements(file, url);
      updateCollabStage();
    });
  }

  window.PunkLapak.openNewShopItemSheet = openNewShopItemSheet;
  window.PunkLapak.openShopItemDetail = openShopItemDetail;
  window.PunkLapak.openCollabSubmitSheet = openCollabSubmitSheet;
})();
