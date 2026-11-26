(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;
  var M = window.PunkMuseumMod;

  function renderMuseum() {
    var tab = S.curTab.museum || 'booth';
    var u = S.user || {};

    var tabsHtml =
      '<div class="tabs">' +
        '<button class="tab' + (tab === 'booth' ? ' on' : '') + '" data-act="ms-tab" data-tab="booth">📸 Bilik Foto</button>' +
        '<button class="tab' + (tab === 'capsule' ? ' on' : '') + '" data-act="ms-tab" data-tab="capsule">📦 Time Capsule</button>' +
        '<button class="tab' + (tab === 'wall' ? ' on' : '') + '" data-act="ms-tab" data-tab="wall">🏛️ Memory Wall</button>' +
      '</div>';

    if (tab === 'booth') {
      var defTitle = M.pbState.title || 'Midnight Hangout';
      var defArtist = M.pbState.artist || (u.name || 'Warga Markas');

      return (
        tabsHtml +
        '<div class="grp" style="margin-bottom:14px">' +
          '<div class="rw"><div><b>🎵 Photobooth Cover & Spotify Style</b><small>Bikin kartu foto ala cover album & pemutar lagu. Unduh PNG atau kirim ke Board & Channel Info!</small></div></div>' +
        '</div>' +

        '<input type="file" id="pb-file" accept="image/png,image/jpeg,image/webp" hidden>' +
        '<div style="display:flex;gap:8px;margin-bottom:12px">' +
          '<button class="btn b2" style="margin-top:0;flex:1" data-act="ms-pick-photo">📁 Pilih Foto dari Galeri</button>' +
          (M.pbState.img ? '<button class="btn b2" style="margin-top:0;width:auto;padding:0 14px" data-act="ms-reset-photo">🔄 Reset</button>' : '') +
        '</div>' +

        '<label>GAYA KARTU / COVER</label>' +
        '<div class="chips" style="margin-bottom:10px">' +
          Object.keys(M.STYLES).map(function (k) {
            return '<button class="chip' + (M.pbState.style === k ? ' on' : '') + '" data-act="ms-style" data-k="' + k + '">' + M.STYLES[k].name + '</button>';
          }).join('') +
        '</div>' +

        '<label>TONE / FILTER FOTO</label>' +
        '<div class="chips" style="margin-bottom:10px">' +
          M.FILTERS.map(function (fl) {
            return '<button class="chip' + (M.pbState.filter === fl.id ? ' on' : '') + '" data-act="ms-filter" data-f="' + fl.id + '">' + fl.name + '</button>';
          }).join('') +
        '</div>' +

        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
          '<div>' +
            '<label>JUDUL LAGU / MOMEN</label>' +
            '<input id="pb-title" maxlength="32" placeholder="mis. After Hours" value="' + C.esc(defTitle) + '">' +
          '</div>' +
          '<div>' +
            '<label>ARTIS / NAMA LO</label>' +
            '<input id="pb-artist" maxlength="30" placeholder="mis. Ken" value="' + C.esc(defArtist) + '">' +
          '</div>' +
        '</div>' +

        '<canvas id="pb-cv" class="pb-canvas" width="600" height="780"></canvas>' +

        '<div style="display:flex;align-items:center;justify-content:center;gap:8px;margin:8px 0">' +
          '<button type="button" class="pill" style="font-size:11px" data-act="ms-toggle-play">' + (M.pbState.playing ? '⏸ Pause Icon' : '▶️ Play Icon') + '</button>' +
          '<button type="button" class="pill" style="font-size:11px;background:rgba(255,255,255,.1)" data-act="ms-shuffle-bar">🔀 Geser Durasi</button>' +
        '</div>' +

        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px">' +
          '<button class="btn b2" style="margin-top:0" data-act="ms-export">💾 Simpan Gambar</button>' +
          '<button class="btn" style="margin-top:0" data-act="ms-post-board">🚀 Kirim ke Board & CH</button>' +
        '</div>'
      );
    }

    if (tab === 'capsule') {
      return (
        tabsHtml +
        '<div class="grp" style="margin-bottom:14px">' +
          '<div class="rw"><div><b>📦 Kapsul Waktu Markas</b><small>Tulis pesan buat diri lo sendiri atau anak-anak tongkrongan di masa depan. Pesan terkunci rapat sampai tanggal yang lo tentuin!</small></div></div>' +
        '</div>' +
        '<label for="cap-date">TANGGAL BUKA SEGEL</label>' +
        '<input id="cap-date" type="date" min="' + M.getTomorrowStr() + '" value="' + M.getTomorrowStr() + '">' +
        '<label for="cap-msg">ISI PESAN KAPSUL</label>' +
        '<textarea id="cap-msg" rows="4" maxlength="280" placeholder="Tulis harapan, prediksi, atau pesan rahasia buat masa depan..."></textarea>' +
        '<button class="btn" data-act="core-capsule">🔒 SEGEL KAPSUL WAKTU</button>'
      );
    }

    var feedItems = (S.feed || []).slice(0, 8);
    var feedHtml = feedItems.length
      ? feedItems.map(function (f) {
          var tStr = f.createdAt ? new Date(f.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'Arsip';
          return '<div class="rw"><div><b>📌 ' + C.esc(f.text) + '</b><small>Tercatat di log markas · ' + C.esc(tStr) + '</small></div></div>';
        }).join('')
      : '<div class="rw"><small>Belum ada catatan arsip terbaru di markas.</small></div>';

    return (
      tabsHtml +
      '<div class="grp" style="margin-bottom:12px">' +
        '<div class="rw"><div><b>🏛️ Some moments deserve to stay.</b><small>Arsip kenangan, quote ikonik, dan dokumentasi event pilihan pengurus tayang di Channel Info resmi Punkshit.</small></div></div>' +
      '</div>' +
      '<div class="grp" style="margin-bottom:14px">' +
        '<div class="rw">' +
          '<div><b>🖼️ Kirim Momen ke Meme & Galeri Board</b><small>Punya foto atau meme seru bareng warga? Unggah biar masuk arsip!</small></div>' +
          '<button class="pill" data-act="app" data-id="meme">Buka Board</button>' +
        '</div>' +
      '</div>' +
      '<h3 class="gh">JEJAK ARSIP MARKAS TERBARU</h3>' +
      '<div class="grp">' + feedHtml + '</div>'
    );
  }

  function renderMeme() {
    return (
      '<div class="grp" style="margin-bottom:14px">' +
        '<div class="rw"><div><b>🖼️ Meme & Galeri Board</b><small>Bagikan meme atau momen seru tongkrongan (Gambar, GIF, atau WebM). Otomatis dikirim ke Grup & Channel Info!</small></div></div>' +
      '</div>' +
      '<input type="file" id="mm-file" accept="image/png,image/jpeg,image/webp,image/gif,video/webm,.gif,.webm" hidden>' +
      '<div class="up-box" data-act="mm-pick" style="margin-bottom:12px">' +
        '<div id="mm-file-status" style="font-size:13px;font-weight:600;color:var(--gblue)">📁 Tap di Sini untuk Pilih File (Belum ada file)</div>' +
        '<small style="color:var(--mut);font-size:11px">Mendukung JPG, PNG, WEBP, GIF & WEBM (Maks. 10MB)</small>' +
      '</div>' +
      '<div id="mm-prev-wrap" style="display:none;margin-bottom:12px;text-align:center"></div>' +
      '<input id="mm-cap" maxlength="90" placeholder="Caption singkat (opsional)">' +
      '<button class="btn" data-act="mm-upload">UNGGAH KE GRUP & CHANNEL</button>'
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
    setTimeout(M.drawPhotobooth, 30);
    return renderMuseum();
  };
  C.Views.meme = renderMeme;
  C.Views.rules = renderRules;

  if (window.__punkMuseumBound) return;
  window.__punkMuseumBound = true;

  document.addEventListener('input', function (e) {
    if (!e.target) return;
    if (e.target.id === 'pb-title') {
      M.pbState.title = e.target.value;
      M.drawPhotobooth();
    } else if (e.target.id === 'pb-artist') {
      M.pbState.artist = e.target.value;
      M.drawPhotobooth();
    }
  });

  document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'pb-file') {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var img = new Image();
      img.onload = function () {
        M.pbState.img = img;
        M.pbState.dominantRgb = M.extractDominantColor(img);
        M.drawPhotobooth();
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
      M.pbState.img = null;
      M.pbState.dominantRgb = [29, 185, 84];
      M.pbState.filter = 'none';
      C.refresh();
    } else if (act === 'ms-style') {
      M.pbState.style = t.getAttribute('data-k') || 'spotify';
      C.refresh();
    } else if (act === 'ms-filter') {
      M.pbState.filter = t.getAttribute('data-f');
      C.refresh();
    } else if (act === 'ms-toggle-play') {
      M.pbState.playing = !M.pbState.playing;
      t.textContent = M.pbState.playing ? '⏸ Pause Icon' : '▶️ Play Icon';
      M.drawPhotobooth();
    } else if (act === 'ms-shuffle-bar') {
      M.pbState.progress = Math.round((0.15 + Math.random() * 0.72) * 100) / 100;
      M.drawPhotobooth();
    } else if (act === 'ms-export') {
      var cv = document.getElementById('pb-cv');
      if (!cv) return;
      
      cv.toBlob(function (blob) {
        var file = new File([blob], 'punkshit-cover-' + Date.now() + '.png', { type: 'image/png' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({
            files: [file],
            title: 'Punkshit Cover',
            text: 'Cover Photobooth PUNKSHIT.OS'
          }).catch(function () {});
        } else {
          var dataUrl = cv.toDataURL('image/png');
          var w = window.open('');
          if (w) {
            w.document.write(
              '<html><head><title>Simpan Cover Photobooth</title></head>' +
              '<body style="background:#0b0d11;margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;color:#fff;font-family:sans-serif;padding:16px;text-align:center">' +
              '<p style="font-size:14px;margin-bottom:12px;color:#38bdf8;font-weight:600">Tekan dan tahan (Long Press) gambar di bawah, lalu pilih <b>Simpan ke Foto</b> atau <b>Download Image</b></p>' +
              '<img src="' + dataUrl + '" style="max-width:100%;max-height:75vh;border-radius:14px;box-shadow:0 12px 35px rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.15)">' +
              '</body></html>'
            );
          } else {
            var link = document.createElement('a');
            link.download = 'punkshit-cover-' + Date.now() + '.png';
            link.href = dataUrl;
            link.click();
          }
        }
      }, 'image/png');

      C.notify('Mas Raka', 'Photobooth 📸', 'Cover siap disimpan! Pilih Simpan ke Foto di menu HP lo.');
    } else if (act === 'ms-post-board') {
      if (!M.pbState.img) {
        C.notify('Mas Raka', 'Pilih Foto Dulu', 'Pilih foto dulu sebelum kirim hasil Photobooth ke Board!');
        return;
      }
      var cvBoard = document.getElementById('pb-cv');
      if (!cvBoard) return;
      t.disabled = true;
      t.textContent = 'Mengirim...';
      try {
        var blob = await new Promise(function (resolve) { cvBoard.toBlob(resolve, 'image/png'); });
        var fd = new FormData();
        fd.append('meme', blob, 'photobooth-' + Date.now() + '.png');
        var tVal = (document.getElementById('pb-title').value || '').trim();
        var aVal = (document.getElementById('pb-artist').value || '').trim();
        var capLabel = tVal ? (tVal + (aVal ? ' — ' + aVal : '')) : ((S.user && S.user.name) || 'Warga Markas');
        fd.append('caption', '🎵 Photobooth: ' + capLabel);
        fd.append('target', 'both');
        await API.upload('/api/meme', fd);
        C.notify('Mas Raka', '→ Grup & CH Info 📸', 'Mantap! Hasil Photobooth lo udah dikirim ke Grup & Channel Info!');
      } catch (err) {
        C.notify('Mas Raka', 'Belum Berhasil', err.message);
      } finally {
        t.disabled = false;
        t.textContent = '🚀 Kirim ke Board & CH';
      }
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
        fd.append('target', 'both');
        await API.upload('/api/meme', fd);
        mInp.value = '';
        C.refresh();
        C.notify('Mas Raka', '→ Grup & CH Info 🖼️', 'Mantap! Karya lo udah meluncur ke Grup & Channel Info!');
      } catch (err) {
        t.disabled = false;
        t.textContent = 'UNGGAH KE GRUP & CHANNEL';
        C.notify('Mas Raka', 'Belum Berhasil', err.message);
      }
    }
  });
})();
