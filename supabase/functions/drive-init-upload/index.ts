const PHOTO_FOLDER_ID = Deno.env.get('DRIVE_PHOTO_FOLDER_ID') || '1JvTL7gAtw_E2UbvuXVvgv5jNE0wpqOcZ';
const VIDEO_FOLDER_ID = Deno.env.get('DRIVE_VIDEO_FOLDER_ID') || '1sKC3oue_BBMoRnPdQCiyfl86WZM5wqEc';
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || 'https://yoshiokayuta2-lgtm.github.io';
const ADMIN_MODE_CODE = Deno.env.get('ADMIN_MODE_CODE') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
function getSupabaseSecretKey() {
  const modern = Deno.env.get('SUPABASE_SECRET_KEYS') || '';
  if (modern) {
    try {
      const keys = JSON.parse(modern);
      const key = keys?.default || Object.values(keys || {})[0];
      if (typeof key === 'string' && key) return key;
    } catch (e) {
      console.error('SUPABASE_SECRET_KEYS parse error', e);
    }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
}
const SERVICE_KEY = getSupabaseSecretKey();

function cors(origin: string | null) {
  const allow = origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range',
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
    'Access-Control-Expose-Headers': 'content-length, content-range, accept-ranges, content-type',
    'Vary': 'Origin',
  };
}
function json(data: unknown,status=200,headers:Record<string,string>={}){return new Response(JSON.stringify(data),{status,headers:{...headers,'content-type':'application/json'}})}
function requireAdmin(code: string){if(!ADMIN_MODE_CODE)throw new Error('ADMIN_MODE_CODE がSupabase Secretsに設定されていません。');if(code!==ADMIN_MODE_CODE)throw new Error('管理者コードが違います。');}
async function getGoogleAccessToken() {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const refreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN');
  if (!clientId || !clientSecret || !refreshToken) throw new Error('Google Drive のOAuth設定が未完了です。');
  const body = new URLSearchParams({client_id:clientId,client_secret:clientSecret,refresh_token:refreshToken,grant_type:'refresh_token'});
  const res = await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
  const out=await res.json();if(!res.ok||!out.access_token)throw new Error('Google Drive のアクセストークンを取得できませんでした。');return out.access_token as string;
}
function serviceHeaders(extra:Record<string,string>={}){return {'apikey':SERVICE_KEY,'authorization':`Bearer ${SERVICE_KEY}`,...extra};}
async function rest(path:string,init:RequestInit={}){
  if(!SUPABASE_URL||!SERVICE_KEY)throw new Error('Supabase管理接続を利用できません。');
  const r=await fetch(`${SUPABASE_URL}${path}`,{...init,headers:{...serviceHeaders(),...(init.headers||{})}});
  if(!r.ok){
    const detail=await r.clone().text().catch(()=> '');
    console.error(`Supabase REST ${r.status} ${path}`, detail);
  }
  return r;
}
function previewObjectPath(url:string){try{const u=new URL(url);const marker='/storage/v1/object/public/anniversary-previews/';const i=u.pathname.indexOf(marker);return i>=0?decodeURIComponent(u.pathname.slice(i+marker.length)):''}catch{return ''}}

