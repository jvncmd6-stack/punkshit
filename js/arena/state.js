(function () {
  var A = window.PunkArena = window.PunkArena || {};
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;

  A.state = {
    loaded: false,
    loading: false,
    tab: 'games', // 'games' | 'quest' | 'bag' | 'rank'
    profile: { xp: 0, level: 1, claimedPass: [], dailyStats: {}, personalBests: {} },
    passMilestones: [],
    quests: [],
    fishQuota: { used: 0, max: 6, left: 6, cooldownEndsAt: 0 },
    scratchedToday: false,
    collections: [],
    fishdexTotal: 6,
    leaderboards: { react: [], xp: [] }
  };

  var activeLoops = [];

  A.clearGameLoops = function () {
    while (activeLoops.length) {
      var item = activeLoops.pop();
      if (item.type === 'interval') clearInterval(item.id);
      else if (item.type === 'timeout') clearTimeout(item.id);
      else if (item.type === 'raf') cancelAnimationFrame(item.id);
    }
  };

  A.regTimeout = function (fn, ms) {
    var id = setTimeout(fn, ms);
    activeLoops.push({ type: 'timeout', id: id });
    return id;
  };

  A.regInterval = function (fn, ms) {
    var id = setInterval(fn, ms);
    activeLoops.push({ type: 'interval', id: id });
    return id;
  };

  A.loadArenaState = async function (forceRefresh) {
    var st = A.state;
    if (st.loading) return;
    st.loading = true;
    try {
      var res = await API.get('/api/arena/state');
      st.profile = res.profile || st.profile;
      st.passMilestones = res.passMilestones || [];
      st.quests = res.quests || [];
      st.fishQuota = res.fishQuota || st.fishQuota;
      st.scratchedToday = Boolean(res.scratchedToday);
      st.collections = res.collections || [];
      st.fishdexTotal = res.fishdexTotal || 6;
      st.leaderboards = res.leaderboards || { react: [], xp: [] };
      st.loaded = true;
      if (S.curApp === 'arena' && forceRefresh) C.refresh();
    } catch (e) {
      // Fallback diam jika offline
    } finally {
      st.loading = false;
    }
  };

  A.rarityColor = function (r) {
    if (r === 'Legendary') return '#FFD633';
    if (r === 'Epic') return '#C084FC';
    if (r === 'Rare') return '#38BDF8';
    if (r === 'Uncommon') return '#4ADE80';
    return '#94A3B8';
  };
})();
