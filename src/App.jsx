import CustomerStorefront from './customer/CustomerStorefront.tsx'
import React,{useEffect,useState,useRef} from 'react'
import {Routes,Route,Link,Navigate,useNavigate} from 'react-router-dom'
import {api,login,token,orderSocket,clearAuth,mediaUrl} from './api'

const newRequestKey=()=>globalThis.crypto?.randomUUID?.()||`waselni-${Date.now()}-${Math.random().toString(36).slice(2)}`;
import {dict} from './i18n'
const money=v=>`${Number(v||0).toFixed(2)} ₪`
const GEOCODING_BASE=(import.meta.env.VITE_GEOCODING_URL||'https://nominatim.openstreetmap.org/reverse').trim()
const MAP_TILE_URL = (
  import.meta.env.VITE_MAP_TILE_URL ||
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
).trim();
const MAP_ATTRIBUTION=import.meta.env.VITE_MAP_ATTRIBUTION||'&copy; OpenStreetMap &copy; CARTO'
const statusLabel=(t,s)=>t[s]||s
const APP_ROLE=(import.meta.env.VITE_WASELNI_APP_ROLE||'all').toLowerCase()
const APP_ROLE_LABEL={customer:'تطبيق الزبون',captain:'تطبيق الكابتن',merchant:'تطبيق التاجر',admin:'لوحة الإدارة',all:'وصلني'}

// A single app-level toast layer keeps feedback above sticky navigation, cards and maps.
function notify(message, type='success') {
 if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('waselni:toast',{detail:{message:String(message||''),type}}));
}
function ToastViewport({t}){
 const [items,setItems]=useState([]);
 useEffect(()=>{
  const onToast=e=>{
   const id=`${Date.now()}-${Math.random()}`;
   const item={id,message:e.detail?.message||'',type:e.detail?.type||'success'};
   setItems(old=>[...old.slice(-2),item]);
   window.setTimeout(()=>setItems(old=>old.filter(x=>x.id!==id)),5000);
  };
  window.addEventListener('waselni:toast',onToast);
  return()=>window.removeEventListener('waselni:toast',onToast);
 },[]);
 return <div className="toast-viewport" aria-live="polite" aria-atomic="false">{items.map(item=><div key={item.id} className={`app-toast ${item.type==='error'?'toast-error':'toast-success'}`} role={item.type==='error'?'alert':'status'}><span className="toast-indicator">{item.type==='error'?'!':'✓'}</span><span className="toast-message">{item.message}</span><button type="button" className="toast-close" aria-label={t.dismissNotification} onClick={()=>setItems(old=>old.filter(x=>x.id!==item.id))}>×</button></div>)}</div>;
}
function App(){
 const [lang,setLang]=useState(localStorage.getItem('waselni_lang')||'ar')
 const [me,setMe]=useState(null),[error,setError]=useState(''),[passwordError,setPasswordError]=useState(''),[registering,setRegistering]=useState(false),[registerError,setRegisterError]=useState(''),[registerNotice,setRegisterNotice]=useState('')
 const t=dict[lang],rtl=lang!=='en'
 useEffect(()=>{document.documentElement.lang=lang;document.documentElement.dir=rtl?'rtl':'ltr';localStorage.setItem('waselni_lang',lang)},[lang])
 useEffect(()=>{if(token())api('/me/').then(user=>{if(APP_ROLE!=='all'&&user.role!==APP_ROLE){clearAuth();setError(`هذا الحساب لا يملك صلاحية الدخول إلى ${APP_ROLE_LABEL[APP_ROLE]||APP_ROLE}.`);return}setMe(user)}).catch(()=>clearAuth())},[])
 async function signIn(e){e.preventDefault();setError('');const fd=new FormData(e.currentTarget);try{await login(fd.get('username'),fd.get('password'));const user=await api('/me/');if(APP_ROLE!=='all'&&user.role!==APP_ROLE){clearAuth();throw new Error(`هذا الحساب لا يملك صلاحية الدخول إلى ${APP_ROLE_LABEL[APP_ROLE]||APP_ROLE}.`)}setMe(user)}catch(x){setError(x.message)}}
 async function signUp(e){e.preventDefault();setRegisterError('');setRegisterNotice('');const fd=new FormData(e.currentTarget);fd.set('role','customer');try{const result=await api('/auth/register/',{method:'POST',body:fd});setRegisterNotice(`${result.message} Username: ${result.username}`);setRegistering(false)}catch(x){setRegisterError(x.message)}}
 function signOut(){clearAuth();setMe(null)}
 async function changeInitialPassword(e){e.preventDefault();setPasswordError('');const fd=new FormData(e.currentTarget);try{await api('/account/change-password/',{method:'POST',body:JSON.stringify({current_password:fd.get('current_password'),new_password:fd.get('new_password')})});setMe(await api('/me/'))}catch(x){setPasswordError(x.message)}}
 if(!me)return <main className="login-shell"><section className="login-card auth-card"><div className="brand-mark">و</div><h1>{t.brand}</h1><p>{APP_ROLE_LABEL[APP_ROLE]||t.tagline}</p><label>{t.language}</label><select value={lang} onChange={e=>setLang(e.target.value)}><option value="ar">العربية</option><option value="he">עברית</option><option value="en">English</option></select>{!registering?<><form onSubmit={signIn}><label>{t.username}</label><input name="username" required/><label>{t.password}</label><input name="password" type="password" required/><button>{t.enter}</button>{error&&<p className="error">{error}</p>}</form>{(APP_ROLE==='customer'||APP_ROLE==='all')&&<button type="button" className="secondary auth-switch" onClick={()=>{setRegistering(true);setError('');setRegisterNotice('')}}>إنشاء حساب زبون جديد</button>}</>:<><h3>إنشاء حساب في وصلني</h3><form onSubmit={signUp} className="form-stack registration-form" encType="multipart/form-data"><input type="hidden" name="role" value="customer"/><p className="note">إنشاء الحساب العام متاح للزبائن فقط. حسابات التجار والكباتن ينشئها مسؤول وصلني.</p><label>اسم المستخدم<input name="username" required minLength="3" autoComplete="username"/></label><label>الاسم الأول<input name="first_name" required/></label><label>اسم العائلة<input name="last_name"/></label><label>رقم الهاتف<input name="phone" required/></label><label>البريد الإلكتروني<input name="email" type="email"/></label><label>كلمة المرور<input name="password" type="password" minLength="8" required autoComplete="new-password"/></label><label>الصورة الشخصية<input name="profile_image" type="file" accept="image/png,image/jpeg,image/webp"/></label><div data-role-field="merchant" hidden><label>اسم المتجر<input name="shop_name"/></label><label>تصنيف المتجر<input name="category" placeholder="general"/></label><label>وصف المتجر<textarea name="description"/></label><label>عنوان المتجر<input name="address"/></label><label>شعار المتجر<input name="store_image" type="file" accept="image/png,image/jpeg,image/webp"/></label><label>صورة الغلاف<input name="cover_image" type="file" accept="image/png,image/jpeg,image/webp"/></label></div><div data-role-field="captain" hidden><label>نوع المركبة<select name="vehicle_type"><option value="motorcycle">دراجة نارية</option><option value="car">سيارة</option><option value="truck">شاحنة</option></select></label><label>موديل المركبة<input name="vehicle_model"/></label><label>رقم اللوحة<input name="plate_number"/></label><label>نوع التصريح<select name="permit_type"><option value="west_bank">الضفة الغربية</option><option value="jerusalem_id">هوية القدس</option><option value="work_permit">تصريح عمل</option></select></label><label>وثيقة الهوية / التصريح<input name="identity_document" type="file" accept=".pdf,.jpg,.jpeg,.png"/></label><label>رخصة القيادة<input name="driving_license_document" type="file" accept=".pdf,.jpg,.jpeg,.png"/></label><label>التأمين<input name="insurance_document" type="file" accept=".pdf,.jpg,.jpeg,.png"/></label><label className="check-label"><input name="digital_undertaking" type="checkbox" value="true" required disabled/>أتعهد بصحة البيانات والالتزام بشروط العمل والسلامة في وصلني</label></div><button>إتمام التسجيل</button>{registerError&&<p className="error">{registerError}</p>}</form>{(APP_ROLE==='customer'||APP_ROLE==='all')&&<button type="button" className="secondary auth-switch" onClick={()=>setRegistering(false)}>العودة لتسجيل الدخول</button>}</>}{registerNotice&&<p className="success-note">{registerNotice}</p>}<small>الزبون · التاجر · الكابتن · الإدارة</small></section></main>
 if(me.must_change_password)return <main className="login-shell"><section className="login-card"><div className="brand-mark">و</div><h1>{t.changePasswordTitle}</h1><p>{t.changePasswordNote}</p><form onSubmit={changeInitialPassword}><label>{t.currentPassword}</label><input name="current_password" type="password" required/><label>{t.newPassword}</label><input name="new_password" type="password" minLength={8} required/><button>{t.changePassword}</button>{passwordError&&<p className="error">{passwordError}</p>}</form><button className="ghost" onClick={signOut}>{t.logout}</button></section></main>
 const role=me.role
 return <div className="app"><ToastViewport t={t}/><aside className="sidebar"><div className="side-brand"><span className="brand-mark small">و</span><b>{t.brand}</b></div><Link className="user-chip" to="/account"><span className="user-chip-avatar">{me.profile_image?<img src={mediaUrl(me.profile_image)} alt=""/>:<span>◉</span>}</span><span><strong>{me.first_name||me.username}</strong><small>{t[role]||role}</small></span></Link><nav>
 <Link to="/"><NavIcon name="home"/>{t.home}</Link><Link to="/account"><NavIcon name="user"/>{t.accountProfile}</Link><Link to="/orders"><NavIcon name="orders"/>{t.orders}</Link>{role==='customer'&&<Link to="/ride"><NavIcon name="ride"/>{t.rideService}</Link>}{role==='merchant'&&<><Link to="/catalog"><NavIcon name="catalog"/>{t.catalog}</Link><Link to="/reports"><NavIcon name="reports"/>{t.reports}</Link><Link to="/profile"><NavIcon name="store"/>{t.profile}</Link><Link to="/settlements"><NavIcon name="money"/>{t.settlements}</Link></>}{role==='captain'&&<><Link to="/captain"><NavIcon name="captain"/>{t.captain}</Link><Link to="/settlements"><NavIcon name="money"/>{t.settlements}</Link></>}{role==='admin'&&<><Link to="/admin"><NavIcon name="dashboard"/>{t.dashboard}</Link><Link to="/settlements"><NavIcon name="money"/>{t.settlements}</Link><Link to="/support"><NavIcon name="support"/>{t.support}</Link></>}
 </nav><div className="side-bottom"><select value={lang} onChange={e=>setLang(e.target.value)}><option value="ar">العربية</option><option value="he">עברית</option><option value="en">English</option></select><button className="ghost" onClick={signOut}>{t.logout}</button></div></aside>
 <main className="content"><header><div><span className="eyebrow">{t.platform.toUpperCase()}</span><h2>{t[role]||role} · {t.home}</h2></div><span className="status-pill">● {t.online}</span></header>
 <Routes><Route path="/" element={<Home role={role} t={t} lang={lang}/>}/><Route path="/orders" element={<Orders role={role} t={t}/>}/><Route path="/ride" element={role==='customer'?<RideBooking t={t} lang={lang}/>:<Navigate to="/"/>}/><Route path="/catalog" element={role==='merchant'?<Catalog t={t}/>:<Navigate to="/"/>}/><Route path="/reports" element={<Reports t={t}/>}/><Route path="/account" element={<AccountProfile t={t} me={me} setMe={setMe}/>}/><Route path="/profile" element={role==='merchant'?<Profile t={t}/>:<Navigate to="/account"/>}/><Route path="/captain" element={<Captain t={t}/>}/><Route path="/settlements" element={<Settlements t={t} role={role}/>}/><Route path="/admin" element={role==='admin'?<Admin t={t}/>:<Navigate to="/"/>}/><Route path="/support" element={<Support t={t}/>}/><Route path="*" element={<Navigate to="/"/>}/></Routes>
 </main></div>
}
function NavIcon({name}){
 const paths={home:<><path d="m3 10 9-7 9 7"/><path d="M5 9v12h14V9M9 21v-7h6v7"/></>,user:<><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,orders:<><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>,ride:<><circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="m6 17 4-8h4l4 8M10 9H7M14 9l2-3"/></>,catalog:<><rect x="3" y="4" width="8" height="7" rx="1"/><rect x="13" y="4" width="8" height="7" rx="1"/><rect x="3" y="13" width="8" height="7" rx="1"/><rect x="13" y="13" width="8" height="7" rx="1"/></>,reports:<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,store:<><path d="M3 10h18l-2-6H5zM5 10v10h14V10M9 20v-6h6v6"/></>,captain:<><circle cx="12" cy="6" r="3"/><path d="M5 21v-2a7 7 0 0 1 14 0v2M12 9v5"/></>,money:<><circle cx="12" cy="12" r="9"/><path d="M15 8.5c-.7-.7-1.7-1-3-1-1.7 0-3 .8-3 2s1.2 1.8 3 2.2 3 1 3 2.3-1.3 2.2-3 2.2c-1.2 0-2.4-.4-3.2-1.2M12 5.5v13"/></>,dashboard:<><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="5" rx="1"/><rect x="13" y="10" width="8" height="11" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/></>,support:<><path d="M4 5h16v12H8l-4 4z"/><path d="M8 9h8M8 13h5"/></>};
 return <span className="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]||paths.home}</svg></span>;
}