Deno.serve(async(req)=>{
  const origin=req.headers.get('origin');const headers=cors(origin);
  if(req.method==='OPTIONS')return new Response('ok',{headers});
  if(origin&&origin!==ALLOWED_ORIGIN)return json({error:'Origin not allowed'},403,headers);
  try{
    if(req.method==='GET'||req.method==='HEAD'){
      const u=new URL(req.url),fileId=u.searchParams.get('file_id')||'';if(!/^[A-Za-z0-9_-]{10,}$/.test(fileId))return new Response('Invalid file id',{status:400,headers});
      const token=await getGoogleAccessToken(),driveHeaders=new Headers({Authorization:`Bearer ${token}`});const range=req.headers.get('range');if(range)driveHeaders.set('Range',range);
      const media=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,{method:req.method,headers:driveHeaders});const out=new Headers(headers);
      for(const n of ['content-type','content-length','content-range','accept-ranges','etag','last-modified']){const v=media.headers.get(n);if(v)out.set(n,v)}if(!out.has('accept-ranges'))out.set('accept-ranges','bytes');out.set('cache-control','private, max-age=300');
      return new Response(req.method==='HEAD'?null:media.body,{status:media.status,headers:out});
    }
    if(req.method!=='POST')return new Response('Method not allowed',{status:405,headers});
    const body=await req.json();const action=body.action||'upload-init';
    if(action==='public-active-announcement'||action==='public-announcements'){
      const r=await rest('/rest/v1/anniversary_announcements?select=id,title,body,created_at,start_at,end_at,is_active&is_active=eq.true&order=created_at.desc&limit=200');
      if(!r.ok){const detail=await r.text().catch(()=> '');throw new Error(`お知らせを取得できません (${r.status})${detail?`：${detail.slice(0,400)}`:''}`);}
      const rows=await r.json();
      const now=Date.now();
      const active=(rows||[]).filter((x:any)=>{
        const start=x.start_at?Date.parse(x.start_at):null,end=x.end_at?Date.parse(x.end_at):null;
        return (!start||start<=now)&&(!end||end>=now);
      });
      if(action==='public-announcements')return json({announcements:active},200,headers);
      return json({announcement:active[0]||null},200,headers);
    }
    if(action.startsWith('admin-')){
      requireAdmin(String(body.adminCode||''));
      if(action==='admin-auth')return json({ok:true},200,headers);
      if(action==='admin-list-posts'){
        const r=await rest('/rest/v1/anniversary_posts?select=id,title,author_name,campus,category,preview_url,created_at,drive_file_id,drive_web_view_url,original_file_name,original_filename,original_mime_type,original_size,media_kind,media_width,media_height,media_duration_seconds,is_portrait,is_public,final_movie_candidate,final_movie_status,final_movie_note&order=created_at.desc&limit=2000');
        if(!r.ok)throw new Error('投稿一覧を取得できません。');
        return json({posts:await r.json()},200,headers);
      }
      if(action==='admin-list-activity'){
        const [l,p,a,t,r]=await Promise.all([
          rest('/rest/v1/anniversary_login_days?select=staff_name,login_date,created_at&order=login_date.asc&limit=50000'),
          rest('/rest/v1/anniversary_posts?select=id,author_name,created_at,category,original_mime_type,original_file_name,original_filename,media_kind,media_width,media_height,media_duration_seconds,is_portrait,final_movie_candidate,final_movie_status&order=created_at.asc&limit=50000'),
          rest('/rest/v1/anniversary_activity_events?select=staff_name,event_type,event_date,metadata,created_at&order=created_at.asc&limit=50000'),
          rest('/rest/v1/anniversary_today_events?select=id,month,day,event_year,title,note,author_name,created_at&order=created_at.asc&limit=10000'),
          rest('/rest/v1/anniversary_staff_roster?select=id,staff_name,campus,active,created_at&order=staff_name.asc&limit=5000')
        ]);
        if(!l.ok||!p.ok||!a.ok||!t.ok||!r.ok)throw new Error('参加状況を取得できません。v5.14 SQLが実行済みか確認してください。');
        return json({loginDays:await l.json(),postAuthors:await p.json(),activityEvents:await a.json(),todayEvents:await t.json(),roster:await r.json()},200,headers);
      }
      if(action==='admin-list-today-events'){
        const r=await rest('/rest/v1/anniversary_today_events?select=id,month,day,event_year,title,note,author_name,created_at&order=month.asc,day.asc,event_year.asc');
        if(!r.ok)throw new Error('今日は何の日の追加データを取得できません。');
        return json({events:await r.json()},200,headers);
      }
      if(action==='admin-update-post'){
        const postId=String(body.postId||'');const patch=body.patch||{};const safe:any={};
        if(typeof patch.is_public==='boolean')safe.is_public=patch.is_public;
        if(typeof patch.final_movie_candidate==='boolean')safe.final_movie_candidate=patch.final_movie_candidate;
        if(typeof patch.final_movie_status==='string'&&['unreviewed','adopted','hold','rejected'].includes(patch.final_movie_status))safe.final_movie_status=patch.final_movie_status;
        if(typeof patch.final_movie_note==='string')safe.final_movie_note=patch.final_movie_note.slice(0,1000);
        if(typeof patch.title==='string'&&patch.title.trim())safe.title=patch.title.trim().slice(0,200);
        if(typeof patch.campus==='string')safe.campus=patch.campus.trim().slice(0,120);
        if(typeof patch.category==='string')safe.category=patch.category.trim().slice(0,120);
        const r=await rest(`/rest/v1/anniversary_posts?id=eq.${encodeURIComponent(postId)}`,{method:'PATCH',headers:{'content-type':'application/json','prefer':'return=minimal'},body:JSON.stringify(safe)});if(!r.ok)throw new Error('投稿設定を更新できません。');return json({ok:true},200,headers);
      }
      if(action==='admin-delete-post'){
        const postId=String(body.postId||'');const q=await rest(`/rest/v1/anniversary_posts?id=eq.${encodeURIComponent(postId)}&select=id,drive_file_id,preview_url`);if(!q.ok)throw new Error('削除対象を取得できません。');const rows=await q.json();const row=rows?.[0];if(!row)throw new Error('投稿が見つかりません。');
        const failures:string[]=[];
        if(row.drive_file_id){try{const token=await getGoogleAccessToken();const d=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(row.drive_file_id)}`,{method:'DELETE',headers:{Authorization:`Bearer ${token}`}});if(!d.ok&&d.status!==404)failures.push('Google Drive原本')}catch{failures.push('Google Drive原本')}}
        const objectPath=previewObjectPath(row.preview_url||'');if(objectPath){try{const d=await fetch(`${SUPABASE_URL}/storage/v1/object/anniversary-previews/${objectPath.split('/').map(encodeURIComponent).join('/')}`,{method:'DELETE',headers:serviceHeaders()});if(!d.ok&&d.status!==404)failures.push('サムネイル')}catch{failures.push('サムネイル')}}
        const del=await rest(`/rest/v1/anniversary_posts?id=eq.${encodeURIComponent(postId)}`,{method:'DELETE',headers:{'prefer':'return=minimal'}});if(!del.ok)throw new Error('投稿DB情報を削除できません。');return json({ok:true,warning:failures.length?`${failures.join('・')}の削除を確認してください`:''},200,headers);
      }
      if(action==='admin-create-today-event'){
        const month=Number(body.month),day=Number(body.day),eventYear=body.eventYear?Number(body.eventYear):null,title=String(body.title||'').trim(),note=String(body.note||'').trim(),authorName=String(body.authorName||'管理アプリ').trim();
        if(!(month>=1&&month<=12&&day>=1&&day<=31)||!title)throw new Error('日付とタイトルを確認してください。');
        const r=await rest('/rest/v1/anniversary_today_events',{method:'POST',headers:{'content-type':'application/json','prefer':'return=representation'},body:JSON.stringify({month,day,event_year:eventYear,title,note,author_name:authorName})});if(!r.ok)throw new Error('出来事を追加できません。');return json({event:(await r.json())?.[0]||null},200,headers);
      }
      if(action==='admin-update-today-event'){
        const eventId=String(body.eventId||''),patch=body.patch||{},safe:any={};
        if(Number.isFinite(Number(patch.event_year)))safe.event_year=Number(patch.event_year);if(patch.event_year===null||patch.event_year==='')safe.event_year=null;
        if(typeof patch.title==='string'&&patch.title.trim())safe.title=patch.title.trim().slice(0,300);if(typeof patch.note==='string')safe.note=patch.note.slice(0,2000);
        const r=await rest(`/rest/v1/anniversary_today_events?id=eq.${encodeURIComponent(eventId)}`,{method:'PATCH',headers:{'content-type':'application/json','prefer':'return=minimal'},body:JSON.stringify(safe)});if(!r.ok)throw new Error('出来事を更新できません。');return json({ok:true},200,headers);
      }
      if(action==='admin-list-announcements'){
        const r=await rest('/rest/v1/anniversary_announcements?select=id,title,body,is_active,start_at,end_at,created_at&order=created_at.desc&limit=200');if(!r.ok)throw new Error('お知らせを取得できません。');return json({announcements:await r.json()},200,headers);
      }
      if(action==='admin-create-announcement'){
        const title=String(body.title||'').trim(),text=String(body.body||'').trim();if(!title)throw new Error('お知らせタイトルを入力してください。');
        const r=await rest('/rest/v1/anniversary_announcements',{method:'POST',headers:{'content-type':'application/json','prefer':'return=representation'},body:JSON.stringify({title,body:text,is_active:true})});
        if(!r.ok){const detail=await r.text().catch(()=> '');throw new Error(`お知らせを追加できません (${r.status})${detail?`：${detail.slice(0,400)}`:''}`);}
        return json({announcement:(await r.json())?.[0]||null},200,headers);
      }
      if(action==='admin-update-announcement'){
        const id=String(body.id||''),patch=body.patch||{},safe:any={};if(typeof patch.is_active==='boolean')safe.is_active=patch.is_active;if(typeof patch.title==='string'&&patch.title.trim())safe.title=patch.title.trim().slice(0,200);if(typeof patch.body==='string')safe.body=patch.body.slice(0,2000);
        const r=await rest(`/rest/v1/anniversary_announcements?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{'content-type':'application/json','prefer':'return=minimal'},body:JSON.stringify(safe)});if(!r.ok)throw new Error('お知らせを更新できません。');return json({ok:true},200,headers);
      }
      if(action==='admin-delete-announcement'){
        const id=String(body.id||'');const r=await rest(`/rest/v1/anniversary_announcements?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',headers:{'prefer':'return=minimal'}});if(!r.ok)throw new Error('お知らせを削除できません。');return json({ok:true},200,headers);
      }
      if(action==='admin-replace-roster'){
        const rows=Array.isArray(body.rows)?body.rows:[];const clean=rows.map((x:any)=>({staff_name:String(x.staff_name||'').trim().slice(0,120),campus:String(x.campus||'').trim().slice(0,120),active:x.active!==false})).filter((x:any)=>x.staff_name);if(clean.length>3000)throw new Error('名簿件数が多すぎます。');
        const del=await rest('/rest/v1/anniversary_staff_roster?id=not.is.null',{method:'DELETE',headers:{'prefer':'return=minimal'}});if(!del.ok)throw new Error('既存名簿を更新できません。');if(clean.length){const ins=await rest('/rest/v1/anniversary_staff_roster',{method:'POST',headers:{'content-type':'application/json','prefer':'return=minimal','resolution':'merge-duplicates'},body:JSON.stringify(clean)});if(!ins.ok)throw new Error('名簿を保存できません。');}return json({ok:true,count:clean.length},200,headers);
      }
      if(action==='admin-delete-today-event'){
        const eventId=String(body.eventId||'');const d=await rest(`/rest/v1/anniversary_today_events?id=eq.${encodeURIComponent(eventId)}`,{method:'DELETE',headers:{'prefer':'return=minimal'}});if(!d.ok)throw new Error('出来事を削除できません。');return json({ok:true},200,headers);
      }
      return json({error:'Unknown admin action'},400,headers);
    }
    const {fileName,mimeType,size,kind}=body;if(!fileName||!mimeType||!Number.isFinite(Number(size)))throw new Error('ファイル情報が不足しています。');
    const folderId=kind==='image'?PHOTO_FOLDER_ID:VIDEO_FOLDER_ID,token=await getGoogleAccessToken();const init=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink,size,mimeType',{method:'POST',headers:{Authorization:`Bearer ${token}`,Origin:ALLOWED_ORIGIN,'Content-Type':'application/json; charset=UTF-8','X-Upload-Content-Type':mimeType,'X-Upload-Content-Length':String(size)},body:JSON.stringify({name:fileName,parents:[folderId]})});
    if(!init.ok)throw new Error('Google Drive のアップロード準備に失敗しました。');const uploadUrl=init.headers.get('location');if(!uploadUrl)throw new Error('Google Drive のアップロードURLを取得できませんでした。');return json({uploadUrl,folderId},200,headers);
  }catch(error){return json({error:error instanceof Error?error.message:'unknown error'},500,headers)}
});
