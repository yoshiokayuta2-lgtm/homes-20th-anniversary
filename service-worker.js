const CACHE_NAME='homes20-v5142';
const ASSETS=[
  './','./index.html','./admin.html','./admin.js','./ride-admin.html','./styles.css','./app.js','./history-data.js','./supabase-config.js','./manifest.webmanifest',
  './assets/homes-education-logo.png','./assets/homes-mark.png','./assets/rose.png',
  './assets/opening-master-hq.png','./assets/kenji-bike.png',
  './assets/app-icon-180.png','./assets/app-icon-192.png','./assets/app-icon-512.png','./assets/app-icon-maskable-512.png'
];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  const isAdmin = url.pathname.endsWith('/admin.html') || url.pathname.endsWith('/admin.js');
  if(isAdmin){
    event.respondWith(fetch(event.request,{cache:'no-store'}));
    return;
  }
  const freshFirst = url.pathname.endsWith('/') || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/app.js') || url.pathname.endsWith('/styles.css') || url.pathname.endsWith('/supabase-config.js') || url.pathname.endsWith('/history-data.js') || url.pathname.endsWith('/ride-admin.html');
  if(freshFirst){
    event.respondWith(fetch(event.request).then(response=>{
      const copy=response.clone(); caches.open(CACHE_NAME).then(c=>c.put(event.request,copy)); return response;
    }).catch(()=>caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    const copy=response.clone(); caches.open(CACHE_NAME).then(c=>c.put(event.request,copy)); return response;
  }).catch(()=>cached)));
});
