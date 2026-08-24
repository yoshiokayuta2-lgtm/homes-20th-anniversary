const posts = [
  {title:'元非常勤からのメッセージ', author:'HOMES MEMORY', icon:'camera', alt:false, image:'assets/memories/memory-01.jpeg', tag:'MEMORY'},
  {title:'あのシーンを再現してみた', author:'HOMES ARCHIVE', icon:'camera', alt:false, image:'assets/memories/memory-03.jpeg', tag:'ARCHIVE'},
  {title:'○○校に来ました', author:'HOMES MEMORY', icon:'people', alt:false, image:'assets/memories/memory-05.jpeg', tag:'MEMORY'},
  {title:'校舎メッセージ・大垣本部校', author:'HOMES MEMORY', icon:'camera', alt:true, image:'assets/memories/memory-02.jpeg', tag:'MEMORY'},
  {title:'あのシーンを再現してみた', author:'HOMES ARCHIVE', icon:'camera', alt:false, image:'assets/memories/memory-07.jpg', tag:'ARCHIVE'},
  {title:'あのシーンを再現してみた', author:'HOMES ARCHIVE', icon:'camera', alt:true, image:'assets/memories/memory-08.jpg', tag:'ARCHIVE'},
  {title:'もう今日は走りたくありません', author:'周年プロジェクト', icon:'bike', alt:true, image:'assets/memories/memory-04.jpeg', tag:'RIDE'},
  {title:'自転車部からのメッセージ', author:'HOMES ARCHIVE', icon:'bike', alt:true, image:'assets/memories/memory-06.jpeg', tag:'RIDE'}
];

