(function () {
  var A = window.PunkArena = window.PunkArena || {};
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;

  C.Views.arena = function () {
    return A.renderArena ? A.renderArena() : '<div class="rw"><small>Sebentar cuy, lagi nyiapin mesin Arena...</small></div>';
  };

  if (window.__punkArenaBound) return;
  window.__punkArenaBound = true;

  document.addEventListener('click', async function (e) {
    var t = e.target.closest('[data-act]');
    if (!t || t.disabled) return;
    var act = t.getAttribute('data-act');

    if (act === 'shut') {
      if (A.clearGameLoops) A.clearGameLoops();
    } else if (act === 'ar-tab') {
      A.state.tab = t.getAttribute('data-tab');
      C.refresh();
    } else if (act === 'ar-open') {
      var gm = t.getAttribute('data-game');
      if (gm === 'fish' && A.openFishing2) A.openFishing2();
      else if (gm === 'scratch' && A.openScratch2) A.openScratch2();
      else if (gm === 'claw' && A.openClaw2) A.openClaw2();
      else if (gm === 'react' && A.openReaction2) A.openReaction2();
      else if (gm === 'trivia' && A.openTrivia2) A.openTrivia2();
      else if (gm === 'whack' && A.openWhackGame) A.openWhackGame();
      else if (gm === 'memory' && A.openMemoryGame) A.openMemoryGame();
    } else if (act === 'fish-cast') {
      if (A.startFishingCast) A.startFishingCast(t.getAttribute('data-spot'));
    } else if (act === 'rx-start') {
      if (A.startReactionMode) A.startReactionMode(t.getAttribute('data-mode'));
    } else if (act === 'ar-claim-quest') {
      t.disabled = true;
      try {
        var qRes = await API.post('/api/arena/quest/claim', { questId: t.getAttribute('data-id') });
        if (qRes.user) S.user = qRes.user;
        C.notify('Mas Raka', 'Quest Beres 🎯', qRes.message || 'Hadiah quest harian udah cair ke dompet lo!');
        if (A.loadArenaState) await A.loadArenaState(true);
      } catch (err) {
        t.disabled = false;
        C.notify('Mas Raka', 'Info Quest', err.message);
      }
    } else if (act === 'ar-claim-pass') {
      t.disabled = true;
      try {
        var pRes = await API.post('/api/arena/pass/claim', { level: Number(t.getAttribute('data-lvl')) });
        if (pRes.user) S.user = pRes.user;
        C.notify('Mas Raka', 'Arcade Pass ✨', pRes.message || 'Reward Arcade Pass berhasil diklaim!');
        if (A.loadArenaState) await A.loadArenaState(true);
      } catch (err) {
        t.disabled = false;
        C.notify('Mas Raka', 'Info Pass', err.message);
      }
    } else if (act === 'ar-sell-item') {
      t.disabled = true;
      try {
        var sRes = await API.post('/api/arena/fish/sell', { collectionId: Number(t.getAttribute('data-id')) });
        if (sRes.user) S.user = sRes.user;
        C.notify('Mas Raka', 'Hasil Tangkapan 🎣', sRes.message || 'Tangkapan berhasil ditukar jadi PSC!');
        if (A.loadArenaState) await A.loadArenaState(true);
      } catch (err) {
        t.disabled = false;
        C.notify('Mas Raka', 'Info', err.message);
      }
    }
  });
})();