function useLoad(path){const [data,setData]=useState([]),[err,setErr]=useState('');const [tick,setTick]=useState(0);useEffect(()=>{let live=true;const load=()=>api(path).then(d=>{if(live){setData(Array.isArray(d)?d:d.results||[]);setErr('')}}).catch(e=>{if(live)setErr(e.message)});load();const timer=setInterval(load,5000);const ws=orderSocket(()=>load());return()=>{live=false;clearInterval(timer);if(ws)ws.close()}},[path,tick]);return {data,err,reload:()=>setTick(t=>t+1)}}
function Home({role,t,lang}){if(role==='admin')return <Admin t={t}/>;if(role==='captain')return <Captain t={t}/>;if(role==='merchant')return <Orders role={role} t={t}/>;return <CustomerStorefront lang={lang}/>}
function RideRouteMap({order,t}){
 const mapRef=useRef(null);
 const mapInstance=useRef(null);
 const captainMarker=useRef(null);
 const [routeState,setRouteState]=useState('loading');
  const [routeMetrics,setRouteMetrics]=useState(null);
 const rawCoords=[order.pickup_latitude,order.pickup_longitude,order.dropoff_latitude,order.dropoff_longitude];
 const hasCoordinates=rawCoords.every(v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v)));
 const pickupLat=Number(order.pickup_latitude), pickupLng=Number(order.pickup_longitude);
 const dropLat=Number(order.dropoff_latitude), dropLng=Number(order.dropoff_longitude);
 useEffect(()=>{
  if(!window.L||!mapRef.current||!hasCoordinates)return;
  let cancelled=false;
  const L=window.L;
  const map=L.map(mapRef.current,{scrollWheelZoom:false}).setView([pickupLat,pickupLng],13);
  mapInstance.current=map;
  L.tileLayer(MAP_TILE_URL,{subdomains:'abcd',maxZoom:20,attribution:MAP_ATTRIBUTION}).addTo(map);
  const start=L.circleMarker([pickupLat,pickupLng],{radius:9,color:'#fff',weight:3,fillColor:'#16a36a',fillOpacity:1}).addTo(map).bindPopup(t.pickup);
  const end=L.circleMarker([dropLat,dropLng],{radius:9,color:'#fff',weight:3,fillColor:'#e34f66',fillOpacity:1}).addTo(map).bindPopup(t.destination);
  const captainLat=Number(order.captain_latitude),captainLng=Number(order.captain_longitude);
  if(order.captain_latitude!=null&&order.captain_longitude!=null&&Number.isFinite(captainLat)&&Number.isFinite(captainLng)){
   captainMarker.current=L.circleMarker([captainLat,captainLng],{radius:11,color:'#fff',weight:3,fillColor:(order.captain_location_is_fresh===false?'#8b929d':'#7650bd'),fillOpacity:1}).addTo(map).bindPopup(order.captain_location_is_fresh===false?(t.captainLocationStale||'آخر موقع معروف'):(t.captainLocationLive||'موقع الكابتن'));
  }
  const bounds=L.latLngBounds([[pickupLat,pickupLng],[dropLat,dropLng]]);
  if(captainMarker.current)bounds.extend(captainMarker.current.getLatLng());
  map.fitBounds(bounds,{padding:[35,35],maxZoom:15});
  setRouteState('loading');
  api(`/routing/route/?order=${encodeURIComponent(order.id)}&start_lat=${pickupLat}&start_lon=${pickupLng}&end_lat=${dropLat}&end_lon=${dropLng}`).then(data=>{
   if(cancelled)return;
   const coords=data?.geometry;
   if(!coords?.length)throw new Error('route missing');
   const roadAvailable=!!data.available;
   const line=L.polyline(coords.map(([lng,lat])=>[lat,lng]),{color:roadAvailable?'#7650bd':'#8b929d',weight:6,opacity:.9,lineCap:'round',lineJoin:'round',dashArray:roadAvailable?null:'8 8'}).addTo(map);
   map.fitBounds(line.getBounds(),{padding:[38,38]});
   setRouteMetrics({distanceKm:data.distance_meters/1000,durationMinutes:data.duration_seconds==null?null:Math.round(data.duration_seconds/60),approximate:!roadAvailable});
   setRouteState(roadAvailable?'road':'approx');
  }).catch(()=>{
   if(cancelled)return;
   L.polyline([[pickupLat,pickupLng],[dropLat,dropLng]],{color:'#8b929d',weight:5,dashArray:'9 8',opacity:.85}).addTo(map);
   setRouteMetrics(null);
   setRouteState('unavailable');
  });
  const resize=()=>map.invalidateSize();
  const resizeTimer=setTimeout(resize,180);
  return ()=>{cancelled=true;clearTimeout(resizeTimer);map.remove();mapInstance.current=null;captainMarker.current=null};
 },[pickupLat,pickupLng,dropLat,dropLng,t.pickup,t.destination]);
 useEffect(()=>{
  const L=window.L,map=mapInstance.current;
  if(!L||!map)return;
  const lat=Number(order.captain_latitude),lng=Number(order.captain_longitude);
  const valid=order.captain_latitude!=null&&order.captain_longitude!=null&&Number.isFinite(lat)&&Number.isFinite(lng);
  if(!valid){if(captainMarker.current){map.removeLayer(captainMarker.current);captainMarker.current=null;}return;}
  const fresh=order.captain_location_is_fresh!==false;
  if(captainMarker.current){captainMarker.current.setLatLng([lat,lng]);captainMarker.current.setStyle({fillColor:fresh?'#7650bd':'#8b929d'});captainMarker.current.setPopupContent(fresh?(t.captainLocationLive||'موقع الكابتن'):(t.captainLocationStale||'آخر موقع معروف'));}
  else captainMarker.current=L.circleMarker([lat,lng],{radius:11,color:'#fff',weight:3,fillColor:fresh?'#7650bd':'#8b929d',fillOpacity:1}).addTo(map).bindPopup(fresh?(t.captainLocationLive||'موقع الكابتن'):(t.captainLocationStale||'آخر موقع معروف'));
 },[order.captain_latitude,order.captain_longitude,order.captain_location_is_fresh,t.captainLocationLive,t.captainLocationStale]);
 if(!hasCoordinates)return <div className="ride-map-missing">{t.routeNoCoordinates}</div>;
 const updatedAt=order.captain_location_updated_at?new Date(order.captain_location_updated_at):null;
 const ageSeconds=updatedAt?Math.max(0,Math.floor((Date.now()-updatedAt.getTime())/1000)):null;
 const captainFresh=ageSeconds!==null&&ageSeconds<=60&&order.captain_location_is_fresh!==false;
 return <div className="captain-ride-map-wrap"><div className="captain-map-heading"><b>{t.liveTrackingTitle||t.routeMapTitle}</b><span className={captainFresh?'tracking-indicator':'tracking-indicator is-muted'}>{captainFresh?(t.captainLocationLive||'الكابتن مباشر'):(order.captain_latitude!=null?(t.captainLocationStale||'آخر موقع معروف'):(t.captainLocationUnavailable||'بانتظار موقع الكابتن'))}</span></div>{routeState==='loading'&&<small className="note">جارٍ حساب المسافة والوقت عبر الطرق…</small>}{routeState==='approx'&&<small className="note">تعذر الوصول إلى بيانات الطرق؛ المسافة المعروضة تقريبية ولا يتوفر وقت وصول موثوق.</small>}{routeState==='unavailable'&&<small className="note">تعذر تحميل مسار الطرق حالياً. يرجى المحاولة لاحقاً.</small>}{updatedAt&&<small className="note">آخر تحديث للموقع: {updatedAt.toLocaleString()} · {captainFresh?'موقع حديث':`الموقع عمره ${Math.floor(ageSeconds/60)} دقيقة، لا تعتبره مباشراً`}</small>}<div className="captain-ride-map" ref={mapRef}/>{routeMetrics&&<div className="route-metrics"><span>{t.routeDistance}: <b>{routeMetrics.distanceKm.toFixed(2)} km{routeMetrics.approximate?' (تقريبي)':''}</b></span><span>{t.routeDuration}: <b>{routeMetrics.durationMinutes===null?'غير متاح':`${routeMetrics.durationMinutes} ${t.minutesUnit}`}</b></span></div>}<div className="captain-route-legend"><span><i className="pickup-dot"/> {t.pickup}</span><span><i className="dropoff-dot"/> {t.destination}</span><span><i className="captain-dot"/> {t.captain||'الكابتن'}</span></div></div>
}

function OrderProgress({order,t}){
 const steps=order.order_type==='ride'?['new','assigned','picked_up','delivering','completed']:['new','accepted','preparing','ready','assigned','picked_up','delivering','completed'];
 const current=steps.indexOf(order.status);
 if(order.status==='cancelled')return <div className="order-progress-cancelled">{t.cancelled}</div>;
 return <div className="order-progress" aria-label={`${t.status}: ${t[order.status]||order.status}`}>
  {steps.map((step,index)=><div key={step} className={`order-progress-step ${index<current?'is-done':''} ${index===current?'is-current':''}`}>
   <span className="progress-node">{index<current?'✓':index+1}</span><small>{t[step]||step}</small>
  </div>)}
 </div>;
}

