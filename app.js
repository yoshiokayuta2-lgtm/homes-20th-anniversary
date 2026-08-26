const DRIVE_INIT_FUNCTION = `${window.HOMES_SUPABASE?.url || ''}/functions/v1/drive-init-upload`;

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
let autoScrollResumeTimer=null;
let currentStaff=null;
let postLikes=new Map();
let likedPostIds=new Set();

function likeCount(postId){return Number(postLikes.get(String(postId))||0);}
function likeButtonHtml(post){
  if(!post?.id) return '';
  const on=likedPostIds.has(String(post.id));
  return `<button type="button" class="post-like-btn ${on?'liked':''}" data-like-post="${escapeHtml(post.id)}" aria-label="${on?'いいねを取り消す':'いいねする'}"><span>${on?'♥':'♡'}</span><b>${likeCount(post.id)}</b></button>`;
}
async function loadPostLikes(){
  if(!sb) return;
  const {data,error}=await sb.from('anniversary_post_likes').select('post_id,staff_name').limit(50000);
  if(error){console.warn('いいね取得失敗',error);return;}
  const counts=new Map(), mine=new Set();
  const me=(currentStaff||loadStaffLogin())?.name||'';
  for(const row of (data||[])){const id=String(row.post_id||'');if(!id)continue;counts.set(id,(counts.get(id)||0)+1);if(me&&row.staff_name===me)mine.add(id);}
  const feed=document.getElementById('postFeed');
  const previousScroll=feed?.scrollLeft||0;
  postLikes=counts;likedPostIds=mine;renderPosts();startAutoScroll(previousScroll);
}
async function togglePostLike(postId){
  if(!sb||!postId)return;
  const login=currentStaff||loadStaffLogin();
  if(!login?.name){showAuth('いいねするにはログインしてください。');return;}
  const id=String(postId),on=likedPostIds.has(id);
  if(on){
    const {error}=await sb.from('anniversary_post_likes').delete().eq('post_id',id).eq('staff_name',login.name);
    if(error){console.warn(error);return;} likedPostIds.delete(id);postLikes.set(id,Math.max(0,likeCount(id)-1));
  }else{
    const {error}=await sb.from('anniversary_post_likes').insert({post_id:id,staff_name:login.name});
    if(error&&error.code!=='23505'){console.warn(error);return;} likedPostIds.add(id);postLikes.set(id,likeCount(id)+1);
  }
  // いいね操作ではフィード全体を描き直さない。
  // 描き直すと横スクロール位置が0へ戻るため、該当ボタンだけ更新する。
  document.querySelectorAll(`[data-like-post="${CSS.escape(id)}"]`).forEach(btn=>{
    const liked=likedPostIds.has(id);
    btn.classList.toggle('liked',liked);
    btn.setAttribute('aria-label',liked?'いいねを取り消す':'いいねする');
    const heart=btn.querySelector('span'); if(heart) heart.textContent=liked?'♥':'♡';
    const count=btn.querySelector('b'); if(count) count.textContent=likeCount(id);
  });
  const detail=document.querySelector(`[data-detail-like="${CSS.escape(id)}"]`);if(detail){const liked=likedPostIds.has(id);detail.classList.toggle('liked',liked);detail.querySelector('span').textContent=liked?'♥':'♡';detail.querySelector('b').textContent=likeCount(id);}
}
function renderPosts(){
  const feed=document.getElementById('postFeed');
  const loopPosts=[...posts, ...posts];
  feed.innerHTML=loopPosts.map((p,i)=>`<article class="post-card ${p.image?'photo-card':''}" data-post-index="${i%posts.length}" ${i>=posts.length?'aria-hidden="true"':''} tabindex="0" role="button"><div class="post-thumb ${p.alt?'alt':''}">${p.image?`<img src="${p.image}" alt="${escapeHtml(p.title)}"><div class="post-overlay"></div><div class="post-chip">${escapeHtml(p.tag||'HOMES')}</div>`:lineIcon(p.icon)}<div class="post-play">${lineIcon('play')}</div></div><div class="post-meta"><div class="post-meta-copy"><b>${escapeHtml(p.title)}</b><small>${escapeHtml(p.author)}</small></div>${likeButtonHtml(p)}</div></article>`).join('');
  feed.querySelectorAll('[data-like-post]').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();e.preventDefault();togglePostLike(btn.dataset.likePost);}));
  feed.querySelectorAll('.post-card').forEach(card=>{
    const open=()=>openPostDetail(posts[Number(card.dataset.postIndex)]);
    card.addEventListener('click',open);
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
  });
}

