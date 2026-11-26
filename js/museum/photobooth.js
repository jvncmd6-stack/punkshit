(function () {
  var M = window.PunkMuseumMod = window.PunkMuseumMod || {};
  var S = window.PunkCore && window.PunkCore.S;

  function drawSpotifyStyle(ctx, flObj, titleTxt, artistTxt, memberNo, dateStr) {
    var pb = M.pbState;
    var rgb = pb.dominantRgb || [29, 185, 84];
    var r = rgb[0], g = rgb[1], b = rgb[2];

    var bgGrad = ctx.createLinearGradient(0, 0, 0, 780);
    bgGrad.addColorStop(0, 'rgb(' + Math.round(r * 0.78) + ',' + Math.round(g * 0.78) + ',' + Math.round(b * 0.78) + ')');
    bgGrad.addColorStop(0.55, 'rgb(' + Math.round(r * 0.34) + ',' + Math.round(g * 0.34) + ',' + Math.round(b * 0.34) + ')');
    bgGrad.addColorStop(1, '#0b0d11');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 600, 780);

    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '700 13px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PLAYING FROM PUNKSHIT.OS', 300, 42);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 15px -apple-system, sans-serif';
    ctx.fillText('Markas Underground Mix', 300, 64);

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 32;
    ctx.shadowOffsetY = 14;
    M.roundRectPath(ctx, 56, 92, 488, 430, 22);
    ctx.fillStyle = '#12161f';
    ctx.fill();
    ctx.restore();

    ctx.save();
    M.roundRectPath(ctx, 56, 92, 488, 430, 22);
    ctx.clip();
    if (pb.img) {
      M.drawCoverImage(ctx, pb.img, 56, 92, 488, 430, flObj.css);
    } else {
      ctx.fillStyle = '#161b26';
      ctx.fillRect(56, 92, 488, 430);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 20px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Tap "Pilih Foto dari Galeri"', 300, 312);
    }
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 30px -apple-system, sans-serif';
    ctx.fillText(M.trimText(ctx, titleTxt, 430), 56, 568);

    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '600 20px -apple-system, sans-serif';
    ctx.fillText(M.trimText(ctx, artistTxt + ' · ' + memberNo, 430), 56, 598);

    ctx.beginPath();
    ctx.arc(522, 574, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#1ED760';
    ctx.fill();
    ctx.strokeStyle = '#0b0d11';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(514, 574);
    ctx.lineTo(520, 580);
    ctx.lineTo(531, 568);
    ctx.stroke();

    var barX = 56, barY = 630, barW = 488, barH = 6;
    M.roundRectPath(ctx, barX, barY, barW, barH, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fill();

    var progW = Math.round(barW * pb.progress);
    M.roundRectPath(ctx, barX, barY, progW, barH, 3);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(barX + progW, barY + 3, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    var curSec = Math.round(214 * pb.progress);
    var mStr = Math.floor(curSec / 60) + ':' + String(curSec % 60).padStart(2, '0');
    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    ctx.font = '600 14px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(mStr, 56, 656);
    ctx.textAlign = 'right';
    ctx.fillText('3:34', 544, 656);

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(212, 690);
    ctx.lineTo(212, 718);
    ctx.lineTo(190, 704);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(185, 690, 4, 28);

    ctx.beginPath();
    ctx.arc(300, 704, 30, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.fillStyle = '#0b0d11';
    if (pb.playing) {
      ctx.fillRect(291, 692, 6, 24);
      ctx.fillRect(303, 692, 6, 24);
    } else {
      ctx.beginPath();
      ctx.moveTo(293, 691);
      ctx.lineTo(293, 717);
      ctx.lineTo(314, 704);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(388, 690);
    ctx.lineTo(388, 718);
    ctx.lineTo(410, 704);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(411, 690, 4, 28);

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '600 12px ui-monospace, monospace';
    ctx.fillText('PUNKSHIT.OS • ' + dateStr, 300, 758);
  }

  function drawVinylStyle(ctx, flObj, titleTxt, artistTxt, memberNo, dateStr) {
    var pb = M.pbState;
    var rgb = pb.dominantRgb || [56, 189, 248];
    var grad = ctx.createLinearGradient(0, 0, 600, 780);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, 'rgb(' + Math.round(rgb[0] * 0.42) + ',' + Math.round(rgb[1] * 0.42) + ',' + Math.round(rgb[2] * 0.42) + ')');
    grad.addColorStop(1, '#05070c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 780);

    ctx.save();
    ctx.beginPath();
    ctx.arc(415, 315, 165, 0, Math.PI * 2);
    ctx.fillStyle = '#09090b';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    [145, 125, 105, 85].forEach(function (rad) {
      ctx.beginPath();
      ctx.arc(415, 315, rad, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.arc(415, 315, 52, 0, Math.PI * 2);
    ctx.fillStyle = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(415, 315, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#09090b';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = 28;
    M.roundRectPath(ctx, 44, 130, 370, 370, 14);
    ctx.fillStyle = '#111827';
    ctx.fill();
    ctx.clip();
    if (pb.img) {
      M.drawCoverImage(ctx, pb.img, 44, 130, 370, 370, flObj.css);
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 18px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Pilih Foto dari Galeri', 229, 320);
    }
    ctx.restore();

    ctx.fillStyle = '#000';
    ctx.fillRect(58, 444, 118, 42);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(58, 444, 118, 42);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = '900 11px -apple-system, sans-serif';
    ctx.fillText('UNDERGROUND', 117, 461);
    ctx.font = '700 10px -apple-system, sans-serif';
    ctx.fillText('MARKAS EDITION', 117, 476);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFD633';
    ctx.font = '800 14px ui-monospace, monospace';
    ctx.fillText('LIMITED PRESSING // ' + memberNo, 46, 562);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 34px -apple-system, sans-serif';
    ctx.fillText(M.trimText(ctx, titleTxt.toUpperCase(), 508), 46, 606);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 21px -apple-system, sans-serif';
    ctx.fillText(M.trimText(ctx, artistTxt, 508), 46, 640);

    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    var bx = 46;
    [3, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 2, 4, 2].forEach(function (w) {
      ctx.fillRect(bx, 682, w * 2, 38);
      bx += w * 2 + 4;
    });
    ctx.textAlign = 'right';
    ctx.font = '600 15px ui-monospace, monospace';
    ctx.fillText(dateStr, 554, 716);
  }

  function drawPolaroidStyle(ctx, flObj, titleTxt, artistTxt, memberNo, dateStr) {
    var pb = M.pbState;
    ctx.fillStyle = '#121316';
    ctx.fillRect(0, 0, 600, 780);

    ctx.save();
    ctx.translate(300, 390);
    ctx.rotate(-0.025);
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 30;
    M.roundRectPath(ctx, -255, -345, 510, 690, 14);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.rect(-225, -312, 450, 480);
    ctx.clip();
    if (pb.img) {
      M.drawCoverImage(ctx, pb.img, -225, -312, 450, 480, flObj.css);
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-225, -312, 450, 480);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 20px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Tap "Pilih Foto dari Galeri"', 0, -70);
    }
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = '800 28px -apple-system, sans-serif';
    ctx.fillText(M.trimText(ctx, titleTxt, 450), -225, 224);

    ctx.fillStyle = '#475569';
    ctx.font = '600 19px -apple-system, sans-serif';
    ctx.fillText(M.trimText(ctx, artistTxt + ' • ' + memberNo, 450), -225, 258);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 14px ui-monospace, monospace';
    ctx.fillText('PUNKSHIT.OS ARCHIVE // ' + dateStr, -225, 304);
    ctx.restore();
  }

  function drawCrimsonStyle(ctx, flObj, titleTxt, artistTxt, memberNo, dateStr) {
    var pb = M.pbState;
    ctx.fillStyle = '#0c0c0e';
    ctx.fillRect(0, 0, 600, 780);

    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 16;
    ctx.strokeRect(8, 8, 584, 764);

    ctx.fillStyle = '#080B12';
    ctx.fillRect(40, 46, 520, 530);

    if (pb.img) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(40, 46, 520, 530);
      ctx.clip();
      M.drawCoverImage(ctx, pb.img, 40, 46, 520, 530, flObj.css);
      ctx.restore();
    } else {
      ctx.fillStyle = '#929BAE';
      ctx.font = '600 22px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Tap "Pilih Foto dari Galeri"', 300, 315);
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = '#F5F5F7';
    ctx.font = '800 25px -apple-system, sans-serif';
    ctx.fillText('PUNKSHIT.OS // ' + M.trimText(ctx, titleTxt.toUpperCase(), 320), 42, 634);

    ctx.fillStyle = '#F5F5F7';
    ctx.font = '600 22px -apple-system, sans-serif';
    ctx.fillText(M.trimText(ctx, artistTxt, 500), 42, 676);

    ctx.fillStyle = '#929BAE';
    ctx.font = '500 17px ui-monospace, monospace';
    ctx.fillText(memberNo + ' • ' + dateStr, 42, 718);
  }

  M.drawPhotobooth = function () {
    var cv = document.getElementById('pb-cv');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var pb = M.pbState;
    var flObj = M.FILTERS.find(function (x) { return x.id === pb.filter; }) || M.FILTERS[0];

    var titleEl = document.getElementById('pb-title');
    var artistEl = document.getElementById('pb-artist');
    var titleTxt = (titleEl && titleEl.value.trim()) || pb.title || 'Midnight Hangout';
    var artistTxt = (artistEl && artistEl.value.trim()) || pb.artist || (S && S.user && S.user.name) || 'Warga Markas';
    var memberNo = (S && S.user && S.user.memberNo) || 'PSK-0001';
    var dateStr = new Date().toLocaleDateString('id-ID');

    ctx.filter = 'none';
    if (pb.style === 'vinyl') {
      drawVinylStyle(ctx, flObj, titleTxt, artistTxt, memberNo, dateStr);
    } else if (pb.style === 'polaroid') {
      drawPolaroidStyle(ctx, flObj, titleTxt, artistTxt, memberNo, dateStr);
    } else if (pb.style === 'crimson') {
      drawCrimsonStyle(ctx, flObj, titleTxt, artistTxt, memberNo, dateStr);
    } else {
      drawSpotifyStyle(ctx, flObj, titleTxt, artistTxt, memberNo, dateStr);
    }
  };
})();
