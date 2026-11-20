(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;

  function renderKalender() {
    var u = S.user;
    var events = S.events || [];

    return (
      '<div class="grp" style="margin-bottom:16px;background:linear-gradient(135deg,#5AC8FA26,#101827)">' +
        '<div class="rw">' +
          '<div>' +
            '<b>🎂 Birthday Club</b>' +
            '<small>' + (u.birthday ? 'Tercatat: ' + C.esc(u.birthday) + ' (Otomatis dirayain Mas Raka)' : 'Simpan tanggal ultah lo buat dapet bonus PSC & ucapan!') + '</small>' +
          '</div>' +
          '<button class="pill" data-act="kl-bday-sheet">' + (u.birthday ? 'Ubah' : 'Set Ultah') + '</button>' +
        '</div>' +
      '</div>' +

      '<h3 class="gh">KALENDER KEKACAUAN (EVENT & AWARDS)</h3>' +
      '<div class="grp">' +
        (events.length
          ? events.map(function (ev) {
              var isJoined = Boolean(ev.joined);
              return (
                '<div class="rw" style="flex-direction:column;align-items:flex-start">' +
                  '<div style="display:flex;justify-content:space-between;width:100%;align-items:center">' +
                    '<b style="font-size:15px">' + C.esc(ev.title) + '</b>' +
                    '<span class="role-tag" style="background:#5AC8FA33;color:#8FC7FF">' + C.esc(ev.type || 'EVENT') + '</span>' +
                  '</div>' +
                  '<small style="margin-top:4px">🗓️ ' + C.esc(ev.dateText) + ' · Peserta: ' + (ev.rsvpCount || 0) + ' warga</small>' +
                  (ev.description ? '<div style="font-size:13.5px;margin:6px 0;color:#dbe4f6">' + C.esc(ev.description) + '</div>' : '') +
                  '<div style="display:flex;justify-content:space-between;align-items:center;width:100%;margin-top:6px">' +
                    '<small style="color:var(--yel)">Hadiah: ' + C.esc(ev.rewardText || 'PSC & Street Cred') + '</small>' +
                    '<button class="pill" data-act="kl-rsvp" data-id="' + C.esc(ev.id) + '"' + (isJoined ? ' disabled' : '') + '>' + (isJoined ? '✅ TERDAFTAR' : '🔥 IKUT RUSUH') + '</button>' +
                  '</div>' +
                '</div>'
              );
            }).join('')
          : '<div class="rw"><small>Belum ada jadwal event aktif. Tunggu pengumuman pengurus di Channel!</small></div>') +
      '</div>'
    );
  }

  function renderKapsul() {
    return (
      '<div class="grp" style="margin-bottom:14px">' +
        '<div class="rw"><div><b>📦 Time Capsule</b><small>Tulis pesan buat diri sendiri atau warga masa depan. Mas Raka bakal buka pas waktunya tiba.</small></div></div>' +
      '</div>' +
      '<label>BUKA PADA TANGGAL</label>' +
      '<input id="kl-tc-date" type="date">' +
      '<label>PESAN UNTUK MASA DEPAN</label>' +
      '<textarea id="kl-tc-msg" maxlength="300" placeholder="Semoga pas pesan ini kebuka, saldo udah nggak sekarat..."></textarea>' +
      '<button class="btn" data-act="kl-capsule-save">KUNCI TIME CAPSULE</button>'
    );
  }

  function openBirthdaySheet() {
    C.sheet(
      '<h2>🎂 Birthday Club</h2>' +
      '<p class="sub">Opsional & sukarela. Pas hari H, <i>Mas Raka</i> bakal ngucapin selamat ulang tahun dan ngasih bonus PSC ke dompet lo.</p>' +
      '<label>TANGGAL ULANG TAHUN (DD-MM)</label>' +
      '<input id="bd-val" placeholder="contoh: 17-08" maxlength="5" value="' + C.esc(S.user.birthday || '') + '">' +
      '<button class="btn" data-act="kl-bday-save">SIMPAN TANGGAL ULTAH</button>'
    );
  }

  C.Views.event = renderKalender;
  C.Views.kapsul = renderKapsul;

  document.addEventListener('click', async function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var act = t.getAttribute('data-act');

    if (act === 'kl-bday-sheet') {
      openBirthdaySheet();
    } else if (act === 'kl-bday-save') {
      var val = (document.getElementById('bd-val').value || '').trim();
      if (!/^\d{2}-\d{2}$/.test(val)) {
        C.notify('Mas Raka', 'Format Salah', 'Gunakan format DD-MM, contoh: 24-11');
        return;
      }
      t.disabled = true;
      try {
        var res = await API.post('/api/profile/birthday', { birthday: val });
        S.user = res.user;
        C.shut();
        C.refresh();
        C.notify('Mas Raka', 'Birthday Club', 'Tanggal ultah ' + val + ' berhasil dicatat!');
      } catch (err) {
        t.disabled = false;
        C.notify('Mas Raka', 'Gagal', err.message);
      }
    } else if (act === 'kl-rsvp') {
      var id = t.getAttribute('data-id');
      t.disabled = true;
      try {
        var res = await API.post('/api/events/rsvp', { eventId: id });
        if (res.events) S.events = res.events;
        C.refresh();
        C.notify('Mas Raka', 'RSVP Tercatat', 'Sip! Nama lo udah masuk daftar hadir event.');
      } catch (err) {
        t.disabled = false;
        C.notify('Mas Raka', 'Gagal RSVP', err.message);
      }
    } else if (act === 'kl-capsule-save') {
      var dt = (document.getElementById('kl-tc-date').value || '').trim();
      var msg = (document.getElementById('kl-tc-msg').value || '').trim();
      if (!dt || msg.length < 5) {
        C.notify('Mas Raka', 'Validasi', 'Isi tanggal buka dan pesan minimal 5 karakter.');
        return;
      }
      t.disabled = true;
      try {
        await API.post('/api/capsule', { unlockDate: dt, message: msg });
        document.getElementById('kl-tc-msg').value = '';
        C.notify('Mas Raka', 'Time Capsule', 'Pesan dikunci rapat sampai ' + dt + '!');
      } catch (err) {
        C.notify('Mas Raka', 'Gagal', err.message);
      } finally {
        t.disabled = false;
      }
    }
  });
})();
