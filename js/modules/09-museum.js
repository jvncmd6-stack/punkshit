(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;

  var pbState = {
    img: null,
    frame: 'crimson',
    filter: 'none',
    caption: ''
  };

  var FRAMES = {
    crimson: { name: 'Crimson Mono', bg: '#0c0c0e', border: '#DC2626', accent: '#F5F5F7' },
    blue:    { name: 'Blue Street',  bg: '#101827', border: '#176BFF', accent: '#FFD633' },
    yellow:  { name: 'Amber Riot',   bg: '#1a1500', border: '#FFD633', accent: '#38BDF8' },
    y2k:     { name: 'Cyber Y2K',    bg: '#1b1044', border: '#FF6AC1', accent: '#5AC8FA' },
    aero:    { name: 'Aero Glass',   bg: '#0b2a6e', border: '#8FC7FF', accent: '#FFFFFF' }
  };

  var FILTERS = [
    { id: 'none', name: 'Original', css: 'none' },
    { id: 'noir', name: 'B&W Contrast', css: 'grayscale(100%) contrast(125%)' },
    { id: 'warm', name: 'Retro Film', css: 'sepia(35%) contrast(108%) saturate(115%)' },
    { id: 'cool', name: 'Midnight Cool', css: 'contrast(112%) saturate(120%) hue-rotate(-10deg)' }
  ];

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
          '<div class="rw"><div><b>📸 Photobooth Punkshit</b><small>Abadikan momen tongkrongan dengan frame & tone khas markas. Ekspor PNG siap share!</small></div></div>' +
        '</div>' +

        '<input type="file" id="pb-file" accept="image/png,image/jpeg,image/webp" hidden>' +
        '<div style="display:flex;gap:8px;margin-bottom:12px">' +
          '<button class="btn b2" style="margin-top:0;flex:1" data-act="ms-pick-photo">📁 Pilih Foto dari Galeri</button>' +
          (pbState.img ? '<button class="btn b2" style="margin-top:0;width:auto;padding:0 14px" data-act="ms-reset-photo">🔄 Reset</button>' : '') +
        '</div>' +

        '<label>PILIH FRAME</label>' +
        '<div class="chips" style="margin-bottom:10px">' +
          Object.keys(FRAMES).map(function (k) {
            return '<button class="chip' + (pbState.frame === k ? ' on' : '') + '" data-act="ms-frame" data-k="' + k + '">' + FRAMES[k].name + '</button>';
          }).join('') +
        '</div>' +

        '<label>TONE / FILTER VISUAL</label>' +
        '<div class="chips" style="margin-bottom:10px">' +
          FILTERS.map(function (fl) {
            return '<button class="chip' + (pbState.filter === fl.id ? ' on' : '') + '" data-act="ms-filter" data-f="' + fl.id + '">' + fl.name + '</button>';
          }).join('') +
        '</div>' +

        '<label>CAPTION / NICKNAME DI FOTO</label>' +
        '<input id="pb-cap" maxlength="36" placeholder="mis. Nongki Malam Minggu" value="' + C.esc(pbState.caption || (S.user && S.user.name) || '') + '">' +

        '<canvas id="pb-cv" class="pb-canvas" width="600" height="750"></canvas>' +
        '<button class="btn" data-act="ms-export">💾 SIMPAN / UNDUH PNG</button>'
      );
    }

    if (tab === 'capsule') {
      var capBody = typeof C.renderCapsuleForm === 'function'
        ? C.renderCapsuleForm('ms')
        : '<div class="grp"><div class="rw"><small>Memuat formulir Kapsul Waktu...</small></div></div>';
      return tabsHtml + capBody;
    }

    return (
      tabsHtml +
      '<div class="grp" style="margin-bottom:12px">' +
        '<div class="rw"><div><b>🏛️ Some moments deserve to stay.</b><small>Arsip kenangan, quote ikonik, dan dokumentasi event pilihan pengurus tayang di Channel resmi Punkshit.</small></div></div>' +
      '</div>' +
      '<div class="grp">' +
        '<div class="rw">' +
          '<div><b>🖼️ Kirim Momen ke Meme & Galeri Board</b><small>Punya foto atau meme seru bareng warga? Unggah biar masuk arsip!</small></div>' +
          '<button class="pill" data-act="app" data-id="meme">Buka Board</button>' +
        '</div>' +
      '</div>'
    );
  }

  function drawPhotobooth() {
    var cv = document.getElementById('pb-cv');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var fr = FRAMES[pbState.frame] || FRAMES.crimson;
    var flObj = FILTERS.find(function (x) { return x.id === pbState.filter; }) || FILTERS[0];

    ctx.filter = 'none';
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
      ctx.filter = flObj.css;
      ctx.drawImage(pbState.img, ox, oy, nw, nh);
      ctx.restore();
    } else {
      ctx.fillStyle = '#929BAE';
      ctx.font = '600 22px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Tap "Pilih Foto dari Galeri"', 300, 310);
    }

    ctx.filter = 'none';
    ctx.textAlign = 'left';
    ctx.fillStyle = fr.accent;
    ctx.font = '800 26px -apple-system, sans-serif';
    ctx.fillText('PUNKSHIT.OS // PHOTOBOOTH', 42, 622);

    ctx.fillStyle = '#F5F7FC';
    ctx.font = '600 22px -apple-system, sans-serif';
    var capEl = document.getElementById('pb-cap');
    var cap = (capEl && capEl.value) || (S.user && S.user.name) || 'Warga Markas';
    ctx.fillText(cap, 42, 662);

    ctx.fillStyle = '#929BAE';
    ctx.font = '500 17px ui-monospace, monospace';
    ctx.fillText(((S.user && S.user.memberNo) || 'PSK-0001') + ' • ' + new Date().toLocaleDateString('id-ID'), 42, 700);
  }

  function renderMeme() {
    return (
      '<div class="grp" style="margin-bottom:14px">' +
        '<div class="rw"><div><b>🖼️ Meme & Galeri Board</b><small>Bagikan meme atau momen seru tongkrongan (Gambar, GIF, atau WebM). Karya pilihan otomatis tayang di Channel!</small></div></div>' +
      '</div>' +
      '<input type="file" id="mm-file" accept="image/png,image/jpeg,image/webp,image/gif,video/webm,.gif,.webm" hidden>' +
      '<div class="up-box" data-act="mm-pick" style="margin-bottom:12px">' +
        '<div id="mm-file-status" style="font-size:13px;font-weight:600;color:var(--gblue)">📁 Tap di Sini untuk Pilih File (Belum ada file)</div>' +
        '<small style="color:var(--mut);font-size:11px">Mendukung JPG, PNG, WEBP, GIF & WEBM (Maks. 10MB)</small>' +
      '</div>' +
      '<div id="mm-prev-wrap" style="display:none;margin-bottom:12px;text-align:center"></div>' +
      '<input id="mm-cap" maxlength="90" placeholder="Caption singkat (opsional)">' +
      '<button class="btn" data-act="mm-upload">UNGGAH KE MARKAS</button>'
    );
  }

  function renderRules() {
    var rh = S.rulesHelp || {};
    var pasalTxt = C.esc(
      rh.pasal ||
      '1. Saling hargai dan jaga kenyamanan sesama warga markas.\n2. Dilarang spam link judi, scam, maupun konten SARA.\n3. Gunakan fitur Radio Gang & Wanted Board dengan tertib.\n4. Pelanggaran berat akan ditindak pengurus demi kenyamanan bersama.'
    ).replace(/\n/g, '<br>');

    var helpTxt = C.esc(
      rh.help ||
      '• Cetak PunkID: Buka menu PunkID Gue untuk atur profil, banner, dan status nongkrong.\n• Nitip Lagu: Kirim link Spotify di Radio Gang atau kirim MP3 ke PC Mas Raka.\n• Lapak Warga: Pajang karya, barang, jasa, atau stiker di etalase.'
    ).replace(/\n/g, '<br>');

    return (
      '<h3 class="gh">📜 ATURAN & ETIKA TONGKRONGAN</h3>' +
      '<div class="grp" style="padding:14px;margin-bottom:16px">' +
        '<div style="font-size:13.5px;line-height:1.65;color:#dbe4f6">' + pasalTxt + '</div>' +
      '</div>' +
      '<h3 class="gh">🆘 PANDUAN SINGKAT (HELP)</h3>' +
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

  if (window.__punkMuseumBound) return;
  window.__punkMuseumBound = true;

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
          statusEl.textContent = '📁 Tap di Sini untuk Pilih File (Belum ada file)';
          statusEl.style.color = 'var(--gblue)';
        }
        if (prevWrap) prevWrap.style.display = 'none';
        return;
      }

      if (statusEl) {
        statusEl.innerHTML = '✅ File siap: <b>' + C.esc(mFile.name) + '</b> (' + Math.max(1, Math.round(mFile.size / 1024)) + ' KB)';
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
    if (!t || t.disabled) return;
    var act = t.getAttribute('data-act');

    if (act === 'ms-tab') {
      S.curTab.museum = t.getAttribute('data-tab');
      C.refresh();
    } else if (act === 'ms-pick-photo') {
      var f = document.getElementById('pb-file');
      if (f) f.click();
    } else if (act === 'ms-reset-photo') {
      pbState.img = null;
      pbState.filter = 'none';
      C.refresh();
    } else if (act === 'ms-frame') {
      pbState.frame = t.getAttribute('data-k');
      C.refresh();
    } else if (act === 'ms-filter') {
      pbState.filter = t.getAttribute('data-f');
      C.refresh();
    } else if (act === 'ms-export') {
      var cv = document.getElementById('pb-cv');
      if (!cv) return;
      var link = document.createElement('a');
      link.download = 'punkshit-booth-' + Date.now() + '.png';
      link.href = cv.toDataURL('image/png');
      link.click();
      C.notify('Mas Raka', 'Photobooth 📸', 'Sip, foto PNG berhasil disimpan ke perangkat lo!');
    } else if (act === 'mm-pick') {
      var mf = document.getElementById('mm-file');
      if (mf) mf.click();
    } else if (act === 'mm-upload') {
      var mInp = document.getElementById('mm-file');
      var mFile = mInp && mInp.files && mInp.files[0];
      if (!mFile) {
        C.notify('Mas Raka', 'Pilih File Dulu', 'Pilih gambar, GIF, atau WebM dulu ya cuy sebelum unggah.');
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
        C.notify('Mas Raka', '→ Grup Punkshit 🖼️', 'Mantap! Meme baru lo udah meluncur ke markas.');
      } catch (err) {
        t.disabled = false;
        t.textContent = 'UNGGAH KE MARKAS';
        C.notify('Mas Raka', 'Belum Berhasil', err.message);
      }
    }
  });
})();
