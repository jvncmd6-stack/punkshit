(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;

  var coopState = {
    loaded: false,
    loading: false,
    hasCoop: false,
    partners: [],
    activeShields: []
  };

  async function fetchCoopStatus() {
    if (coopState.loading || !S.user) return;
    coopState.loading = true;
    try {
      var res = await API.get('/api/spark/coop-status');
      coopState.hasCoop = Boolean(res.hasCoop);
      coopState.partners = res.partners || [];
      coopState.activeShields = res.activeShields || [];
      coopState.loaded = true;
      var slot = document.getElementById('ar-spark-coop-slot');
      if (slot) slot.innerHTML = renderCoopBoxHtml();
    } catch (_) {
      // Abaikan jika offline
    } finally {
      coopState.loading = false;
    }
  }

  function renderCoopBoxHtml() {
    if (!coopState.loaded && coopState.loading) {
      return '<div class="grp" style="margin-bottom:12px"><div class="rw"><small>Memuat status Spark Co-op...</small></div></div>';
    }
    if (!coopState.hasCoop || !coopState.partners.length) {
      return '';
    }

    var firstPartner = coopState.partners[0];
    var shieldActive = coopState.activeShields.some(function (sh) {
      return sh.partner_username === firstPartner.partnerUsername;
    });

    var shieldBtn = shieldActive
      ? '<span class="pill" style="background:#34C75933;color:#6df0a0">🛡️ SHIELD AKTIF</span>'
      : '<button class="pill" data-act="ar-shield-open" data-partner="' + C.esc(firstPartner.partnerUsername) + '">🛡️ Aktifkan Shield</button>';

    return (
      '<div class="grp" style="margin-bottom:12px;background:linear-gradient(135deg,#f9731622,#0f172a 70%);border:1px solid rgba(251,146,60,.35)">' +
        '<div class="rw">' +
          '<div>' +
            '<b>🔥 SPARK DUO: @' + C.esc(firstPartner.partnerUsername) + ' (' + (firstPartner.streak || 0) + ' Hari)</b>' +
            '<small>Co-op Squad aktif · Bonus sinergi +' + (firstPartner.coopBonusPct || 15) + '% XP</small>' +
          '</div>' +
          shieldBtn +
        '</div>' +
      '</div>'
    );
  }

  window.renderArenaSparkCoopSlot = function () {
    fetchCoopStatus();
    return '<div id="ar-spark-coop-slot">' + renderCoopBoxHtml() + '</div>';
  };

  function openShieldPicker(partnerUsn) {
    var inv = S.inv || [];
    if (!inv.length) {
      return C.sheet(
        '<h2>🛡️ Spark Shield</h2>' +
        '<p class="sub">Gudang barang kamu kosong. Beli item di Lapak Rongsok dulu untuk dijadikan Shield.</p>' +
        '<button class="btn b2" data-act="shut">TUTUP</button>'
      );
    }

    var opts = inv.map(function (entry) {
      var it = C.findItem(entry.itemId);
      var label = it ? (it.name + ' [' + (it.rarity || 'Rare') + ']') : entry.itemId;
      return '<option value="' + entry.id + '">' + C.esc(label) + '</option>';
    }).join('');

    C.sheet(
      '<h2>🛡️ Aktifkan Spark Shield</h2>' +
      '<p class="sub">Lindungi api <b>@' + C.esc(partnerUsn) + '</b> hari ini menggunakan 1 item dari gudang kamu.</p>' +
      '<label>PILIH ITEM GUDANG</label>' +
      '<select id="sh-inv-id">' + opts + '</select>' +
      '<button class="btn" data-act="ar-shield-submit" data-partner="' + C.esc(partnerUsn) + '">PASANG SPARK SHIELD</button>'
    );
  }

  document.addEventListener('click', async function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var act = t.getAttribute('data-act');

    if (act === 'ar-shield-open') {
      openShieldPicker(t.getAttribute('data-partner'));
    } else if (act === 'ar-shield-submit') {
      var partner = t.getAttribute('data-partner');
      var invId = Number(document.getElementById('sh-inv-id').value);
      t.disabled = true;
      try {
        var res = await API.post('/api/spark/shield', { partnerUsername: partner, invId: invId });
        if (res.user) S.user = res.user;
        if (res.inv) S.inv = res.inv;
        coopState.loaded = false;
        C.shut();
        C.refresh();
        C.notify('Mas Raka', 'Spark Shield', res.message);
      } catch (err) {
        t.disabled = false;
        C.notify('Mas Raka', 'Gagal Pasang', err.message);
      }
    }
  });
})();
