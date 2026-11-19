window.PunkAPI = (function () {
  var CFG = window.PUNK_CONFIG;
  var tg = window.Telegram && window.Telegram.WebApp;

  function getInitData() {
    return (tg && tg.initData) ? tg.initData : '';
  }

  function setSyncStatus(state) {
    var dot = document.getElementById('sync-dot');
    if (!dot) return;
    dot.className = 'sync-dot ' + (state || '');
  }

  // Resolve URL gambar relatif dari Railway (/uploads/...) menjadi URL penuh
  function assetUrl(path) {
    if (!path) return '';
    if (/^(https?:|data:|blob:)/.test(path)) return path;
    return CFG.API_URL.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
  }

  // Request JSON Standar
  async function request(endpoint, method, body) {
    setSyncStatus(''); // Kuning (loading)
    try {
      var opts = {
        method: method || 'GET',
        headers: {
          'Authorization': 'tma ' + getInitData()
        }
      };
      if (body !== undefined) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }

      var res = await fetch(CFG.API_URL + endpoint, opts);
      var data = await res.json().catch(function () { return {}; });

      if (!res.ok) {
        setSyncStatus('err');
        throw new Error(data.error || ('HTTP ' + res.status));
      }

      setSyncStatus('ok');
      return data;
    } catch (err) {
      setSyncStatus('err');
      throw err;
    }
  }

  // Upload File Multipart (Untuk Custom Banner Profil User & Aset Gift/Border Admin)
  async function upload(endpoint, formData) {
    setSyncStatus('');
    try {
      var res = await fetch(CFG.API_URL + endpoint, {
        method: 'POST',
        headers: {
          'Authorization': 'tma ' + getInitData()
        },
        body: formData
      });
      var data = await res.json().catch(function () { return {}; });

      if (!res.ok) {
        setSyncStatus('err');
        throw new Error(data.error || ('Upload gagal (' + res.status + ')'));
      }

      setSyncStatus('ok');
      return data;
    } catch (err) {
      setSyncStatus('err');
      throw err;
    }
  }

  return {
    get: function (ep) { return request(ep, 'GET'); },
    post: function (ep, body) { return request(ep, 'POST', body); },
    patch: function (ep, body) { return request(ep, 'PATCH', body); },
    del: function (ep) { return request(ep, 'DELETE'); },
    upload: upload,
    assetUrl: assetUrl
  };
})();
