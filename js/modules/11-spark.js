(function () {
  var C = window.PunkCore;
  var S = C.S;

  function renderSparkApp() {
    setTimeout(function () {
      var lt = document.getElementById('lt');
      var sc = document.getElementById('sc');
      if (lt) lt.style.display = 'none';
      if (sc) {
        sc.style.padding = '0';
        sc.style.overflow = 'hidden';
      }

      var frame = document.getElementById('spark-frame');
      if (frame) {
        frame.onload = function () {
          try {
            frame.contentWindow.postMessage({ type: 'PUNK_SYNC', user: S.user }, '*');
          } catch (e) {}
        };
      }
    }, 10);

    return (
      '<iframe id="spark-frame" src="./spark.html?v=1" ' +
        'style="width:100%;height:calc(100dvh - 54px);border:0;display:block;background:#07070b">' +
      '</iframe>'
    );
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-act="close"], [data-act="app"]');
    if (!btn) return;
    var lt = document.getElementById('lt');
    var sc = document.getElementById('sc');
    if (lt) lt.style.display = '';
    if (sc) {
      sc.style.padding = '';
      sc.style.overflow = '';
    }
  });

  C.Views.spark = renderSparkApp;
})();
