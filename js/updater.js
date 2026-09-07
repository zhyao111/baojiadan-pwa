/**
 * 报价单 - 更新检查模块
 * 多源并行拉取 version.json，取版本最高者（任一源失败不影响其他源）：
 *   Gitee API（国内快、CORS 开放）/ cdn.jsdelivr.net（国内可达）/ GitHub raw（始终最新、需代理）
 * version.json 结构：{ version, versionCode, url, urlGitee, urlGithub, note }
 */
(function (global) {
  'use strict';

  var CURRENT_VERSION = '1.0.5';
  var VERSION_URLS = [
    'https://gitee.com/api/v5/repos/zhyao333/baojiadan-update/contents/version.json?ref=master',
    'https://cdn.jsdelivr.net/gh/zhyao111/baojiadan-update@main/version.json',
    'https://raw.githubusercontent.com/zhyao111/baojiadan-update/main/version.json'
  ];
  var CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
  var STORAGE_KEY = 'lastUpdateCheckAt';

  function compareVersion(a, b) {
    var pa = String(a).split('.');
    var pb = String(b).split('.');
    var len = Math.max(pa.length, pb.length);
    for (var i = 0; i < len; i++) {
      var na = parseInt(pa[i] || '0', 10);
      var nb = parseInt(pb[i] || '0', 10);
      if (na > nb) return 1;
      if (na < nb) return -1;
    }
    return 0;
  }

  function fetchVersionInfo() {
    function fetchOne(url) {
      return new Promise(function (resolve, reject) {
        var sep = url.indexOf('?') >= 0 ? '&' : '?';
        var xhr = new XMLHttpRequest();
        xhr.timeout = 8000;
        xhr.open('GET', url + sep + 't=' + Date.now(), true);
        xhr.onreadystatechange = function () {
          if (xhr.readyState !== 4) return;
          if (xhr.status === 200) {
            try {
              var data = JSON.parse(xhr.responseText);
              if (data && data.content && data.encoding === 'base64') {
                data = JSON.parse(atob(data.content.replace(/\s/g, '')));
              }
              if (data && data.version) { resolve(data); }
              else { reject(new Error('bad version.json')); }
            } catch (e) { reject(e); }
          } else {
            reject(new Error('HTTP ' + xhr.status));
          }
        };
        xhr.ontimeout = function () { reject(new Error('timeout')); };
        xhr.onerror = function () { reject(new Error('network error')); };
        xhr.send();
      });
    }

    // 并行拉取全部源、取版本最高者。旧实现是"首个高于当前版本的源就提前返回"，
    // 当排在前面的源（Gitee）落后于其他源时会推慢一个更新周期。
    return Promise.all(VERSION_URLS.map(function (url) {
      return fetchOne(url).catch(function () { return null; });
    })).then(function (results) {
      var best = null;
      results.forEach(function (data) {
        if (data && (!best || compareVersion(data.version, best.version) > 0)) best = data;
      });
      if (!best) throw new Error('all sources failed');
      return best;
    });
  }

  function showUpdateDialog(info) {
    var overlay = document.getElementById('updateOverlay');
    var msg = document.getElementById('updateMessage');
    var note = document.getElementById('updateNote');
    var btnNow = document.getElementById('updateNow');
    var btnAlt = document.getElementById('updateAlt');
    var btnLater = document.getElementById('updateLater');
    if (!overlay) return;

    var lines = ['当前版本 v' + CURRENT_VERSION + '，最新版本 v' + info.version + '。'];
    msg.textContent = lines.join('\n');

    if (info.note) {
      note.style.display = 'block';
      note.textContent = '更新说明：' + info.note;
    } else {
      note.style.display = 'none';
      note.textContent = '';
    }

    // 下载候选：国内镜像优先（jsDelivr → Gitee），GitHub 兜底
    var urls = [];
    [info.url, info.urlGitee, info.urlGithub].forEach(function (u) {
      if (u && urls.indexOf(u) < 0) urls.push(u);
    });
    var githubUrl = info.urlGithub || info.url || '';
    if (btnAlt) {
      btnAlt.style.display = (urls.length > 1 && githubUrl) ? 'inline-block' : 'none';
    }

    overlay.style.display = 'flex';

    function close() {
      overlay.style.display = 'none';
      btnNow.removeEventListener('click', onNow);
      if (btnAlt) btnAlt.removeEventListener('click', onAlt);
      btnLater.removeEventListener('click', onLater);
    }
    function onNow() {
      close();
      // PWA 补丁：纯浏览器环境下没有可安装的 APK，"立即更新"= 刷新页面拿最新版
      // （sw.js 为网络优先策略，刷新即取新资源）；Capacitor 环境保持原 APK 下载逻辑
      var isNative = window.Capacitor && window.Capacitor.Plugins;
      if (!isNative) { location.reload(); return; }
      openDownload(urls);
    }
    function onAlt() {
      close();
      if (githubUrl) openDownload(githubUrl);
    }
    function onLater() { close(); }
    btnNow.addEventListener('click', onNow);
    if (btnAlt) btnAlt.addEventListener('click', onAlt);
    btnLater.addEventListener('click', onLater);
  }

  function openDownload(urls) {
    var original = (typeof urls === 'string') ? [urls] : (urls || []).slice();
    var list = original.slice();
    if (!list.length) return;
    var Browser = (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser) || null;
    function tryNext() {
      var url = list.shift();
      if (!url) {
        alert('所有下载地址均无法打开，请复制以下链接到浏览器手动下载：\n\n' + original.join('\n'));
        return;
      }
      if (Browser && Browser.open) {
        Browser.open({ url: url }).catch(function () { tryNext(); });
      } else {
        fallbackOpen(url);
      }
    }
    tryNext();
  }

  function fallbackOpen(url) {
    var w = null;
    try { w = window.open(url, '_blank'); } catch (e) {}
    if (w) return Promise.resolve();
    var Share = (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share) || null;
    var shareText = '报价单更新下载：' + url;
    if (Share && Share.share) {
      return Share.share({ title: '报价单更新', text: shareText, url: url, dialogTitle: '打开更新页面' })
        .catch(function () { alert('请复制链接打开：\n' + url); });
    }
    alert('请复制以下链接打开：\n' + url);
    return Promise.resolve();
  }

  function toast(msg) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:20%;transform:translateX(-50%);background:rgba(0,0,0,.78);color:#fff;padding:10px 18px;border-radius:22px;font-size:14px;z-index:9999;max-width:80%;text-align:center;';
    document.body.appendChild(t);
    setTimeout(function () {
      t.style.opacity = '0';
      t.style.transition = 'opacity .3s';
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
    }, 2000);
  }

  function checkUpdate(opts) {
    opts = opts || {};
    var force = !!opts.force;
    var silent = !!opts.silent;

    if (!force) {
      var last = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
      if (Date.now() - last < CHECK_INTERVAL_MS) {
        return Promise.resolve({ skipped: true });
      }
    }

    return fetchVersionInfo().then(function (info) {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
      var badge = document.getElementById('updateBadge');
      if (info && compareVersion(info.version, CURRENT_VERSION) > 0) {
        if (badge) badge.style.display = 'inline-block';
        showUpdateDialog(info);
        return { hasUpdate: true, info: info };
      } else {
        if (badge) badge.style.display = 'none';
        if (!silent) toast('当前已是最新版本 v' + CURRENT_VERSION);
        return { hasUpdate: false, info: info };
      }
    }).catch(function (err) {
      if (!silent) toast('检查更新失败，请稍后再试');
      console.warn('[updater] check failed:', err);
      return { error: err };
    });
  }

  function autoCheckOnStartup() {
    setTimeout(function () {
      checkUpdate({ silent: true }).catch(function () {});
    }, 1500);
  }

  global.Updater = {
    CURRENT_VERSION: CURRENT_VERSION,
    checkUpdate: checkUpdate,
    autoCheckOnStartup: autoCheckOnStartup
  };
})(window);