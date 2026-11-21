(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;

  var searchQuery = '';

  // 1. Halaman Utama Warga ("Siapa yang Masih Hidup?")
  function renderWarga() {
    var list = (S.onlineUsers || []).filter(function (w) {
      if (!searchQuery) return true;
      var q = searchQuery.toLowerCase();
      return (w.name || '').toLowerCase().indexOf(q) !== -1 || (w.username || '').toLowerCase().indexOf(q) !== -1;
    });

    return (
      '<input id="wg-search" placeholder="🔍 Cari nama atau @username warga..." value="' + C.esc(searchQuery) + '" style="margin-bottom:14px">' +

      '<div class="chips" style="margin-bottom:14px">' +
        '<button class="chip" data-act="app" data-id="wanted">🔎 Wanted Board</button>' +
        '<button class="chip" data-act="app" data-id="kotak">📮 Kotak Rahasia</button>' +
        '<button class="chip" data-act="app" data-id="sidang">🗳️ Sidang Warga</button>' +
        '<button class="chip" data-act="app" data-id="radio">🎧 Radio Gang</button>' +
      '</div>' +

      '<h3 class="gh">SIAPA YANG MASIH HIDUP? (' + list.length + ')</h3>' +
      '<div class="grp">' +
        (list.length
          ? list.map(function (w) {
              var roleTag = (w.role && w.role !== 'member') ? ' <span class="role-tag">' + C.esc(w.role) + '</span>' : '';
              return (
  '<div class="rw">' +
    '<div data-act="wg-view" data-uid="' + C.esc(w.id) + '" style="display:flex;align-items:center;gap:11px;flex:1;cursor:pointer">' +
      C.renderAvatar(w, 'mini') +
      '<div><b>' + C.esc(w.name) + roleTag + '</b><small>' + C.esc(w.presence || '☕ Nongki Dulu') + ' · ' + C.rankInfo(w.streak).title + '</small></div>' +
    '</div>' +
    '<button class="pill" data-act="wg-sapa" data-uid="' + C.esc(w.id) + '" data-name="' + C.esc(w.name) + '">👋 Sapa</button>' +
  '</div>'
);
            }).join('')
          : '<div class="rw"><small>Belum ada warga lain yang terdeteksi aktif.</small></div>') +
      '</div>'
    );
  }

  // 2. Halaman Wanted Board (Cari Komplotan -> Auto-Post ke Grup)
  function renderWanted() {
    var posts = S.wanted || [];
    return (
      '<button class="btn" style="margin-top:0;margin-bottom:16px" data-act="wg-wanted-new">+ Pasang Wanted Board (Kirim ke Grup)</button>' +
      '<div class="grp">' +
        (posts.length
          ? posts.map(function (p) {
              return (
                '<div class="rw" style="flex-direction:column;align-items:flex-start">' +
                  '<div style="display:flex;justify-content:space-between;width:100%">' +
                    '<b style="color:var(--yel)">🔎 ' + C.esc(p.category) + '</b>' +
                    '<small>Slot: ' + (p.joined || 1) + '/' + p.slots + '</small>' +
                  '</div>' +
                  '<div style="font-size:14px;margin:4px 0">' + C.esc(p.note) + '</div>' +
                  '<div style="display:flex;justify-content:space-between;align-items:center;width:100%;margin-top:4px">' +
                    '<small>Oleh: ' + C.esc(p.authorName) + '</small>' +
                    '<button class="pill" data-act="wg-wanted-join" data-id="' + C.esc(p.id) + '">Gas Bareng</button>' +
                  '</div>' +
                '</div>'
              );
            }).join('')
          : '<div class="rw"><small>Belum ada lowongan komplotan. Bikin satu buat mancing warga mabar!</small></div>') +
      '</div>'
    );
  }

  // 3. Halaman Kotak Rahasia (Menfess -> Moderasi Dalang -> Channel)
  function renderKotak() {
    return (
      '<div class="grp" style="margin-bottom:16px">' +
        '<div class="rw"><div><b>📮 Kirim Menfess / Pesan Anonim</b><small>Pesan akan dicek pengurus di Ruang Dalang sebelum tayang di Channel & Grup.</small></div></div>' +
      '</div>' +
      '<label>KATEGORI PESAN</label>' +
      '<select id="mf-cat">' +
        '<option value="Confession">💌 Confession</option>' +
        '<option value="Titip Pesan">📨 Titip Pesan</option>' +
        '<option value="Cerita Random">🌀 Cerita Random</option>' +
        '<option value="Apresiasi">🙌 Apresiasi Warga</option>' +
      '</select>' +
      '<label>ISI PESAN ANONIM</label>' +
      '<textarea id="mf-txt" maxlength="280" placeholder="Tulis unek-unek lo di sini (identitas aman)..."></textarea>' +
      '<button class="btn" data-act="wg-menfess-send">KIRIM KE KOTAK RAHASIA</button>'
    );
  }

  // 4. Halaman Sidang Warga (Polling Komunitas)
  function renderSidang() {
    var polls = S.polls || [];
    return (
      '<p class="bal">Demokrasi tongkrongan · Suara lo tercatat di server</p>' +
      (polls.length
        ? polls.map(function (pl) {
            return (
              '<div class="grp" style="margin-bottom:14px">' +
                '<div class="rw"><div><b>📢 ' + C.esc(pl.question) + '</b><small>Total suara: ' + (pl.totalVotes || 0) + '</small></div></div>' +
                (pl.options || []).map(function (opt, idx) {
                  return (
                    '<div class="rw">' +
                      '<span>' + C.esc(opt.label) + ' <small style="display:inline">(' + (opt.votes || 0) + ')</small></span>' +
                      '<button class="pill" data-act="wg-vote" data-pid="' + C.esc(pl.id) + '" data-idx="' + idx + '">Pilih</button>' +
                    '</div>'
                  );
                }).join('') +
              '</div>'
            );
          }).join('')
        : '<div class="grp"><div class="rw"><small>Belum ada sidang warga yang dibuka pengurus.</small></div></div>')
    );
  }

  // 5. Halaman Radio Gang (Request Lagu & Dedikasi)
  function renderRadio() {
    return (
      '<div class="grp" style="margin-bottom:16px">' +
        '<div class="rw"><div><b>🎧 Request Lagu & Dedikasi</b><small>Mas Raka bakal umumin request lagu lo ke Grup Punkshit!</small></div></div>' +
      '</div>' +
      '<label>JUDUL LAGU & ARTIS</label>' +
      '<input id="rd-song" maxlength="80" placeholder="mis. Hindia - Evaluasi">' +
      '<label>LINK SPOTIFY / YOUTUBE (OPSIONAL)</label>' +
      '<input id="rd-link" placeholder="https://open.spotify.com/...">' +
      '<label>DEDIKASI / PESAN BUAT WARGA</label>' +
      '<input id="rd-msg" maxlength="100" placeholder="Buat yang masih melek jam segini...">' +
      '<button class="btn" data-act="wg-radio-send">KIRIM REQUEST KE MAS RAKA</button>'
    );
  }

  C.Views.warga = renderWarga;
  C.Views.wanted = renderWanted;
  C.Views.kotak = renderKotak;
  C.Views.sidang = renderSidang;
  C.Views.radio = renderRadio;

  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'wg-search') {
      searchQuery = e.target.value;
      var pos = e.target.selectionStart;
      C.refresh();
      var el = document.getElementById('wg-search');
      if (el) { el.focus(); el.setSelectionRange(pos, pos); }
    }
  });

  document.addEventListener('click', async function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var act = t.getAttribute('data-act');

    if (act === 'wg-sapa') {
      var targetId = t.getAttribute('data-uid');
      var targetName = t.getAttribute('data-name');
      t.disabled = true;
      try {
        await API.post('/api/social/greet', { targetUserId: targetId });
        C.notify('Mas Raka', '→ Grup Punkshit', S.user.name + ' nyapa ' + targetName + ' di markas!');
      } catch (err) {
        C.notify('Mas Raka', 'Info', err.message);
      } finally {
        t.disabled = false;
      }
    } else if (act === 'wg-wanted-new') {
      C.sheet(
        '<h2>🔎 Pasang Wanted Board</h2>' +
        '<p class="sub">Cari komplotan mabar/nongki. Otomatis diposting ke Grup dengan tombol join!</p>' +
        '<label>KATEGORI</label>' +
        '<select id="wt-cat"><option>Gas Mabar</option><option>Nongki Voice</option><option>Movie Night</option><option>Partner RP</option><option>Duo Mission</option></select>' +
        '<label>JUMLAH SLOT</label>' +
        '<input id="wt-slots" type="number" min="2" max="10" value="3">' +
        '<label>CATATAN</label>' +
        '<input id="wt-note" maxlength="90" placeholder="Skill bebas, asal jangan AFK pas loading...">' +
        '<button class="btn" data-act="wg-wanted-submit">POSTING KE GRUP</button>'
      );
    } else if (act === 'wg-wanted-submit') {
      var cat = document.getElementById('wt-cat').value;
      var slots = Number(document.getElementById('wt-slots').value) || 3;
      var note = (document.getElementById('wt-note').value || '').trim();
      if (note.length < 3) return;
      t.disabled = true;
      try {
        var res = await API.post('/api/wanted', { category: cat, slots: slots, note: note });
        if (res.wanted) S.wanted = res.wanted;
        C.shut();
        C.refresh();
        C.notify('Mas Raka', '→ Grup Punkshit', 'WANTED BOARD baru udah dilempar ke grup!');
      } catch (err) {
        t.disabled = false;
        C.notify('Mas Raka', 'Gagal', err.message);
      }
    } else if (act === 'wg-wanted-join') {
      var wid = t.getAttribute('data-id');
      t.disabled = true;
      try {
        var res = await API.post('/api/wanted/join', { wantedId: wid });
        if (res.wanted) S.wanted = res.wanted;
        C.refresh();
        C.notify('Mas Raka', 'Joined!', 'Lo resmi masuk komplotan!');
      } catch (err) {
        t.disabled = false;
        C.notify('Mas Raka', 'Gagal', err.message);
      }
    } else if (act === 'wg-menfess-send') {
      var mCat = document.getElementById('mf-cat').value;
      var mTxt = (document.getElementById('mf-txt').value || '').trim();
      if (mTxt.length < 5) {
        C.notify('Mas Raka', 'Validasi', 'Pesan terlalu pendek bro.');
        return;
      }
      t.disabled = true;
      try {
        await API.post('/api/menfess', { category: mCat, text: mTxt });
        document.getElementById('mf-txt').value = '';
        C.notify('Mas Raka', 'Terkirim', 'Menfess masuk antrean moderasi pengurus sebelum tayang!');
      } catch (err) {
        C.notify('Mas Raka', 'Gagal', err.message);
      } finally {
        t.disabled = false;
      }
    } else if (act === 'wg-vote') {
      var pid = t.getAttribute('data-pid');
      var idx = Number(t.getAttribute('data-idx'));
      t.disabled = true;
      try {
        var res = await API.post('/api/polls/vote', { pollId: pid, optionIndex: idx });
        if (res.polls) S.polls = res.polls;
        C.refresh();
        C.notify('Mas Raka', 'Suara Tercatat', 'Terima kasih sudah berpartisipasi dalam demokrasi tongkrongan.');
      } catch (err) {
        t.disabled = false;
        C.notify('Mas Raka', 'Info', err.message);
      }
    } else if (act === 'wg-radio-send') {
      var song = (document.getElementById('rd-song').value || '').trim();
      var link = (document.getElementById('rd-link').value || '').trim();
      var msg = (document.getElementById('rd-msg').value || '').trim();
      if (song.length < 3) return;
      t.disabled = true;
      try {
        await API.post('/api/radio', { song: song, link: link, message: msg });
        document.getElementById('rd-song').value = '';
        document.getElementById('rd-msg').value = '';
        C.notify('Mas Raka', '→ Grup Punkshit', 'Request lagu "' + song + '" udah dikirim ke grup!');
      } catch (err) {
        C.notify('Mas Raka', 'Gagal', err.message);
      } finally {
        t.disabled = false;
      }
    }
  });
})();
