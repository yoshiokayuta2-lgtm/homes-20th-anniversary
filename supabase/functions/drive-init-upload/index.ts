const PHOTO_FOLDER_ID = Deno.env.get('DRIVE_PHOTO_FOLDER_ID') || '1JvTL7gAtw_E2UbvuXVvgv5jNE0wpqOcZ';
const VIDEO_FOLDER_ID = Deno.env.get('DRIVE_VIDEO_FOLDER_ID') || '1sKC3oue_BBMoRnPdQCiyfl86WZM5wqEc';
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || 'https://yoshiokayuta2-lgtm.github.io';

function cors(origin: string | null) {
  const allow = origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

async function getGoogleAccessToken() {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const refreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN');
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google Drive のOAuth設定が未完了です。');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) {
    console.error('Google token error', json);
    throw new Error('Google Drive のアクセストークンを取得できませんでした。');
  }
  return json.access_token as string;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const headers = cors(origin);
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers });
  if (origin && origin !== ALLOWED_ORIGIN) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { ...headers, 'content-type': 'application/json' },
    });
  }

  try {
    const { fileName, mimeType, size, kind } = await req.json();
    if (!fileName || !mimeType || !Number.isFinite(Number(size))) {
      throw new Error('ファイル情報が不足しています。');
    }
    const folderId = kind === 'image' ? PHOTO_FOLDER_ID : VIDEO_FOLDER_ID;
    const accessToken = await getGoogleAccessToken();
    const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink,size,mimeType';
    const init = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Origin: ALLOWED_ORIGIN,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': String(size),
      },
      body: JSON.stringify({ name: fileName, parents: [folderId] }),
    });
    if (!init.ok) {
      const detail = await init.text();
      console.error('Drive resumable init failed', init.status, detail);
      throw new Error('Google Drive のアップロード準備に失敗しました。');
    }
    const uploadUrl = init.headers.get('location');
    if (!uploadUrl) throw new Error('Google Drive のアップロードURLを取得できませんでした。');

    return new Response(JSON.stringify({ uploadUrl, folderId }), {
      status: 200,
      headers: { ...headers, 'content-type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'unknown error' }), {
      status: 500,
      headers: { ...headers, 'content-type': 'application/json' },
    });
  }
});
