// OC TRACKER 2026: static PWA-ready prototype with optional Supabase realtime backend.
// 会場位置・出演者はサンプルです。公式の公開情報に置き換えてください。
const TEST_MODE = new URLSearchParams(window.location.search).get('test') === '1';
const DAYS = TEST_MODE ? ['2026-12-25'] : ['2026-12-26','2026-12-27'];
const Z = [{slug:'anila',name:'アニラ',categories:['zodiac']},{slug:'anchira',name:'アンチラ',categories:['zodiac']},{slug:'makira',name:'マキラ',categories:['zodiac']},{slug:'vajra',name:'ヴァジラ',categories:['zodiac']},{slug:'kubira',name:'クビラ',categories:['zodiac']},{slug:'vikala',name:'ビカラ',categories:['zodiac']},{slug:'shatura',name:'シャトラ',categories:['zodiac']},{slug:'cindara',name:'シンダラ',categories:['zodiac']},{slug:'makora',name:'マコラ',categories:['zodiac']},{slug:'haara',name:'ハイラ',categories:['zodiac']},{slug:'indara',name:'インダラ',categories:['zodiac']},{slug:'sanchira',name:'サンチラ',categories:['zodiac']}];
const D = [{slug:'wilnas',name:'ウィルナス',categories:['dragons']},{slug:'wamdus',name:'ワムデュス',categories:['dragons']},{slug:'galleon',name:'ガレヲン',categories:['dragons']},{slug:'ewiyar',name:'イーウィヤ',categories:['dragons']},{slug:'luwoh',name:'ル・オー',categories:['dragons']},{slug:'fediel',name:'フェディエル',categories:['dragons']}];
const O = [{slug:'siete',name:'シエテ',categories:['eternals']},{slug:'sandalphon',name:'サンダルフォン',categories:['other']},{slug:'belial',name:'ベリアル',categories:['other']}];
const CASTS = [...Z,...D,...O];
const CATEGORIES = [{slug:'all',name:'すべて'},{slug:'zodiac',name:'十二神将'},{slug:'dragons',name:'六竜'},{slug:'eternals',name:'十天衆'},{slug:'fourknights',name:'四騎士'},{slug:'evokers',name:'十賢者'},{slug:'organization',name:'組織'},{slug:'other',name:'その他'}];
const AREAS = [
 {code:'main-stage',name:'メインステージ',kind:'stage',x:50,y:25},
 {code:'photo-a',name:'撮影スポットA',kind:'photo',x:30,y:58},
 {code:'photo-b',name:'撮影スポットB',kind:'photo',x:70,y:58},
 {code:'photo-c',name:'撮影スポットC',kind:'photo',x:50,y:78},
];
const STATUS = {
 unknown:{label:'未確認',icon:'?',cls:'unknown'},open:{label:'列形成開始',icon:'♧',cls:'open'},closed:{label:'列締切',icon:'🔒',cls:'closed'},done:{label:'撮影終了',icon:'✓',cls:'done'},
 scheduled:{label:'公式予定未登録',icon:'▤',cls:'scheduled'},started:{label:'出演開始報告',icon:'▶',cls:'started'},ended:{label:'出演終了報告',icon:'✓',cls:'done'},
};
const LOCAL_KEY='oc-tracker-demo-v1';
const FAV_KEY='oc-tracker-favorites-v1';
const NOTIFY_KEY='oc-tracker-notifications-enabled-v1';
const notificationSnapshots=new Map();
const recentlyNotified=new Map();
let notificationHistory=[];
function onIncomingReports(next,day){
 const prev=notificationSnapshots.get(day);
 notificationSnapshots.set(day,new Set(next.map(e=>e.source+':'+e.id)));
 if(!prev||!state.notificationsEnabled)return;
 const now=Date.now();
 const matches=next.filter(e=>e.source==='cast'&&e.status==='seen'&&!prev.has(e.source+':'+e.id)&&state.favorite.includes(e.cast)&&Math.abs(now-new Date(e.created_at).getTime())<5*60000)
 .sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
 for(const event of matches){
   const key=[day,event.area,event.cast].join(':');
   if(now-(recentlyNotified.get(key)||0)<20*60000)continue;
   recentlyNotified.set(key,now);
   const name=castName(event.cast);
   const where=AREAS.find(a=>a.code===event.area)?.name||event.area;
   const message=name+' が '+where+' に登場したとの報告がありました';
   notificationHistory.unshift({text:message,time:now,area:event.area});
   notificationHistory=notificationHistory.slice(0,10);
   toast('🔔 '+message);
   if(state.pushStatus!=='on'&&typeof Notification!=='undefined'&&Notification.permission==='granted'){
     const payload={body:where+' · 来場者からの登場報告',tag:'oc-'+key,icon:'./assets/favicon.svg',data:{url:location.href}};
     if('serviceWorker' in navigator)navigator.serviceWorker.ready.then(reg=>reg.showNotification('🔔 '+name+' の登場情報',payload)).catch(()=>{});
     else try{new Notification('🔔 '+name+' の登場情報',payload)}catch{}
   }
 }
}
async function toggleFavoriteNotifications(){
 state.notificationsEnabled=!state.notificationsEnabled;
 localStorage.setItem(NOTIFY_KEY,JSON.stringify(state.notificationsEnabled));
 if(state.notificationsEnabled&&'Notification' in window&&Notification.permission==='default'){
   try{await Notification.requestPermission()}catch{}
 }
 render();
 toast(state.notificationsEnabled?'お気に入りの新着登場報告を通知します（アプリ起動中）':'登場通知をオフにしました');
}
function notificationSettingsPanel(){
 const pushButton=state.pushStatus==='on'
   ?'<button class="btn ghost" data-action="push-disable" '+(state.pushBusy?'disabled':'')+'>プッシュ通知を解除</button>'
   :'<button class="btn green" data-action="push-enable" '+(state.pushBusy?'disabled':'')+'>プッシュ通知を登録</button>';
 return '<div class="section-card" style="margin-bottom:12px"><div class="section-heading"><h2>🔔 推しの登場通知</h2><button class="btn '+(state.notificationsEnabled?'green':'ghost')+'" data-action="toggle-notifications">'+(state.notificationsEnabled?'画面内ON':'画面内OFF')+'</button></div><p class="hint">★を付けたキャストの新しい「登場」報告をお知らせします。通知が重ならないよう同じキャスト・場所は20分間まとめます。</p><p class="hint">'+escapeHtml(pushSettingsText())+'</p>'+pushButton+'<p class="hint">iPhoneでアプリを閉じていても通知するには、Safariの共有からホーム画面に追加し、追加したOC TRACKERを開いて通知を許可してください。</p>'+(notificationHistory.length?'<div class="notice">最近の通知：'+escapeHtml(notificationHistory[0].text)+'</div>':'')+'</div>';
}

