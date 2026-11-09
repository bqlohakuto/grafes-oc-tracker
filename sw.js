// Service Worker for OC TRACKER. Push delivery from the backend is not yet enabled.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?.json()||{}}catch{data={body:event.data?.text()||''}}
  const title=String(data.title||'OC TRACKER');
  const options={body:String(data.body||'推しキャストの登場情報が届きました'),icon:'./assets/favicon.svg',badge:'./assets/favicon.svg',tag:String(data.tag||'oc-tracker'),data:{url:self.registration.scope}};
  event.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=self.registration.scope;
  event.waitUntil((async()=>{
    const clientsList=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of clientsList){
      if(client.url.startsWith(target)){await client.focus();return;}
    }
    await self.clients.openWindow(target);
  })());
});