function startAutoScroll(initialPosition=null){
  const feed=document.getElementById('postFeed');
  if(!feed) return;
  if(autoScrollTimer) cancelAnimationFrame(autoScrollTimer);
  if(autoScrollResumeTimer) clearTimeout(autoScrollResumeTimer);
  if(feed._autoScrollCleanup) feed._autoScrollCleanup();

  let paused=false;
  let lastTime=0;
  let position=feed.scrollLeft || 0;
  const pxPerSecond=34;
  const getLoopWidth=()=> feed.scrollWidth/2;

  const pause=()=>{
    paused=true;
    if(autoScrollResumeTimer) clearTimeout(autoScrollResumeTimer);
  };
  const resumeSoon=(delay=1600)=>{
    if(autoScrollResumeTimer) clearTimeout(autoScrollResumeTimer);
    autoScrollResumeTimer=setTimeout(()=>{
      position=feed.scrollLeft || position;
      paused=false;
      lastTime=performance.now();
    },delay);
  };

  const tick=(time)=>{
    if(!lastTime) lastTime=time;
    const dt=Math.min(50,time-lastTime);
    lastTime=time;
    if(!paused && !document.hidden){
      const loopWidth=getLoopWidth();
      if(loopWidth>0){
        position += pxPerSecond*(dt/1000);
        if(position >= loopWidth) position -= loopWidth;
        feed.scrollLeft=position;
      }
    }
    autoScrollTimer=requestAnimationFrame(tick);
  };

  // iPhone Safariでは touch と pointer が二重発火しやすいため pointer 系だけを使う。
  // フォーカスだけでは停止させない（タップ後にフォーカスが残って永久停止するのを防ぐ）。
  const onPointerDown=()=>pause();
  const onPointerUp=()=>resumeSoon();
  const onPointerCancel=()=>resumeSoon(500);
  const onMouseEnter=()=>{ if(window.matchMedia('(hover:hover)').matches) pause(); };
  const onMouseLeave=()=>{ if(window.matchMedia('(hover:hover)').matches) resumeSoon(400); };
  const onVisibility=()=>{
    if(document.hidden){ pause(); }
    else { position=feed.scrollLeft || position; paused=false; lastTime=performance.now(); }
  };

  feed.addEventListener('pointerdown',onPointerDown,{passive:true});
  feed.addEventListener('pointerup',onPointerUp,{passive:true});
  feed.addEventListener('pointercancel',onPointerCancel,{passive:true});
  feed.addEventListener('mouseenter',onMouseEnter,{passive:true});
  feed.addEventListener('mouseleave',onMouseLeave,{passive:true});
  document.addEventListener('visibilitychange',onVisibility);

  feed._autoScrollCleanup=()=>{
    feed.removeEventListener('pointerdown',onPointerDown);
    feed.removeEventListener('pointerup',onPointerUp);
    feed.removeEventListener('pointercancel',onPointerCancel);
    feed.removeEventListener('mouseenter',onMouseEnter);
    feed.removeEventListener('mouseleave',onMouseLeave);
    document.removeEventListener('visibilitychange',onVisibility);
  };

  if(initialPosition!==null && Number.isFinite(Number(initialPosition))){
    position=Number(initialPosition);
    feed.scrollLeft=position;
  }else{
    position=feed.scrollLeft||0;
  }
  autoScrollTimer=requestAnimationFrame(tick);
}

function isVideoPost(post){
  if(post?.isVideo) return true;
  const name=String(post?.originalFilename||'').toLowerCase();
  return /\.(mp4|mov|m4v|webm)$/i.test(name) || post?.icon==='video';
}

function closePostDetail(){
  const modal=document.getElementById('postDetailModal');
  if(!modal) return;
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden','true');
  document.body.classList.remove('modal-open');
  const media=document.getElementById('postDetailMedia');
  if(media) media.innerHTML='';
}