function urlBase64ToUint8Array(s){const padded=(s+'='.repeat((4-s.length%4)%4)).replace(/-/g,'+').replace(/_/g,'/');return Uint8Array.from(atob(padded),c=>c.charCodeAt(0))}
async function ensurePushUser(){
 if(!api)throw new Error('Supabaseに接続されていません');
 const {data:{session},error}=await api.auth.getSession();if(error)throw error;
 if(session?.user)return {user:session.user,token:session.access_token};
 const result=await api.auth.signInAnonymously();if(result.error)throw result.error;
 if(!result.data.user||!result.data.session)throw new Error('匿名ログインに失敗しました');
 return {user:result.data.user,token:result.data.session.access_token};
}
async function syncFavoritesForPush(user){
 const {data,error}=await api.from('oc_favorites').select('cast_slug').eq('user_id',user.id);if(error)throw error;
 const saved=new Set((data||[]).map(r=>r.cast_slug));
 const add=state.favorite.filter(c=>!saved.has(c)),del=[...saved].filter(c=>!state.favorite.includes(c));
 if(add.length){const r=await api.from('oc_favorites').insert(add.map(cast_slug=>({user_id:user.id,cast_slug})));if(r.error)throw r.error}
 if(del.length){const r=await api.from('oc_favorites').delete().eq('user_id',user.id).in('cast_slug',del);if(r.error)throw r.error}
}
async function syncFavoriteForPush(slug,added){
 if(!api||state.pushStatus!=='on')return;
 try{
  const {user}=await ensurePushUser();
  const r=added?await api.from('oc_favorites').insert({user_id:user.id,cast_slug:slug}):await api.from('oc_favorites').delete().eq('user_id',user.id).eq('cast_slug',slug);
  if(r.error&&!(added&&r.error.code==='23505'))throw r.error;
 }catch(e){toast('推し通知の同期失敗：'+(e?.message||e))}
}
async function refreshPushStatus(){
 try{
  if(!api||!('serviceWorker' in navigator)||!('PushManager' in window)){state.pushStatus='unsupported';return}
  const reg=await navigator.serviceWorker.ready;
  const sub=await reg.pushManager.getSubscription();
  if(!sub){state.pushStatus='off';return}
  const {data:{session}}=await api.auth.getSession();
  if(!session?.user){state.pushStatus='off';return}
  const {data,error}=await api.from('oc_push_subscriptions').select('endpoint').eq('user_id',session.user.id).eq('endpoint',sub.endpoint).eq('test_only',TEST_MODE).maybeSingle();
  if(error)throw error;
  state.pushStatus=data?'on':'off';
 }catch{state.pushStatus='off'}finally{render()}
}
async function enablePush(){
 if(state.pushBusy)return;
 if(mode!=='live'||!api){toast('LIVE接続後に登録してください');return}
 if(!('Notification' in window)||!('serviceWorker' in navigator)||!('PushManager' in window)){toast('このブラウザはプッシュ通知に非対応です');return}
 const iphone=/iPad|iPhone|iPod/.test(navigator.userAgent);
 if(iphone&&!(navigator.standalone===true||window.matchMedia('(display-mode: standalone)').matches)){
  toast('iPhoneではSafariからホーム画面に追加したアプリを開いてください');return;
 }
 // On iOS the permission request must run directly in the click handler.
 try{
  const permission=Notification.permission==='default'?await Notification.requestPermission():Notification.permission;
  if(permission!=='granted'){toast('通知の許可が必要です');return}
 }catch(e){toast('通知の許可に失敗：'+(e?.message||e));return}
 state.pushBusy=true;state.pushStatus='working';render();
 try{
  const {user,token}=await ensurePushUser();
  const resp=await fetch(config.supabaseUrl+'/functions/v1/oc-push',{method:'GET',headers:{authorization:'Bearer '+token,apikey:config.supabasePublishableKey}});
  if(!resp.ok)throw new Error('通知サーバー HTTP '+resp.status);
  const details=await resp.json();if(!details.publicKey)throw new Error('通知用公開鍵がありません');
  const reg=await navigator.serviceWorker.ready;
  let sub=await reg.pushManager.getSubscription();
  if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(details.publicKey)});
  const json=sub.toJSON();
  if(!json.keys?.p256dh||!json.keys?.auth)throw new Error('購読情報が取得できません');
  const {error}=await api.from('oc_push_subscriptions').upsert({
   endpoint:sub.endpoint,user_id:user.id,p256dh:json.keys.p256dh,auth_key:json.keys.auth,
   enabled:true,test_only:TEST_MODE,updated_at:new Date().toISOString()
  },{onConflict:'endpoint'});
  if(error)throw error;
  state.pushStatus='on';state.notificationsEnabled=true;localStorage.setItem(NOTIFY_KEY,'true');
  try{await syncFavoritesForPush(user)}catch(e){toast('登録は完了。★の同期失敗：'+(e?.message||e))}
  toast('プッシュ通知の登録が完了しました');
 }catch(e){state.pushStatus='off';toast('プッシュ通知の登録失敗：'+(e?.message||e))}
 finally{state.pushBusy=false;render()}
}
async function disablePush(){
 if(state.pushBusy||!api)return;
 state.pushBusy=true;render();
 try{
  const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();
  if(sub){
   const {user}=await ensurePushUser();
   const {error}=await api.from('oc_push_subscriptions').delete().eq('endpoint',sub.endpoint).eq('user_id',user.id);
   if(error)throw error;
   await sub.unsubscribe();
  }
  state.pushStatus='off';toast('プッシュ通知を解除しました');
 }catch(e){toast('通知解除の失敗：'+(e?.message||e))}
 finally{state.pushBusy=false;render()}
}
function pushSettingsText(){
 if(state.pushStatus==='on')return 'プッシュ通知：登録済み'+(TEST_MODE?'（テスト用）':'');
 if(state.pushStatus==='working')return 'プッシュ通知：登録処理中';
 if(state.pushStatus==='unsupported')return 'プッシュ通知に非対応の端末です';
 if(state.pushStatus==='checking')return 'プッシュ通知の登録を確認中';
 return 'プッシュ通知：未登録';
}

