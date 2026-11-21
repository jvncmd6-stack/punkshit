(function () {
  var A = window.PunkArena = window.PunkArena || {};
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;

  C.Views.arena = function () {
    return A.renderArena ? A.renderArena() : '<div class="rw"><small>Memuat modul Arena...</small></div>';
  };

  document.addEventListener('click', async function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var act = t.getAttribute('data-act');

    if (act === 'shut') {
      if (A.clearGameLoops) A.clearGameLoops();
    } else if (act === 'ar-tab') {
      A.state.tab = t.getAttribute('data-tab');
      C.refresh();
    } else if (act === 'ar-open') {
      var gm = t.getAttribute('data-game');
      if (gm === 'fish') A.openFishing2();
      else if (gm === 'scratch') A.openScratch2();
      else if (gm === 'claw') A.openClaw2();
      else if (gm === 'react') A.openReaction2();
      else if (gm === 'trivia') A.openTrivia2();
      else if (gm === 'whack') A.openWhackGame();
      else if (gm === 'memory') A.openMemoryGame();
    } else if (act === 'fish-cast') {
      A.startFishingCast(t.getAttribute('data-spot'));
    } else if (act === 'rx-start') {
      A.startReactionMode(t.getAttribute('data-mode'));
    } else if (act === 'ar-claim-quest') {
      t.disabled = true;
      try {
        var qRes = await API.post('/api/arena/quest/claim', { questId: t.getAttribute('data-id') });
        if (qRes.user) S.user = qRes.user;
        C.notify('Mas Raka', 'Daily Quest', qRes.message);
        await A.loadArenaState(true);
      } catch (err) {
        t.disabled = false;
        C.notify('Mas Raka', 'Info', err.message);
      }
    } else if (act === 'ar-claim-pass') {
      t.disabled = true;
      try {
        var pRes = await API.post('/api/arena/pass/claim', { level: Number(t.getAttribute('data-lvl')) });
        if (pRes.user) S.user = pRes.user;
        C.notify('Mas Raka', 'Arcade Pass', pRes.message);
        await A.loadArenaState(true);
      } catch (err) {
        t.disabled = false;
        C.notify('Mas Raka', 'Info', err.message);
      }
    } else if (act === 'ar-sell-item') {
      t.disabled = true;
      try {
        var sRes = await API.post('/api/arena/fish/sell', { collectionId: Number(t.getAttribute('data-id')) });
        if (sRes.user) S.user = sRes.user;
        C.notify('Mas Raka', 'Lapak Ikan', sRes.message);
        await A.loadArenaState(true);
      } catch (err) {
        t.disabled = false;
        C.notify('Mas Raka', 'Info', err.message);
      }
    }
  });
})();