function openPostDetail(post){
  if(!post) return;
  const modal=document.getElementById('postDetailModal');
  const media=document.getElementById('postDetailMedia');
  const title=document.getElementById('postDetailTitle');
  const meta=document.getElementById('postDetailMeta');
  const extra=document.getElementById('postDetailExtra');
  if(!modal||!media||!title||!meta||!extra) return;
  const video=isVideoPost(post);
  if(video && post.driveFileId){
    const streamUrl=`${DRIVE_INIT_FUNCTION}?file_id=${encodeURIComponent(post.driveFileId)}`;
    media.innerHTML=`<video class="post-detail-video-player" src="${streamUrl}" controls playsinline preload="metadata" poster="${post.image||''}" title="${escapeHtml(post.title)}"></video>`;
  }else if(post.image){
    media.innerHTML=`<img class="post-detail-image" src="${post.image}" alt="${escapeHtml(post.title)}">`;
  }else{
    media.innerHTML=`<div class="post-detail-placeholder">${lineIcon(video?'video':'camera')}</div>`;
  }
  title.textContent=post.title||'無題';
  const bits=[post.author,post.campus,post.category].filter(Boolean);
  meta.textContent=bits.join(' ・ ')||'HOMES';
  extra.innerHTML=post.id?`<button type="button" class="post-detail-like ${likedPostIds.has(String(post.id))?'liked':''}" data-detail-like="${escapeHtml(post.id)}"><span>${likedPostIds.has(String(post.id))?'♥':'♡'}</span><b>${likeCount(post.id)}</b><em>いいね</em></button>`:'';
  extra.querySelector?.('[data-detail-like]')?.addEventListener('click',()=>togglePostLike(post.id));
  if(video && post.driveWebViewUrl){
    extra.insertAdjacentHTML('beforeend',`<a class="post-detail-drive" href="${post.driveWebViewUrl}" target="_blank" rel="noopener">Google Driveで原本を開く <span>→</span></a>`);
  }else if(post.driveWebViewUrl){
    extra.insertAdjacentHTML('beforeend',`<a class="post-detail-drive" href="${post.driveWebViewUrl}" target="_blank" rel="noopener">原本を見る <span>→</span></a>`);
  }
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
  document.body.classList.add('modal-open');
}
renderPosts();
startAutoScroll();
document.addEventListener('click',e=>{
  if(e.target?.matches?.('[data-close-post-detail]')) closePostDetail();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape') closePostDetail();});



const historyDays=Array.isArray(window.HOMES_HISTORY)?window.HOMES_HISTORY:[];
let remoteTodayEvents=[];

function japanTodayParts(date=new Date()){
  const parts=new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(date);
  const value=type=>Number(parts.find(p=>p.type===type)?.value||0);
  return {year:value('year'),month:value('month'),day:value('day')};
}
function localDateKey(parts=japanTodayParts()){
  return `${parts.year}-${String(parts.month).padStart(2,'0')}-${String(parts.day).padStart(2,'0')}`;
}
function staticHistoryFor(month,day){
  return historyDays.find(item=>Number(item.month)===Number(month)&&Number(item.day)===Number(day))||null;
}
function allTodayEvents(){
  const now=japanTodayParts();
  const staticDay=staticHistoryFor(now.month,now.day);
  const staticEvents=(staticDay?.events||[]).map(e=>({...e,source:'archive'}));
  return [...staticEvents,...remoteTodayEvents];
}
function representativeTodayEvent(){
  const now=japanTodayParts();
  const staticDay=staticHistoryFor(now.month,now.day);
  if(staticDay?.representative) return {...staticDay.representative,source:'archive'};
  return remoteTodayEvents[0]||null;
}
function renderTodayMemory(){
  const target=document.getElementById('todayMemoryText');
  const box=document.getElementById('todayMemory');
  if(!target) return;
  const now=japanTodayParts();
  const events=allTodayEvents();
  const representative=representativeTodayEvent();
  if(representative){
    const years=Number(representative.year)?Math.max(0,now.year-Number(representative.year)):null;
    target.textContent=years!==null?`今日は${years}年前、${representative.title}があった日です。`:`今日は、${representative.title}があった日です。`;
    if(events.length>1) target.textContent+=`（ほか${events.length-1}件）`;
    box?.classList.add('has-memory');
  }else{
    target.textContent='今日はまだHOMESの「何の日」が登録されていません。';
    box?.classList.remove('has-memory');
  }
}
async function refreshRemoteTodayEvents(){
  if(!sb) return;
  const now=japanTodayParts();
  const {data,error}=await sb.from('anniversary_today_events')
    .select('id,month,day,event_year,title,note,author_name,created_at')
    .eq('month',now.month).eq('day',now.day).order('event_year',{ascending:true});
  if(error){
    // v5.8用テーブル未作成時も一般画面は静的沿革で動かす。
    console.warn('追加の「今日は何の日」取得をスキップ',error);
    return;
  }
  remoteTodayEvents=(data||[]).map(row=>({
    id:row.id,year:row.event_year,title:row.title,note:row.note||'',category:'KENJI追加',authorName:row.author_name||'',source:'kenji'
  }));
  renderTodayMemory();
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
refreshRemoteTodayEvents();

async function loadSupabasePosts(){
  if(!sb) return;
  const {data,error}=await sb.from('anniversary_posts')
    .select('id,title,author_name,campus,category,preview_url,created_at,drive_file_id,drive_web_view_url,original_file_name,original_filename')
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
    tag:'NEW',
    campus:row.campus||'',
    category:row.category||'',
    driveFileId:row.drive_file_id||'',
    driveWebViewUrl:row.drive_web_view_url||'',
    originalFilename:row.original_file_name||row.original_filename||'',
    isVideo:/\.(mp4|mov|m4v|webm)$/i.test(row.original_file_name||row.original_filename||'')
  }));
  const remoteIds=new Set(remote.map(x=>x.id));
  posts=[...remote,...posts.filter(x=>!x.id||!remoteIds.has(x.id))];
  renderPosts();
  startAutoScroll();
  loadPostLikes();
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

const BONUS_DEVICE_KEY='homes20BonusDeviceId';
function getBonusDeviceId(){
  let id=localStorage.getItem(BONUS_DEVICE_KEY);
  if(!id){ id=crypto.randomUUID?.()||`device-${Date.now()}-${Math.random().toString(36).slice(2)}`; localStorage.setItem(BONUS_DEVICE_KEY,id); }
  return id;
}
function calcLoginStreak(dateStrings){
  const set=new Set(dateStrings);
  let cursor=japanTodayParts();
  let streak=0;
  for(let i=0;i<4000;i++){
    const key=localDateKey(cursor);
    if(!set.has(key)) break;
    streak++;
    const d=new Date(Date.UTC(cursor.year,cursor.month-1,cursor.day)-86400000);
    cursor={year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate()};
  }
  return streak;
}
function showLoginBonusToast(days,streak){
  const toast=document.getElementById('loginBonusToast');
  const text=document.getElementById('loginBonusToastText');
  if(!toast||!text) return;
  text.textContent=`累計${days}日・連続${streak}日`;
  toast.classList.add('show'); toast.setAttribute('aria-hidden','false');
  clearTimeout(showLoginBonusToast.t);
  showLoginBonusToast.t=setTimeout(()=>{toast.classList.remove('show');toast.setAttribute('aria-hidden','true');},2800);
}
async function recordLoginBonus(name){
  const msg=document.getElementById('loginBonusMessage');
  const daysEl=document.getElementById('loginBonusDays');
  const streakEl=document.getElementById('loginBonusStreak');
  const postsEl=document.getElementById('loginBonusPosts');
  if(!sb||!name){ if(msg) msg.textContent='ログインボーナス準備中'; return; }
  const today=localDateKey();
  let isNew=false;
  const {data:existing,error:findError}=await sb.from('anniversary_login_days').select('id').eq('staff_name',name).eq('login_date',today).limit(1);
  if(findError){
    console.warn('ログインボーナスはSQL設定後に有効になります',findError);
    if(msg) msg.textContent='ログインボーナスは初期設定後にスタート';
    return;
  }
  if(!existing?.length){
    const {error:insertError}=await sb.from('anniversary_login_days').insert({staff_name:name,login_date:today,device_id:getBonusDeviceId()});
    if(!insertError) isNew=true; else console.warn('ログイン記録に失敗',insertError);
  }
  const [{data:loginRows,error:loginError},{count:postCount,error:postError}]=await Promise.all([
    sb.from('anniversary_login_days').select('login_date').eq('staff_name',name).order('login_date',{ascending:true}),
    sb.from('anniversary_posts').select('id',{count:'exact',head:true}).eq('author_name',name)
  ]);
  if(loginError){console.warn(loginError);return;}
  const dates=[...new Set((loginRows||[]).map(r=>r.login_date))];
  const days=dates.length;
  const streak=calcLoginStreak(dates);
  if(daysEl) daysEl.textContent=days;
  if(streakEl) streakEl.textContent=streak;
  if(postsEl) postsEl.textContent=postError?'--':(postCount||0);
  if(msg) msg.textContent=isNew?'今日のログインボーナス GET！':'今日のログインは記録済み';
  if(isNew) showLoginBonusToast(days,streak);
}


// v5.14 - activity measurement for awards/admin dashboard
async function trackActivity(eventType, metadata={}){
  const login=currentStaff||loadStaffLogin?.();
  const name=login?.name;
  if(!sb||!name||!eventType) return;
  try{
    await sb.from('anniversary_activity_events').insert({
      staff_name:name,
      event_type:eventType,
      event_date:localDateKey(),
      device_id:getBonusDeviceId(),
      metadata:metadata||{}
    });
  }catch(e){ console.warn('activity tracking skipped',eventType,e); }
}
let sessionOpenTracked=false;
function trackAppOpen(name){
  if(sessionOpenTracked) return;
  sessionOpenTracked=true;
  const standalone=isStandaloneApp?.()||false;
  trackActivity('app_open',{standalone,userAgent:navigator.userAgent.slice(0,180)});
  if(standalone) trackActivity('standalone_open',{});
}
const announcementDialog=document.getElementById('announcementDialog');
const announcementDetailDialog=document.getElementById('announcementDetailDialog');
let activeAnnouncements=[];
let openedAnnouncement=null;
let announcementPollTimer=null;
let announcementRealtimeChannel=null;
function announcementReadKey(id){return 'homes20AnnouncementRead:'+id;}
function isAnnouncementRead(id){return localStorage.getItem(announcementReadKey(id))==='1';}
function markAnnouncementRead(id){if(id)localStorage.setItem(announcementReadKey(id),'1');}
function syncAnnouncementUnreadDot(){
  const dot=document.getElementById('announcementUnreadDot');
  if(!dot)return;
  dot.hidden=!activeAnnouncements.some(a=>!isAnnouncementRead(a.id));
}
async function fetchActiveAnnouncements(){
  const edge=(window.HOMES_SUPABASE?.url||'').replace(/\/$/,'')+'/functions/v1/drive-init-upload';
  if(!window.HOMES_SUPABASE?.url) return [];
  const res=await fetch(edge,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'public-announcements'}),cache:'no-store'});
  const out=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(out.error||`HTTP ${res.status}`);
  return Array.isArray(out.announcements)?out.announcements:[];
}
function announcementDate(a){
  return a?.created_at?new Date(a.created_at).toLocaleDateString('ja-JP',{year:'numeric',month:'long',day:'numeric'}):'';
}
function renderAnnouncementHistory(){
  const list=document.getElementById('announcementHistoryList');
  if(!list)return;
  if(!activeAnnouncements.length){list.innerHTML='<div class="announcement-history-empty">現在公開中のお知らせはありません。</div>';return;}
  list.innerHTML=activeAnnouncements.map(a=>{
    const unread=!isAnnouncementRead(a.id);
    const body=String(a.body||'').trim();
    const excerpt=body.length>58?body.slice(0,58)+'…':body;
    return `<button class="announcement-history-item ${unread?'is-unread':''}" data-announcement-id="${escapeHtml(String(a.id||''))}"><div class="announcement-history-head"><b>${escapeHtml(a.title||'お知らせ')}</b>${unread?'<em>NEW</em>':''}</div>${excerpt?`<p>${escapeHtml(excerpt)}</p>`:''}<small>${escapeHtml(announcementDate(a))}</small></button>`;
  }).join('');
  list.querySelectorAll('[data-announcement-id]').forEach(btn=>btn.addEventListener('click',()=>{
    const a=activeAnnouncements.find(x=>String(x.id)===String(btn.dataset.announcementId));
    if(a) openAnnouncementDetail(a,{fromHistory:true});
  }));
}
function renderAnnouncementDetail(a){
  if(!announcementDetailDialog||!a)return;
  const title=document.getElementById('announcementDetailTitle');
  const body=document.getElementById('announcementDetailBody');
  const date=document.getElementById('announcementDetailDate');
  if(title)title.textContent=a.title||'お知らせ';
  if(body)body.textContent=a.body||'';
  if(date)date.textContent=announcementDate(a);
}
function openAnnouncementDetail(a,{fromHistory=false}={}){
  if(!a||!announcementDetailDialog)return;
  openedAnnouncement={...a,fromHistory,wasUnread:!isAnnouncementRead(a.id)};
  renderAnnouncementDetail(a);
  if(announcementDialog?.open) announcementDialog.close();
  if(!announcementDetailDialog.open) announcementDetailDialog.showModal();
}
function closeAnnouncementDetail(){
  if(openedAnnouncement?.id && openedAnnouncement.wasUnread){
    markAnnouncementRead(openedAnnouncement.id);
  }
  openedAnnouncement=null;
  if(announcementDetailDialog?.open) announcementDetailDialog.close();
  renderAnnouncementHistory();
  syncAnnouncementUnreadDot();
  loadActiveAnnouncement(false);
}
async function openAnnouncementHistory(){
  try{activeAnnouncements=await fetchActiveAnnouncements();}catch(e){console.warn('announcement history load failed',e);}
  renderAnnouncementHistory();
  syncAnnouncementUnreadDot();
  if(announcementDialog&&!announcementDialog.open)announcementDialog.showModal();
}
async function loadActiveAnnouncement(refresh=true){
  const box=document.getElementById('adminAnnouncement');
  if(!box) return;
  try{
    if(refresh) activeAnnouncements=await fetchActiveAnnouncements();
    const a=activeAnnouncements.find(x=>!isAnnouncementRead(x.id))||null;
    syncAnnouncementUnreadDot();
    if(!a){box.hidden=true;return;}
    box.hidden=false;
    box.classList.add('is-unread');
    box.setAttribute('role','button');box.setAttribute('tabindex','0');
    const body=String(a.body||'').trim();
    const excerpt=body.length>76?body.slice(0,76)+'…':body;
    box.innerHTML=`<div class="announcement-top"><span>FROM 20TH OFFICE</span><em>NEW</em></div><b>${escapeHtml(a.title||'お知らせ')}</b>${excerpt?`<small>${escapeHtml(excerpt)}</small>`:''}<i>タップして読む</i>`;
    const open=()=>openAnnouncementDetail(a);
    box.onclick=open;
    box.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};
  }catch(e){console.warn('announcement load failed',e);box.hidden=true;}
}
async function refreshAnnouncementsLive(){
  try{
    const next=await fetchActiveAnnouncements();
    const before=JSON.stringify(activeAnnouncements.map(a=>[a.id,a.updated_at||a.created_at,a.title,a.body,a.is_active]));
    const after=JSON.stringify(next.map(a=>[a.id,a.updated_at||a.created_at,a.title,a.body,a.is_active]));
    activeAnnouncements=next;
    if(before!==after){
      renderAnnouncementHistory();
      syncAnnouncementUnreadDot();
      loadActiveAnnouncement(false);
    }
  }catch(e){console.warn('announcement live refresh skipped',e);}
}
function startAnnouncementLiveUpdates(){
  if(announcementPollTimer)clearInterval(announcementPollTimer);
  announcementPollTimer=setInterval(refreshAnnouncementsLive,12000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshAnnouncementsLive();});
  window.addEventListener('focus',refreshAnnouncementsLive);
  if(sb?.channel && !announcementRealtimeChannel){
    try{
      announcementRealtimeChannel=sb.channel('homes20-public-announcements')
        .on('postgres_changes',{event:'*',schema:'public',table:'anniversary_announcements'},()=>refreshAnnouncementsLive())
        .subscribe();
    }catch(e){console.warn('announcement realtime unavailable; polling fallback active',e);}
  }
}
document.getElementById('announcementHistoryBtn')?.addEventListener('click',openAnnouncementHistory);
document.getElementById('announcementCloseBtn')?.addEventListener('click',()=>announcementDialog?.close());
announcementDialog?.addEventListener('click',e=>{if(e.target===announcementDialog)announcementDialog.close();});
document.getElementById('announcementDetailCloseBtn')?.addEventListener('click',closeAnnouncementDetail);
announcementDetailDialog?.addEventListener('click',e=>{if(e.target===announcementDetailDialog)closeAnnouncementDetail();});
announcementDetailDialog?.addEventListener('cancel',e=>{e.preventDefault();closeAnnouncementDetail();});
startAnnouncementLiveUpdates();


