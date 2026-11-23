(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;

  window.PunkLapak = window.PunkLapak || {};
  window.PunkLapak.pendingShopFile = null;
  window.PunkLapak.pendingCollabFile = null;

  function bindMediaPicker(dropId, fileId, labelId, prevId, stateKey) {
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
      prevBox.style.display = 'block';
      if (/\.webm$/i.test(file.name) || file.type === 'video/webm') {
        prevBox.innerHTML = '<video src="' + url + '" autoplay loop muted playsinline style="max-height:130px;border-radius:10px"></video>';
      } else {
        prevBox.innerHTML = '<img src="' + url + '" style="max-height:130px;border-radius:10px">';
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
    C.sheet(
      '<h2>🎨 Ajukan Item Collab</h2>' +
      '<p class="sub">Kirim desain Avatar Border, Card Skin, atau Gift. Kalau di-ACC admin, bakal rilis di Lapak Rongsok & lo dapat <b>royalti 20% PSC</b> tiap laku!</p>' +

      '<label>FILE DESAIN (PNG TRANSPARAN / GIF / WEBM)</label>' +
      '<div class="up-box" id="col-drop">' +
        '<input type="file" id="col-file" accept="image/png,image/webp,image/gif,video/webm,.png,.gif,.webm" hidden>' +
        '<div id="col-file-label" style="font-size:13px;font-weight:600;color:var(--gblue)">📁 Tap Upload Desain Karya Lo</div>' +
        '<small style="color:var(--mut);font-size:11px">Disarankan PNG transparan / WebM rasio 1:1</small>' +
      '</div>' +
      '<div id="col-prev-box" style="display:none;margin:8px 0;text-align:center"></div>' +

      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
        '<div><label>TIPE ITEM PROFIL</label><select id="col-type"><option value="border">🖼️ Avatar Border</option><option value="skin">🪪 Card Skin</option><option value="gift">🎁 Gift Pin</option></select></div>' +
        '<div><label>AJUAN HARGA (PSC)</label><input id="col-price" type="number" min="50" max="5000" value="150"></div>' +
      '</div>' +

      '<label>NAMA ITEM COLLAB</label>' +
      '<input id="col-name" maxlength="40" placeholder="mis. Cyber Katana Aura">' +

      '<label>DESKRIPSI SINGKAT</label>' +
      '<textarea id="col-desc" rows="2" maxlength="140" placeholder="Ceritain dikit konsep desain item lo..."></textarea>' +

      '<button class="btn" data-act="lp-collab-send">🚀 KIRIM PENGAJUAN KE ADMIN</button>'
    );

    bindMediaPicker('col-drop', 'col-file', 'col-file-label', 'col-prev-box', 'pendingCollabFile');
  }

  window.PunkLapak.openNewShopItemSheet = openNewShopItemSheet;
  window.PunkLapak.openShopItemDetail = openShopItemDetail;
  window.PunkLapak.openCollabSubmitSheet = openCollabSubmitSheet;
})();
