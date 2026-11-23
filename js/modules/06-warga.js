(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;

  var searchQuery = '';
  var moodFilter = 'ALL';

  function getTierTitle(w) {
    var cred = Number(w.cred) || 0;
    var best = Math.max(Number(w.best) || 0, Number(w.streak) || 0);
    if (cred >= 300 && best >= 14) return '👑 Sepuh / Fosil';
    if (cred >= 100 && best >= 7) return '🔥 Pentolan Gang';
    if (cred >= 25 && best >= 3) return '☕ Anak Nongkrong';
    return '🌱 Warga Baru';
  }

  // 1. Halaman Utama Warga ("Siapa yang Masih Hidup?")
  function renderWarga() {
    var meId = S.user ? String(S.user.id) : '';
    var list = (S.onlineUsers || []).filter(function (w) {
      if (searchQuery) {
        var q = searchQuery.toLowerCase();
        var matchName = (w.name || '').toLowerCase().indexOf(q) !== -1;
        var matchUsn = (w.username || '').toLowerCase().indexOf(q) !== -1;
        if (!matchName && !matchUsn) return false;
      }
      if (moodFilter === 'NONGKI') {
        return /nongki|fire|karya/i.test(w.presence || '');
      }
      if (moodFilter === 'MABAR') {
        return /arena|mabar|rusuh/i.test(w.presence || '');
      }
      return true;
    });

    var bdayBanner = typeof window.renderBirthdayBannerSlot === 'function'
      ? window.renderBirthdayBannerSlot()
      : '';

    var filterBar =
      '<div style="display:flex;gap:6px;margin-bottom:12px">' +
        '<button class="pill" style="background:' + (moodFilter === 'ALL' ? '#FFD633' : 'rgba(255,255,255,.08)') + ';color:' + (moodFilter === 'ALL' ? '#000' : '#fff') + '" data-act="wg-mood-filter" data-val="ALL">Semua</button>' +
        '<button class="pill" style="background:' + (moodFilter === 'NONGKI' ? '#FFD633' : 'rgba(255,255,255,.08)') + ';color:' + (moodFilter === 'NONGKI' ? '#000' : '#fff') + '" data-act="wg-mood-filter" data-val="NONGKI">☕ Lagi Nongki</button>' +
        '<button class="pill" style="background:' + (moodFilter === 'MABAR' ? '#FFD633' : 'rgba(255,255,255,.08)') + ';color:' + (moodFilter === 'MABAR' ? '#000' : '#fff') + '" data-act="wg-mood-filter" data-val="MABAR">🎮 Siap Mabar</button>' +
      '</div>';

    return (
      bdayBanner +
      '<input id="wg-search" placeholder="🔍 Cari nama atau @username warga..." value="' + C.esc(searchQuery) + '" style="margin-bottom:10px">' +
      filterBar +

      '<div class="chips" style="margin-bottom:14px">' +
        '<button class="chip" data-act="app" data-id="wanted">🔎 Wanted Board</button>' +
        '<button class="chip" data-act="app" data-id="kotak">📮 Kotak Rahasia</button>' +
        '<button class="chip" data-act="app" data-id="sidang">🗳️ Sidang Warga</button>' +
        '<button class="chip" data-act="app" data-id="radio">🎧 Radio Gang</button>' +
        '<button class="chip" data-act="app" data-id="fame">🏆 Hall of Fame</button>' +
      '</div>' +

      '<h3 class="gh">WARGA YANG AKTIF DI MARKAS (' + list.length + ')</h3>' +
      '<div class="grp">' +
        (list.length
          ? list.map(function (w) {
              var isMe = meId && String(w.id) === meId;
              var roleTag = (w.role && w.role !== 'member') ? ' <span class="role-tag">' + C.esc(w.role) + '</span>' : '';
              var sparkBtn = (!isMe && w.username)
                ? '<button class="pill" style="background:rgba(255,107,0,.22);color:#FFB36B" data-act="wg-spark-invite" data-usn="' + C.esc(w.username) + '" title="Ajak Spark Buddies">🔥</button>'
                : '';
              var sapaBtn = !isMe
                ? '<button class="pill" data-act="wg-sapa" data-uid="' + C.esc(w.id) + '" data-name="' + C.esc(w.name) + '">👋 Sapa</button>'
                : '<span class="pill" style="opacity:.65">Kamu</span>';

              return (
                '<div class="rw">' +
                  '<div data-act="wg-view" data-uid="' + C.esc(w.id) + '" style="display:flex;align-items:center;gap:11px;flex:1;cursor:pointer;min-width:0">' +
                    C.renderAvatar(w, 'mini') +
                    '<div style="min-width:0">' +
                      '<b style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + C.esc(w.name) + roleTag + '</b>' +
                      '<small style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + C.esc(w.presence || '☕ Nongki Santai') + ' · ' + getTierTitle(w) + '</small>' +
                    '</div>' +
                  '</div>' +
                  '<div style="display:flex;gap:6px;flex-shrink:0">' + sparkBtn + sapaBtn + '</div>' +
                '</div>'
              );
            }).join('')
          : '<div class="rw"><small>Belum ada warga yang cocok sama filter ini cuy. Coba pilih tab Semua!</small></div>') +
      '</div>'
    );
  }

  // 2. Halaman Wanted Board (Cari Komplotan -> Auto-Post ke Grup, Auto-Expired 24 Jam)
  function renderWanted() {
    var posts = S.wanted || [];
    var myId = S.user ? String(S.user.id) : '';
    var isStaff = Boolean(S.user && S.user.role && S.user.role !== 'member');

    var clearBtn = isStaff
      ? '<button class="btn b2" style="margin-top:0;margin-bottom:16px" data-act="wg-wanted-clear">🧹 Bersihkan Semua Wanted</button>'
      : '';

    return (
      '<button class="btn" style="margin-top:0;margin-bottom:10px" data-act="wg-wanted-new">+ Pasang Wanted Board (Kirim ke Grup)</button>' +
      clearBtn +
      '<p class="bal" style="margin-bottom:12px">Papan cari partner mabar, voice, atau karya (aktif 24 jam)</p>' +
      '<div class="grp">' +
        (posts.length
          ? posts.map(function (p) {
              var canDel = isStaff || (myId && String(p.authorId) === myId);
              var delBtn = canDel
                ? '<button class="pill" style="background:#ef444426;color:#f87171" data-act="wg-wanted-del" data-id="' + C.esc(p.id) + '">🗑️ Hapus</button>'
                : '';

              return (
                '<div class="rw" style="flex-direction:column;align-items:flex-start">' +
                  '<div style="display:flex;justify-content:space-between;width:100%">' +
                    '<b style="color:var(--yel)">🔎 ' + C.esc(p.category) + '</b>' +
                    '<small>Slot: ' + (p.joined || 1) + '/' + p.slots + '</small>' +
                  '</div>' +
                  '<div style="font-size:14px;margin:4px 0">' + C.esc(p.note) + '</div>' +
                  '<div style="display:flex;justify-content:space-between;align-items:center;width:100%;margin-top:4px">' +
                    '<small>Oleh: ' + C.esc(p.authorName) + '</small>' +
                    '<div style="display:flex;gap:6px">' +
                      delBtn +
                      '<button class="pill" data-act="wg-wanted-join" data-id="' + C.esc(p.id) + '">Gas Bareng</button>' +
                    '</div>' +
                  '</div>' +
                '</div>'
              );
            }).join('')
          : '<div class="rw"><small>Belum ada lowongan partner nih cuy. Bikin satu yuk biar rame!</small></div>') +
      '</div>'
    );
  }

  // 3. Halaman Kotak Rahasia (Menfess -> Moderasi Dalang -> Channel)
  function renderKotak() {
    var archiveSection = typeof window.renderKotakArchiveSection === 'function'
      ? window.renderKotakArchiveSection()
      : '';

    return (
      '<div class="grp" style="margin-bottom:16px">' +
        '<div class="rw"><div><b>📮 Kirim Menfess / Pesan Anonim</b><small>Identitas pengirim aman dan bakal dicek pengurus dulu sebelum tayang di Channel.</small></div></div>' +
      '</div>' +
      '<label>KATEGORI PESAN</label>' +
      '<select id="mf-cat">' +
        '<option value="Confession">💌 Confession</option>' +
        '<option value="Titip Pesan">📨 Titip Pesan</option>' +
        '<option value="Cerita Random">🌀 Cerita Random</option>' +
        '<option value="Apresiasi">🙌 Apresiasi Warga</option>' +
      '</select>' +
      '<label>ISI PESAN ANONIM</label>' +
      '<textarea id="mf-txt" maxlength="280" placeholder="Tulis pesan atau apresiasi lo di sini..."></textarea>' +
      '<button class="btn" data-act="wg-menfess-send">KIRIM KE KOTAK RAHASIA</button>' +
      archiveSection
    );
  }

  // 4. Halaman Sidang Warga (Polling Komunitas)
  function renderSidang() {
    var polls = S.polls || [];
    return (
      '<p class="bal">Suara warga tongkrongan · Pilihan lo tercatat otomatis</p>' +
      (polls.length
        ? polls.map(function (pl) {
            return (
              '<div class="grp" style="margin-bottom:14px">' +
                '<div class="rw"><div><b>📢 ' + C.esc(pl.question) + '</b><small>Total suara masuk: ' + (pl.totalVotes || 0) + '</small></div></div>' +
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
        : '<div class="grp"><div class="rw"><small>Belum ada polling baru yang dibuka pengurus nih cuy.</small></div></div>')
    );
  }

  // 5. Halaman Radio Gang (Request Lagu & Dedikasi)
  function renderRadio() {
    return (
      '<div class="grp" style="margin-bottom:16px">' +
        '<div class="rw"><div><b>🎧 Request Lagu & Salam Tongkrongan</b><small>Mas Raka bakal langsung umumin request lagu lo ke Grup Punkshit!</small></div></div>' +
      '</div>' +
      '<label>JUDUL LAGU & ARTIS</label>' +
      '<input id="rd-song" maxlength="80" placeholder="mis. Hindia - Evaluasi">' +
      '<label>LINK SPOTIFY / YOUTUBE (OPSIONAL)</label>' +
      '<input id="rd-link" placeholder="https://open.spotify.com/...">' +
      '<label>SALAM / DEDIKASI BUAT WARGA</label>' +
      '<input id="rd-msg" maxlength="100" placeholder="Buat yang masih semangat jam segini...">' +
      '<button class="btn" data-act="wg-radio-send">KIRIM REQUEST KE MAS RAKA</button>'
    );
  }

  C.Views.warga = renderWarga;
  C.Views.wanted = renderWanted;
  C.Views.kotak = renderKotak;
  C.Views.sidang = renderSidang;
  C.Views.radio = renderRadio;

  if (window.__punkWargaBound) return;
  window.__punkWargaBound = true;

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
    if (!t || t.disabled) return;
    var act = t.getAttribute('data-act');

    if (act === 'wg-mood-filter') {
      moodFilter = t.getAttribute('data-val') || 'ALL';
      C.refresh();
    } else if (act === 'wg-view') {
      if (window.openWargaProfile) window.openWargaProfile(t.getAttribute('data-uid'));
    } else if (act === 'wg-spark-invite') {
      var targetUsn = t.getAttribute('data-usn');
      t.disabled = true;
      try {
        var spRes = await API.post('/api/spark/action', { type: 'SPARK_INVITE_SEND', targetUsername: targetUsn });
        C.notify('Mas Raka', 'Spark Buddies 🔥', spRes.message || ('Ajakan Spark udah meluncur ke @' + targetUsn + '!'));
      } catch (err) {
        t.disabled = false;
        C.notify('Mas Raka', 'Info Spark', err.message);
      }
    } else if (act === 'wg-sapa') {
      var targetId = t.getAttribute('data-uid');
      var targetName = t.getAttribute('data-name');
      t.disabled = true;
      try {
        await API.post('/api/social/greet', { targetUserId: targetId });
        C.notify('Mas Raka', '→ Grup Punkshit', S.user.name + ' nyapa ' + targetName + ' di markas! 👋');
      } catch (err) {
        C.notify('Mas Raka', 'Info', err.message);
      } finally {
        t.disabled = false;
      }
    } else if (act === 'wg-wanted-new') {
      C.sheet(
        '<h2>🔎 Pasang Wanted Board</h2>' +
        '<p class="sub">Cari partner mabar, voice, atau ngobrol. Langsung diposting ke Grup dengan tombol join!</p>' +
        '<label>KATEGORI</label>' +
        '<select id="wt-cat"><option>Gas Mabar</option><option>Nongki Voice</option><option>Movie Night</option><option>Partner RP</option><option>Duo Mission</option></select>' +
        '<label>JUMLAH SLOT</label>' +
        '<input id="wt-slots" type="number" min="2" max="10" value="3">' +
        '<label>CATATAN</label>' +
        '<input id="wt-note" maxlength="90" placeholder="Santai aja, yang penting asik dan kompak...">' +
        '<div style="display:grid;grid-template-columns:1fr 2fr;gap:8px;margin-top:12px">' +
          '<button class="btn b2" style="margin:0" data-act="shut">BATAL</button>' +
          '<button class="btn" style="margin:0" data-act="wg-wanted-submit">POSTING KE GRUP</button>' +
        '</div>'
      );
    } else if (act === 'wg-wanted-submit') {
      var cat = document.getElementById('wt-cat').value;
      var slots = Number(document.getElementById('wt-slots').value) || 3;
      var note = (document.getElementById('wt-note').value || '').trim();
      if (note.length < 3) {
        C.notify('Mas Raka', 'Cek Catatan', 'Tulis catatan singkatnya dulu ya cuy.');
        return;
      }
      t.disabled = true;
      try {
        var res = await API.post('/api/wanted', { category: cat, slots: slots, note: note });
        if (res.wanted) S.wanted = res.wanted;
        C.shut();
        C.refresh();
        C.notify('Mas Raka', '→ Grup Punkshit', 'Wanted Board baru udah ditempel di grup!');
      } catch (err) {
        t.disabled = false;
        C.notify('Mas Raka', 'Belum Berhasil', err.message);
      }
    } else if (act === 'wg-wanted-join') {
      var wid = t.getAttribute('data-id');
      t.disabled = true;
      try {
        var res = await API.post('/api/wanted/join', { wantedId: wid });
        if (res.wanted) S.wanted = res.wanted;
        C.refresh();
        C.notify('Mas Raka', 'Gabung Berhasil 🙌', 'Sip, lo resmi masuk list komplotan!');
      } catch (err) {
        t.disabled = false;
        C.notify('Mas Raka', 'Info', err.message);
      }
    } else if (act === 'wg-wanted-del') {
      var delWid = t.getAttribute('data-id');
      t.disabled = true;
      try {
        var dRes = await API.post('/api/wanted/delete', { wantedId: delWid });
        if (dRes.wanted) S.wanted = dRes.wanted;
        C.refresh();
        C.notify('Mas Raka', 'Dihapus', 'Wanted Board berhasil dihapus.');
      } catch (err) {
        t.disabled = false;
        C.notify('Mas Raka', 'Info', err.message);
      }
    } else if (act === 'wg-wanted-clear') {
      t.disabled = true;
      try {
        var cRes = await API.post('/api/wanted/clear', {});
        S.wanted = cRes.wanted || [];
        C.refresh();
        C.notify('Mas Raka', 'Wanted Bersih', cRes.message || 'Semua Wanted Board sudah dibersihkan.');
      } catch (err) {
        t.disabled = false;
        C.notify('Mas Raka', 'Info', err.message);
      }
    } else if (act === 'wg-menfess-send') {
      var mCat = document.getElementById('mf-cat').value;
      var mTxt = (document.getElementById('mf-txt').value || '').trim();
      if (mTxt.length < 5) {
        C.notify('Mas Raka', 'Cek Pesan', 'Pesannya kependekan cuy, tambahin dikit lagi ya!');
        return;
      }
      t.disabled = true;
      try {
        await API.post('/api/menfess', { category: mCat, text: mTxt });
        document.getElementById('mf-txt').value = '';
        C.notify('Mas Raka', 'Menfess Masuk 📮', 'Sip, pesan anonim lo udah masuk antrean pengurus sebelum tayang!');
      } catch (err) {
        C.notify('Mas Raka', 'Belum Berhasil', err.message);
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
        C.notify('Mas Raka', 'Suara Tercatat 🗳️', 'Makasih udah ikut voting bareng warga tongkrongan!');
      } catch (err) {
        t.disabled = false;
        C.notify('Mas Raka', 'Info', err.message);
      }
    } else if (act === 'wg-radio-send') {
      var song = (document.getElementById('rd-song').value || '').trim();
      var link = (document.getElementById('rd-link').value || '').trim();
      var msg = (document.getElementById('rd-msg').value || '').trim();
      if (song.length < 3) {
        C.notify('Mas Raka', 'Cek Judul', 'Isi dulu judul lagu & penyanyinya ya cuy!');
        return;
      }
      t.disabled = true;
      try {
        await API.post('/api/radio', { song: song, link: link, message: msg });
        document.getElementById('rd-song').value = '';
        document.getElementById('rd-msg').value = '';
        C.notify('Mas Raka', '→ Grup Punkshit 🎧', 'Request lagu "' + song + '" udah meluncur ke grup!');
      } catch (err) {
        C.notify('Mas Raka', 'Belum Berhasil', err.message);
      } finally {
        t.disabled = false;
      }
    }
  });
})();
