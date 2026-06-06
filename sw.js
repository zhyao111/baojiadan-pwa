const CACHE_NAME = 'chefeibao-v7';

// 核心资源 — install 失败也能降级，不影响 SW 激活
const CORE_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
];

// Install — 逐个缓存，一个失败不影响其他
self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // 逐个 add，某个 404 不影响其余资源的缓存
      for (const url of CORE_ASSETS) {
        try {
          await cache.add(url);
        } catch (err) {
          console.warn('[SW] 缓存失败(跳过):', url, err);
        }
      }
    })()
  );
  // 立即激活，不等所有页面关闭
  self.skipWaiting();
});

// Activate — 清理旧缓存 + 接管所有客户端
self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Fetch — 增强的 navigation 兜底
self.addEventListener('fetch', (e) => {
  // 只处理同源 GET 请求
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  // 对 HTML 导航请求：网络优先，失败时返回缓存的 index.html
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((resp) => {
          // 网络成功：缓存一份备用并在当前响应
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return resp;
        })
        .catch(() => {
          // 网络失败（离线或 404）：返回缓存的 index.html
          return caches.match('./index.html').then((cached) => {
            if (cached) return cached;
            // 兜底：返回一个简单的 HTML 页面
            return new Response(
              '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>报价单</title></head><body><h1>离线</h1><p>请联网后重试</p></body></html>',
              { headers: { 'Content-Type': 'text/html; charset=UTF-8' } }
            );
          });
        })
    );
    return;
  }

  // 静态资源（CSS/JS/图片等）：缓存优先，网络兜底
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request)
        .then((resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return resp;
        })
        .catch(() => {
          // 资源也可能离线，返回一个空响应避免 JS 报错
          return new Response('', { status: 408 });
        });
    })
  );
});
