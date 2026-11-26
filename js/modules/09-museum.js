(function () {
  if (window.__punkMuseumLoaderInit) return;
  window.__punkMuseumLoaderInit = true;

  var C = window.PunkCore;
  var M = window.PunkMuseumMod;

  if (M && M.drawPhotobooth && C && C.Views && C.Views.museum) {
    return;
  }

  var FILES = ['museumHelpers.js', 'photobooth.js', 'museumViews.js'];
  var curScript = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var baseUrl = './js/museum/';
  var queryStr = '?v=' + Date.now();
  if (curScript && curScript.src) {
    var qIdx = curScript.src.indexOf('?');
    var cleanSrc = qIdx !== -1 ? curScript.src.slice(0, qIdx) : curScript.src;
    if (qIdx !== -1) queryStr = curScript.src.slice(qIdx);
    baseUrl = cleanSrc.slice(0, cleanSrc.lastIndexOf('/') + 1);
  }

  // Coba path ../museum/ dulu, kalau gagal otomatis coba satu folder dengan 09-museum.js
  var CANDIDATE_DIRS = [baseUrl + '../museum/', baseUrl];

  function loadScript(url) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = url + queryStr;
      s.async = false;
      s.onload = resolve;
      s.onerror = function () { reject(new Error(url)); };
      document.head.appendChild(s);
    });
  }

  (async function initMuseumModules() {
    for (var d = 0; d < CANDIDATE_DIRS.length; d++) {
      try {
        for (var i = 0; i < FILES.length; i++) {
          await loadScript(CANDIDATE_DIRS[d] + FILES[i]);
        }
        if (C && C.S && C.refresh) {
          var activeApp = C.S.curApp || C.S.app || '';
          if (activeApp === 'museum' || activeApp === 'meme' || activeApp === 'rules') {
            C.refresh();
          }
        }
        return;
      } catch (e) {
        // Lanjut coba folder kandidat berikutnya
      }
    }
    console.error('[PUNKSHIT.OS] File pecahan museum tidak ditemukan di:', CANDIDATE_DIRS);
  })();
})();
