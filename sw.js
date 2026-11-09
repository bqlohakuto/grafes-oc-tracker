// OC TRACKER Web Push service worker. The server sends only public sightings.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?.json()||{}}catch{data={body:event.data?.text()||''}}
  const title=String(data.title||'OC TRACKER').slice(0,100);
  const options={
    body:String(data.body||'キャストの登場報告が届きました').slice(0,240),
    icon:'./assets/favicon.svg',badge:'./assets/favicon.svg',
    tag:String(data.tag||'oc-tracker').slice(0,64),
    data:{url:String(data.url||self.registration.scope)}
  };
  event.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  let target;
  try{
    target=new URL(event.notification.data?.url||self.registration.scope,self.registration.scope);
    if(!target.href.startsWith(self.registration.scope))target=new URL(self.registration.scope);
  }catch{target=new URL(self.registration.scope)}
  event.waitUntil((async()=>{
    const clientsList=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of clientsList){
      if(client.url.startsWith(self.registration.scope)){
        await client.navigate(target.href);
        await client.focus();return;
      }
    }
    await self.clients.openWindow(target.href);
  })());
});