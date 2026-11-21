(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;

  var bdayState = {
    checked: false,
    isBirthdayToday: false,
    alreadyClaimed: false,
    rewardPsc: 150
  };

  async function checkBirthdayOnce() {
    if (bdayState.checked || !S.user) return;
    bdayState.checked = true;
    try {
      var res = await API.get('/api/birthday/status');
      bdayState.isBirthdayToday = Boolean(res.isBirthdayToday);
      bdayState.alreadyClaimed = Boolean(res.alreadyClaimed);
      bdayState.rewardPsc = res.rewardPsc || 150;
      var slot = document.getElementById('wg-bday-banner');
      if (slot) slot.innerHTML = renderBirthdayBannerHtml();
    } catch (_) {
      // Abaikan jika belum login / offline
    }
  }

  function renderBirthdayBannerHtml() {
    if (!bdayState.isBirthdayToday) return '';

    var actionBtn = bdayState.alreadyClaimed
      ? '<span class="pill" style="opacity:.75">SUDAH DIKLAIM</span>'
      : '<button class="pill" style="background:#FFD63333;color:#FFD633" data-act="wg-bday-claim">KLAIM +' + bdayState.rewardPsc + ' PSC</button>';

    return (
      '<div class="grp" style="margin-bottom:14px;background:linear-gradient(135deg,#f59e0b33,#ec489922);border:1px solid rgba(251,191,36,.45)">' +
        '<div class="rw">' +
          '<div>' +
            '<b>🎂 HAPPY BIRTHDAY, ' + C.esc(S.user ? S.user.name : 'WARGA') + '!</b>' +
            '<small>Kado ulang tahun tahunan dari PUNKSHIT.OS (+' + bdayState.rewardPsc + ' PSC & +5 Cred)</small>' +
          '</div>' +
          actionBtn +
        '</div>' +
      '</div>'
    );
  }

  window.renderBirthdayBannerSlot = function () {
    checkBirthdayOnce();
    return '<div id="wg-bday-banner">' + renderBirthdayBannerHtml() + '</div>';
  };

  document.addEventListener('click', async function (e) {
    var t = e.target.closest('[data-act="wg-bday-claim"]');
    if (!t) return;
    t.disabled = true;
    try {
      var res = await API.post('/api/birthday/claim', {});
      if (res.user) S.user = res.user;
      bdayState.alreadyClaimed = true;
      var slot = document.getElementById('wg-bday-banner');
      if (slot) slot.innerHTML = renderBirthdayBannerHtml();
      C.refresh();
      C.notify('Mas Raka', 'Kado Ulang Tahun!', res.message);
    } catch (err) {
      t.disabled = false;
      C.notify('Mas Raka', 'Info', err.message);
    }
  });
})();