if(sb?.channel){try{sb.channel('homes20-likes').on('postgres_changes',{event:'*',schema:'public',table:'anniversary_post_likes'},()=>loadPostLikes()).subscribe();}catch(e){console.warn('like realtime unavailable',e);}}
loadSupabasePosts();
const STAFF_LOGIN_KEY='homes20StaffLogin';
const STAFF_CODE=String(APP_CONFIG.staffCode||'2027');
const LOGIN_DAYS=Number(APP_CONFIG.loginDays||180);

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

function resetAppToTop(){
  document.activeElement?.blur?.();
  if('scrollRestoration' in history) history.scrollRestoration='manual';
  const go=()=>{
    window.scrollTo(0,0);
    document.documentElement.scrollTop=0;
    document.body.scrollTop=0;
    document.getElementById('mainContent')?.scrollTo?.(0,0);
  };
  go();
  requestAnimationFrame(()=>requestAnimationFrame(go));
  [80,220,450,800,1200].forEach(ms=>setTimeout(go,ms));
  if(window.visualViewport){
    const onResize=()=>go();
    window.visualViewport.addEventListener('resize',onResize,{once:true});
  }
}

function handleLaunchIntent(){
  const q=new URLSearchParams(location.search);
  if(q.get('open')!=='upload')return;
  setTimeout(()=>{
    openRoute('upload');
    const cat=document.getElementById('videoCategory');if(cat)cat.value='川瀬社長自転車の旅';
    const title=document.getElementById('videoTitle');
    const kind=q.get('kenji');
    if(title&&!title.value)title.placeholder=kind==='message'?'川瀬社長からひとこと':kind==='photo'?'到着時の思い出':'自転車の旅の動画タイトル';
    history.replaceState({},'',location.pathname);
  },350);
}