function Orders({role,t}){const path=role==='captain'?'/orders/available/':'/orders/';const {data,err,reload}=useLoad(path);const [mins,setMins]=useState({});const [clock,setClock]=useState(Date.now());useEffect(()=>{const id=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(id)},[]);async function act(url,body){try{await api(url,{method:'POST',body:JSON.stringify(body)});reload();notify(t.actionCompleted,'success')}catch(e){notify(e.message,'error')}}return <><div className="section-head"><div><h3>{t.orders}</h3><p>{t.liveUpdates}</p></div><button className="secondary" onClick={reload}>{t.refresh}</button></div>{err&&<p className="error">{err}</p>}<div className="order-grid">{data.map(o=><article className="order-card" key={o.id}><div className="card-top"><b>#{o.id}</b><span className={`tag ${o.status}`}>{statusLabel(t,o.status)}</span></div><h3>{o.order_type==='ride'?t.rideService:(o.merchant_name||o.order_type)}</h3><OrderProgress order={o} t={t}/><div className="order-person"><span className="mini-avatar">{o.customer_profile_image?<img src={mediaUrl(o.customer_profile_image)} alt=""/>:<span>◉</span>}</span><p>{t.customerName}: {o.customer_name||'—'}</p></div>{o.captain_name&&<div className="order-person"><span className="mini-avatar">{o.captain_profile_image?<img src={mediaUrl(o.captain_profile_image)} alt=""/>:<span>◉</span>}</span><p>{t.captainName}: {o.captain_name}</p></div>}<p>{t.total}: <b>{money(o.total)}</b></p>{role==='merchant'&&o.status==='preparing'&&o.accepted_at&&<p className="note">الوقت المتبقي للتجهيز: <b>{Math.max(0,Math.ceil((new Date(o.accepted_at).getTime()+Number(o.prep_minutes||0)*60000-clock)/1000/60))} دقيقة</b></p>}{(role==='captain'||role==='merchant')&&o.merchant_arrived_at&&<p className="note">تم وصول الكابتن للمتجر: {new Date(o.merchant_arrived_at).toLocaleTimeString()}</p>}<p>{o.pickup_address||'—'} {o.order_type==='ride'?'→':''} {o.dropoff_address||'—'}</p>{o.dropoff_notes&&<p className="note">تفاصيل التوصيل: {o.dropoff_notes}</p>}{['assigned','picked_up','delivering'].includes(o.status)&&o.pickup_latitude!=null&&o.dropoff_latitude!=null&&(role==='customer'||role==='captain')&&<RideRouteMap order={o} t={t}/>}<div className="item-list">{(o.items||[]).map((i,n)=><span key={n}>{i.name} × {i.quantity}</span>)}</div>{role==='merchant'&&o.status==='new'&&<div className="actions"><select value={mins[o.id]||10} onChange={e=>setMins({...mins,[o.id]:Number(e.target.value)})}>{[10,15,20,30,40].map(n=><option key={n}>{n}</option>)}</select><button onClick={()=>act(`/orders/${o.id}/accept/`,{prep_minutes:mins[o.id]||10})}>{t.accept}</button></div>}{role==='merchant'&&o.status==='preparing'&&<button onClick={()=>act(`/orders/${o.id}/status/`,{status:'ready'})}>{t.ready}</button>}{role==='captain'&&(o.status==='ready'||(o.order_type==='ride'&&o.status==='new'))&&!o.captain&&<button onClick={()=>act(`/orders/${o.id}/assign/`,{})}>{t.accept}</button>}{role==='captain'&&o.status==='assigned'&&o.order_type==='store'&&!o.merchant_arrived_at&&<button className="secondary" onClick={()=>act(`/orders/${o.id}/arrive/`,{})}>وصلت إلى المتجر</button>}{role==='captain'&&o.status==='assigned'&&o.merchant_arrived_at&&<><button onClick={()=>act(`/orders/${o.id}/status/`,{status:'picked_up'})}>{t.pickup}</button>{clock-new Date(o.merchant_arrived_at).getTime()>=10*60000&&<button className="secondary" onClick={()=>act('/delay-reports/',{order:o.id,details:'تجاوز المتجر مدة الانتظار المجانية'})}>إبلاغ عن تأخر المتجر</button>}</>}{role==='captain'&&o.status==='picked_up'&&<button onClick={()=>act(`/orders/${o.id}/status/`,{status:'delivering'})}>{t.startDelivery}</button>}{role==='captain'&&o.status==='delivering'&&<button onClick={()=>act(`/orders/${o.id}/status/`,{status:'completed'})}>{t.confirmDelivery}</button>}</article>)}</div>{!data.length&&<Empty t={t}/>}</>}


function LocationPicker({latitude,longitude,onSelect,label='حدد الموقع على الخريطة',referenceLatitude,referenceLongitude,referenceLabel='المتجر'}){
 const mapRef=useRef(null),mapInstance=useRef(null),selectedMarker=useRef(null),referenceMarker=useRef(null),onSelectRef=useRef(onSelect);
 onSelectRef.current=onSelect;
 const [query,setQuery]=useState(''),[searching,setSearching]=useState(false),[mapError,setMapError]=useState('');
 const uiLang=document.documentElement.lang||'ar';const isEn=uiLang==='en',isHe=uiLang==='he';const mapLabel=label.includes('المتجر')?(isEn?'Select the store location on the map':isHe?'בחרו את מיקום החנות במפה':label):(isEn?'Select the delivery location on the map':isHe?'בחרו את מיקום המסירה במפה':label);
 const mapWords=isEn?{search:'Search',searching:'Searching…',find:'Search for a city, street or address',current:'◎ My location',instructions:'Click the map or drag the marker to set the exact location.',gps:'Your browser does not support location.',denied:'Could not get your location. Allow location access.'}:isHe?{search:'חיפוש',searching:'מחפש…',find:'חיפוש עיר, רחוב או כתובת',current:'◎ המיקום שלי',instructions:'לחצו על המפה או גררו את הסמן כדי לבחור מיקום מדויק.',gps:'הדפדפן אינו תומך במיקום.',denied:'לא ניתן לקבל את המיקום. יש לאשר גישה למיקום.'}:{search:'بحث',searching:'جارٍ البحث…',find:'ابحث عن مدينة أو شارع أو عنوان',current:'◎ موقعي الحالي',instructions:'اضغط على الخريطة أو اسحب العلامة لتحديد الموقع بدقة.',gps:'المتصفح لا يدعم تحديد الموقع.',denied:'تعذر تحديد موقعك. تأكد من السماح بإذن الموقع.'};
 useEffect(()=>{
  if(!window.L||!mapRef.current||mapInstance.current)return;
  const L=window.L;const map=L.map(mapRef.current,{scrollWheelZoom:false}).setView([31.95,35.21],12);
  L.tileLayer(MAP_TILE_URL,{subdomains:'abcd',maxZoom:20,attribution:MAP_ATTRIBUTION}).addTo(map);
  map.on('click',e=>pickLocation(e.latlng.lat,e.latlng.lng));mapInstance.current=map;
  const id=setTimeout(()=>map.invalidateSize(),180);
  return()=>{clearTimeout(id);map.remove();mapInstance.current=null;selectedMarker.current=null;referenceMarker.current=null};
 },[]);
 useEffect(()=>{
  const map=mapInstance.current,L=window.L;if(!map||!L)return;
  const lat=Number(latitude),lng=Number(longitude),valid=latitude!==''&&latitude!==null&&latitude!==undefined&&longitude!==''&&longitude!==null&&longitude!==undefined&&Number.isFinite(lat)&&Number.isFinite(lng);
  if(valid){if(selectedMarker.current)selectedMarker.current.setLatLng([lat,lng]);else {selectedMarker.current=L.marker([lat,lng],{draggable:true}).addTo(map).bindPopup('موقع التوصيل');selectedMarker.current.on('dragend',e=>{const pt=e.target.getLatLng();pickLocation(pt.lat,pt.lng)})}}
  else if(selectedMarker.current){map.removeLayer(selectedMarker.current);selectedMarker.current=null;}
  const rlat=Number(referenceLatitude),rlng=Number(referenceLongitude),refValid=referenceLatitude!==null&&referenceLatitude!==undefined&&referenceLongitude!==null&&referenceLongitude!==undefined&&Number.isFinite(rlat)&&Number.isFinite(rlng);
  if(refValid){if(referenceMarker.current)referenceMarker.current.setLatLng([rlat,rlng]);else referenceMarker.current=L.circleMarker([rlat,rlng],{radius:9,color:'#fff',weight:3,fillColor:'#7040bd',fillOpacity:1}).addTo(map).bindPopup(referenceLabel);}
  else if(referenceMarker.current){map.removeLayer(referenceMarker.current);referenceMarker.current=null;}
  const pts=[];if(valid)pts.push([lat,lng]);if(refValid)pts.push([rlat,rlng]);if(pts.length===2)map.fitBounds(pts,{padding:[35,35],maxZoom:15});else if(pts.length===1)map.setView(pts[0],15);
 },[latitude,longitude,referenceLatitude,referenceLongitude,referenceLabel]);
 async function pickLocation(lat,lng){onSelectRef.current?.(lat,lng,'');try{const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&accept-language=${encodeURIComponent(uiLang)}`,{headers:{Accept:'application/json'}});if(r.ok){const d=await r.json();if(d?.display_name)onSelectRef.current?.(lat,lng,d.display_name)}}catch{}}
 async function locate(){if(!navigator.geolocation){setMapError(mapWords.gps);return;}navigator.geolocation.getCurrentPosition(pos=>{pickLocation(pos.coords.latitude,pos.coords.longitude);mapInstance.current?.setView([pos.coords.latitude,pos.coords.longitude],16);setMapError('')},()=>setMapError(mapWords.denied),{enableHighAccuracy:true,timeout:12000});}
 async function search(e){e.preventDefault();if(!query.trim())return;setSearching(true);setMapError('');try{const url=`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;const res=await fetch(url,{headers:{Accept:'application/json'}});if(!res.ok)throw new Error('تعذر البحث عن العنوان');const rows=await res.json();if(!rows.length)throw new Error('لم يتم العثور على العنوان');const lat=Number(rows[0].lat),lng=Number(rows[0].lon);onSelectRef.current?.(lat,lng,rows[0].display_name||query);mapInstance.current?.setView([lat,lng],16);}catch(err){setMapError(err.message)}finally{setSearching(false)}}
 return <div className="location-picker"><div className="location-picker-tools"><form onSubmit={search}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={mapWords.find}/><button type="submit" disabled={searching}>{searching?mapWords.searching:mapWords.search}</button></form><button type="button" className="secondary" onClick={locate}>{mapWords.current}</button></div><div ref={mapRef} className="location-picker-map" role="application" aria-label={mapLabel}/><p className="map-instructions">{mapLabel} — {mapWords.instructions}</p>{latitude!==''&&longitude!==''&&latitude!=null&&longitude!=null&&<small className="coordinate-readout">Latitude: {Number(latitude).toFixed(6)} · Longitude: {Number(longitude).toFixed(6)}</small>}{mapError&&<p className="error">{mapError}</p>}</div>
}

function AdminOverviewMap({stores=[],orders=[]}){
 const mapRef=useRef(null),mapInstance=useRef(null),layerRef=useRef(null);
 useEffect(()=>{if(!window.L||!mapRef.current||mapInstance.current)return;const L=window.L;const map=L.map(mapRef.current,{scrollWheelZoom:false}).setView([31.95,35.21],10);L.tileLayer(MAP_TILE_URL,{subdomains:'abcd',maxZoom:20,attribution:MAP_ATTRIBUTION}).addTo(map);layerRef.current=L.layerGroup().addTo(map);mapInstance.current=map;const id=setTimeout(()=>map.invalidateSize(),150);return()=>{clearTimeout(id);map.remove();mapInstance.current=null;layerRef.current=null}},[]);
 useEffect(()=>{const map=mapInstance.current,L=window.L,layer=layerRef.current;if(!map||!L||!layer)return;layer.clearLayers();const bounds=[];const popup=(title,sub)=>{const el=document.createElement('div');const b=document.createElement('b');b.textContent=title||'—';el.appendChild(b);if(sub){const p=document.createElement('p');p.textContent=sub;el.appendChild(p)}return el};
  stores.forEach(s=>{if(s.latitude==null||s.longitude==null)return;const pt=[Number(s.latitude),Number(s.longitude)];if(!pt.every(Number.isFinite))return;L.marker(pt).addTo(layer).bindPopup(popup(`متجر: ${s.shop_name}`,`${s.address||''} · ${s.is_open?'مفتوح':'مغلق'}`));bounds.push(pt)});
  orders.filter(o=>!['completed','cancelled'].includes(o.status)).forEach(o=>{const pts=[];if(o.pickup_latitude!=null&&o.pickup_longitude!=null)pts.push([Number(o.pickup_latitude),Number(o.pickup_longitude)]);if(o.dropoff_latitude!=null&&o.dropoff_longitude!=null)pts.push([Number(o.dropoff_latitude),Number(o.dropoff_longitude)]);pts.forEach((pt,i)=>{if(!pt.every(Number.isFinite))return;L.circleMarker(pt,{radius:8,color:'#fff',weight:2,fillColor:i?'#df4d67':'#16a36a',fillOpacity:1}).addTo(layer).bindPopup(popup(`طلب #${o.id} · ${i?'وجهة الزبون':'المتجر'}`,`${o.merchant_name||''} · ${o.dropoff_address||''}`));bounds.push(pt)});if(pts.length===2)L.polyline(pts,{color:'#8054c6',weight:3,dashArray:'6 7'}).addTo(layer);if(o.captain_latitude!=null&&o.captain_longitude!=null){const captainPt=[Number(o.captain_latitude),Number(o.captain_longitude)];if(captainPt.every(Number.isFinite)){L.circleMarker(captainPt,{radius:11,color:'#fff',weight:3,fillColor:'#7650bd',fillOpacity:1}).addTo(layer).bindPopup(popup(`الكابتن · طلب #${o.id}`,o.captain_location_updated_at?`آخر تحديث: ${new Date(o.captain_location_updated_at).toLocaleTimeString()}`:'موقع الكابتن'));bounds.push(captainPt)}}});
  if(bounds.length===1)map.setView(bounds[0],13);else if(bounds.length>1)map.fitBounds(bounds,{padding:[35,35],maxZoom:14});
 },[stores,orders]);
 return <div className="admin-live-map"><div ref={mapRef} className="location-picker-map"/><div className="map-legend"><span>● المتاجر / الانطلاق</span><span>● وجهة الزبون</span><small>{stores.filter(s=>s.latitude!=null&&s.longitude!=null).length} متجر بإحداثيات · {orders.filter(o=>!['completed','cancelled'].includes(o.status)).length} طلب نشط</small></div></div>
}

function CustomerHome({t}){
 const [merchants,setMerchants]=useState([]),[products,setProducts]=useState([]);
 const [merchant,setMerchant]=useState(''),[product,setProduct]=useState(''),[qty,setQty]=useState(1),[dropoff,setDropoff]=useState(''),[dropoffLat,setDropoffLat]=useState(''),[dropoffLng,setDropoffLng]=useState(''),[dropoffNotes,setDropoffNotes]=useState('');
 const [loading,setLoading]=useState(false),[merchantLoading,setMerchantLoading]=useState(true),[productLoading,setProductLoading]=useState(false),[productReload,setProductReload]=useState(0);
 const [error,setError]=useState(''),[merchantError,setMerchantError]=useState(''),[productError,setProductError]=useState('');
 const submitLock=useRef(false),requestKey=useRef(newRequestKey());
 const {data:orders,reload}=useLoad('/orders/');
 useEffect(()=>{
  let active=true;setMerchantLoading(true);setMerchantError('');
  api('/merchants/').then(d=>{if(active)setMerchants(Array.isArray(d)?d:(d.results||[]))})
   .catch(e=>{if(active)setMerchantError(e.message)})
   .finally(()=>{if(active)setMerchantLoading(false)});
  return()=>{active=false};
 },[]);
 useEffect(()=>{
  let active=true;
  setProducts([]);setProduct('');setProductError('');
  if(!merchant){setProductLoading(false);return()=>{active=false}};
  setProductLoading(true);
  api(`/products/?merchant=${encodeURIComponent(merchant)}`)
   .then(d=>{if(active){const rows=Array.isArray(d)?d:(d.results||[]);setProducts(rows.filter(p=>p.available!==false))}})
   .catch(e=>{if(active)setProductError(e.message)})
   .finally(()=>{if(active)setProductLoading(false)});
  return()=>{active=false};
 },[merchant,productReload]);
 const selectedProduct=products.find(p=>String(p.id)===String(product));
 const selectedMerchant=merchants.find(m=>String(m.id)===String(merchant));
 async function createOrder(e){
  e.preventDefault();if(submitLock.current)return;
  if(!merchant||!selectedProduct){setError(t.chooseProduct);return}
  if(dropoffLat===''||dropoffLng===''){setError('حدد موقع التوصيل على الخريطة أولاً.');return}
  submitLock.current=true;setLoading(true);setError('');
  try{
   await api('/orders/',{method:'POST',headers:{'Idempotency-Key':requestKey.current},body:JSON.stringify({merchant:Number(merchant),items:[{product_id:Number(product),quantity:Number(qty)}],dropoff_address:dropoff,dropoff_latitude:Number(dropoffLat),dropoff_longitude:Number(dropoffLng),dropoff_notes:dropoffNotes,payment_method:'cash',order_type:'store'})});
   requestKey.current=newRequestKey();setDropoff('');setDropoffLat('');setDropoffLng('');setDropoffNotes('');setProduct('');setQty(1);reload();notify(t.requestSent,'success');
  }catch(e){setError(e.message);notify(e.message,'error')}
  finally{submitLock.current=false;setLoading(false)}
 }
 return <>
  <section className="panel customer-order-panel">
   <div className="section-head"><div><h3>{t.createOrder}</h3><p>{t.chooseStoreHint}</p></div><Link className="button-like" to="/ride">🛵 {t.rideService}</Link></div>
   <form className="form-stack" onSubmit={createOrder}>
    <label>{t.chooseStore}</label>
    {merchantLoading?<p className="muted-note">{t.loadingStores}</p>:merchantError?<div className="error">{merchantError} <button type="button" className="secondary" onClick={()=>window.location.reload()}>{t.retry}</button></div>:!merchants.length?<p className="empty compact-empty">{t.noOpenStores}</p>:<div className="merchant-picker-grid">{merchants.map(m=><button type="button" key={m.id} className={`merchant-choice ${String(m.id)===merchant?'selected':''}`} aria-pressed={String(m.id)===merchant} onClick={()=>setMerchant(String(m.id))}><span className="merchant-choice-photo">{m.image?<img src={mediaUrl(m.image)} alt={m.shop_name||''}/>:<span>◈</span>}</span><span className="merchant-choice-info"><b>{m.shop_name}</b><small>{m.category}</small>{m.address&&<small>{m.address}</small>}</span></button>)}</div>}
    <div className="customer-products-heading"><label>{t.chooseProduct}</label>{merchant&&<span>{products.length} {t.availableProductsCount}</span>}</div>
    {!merchant?<p className="muted-note">{t.selectStoreFirst}</p>:productLoading?<div className="product-loading"><span className="loading-dot"/> {t.loadingProducts}</div>:productError?<div className="error">{t.productLoadFailed} {productError}<button type="button" className="secondary" onClick={()=>setProductReload(v=>v+1)}>{t.retry}</button></div>:!products.length?<p className="empty compact-empty">{t.noProductsYet}</p>:<div className="customer-product-picker">{products.map(p=><button type="button" className={`customer-product-option ${String(p.id)===product?'selected':''}`} key={p.id} aria-pressed={String(p.id)===product} onClick={()=>setProduct(String(p.id))}><span className="picker-photo">{p.image?<img src={mediaUrl(p.image)} alt={p.name||''} loading="lazy"/>:<span>▧</span>}</span><span className="customer-product-copy"><b>{p.name}</b><small>{money(p.price)}</small>{p.description&&<span className="customer-product-description">{p.description}</span>}</span><span className="product-select-mark">{String(p.id)===product?'✓':'+'}</span></button>)}</div>}
    {selectedProduct&&<div className="selected-product-summary"><span>{t.selectedProduct}</span><b>{selectedProduct.name}</b><strong>{money(selectedProduct.price)}</strong></div>}
    <label>{t.quantity}</label><input type="number" min="1" max="50" value={qty} onChange={e=>setQty(Math.max(1,Math.min(50,Number(e.target.value)||1)))}/>
    <label>{t.deliveryAddress}</label><input value={dropoff} onChange={e=>setDropoff(e.target.value)} required placeholder={t.addressHint}/>
    <LocationPicker latitude={dropoffLat} longitude={dropoffLng} referenceLatitude={selectedMerchant?.latitude} referenceLongitude={selectedMerchant?.longitude} referenceLabel={selectedMerchant?.shop_name||'المتجر'} label="حدد موقع تسليم الطلب على الخريطة" onSelect={(lat,lng,address)=>{setDropoffLat(String(lat));setDropoffLng(String(lng));if(address)setDropoff(address)}}/>
    <label>تفاصيل إضافية للتوصيل</label><textarea rows="2" value={dropoffNotes} onChange={e=>setDropoffNotes(e.target.value)} placeholder="اسم الشارع، البناية، الطابق، أقرب معلم…"/>
    <button disabled={loading||!merchant||!product||productLoading||!dropoff.trim()||dropoffLat===''||dropoffLng===''}>{loading?t.sending:t.sendOrder}</button>
    {error&&<p className="error">{error}</p>}
   </form>
  </section>
  <section><div className="section-head"><h3>{t.myOrders}</h3></div><div className="order-grid">{orders.map(o=><article className="order-card" key={o.id}><b>{t.orderPrefix} #{o.id}</b><span className="tag">{statusLabel(t,o.status)}</span><p>{o.merchant_name}</p><p>{money(o.total)}</p><p>{o.dropoff_address}</p></article>)}</div>{!orders.length&&<Empty t={t}/>}</section>
 </>;
}

function RideBooking({t,lang}){
 const [form,setForm]=useState({pickup_address:'',dropoff_address:'',pickup_latitude:'',pickup_longitude:'',dropoff_latitude:'',dropoff_longitude:'',requires_checkpoint:false});
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const submitLock=useRef(false),requestKey=useRef(newRequestKey());
 const [activePoint,setActivePoint]=useState('pickup');
 const activePointRef=useRef('pickup');
 const mapRef=useRef(null),mapInstance=useRef(null),markers=useRef({}),lastGeocodeAt=useRef(0),tRef=useRef(t),langRef=useRef(lang);
 useEffect(()=>{tRef.current=t;langRef.current=lang},[t,lang]);
 useEffect(()=>{activePointRef.current=activePoint},[activePoint]);
 const {data:orders,reload}=useLoad('/orders/');
 function field(k,v){setForm(f=>({...f,[k]:v}))}
 function setPoint(which,lat,lng,address){
  const prefix=which==='pickup'?'pickup':'dropoff';
  setForm(f=>({...f,[`${prefix}_latitude`]:String(lat),[`${prefix}_longitude`]:String(lng),[`${prefix}_address`]:address||f[`${prefix}_address`]|| (which==='pickup'?t.pickupSelected:t.destinationSelected)}));
 }
 async function resolveAddress(which,lat,lng){
  try{
   if(Date.now()-lastGeocodeAt.current<1100)return;
   lastGeocodeAt.current=Date.now();
   const url=`${GEOCODING_BASE}?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&accept-language=${encodeURIComponent(langRef.current)}`;
   const response=await fetch(url,{headers:{Accept:'application/json'}});
   if(!response.ok)throw new Error('reverse geocoding failed');
   const data=await response.json();
   const address=data?.name||data?.display_name;
   if(address){
    const prefix=which==='pickup'?'pickup':'dropoff';
    setForm(f=>(Number(f[`${prefix}_latitude`])===Number(lat)&&Number(f[`${prefix}_longitude`])===Number(lng)?{...f,[`${prefix}_address`]:address}:f));
   }
  }catch{
   // Coordinates remain visible and the user can enter a place name manually.
  }
 }
 useEffect(()=>{
  if(!window.L||!mapRef.current||mapInstance.current)return;
  const map=window.L.map(mapRef.current).setView([31.95,35.21],13);
  window.L.tileLayer(MAP_TILE_URL,{subdomains:'abcd',maxZoom:20,attribution:MAP_ATTRIBUTION}).addTo(map);
  map.on('click',e=>{
   const which=activePointRef.current==='pickup'?'pickup':'dropoff';
   setPoint(which,e.latlng.lat,e.latlng.lng,which==='pickup'?tRef.current.pickupSelected:tRef.current.destinationSelected);
   resolveAddress(which,e.latlng.lat,e.latlng.lng);
  });
  mapInstance.current=map;
  const resizeTimer=setTimeout(()=>map.invalidateSize(),150);
  return()=>{clearTimeout(resizeTimer);map.remove();mapInstance.current=null;markers.current={}};
 },[]);
 useEffect(()=>{
  const map=mapInstance.current;if(!map||!window.L)return;
  ['pickup','dropoff'].forEach(which=>{
   const lat=Number(form[`${which}_latitude`]),lng=Number(form[`${which}_longitude`]);
   if(!Number.isFinite(lat)||!Number.isFinite(lng)||!form[`${which}_latitude`]||!form[`${which}_longitude`]){if(markers.current[which]){map.removeLayer(markers.current[which]);delete markers.current[which]}return;}
   const point=[lat,lng];
   if(markers.current[which]){markers.current[which].setLatLng(point);markers.current[which].setPopupContent(which==='pickup'?t.pickup:t.destination)}
   else markers.current[which]=window.L.marker(point).addTo(map).bindPopup(which==='pickup'?t.pickup:t.destination);
  });
  const points=['pickup','dropoff'].filter(k=>form[`${k}_latitude`]!==''&&form[`${k}_longitude`]!==''&&Number.isFinite(Number(form[`${k}_latitude`]))&&Number.isFinite(Number(form[`${k}_longitude`]))).map(k=>[Number(form[`${k}_latitude`]),Number(form[`${k}_longitude`])]);
  if(points.length===1)map.setView(points[0],15);else if(points.length===2)map.fitBounds(points,{padding:[35,35]});
 },[form.pickup_latitude,form.pickup_longitude,form.dropoff_latitude,form.dropoff_longitude,t.pickup,t.destination]);
 function locate(which){
  if(!navigator.geolocation){setError(t.locationUnavailable);return}
  setActivePoint(which);
  navigator.geolocation.getCurrentPosition(pos=>{
   const lat=pos.coords.latitude,lng=pos.coords.longitude;
   setPoint(which,lat,lng,t.currentLocation);
   resolveAddress(which,lat,lng);
   mapInstance.current?.setView([lat,lng],16);setError('');
  },()=>setError(t.locationDenied),{enableHighAccuracy:true,timeout:12000});
 }
 function coordinate(which,axis,value){
  const prefix=which==='pickup'?'pickup':'dropoff';
  field(`${prefix}_${axis}`,value);
  setActivePoint(which);
 }
 function validCoordinate(which){
  const prefix=which==='pickup'?'pickup':'dropoff';
  const lat=Number(form[`${prefix}_latitude`]),lng=Number(form[`${prefix}_longitude`]);
  return form[`${prefix}_latitude`]!==''&&form[`${prefix}_longitude`]!==''&&Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=-90&&lat<=90&&lng>=-180&&lng<=180;
 }
 async function submit(e){
  e.preventDefault();if(submitLock.current)return;
  if(!validCoordinate('pickup')||!validCoordinate('dropoff')){setError(t.coordinatesInvalid);return}
  submitLock.current=true;setBusy(true);setError('');setNotice('');
  try{
   const result=await api('/orders/ride/',{method:'POST',headers:{'Idempotency-Key':requestKey.current},body:JSON.stringify(form)});
   requestKey.current=newRequestKey();setNotice(`${t.rideCreated} #${result.id} · ${money(result.total)} · ${result.distance_km} km · ${result.estimated_duration_minutes||'—'} دقيقة تقريباً`);
   setForm({pickup_address:'',dropoff_address:'',pickup_latitude:'',pickup_longitude:'',dropoff_latitude:'',dropoff_longitude:'',requires_checkpoint:false});
   Object.values(markers.current).forEach(marker=>mapInstance.current?.removeLayer(marker));markers.current={};setActivePoint('pickup');reload();
  }catch(x){setError(x.message)}finally{submitLock.current=false;setBusy(false)}
 }
 const rides=orders.filter(o=>o.order_type==='ride');
 return <><section className="panel ride-panel"><div className="section-head"><div><h3>{t.rideTitle}</h3><p>{t.rideSubtitle}</p></div></div><form className="form-stack" onSubmit={submit}>
 <div className="ride-location-fields">
  <div className={`ride-location-card ${activePoint==='pickup'?'active':''}`}>
   <label>{t.pickupLabel}</label><input value={form.pickup_address} onFocus={()=>setActivePoint('pickup')} onChange={e=>field('pickup_address',e.target.value)} required placeholder={t.pickupPlaceholder}/>
   <button type="button" className="secondary" onClick={()=>locate('pickup')}>{t.useCurrentLocation}</button>
   <b className="coordinate-heading">{t.pickupCoordinates}</b>
   <div className="coordinate-inputs"><label>{t.latitude}<input type="number" step="any" value={form.pickup_latitude} onFocus={()=>setActivePoint('pickup')} onChange={e=>coordinate('pickup','latitude',e.target.value)} onBlur={()=>validCoordinate('pickup')&&resolveAddress('pickup',form.pickup_latitude,form.pickup_longitude)}/></label><label>{t.longitude}<input type="number" step="any" value={form.pickup_longitude} onFocus={()=>setActivePoint('pickup')} onChange={e=>coordinate('pickup','longitude',e.target.value)} onBlur={()=>validCoordinate('pickup')&&resolveAddress('pickup',form.pickup_latitude,form.pickup_longitude)}/></label></div>
   <small>{validCoordinate('pickup')?`${Number(form.pickup_latitude).toFixed(5)}, ${Number(form.pickup_longitude).toFixed(5)}`:t.selectPickup}</small>
  </div>
  <div className={`ride-location-card ${activePoint==='dropoff'?'active':''}`}>
   <label>{t.destinationLabel}</label><input value={form.dropoff_address} onFocus={()=>setActivePoint('dropoff')} onChange={e=>field('dropoff_address',e.target.value)} required placeholder={t.destinationPlaceholder}/>
   <button type="button" className="secondary" onClick={()=>locate('dropoff')}>{t.useCurrentLocation}</button>
   <b className="coordinate-heading">{t.destinationCoordinates}</b>
   <div className="coordinate-inputs"><label>{t.latitude}<input type="number" step="any" value={form.dropoff_latitude} onFocus={()=>setActivePoint('dropoff')} onChange={e=>coordinate('dropoff','latitude',e.target.value)} onBlur={()=>validCoordinate('dropoff')&&resolveAddress('dropoff',form.dropoff_latitude,form.dropoff_longitude)}/></label><label>{t.longitude}<input type="number" step="any" value={form.dropoff_longitude} onFocus={()=>setActivePoint('dropoff')} onChange={e=>coordinate('dropoff','longitude',e.target.value)} onBlur={()=>validCoordinate('dropoff')&&resolveAddress('dropoff',form.dropoff_latitude,form.dropoff_longitude)}/></label></div>
   <small>{validCoordinate('dropoff')?`${Number(form.dropoff_latitude).toFixed(5)}, ${Number(form.dropoff_longitude).toFixed(5)}`:t.selectDestination}</small>
  </div>
 </div>
 <div className="map-instructions"><b>{t.mapInstructionsTitle}</b><span>{t.mapInstructionsBody}</span><div className="map-point-switch"><button type="button" className={activePoint==='pickup'?'':'secondary'} onClick={()=>setActivePoint('pickup')}>{t.selectPickup}</button><button type="button" className={activePoint==='dropoff'?'':'secondary'} onClick={()=>setActivePoint('dropoff')}>{t.selectDestination}</button></div></div>
 <div className="ride-map" ref={mapRef} aria-label={t.mapInstructionsTitle}/>
 <label className="check-label"><input type="checkbox" checked={form.requires_checkpoint} onChange={e=>field('requires_checkpoint',e.target.checked)}/>{t.checkpointRoute}</label>
 <p className="note">{t.checkpointNotice}</p><p className="note">{t.ridePricingNote}</p>
 <button disabled={busy||!validCoordinate('pickup')||!validCoordinate('dropoff')}>{busy?t.sending:t.confirmRide}</button>
 {error&&<p className="error">{error}</p>}{notice&&<p className="success-note">{notice}</p>}
 </form></section>
 <section><h3>{t.myRides}</h3><div className="order-grid">{rides.map(o=><article className="order-card" key={o.id}><b>#{o.id} · {statusLabel(t,o.status)}</b><p>{o.pickup_address} → {o.dropoff_address}</p><p>{o.distance_km} km{ o.estimated_duration_minutes?` · ${o.estimated_duration_minutes} دقيقة تقريباً`:''} · {money(o.total)}</p>{o.captain_name&&<div className="order-person"><span className="mini-avatar">{o.captain_profile_image?<img src={mediaUrl(o.captain_profile_image)} alt=""/>:'◉'}</span>{o.captain_name}</div>}<RideRouteMap order={o} t={t}/></article>)}</div>{!rides.length&&<Empty t={t}/>}</section></>
}

function Catalog({t}){
 const {data,err,reload}=useLoad('/products/')
 const [form,setForm]=useState({name:'',price:'',category:'',description:''})
 const [image,setImage]=useState(null),[preview,setPreview]=useState(''),[saving,setSaving]=useState(false)
 function chooseImage(file){setImage(file||null);setPreview(file?URL.createObjectURL(file):'')}
 async function save(e){e.preventDefault();setSaving(true);try{const fd=new FormData();Object.entries(form).forEach(([k,v])=>fd.append(k,v));if(image)fd.append('image',image);await api('/products/',{method:'POST',body:fd});setForm({name:'',price:'',category:'',description:''});chooseImage(null);reload();notify(t.productAdded,'success')}catch(e){notify(e.message,'error')}finally{setSaving(false)}}
 async function toggle(p){try{await api(`/products/${p.id}/`,{method:'PATCH',body:JSON.stringify({available:!p.available})});reload();notify(t.productAvailabilityUpdated,'success')}catch(e){notify(e.message,'error')}}
 return <><div className="section-head"><div><h3>{t.catalog}</h3><p>{t.catalogSubtitle}</p></div><span className="count-pill">{data.length} {t.productsCount}</span></div>
 <form className="panel product-editor" onSubmit={save}><div className="editor-title"><span className="feature-icon">✦</span><div><h3>{t.addProductTitle}</h3><p>{t.addProductHint}</p></div></div>
 <div className="product-editor-grid"><div className="upload-box"><input id="product-image" type="file" accept="image/*" onChange={e=>chooseImage(e.target.files?.[0])}/><label htmlFor="product-image" className="upload-preview">{preview?<img src={mediaUrl(preview)} alt=""/>:<><span>＋</span><b>{t.uploadProductImage}</b><small>{t.imageFormats}</small></>}</label></div>
 <div className="editor-fields"><label>{t.name}<input placeholder={t.productNamePlaceholder} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></label><div className="two-fields"><label>{t.category}<input placeholder={t.category} value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></label><label>{t.price}<input type="number" min="0" step=".01" placeholder="0.00" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} required/></label></div><label>{t.description}<textarea rows="3" placeholder={t.productDescriptionPlaceholder} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><button disabled={saving}>{saving?t.saving:t.addProduct}</button></div></div></form>
 {err&&<p className="error">{err}</p>}<div className="product-grid">{data.map(p=><article className="product-card visual-product" key={p.id}><div className="product-photo">{p.image?<img src={mediaUrl(p.image)} alt={p.name}/>:<span>▧</span>}<span className={`photo-status ${p.available?'is-available':'is-unavailable'}`}>{p.available?t.available:t.unavailable}</span></div><div className="product-info"><small>{p.category||t.generalCategory}</small><h4>{p.name}</h4>{p.description&&<p>{p.description}</p>}<div className="product-card-bottom"><b>{money(p.price)}</b><label className="switch-row"><input type="checkbox" checked={p.available} onChange={()=>toggle(p)}/>{t.availability}</label></div></div></article>)}</div>{!data.length&&<Empty t={t}/>}</>
}

function AccountProfile({t,me,setMe}){
 const [file,setFile]=useState(null),[preview,setPreview]=useState(me.profile_image||''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[saving,setSaving]=useState(false);
 function choose(e){const f=e.target.files?.[0];if(!f)return;if(!['image/jpeg','image/png','image/webp'].includes(f.type)){setError(t.profileImageType);return}if(f.size>5*1024*1024){setError(t.profileImageSize);return}setError('');setNotice('');setFile(f);setPreview(URL.createObjectURL(f))}
 async function save(e){e.preventDefault();if(!file)return;setSaving(true);setError('');try{const fd=new FormData();fd.append('profile_image',file);const updated=await api('/account/profile/',{method:'PATCH',body:fd});setMe(updated);setPreview(updated.profile_image||'');setFile(null);setNotice(t.profileImageSaved)}catch(x){setError(x.message)}finally{setSaving(false)}}
 async function remove(){setSaving(true);setError('');try{const fd=new FormData();fd.append('remove_profile_image','true');const updated=await api('/account/profile/',{method:'PATCH',body:fd});setMe(updated);setPreview('');setFile(null);setNotice(t.profileImageRemoved)}catch(x){setError(x.message)}finally{setSaving(false)}}
 return <section className="panel account-profile"><div className="section-head"><div><h3>{t.accountProfile}</h3><p>{t.accountProfileHint}</p></div></div><form onSubmit={save}><div className="account-avatar-wrap"><label className="account-avatar" htmlFor="account-avatar-input">{preview?<img src={mediaUrl(preview)} alt=""/>:<span>◉</span>}<i>＋</i></label><input id="account-avatar-input" className="visually-hidden-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={choose}/><div><b>{me.first_name||me.username}</b><small>{t[me.role]||me.role}</small><small>{t.profileImageHint}</small></div></div><div className="account-profile-actions"><label className="button-like" htmlFor="account-avatar-input">{t.chooseProfileImage}</label><button type="submit" disabled={!file||saving}>{saving?t.saving:t.saveProfileImage}</button>{me.profile_image&&<button type="button" className="secondary" onClick={remove} disabled={saving}>{t.removeProfileImage}</button>}</div>{error&&<p className="error">{error}</p>}{notice&&<p className="success-note">{notice}</p>}</form></section>
}

function Profile({t}){
 const [profile,setProfile]=useState(null),[logo,setLogo]=useState(null),[cover,setCover]=useState(null),[logoPreview,setLogoPreview]=useState(''),[coverPreview,setCoverPreview]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[saving,setSaving]=useState(false)
 useEffect(()=>{api('/merchant/profile/').then(p=>{setProfile(p);setLogoPreview(p.image||'');setCoverPreview(p.cover_image||'')}).catch(e=>setError(e.message))},[])
 function update(k,v){setProfile(p=>({...p,[k]:v}))}
 async function save(e){e.preventDefault();setSaving(true);setError('');setNotice('');try{const fd=new FormData();['shop_name','description','category','address','opening_hours','latitude','longitude'].forEach(k=>fd.append(k,profile[k]??''));if(logo)fd.append('image',logo);if(cover)fd.append('cover_image',cover);const r=await api('/merchant/profile/',{method:'PATCH',body:fd});setProfile(r);setLogoPreview(r.image||'');setCoverPreview(r.cover_image||'');setLogo(null);setCover(null);setNotice(t.profileSaved)}catch(e){setError(e.message)}finally{setSaving(false)}}
 if(!profile)return <section className="panel"><h3>{t.profile}</h3><p>{error||t.loadingProfile}</p></section>
 return <section className="panel store-profile"><div className="section-head"><div><h3>{t.profile}</h3><p>{t.storeProfileSubtitle}</p></div><span className="feature-icon">◉</span></div><form onSubmit={save}><div className="cover-upload" style={coverPreview?{backgroundImage:`linear-gradient(90deg,#25144b55,#25144b22),url("${mediaUrl(coverPreview)}")`}:{}}><label htmlFor="store-cover">＋ {t.changeCover}</label><input id="store-cover" type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];setCover(f||null);if(f)setCoverPreview(URL.createObjectURL(f))}}/></div><div className="store-logo-row"><label className="store-logo-upload" htmlFor="store-logo">{logoPreview?<img src={mediaUrl(logoPreview)} alt=""/>:<span>＋</span>}<input id="store-logo" type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];setLogo(f||null);if(f)setLogoPreview(URL.createObjectURL(f))}}/></label><div><h3>{profile.shop_name}</h3><small>{t.storeLogoHint}</small></div></div><div className="profile-fields"><label>{t.storeName}<input value={profile.shop_name||''} onChange={e=>update('shop_name',e.target.value)} required/></label><label>{t.storeCategory}<input value={profile.category||''} onChange={e=>update('category',e.target.value)}/></label><label>{t.address}<input value={profile.address||''} onChange={e=>update('address',e.target.value)}/></label><label>{t.openingHours}<input value={profile.opening_hours||''} onChange={e=>update('opening_hours',e.target.value)}/></label><label className="wide-field">{t.description}<textarea rows="4" value={profile.description||''} onChange={e=>update('description',e.target.value)}/></label></div><div className="store-location-section"><h3>موقع المتجر على الخريطة</h3><p className="muted-note">حدد موقع المتجر بدقة حتى يظهر للزبائن وفي خريطة الإدارة.</p><LocationPicker latitude={profile.latitude??''} longitude={profile.longitude??''} label="اضغط على موقع المتجر على الخريطة" onSelect={(lat,lng,address)=>setProfile(p=>({...p,latitude:String(lat),longitude:String(lng),address:address||p.address||''}))}/></div>{error&&<p className="error">{error}</p>}{notice&&<p className="success-note">{notice}</p>}<button disabled={saving}>{saving?t.saving:t.saveProfile}</button></form></section>
}
function Reports({t}){const [report,setReport]=useState(null),[error,setError]=useState('');useEffect(()=>{let live=true;const load=()=>api('/merchant/reports/').then(x=>{if(live){setReport(x);setError('')}}).catch(e=>live&&setError(e.message));load();const id=setInterval(load,10000);return()=>{live=false;clearInterval(id)}},[]);const rows=report?.all_orders||[];return <><h3>{t.reports}</h3>{error&&<p className="error">{error}</p>}{report&&<><div className="stats"><Stat label="مبيعات اليوم المكتملة" value={money(report.gross_sales_today)}/><Stat label="طلبات اليوم" value={report.orders_today}/><Stat label="طلبات مكتملة" value={report.completed_today}/><Stat label="تسويات الكاش اليوم" value={report.cash_settlements_today.length}/></div><p className="note">{report.net_sales_note}</p><h3>سجل التسويات النقدية اليوم</h3><div className="table-wrap"><table><thead><tr><th>المرجع</th><th>الطلب</th><th>الكابتن</th><th>المبلغ</th><th>تأكيد التاجر</th><th>تأكيد الكابتن</th><th>الإغلاق</th></tr></thead><tbody>{report.cash_settlements_today.map(s=><tr key={s.id}><td>{s.reference}</td><td>#{s.order_id}</td><td>{s.captain_name}</td><td>{money(s.amount)}</td><td>{s.confirmed_by_merchant?'تم':'بانتظار'}</td><td>{s.confirmed_by_captain?'تم':'بانتظار'}</td><td>{s.closed?'مغلق':'مفتوح'}</td></tr>)}</tbody></table></div></>}<h3>{t.orders}</h3><div className="table-wrap"><table><thead><tr><th>#</th><th>{t.status}</th><th>{t.total}</th><th>{t.date}</th></tr></thead><tbody>{rows.map(o=><tr key={o.id}><td>{o.id}</td><td>{statusLabel(t,o.status)}</td><td>{money(o.total)}</td><td>{new Date(o.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div></>}
function Captain({t}){
 const [profile,setProfile]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[docs,setDocs]=useState({});
 async function loadProfile(){try{const d=await api('/captains/me/');setProfile(d);setError('')}catch(e){setError(e.message)}}
 useEffect(()=>{loadProfile();const timer=setInterval(loadProfile,5000);const ws=orderSocket(m=>{if(m&&(m.type==='captain.eligibility'||m.type==='captain.location'))loadProfile()});return()=>{clearInterval(timer);if(ws)ws.close()}},[]);
 useEffect(()=>{
  if(!profile?.online||!navigator.geolocation)return;
  let lastSentAt=0,lastLat=null,lastLng=null,disposed=false;
  const sendPosition=async position=>{
   if(disposed)return;
   const latitude=position.coords.latitude,longitude=position.coords.longitude,now=Date.now();
   const moved=lastLat==null||Math.hypot((latitude-lastLat)*111320,(longitude-lastLng)*111320*Math.cos(latitude*Math.PI/180))>=15;
   if(!moved&&now-lastSentAt<20000)return;
   if(now-lastSentAt<8000)return;
   lastSentAt=now;lastLat=latitude;lastLng=longitude;
   try{const updated=await api('/captains/me/',{method:'PATCH',body:JSON.stringify({current_latitude:latitude,current_longitude:longitude})});if(!disposed)setProfile(current=>current?({...current,current_latitude:updated.current_latitude,current_longitude:updated.current_longitude,current_location_updated_at:updated.current_location_updated_at}):updated);if(!disposed)setError('')}catch(err){if(!disposed)setError(err.message||'تعذر إرسال الموقع إلى الخادم.')}
  };
  const onVisible=()=>{if(document.visibilityState==='visible')navigator.geolocation.getCurrentPosition(sendPosition,()=>{}, {enableHighAccuracy:true,maximumAge:0,timeout:12000})};
  document.addEventListener('visibilitychange',onVisible);
  const watchId=navigator.geolocation.watchPosition(sendPosition,()=>{if(!disposed)setError(t.locationDenied||'تعذر الوصول إلى GPS. تحقق من إذن الموقع واتصال الإنترنت.')}, {enableHighAccuracy:true,maximumAge:5000,timeout:15000});
  return()=>{disposed=true;document.removeEventListener('visibilitychange',onVisible);navigator.geolocation.clearWatch(watchId)};
 },[profile?.online,t.locationDenied]);
 async function toggle(){if(!profile)return;setBusy(true);try{const d=await api('/captains/me/',{method:'PATCH',body:JSON.stringify({online:!profile.online})});setProfile(d);setError('')}catch(e){setError(e.message);await loadProfile()}finally{setBusy(false)}}
 async function uploadDocs(e){e.preventDefault();const fd=new FormData();Object.entries(docs).forEach(([k,v])=>v&&fd.append(k,v));try{const d=await api('/captains/me/',{method:'PATCH',body:fd});setProfile(d);setDocs({});setError('');notify(t.captainDocsUploaded,'success')}catch(x){setError(x.message)}}
 async function sos(){if(!window.confirm('هل تريد إرسال بلاغ طوارئ إلى مركز دعم وصلني؟'))return;let coords='الموقع غير متاح';try{const pos=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:10000}));coords=`${pos.coords.latitude}, ${pos.coords.longitude}`}catch{}try{await api('/support-tickets/',{method:'POST',body:JSON.stringify({subject:'بلاغ طوارئ SOS',message:`بلاغ طوارئ من الكابتن ${profile?.name||''}. الموقع: ${coords}`})});notify(t.sosCreated,'success')}catch(e){setError(e.message)}}
 const e=profile?.eligibility,online=!!e?.online,documents=profile?.documents||{};
 return <><div className="section-head"><div><h3>{t.captainWorkspace}</h3><p>{t.readyOrders}</p></div><div className="row-actions"><button className="secondary" onClick={sos}>🆘 SOS</button><button disabled={busy||!e||(!online&&!e.can_go_online)} className={online?'secondary':'primary'} onClick={toggle}>{online?t.stopReceiving:t.startReceiving}</button></div></div><div className="panel">
 {e&&<><p>{profile.name} ({profile.username}) · {t.eligAccountId}: <b>{profile.user_id}</b> · {t.eligProfileId}: <b>{profile.captain_profile_id}</b></p><EligibilityPanel e={e} t={t}/><div className={`captain-gps-status ${profile.current_location_updated_at&&Date.now()-new Date(profile.current_location_updated_at).getTime()<=60000?'is-active':''}`}><span className="gps-pulse"/><div><b>{profile.current_location_updated_at?(Date.now()-new Date(profile.current_location_updated_at).getTime()<=60000?'GPS نشط · الموقع حديث':'GPS متوقف عن التحديث · الموقع قديم'):(t.gpsWaiting||'بانتظار أول تحديث للموقع')}</b><small>{profile.current_location_updated_at?`${t.lastLocationUpdate||'آخر تحديث'}: ${new Date(profile.current_location_updated_at).toLocaleString()}`:(t.gpsPermissionHint||'اسمح بالوصول للموقع أثناء العمل لعرض موقعك للزبون')} · عند عودة التطبيق للواجهة سيطلب تحديثاً جديداً. تتبع الخلفية يحتاج تطبيقاً أصلياً وإعداد خدمة موقع دائمة.</small></div></div><div className="document-status"><b>وثائق الكابتن</b><p>الهوية: {documents.identity_uploaded?'تم الرفع':'غير مرفوعة'} · الرخصة: {documents.license_uploaded?'تم الرفع':'غير مرفوعة'} · التأمين: {documents.insurance_uploaded?'تم الرفع':'غير مرفوع'} · التعهد: {documents.undertaking_signed?'موقّع':'غير موقّع'}</p><form className="form-stack" onSubmit={uploadDocs}><label>وثيقة الهوية / التصريح<input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={x=>setDocs(d=>({...d,identity_document:x.target.files?.[0]}))}/></label><label>رخصة القيادة<input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={x=>setDocs(d=>({...d,driving_license_document:x.target.files?.[0]}))}/></label><label>وثيقة التأمين<input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={x=>setDocs(d=>({...d,insurance_document:x.target.files?.[0]}))}/></label><button disabled={!Object.values(docs).some(Boolean)}>رفع الوثائق</button></form></div></>}
 {error&&<p className="error">{error}</p>}</div><Orders role="captain" t={t}/></>}

function Settlements({t,role}){const {data,err,reload}=useLoad('/settlements/');const [collected,setCollected]=useState({}),[resolution,setResolution]=useState({});async function confirm(id){try{const body=role==='captain'?{collected_amount:collected[id]??data.find(x=>x.id===id)?.amount}:role==='admin'?{collected_amount:collected[id]??data.find(x=>x.id===id)?.collected_amount??data.find(x=>x.id===id)?.amount,resolution_note:resolution[id]||''}:{};await api(`/settlements/${id}/confirm/`,{method:'POST',body:JSON.stringify(body)});reload();notify(t.settlementConfirmed,'success')}catch(e){notify(e.message,'error')}}return <><h3>{t.settlements}</h3>{err&&<p className="error">{err}</p>}<div className="order-grid">{data.map(s=><article className="order-card" key={s.id}><b>{s.reference}</b><h3>المبلغ المطلوب تحصيله: {money(s.amount)}</h3><p>قيمة المنتجات: {money(s.goods_amount)}</p><p>عمولة وصلني: {money(s.platform_commission)}</p><p>صافي مستحق التاجر: {money(s.merchant_net)}</p><p>مستحق الكابتن (التوصيل والمحسوم): {money(s.captain_earnings)}</p><p>المبلغ المحصل فعلياً: {s.collected_amount==null?'لم يسجل بعد':money(s.collected_amount)}</p><p>{t.orderPrefix} #{s.order}</p><p>{t.merchantConfirmed}: {s.confirmed_by_merchant?t.confirmed:t.waiting}</p><p>{t.captainConfirmed}: {s.confirmed_by_captain?t.confirmed:t.waiting}</p>{s.collected_amount!=null&&Number(s.collected_amount)!==Number(s.amount)&&<p className="error">فرق التحصيل: {money(Number(s.collected_amount)-Number(s.amount))} · بانتظار المعالجة الإدارية</p>}<details><summary>سجل إجراءات التسوية ({(s.events||[]).length})</summary>{(s.events||[]).map(ev=><p className="note" key={ev.id}>{ev.action==='captain_collected'?'تسجيل تحصيل الكابتن':ev.action==='merchant_confirmed'?'تأكيد التاجر':'معالجة الإدارة'} · {ev.actor_name||'—'} · {new Date(ev.created_at).toLocaleString()} {ev.note?`· ${ev.note}`:''}</p>)}</details><span className="tag">{s.closed?t.closed:t.open}</span>{(role==='captain'&&!s.confirmed_by_captain&&!s.closed||role==='admin'&&!s.closed)&&<label>{role==='captain'?'المبلغ النقدي الذي استلمته فعلياً':'المبلغ الفعلي بعد المراجعة'}<input type="number" min="0" step="0.01" value={collected[s.id]??(s.collected_amount??s.amount)} onChange={e=>setCollected(v=>({...v,[s.id]:e.target.value}))}/></label>}{role==='admin'&&!s.closed&&<label>سبب المعالجة الإدارية<textarea value={resolution[s.id]||''} onChange={e=>setResolution(v=>({...v,[s.id]:e.target.value}))} placeholder="مطلوب عند وجود فرق نقدي"/></label>}{!s.closed&&((role==='captain'&&!s.confirmed_by_captain)||(role==='merchant'&&!s.confirmed_by_merchant)||role==='admin')&&<button onClick={()=>confirm(s.id)}>{role==='captain'?'تأكيد قبض المبلغ':role==='merchant'?'تأكيد استلام مستحقات المتجر':'إغلاق التسوية إدارياً'}</button>}</article>)}</div>{!data.length&&<Empty t={t}/>}</>}
function Admin({t}){
 const [summary,setSummary]=useState(null),[data,setData]=useState({captains:[],merchants:[],stores:[],orders:[],tickets:[],subscriptions:[]}),[tab,setTab]=useState('overview'),[err,setErr]=useState(''),[busy,setBusy]=useState('');
 async function load(){try{const [s,o,subscriptions,stores]=await Promise.all([api('/dashboard/summary/'),api('/admin/operations/'),api('/admin/subscriptions/'),api('/admin/stores/')]);setSummary(s);setData({...o,subscriptions,stores});setErr('')}catch(e){setErr(e.message)}}
 useEffect(()=>{load();const timer=setInterval(load,7000);return()=>clearInterval(timer)},[]);
 async function update(kind,id,value){setBusy(`${kind}-${id}`);try{await api('/admin/operations/',{method:'PATCH',body:JSON.stringify({kind,id,value})});await load()}catch(e){setErr(e.message)}finally{setBusy('')}}
 const tabs=[['overview',t.overview],['users',t.userManagement],['subscriptions',t.subscriptionsTitle],['captains',t.captainManagement],['merchants',t.merchantManagement],['orders',t.orderManagement],['tickets',t.ticketManagement]];
 return <><div className="section-head"><div><h3>{t.dashboard}</h3><p>{t.overview} · {t.live}</p></div><button className="secondary" onClick={load}>{t.refresh}</button></div>{err&&<p className="error">{err}</p>}
 {summary&&<div className="stats"><Stat label={t.todayOrders} value={summary.orders_today}/><Stat label={t.active} value={summary.active_orders}/><Stat label={t.completedToday} value={summary.completed_today}/><Stat label={t.captains} value={summary.online_captains}/><Stat label={t.merchants} value={summary.open_merchants}/><Stat label={t.sales} value={money(summary.sales_today)}/><Stat label={t.openTickets} value={summary.open_tickets}/></div>}
 <div className="admin-tabs">{tabs.map(([id,label])=><button key={id} className={tab===id?'primary':'secondary'} onClick={()=>setTab(id)}>{label}</button>)}</div>
 {tab==='overview'&&<><section className="panel admin-map"><h3>{t.mapTitle}</h3><p>{t.mapNote}</p><AdminOverviewMap stores={data.stores} orders={data.orders}/></section><section className="panel"><h3>{t.ordersSection}</h3><AdminOrders rows={data.orders.slice(0,8)} t={t}/></section></>}
 {tab==='users'&&<AdminUsers t={t}/>}{tab==='subscriptions'&&<SubscriptionManagement rows={data.subscriptions} t={t} reload={load}/>}
 {tab==='captains'&&<CaptainManagement t={t} captains={data.captains} busy={busy} update={update} reload={load}/>}
 {tab==='merchants'&&<section className="panel"><h3>{t.merchantManagement} · إدارة المتاجر والمنتجات</h3>{data.stores.length?data.stores.map(m=><article className="admin-row admin-store-row" key={m.id}><div className="admin-store-head">{m.image&&<img src={mediaUrl(m.image)} alt=""/>}<div><b>{m.shop_name}</b><small>المالك: {m.owner_name} · {m.username}</small><small>{m.category} · {m.address||'—'}</small><small>عدد المنتجات: {m.product_count} · {new Date(m.created_at).toLocaleDateString()}</small><small>عمولة وصلني الحالية: {m.commission_type==='fixed'?`${money(m.commission_value)} لكل طلب`:`${m.commission_value}% من قيمة المنتجات`}</small><span className={`tag ${m.is_open?'ready':'new'}`}>{m.is_open?t.openStore:'بانتظار التفعيل / مغلق'}</span></div><button className="secondary" disabled={busy===`store-${m.id}`} onClick={async()=>{setBusy(`store-${m.id}`);try{await api(`/admin/stores/${m.id}/`,{method:'PATCH',body:JSON.stringify({is_open:!m.is_open})});await load()}catch(e){setErr(e.message)}finally{setBusy('')}}}>{m.is_open?'إيقاف المتجر':'تفعيل المتجر'}</button></div><div className="admin-commission-controls"><label>نوع العمولة<select value={m.commission_type||'percent'} onChange={async e=>{const value=e.target.value;try{await api(`/admin/stores/${m.id}/`,{method:'PATCH',body:JSON.stringify({commission_type:value})});await load()}catch(error){setErr(error.message)}}}><option value="percent">نسبة مئوية</option><option value="fixed">مبلغ ثابت لكل طلب</option></select></label><label>قيمة العمولة<input type="number" min="0" step="0.01" max={m.commission_type==='percent'?100:undefined} defaultValue={m.commission_value||'0'} onBlur={async e=>{try{await api(`/admin/stores/${m.id}/`,{method:'PATCH',body:JSON.stringify({commission_value:e.target.value})});await load()}catch(error){setErr(error.message)}}}/></label></div>{m.cover_image&&<img className="admin-store-cover" src={mediaUrl(m.cover_image)} alt=""/>}<div className="admin-store-products">{m.products.map(p=><div key={p.id}>{p.image&&<img src={mediaUrl(p.image)} alt=""/>}<span><b>{p.name}</b><small>{money(p.price)} · {p.available?'متاح':'غير متاح'}</small></span></div>)}</div></article>):<EmptyText text={t.noMerchants}/>}</section>}
 {tab==='orders'&&<section className="panel"><h3>{t.orderManagement}</h3><AdminOrders rows={data.orders} t={t}/></section>}
 {tab==='tickets'&&<section className="panel"><h3>{t.ticketManagement}</h3>{data.tickets.length?data.tickets.map(x=><article className="admin-row" key={x.id}><div><b>#{x.id} · {x.subject}</b><small>{x.username} · {new Date(x.created_at).toLocaleString()}</small><p>{x.message}</p><span className="tag">{statusLabel(t,x.status)}</span></div><select value={x.status} onChange={e=>update('ticket',x.id,e.target.value)}><option value="open">{t.open}</option><option value="in_review">{t.review}</option><option value="resolved">{t.resolve}</option></select></article>):<EmptyText text={t.noTickets}/>}</section>}
 </>}


function SubscriptionManagement({rows,t,reload}){
 const [payments,setPayments]=useState({}),[busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function changeStatus(row,status){setBusy(`status-${row.id}`);setError('');setNotice('');try{await api(`/admin/subscriptions/${row.id}/`,{method:'PATCH',body:JSON.stringify({status})});setNotice(t.statusChanged);await reload()}catch(e){setError(e.message)}finally{setBusy('')}}
 async function record(row){const amount=payments[row.id];if(!amount)return;setBusy(`payment-${row.id}`);setError('');setNotice('');try{await api(`/admin/subscriptions/${row.id}/payments/`,{method:'POST',body:JSON.stringify({amount,method:'cash'})});setPayments(p=>({...p,[row.id]:''}));setNotice(t.paymentRecorded);await reload()}catch(e){setError(e.message)}finally{setBusy('')}}
 return <section className="panel"><div className="section-head"><div><h3>{t.subscriptionsTitle}</h3><p>{rows.length} · {t.subscriptionLedgerHint}</p></div><button className="secondary" onClick={reload}>{t.refresh}</button></div>{error&&<p className="error">{error}</p>}{notice&&<p className="success-note">{notice}</p>}{rows.length?rows.map(row=><article className="managed-user" key={row.id}><div className="managed-user-head"><div><b>{row.name}</b><small>{row.username} · ID {row.user_id} · {t[row.role]||row.role}</small><span className={`tag ${row.is_current?'ready':'new'}`}>{row.is_current?t.subscriptionCurrent:(t['subStatus_'+row.effective_status]||row.effective_status)}</span></div><label>{t.subscriptionStatus}<select value={row.status} disabled={busy===`status-${row.id}`} onChange={e=>changeStatus(row,e.target.value)}><option value="active">{t.activeSubscription}</option><option value="pending">{t.pendingSubscription}</option><option value="expired">{t.expiredSubscription}</option><option value="cancelled">{t.cancelledSubscription}</option></select></label></div><div className="subscription-summary"><div><small>{t.subscriptionPeriod}</small><b>{row.starts_on} — {row.ends_on}</b><small>{t.monthlyAmount}: {row.amount} ₪ × {row.months} {t.months}</small></div><div><small>{t.subscriptionBalance}</small><b>{row.paid_total} / {row.total_due} ₪</b><small>{t.remainingBalance}: {row.remaining} ₪</small></div></div><div className="payment-row"><input type="number" min="0.01" step="0.01" placeholder={t.paymentAmount} value={payments[row.id]??''} onChange={e=>setPayments(p=>({...p,[row.id]:e.target.value}))}/><button className="secondary" disabled={busy===`payment-${row.id}`||!payments[row.id]||Number(payments[row.id])>Number(row.remaining)} onClick={()=>record(row)}>{t.recordPayment}</button></div></article>):<EmptyText text={t.noSubscriptions}/>}</section>
}


function CaptainManagement({t,captains,busy,update,reload}){
 const [approvalBusy,setApprovalBusy]=useState(''),[approvalError,setApprovalError]=useState('');
 async function setApproval(c,status){const key=`approval-${c.captain_profile_id}`;setApprovalBusy(key);setApprovalError('');try{await api(`/admin/captains/${c.captain_profile_id}/approval/`,{method:'POST',body:JSON.stringify({status})});await reload()}catch(err){setApprovalError(err.message)}finally{setApprovalBusy('')}}
 const [form,setForm]=useState({identity_number:'',first_name:'',last_name:'',phone:'',password:'',vehicle_type:'motorcycle',vehicle_model:'',plate_number:'',permit_type:'west_bank',subscription_required:true});
 const [saving,setSaving]=useState(false),[error,setError]=useState(''),[created,setCreated]=useState(null);
 function field(k,v){setForm(f=>({...f,[k]:v}))}
 async function submit(e){e.preventDefault();setSaving(true);setError('');setCreated(null);try{const result=await api('/admin/users/',{method:'POST',body:JSON.stringify({...form,role:'captain'})});setCreated(result);setForm({identity_number:'',first_name:'',last_name:'',phone:'',password:'',vehicle_type:'motorcycle',vehicle_model:'',plate_number:'',permit_type:'west_bank',subscription_required:true});await reload()}catch(e){setError(e.message)}finally{setSaving(false)}}
 return <div className="captain-admin-stack"><section className="panel"><div className="section-head"><div><h3>{t.addCaptain}</h3><p>{t.addCaptainHint}</p></div><span className="feature-icon">♧</span></div>
 <form className="user-create-form" onSubmit={submit}>
 <label>{t.identityNumber}<input value={form.identity_number} onChange={e=>field('identity_number',e.target.value)} required autoComplete="off"/></label>
 <label>{t.firstName}<input value={form.first_name} onChange={e=>field('first_name',e.target.value)} required/></label>
 <label>{t.lastName}<input value={form.last_name} onChange={e=>field('last_name',e.target.value)}/></label>
 <label>{t.phone}<input value={form.phone} onChange={e=>field('phone',e.target.value)} required/></label>
 <label>{t.temporaryPassword}<input type="password" minLength={8} value={form.password} onChange={e=>field('password',e.target.value)} placeholder={t.autoGeneratePassword}/></label>
 <label>{t.vehicleType}<select value={form.vehicle_type} onChange={e=>field('vehicle_type',e.target.value)}><option value="motorcycle">{t.motorcycle}</option><option value="car">{t.car}</option><option value="truck">{t.truck}</option></select></label>
 <label>{t.vehicleModel}<input value={form.vehicle_model} onChange={e=>field('vehicle_model',e.target.value)}/></label>
 <label>{t.plateNumber}<input value={form.plate_number} onChange={e=>field('plate_number',e.target.value)}/></label>
 <label>{t.permitType}<select value={form.permit_type} onChange={e=>field('permit_type',e.target.value)}><option value="west_bank">{t.westBankPermit}</option><option value="jerusalem_id">{t.jerusalemPermit}</option><option value="work_permit">{t.workPermit}</option></select></label>
 <label className="check-label"><input type="checkbox" checked={form.subscription_required} onChange={e=>field('subscription_required',e.target.checked)}/>{t.subscriptionRequired}</label>
 <button disabled={saving}>{saving?t.saving:t.addCaptain}</button></form>
 {error&&<p className="error">{error}</p>}{created&&<div className="credential-box"><b>{t.captainCreated}</b><p>{t.loginUsername}: <strong>{created.username}</strong></p><p>{t.temporaryPassword}: <code>{created.temporary_password}</code></p><small>{t.sharePasswordWarning}</small></div>}
 </section><section className="panel"><div className="section-head"><div><h3>{t.captainManagement}</h3><p>{captains.length} · {t.captains}</p></div><button className="secondary" onClick={reload}>{t.refresh}</button></div>
 {approvalError&&<p className="error">{approvalError}</p>}{captains.length?captains.map(c=>{const e=c.eligibility,key=`approval-${c.captain_profile_id}`;return <article className="admin-row captain-row" key={c.captain_profile_id}><div><b>{c.name}</b><small>{c.username} · {t[c.vehicle_type]||c.vehicle_type}{c.vehicle_model?` · ${c.vehicle_model}`:''}{c.plate_number?` · ${c.plate_number}`:''}</small><small>{t.eligAccountId}: {c.user_id} · {t.eligProfileId}: {c.captain_profile_id}</small><small>{t.license}: {c.license_verified?'✓':'—'} · {t.insurance}: {c.insurance_verified?'✓':'—'}</small><small>الوثائق: هوية {c.documents?.identity_uploaded?'مرفوعة':'ناقصة'} · رخصة {c.documents?.license_uploaded?'مرفوعة':'ناقصة'} · تأمين {c.documents?.insurance_uploaded?'مرفوع':'ناقص'}</small><label className="check-label"><input type="checkbox" checked={!!c.checkpoint_badge} onChange={async ev=>{try{await api(`/admin/captains/${c.captain_profile_id}/approval/`,{method:'POST',body:JSON.stringify({status:e.approval.status,checkpoint_badge:ev.target.checked})});await reload()}catch(err){setApprovalError(err.message)}}}/>منح شارة عبور المحاسيم</label><EligibilityPanel e={e} t={t}/></div><div className="row-actions">{e.approval.status!=='approved'&&<button disabled={approvalBusy===key} onClick={()=>setApproval(c,'approved')}>{t.approve}</button>}{e.approval.status!=='rejected'&&<button className="secondary" disabled={approvalBusy===key} onClick={()=>setApproval(c,'rejected')}>{t.eligReject}</button>}{e.approval.status==='approved'&&<button className="secondary" disabled={approvalBusy===key} onClick={()=>setApproval(c,'pending')}>{t.revoke}</button>}</div></article>}):<EmptyText text={t.noCaptains}/>}
 </section></div>
}

function AdminUsers({t}){
 const [users,setUsers]=useState([]),[error,setError]=useState(''),[notice,setNotice]=useState(''),[created,setCreated]=useState(null),[busy,setBusy]=useState('');
 const [form,setForm]=useState({identity_number:'',first_name:'',last_name:'',phone:'',role:'customer',shop_name:'',subscription_required:false});
 const [plans,setPlans]=useState({}),[payments,setPayments]=useState({});
 async function load(){try{setUsers(await api('/admin/users/'));setError('')}catch(e){setError(e.message)}}
 useEffect(()=>{load()},[]);
 function setField(k,v){setForm(f=>({...f,[k]:v}))}
 async function create(e){e.preventDefault();setError('');setNotice('');setCreated(null);setBusy('create');try{const r=await api('/admin/users/',{method:'POST',body:JSON.stringify(form)});setCreated(r);setNotice(t.accountCreated);setForm({identity_number:'',first_name:'',last_name:'',phone:'',role:'customer',shop_name:'',subscription_required:false});await load()}catch(e){setError(e.message)}finally{setBusy('')}}
 async function savePlan(user){const f=plans[user.id]||{};setBusy(`plan-${user.id}`);setError('');try{await api(`/admin/users/${user.id}/subscription/`,{method:'POST',body:JSON.stringify({amount:f.amount,starts_on:f.starts_on||new Date().toISOString().slice(0,10),months:Number(f.months||1),status:'active',notes:f.notes||''})});setNotice(t.subscriptionSaved);await load()}catch(e){setError(e.message)}finally{setBusy('')}}
 async function recordPayment(user){const amount=payments[user.id];if(!user.subscription||!amount)return;setBusy(`payment-${user.id}`);setError('');try{await api(`/admin/subscriptions/${user.subscription.id}/payments/`,{method:'POST',body:JSON.stringify({amount,method:'cash'})});setNotice(t.paymentRecorded);setPayments(p=>({...p,[user.id]:''}));await load()}catch(e){setError(e.message)}finally{setBusy('')}}
 async function toggleUser(user){setBusy(`user-${user.id}`);try{await api(`/admin/users/${user.id}/`,{method:'PATCH',body:JSON.stringify({is_active:!user.is_active})});await load()}catch(e){setError(e.message)}finally{setBusy('')}}
 async function toggleRequired(user){setBusy(`req-${user.id}`);try{await api(`/admin/users/${user.id}/`,{method:'PATCH',body:JSON.stringify({subscription_required:!user.subscription_required})});await load()}catch(e){setError(e.message)}finally{setBusy('')}}
 return <div className="users-admin"><section className="panel"><h3>{t.createAccount}</h3><p className="note">{t.adminCreatesAccountsNote}</p><form className="user-create-form" onSubmit={create}>
 <label>{t.identityNumber}<input value={form.identity_number} onChange={e=>setField('identity_number',e.target.value)} required autoComplete="off"/></label>
 <label>{t.firstName}<input value={form.first_name} onChange={e=>setField('first_name',e.target.value)} required/></label>
 <label>{t.lastName}<input value={form.last_name} onChange={e=>setField('last_name',e.target.value)}/></label>
 <label>{t.phone}<input value={form.phone} onChange={e=>setField('phone',e.target.value)} required/></label>
 <label>{t.accountRole}<select value={form.role} onChange={e=>{const role=e.target.value;setForm(f=>({...f,role,subscription_required:role==='merchant'||role==='captain'}))}}><option value="customer">{t.customer}</option><option value="merchant">{t.merchantRole}</option><option value="captain">{t.captainRole}</option></select></label>
 {form.role==='merchant'&&<label>{t.storeName}<input value={form.shop_name} onChange={e=>setField('shop_name',e.target.value)} required/></label>}
 <label className="check-label"><input type="checkbox" checked={form.subscription_required} onChange={e=>setField('subscription_required',e.target.checked)}/>{t.subscriptionRequired}</label>
 <button disabled={busy==='create'}>{busy==='create'?t.saving:t.createAccount}</button></form>
 {error&&<p className="error">{error}</p>}{notice&&<p className="success-note">{notice}</p>}
 {created&&<div className="credential-box"><b>{t.accountCreated}</b><p>{t.loginUsername}: <strong>{created.username}</strong></p><p>{t.temporaryPassword}: <code>{created.temporary_password}</code></p><small>{t.sharePasswordWarning}</small></div>}
 </section>
 <section className="panel"><div className="section-head"><div><h3>{t.userManagement}</h3><p>{users.length} · {t.accounts}</p></div><button className="secondary" onClick={load}>{t.refresh}</button></div>
 {users.length?users.map(u=><article className="managed-user" key={u.id}><div className="managed-user-head"><div><b>{u.name}</b><small>{u.identity_number||u.username} · {u.phone} · {t[u.role]||u.role}</small><span className={`tag ${u.is_active?'ready':'new'}`}>{u.is_active?t.accountActive:t.accountDisabled}</span></div><button className="secondary" onClick={()=>toggleUser(u)} disabled={busy===`user-${u.id}`}>{u.is_active?t.disableAccount:t.enableAccount}</button></div>
 <div className="subscription-summary"><div><small>{t.subscription}</small><b>{u.subscription?`${u.subscription.amount} ₪ / ${u.subscription.months} ${t.months}`:(u.last_subscription?`${u.last_subscription.amount} ₪ · ${t.noActiveSubscription}`:t.noSubscription)}</b><small>{u.subscription?`${u.subscription.starts_on} — ${u.subscription.ends_on}`:(u.last_subscription?`${t.lastExpiry}: ${u.last_subscription.ends_on}`:'')}</small></div><label className="check-label"><input type="checkbox" checked={u.subscription_required} onChange={()=>toggleRequired(u)} />{t.subscriptionRequired}</label></div>
 <div className="subscription-form"><b>{t.setMonthlySubscription}</b><div className="subscription-fields"><label>{t.monthlyAmount}<input type="number" min="0" step="0.01" value={plans[u.id]?.amount??''} onChange={e=>setPlans(p=>({...p,[u.id]:{...p[u.id],amount:e.target.value}}))} placeholder="0.00"/></label><label>{t.startDate}<input type="date" value={plans[u.id]?.starts_on??new Date().toISOString().slice(0,10)} onChange={e=>setPlans(p=>({...p,[u.id]:{...p[u.id],starts_on:e.target.value}}))}/></label><label>{t.durationMonths}<select value={plans[u.id]?.months??1} onChange={e=>setPlans(p=>({...p,[u.id]:{...p[u.id],months:e.target.value}}))}>{[1,2,3,6,12].map(n=><option key={n} value={n}>{n}</option>)}</select></label><button disabled={busy===`plan-${u.id}`||!plans[u.id]?.amount} onClick={()=>savePlan(u)}>{t.saveSubscription}</button></div>{u.subscription&&<div className="payment-row"><small>{t.paidSoFar}: {u.subscription.paid_total} ₪ / {u.subscription.total_due} ₪</small><input type="number" min="0.01" step="0.01" placeholder={t.paymentAmount} value={payments[u.id]??''} onChange={e=>setPayments(p=>({...p,[u.id]:e.target.value}))}/><button className="secondary" disabled={busy===`payment-${u.id}`||!payments[u.id]} onClick={()=>recordPayment(u)}>{t.recordPayment}</button></div>}</div>
 </article>):<EmptyText text={t.noUsers}/>}
 </section></div>
}
function AdminOrders({rows,t}){return rows.length?<div className="admin-table-wrap"><table><thead><tr><th>#</th><th>{t.status}</th><th>{t.customerLabel}</th><th>{t.merchantLabel}</th><th>{t.captainLabel}</th><th>{t.amount}</th><th>{t.date}</th></tr></thead><tbody>{rows.map(o=><tr key={o.id}><td>#{o.id}</td><td>{statusLabel(t,o.status)}</td><td>{o.customer}</td><td>{o.merchant}</td><td>{o.captain}</td><td>{money(o.total)}</td><td>{new Date(o.created_at).toLocaleString()}</td></tr>)}</tbody></table></div>:<EmptyText text={t.noOrders}/> }
function EligibilityPanel({e,t}){
 const row=(label,value,ok)=><div className="elig-row"><small>{label}</small><span className={`tag ${ok?'ready':'bad'}`}>{value}</span></div>;
 const sub=e.subscription;
 return <div className="elig-panel"><div className="elig-grid">
  {row(t.eligAccount,e.account.active?t.eligAccountActive:t.eligAccountInactive,e.account.active)}
  {row(t.approvalStatus,t['approval_'+e.approval.status]||e.approval.status,e.approval.status==='approved')}
  {row(t.eligSubscription,t['subStatus_'+sub.status]||sub.status,sub.active)}
  {row(t.connectionStatus,e.online?t.online:t.offline,e.online)}
  {row(t.eligVehicle,e.vehicle.valid?(t[e.vehicle.type]||e.vehicle.type):t.reason_vehicle_invalid,e.vehicle.valid)}
  <div className="elig-row"><small>{t.checkpoint}</small><span className={`tag ${e.checkpoint.badge?'ready':''}`}>{e.checkpoint.badge?t.eligBadgeYes:t.eligBadgeNo}</span></div>
 </div>
 {sub.details&&<small className="elig-dates">{sub.details.starts_on} — {sub.details.ends_on}</small>}
 <p className={e.can_receive_orders?'success-note':'note'}>{e.can_receive_orders?t.eligReceiving:`${t.eligNotReceiving}: ${t['reason_'+e.reason]||e.message||''}`}</p>
 {e.warnings.map(w=><small key={w} className="elig-dates">⚠ {t['warning_'+w]||w}</small>)}
 </div>}
function EmptyText({text}){return <div className="empty compact-empty">{text}</div>}

function Support({t}){const {data,reload}=useLoad('/support-tickets/');const [f,setF]=useState({subject:'',message:''});async function send(e){e.preventDefault();try{await api('/support-tickets/',{method:'POST',body:JSON.stringify(f)});setF({subject:'',message:''});reload();notify(t.supportSent,'success')}catch(e){notify(e.message,'error')}}return <><h3>{t.support}</h3><form className="panel form-stack" onSubmit={send}><input placeholder={t.ticketTitle} value={f.subject} onChange={e=>setF({...f,subject:e.target.value})} required/><textarea placeholder={t.ticketDetails} value={f.message} onChange={e=>setF({...f,message:e.target.value})} required/><button>{t.sendTicket}</button></form>{data.map(x=><div className="ticket" key={x.id}><b>{x.subject}</b><p>{x.message}</p><small>{statusLabel(t,x.status)}</small></div>)}</>}
function Stat({label,value}){return <article className="stat"><small>{label}</small><strong>{value}</strong></article>}
function Empty({t}){return <div className="empty"><span>✦</span><p>{t.empty}</p></div>}
export default App
