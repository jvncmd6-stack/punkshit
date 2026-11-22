(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;

  var archiveState = {
    loaded: false,
    loading: false,
    items: []
  };

  function isStaffUser() {
    return Boolean(S.user && S.user.role && S.user.role !== 'member');
  }

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
    } finally {
      archiveState.loading = false;
    }
  }

  function renderArchiveListHtml() {
    if (!archiveState.loaded && archiveState.loading) {
      return '<div class="grp"><div class="rw"><small>Memuat arsip Kotak Rahasia...</small></div></div>';
    }
    if (!archiveState.items.length) {
      return '<div class="grp"><div class="rw"><small>Belum ada Menfess aktif (arsip otomatis bersih tiap 7 hari).</small></div></div>';
    }

    var canDelete = isStaffUser();

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

      var delBtn = canDelete
        ? '<button class="pill" style="background:#ef444426;color:#f87171;padding:2px 8px;font-size:11px" data-act="mf-del" data-mid="' + C.esc(m.id) + '">🗑️ Hapus</button>'
        : '';

      return (
        '<div class="grp" style="margin-bottom:12px">' +
          '<div class="rw" style="flex-direction:column;align-items:flex-start">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;width:100%;margin-bottom:4px">' +
              '<b style="color:var(--yel);font-size:12.5px">📮 ' + C.esc(m.category) + '</b>' +
              '<div style="display:flex;align-items:center;gap:8px">' +
                '<small>' + replies.length + ' balasan</small>' +
                delBtn +
              '</div>' +
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

    var clearAllBtn = isStaffUser()
      ? '<button class="pill" style="background:#ef444426;color:#f87171;font-size:11px" data-act="mf-clear-all">🧹 Bersihkan</button>'
      : '';

    return (
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;margin-bottom:8px">' +
        '<h3 class="gh" style="margin:0">🗂️ ARSIP MENFESS (EXPIRED 7 HARI)</h3>' +
        clearAllBtn +
      '</div>' +
      '<div id="mf-archive-box">' + renderArchiveListHtml() + '</div>'
    );
  };

  document.addEventListener('click', async function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var act = t.getAttribute('data-act');

    if (act === 'mf-clear-all') {
      t.disabled = true;
      try {
        var cRes = await API.post('/api/menfess/clear', {});
        archiveState.items = [];
        var box = document.getElementById('mf-archive-box');
        if (box) box.innerHTML = renderArchiveListHtml();
        C.notify('Mas Raka', 'Arsip Bersih', cRes.message || 'Semua arsip Menfess dibersihkan.');
      } catch (err) {
        C.notify('Mas Raka', 'Gagal', err.message);
      } finally {
        t.disabled = false;
      }
      return;
    }

    if (act === 'mf-del') {
      var delMid = t.getAttribute('data-mid');
      t.disabled = true;
      try {
        await API.post('/api/menfess/delete', { menfessId: delMid });
        archiveState.items = archiveState.items.filter(function (x) { return String(x.id) !== String(delMid); });
        var box = document.getElementById('mf-archive-box');
        if (box) box.innerHTML = renderArchiveListHtml();
        C.notify('Mas Raka', 'Arsip Dihapus', 'Menfess berhasil dihapus dari arsip.');
      } catch (err) {
        t.disabled = false;
        C.notify('Mas Raka', 'Gagal Hapus', err.message);
      }
      return;
    }

    if (act === 'mf-rep-send') {
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
        if (repContainer) {
          repContainer.innerHTML = (res.replies || []).map(function (r) {
            return (
              '<div style="padding:6px 10px;background:rgba(255,255,255,.04);border-left:2px solid var(--gblue);border-radius:6px;margin-top:6px;font-size:12.5px">' +
                '<small style="color:var(--mut);font-weight:700">Anonim</small>' +
                '<div style="margin-top:2px">' + C.esc(r.reply_text) + '</div>' +
              '</div>'
            );
          }).join('');
        }
        C.notify('Mas Raka', 'Balasan Terkirim', 'Balasan anonim kamu sudah masuk.');
      } catch (err) {
        C.notify('Mas Raka', 'Gagal Balas', err.message);
      } finally {
        t.disabled = false;
      }
    }
  });
})();