function showApp(name){
  const authGate=document.getElementById('authGate');
  authGate.classList.remove('show');
  authGate.setAttribute('aria-hidden','true');
  appShell.classList.add('ready');
  resetAppToTop();
  updateProfile(name);
  recordLoginBonus(name);
  trackAppOpen(name);
  loadActiveAnnouncement();
  loadPostLikes();
  scheduleInstallOnboarding();
  handleLaunchIntent();
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
  window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js?v=5148').catch(()=>{}));
}

// v5.13 - ホーム画面追加オンボーディング
const INSTALL_SNOOZE_KEY='homes20InstallGuideSnoozeUntil';
const INSTALL_COMPLETED_KEY='homes20InstallCompleted';
let deferredInstallPrompt=null;
const installDialog=document.getElementById('installDialog');

function isStandaloneApp(){
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone===true;
}
function isInstallCompleted(){
  return isStandaloneApp() || localStorage.getItem(INSTALL_COMPLETED_KEY)==='1';
}
function syncInstallBadge(){
  const btn=document.getElementById('profileBtn');
  if(!btn) return;
  btn.classList.toggle('install-pending',!isInstallCompleted());
}
function isIOSDevice(){
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
}
function isAndroidDevice(){ return /android/i.test(navigator.userAgent); }
function setInstallState(){
  const standalone=isStandaloneApp();
  if(standalone) localStorage.setItem(INSTALL_COMPLETED_KEY,'1');
  syncInstallBadge();
  const ios=isIOSDevice();
  const android=isAndroidDevice();
  document.getElementById('installStandalone').hidden=!standalone;
  document.getElementById('installIos').hidden=standalone||!ios;
  document.getElementById('installAndroid').hidden=standalone||!android;
  document.getElementById('installOther').hidden=standalone||ios||android;
  const nativeBtn=document.getElementById('nativeInstallBtn');
  if(nativeBtn){
    nativeBtn.hidden=!deferredInstallPrompt;
    if(android && !deferredInstallPrompt){
      const state=document.getElementById('installAndroid');
      const p=state?.querySelector('p');
      if(p) p.textContent='ブラウザのメニューから「アプリをインストール」または「ホーム画面に追加」を選択してください。';
    }
  }
  document.getElementById('installLaterBtn').hidden=standalone;
  document.getElementById('installDoneBtn').textContent=standalone?'閉じる':'わかりました';
}
function openInstallGuide(){
  if(!installDialog) return;
  setInstallState();
  if(!installDialog.open){ installDialog.showModal(); trackActivity('install_guide_view',{ios:isIOSDevice(),android:isAndroidDevice()}); }
}
function closeInstallGuide(snooze=false){
  if(snooze){ localStorage.setItem(INSTALL_SNOOZE_KEY,String(Date.now()+24*60*60*1000)); }
  if(installDialog?.open) installDialog.close();
}
function scheduleInstallOnboarding(){
  syncInstallBadge();
  if(isInstallCompleted() || !installDialog) return;
  const snoozeUntil=Number(localStorage.getItem(INSTALL_SNOOZE_KEY)||0);
  if(Date.now()<snoozeUntil) return;
  setTimeout(()=>{ if(!isStandaloneApp()) openInstallGuide(); },900);
}
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  deferredInstallPrompt=e;
  setInstallState();
});
window.addEventListener('appinstalled',()=>{
  deferredInstallPrompt=null;
  localStorage.setItem(INSTALL_COMPLETED_KEY,'1');
  syncInstallBadge();
  localStorage.removeItem(INSTALL_SNOOZE_KEY);
  trackActivity('install_completed',{source:'browser_event'});
  if(installDialog?.open) installDialog.close();
});
document.getElementById('nativeInstallBtn')?.addEventListener('click',async()=>{
  if(!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const choice=await deferredInstallPrompt.userChoice.catch(()=>null);
  trackActivity('install_prompt_result',{outcome:choice?.outcome||'unknown'});
  deferredInstallPrompt=null;
  setInstallState();
});
document.getElementById('installCloseBtn')?.addEventListener('click',()=>closeInstallGuide(true));
document.getElementById('installLaterBtn')?.addEventListener('click',()=>closeInstallGuide(true));
document.getElementById('installDoneBtn')?.addEventListener('click',()=>closeInstallGuide(false));
document.getElementById('profileBtn')?.addEventListener('click',openInstallGuide);
syncInstallBadge();
window.addEventListener('pageshow',()=>syncInstallBadge());
document.addEventListener('visibilitychange',()=>{if(!document.hidden) syncInstallBadge();});

const dialog=document.getElementById('screenDialog');
const title=document.getElementById('dialogTitle');
const kicker=document.getElementById('dialogKicker');
const body=document.getElementById('dialogBody');
const templates={upload:'uploadTemplate',bike:'bikeTemplate',missions:'missionsTemplate',timeline:'timelineTemplate',survey:'surveyTemplate'};
const labels={upload:['POST YOUR MEMORY','写真・動画を投稿'],bike:['KAWASE PRESIDENT RIDE','川瀬社長自転車の旅'],missions:['20TH ANNIVERSARY QUEST','20周年ミッション'],timeline:['HOMES TIME MACHINE','20年の沿革'],survey:['QUESTIONNAIRE','20周年アンケート']};

function openTodayHistory(){
  const now=japanTodayParts();
  const events=allTodayEvents();
  kicker.textContent='TODAY IN HOMES';
  title.textContent=`${now.month}月${now.day}日`;
  if(!events.length){
    body.innerHTML='<section class="today-history-empty"><span>NO ARCHIVE YET</span><h3>今日はまだ「何の日」がありません。</h3><p>新しい出来事が見つかったら、KENJI MODEから追加できます。</p></section>';
  }else{
    body.innerHTML=`<section class="today-history-list"><div class="today-history-lead"><span>${events.length} EVENT${events.length>1?'S':''}</span><b>${now.month}月${now.day}日のHOMES</b></div>${events.map(ev=>`<article><div class="today-history-year">${ev.year?escapeHtml(ev.year):'—'}</div><div><h3>${escapeHtml(ev.title)}</h3>${ev.note?`<p>${escapeHtml(ev.note)}</p>`:''}<small>${ev.source==='kenji'?'KENJI MODEから追加':escapeHtml(ev.category||'HOMES ARCHIVE')}</small></div></article>`).join('')}</section>`;
  }
  dialog.showModal();
}
const todayMemoryBox=document.getElementById('todayMemory');
if(todayMemoryBox){
  todayMemoryBox.addEventListener('click',openTodayHistory);
  todayMemoryBox.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openTodayHistory();}});
}


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
  let mediaMeta={kind:'',width:null,height:null,duration:null,isPortrait:false};
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
    mediaMeta={kind:isImage?'image':'video',width:null,height:null,duration:null,isPortrait:false};
    const media=isImage
      ? `<img class="upload-image-preview" src="${selectedObjectUrl}" alt="選択した写真">`
      : `<video id="previewVideo" src="${selectedObjectUrl}" controls playsinline></video>`;
    previewArea.innerHTML=`<div class="video-preview">${media}<div class="video-fileinfo"><b>${escapeHtml(selectedFile.name)}</b><br>${readableBytes(selectedFile.size)}</div></div>`;
    if(!isImage){
      const video=document.getElementById('previewVideo');
      video?.addEventListener('loadedmetadata',()=>{
        const info=previewArea.querySelector('.video-fileinfo');
        const portrait=video.videoHeight>video.videoWidth;
        mediaMeta={kind:'video',width:video.videoWidth||null,height:video.videoHeight||null,duration:Number(video.duration)||null,isPortrait:portrait};
        if(portrait) trackActivity('portrait_tip_view',{width:video.videoWidth,height:video.videoHeight,fileName:selectedFile.name});
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
      media_kind:mediaMeta.kind|| (selectedFile.type.startsWith('image/')?'image':'video'),
      media_width:mediaMeta.width,
      media_height:mediaMeta.height,
      media_duration_seconds:mediaMeta.duration,
      is_portrait:mediaMeta.isPortrait,
      final_movie_status:'unreviewed',
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

    posts.unshift({id:inserted?.id,title:t,author:a,icon:selectedFile.type.startsWith('image/')?'camera':'video',alt:true,image:previewUrl,tag:'NEW',campus:campus||'',category:category||'',driveFileId:driveFile?.id||'',driveWebViewUrl:driveFile?.webViewLink||'',originalFilename:driveFile?.name||selectedFile.name,isVideo:selectedFile.type.startsWith('video/')});
    trackActivity('post_created',{postId:inserted?.id||null,kind:mediaMeta.kind,width:mediaMeta.width,height:mediaMeta.height,duration:mediaMeta.duration,isPortrait:mediaMeta.isPortrait,finalCandidate});
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
let rideRemoteState=null;
let rideChannel=null;
try{ rideChannel=new BroadcastChannel('homes20-ride'); }catch(e){}

function getRideState(){
  if(rideRemoteState) return rideRemoteState;
  try{const raw=localStorage.getItem(RIDE_STORAGE_KEY);return raw?JSON.parse(raw):RIDE_DEFAULT_STATE;}catch(e){return RIDE_DEFAULT_STATE;}
}
async function refreshRideState(){
  if(!sb)return;
  const {data,error}=await sb.from('anniversary_ride_state').select('current_campus,visited,updated_at').eq('id',1).maybeSingle();
  if(error){console.warn('RIDE同期失敗',error);return;}
  if(data){rideRemoteState={current:data.current_campus||'',visited:data.visited||{},updatedAt:data.updated_at||''};localStorage.setItem(RIDE_STORAGE_KEY,JSON.stringify(rideRemoteState));if(dialog?.open)applyRideState();}
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
  refreshRideState();
  applyRideState();
}

if(sb?.channel){try{sb.channel('homes20-ride-state').on('postgres_changes',{event:'UPDATE',schema:'public',table:'anniversary_ride_state'},()=>refreshRideState()).subscribe();}catch(e){console.warn('ride realtime unavailable',e);}}
window.addEventListener('storage',e=>{
  if(e.key===RIDE_STORAGE_KEY && dialog?.open) applyRideState();
});
if(rideChannel){ rideChannel.addEventListener('message',()=>{ if(dialog?.open) applyRideState(); }); }
