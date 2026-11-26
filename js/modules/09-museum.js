(function () {
  if (window.__punkMuseumLoaderInit) return;
  window.__punkMuseumLoaderInit = true;

  // Isi 'museum/' jika 3 file ditaruh di subfolder, atau '' jika sejajar dengan 09-museum.js
  var SUB_DIR = '';

  var FILES = [
    SUB_DIR + 'museumHelpers.js',
    SUB_DIR + 'photobooth.js',
    SUB_DIR + 'museumViews.js'
  ];

  // Ambil base URL otomatis dari lokasi 09-museum.js + query versi (cache-buster) jika ada
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
      // Refresh tampilan jika user kebetulan sudah membuka tab museum/meme/rules saat script selesai dimuat
      var C = window.PunkCore;
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
    s.onload = function () {
      loadSequential(idx + 1);
    };
    s.onerror = function () {
      console.error('[PUNKSHIT.OS] Gagal memuat modul museum:', s.src);
    };
    document.head.appendChild(s);
  }

  // Jika 3 file belum dimuat manual lewat HTML, muat berurutan sekarang
  if (!window.PunkMuseumMod || !window.PunkMuseumMod.drawPhotobooth) {
    loadSequential(0);
  }
})();
