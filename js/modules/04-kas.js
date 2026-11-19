(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;

  var txHistory = [];
  var txLoaded = false;

  function renderKas() {
    var u = S.user;
    if (!txLoaded) {
      loadTransactions();
    }

    var cardHtml = C.renderPunkCard ? C.renderPunkCard(u) : '';

    return (
      cardHtml +
      '<p class="bal">Saldo Dompet: <b>' + (u.psc || 0) + ' PSC</b> · Tap kartu buat diputar</p>' +

      // Tombol Aksi Ekonomi (Bagi Rezeki / Saweran)
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px">' +
        '<button class="btn" style="margin-top:0" data-act="kas-sawer-sheet">💸 Bagi Rezeki</button>' +
        '<button class="btn b2" style="margin-top:0" data-act="kas-refresh">🔄 Cek Mutasi</button>' +
      '</div>' +

      // Buku Kas (Riwayat Transaksi dari Database)
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
          : '<div class="rw"><small>💸 Dompet lagi cuti. Belum ada riwayat transaksi.</small></div>') +
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

  // Sheet Bagi Rezeki (Saweran ke Grup Telegram)
  function openSawerSheet() {
    C.sheet(
      '<h2>💸 Bagi Rezeki (Saweran)</h2>' +
      '<p class="sub">Lempar PSC ke Grup Punkshit. <i>Mas Raka</i> bakal langsung teriak di grup lengkap dengan tombol klaim!</p>' +

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
      '<input id="sw-msg" maxlength="70" placeholder="mis. Rezeki anak soleh, sikat!">' +

      '<button class="btn" data-act="kas-sw-submit">LEMPAR KE GRUP SEKARANG</button>'
    );
  }

  C.Views.kas = renderKas;

  document.addEventListener('click', async function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
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
      C.notify('Mas Raka', 'Buku Kas', 'Mutasi saldo diperbarui.');
    } else if (act === 'kas-sw-submit') {
      var amount = Math.floor(Number(document.getElementById('sw-amt').value));
      var quota = Math.floor(Number(document.getElementById('sw-quota').value));
      var msg = (document.getElementById('sw-msg').value || '').trim();
      var modeEl = document.querySelector('#sw-mode .chip.on');
      var mode = modeEl ? modeEl.getAttribute('data-val') : 'equal';

      if (!amount || amount < 10) {
        C.notify('Mas Raka', 'Validasi', 'Minimal saweran 10 PSC bro.');
        return;
      }
      if (!quota || quota < 1 || quota > amount) {
        C.notify('Mas Raka', 'Validasi', 'Kuota penerima tidak valid (minimal 1, maksimal sama dengan jumlah PSC).');
        return;
      }
      if (amount > (S.user.psc || 0)) {
        C.notify('Mas Raka', 'Saldo Kurang', 'Dompet lu lagi cosplay gurun Sahara.');
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
        C.notify('Mas Raka', '→ Grup Punkshit', 'WOI ADA DUIT JATUH! Saweran ' + amount + ' PSC udah dilempar ke grup.');
      } catch (err) {
        t.disabled = false;
        t.textContent = 'LEMPAR KE GRUP SEKARANG';
        C.notify('Mas Raka', 'Gagal Sawer', err.message);
      }
    }
  });
})();
