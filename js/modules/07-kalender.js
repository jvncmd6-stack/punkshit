(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;

  var eventFilter = 'ALL';

  function getFutureDateStr(days) {
    var d = new Date(Date.now() + days * 86400000);
    return d.toISOString().slice(0, 10);
  }

  function getTodayBdayWarga() {
    var now = new Date();
    var dd = String(now.getDate()).padStart(2, '0');
    var mm = String(now.getMonth() + 1).padStart(2, '0');
    var todayTag = dd + '-' + mm;
    return (S.onlineUsers || []).filter(function (w) {
      return w.birthday === todayTag;
    });
  }

  // Komponen Terpadu Time Capsule (dipakai oleh Kalender & Museum)
  function renderCapsuleForm(prefix) {
    var minDate = getFutureDateStr(1);
    return (
      '<div class="grp" style="margin-bottom:14px">' +
        '<div class="rw"><div><b>📦 Kapsul Waktu (Time Capsule)</b><small>Simpan pesan atau harapan buat diri sendiri maupun tongkrongan. Mas Raka bakal ngingetin pas tanggalnya tiba!</small></div></div>' +
      '</div>' +
      '<label>PILIH DURASI CEPAT ATAU TANGGAL BUKA</label>' +
      '<div class="chips" style="margin-bottom:8px">' +
        '<button type="button" class="chip" data-act="tc-preset" data-prefix="' + prefix + '" data-days="7">+7 Hari</button>' +
        '<button type="button" class="chip" data-act="tc-preset" data-prefix="' + prefix + '" data-days="30">+30 Hari</button>' +
        '<button type="button" class="chip" data-act="tc-preset" data-prefix="' + prefix + '" data-days="180">+6 Bulan</button>' +
        '<button type="button" class="chip" data-act="tc-preset" data-prefix="' + prefix + '" data-days="365">+1 Tahun</button>' +
      '</div>' +
      '<input id="' + prefix + '-tc-date" type="date" min="' + minDate + '" value="' + getFutureDateStr(30) + '">' +
      '<label>PESAN UNTUK MASA DEPAN</label>' +
      '<textarea id="' + prefix + '-tc-msg" maxlength="300" placeholder="Semoga pas kapsul ini kebuka, semua target tahun ini udah tercapai..."></textarea>' +
      '<button class="btn" data-act="tc-save" data-prefix="' + prefix + '">🔒 KUNCI KAPSUL WAKTU</button>'
    );
  }

  function renderKalender() {
    var u = S.user || {};
    var events = S.events || [];
    var bdayToday = getTodayBdayWarga();

    var bdayCelebration = bdayToday.length
      ? '<div class="grp" style="margin-bottom:14px;border:1px solid rgba(255,214,51,.35);background:linear-gradient(135deg,#FFD63322,#101827)">' +
          '<div class="rw">' +
            '<div>' +
              '<b style="color:#FFD633">🎉 Lagi Ultah Hari Ini!</b>' +
              '<small>' + bdayToday.map(function (w) { return C.esc(w.name); }).join(', ') + ' — yuk kasih ucapan di grup!</small>' +
            '</div>' +
            '<span style="font-size:22px">🥳</span>' +
          '</div>' +
        '</div>'
      : '';

    var filteredEvents = events.filter(function (ev) {
      if (eventFilter === 'ALL') return true;
      var tp = (ev.type || '').toUpperCase();
      if (eventFilter === 'MABAR') return /MABAR|OS|VOICE|GAME|EVENT/.test(tp);
      if (eventFilter === 'AWARD') return /AWARD|GIVEAWAY|LOMBA/.test(tp);
      return true;
    });

    var filterChips =
      '<div class="chips" style="margin-bottom:12px">' +
        '<button class="chip' + (eventFilter === 'ALL' ? ' on' : '') + '" data-act="kl-filter" data-val="ALL">Semua Agenda</button>' +
        '<button class="chip' + (eventFilter === 'MABAR' ? ' on' : '') + '" data-act="kl-filter" data-val="MABAR">🎮 Mabar & OS</button>' +
        '<button class="chip' + (eventFilter === 'AWARD' ? ' on' : '') + '" data-act="kl-filter" data-val="AWARD">🏆 Awards & Event</button>' +
      '</div>';

    return (
      bdayCelebration +
      '<div class="grp" style="margin-bottom:16px;background:linear-gradient(135deg,#5AC8FA26,#101827)">' +
        '<div class="rw">' +
          '<div>' +
            '<b>🎂 Birthday Club</b>' +
            '<small>' + (u.birthday ? 'Tercatat: ' + C.esc(u.birthday) + ' (Otomatis dirayain Mas Raka)' : 'Simpan tanggal ultah lo buat dapet bonus PSC & ucapan spesial!') + '</small>' +
          '</div>' +
          '<button class="pill" data-act="kl-bday-sheet">' + (u.birthday ? 'Ubah' : 'Set Ultah') + '</button>' +
        '</div>' +
      '</div>' +

      '<h3 class="gh">AGENDA & EVENT TONGKRONGAN</h3>' +
      filterChips +
      '<div class="grp">' +
        (filteredEvents.length
          ? filteredEvents.map(function (ev) {
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
                    '<small style="color:var(--yel)">Apresiasi: ' + C.esc(ev.rewardText || 'PSC & Street Cred') + '</small>' +
                    '<button class="pill" style="' + (isJoined ? '' : 'background:#34C759;color:#000;font-weight:800') + '" data-act="kl-rsvp" data-id="' + C.esc(ev.id) + '"' + (isJoined ? ' disabled' : '') + '>' + (isJoined ? '✅ TERDAFTAR' : '🙌 IKUT GABUNG') + '</button>' +
                  '</div>' +
                '</div>'
              );
            }).join('')
          : '<div class="rw"><small>Belum ada jadwal event di kategori ini cuy. Pantau terus info dari pengurus ya!</small></div>') +
      '</div>'
    );
  }

  function renderKapsul() {
    return renderCapsuleForm('kl');
  }

  function openBirthdaySheet() {
    C.sheet(
      '<h2>🎂 Birthday Club</h2>' +
      '<p class="sub">Opsional & sukarela. Pas hari H, <i>Mas Raka</i> bakal ngucapin selamat ulang tahun dan ngirim bonus PSC ke dompet lo.</p>' +
      '<label>TANGGAL ULANG TAHUN (DD-MM)</label>' +
      '<input id="bd-val" placeholder="contoh: 17-08" maxlength="5" value="' + C.esc((S.user && S.user.birthday) || '') + '">' +
      '<button class="btn" data-act="kl-bday-save">SIMPAN TANGGAL ULTAH</button>'
    );
  }

  C.renderCapsuleForm = renderCapsuleForm;
  C.Views.event = renderKalender;
  C.Views.kapsul = renderKapsul;

  if (window.__punkKalenderBound) return;
  window.__punkKalenderBound = true;

  document.addEventListener('click', async function (e) {
    var t = e.target.closest('[data-act]');
    if (!t || t.disabled) return;
    var act = t.getAttribute('data-act');

    if (act === 'kl-filter') {
      eventFilter = t.getAttribute('data-val') || 'ALL';
      C.refresh();
    } else if (act === 'kl-bday-sheet') {
      openBirthdaySheet();
    } else if (act === 'kl-bday-save') {
      var val = (document.getElementById('bd-val').value || '').trim();
      if (!/^\d{2}-\d{2}$/.test(val)) {
        C.notify('Mas Raka', 'Cek Format Tanggal', 'Gunakan format DD-MM ya cuy, contoh: 24-11');
        return;
      }
      t.disabled = true;
      try {
        var res = await API.post('/api/profile/birthday', { birthday: val });
        S.user = res.user;
        C.shut();
        C.refresh();
        C.notify('Mas Raka', 'Birthday Club 🎂', 'Sip, tanggal ultah ' + val + ' udah dicatat rapi!');
      } catch (err) {
        t.disabled = false;
        C.notify('Mas Raka', 'Belum Berhasil', err.message);
      }
    } else if (act === 'kl-rsvp') {
      var id = t.getAttribute('data-id');
      t.disabled = true;
      try {
        var rRes = await API.post('/api/events/rsvp', { eventId: id });
        if (rRes.events) S.events = rRes.events;
        C.refresh();
        C.notify('Mas Raka', 'RSVP Tercatat 🙌', 'Mantap! Nama lo udah masuk daftar peserta event.');
      } catch (err) {
        t.disabled = false;
        C.notify('Mas Raka', 'Info Event', err.message);
      }
    } else if (act === 'tc-preset') {
      var pref = t.getAttribute('data-prefix') || 'kl';
      var days = Number(t.getAttribute('data-days')) || 30;
      var dateInp = document.getElementById(pref + '-tc-date');
      if (dateInp) dateInp.value = getFutureDateStr(days);
    } else if (act === 'tc-save') {
      var pfx = t.getAttribute('data-prefix') || 'kl';
      var dtEl = document.getElementById(pfx + '-tc-date');
      var msgEl = document.getElementById(pfx + '-tc-msg');
      var dt = dtEl ? dtEl.value.trim() : '';
      var msg = msgEl ? msgEl.value.trim() : '';
      if (!dt || msg.length < 5) {
        C.notify('Mas Raka', 'Cek Isian', 'Pilih tanggal buka dan tulis pesan minimal 5 huruf ya cuy.');
        return;
      }
      t.disabled = true;
      try {
        await API.post('/api/capsule', { unlockDate: dt, message: msg });
        if (msgEl) msgEl.value = '';
        C.notify('Mas Raka', 'Kapsul Terkunci 🔒', 'Sip, pesan masa depan lo dikunci aman sampai ' + dt + '!');
      } catch (err) {
        C.notify('Mas Raka', 'Belum Berhasil', err.message);
      } finally {
        t.disabled = false;
      }
    }
  });
})();
