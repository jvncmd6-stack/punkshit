window.PunkCoreFallback = (function () {
  var API = window.PunkAPI;
  var ST = window.PunkCoreState;
  var S = ST.S;
  var esc = ST.esc;
  var ico = ST.ico;
  var rankInfo = ST.rankInfo;
  var renderAvatar = ST.renderAvatar;

  function getFallbackView(id) {
    if (id === 'absen') {
      var u = S.user || {};
      var rk = rankInfo(u.streak);
      return '<div class="card">' +
        '<h3>🔥 Absen Harian</h3>' +
        '<p class="sub">Streak saat ini: <b>' + (u.streak || 0) + ' hari</b> (' + rk.title + ')</p>' +
        '<p class="sub">Bonus hari ini: <b>+' + rk.bonus + ' PSC</b> & +2 Street Cred.</p>' +
        '<button class="btn" data-act="core-absen">ABSEN SEKARANG</button>' +
      '</div>';
    }

    if (id === 'kapsul' || id === 'capsule') {
      return '<div class="card">' +
        '<h3>⏳ Time Capsule</h3>' +
        '<p class="sub">Tulis pesan rahasia buat diri lu sendiri di masa depan. Bakal terkunci sampai tanggal yang lu tentuin.</p>' +
        '<label>TANGGAL BUKA KAPSUL</label>' +
        '<input id="cap-date" type="date">' +
        '<label>ISI PESAN KAPSUL</label>' +
        '<textarea id="cap-msg" rows="3" maxlength="300" placeholder="Pesan buat gue di masa depan..."></textarea>' +
        '<button class="btn" data-act="core-capsule">SEGEL TIME CAPSULE</button>' +
      '</div>';
    }

    if (id === 'lapakwarga') {
      var uShop = S.user || {};
      var shopTab = S.curTab.lapakwarga || 'etalase';
      var items = S.market || [];
      var orders = S.marketOrders || [];

      var headerBanner =
        '<div class="card" style="background:linear-gradient(135deg,rgba(234,88,12,.22),rgba(15,23,42,.9));border:1px solid rgba(251,146,60,.3)">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px">' +
            '<div style="display:flex;align-items:center;gap:10px">' +
              renderAvatar(uShop, 'mini') +
              '<div>' +
                '<div style="font-weight:800;font-size:14px">LAPAK WARGA</div>' +
                '<div style="font-size:11px;opacity:.85">Saldo Lu: <b style="color:#FFD633">' + (uShop.psc || 0) + ' PSC</b></div>' +
              '</div>' +
            '</div>' +
            '<button class="pill" style="background:#EA580C;color:#fff;font-weight:800" data-act="core-shop-modal">+ Jual</button>' +
          '</div>' +
        '</div>' +
        '<div class="tabs" style="margin:12px 0">' +
          '<button class="tab' + (shopTab === 'etalase' ? ' on' : '') + '" data-act="core-shop-tab" data-tab="etalase">🛍️ Etalase (' + items.length + ')</button>' +
          '<button class="tab' + (shopTab === 'orders' ? ' on' : '') + '" data-act="core-shop-tab" data-tab="orders">📦 Riwayat Order (' + orders.length + ')</button>' +
        '</div>';

      if (shopTab === 'orders') {
        var orderRows = orders.map(function (o) {
          var isBuyer = String(o.buyer_id) === String(uShop.id);
          var badge = isBuyer
            ? '<span class="pill" style="background:#EF444433;color:#FCA5A5">BELI -' + o.price + ' PSC</span>'
            : '<span class="pill" style="background:#34C75933;color:#6df0a0">TERJUAL +' + o.price + ' PSC</span>';
          var partnerInfo = isBuyer ? ('Pelapak: ' + esc(o.seller_name)) : ('Pembeli: ' + esc(o.buyer_name));
          return '<div class="rw"><div><b>' + esc(o.item_title) + '</b><small>' + partnerInfo + (o.note ? (' · "' + esc(o.note) + '"') : '') + '</small></div>' + badge + '</div>';
        }).join('') || '<div class="rw"><small>Belum ada transaksi jual-beli di Lapak Warga.</small></div>';
        return headerBanner + '<div class="grp">' + orderRows + '</div>';
      }

      var cardsHtml = items.map(function (m) {
        var mediaUrl = m.image_url || m.imageUrl || '';
        var isWebm = /\.webm$/i.test(mediaUrl);
        var isSold = m.status === 'sold';
        var isMine = String(m.seller_id) === String(uShop.id);
        var mediaHtml = mediaUrl
          ? (isWebm
              ? '<video src="' + esc(API.assetUrl(mediaUrl)) + '" autoplay loop muted playsinline style="width:100%;height:130px;object-fit:cover;border-radius:10px;background:#0f172a' + (isSold ? ';opacity:.45' : '') + '"></video>'
              : '<img src="' + esc(API.assetUrl(mediaUrl)) + '" alt="" style="width:100%;height:130px;object-fit:cover;border-radius:10px;background:#0f172a' + (isSold ? ';opacity:.45' : '') + '">')
          : '<div style="width:100%;height:105px;border-radius:10px;background:linear-gradient(135deg,#1e293b,#0f172a);display:grid;place-items:center;color:#64748b;font-size:12px">Tanpa Foto</div>';

        var actionBtn = isSold
          ? '<button class="btn b2" disabled style="margin-top:8px;padding:7px;font-size:11px;opacity:.6">TERJUAL' + (m.buyer_name ? ' KE ' + esc(m.buyer_name.toUpperCase()) : '') + '</button>'
          : (isMine
              ? '<button class="btn b2" data-act="core-warga-del" data-id="' + esc(m.id) + '" style="margin-top:8px;padding:7px;font-size:11px;color:#FCA5A5">🗑️ Hapus Dagangan</button>'
              : '<button class="btn" data-act="core-warga-buy-modal" data-id="' + esc(m.id) + '" style="margin-top:8px;padding:8px;font-size:12px">' + (m.category === 'Jasa' ? '🛒 Pesan Jasa' : '🛒 Beli Sekarang') + '</button>');

        return '<div class="card" style="padding:10px;display:flex;flex-direction:column;justify-content:space-between">' +
          '<div style="position:relative">' + mediaHtml + (isSold ? '<span style="position:absolute;top:8px;right:8px;background:#EF4444;color:#fff;font-size:9px;font-weight:900;padding:3px 7px;border-radius:6px">SOLD OUT</span>' : '') + '</div>' +
          '<div style="margin-top:8px">' +
            '<span class="pill" style="font-size:10px;padding:2px 7px">' + esc(m.category || 'Barang') + '</span>' +
            '<div style="font-weight:700;font-size:13px;margin-top:4px;line-height:1.25">' + esc(m.title) + '</div>' +
            '<div style="color:#FFD633;font-weight:800;font-size:14px;margin-top:4px">' + esc(m.price) + ' PSC</div>' +
            '<p class="sub" style="font-size:11px;margin:4px 0 6px;line-height:1.3">' + esc(m.description || '') + '</p>' +
          '</div>' +
          '<div><small style="font-size:10px;opacity:.8">' + esc(m.seller_name || 'Warga') + '</small>' + actionBtn + '</div>' +
        '</div>';
      }).join('');

      return headerBanner + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
        (cardsHtml || '<div class="card" style="grid-column:1/-1"><p class="sub">Etalase masih kosong. Jadi pelapak pertama di markas!</p></div>') +
      '</div>';
    }

    if (id === 'rules' || id === 'pasal' || id === 'help') {
      var rh = S.rulesHelp || {};
      var pasalTxt = esc(rh.pasal || '1. Saling hargai sesama warga markas.\n2. Dilarang spam link judi, scam, atau SARA.\n3. Gunakan fitur Radio Gang dengan tertib saat OS.').replace(/\n/g, '<br>');
      var helpTxt = esc(rh.help || '• Cetak PunkID di menu utama.\n• Request lagu Spotify lewat Radio Gang atau kirim file MP3 langsung ke PC Bot Mas Raka.').replace(/\n/g, '<br>');
      return '<div class="card"><h3>📜 Pasal & Aturan Tongkrongan</h3><p class="sub" style="line-height:1.6;margin-top:8px">' + pasalTxt + '</p></div>' +
        '<div class="card" style="margin-top:12px"><h3>🆘 Pusat Bantuan (Help)</h3><p class="sub" style="line-height:1.6;margin-top:8px">' + helpTxt + '</p></div>';
    }

    if (id === 'dalang') {
      var st = S.adminStats || { totalUsers: 0, totalWaitingRadio: 0, users: [] };
      var userRows = (st.users || []).map(function (usr) {
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08)">' +
          '<div><b>' + esc(usr.name) + '</b> <small style="opacity:.7">(' + esc(usr.role || 'member') + ')</small>' +
          '<div style="font-size:11px;color:#FFD633">Saldo: ' + (usr.cred || 0) + ' PSC • ID: ' + esc(usr.id) + '</div></div>' +
          '<button class="pill" data-act="core-admin-coin-modal" data-uid="' + esc(usr.id) + '" data-uname="' + esc(usr.name) + '">+/- Koin</button>' +
        '</div>';
      }).join('') || '<p class="sub">Memuat daftar warga...</p>';

      return '<div class="card"><h3>👑 Ruang Dalang (Admin Panel)</h3>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">' +
          '<div style="background:rgba(255,255,255,.05);padding:10px;border-radius:10px"><small>TOTAL WARGA</small><div style="font-size:18px;font-weight:800">' + st.totalUsers + '</div></div>' +
          '<div style="background:rgba(255,255,255,.05);padding:10px;border-radius:10px"><small>ANTREAN RADIO</small><div style="font-size:18px;font-weight:800">' + st.totalWaitingRadio + '</div></div>' +
        '</div></div>' +
        '<div class="card" style="margin-top:12px"><h3>💰 Kelola Saldo PSC & Warga</h3>' + userRows + '</div>';
    }

    return '<div class="emp">' + ico(id) + 'Modul dalam pengembangan.</div>';
  }

  return { getFallbackView: getFallbackView };
})();
