// Sérénité : ouverture rapide et consultation hors connexion.
// Les données (Supabase) ne passent jamais par ce cache.
const V='serenite-v13';
const SHELL=['./','./index.html','./config.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const u=new URL(req.url);
  if(/supabase\.(co|in)$/.test(u.hostname))return;
  const fresh=req.mode==='navigate'||u.pathname.endsWith('/config.js')||u.pathname.endsWith('/index.html');
  if(fresh){
    e.respondWith(fetch(req).then(r=>{const cp=r.clone();caches.open(V).then(c=>c.put(req,cp));return r}).catch(()=>caches.match(req).then(r=>r||caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit=>{
    const net=fetch(req).then(r=>{if(r&&(r.ok||r.type==='opaque')){const cp=r.clone();caches.open(V).then(c=>c.put(req,cp))}return r}).catch(()=>hit);
    return hit||net;
  }));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=(e.notification.data&&e.notification.data.url)||'./';
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>{
    for(const c of l)if('focus' in c){c.focus();if('navigate' in c)c.navigate(url).catch(()=>{});return}
    return self.clients.openWindow(url);
  }));
});

/* Notification Web Push reçue pendant que Poka est en arrière-plan ou fermée.
   C'est ce qui permet à la « Question du jour » (et aux autres rappels) d'arriver
   même si l'appli n'est pas ouverte, ce qu'un simple minuteur dans la page ne peut jamais garantir sur iPhone. */
self.addEventListener('push',e=>{
  let data={};
  try{data=e.data?e.data.json():{}}catch(err){data={title:'Poka',body:e.data?e.data.text():''}}
  const title=data.title||'Poka';
  const opts={
    body:data.body||'',
    icon:'icon-192.png',
    badge:'icon-192.png',
    tag:data.tag||undefined,
    renotify:!!data.tag,
    data:{url:data.url||'./'}
  };
  e.waitUntil(self.registration.showNotification(title,opts));
});

