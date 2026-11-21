(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;

  var archiveState = {
    loaded: false,
    loading: false,
    items: []
  };

  async function fetchMenfessArchive() {
    if (archiveState.loading) return;
    archiveState.loading = true;
    try {
      var res = await API.get('/api/menfess/archive');
      archiveState.items = res.items || [];
      archiveState.loaded = true;
      var box = document.getElementById('mf-archive-box');
      if (box) box.innerHTML = renderArchiveListHtml();
    } catch (_) {
      // Abaikan error saat offline
    } finally {
      archiveState.loading = false;
    }
  }

  function renderArchiveListHtml() {
    if (!archiveState.loaded && archiveState.loading) {
      return '<div class="grp"><div class="rw"><small>Memuat arsip Kotak Rahasia...</small></div></div>';
    }
    if (!archiveState.items.length) {
      return '<div class="grp"><div class="rw"><small>Belum ada Menfess yang dipublikasikan.</small></div></div>';
    }

    return archiveState.items.map(function (m) {
      var replies = Array.isArray(m.replies) ? m.replies : [];
      var repliesHtml = replies.map(function (r) {
        return (
          '<div style="padding:6px 10px;background:rgba(255,255,255,.04);border-left:2px solid var(--gblue);border-radius:6px;margin-top:6px;font-size:12.5px">' +
            '<small style="color:var(--mut);font-weight:700">Anonim</small>' +
            '<div style="margin-top:2px">' + C.esc(r.reply_text) + '</div>' +
          '</div>'
        );
      }).join('');

      return (
        '<div class="grp" style="margin-bottom:12px">' +
          '<div class="rw" style="flex-direction:column;align-items:flex-start">' +
            '<div style="display:flex;justify-content:space-between;width:100%;margin-bottom:4px">' +
              '<b style="color:var(--yel);font-size:12.5px">📮 ' + C.esc(m.category) + '</b>' +
              '<small>' + replies.length + ' balasan</small>' +
            '</div>' +
            '<div style="font-size:14px;line-height:1.45;margin-bottom:8px">"' + C.esc(m.text) + '"</div>' +
            '<div id="mf-replies-' + C.esc(m.id) + '" style="width:100%">' + repliesHtml + '</div>' +
            '<div style="display:flex;gap:6px;width:100%;margin-top:10px">' +
              '<input id="mf-rep-inp-' + C.esc(m.id) + '" maxlength="160" placeholder="Balas anonim..." style="margin:0;flex:1;padding:8px 10px;font-size:12.5px">' +
              '<button class="pill" data-act="mf-rep-send" data-mid="' + C.esc(m.id) + '">Balas</button>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  window.renderKotakArchiveSection = function () {
    if (!archiveState.loaded && !archiveState.loading) {
      fetchMenfessArchive();
    }
    return (
      '<h3 class="gh" style="margin-top:20px">🗂️ ARSIP MENFESS TERBARU</h3>' +
      '<div id="mf-archive-box">' + renderArchiveListHtml() + '</div>'
    );
  };

  document.addEventListener('click', async function (e) {
    var t = e.target.closest('[data-act="mf-rep-send"]');
    if (!t) return;
    var mid = t.getAttribute('data-mid');
    var inp = document.getElementById('mf-rep-inp-' + mid);
    var txt = inp ? inp.value.trim() : '';
    if (txt.length < 2) {
      C.notify('Mas Raka', 'Validasi', 'Balasan minimal 2 huruf.');
      return;
    }

    t.disabled = true;
    try {
      var res = await API.post('/api/menfess/reply', { menfessId: mid, text: txt });
      if (inp) inp.value = '';
      var targetItem = archiveState.items.find(function (x) { return String(x.id) === String(mid); });
      if (targetItem && res.replies) targetItem.replies = res.replies;
      var repContainer = document.getElementById('mf-replies-' + mid);
      if (repContainer) repContainer.innerHTML = renderArchiveListHtml() ? (res.replies || []).map(function (r) {
        return (
          '<div style="padding:6px 10px;background:rgba(255,255,255,.04);border-left:2px solid var(--gblue);border-radius:6px;margin-top:6px;font-size:12.5px">' +
            '<small style="color:var(--mut);font-weight:700">Anonim</small>' +
            '<div style="margin-top:2px">' + C.esc(r.reply_text) + '</div>' +
          '</div>'
        );
      }).join('') : '';
      C.notify('Mas Raka', 'Balasan Terkirim', 'Balasan anonim kamu sudah masuk.');
    } catch (err) {
      C.notify('Mas Raka', 'Gagal Balas', err.message);
    } finally {
      t.disabled = false;
    }
  });
})();