function lineIcon(name){
  return `<svg class="feed-line-icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}
function escapeHtml(v){
  return String(v).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}
let autoScrollTimer=null;
function renderPosts(){
  const feed=document.getElementById('postFeed');
  const loopPosts=[...posts, ...posts];
  feed.innerHTML=loopPosts.map((p,i)=>`<article class="post-card ${p.image?'photo-card':''}" ${i>=posts.length?'aria-hidden="true"':''}><div class="post-thumb ${p.alt?'alt':''}">${p.image?`<img src="${p.image}" alt="${escapeHtml(p.title)}"><div class="post-overlay"></div><div class="post-chip">${escapeHtml(p.tag||'HOMES')}</div>`:lineIcon(p.icon)}<div class="post-play">${lineIcon('play')}</div></div><div class="post-meta"><b>${p.title}</b><small>${p.author}</small></div></article>`).join('');
}

function startAutoScroll(){
  const feed=document.getElementById('postFeed');
  if(!feed) return;
  if(autoScrollTimer) cancelAnimationFrame(autoScrollTimer);
  let paused=false;
  let lastTime=0;
  const pxPerFrame=0.55;
  const getLoopWidth=()=> feed.scrollWidth/2;
  const tick=(time)=>{
    if(!paused){
      const loopWidth=getLoopWidth();
      if(loopWidth>0){
        if(feed.scrollLeft >= loopWidth) feed.scrollLeft -= loopWidth;
        feed.scrollLeft += pxPerFrame;
      }
    }
    autoScrollTimer=requestAnimationFrame(tick);
  };
  feed.scrollLeft=0;
  autoScrollTimer=requestAnimationFrame(tick);
  ['mouseenter','touchstart','pointerdown','focusin'].forEach(evt=>feed.addEventListener(evt,()=>paused=true,{passive:true}));
  ['mouseleave','touchend','pointerup','focusout'].forEach(evt=>feed.addEventListener(evt,()=>paused=false,{passive:true}));
}
renderPosts();
startAutoScroll();



const anniversaryStories = [
  // 後で実際の20年分の出来事リストをここへ追加。
  // 例: { month: 8, day: 23, yearsAgo: 12, title: 'マーライオン事件' }
];

function renderTodayMemory(){
  const target=document.getElementById('todayMemoryText');
  if(!target) return;

  const now=new Date();
  const month=now.getMonth()+1;
  const day=now.getDate();
  const story=anniversaryStories.find(item=>item.month===month && item.day===day);

  if(story){
    target.textContent=`今日は${story.yearsAgo}年前、${story.title}があった日です。`;
  }else{
    target.textContent='今日は12年前、マーライオン事件があった日です。';
  }
}
renderTodayMemory();

const anniversaryDate=new Date('2027-11-19T00:00:00+09:00');
const diff=Math.max(0,Math.ceil((anniversaryDate-Date.now())/86400000));
document.getElementById('daysLeft').textContent=diff;

const opening=document.getElementById('opening');
const openingIntro=document.getElementById('openingIntro');
const openingPoster=document.getElementById('openingPoster');
const openingLine1=document.getElementById('openingLine1');
const openingLine2=document.getElementById('openingLine2');
const openingLoading=document.getElementById('openingLoading');
const loadingPercent=document.getElementById('loadingPercent');
const appShell=document.getElementById('appShell');

function startOpeningSequence(){
  setTimeout(()=>openingLine1.classList.add('show'),220);
  setTimeout(()=>openingLine2.classList.add('show'),900);
  setTimeout(()=>openingLoading.classList.add('show'),1500);

  const percents=[98,99,100];
  percents.forEach((value,index)=>{
    setTimeout(()=>{ loadingPercent.textContent=value; }, 1500 + index*380);
  });

  setTimeout(()=>{
    openingIntro.classList.add('hide');
    openingPoster.classList.add('show');
    openingPoster.setAttribute('aria-hidden','false');
  }, 1500 + percents.length*380 + 350);
}

const SB_CONFIG=window.HOMES_SUPABASE||{};
const SUPABASE_READY=Boolean(SB_CONFIG.url && SB_CONFIG.publishableKey && window.supabase?.createClient);
const sb=SUPABASE_READY ? window.supabase.createClient(SB_CONFIG.url,SB_CONFIG.publishableKey,{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
}) : null;

function updateProfileFromEmail(email){
  const btn=document.getElementById('profileBtn');
  if(!btn || !email) return;
  const local=email.split('@')[0]||'H';
  const initials=local.replace(/[^a-zA-Z0-9]/g,'').slice(0,2).toUpperCase()||'H';
  btn.querySelector('span').textContent=initials;
  btn.title=email;
}

function showApp(email){
  const authGate=document.getElementById('authGate');
  authGate.classList.remove('show');
  authGate.setAttribute('aria-hidden','true');
  appShell.classList.add('ready');
  updateProfileFromEmail(email);
}

function showAuth(message=''){
  const authGate=document.getElementById('authGate');
  authGate.classList.add('show');
  authGate.setAttribute('aria-hidden','false');
  if(message){
    const help=document.getElementById('authHelp');
    help.textContent=message;
  }
  setTimeout(()=>document.getElementById('authEmail')?.focus(),250);
}

async function resolveSupabaseSession(){
  if(!sb) return null;
  const {data,error}=await sb.auth.getSession();
  if(error) return null;
  const email=data?.session?.user?.email?.toLowerCase()||'';
  if(email && email.endsWith('@homes-edu.com')) return data.session;
  if(data?.session) await sb.auth.signOut();
  return null;
}

async function enterApp(){
  opening.classList.add('hide');
  setTimeout(()=>opening.style.display='none',700);
  if(!SUPABASE_READY){
    showAuth('SupabaseのProject URLとPublishable Keyを設定すると認証を開始できます。');
    return;
  }
  const session=await resolveSupabaseSession();
  if(session) showApp(session.user.email);
  else showAuth();
}

document.getElementById('enterApp').addEventListener('click',enterApp);
document.getElementById('authStartBtn').addEventListener('click',async()=>{
  const email=document.getElementById('authEmail').value.trim().toLowerCase();
  const help=document.getElementById('authHelp');
  const btn=document.getElementById('authStartBtn');
  if(!/^[^\s@]+@homes-edu\.com$/.test(email)){
    help.textContent='@homes-edu.com の会社メールアドレスを入力してください。';
    help.classList.add('error');
    return;
  }
  if(!SUPABASE_READY){
    help.textContent='まだSupabase接続情報が入っていません。supabase-config.js を設定してください。';
    help.classList.add('error');
    return;
  }
  help.classList.remove('error');
  btn.disabled=true;
  btn.textContent='送信中…';
  const redirectTo=window.location.href.split('#')[0].split('?')[0];
  const {error}=await sb.auth.signInWithOtp({
    email,
    options:{emailRedirectTo:redirectTo,shouldCreateUser:true}
  });
  btn.disabled=false;
  btn.textContent='認証メールを送る';
  if(error){
    help.textContent='認証メールを送れませんでした。少し時間をおいてもう一度お試しください。';
    help.classList.add('error');
    return;
  }
  help.textContent='認証メールを送りました。メール内のリンクを開くとログインできます。';
});

if(sb){
  sb.auth.onAuthStateChange((_event,session)=>{
    const email=session?.user?.email?.toLowerCase()||'';
    if(email.endsWith('@homes-edu.com')) showApp(email);
  });
}

startOpeningSequence();

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
}

const dialog=document.getElementById('screenDialog');
const title=document.getElementById('dialogTitle');
const kicker=document.getElementById('dialogKicker');
const body=document.getElementById('dialogBody');
const templates={upload:'uploadTemplate',bike:'bikeTemplate',missions:'missionsTemplate',timeline:'timelineTemplate',survey:'surveyTemplate'};
const labels={upload:['POST YOUR MEMORY','写真・動画を投稿'],bike:['KAWASE PRESIDENT RIDE','川瀬社長自転車の旅'],missions:['20TH ANNIVERSARY QUEST','20周年ミッション'],timeline:['HOMES TIME MACHINE','20年の沿革'],survey:['QUESTIONNAIRE','20周年アンケート']};

function openRoute(route){
  if(route==='home') return;
  const tpl=document.getElementById(templates[route]);
  if(!tpl) return;
  kicker.textContent=labels[route][0]; title.textContent=labels[route][1]; body.innerHTML=''; body.appendChild(tpl.content.cloneNode(true));
  dialog.showModal();
  if(route==='upload') initUpload();
  if(route==='bike') initBike();
}

document.querySelectorAll('[data-route]').forEach(el=>el.addEventListener('click',()=>openRoute(el.dataset.route)));
document.getElementById('closeDialog').addEventListener('click',()=>dialog.close());
document.getElementById('seeAllPosts').addEventListener('click',()=>{});

function readableBytes(bytes){
  if(!Number.isFinite(bytes)) return '';
  const units=['B','KB','MB','GB']; let i=0,n=bytes;
  while(n>=1024&&i<units.length-1){n/=1024;i++;}
  return `${n.toFixed(i?1:0)} ${units[i]}`;
}
function fmtDuration(sec){
  if(!Number.isFinite(sec)) return '--:--';
  const m=Math.floor(sec/60), s=Math.floor(sec%60); return `${m}:${String(s).padStart(2,'0')}`;
}

function initUpload(){
  const input=document.getElementById('videoInput');
  const previewArea=document.getElementById('videoPreviewArea');
  const saveBtn=document.getElementById('saveVideoBtn');
  let selectedFile=null;
  let selectedObjectUrl='';

  input.addEventListener('change',()=>{
    selectedFile=input.files?.[0]||null;
    if(!selectedFile) return;
    if(selectedObjectUrl) URL.revokeObjectURL(selectedObjectUrl);
    selectedObjectUrl=URL.createObjectURL(selectedFile);
    const isImage=selectedFile.type.startsWith('image/');
    const media=isImage
      ? `<img class="upload-image-preview" src="${selectedObjectUrl}" alt="選択した写真">`
      : `<video id="previewVideo" src="${selectedObjectUrl}" controls playsinline></video>`;
    previewArea.innerHTML=`<div class="video-preview">${media}<div class="video-fileinfo"><b>${escapeHtml(selectedFile.name)}</b><br>${readableBytes(selectedFile.size)}</div></div>`;
    if(!isImage){
      const video=document.getElementById('previewVideo');
      video?.addEventListener('loadedmetadata',()=>{
        const info=previewArea.querySelector('.video-fileinfo');
        info.innerHTML=`<b>${escapeHtml(selectedFile.name)}</b><br>${readableBytes(selectedFile.size)} ・ ${fmtDuration(video.duration)} ・ ${video.videoWidth}×${video.videoHeight}px`;
      });
    }
  });

  saveBtn.addEventListener('click',async()=>{
    if(!selectedFile){
      previewArea.insertAdjacentHTML('beforeend','<small class="upload-status error">写真または動画を選択してください。</small>');
      return;
    }
    if(!sb){
      previewArea.insertAdjacentHTML('beforeend','<small class="upload-status error">Supabaseに接続できていません。</small>');
      return;
    }

    const {data:{session}}=await sb.auth.getSession();
    const user=session?.user;
    const email=user?.email?.toLowerCase()||'';
    if(!user || !email.endsWith('@homes-edu.com')){
      previewArea.insertAdjacentHTML('beforeend','<small class="upload-status error">ログイン情報を確認できません。再度ログインしてください。</small>');
      return;
    }

    const t=document.getElementById('videoTitle').value.trim()||(selectedFile.type.startsWith('image/')?'無題の写真':'無題の動画');
    const a=document.getElementById('videoAuthor').value.trim()||email.split('@')[0];
    const campus=document.getElementById('videoCampus').value.trim();
    const category=document.getElementById('videoCategory').value;
    const finalCandidate=document.getElementById('movieCandidate').checked;

    saveBtn.disabled=true;
    saveBtn.textContent='Supabaseに保存中…';
    previewArea.querySelectorAll('.upload-status').forEach(el=>el.remove());

    const {error}=await sb.from('anniversary_posts').insert({
      user_id:user.id,
      email,
      title:t,
      author_name:a,
      campus,
      category,
      drive_file_id:null,
      preview_url:null,
      is_public:false,
      final_movie_candidate:finalCandidate
    });

    saveBtn.disabled=false;
    saveBtn.textContent='投稿する';

    if(error){
      console.error(error);
      previewArea.insertAdjacentHTML('beforeend',`<small class="upload-status error">保存できませんでした：${escapeHtml(error.message)}</small>`);
      return;
    }

    posts.unshift({title:t,author:a,icon:selectedFile.type.startsWith('image/')?'camera':'video',alt:true,tag:'NEW'});
    renderPosts();
    startAutoScroll();
    previewArea.insertAdjacentHTML('beforeend','<small class="upload-status success">Supabaseに投稿情報を保存しました。原本のGoogle Drive保存は次の接続で追加します。</small>');
    setTimeout(()=>dialog.close(),900);
  });
}


const RIDE_STORAGE_KEY='homes20RideState';
const RIDE_DEFAULT_STATE={
  current:'神戸校',
  visited:{
    '岐阜本部校':'09:00',
    '岐南校':'10:05',
    '神戸校':'12:18'
  }
};
let rideChannel=null;
try{ rideChannel=new BroadcastChannel('homes20-ride'); }catch(e){}

function getRideState(){
  try{
    const raw=localStorage.getItem(RIDE_STORAGE_KEY);
    return raw?JSON.parse(raw):RIDE_DEFAULT_STATE;
  }catch(e){ return RIDE_DEFAULT_STATE; }
}

function applyRideState(){
  if(!body) return;
  const state=getRideState();
  const pins=[...body.querySelectorAll('.map-pin[data-campus]')];
  const stops=[...body.querySelectorAll('.route-stop[data-campus]')];
  pins.forEach(pin=>{
    const campus=pin.dataset.campus;
    pin.classList.toggle('visited',Boolean(state.visited?.[campus]));
    pin.classList.toggle('current',state.current===campus);
  });
  stops.forEach(stop=>{
    const campus=stop.dataset.campus;
    const visited=state.visited?.[campus];
    stop.classList.toggle('done',Boolean(visited));
    stop.classList.toggle('current',state.current===campus);
    const time=stop.querySelector('span');
    if(time){
      if(state.current===campus) time.textContent='NOW';
      else if(visited) time.textContent=visited;
      else time.textContent=stop.classList.contains('day2-stop')?'DAY 2':'DAY 1';
    }
  });
  const count=body.querySelector('#visitedCount');
  if(count) count.textContent=Object.keys(state.visited||{}).length;
}

function initBike(){
  const tabs=[...body.querySelectorAll('.bike-day-tab')];
  const pins=[...body.querySelectorAll('.map-pin')];
  const day1Route=body.querySelector('.route-day1');
  const day2Route=body.querySelector('.route-day2');
  const day2Stops=[...body.querySelectorAll('.day2-stop')];
  tabs.forEach(tab=>tab.addEventListener('click',()=>{
    const day=tab.dataset.day;
    tabs.forEach(t=>t.classList.toggle('active',t===tab));
    pins.forEach(pin=>pin.classList.toggle('map-hidden', day!=='all' && pin.dataset.day!==day));
    if(day1Route) day1Route.classList.toggle('map-hidden', day==='2');
    if(day2Route) day2Route.classList.toggle('map-hidden', day==='1');
    day2Stops.forEach(stop=>stop.style.display=(day==='1'?'none':'flex'));
  }));
  applyRideState();
}

window.addEventListener('storage',e=>{
  if(e.key===RIDE_STORAGE_KEY && dialog?.open) applyRideState();
});
if(rideChannel){ rideChannel.addEventListener('message',()=>{ if(dialog?.open) applyRideState(); }); }
