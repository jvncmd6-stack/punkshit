(function () {
  var M = window.PunkMuseumMod = window.PunkMuseumMod || {};

  M.pbState = {
    img: null,
    dominantRgb: [29, 185, 84],
    style: 'spotify',
    filter: 'none',
    title: '',
    artist: '',
    progress: 0.38,
    playing: true
  };

  M.STYLES = {
    spotify: { name: '🎵 Spotify Card' },
    vinyl:   { name: '💿 Vinyl Cover' },
    polaroid:{ name: '📸 Polaroid Retro' },
    crimson: { name: '🔥 Crimson Riot' }
  };

  M.FILTERS = [
    { id: 'none', name: 'Original', css: 'none' },
    { id: 'noir', name: 'B&W Contrast', css: 'grayscale(100%) contrast(125%)' },
    { id: 'warm', name: 'Retro Film', css: 'sepia(35%) contrast(108%) saturate(115%)' },
    { id: 'cool', name: 'Midnight Cool', css: 'contrast(112%) saturate(120%) hue-rotate(-10deg)' }
  ];

  M.getTomorrowStr = function () {
    var d = new Date(Date.now() + 24 * 3600 * 1000);
    return d.toISOString().slice(0, 10);
  };

  M.extractDominantColor = function (img) {
    try {
      var c = document.createElement('canvas');
      c.width = 24;
      c.height = 24;
      var cx = c.getContext('2d');
      cx.drawImage(img, 0, 0, 24, 24);
      var data = cx.getImageData(0, 0, 24, 24).data;
      var r = 0, g = 0, b = 0, count = 0;
      for (var i = 0; i < data.length; i += 4) {
        var lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (lum > 28 && lum < 235) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
      }
      if (count > 0) {
        return [
          Math.min(220, Math.round(r / count)),
          Math.min(220, Math.round(g / count)),
          Math.min(220, Math.round(b / count))
        ];
      }
    } catch (e) {}
    return [30, 215, 96];
  };

  M.roundRectPath = function (ctx, x, y, w, h, r) {
    var rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  };

  M.drawCoverImage = function (ctx, img, x, y, w, h, filterCss) {
    var iw = img.width;
    var ih = img.height;
    var scale = Math.max(w / iw, h / ih);
    var nw = iw * scale;
    var nh = ih * scale;
    var ox = x + (w - nw) / 2;
    var oy = y + (h - nh) / 2;
    ctx.save();
    ctx.filter = filterCss || 'none';
    ctx.drawImage(img, ox, oy, nw, nh);
    ctx.restore();
  };

  M.trimText = function (ctx, text, maxWidth) {
    var s = String(text || '');
    if (ctx.measureText(s).width <= maxWidth) return s;
    while (s.length > 1 && ctx.measureText(s + '...').width > maxWidth) {
      s = s.slice(0, -1);
    }
    return s + '...';
  };
})();
