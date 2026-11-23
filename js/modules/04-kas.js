(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;

  var txHistory = [];
  var txLoaded = false;

  function renderKas() {
    var u = S.user || {};
    if (!txLoaded) loadTransactions();

    var cardHtml = C.renderPunkCard ? C.renderPunkCard(u) : '';
    var hasShield = Number(u.streakShield || u.streak_shield || 0) > 0;

    var shieldBox =
      '<div class="grp" style="margin-bottom:14px;border:1px solid rgba(56,189,248,.25)">' +
        '<div class="rw">' +
          '<div>' +
            '<b>🛡️ Tameng Streak (' + (hasShield ? 'AKTIF' : 'KOSONG') + ')</b>' +
            '<small>' + (hasShield ? 'Aman cuy! Streak lo bakal selamat kalau ketiduran 1 hari.' : 'Jaga-jaga biar streak nggak reset ke 0 pas lupa absen.') + '</small>' +
          '</div>' +
          (hasShield
            ? '<span class="pill" style="background:#34C75933;color:#6df0a0">SIAP JAGA</span>'
            : '<button class="pill" style="background:#38BDF8;color:#000;font-weight:800" data-act="kas-buy-shield">Beli · 60 PSC</button>') +
        '</div>' +
      '</div>';

    return (
      cardHtml +
      '<p class="bal">Saldo Dompet: <b>' + (u.psc || 0) + ' PSC</b> · Tap kartu buat diputar</p>' +

      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">' +
        '<button class="btn" style="margin-top:0" data-act="kas-sawer-sheet">💸 Bagi Rezeki</button>' +
        '<button class="btn b2" style="margin-top:0" data-act="kas-refresh">🔄 Cek Mutasi</button>' +
      '</div>' +

      shieldBox +

      '<h3 class="gh">BUKU KAS (RIWAYAT TRANSAKSI)</h3>' +
      '<div class="grp">' +
        (txHistory.length
          ? txHistory.map(function (tx) {
              var isPlus = Number(tx.amount) >= 0;
              var sign = isPlus ? '+' : '';
              var col = isPlus ? '#6df0a0' : '#ff857d';
              var time = new Date(tx.createdAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
              return (
                '<div class="rw">' +
                  '<div><b>' + C.esc(tx.note || tx.type) + '</b><small>' + time + ' · ID #' + C.esc(String(tx.id).slice(-6)) + '</small></div>' +
                  '<b style="color:' + col + ';font-size:14px">' + sign + tx.amount + ' PSC</b>' +
                '</div>'
              );
            }).join('')
          : '<div class="rw"><small>Belum ada catatan mutasi nih cuy. Yuk mulai absen atau sikat misi!</small></div>') +
      '</div>'
    );
  }

  async function loadTransactions() {
    txLoaded = true;
    try {
      var res = await API.get('/api/wallet/history');
      txHistory = res.transactions || [];
      if (S.curApp === 'kas') C.refresh();
    } catch (e) {}
  }

  function openSawerSheet() {
    C.sheet(
      '<h2>💸 Bagi Rezeki (Saweran)</h2>' +
      '<p class="sub">Lempar PSC ke Grup Punkshit. <i>Mas Raka</i> bakal langsung infoin ke grup lengkap dengan tombol klaim!</p>' +

      '<label>TOTAL PSC YANG DILEMPAR (SALDO: ' + (S.user.psc || 0) + ' PSC)</label>' +
      '<input id="sw-amt" type="number" min="10" max="10000" placeholder="mis. 150">' +

      '<label>KUOTA PENERIMA (WARGA)</label>' +
      '<input id="sw-quota" type="number" min="1" max="50" value="5">' +

      '<label>METODE PEMBAGIAN</label>' +
      '<div class="chips" id="sw-mode">' +
        '<button type="button" class="chip on" data-act="kas-sw-mode" data-val="equal">⚖️ Bagi Rata</button>' +
        '<button type="button" class="chip" data-act="kas-sw-mode" data-val="random">🎲 Bagi Acak</button>' +
      '</div>' +

      '<label>PESAN TAMBAHAN (OPSIONAL)</label>' +
      '<input id="sw-msg" maxlength="70" placeholder="mis. Rezeki tongkrongan, sikat bareng!">' +

      '<button class="btn" data-act="kas-sw-submit">LEMPAR KE GRUP SEKARANG</button>'
    );
  }

  C.Views.kas = renderKas;

  if (window.__punkKasBound) return;
  window.__punkKasBound = true;

  document.addEventListener('click', async function (e) {
    var t = e.target.closest('[data-act]');
    if (!t || t.disabled) return;
    var act = t.getAttribute('data-act');

    if (act === 'kas-sawer-sheet') {
      openSawerSheet();
    } else if (act === 'kas-sw-mode') {
      document.querySelectorAll('#sw-mode .chip').forEach(function (c) { c.classList.remove('on'); });
      t.classList.add('on');
    } else if (act === 'kas-refresh') {
      txLoaded = false;
      await C.sync(true);
      C.refresh();
      C.notify('Mas Raka', 'Buku Kas', 'Sip, catatan mutasi saldo udah diperbarui!');
    } else if (act === 'kas-buy-shield') {
      if ((S.user.psc || 0) < 60) {
        C.notify('Mas Raka', 'Saldo Belum Cukup', 'Santai cuy, butuh 60 PSC buat aktifin Tameng Streak. Absen atau sikat misi dulu yuk!');
        return;
      }
      t.disabled = true;
      t.textContent = 'Mengaktifkan...';
      try {
        var sRes = await API.post('/api/wallet/buy-shield', {});
        if (sRes.user) S.user = sRes.user;
        txLoaded = false;
        C.refresh();
        C.notify('Mas Raka', 'Tameng Aktif 🛡️', 'Mantap! Tameng Streak udah siap jagain streak lo kalau lupa absen sehari.');
      } catch (err) {
        t.disabled = false;
        t.textContent = 'Beli · 60 PSC';
        C.notify('Mas Raka', 'Belum Berhasil', err.message);
      }
    } else if (act === 'kas-sw-submit') {
      var amount = Math.floor(Number(document.getElementById('sw-amt').value));
      var quota = Math.floor(Number(document.getElementById('sw-quota').value));
      var msg = (document.getElementById('sw-msg').value || '').trim();
      var modeEl = document.querySelector('#sw-mode .chip.on');
      var mode = modeEl ? modeEl.getAttribute('data-val') : 'equal';

      if (!amount || amount < 10) {
        C.notify('Mas Raka', 'Cek Nominal', 'Minimal saweran 10 PSC ya cuy.');
        return;
      }
      if (!quota || quota < 1 || quota > amount) {
        C.notify('Mas Raka', 'Cek Kuota', 'Kuota penerima minimal 1 dan maksimal sama dengan total PSC.');
        return;
      }
      if (amount > (S.user.psc || 0)) {
        C.notify('Mas Raka', 'Saldo Belum Cukup', 'Saldo PSC lo belum cukup buat nominal segitu cuy, coba turunin dikit.');
        return;
      }

      t.disabled = true;
      t.textContent = 'Melempar ke Grup...';
      try {
        var res = await API.post('/api/sawer', {
          amount: amount,
          quota: quota,
          mode: mode,
          message: msg
        });
        S.user = res.user;
        txLoaded = false;
        C.shut();
        C.refresh();
        C.notify('Mas Raka', '→ Grup Punkshit', 'Rezeki meluncur! Saweran ' + amount + ' PSC udah dilempar ke grup.');
      } catch (err) {
        t.disabled = false;
        t.textContent = 'LEMPAR KE GRUP SEKARANG';
        C.notify('Mas Raka', 'Gagal Sawer', err.message);
      }
    }
  });
})();
