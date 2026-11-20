(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;

  var pbState = {
    img: null,
    frame: 'blue',
    caption: ''
  };

  var FRAMES = {
    blue:   { name: 'Blue Street', bg: '#101827', border: '#176BFF', accent: '#FFD633' },
    yellow: { name: 'Yellow Riot', bg: '#1a1500', border: '#FFD633', accent: '#176BFF' },
    y2k:    { name: 'Cyber Y2K',   bg: '#1b1044', border: '#FF6AC1', accent: '#5AC8FA' },
    aero:   { name: 'Aero Glass',  bg: '#0b2a6e', border: '#8FC7FF', accent: '#FFFFFF' }
  };

  function renderMuseum() {
    var tab = S.curTab.museum || 'booth';

    var tabsHtml =
      '<div class="tabs">' +
        '<button class="tab' + (tab === 'booth' ? ' on' : '') + '" data-act="ms-tab" data-tab="booth">📸 Bilik Foto</button>' +
        '<button class="tab' + (tab === 'capsule' ? ' on' : '') + '" data-act="ms-tab" data-tab="capsule">📦 Time Capsule</button>' +
        '<button class="tab' + (tab === 'wall' ? ' on' : '') + '" data-act="ms-tab" data-tab="wall">🏛️ Memory Wall</button>' +
      '</div>';

    if (tab === 'booth') {
      return (
        tabsHtml +
        '<div class="grp" style="margin-bottom:14px">' +
          '<div class="rw"><div><b>📸 Photobooth Punkshit</b><small>Tanpa filter aneh-aneh, jaga keaslian muka tongkrongan. Ekspor PNG siap share!</small></div></div>' +
        '</div>' +

        '<input type="file" id="pb-file" accept="image/png,image/jpeg,image/webp" hidden>' +
        '<button class="btn b2" style="margin-top:0;margin-bottom:12px" data-act="ms-pick-photo">📁 Pilih Foto dari Galeri</button>' +

        '<label>PILIH FRAME</label>' +
        '<div class="chips" style="margin-bottom:10px">' +
          Object.keys(FRAMES).map(function (k) {
            return '<button class="chip' + (pbState.frame === k ? ' on' : '') + '" data-act="ms-frame" data-k="' + k + '">' + FRAMES[k].name + '</button>';
          }).join('') +
        '</div>' +

        '<label>CAPTION / NICKNAME DI FOTO</label>' +
        '<input id="pb-cap" maxlength="36" placeholder="mis. Nongki Malam Jumat" value="' + C.esc(pbState.caption || S.user.name) + '">' +

        '<canvas id="pb-cv" class="pb-canvas" width="600" height="750"></canvas>' +
        '<button class="btn" data-act="ms-export">💾 SIMPAN / UNDUH PNG</button>'
      );
    }

    if (tab === 'capsule') {
      return (
        tabsHtml +
        '<div class="grp" style="margin-bottom:14px">' +
          '<div class="rw"><div><b>📦 Time Capsule</b><small>Tulis pesan buat diri sendiri atau warga masa depan. Mas Raka bakal buka pas waktunya tiba.</small></div></div>' +
        '</div>' +
        '<label>BUKA PADA TANGGAL</label>' +
        '<input id="tc-date" type="date">' +
        '<label>PESAN UNTUK MASA DEPAN</label>' +
        '<textarea id="tc-msg" maxlength="300" placeholder="Semoga pas pesan ini kebuka, saldo udah nggak sekarat..."></textarea>' +
        '<button class="btn" data-act="ms-capsule-save">KUNCI TIME CAPSULE</button>'
      );
    }

    return (
      tabsHtml +
      '<div class="grp">' +
        '<div class="rw"><div><b>Some moments deserve to stay.</b><small>Arsip kenangan, quote ikonik, dan dokumentasi event pilihan pengurus tayang di Channel resmi Punkshit.</small></div></div>' +
      '</div>'
    );
  }

  function drawPhotobooth() {
    var cv = document.getElementById('pb-cv');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var fr = FRAMES[pbState.frame] || FRAMES.blue;

    ctx.fillStyle = fr.bg;
    ctx.fillRect(0, 0, 600, 750);

    ctx.strokeStyle = fr.border;
    ctx.lineWidth = 18;
    ctx.strokeRect(9, 9, 582, 732);

    ctx.fillStyle = '#080B12';
    ctx.fillRect(40, 46, 520, 520);

    if (pbState.img) {
      var iw = pbState.img.width;
      var ih = pbState.img.height;
      var scale = Math.max(520 / iw, 520 / ih);
      var nw = iw * scale;
      var nh = ih * scale;
      var ox = 40 + (520 - nw) / 2;
      var oy = 46 + (520 - nh) / 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(40, 46, 520, 520);
      ctx.clip();
      ctx.drawImage(pbState.img, ox, oy, nw, nh);
      ctx.restore();
    } else {
      ctx.fillStyle = '#929BAE';
      ctx.font = '600 22px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Tap "Pilih Foto dari Galeri"', 300, 310);
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = fr.accent;
    ctx.font = '800 26px -apple-system, sans-serif';
    ctx.fillText('PUNKSHIT.OS // PHOTOBOOTH', 42, 622);

    ctx.fillStyle = '#F5F7FC';
    ctx.font = '600 22px -apple-system, sans-serif';
    var cap = (document.getElementById('pb-cap') && document.getElementById('pb-cap').value) || S.user.name;
    ctx.fillText(cap, 42, 662);

    ctx.fillStyle = '#929BAE';
    ctx.font = '500 17px ui-monospace, monospace';
    ctx.fillText((S.user.memberNo || 'PSK-0001') + ' • ' + new Date().toLocaleDateString('id-ID'), 42, 700);
  }

  // Meme Board dengan indikator file terpilih & support JPG/PNG/WEBP/GIF/WEBM
  function renderMeme() {
    return (
      '<div class="grp" style="margin-bottom:14px">' +
        '<div class="rw"><div><b>🖼️ Meme Board</b><small>Kirim meme tongkrongan (Gambar, GIF, atau WebM). Meme terbaik otomatis masuk Channel!</small></div></div>' +
      '</div>' +
      '<input type="file" id="mm-file" accept="image/png,image/jpeg,image/webp,image/gif,video/webm,.gif,.webm" hidden>' +
      '<div class="up-box" data-act="mm-pick" style="margin-bottom:12px">' +
        '<div id="mm-file-status" style="font-size:13px;font-weight:600;color:var(--gblue)">📁 Tap di Sini untuk Pilih File Meme (Belum ada file)</div>' +
        '<small style="color:var(--mut);font-size:11px">Mendukung JPG, PNG, WEBP, GIF & WEBM (Maks. 10MB)</small>' +
      '</div>' +
      '<div id="mm-prev-wrap" style="display:none;margin-bottom:12px;text-align:center"></div>' +
      '<input id="mm-cap" maxlength="90" placeholder="Caption meme (opsional)">' +
      '<button class="btn" data-act="mm-upload">UNGGAH MEME KE MARKAS</button>'
    );
  }

  // Pasal & Help Dinamis
  function renderRules() {
    var rh = S.rulesHelp || {};
    var pasalTxt = C.esc(
      rh.pasal ||
      '1. Saling hargai sesama warga markas.\n2. Dilarang spam link judi, scam, atau SARA.\n3. Gunakan fitur Radio Gang dengan tertib saat OS.\n4. Langgar aturan? Siap-siap disidang warga.'
    ).replace(/\n/g, '<br>');

    var helpTxt = C.esc(
      rh.help ||
      '• Cetak PunkID: Buka menu PunkID Gue untuk atur profil & foto.\n• Nitip Lagu OS: Kirim link Spotify di Radio Gang atau kirim file MP3 langsung ke PC Mas Raka.\n• Lapak Warga: Pajang barang, jasa, stiker, atau GIF di etalase.'
    ).replace(/\n/g, '<br>');

    return (
      '<h3 class="gh">📜 PASAL & ATURAN TONGKRONGAN</h3>' +
      '<div class="grp" style="padding:14px;margin-bottom:16px">' +
        '<div style="font-size:13.5px;line-height:1.65;color:#dbe4f6">' + pasalTxt + '</div>' +
      '</div>' +
      '<h3 class="gh">🆘 PUSAT BANTUAN (HELP)</h3>' +
      '<div class="grp" style="padding:14px">' +
        '<div style="font-size:13.5px;line-height:1.65;color:#dbe4f6">' + helpTxt + '</div>' +
      '</div>'
    );
  }

  C.Views.museum = function () {
    setTimeout(drawPhotobooth, 30);
    return renderMuseum();
  };
  C.Views.meme = renderMeme;
  C.Views.rules = renderRules;

  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'pb-cap') {
      pbState.caption = e.target.value;
      drawPhotobooth();
    }
  });

  document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'pb-file') {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var img = new Image();
      img.onload = function () {
        pbState.img = img;
        drawPhotobooth();
      };
      img.src = URL.createObjectURL(file);
    }

    if (e.target && e.target.id === 'mm-file') {
      var mFile = e.target.files && e.target.files[0];
      var statusEl = document.getElementById('mm-file-status');
      var prevWrap = document.getElementById('mm-prev-wrap');
      if (!mFile) {
        if (statusEl) {
          statusEl.textContent = '📁 Tap di Sini untuk Pilih File Meme (Belum ada file)';
          statusEl.style.color = 'var(--gblue)';
        }
        if (prevWrap) prevWrap.style.display = 'none';
        return;
      }

      if (statusEl) {
        statusEl.innerHTML = '✅ File dipilih: <b>' + C.esc(mFile.name) + '</b> (' + Math.max(1, Math.round(mFile.size / 1024)) + ' KB)';
        statusEl.style.color = '#34C759';
      }
      if (prevWrap) {
        var objUrl = URL.createObjectURL(mFile);
        prevWrap.style.display = 'block';
        if (/\.webm$/i.test(mFile.name) || mFile.type === 'video/webm') {
          prevWrap.innerHTML = '<video src="' + objUrl + '" autoplay loop muted playsinline style="max-height:180px;border-radius:12px;border:1px solid rgba(255,255,255,.15)"></video>';
        } else {
          prevWrap.innerHTML = '<img src="' + objUrl + '" style="max-height:180px;border-radius:12px;border:1px solid rgba(255,255,255,.15)">';
        }
      }
    }
  });

  document.addEventListener('click', async function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var act = t.getAttribute('data-act');

    if (act === 'ms-tab') {
      S.curTab.museum = t.getAttribute('data-tab');
      C.refresh();
    } else if (act === 'ms-pick-photo') {
      var f = document.getElementById('pb-file');
      if (f) f.click();
    } else if (act === 'ms-frame') {
      pbState.frame = t.getAttribute('data-k');
      C.refresh();
    } else if (act === 'ms-export') {
      var cv = document.getElementById('pb-cv');
      if (!cv) return;
      var link = document.createElement('a');
      link.download = 'punkshit-booth-' + Date.now() + '.png';
      link.href = cv.toDataURL('image/png');
      link.click();
      C.notify('Mas Raka', 'Photobooth', 'Foto PNG berhasil diekspor!');
    } else if (act === 'ms-capsule-save') {
      var dt = document.getElementById('tc-date').value;
      var msg = (document.getElementById('tc-msg').value || '').trim();
      if (!dt || msg.length < 5) {
        C.notify('Mas Raka', 'Validasi', 'Isi tanggal buka dan pesan minimal 5 karakter.');
        return;
      }
      t.disabled = true;
      try {
        await API.post('/api/capsule', { unlockDate: dt, message: msg });
        document.getElementById('tc-msg').value = '';
        C.notify('Mas Raka', 'Time Capsule', 'Pesan dikunci rapat sampai ' + dt + '!');
      } catch (err) {
        C.notify('Mas Raka', 'Gagal', err.message);
      } finally {
        t.disabled = false;
      }
    } else if (act === 'mm-pick') {
      var mf = document.getElementById('mm-file');
      if (mf) mf.click();
    } else if (act === 'mm-upload') {
      var mInp = document.getElementById('mm-file');
      var mFile = mInp && mInp.files && mInp.files[0];
      if (!mFile) {
        C.notify('Mas Raka', 'Pilih File', 'Pilih gambar, GIF, atau WebM meme dulu bro.');
        return;
      }
      t.disabled = true;
      t.textContent = 'Mengunggah...';
      try {
        var fd = new FormData();
        fd.append('meme', mFile);
        fd.append('caption', (document.getElementById('mm-cap').value || '').trim());
        await API.upload('/api/meme', fd);
        mInp.value = '';
        C.refresh();
        C.notify('Mas Raka', '→ Grup Punkshit', 'NEW MEME JUST DROPPED! Meme lo udah diunggah.');
      } catch (err) {
        t.disabled = false;
        t.textContent = 'UNGGAH MEME KE MARKAS';
        C.notify('Mas Raka', 'Gagal Upload', err.message);
      }
    }
  });
})();
