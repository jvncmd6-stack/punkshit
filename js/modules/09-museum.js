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

    // Memory Wall
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

    // Background & Border
    ctx.fillStyle = fr.bg;
    ctx.fillRect(0, 0, 600, 750);

    ctx.strokeStyle = fr.border;
    ctx.lineWidth = 18;
    ctx.strokeRect(9, 9, 582, 732);

    // Area Foto (520x520)
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

    // Watermark & Caption Bawah
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

  function renderMeme() {
    return (
      '<div class="grp" style="margin-bottom:14px">' +
        '<div class="rw"><div><b>🖼️ Meme Board</b><small>Kirim meme tongkrongan. Meme terbaik minggu ini otomatis masuk Channel!</small></div></div>' +
      '</div>' +
      '<input type="file" id="mm-file" accept="image/png,image/jpeg,image/webp" hidden>' +
      '<button class="btn b2" style="margin-top:0;margin-bottom:10px" data-act="mm-pick">📁 Pilih Gambar Meme</button>' +
      '<input id="mm-cap" maxlength="90" placeholder="Caption meme (opsional)">' +
      '<button class="btn" data-act="mm-upload">UNGGAH MEME KE MARKAS</button>'
    );
  }

  var origOpenApp = C.openApp;
  C.Views.museum = function () {
    setTimeout(drawPhotobooth, 30);
    return renderMuseum();
  };
  C.Views.meme = renderMeme;

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
        C.notify('Mas Raka', 'Pilih Gambar', 'Pilih gambar meme dulu bro.');
        return;
      }
      t.disabled = true;
      try {
        var fd = new FormData();
        fd.append('meme', mFile);
        fd.append('caption', (document.getElementById('mm-cap').value || '').trim());
        await API.upload('/api/meme', fd);
        C.notify('Mas Raka', '→ Grup Punkshit', 'NEW MEME JUST DROPPED! Meme lo udah diunggah.');
      } catch (err) {
        C.notify('Mas Raka', 'Gagal Upload', err.message);
      } finally {
        t.disabled = false;
      }
    }
  });
})();
