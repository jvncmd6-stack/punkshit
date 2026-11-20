(function () {
  var C = window.PunkCore;
  var S = C.S;

  function syncSparkData() {
    var frame = document.getElementById('spark-frame');
    if (!frame || !frame.contentWindow) return;
    try {
      var list = S.members || S.warga || S.users || [];
      frame.contentWindow.postMessage({
        type: 'PUNK_SYNC',
        user: S.user || null,
        members: list
      }, '*');
    } catch (e) {}
  }

  function renderSparkApp() {
    requestAnimationFrame(function () {
      var lt = document.getElementById('lt');
      var sc = document.getElementById('sc');
      var bd = document.getElementById('bd');
      var nav = document.getElementById('nav');

      if (lt) lt.style.display = 'none';

      // Hitung jarak pasti dari paling atas layar HP sampai batas bawah tombol "< Home"
      var topOffset = 94;
      if (nav) {
        var rect = nav.getBoundingClientRect();
        var parentRect = nav.offsetParent ? nav.offsetParent.getBoundingClientRect() : { top: 0 };
        var calc = Math.round(rect.bottom - parentRect.top);
        if (calc > 40) topOffset = calc;
      }

      if (sc) {
        sc.style.padding = '0';
        sc.style.overflow = 'hidden';
      }
      if (bd) {
        bd.style.paddingTop = topOffset + 'px';
        bd.style.height = '100%';
        bd.style.boxSizing = 'border-box';
      }

      var frame = document.getElementById('spark-frame');
      if (frame) {
        frame.onload = syncSparkData;
        syncSparkData();
      }
    });

    return (
      '<iframe id="spark-frame" src="./spark.html?v=3" ' +
        'style="width:100%;height:100%;border:0;display:block;background:#07070b">' +
      '</iframe>'
    );
  }

  // Terima update XP/Streak dari Spark Buddies jika diperlukan
  window.addEventListener('message', function (ev) {
    if (ev.data && ev.data.type === 'SPARK_REQUEST_SYNC') {
      syncSparkData();
    }
  });

  // Kembalikan layout normal saat keluar dari Spark Buddies
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-act="close"], [data-act="app"]');
    if (!btn) return;
    var lt = document.getElementById('lt');
    var sc = document.getElementById('sc');
    var bd = document.getElementById('bd');
    if (lt) lt.style.display = '';
    if (sc) {
      sc.style.padding = '';
      sc.style.overflow = '';
    }
    if (bd) {
      bd.style.paddingTop = '';
      bd.style.height = '';
      bd.style.boxSizing = '';
    }
  });

  C.Views.spark = renderSparkApp;
})();
