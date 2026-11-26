(function () {
  if (window.__punkMuseumLoaderInit) return;
  window.__punkMuseumLoaderInit = true;

  var C = window.PunkCore;
  var M = window.PunkMuseumMod;

  // Sudah dimuat langsung oleh index.html
  if (M && M.drawPhotobooth && C && C.Views && C.Views.museum) {
    return;
  }

  // Fallback jika dipanggil tanpa tag <script> sub-modul di HTML
  var SUB_DIR = '../museum/';
  var FILES = [
    SUB_DIR + 'museumHelpers.js',
    SUB_DIR + 'photobooth.js',
    SUB_DIR + 'museumViews.js'
  ];

  var curScript = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var baseUrl = '';
  var queryStr = '';
  if (curScript && curScript.src) {
    var qIdx = curScript.src.indexOf('?');
    var cleanSrc = qIdx !== -1 ? curScript.src.slice(0, qIdx) : curScript.src;
    queryStr = qIdx !== -1 ? curScript.src.slice(qIdx) : '';
    baseUrl = cleanSrc.slice(0, cleanSrc.lastIndexOf('/') + 1);
  }

  function loadSequential(idx) {
    if (idx >= FILES.length) {
      if (C && C.S && C.refresh) {
        var activeApp = C.S.curApp || C.S.app || '';
        if (activeApp === 'museum' || activeApp === 'meme' || activeApp === 'rules') {
          C.refresh();
        }
      }
      return;
    }

    var s = document.createElement('script');
    s.src = baseUrl + FILES[idx] + queryStr;
    s.async = false;
    s.onload = function () { loadSequential(idx + 1); };
    s.onerror = function () {
      console.error('[PUNKSHIT.OS] Gagal memuat modul museum:', s.src);
    };
    document.head.appendChild(s);
  }

  loadSequential(0);
})();
