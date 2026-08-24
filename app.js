const HOMES_BUILD='5.1';
let posts = [
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
const APP_CONFIG=window.HOMES_APP_CONFIG||{};
const SUPABASE_READY=Boolean(SB_CONFIG.url && SB_CONFIG.publishableKey && window.supabase?.createClient);
const sb=SUPABASE_READY ? window.supabase.createClient(SB_CONFIG.url,SB_CONFIG.publishableKey) : null;

async function loadSupabasePosts(){
  if(!sb) return;
  const {data,error}=await sb.from('anniversary_posts')
    .select('id,title,author_name,campus,category,preview_url,created_at')
    .order('created_at',{ascending:false})
    .limit(20);
  if(error){ console.warn('投稿一覧の取得に失敗',error); return; }
  if(!data?.length) return;
  const remote=data.map(row=>({
    id:row.id,
    title:row.title||'無題',
    author:row.author_name||row.campus||'HOMES',
    icon:'video',
    alt:false,
    image:row.preview_url||null,
    tag:'NEW'
  }));
  const remoteIds=new Set(remote.map(x=>x.id));
  posts=[...remote,...posts.filter(x=>!x.id||!remoteIds.has(x.id))];
  renderPosts();
  startAutoScroll();
}

function drawCover(ctx,source,sw,sh,dw=640,dh=420){
  const scale=Math.max(dw/sw,dh/sh);
  const rw=sw*scale, rh=sh*scale;
  const dx=(dw-rw)/2, dy=(dh-rh)/2;
  ctx.clearRect(0,0,dw,dh);
  ctx.drawImage(source,dx,dy,rw,rh);
}

function canvasToJpeg(canvas,quality=.82){
  return new Promise((resolve,reject)=>canvas.toBlob(
    blob=>blob?resolve(blob):reject(new Error('サムネイルを作成できませんでした')),
    'image/jpeg',quality
  ));
}

async function makeImageThumbnail(file){
  const url=URL.createObjectURL(file);
  try{
    const img=new Image();
    img.decoding='async';
    img.src=url;
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('画像を読み込めませんでした'));});
    const canvas=document.createElement('canvas');
    canvas.width=640; canvas.height=420;
    const ctx=canvas.getContext('2d');
    drawCover(ctx,img,img.naturalWidth,img.naturalHeight);
    return await canvasToJpeg(canvas);
  }finally{ URL.revokeObjectURL(url); }
}

async function makeVideoThumbnail(file){
  const url=URL.createObjectURL(file);
  try{
    const video=document.createElement('video');
    video.preload='metadata';
    video.muted=true;
    video.playsInline=true;
    video.src=url;
    await new Promise((resolve,reject)=>{
      video.onloadedmetadata=resolve;
      video.onerror=()=>reject(new Error('動画を読み込めませんでした'));
      video.load();
    });
    const target=Math.min(Math.max((Number(video.duration)||1)*0.15,0.1),2);
    await new Promise((resolve,reject)=>{
      const done=()=>{video.removeEventListener('seeked',done);resolve();};
      video.addEventListener('seeked',done,{once:true});
      video.onerror=()=>reject(new Error('動画フレームを取得できませんでした'));
      try{ video.currentTime=target; }catch(_e){ resolve(); }
    });
    const canvas=document.createElement('canvas');
    canvas.width=640; canvas.height=420;
    const ctx=canvas.getContext('2d');
    drawCover(ctx,video,video.videoWidth||640,video.videoHeight||420);
    return await canvasToJpeg(canvas);
  }finally{ URL.revokeObjectURL(url); }
}