const getLocal=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const todayJst=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const config=window.OC_TRACKER_CONFIG||{};
const liveRequested=!!(config.supabaseUrl&&config.supabasePublishableKey);
let api=null, channel=null, mode='demo', loadError='', toastTimer=null;
let records=liveRequested?[]:getLocal(LOCAL_KEY,null);
function initialRecords(){
 const m=Date.now();
 return [
 {id:'d0',source:'queue',day:DAYS[0],area:'photo-a',status:'open',created_at:new Date(m-3*60000).toISOString()},
 {id:'d1',source:'cast',day:DAYS[0],area:'photo-a',cast:'wilnas',status:'seen',created_at:new Date(m-2.5*60000).toISOString()},
 {id:'d2',source:'cast',day:DAYS[0],area:'photo-a',cast:'galleon',status:'seen',created_at:new Date(m-2*60000).toISOString()},
 {id:'d3',source:'queue',day:DAYS[0],area:'photo-b',status:'open',created_at:new Date(m-7*60000).toISOString()},
 {id:'d4',source:'cast',day:DAYS[0],area:'photo-b',cast:'makira',status:'seen',created_at:new Date(m-6*60000).toISOString()},
 {id:'d5',source:'queue',day:DAYS[0],area:'photo-b',status:'closed',created_at:new Date(m-5*60000).toISOString()},
 ];
}
if(!Array.isArray(records)) records=liveRequested?[]:initialRecords();
const state={tab:'map',day:DAYS.includes(todayJst())?todayJst():DAYS[0],selected:'photo-a',filter:'all',category:'all',castSearch:'',draftCast:'wilnas',favorite:getLocal(FAV_KEY,[]),zoom:1,posting:false,notificationsEnabled:getLocal(NOTIFY_KEY,false),pushStatus:'checking',pushBusy:false};
function toast(message){const el=document.getElementById('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3000)}
function diffMinutes(iso){return Math.max(0,Math.floor((Date.now()-new Date(iso).getTime())/60000))}
function ageLabel(iso){if(!iso)return '報告なし';const n=diffMinutes(iso);if(n<1)return 'たった今';if(n<60)return `${n}分前`;return `${Math.floor(n/60)}時間前`}
function castName(slug){return CASTS.find(c=>c.slug===slug)?.name||slug}
function sorted(list){return [...list].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)||String(a.id).localeCompare(String(b.id)))}
function areaState(code){
 const area=AREAS.find(a=>a.code===code);if(!area)return null;
 const events=sorted(records.filter(e=>e.day===state.day&&e.area===code));
 let status=area.kind==='stage'?'scheduled':'unknown',lastAt=null,lastQueueAt=null,castSeen=new Map();let rounds=0;
 for(const e of events){
  if(e.source==='queue'){
   if(e.status==='open'&&(status==='done'||status==='unknown')){castSeen=new Map();rounds++}
   if(e.status==='done')castSeen.clear();
   status=e.status;lastQueueAt=e.created_at;lastAt=e.created_at;
  } else if(e.source==='cast'){
   if(status==='done'||status==='ended')continue;
   if(e.status==='left')castSeen.delete(e.cast);
   else if(e.status==='seen'||e.status==='still')castSeen.set(e.cast,e.created_at);
   lastAt=e.created_at;
  } else if(e.source==='stage') {if(e.status==='started'&&status==='ended')castSeen.clear();if(e.status==='ended')castSeen.clear();status=e.status;lastAt=e.created_at}
 }
 return {code,area,status,casts:[...castSeen.keys()],lastAt,lastQueueAt,rounds,stale:!!(lastQueueAt&&diffMinutes(lastQueueAt)>=10&&status!=='done')};
}
const areaRows=()=>AREAS.map(a=>areaState(a.code));
function pill(status,stale=false){const s=STATUS[status]||STATUS.unknown;return `<span class="badge ${s.cls}">${escapeHtml(s.label)}${stale?' · 要再確認':''}</span>`}
function icon(status){return (STATUS[status]||STATUS.unknown).icon}
function header(){return `<header class="top"><div><div class="eyebrow">GRANFES 2026 · UNOFFICIAL</div><div class="brand">OC TRACKER</div><div class="subtitle">登場キャストと列状況をリアルタイムに共有</div></div><span class="mode ${mode==='live'?'live':''}">${mode==='live'?(TEST_MODE?'LIVE · TEST':'LIVE'):mode==='offline'?'接続不可':'デモモード'}</span></header>`}
function toolbar(){return `<div class="bar"><div class="date-switch" role="group" aria-label="開催日">${DAYS.map(d=>`<button data-day="${d}" class="${d===state.day?'active':''}">${d.slice(8)}日 (${d.endsWith('25')?'テスト':d.endsWith('26')?'土':'日'})</button>`).join('')}</div><div class="grow"></div><select id="filter-select" class="field" aria-label="表示するキャスト"><option value="all">全キャスト</option><option value="fav" ${state.filter==='fav'?'selected':''}>★ お気に入り</option>${CASTS.map(c=>`<option value="${c.slug}" ${state.filter===c.slug?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}</select><button class="btn ghost" data-action="refresh" style="white-space:nowrap" aria-label="報告を再取得">↻ 更新</button></div>`}
function mapPin(p){const focus=state.filter==='all'||(state.filter==='fav'?p.casts.some(c=>state.favorite.includes(c)):p.casts.includes(state.filter));return `<button class="map-pin ${STATUS[p.status]?.cls||'unknown'} ${state.selected===p.code?'selected':''} ${focus?'':'dim'}" data-select="${p.code}" style="left:${p.area.x}%;top:${p.area.y}%" aria-label="${escapeHtml(p.area.name)}: ${escapeHtml(STATUS[p.status]?.label)}。${p.casts.length}人"><span class="pin-row"><span class="pin-icon">${icon(p.status)}</span><span class="pin-name">${escapeHtml(p.area.name.replace('撮影スポット','撮影 '))}</span></span><div class="pin-state">${escapeHtml(STATUS[p.status]?.label||'')}</div><div class="pin-sub">${p.area.kind==='photo'?`OC ${p.casts.length}人 · ${ageLabel(p.lastAt)}`:ageLabel(p.lastAt)}</div></button>`}
function mapView(){return `${toolbar()}<div class="disclaimer">会場図・スポット位置・キャストは仮データです。正式な会場マップと出演情報に差し替えるまで、現地の案内として使わないでください。</div><div class="main-layout"><div><div class="map-toolbar"><div class="map-title">会場マップ <span class="small">仮配置</span></div><div class="toolbar-right"><button class="icon-btn" data-zoom="out" aria-label="縮小">－</button><button class="icon-btn" data-zoom="in" aria-label="拡大">＋</button></div></div><div class="map-viewport" id="map-viewport"><div class="map-board" style="width:${Math.round(state.zoom*100)}%"><img src="./assets/venue-placeholder.svg" alt="公式の会場図ではない仮のマップ">${areaRows().map(mapPin).join('')}</div></div><div class="legend"><span><b class="c-open">●</b> 列形成開始</span><span><b class="c-closed">●</b> 列締切</span><span><b class="c-done">●</b> 撮影終了</span><span><b class="c-stage">●</b> ステージ</span></div></div><section class="section-card" id="details">${detailPanel()}</section></div>`}
function detailPanel(){const p=areaState(state.selected);if(!p)return '';
 const stage=p.area.kind==='stage';const shown=p.casts.map(c=>`<span class="chip">${state.favorite.includes(c)?'★ ':''}${escapeHtml(castName(c))}</span>`).join('');
 return `<div class="section-heading"><h2>${escapeHtml(p.area.name)}</h2>${pill(p.status,p.stale)}</div><div class="small">最終報告：${ageLabel(p.lastAt)}${p.rounds?` · 第${p.rounds}回（仮の番号）`:''}</div>${stage?`<div class="notice">ステージ出演は待機列と別管理。公式の出演予定は、公開情報の登録後に表示します。</div><h3 style="font-size:.92rem;margin:17px 0 6px">登場キャスト (${p.casts.length}人)</h3>${shown?`<div class="cast-chips">${shown}</div>`:'<div class="empty">キャスト情報はまだありません</div>'}<div class="divider"></div><div class="form-label">出演キャストを報告</div><div class="form-group"><label class="form-label" for="cast-category">カテゴリ</label><select id="cast-category" class="field" style="width:100%">${CATEGORIES.filter(c=>c.slug==='all'||CASTS.some(x=>x.categories.includes(c.slug))).map(c=>`<option value="${c.slug}" ${state.category===c.slug?'selected':''}>${c.name}</option>`).join('')}</select></div><div class="inline"><select id="cast-pick" class="field" aria-label="報告するキャスト">${CASTS.filter(c=>state.category==='all'||c.categories.includes(state.category)).map(c=>`<option value="${c.slug}" ${state.draftCast===c.slug?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}</select></div><div class="split-buttons" style="margin-top:9px"><button class="btn primary" data-report="cast:seen">登場を報告</button><button class="btn" data-report="cast:still">まだいる</button><button class="btn ghost" data-report="cast:left">離れた</button></div>`:`<h3 style="font-size:.92rem;margin:17px 0 6px">登場キャスト (${p.casts.length}人)</h3>${shown?`<div class="cast-chips">${shown}</div>`:'<div class="empty">キャスト情報はまだありません</div>'}${p.stale?'<p class="notice warn">最後の列状況報告から10分以上経過。現在の状況は要再確認です。</p>':''}<div class="divider"></div><div class="form-label">① 待機列の状態を報告</div><div class="split-buttons"><button class="btn green" data-report="queue:open">列形成開始</button><button class="btn gold" data-report="queue:closed">列締切</button><button class="btn" data-report="queue:done">撮影終了</button></div><div class="divider"></div><div class="form-label">② 登場キャストを報告</div><div class="form-group"><label class="form-label" for="cast-category">カテゴリ</label><select id="cast-category" class="field" style="width:100%">${CATEGORIES.filter(c=>c.slug==='all'||CASTS.some(x=>x.categories.includes(c.slug))).map(c=>`<option value="${c.slug}" ${state.category===c.slug?'selected':''}>${c.name}</option>`).join('')}</select></div><div class="inline"><select id="cast-pick" class="field" aria-label="報告するキャスト">${CASTS.filter(c=>state.category==='all'||c.categories.includes(state.category)).map(c=>`<option value="${c.slug}" ${state.draftCast===c.slug?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}</select></div><div class="split-buttons" style="margin-top:9px"><button class="btn primary" data-report="cast:seen">登場を報告</button><button class="btn" data-report="cast:still">まだいる</button><button class="btn ghost" data-report="cast:left">離れた</button></div><p class="hint">キャスト報告と列状況の報告は独立しています。キャスト未判明でも列形成を報告できます。</p>`}
 ${stage?`<div class="divider"></div><div class="form-label">ステージ出演状況を報告</div><div class="split-buttons"><button class="btn green" data-report="stage:started">出演開始</button><button class="btn" data-report="stage:ended">出演終了</button></div>`:''}
 <div class="notice" style="margin-top:14px">${mode==='demo'?'デモ操作はこの端末内にだけ保存され、他の利用者には共有されません。':'投稿は他の閲覧者にも共有されます。公開エリアで直接確認した情報だけを報告してください。'}</div>`}
function rosterView(){const list=CASTS.filter(c=>(state.category==='all'||c.categories.includes(state.category))&&c.name.includes(state.castSearch));return `<h2 class="page-title">キャスト一覧</h2>`+notificationSettingsPanel()+`<p class="hint">十二神将・六竜などカテゴリで絞り込み。★をつけるとマップ上で登場スポットを探しやすくなります。</p><input class="field search" id="cast-search" placeholder="キャスト名で検索" value="${escapeHtml(state.castSearch)}" aria-label="キャスト検索"><div class="category-grid">${CATEGORIES.map(c=>`<button data-category="${c.slug}" class="${c.slug===state.category?'active':''}">${c.name}</button>`).join('')}</div><div class="roster">${list.length?list.map(c=>`<button class="roster-item" data-favorite="${c.slug}" aria-label="${escapeHtml(c.name)}をお気に入り切り替え"><span>${escapeHtml(c.name)}</span><span class="favorite">${state.favorite.includes(c.slug)?'★':'☆'}</span></button>`).join(''):'<div class="empty">該当するキャストがありません</div>'}</div><p class="footer-note">出演者マスターはサンプルです。正式なOC情報が確定したら、一覧と分類を更新します。</p>`}
function stagesView(){const s=areaState('main-stage');return `<h2 class="page-title">ステージ</h2><div class="section-card"><div class="section-heading"><h2>メインステージ</h2>${pill(s.status)}</div><p class="hint">公式ステージ予定は未登録です。予定と当日報告は分けて表示します。</p><div class="notice">公式情報に掲載された出演予定を取り込み、出演開始・終了の目撃報告を追記する形式です。</div><div class="split-buttons" style="grid-template-columns:1fr 1fr;margin-top:13px"><button class="btn green" data-stage-report="started">出演開始を報告</button><button class="btn" data-stage-report="ended">出演終了を報告</button></div></div>`}
function historyView(){const data=sorted(records.filter(x=>x.day===state.day)).reverse();const action=e=>e.source==='queue'?({'open':'列形成開始','closed':'列締切','done':'撮影終了'}[e.status]):e.source==='stage'?({'started':'出演開始','ended':'出演終了'}[e.status]):`${castName(e.cast)}：${({'seen':'登場','still':'引き続き登場','left':'離脱'}[e.status]||e.status)}`;return `<h2 class="page-title">報告履歴</h2><div class="section-card">${data.length?data.slice(0,100).map(e=>`<div class="list-row"><div><strong>${escapeHtml(action(e))}</strong><div class="small">${escapeHtml(AREAS.find(a=>a.code===e.area)?.name||e.area)} · ${ageLabel(e.created_at)}</div></div><div class="small">${escapeHtml(new Date(e.created_at).toLocaleTimeString('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit'}))}</div></div>`).join(''):'<div class="empty">まだ報告がありません</div>'}</div>${mode==='demo'?'<button class="btn ghost full" data-action="reset-demo">デモデータを初期化する</button>':''}`}
function nav(){return `<nav class="nav" aria-label="メインメニュー">${[{tab:'map',icon:'▣',text:'マップ'},{tab:'casts',icon:'♧',text:'キャスト'},{tab:'stage',icon:'▤',text:'ステージ'},{tab:'history',icon:'◷',text:'報告履歴'}].map(t=>`<button data-tab="${t.tab}" class="${state.tab===t.tab?'active':''}"><span class="nav-icon">${t.icon}</span>${t.text}</button>`).join('')}</nav>`}
function render(){document.getElementById('app').innerHTML=header()+(TEST_MODE?'<div class="disclaimer"><strong>🧪 動作テスト専用</strong>：12月25日のテスト用データです。実際の開催日（26日・27日）には反映されません。</div>':'')+(loadError?`<p class="disclaimer">${escapeHtml(loadError)} デモモードで利用できます。</p>`:'')+(state.tab==='map'?mapView():state.tab==='casts'?rosterView():state.tab==='stage'?stagesView():historyView())+`<div class="footer-note">非公式ファン制作の試作アプリ。撮影許可・列形成・現場スタッフの案内が最優先です。移動経路や非公開エリアの位置情報は共有しないでください。<br><a href="${TEST_MODE?'./':'./?test=1'}">${TEST_MODE?'開催日画面へ戻る':'🧪 動作テストモードを開く'}</a></div>`+nav()}
function switchCategory(category){state.category=category;const choices=CASTS.filter(c=>category==='all'||c.categories.includes(category));if(!choices.some(c=>c.slug===state.draftCast))state.draftCast=choices[0]?.slug||'';render()}
async function sendReport(source,status){if(state.posting)return;if(liveRequested&&mode!=='live'){toast('通信できません。再接続後に報告してください');return}const area=state.selected;const p=areaState(area);if(!p)return;
 if(source==='queue'&&p.area.kind!=='photo'){toast('ステージでは列状況を報告できません');return}
 if(source==='cast'&&!state.draftCast){toast('キャストを選択してください');return}
 if(source==='cast'&&(p.status==='done'||p.status==='ended')){toast('この回は終了しています。新しい撮影回・出演開始の報告を先に行ってください');return}
 if(source==='stage'&&p.area.kind!=='stage'){toast('ステージを選択してください');return}
 if(source==='queue'&&status==='open'&&p.status==='open'){toast('列形成開始の報告があります。必要なら「まだいる」を使ってください');return}
 const item={id:crypto.randomUUID?.()||String(Date.now()),source,day:state.day,area,status,created_at:new Date().toISOString(),...(source==='cast'?{cast:state.draftCast}:{})};
 state.posting=true;try{
  if(mode==='live'&&api){
   const {data:{session},error:sessionError}=await api.auth.getSession();if(sessionError)throw sessionError;
   let user=session?.user;
   if(!user){const {data,error}=await api.auth.signInAnonymously();if(error)throw error;user=data.user}
   if(!user)throw new Error('匿名認証に失敗しました');
   const table={queue:'queue_reports',cast:'cast_reports',stage:'stage_reports'}[source];
   const row={day:item.day,area_code:item.area,status:item.status,reporter_id:user.id,...(source==='cast'?{cast_slug:item.cast}:{})};
   const {error}=await api.from(table).insert(row);if(error)throw error;
   await fetchReports();toast('報告を共有しました');
  }else{records.push(item);localStorage.setItem(LOCAL_KEY,JSON.stringify(records));toast('この端末のデモに反映しました')}
 }catch(err){toast(`投稿失敗：${err?.message||'接続できません'}`)}finally{state.posting=false;render()}
}
async function fetchReports(){if(!api)return;let next=[];for(const [table,source] of [['queue_reports','queue'],['cast_reports','cast'],['stage_reports','stage']]){
 const cols=source==='cast'?'id,day,area_code,cast_slug,status,created_at':'id,day,area_code,status,created_at';
 for(let start=0;start<10000;start+=1000){
  const {data,error}=await api.from(table).select(cols).eq('day',state.day).order('created_at',{ascending:true}).order('id',{ascending:true}).range(start,start+999);
  if(error)throw error;
  next.push(...(data||[]).map(r=>({id:r.id,day:r.day,area:r.area_code,status:r.status,source,created_at:r.created_at,...(source==='cast'?{cast:r.cast_slug}:{})})));
  if((data||[]).length<1000)break;
  if(start===9000)throw new Error('報告数が上限を超えたため最新状態を確定できません');
 }
 }onIncomingReports(next,state.day);records=next;render();}
function subscribe(){if(channel&&api)api.removeChannel(channel);if(!api)return;
 channel=api.channel(`oc-tracker-${state.day}`);
 for(const table of ['queue_reports','cast_reports','stage_reports'])channel.on('postgres_changes',{event:'INSERT',schema:'public',table,filter:`day=eq.${state.day}`,select:table==='cast_reports'?['id','day','area_code','cast_slug','status','created_at']:['id','day','area_code','status','created_at']},()=>fetchReports().catch(e=>toast('再取得に失敗：'+e.message)));
 channel.subscribe(status=>{if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')toast('ライブ接続が不安定です。再読込で更新してください')});
}
async function boot(){if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});if(liveRequested){try{const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.58.0');api=createClient(config.supabaseUrl,config.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true}});await fetchReports();mode='live';loadError='';subscribe();refreshPushStatus();}catch(e){mode='offline';api=null;records=[];loadError=`Supabase接続エラー：${e.message}。安全のため報告操作を停止しています。`;}}render()}
const app=document.getElementById('app');
app.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.day){state.day=b.dataset.day;if(mode==='live')fetchReports().then(subscribe).catch(err=>toast(err.message));render()}
 if(b.dataset.tab){state.tab=b.dataset.tab;render();window.scrollTo({top:0,behavior:'smooth'})}
 if(b.dataset.select){state.selected=b.dataset.select;render();if(matchMedia('(max-width:699px)').matches)document.getElementById('details')?.scrollIntoView({behavior:'smooth',block:'start'})}
 if(b.dataset.zoom){state.zoom=Math.min(1.9,Math.max(1,Math.round((state.zoom+(b.dataset.zoom==='in'?.25:-.25))*100)/100));const view=document.getElementById('map-viewport');const top=view?.scrollTop||0,left=view?.scrollLeft||0;render();document.getElementById('map-viewport').scrollTo(left,top)}
 if(b.dataset.category)switchCategory(b.dataset.category);
 if(b.dataset.favorite){const c=b.dataset.favorite;const added=!state.favorite.includes(c);state.favorite=added?[...state.favorite,c]:state.favorite.filter(x=>x!==c);localStorage.setItem(FAV_KEY,JSON.stringify(state.favorite));render();syncFavoriteForPush(c,added)}
 if(b.dataset.report){const [source,status]=b.dataset.report.split(':');sendReport(source,status)}
 if(b.dataset.stageReport){state.selected='main-stage';sendReport('stage',b.dataset.stageReport)}
 if(b.dataset.action==='toggle-notifications')toggleFavoriteNotifications();
 if(b.dataset.action==='push-enable')enablePush();
 if(b.dataset.action==='push-disable')disablePush();
 if(b.dataset.action==='refresh'&&mode==='live'){fetchReports().then(()=>toast('最新の情報に更新しました')).catch(err=>toast('更新失敗：'+err.message))}
 if(b.dataset.action==='reset-demo'&&mode==='demo'){records=initialRecords();localStorage.setItem(LOCAL_KEY,JSON.stringify(records));render();toast('デモを初期化しました')}
});
app.addEventListener('change',e=>{
 if(e.target.id==='filter-select'){state.filter=e.target.value;render()}
 if(e.target.id==='cast-category')switchCategory(e.target.value);
 if(e.target.id==='cast-pick')state.draftCast=e.target.value;
 if(e.target.id==='cast-search'){state.castSearch=e.target.value;render()}
});
app.addEventListener('input',e=>{if(e.target.id==='cast-search'){state.castSearch=e.target.value;const target=e.target;const pos=target.selectionStart;render();const next=document.getElementById('cast-search');next.focus();next.setSelectionRange(pos,pos)}});
window.addEventListener('online',()=>{if(liveRequested&&mode==='offline')boot();else if(mode==='live')fetchReports().catch(()=>{});});
boot();