function safeFilePart(value){
  return String(value||'')
    .normalize('NFKC')
    .replace(/[\\/:*?\"<>|#%{}~]/g,'_')
    .replace(/\s+/g,'_')
    .replace(/_+/g,'_')
    .replace(/^_+|_+$/g,'')
    .slice(0,60);
}

function buildDriveFileName(file,author,title){
  const now=new Date();
  const pad=n=>String(n).padStart(2,'0');
  const stamp=`${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const ext=(file.name.match(/\.[^.]+$/)||[''])[0].slice(0,12);
  const base=[stamp,safeFilePart(author),safeFilePart(title)].filter(Boolean).join('_');
  return `${base||stamp}${ext}`;
}

function uploadFileToResumableUrl(uploadUrl,file,onProgress){
  return new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest();
    xhr.open('PUT',uploadUrl,true);
    xhr.setRequestHeader('Content-Type',file.type||'application/octet-stream');
    xhr.upload.onprogress=(e)=>{
      if(e.lengthComputable && onProgress) onProgress(Math.round(e.loaded/e.total*100));
    };
    xhr.onerror=()=>reject(new Error('Google Driveへの通信に失敗しました。'));
    xhr.onload=()=>{
      if(xhr.status>=200 && xhr.status<300){
        try{ resolve(JSON.parse(xhr.responseText||'{}')); }
        catch(_e){ resolve({}); }
      }else{
        reject(new Error(`Google Driveへの保存に失敗しました（${xhr.status}）`));
      }
    };
    xhr.send(file);
  });
}

async function uploadOriginalToDrive(file,author,title,onProgress){
  if(!sb) throw new Error('Supabaseに接続できていません。');
  const kind=file.type.startsWith('image/')?'image':'video';
  const fileName=buildDriveFileName(file,author,title);
  const {data,error}=await sb.functions.invoke('drive-init-upload',{
    body:{fileName,mimeType:file.type||'application/octet-stream',size:file.size,kind}
  });
  if(error) throw new Error(error.message||'Google Driveのアップロード準備に失敗しました。');
  if(data?.error) throw new Error(data.error);
  if(!data?.uploadUrl) throw new Error('Google DriveのアップロードURLを取得できませんでした。');
  const result=await uploadFileToResumableUrl(data.uploadUrl,file,onProgress);
  return {
    id:result?.id||null,
    name:result?.name||fileName,
    webViewLink:result?.webViewLink||null,
    size:Number(result?.size||file.size),
    mimeType:result?.mimeType||file.type||null
  };
}

async function createAndUploadPreview(file){
  if(!sb) return null;
  const blob=file.type.startsWith('image/') ? await makeImageThumbnail(file) : await makeVideoThumbnail(file);
  const key=`previews/${Date.now()}-${crypto.randomUUID?.()||Math.random().toString(36).slice(2)}.jpg`;
  const {error}=await sb.storage.from('anniversary-previews').upload(key,blob,{contentType:'image/jpeg',upsert:false,cacheControl:'31536000'});
  if(error) throw error;
  const {data}=sb.storage.from('anniversary-previews').getPublicUrl(key);
  return data?.publicUrl||null;
}

loadSupabasePosts();
const STAFF_LOGIN_KEY='homes20StaffLogin';
const STAFF_CODE=String(APP_CONFIG.staffCode||'2027');
const LOGIN_DAYS=Number(APP_CONFIG.loginDays||180);
let currentStaff=null;

function initialsFromName(name){
  const clean=String(name||'H').trim();
  if(!clean) return 'H';
  const latin=clean.replace(/[^a-zA-Z0-9]/g,'');
  return (latin ? latin.slice(0,2) : clean.slice(0,2)).toUpperCase();
}

function updateProfile(name){
  const btn=document.getElementById('profileBtn');
  if(!btn || !name) return;
  btn.querySelector('span').textContent=initialsFromName(name);
  btn.title=`${name}さん`;
}

function saveStaffLogin(name){
  const expiresAt=Date.now()+LOGIN_DAYS*86400000;
  const data={name:String(name).trim(),expiresAt};
  localStorage.setItem(STAFF_LOGIN_KEY,JSON.stringify(data));
  currentStaff=data;
  return data;
}

function loadStaffLogin(){
  try{
    const data=JSON.parse(localStorage.getItem(STAFF_LOGIN_KEY)||'null');
    if(!data?.name || !data?.expiresAt || Date.now()>data.expiresAt){
      localStorage.removeItem(STAFF_LOGIN_KEY);
      return null;
    }
    currentStaff=data;
    return data;
  }catch(_e){
    localStorage.removeItem(STAFF_LOGIN_KEY);
    return null;
  }
}

function showApp(name){
  const authGate=document.getElementById('authGate');
  authGate.classList.remove('show');
  authGate.setAttribute('aria-hidden','true');
  appShell.classList.add('ready');
  updateProfile(name);
}

function showAuth(message=''){
  const authGate=document.getElementById('authGate');
  authGate.classList.add('show');
  authGate.setAttribute('aria-hidden','false');
  const help=document.getElementById('authHelp');
  help.classList.remove('error');
  if(message) help.textContent=message;
  setTimeout(()=>document.getElementById('authName')?.focus(),250);
}

function enterApp(){
  opening.classList.add('hide');
  setTimeout(()=>opening.style.display='none',700);
  const login=loadStaffLogin();
  if(login) showApp(login.name);
  else showAuth();
}

document.getElementById('enterApp').addEventListener('click',enterApp);
document.getElementById('authStartBtn').addEventListener('click',()=>{
  const name=document.getElementById('authName').value.trim();
  const code=document.getElementById('authCode').value.trim();
  const help=document.getElementById('authHelp');
  if(!name){
    help.textContent='お名前を入力してください。';
    help.classList.add('error');
    return;
  }
  if(code!==STAFF_CODE){
    help.textContent='社員コードが違います。社内で共有されたコードを確認してください。';
    help.classList.add('error');
    return;
  }
  help.classList.remove('error');
  const login=saveStaffLogin(name);
  showApp(login.name);
});

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
  const loginForForm=currentStaff||loadStaffLogin();
  const postingAs=document.getElementById('postingAs');
  if(postingAs && loginForForm?.name){
    postingAs.innerHTML=`<span>投稿者</span><b>${escapeHtml(loginForForm.name)}</b><small>ログイン時のお名前を自動で使います</small>`;
  }

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
        const portrait=video.videoHeight>video.videoWidth;
        info.innerHTML=`<b>${escapeHtml(selectedFile.name)}</b><br>${readableBytes(selectedFile.size)} ・ ${fmtDuration(video.duration)} ・ ${video.videoWidth}×${video.videoHeight}px${portrait?'<div class="orientation-warning">この動画は縦向きです。投稿はできますが、次回は横向き撮影がおすすめです。</div>':''}`;
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

    const login=currentStaff||loadStaffLogin();
    if(!login?.name){
      previewArea.insertAdjacentHTML('beforeend','<small class="upload-status error">社員ログインを確認できません。トップ画面から入り直してください。</small>');
      return;
    }

    const t=document.getElementById('videoTitle').value.trim()||(selectedFile.type.startsWith('image/')?'無題の写真':'無題の動画');
    const a=login.name;
    const campus=document.getElementById('videoCampus').value.trim();
    const category=document.getElementById('videoCategory').value;
    const finalCandidate=document.getElementById('movieCandidate').checked;

    saveBtn.disabled=true;
    saveBtn.textContent='サムネイルを作成中…';
    previewArea.querySelectorAll('.upload-status').forEach(el=>el.remove());

    let previewUrl=null;
    try{
      previewUrl=await createAndUploadPreview(selectedFile);
    }catch(previewError){
      console.warn('サムネイル作成/保存に失敗',previewError);
    }

    let driveFile=null;
    try{
      saveBtn.textContent='原本をGoogle Driveへ保存中…';
      driveFile=await uploadOriginalToDrive(selectedFile,a,t,(percent)=>{
        saveBtn.textContent=`原本をGoogle Driveへ保存中… ${percent}%`;
      });
    }catch(driveError){
      console.error(driveError);
      saveBtn.disabled=false;
      saveBtn.textContent='投稿する';
      previewArea.insertAdjacentHTML('beforeend',`<small class="upload-status error">原本をGoogle Driveへ保存できなかったため、投稿を中止しました：${escapeHtml(driveError.message)}</small>`);
      return;
    }

    saveBtn.textContent='投稿情報を保存中…';
    const {data:inserted,error}=await sb.from('anniversary_posts').insert({
      user_id:null,
      email:null,
      title:t,
      author_name:a,
      campus,
      category,
      drive_file_id:driveFile?.id||null,
      drive_web_view_url:driveFile?.webViewLink||null,
      original_file_name:driveFile?.name||selectedFile.name,
      original_mime_type:driveFile?.mimeType||selectedFile.type||null,
      original_size:driveFile?.size||selectedFile.size,
      preview_url:previewUrl,
      is_public:false,
      final_movie_candidate:finalCandidate
    }).select('id').single();

    saveBtn.disabled=false;
    saveBtn.textContent='投稿する';

    if(error){
      console.error(error);
      previewArea.insertAdjacentHTML('beforeend',`<small class="upload-status error">原本はGoogle Driveに保存されましたが、投稿情報の保存に失敗しました：${escapeHtml(error.message)}</small>`);
      return;
    }

    posts.unshift({id:inserted?.id,title:t,author:a,icon:selectedFile.type.startsWith('image/')?'camera':'video',alt:true,image:previewUrl,tag:'NEW'});
    renderPosts();
    startAutoScroll();
    previewArea.insertAdjacentHTML('beforeend',`<small class="upload-status success">投稿できました。原本は会社Google Driveに保存されています。</small>`);
    setTimeout(()=>dialog.close(),1200);
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
