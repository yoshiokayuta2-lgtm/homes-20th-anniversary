const ORS_API_KEY = Deno.env.get('ORS_API_KEY') || '';
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || 'https://yoshiokayuta2-lgtm.github.io';

const KNOWN_DESTINATIONS: Record<string, { lat: number; lng: number; label: string }> = {
  '岐阜本部校': { lat: 35.4106915, lng: 136.7541992, label: '岐阜本部校' },
  '岐南校': { lat: 35.3915741, lng: 136.7967351, label: '岐南校' },
  '神戸校': { lat: 35.4272951, lng: 136.6059162, label: '神戸校' },
  '大垣本部校': { lat: 35.3685870, lng: 136.6186916, label: '大垣本部校' },
  '穂積校': { lat: 35.3949750, lng: 136.6725120, label: '穂積校' },
};

function knownDestination(value: unknown) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  for (const [name, dest] of Object.entries(KNOWN_DESTINATIONS)) {
    if (raw === name || raw.includes(name)) return dest;
  }
  return null;
}

function cors(origin: string | null) {
  const allowed = origin && (origin === ALLOWED_ORIGIN || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))
    ? origin
    : ALLOWED_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'content-type': 'application/json; charset=utf-8' },
  });
}

function finite(n: unknown) {
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
}

function haversineMeters(a: number[], b: number[]) {
  const r = 6371000;
  const toRad = (v: number) => v * Math.PI / 180;
  const lat1 = toRad(a[1]), lat2 = toRad(b[1]);
  const dLat = lat2 - lat1, dLon = toRad(b[0] - a[0]);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function downsample<T>(items: T[], max = 1200) {
  if (items.length <= max) return items;
  const out: T[] = [];
  for (let i = 0; i < max; i++) out.push(items[Math.round(i * (items.length - 1) / (max - 1))]);
  return out;
}

function buildProfiles(coords: number[][]) {
  if (!coords.length) return { elevationProfile: [], gradeProfile: [], maxGrade: 0, ascentM: 0, descentM: 0 };
  const points: { d: number; e: number }[] = [];
  let d = 0;
  let ascentM = 0;
  let descentM = 0;
  let prevElev = finite(coords[0][2]) ?? 0;
  points.push({ d: 0, e: prevElev });
  for (let i = 1; i < coords.length; i++) {
    d += haversineMeters(coords[i - 1], coords[i]);
    const elev = finite(coords[i][2]) ?? prevElev;
    const de = elev - prevElev;
    if (de > 0) ascentM += de; else descentM += -de;
    points.push({ d, e: elev });
    prevElev = elev;
  }

  const sampleEvery = 100;
  const samples: { d: number; e: number }[] = [];
  let idx = 1;
  const total = points.at(-1)?.d || 0;
  for (let target = 0; target <= total; target += sampleEvery) {
    while (idx < points.length && points[idx].d < target) idx++;
    const b = points[Math.min(idx, points.length - 1)];
    const a = points[Math.max(0, Math.min(idx - 1, points.length - 1))];
    const span = Math.max(1, b.d - a.d);
    const t = Math.min(1, Math.max(0, (target - a.d) / span));
    samples.push({ d: target, e: a.e + (b.e - a.e) * t });
  }
  if (!samples.length || samples.at(-1)!.d < total - 10) samples.push({ d: total, e: points.at(-1)!.e });

  const rawGrades = samples.map((p, i) => {
    if (!i) return 0;
    const prev = samples[i - 1];
    const run = Math.max(1, p.d - prev.d);
    return Math.max(-30, Math.min(30, ((p.e - prev.e) / run) * 100));
  });
  const smoothed = rawGrades.map((_, i) => {
    const vals = rawGrades.slice(Math.max(0, i - 1), Math.min(rawGrades.length, i + 2));
    return vals.reduce((s, v) => s + v, 0) / Math.max(1, vals.length);
  });
  const positive = smoothed.filter(v => v > 0).sort((a, b) => a - b);
  const p95 = positive.length ? positive[Math.min(positive.length - 1, Math.floor(positive.length * 0.95))] : 0;

  return {
    elevationProfile: downsample(samples.map(p => ({ distanceM: Math.round(p.d), elevationM: Math.round(p.e * 10) / 10 })), 500),
    gradeProfile: downsample(samples.map((p, i) => ({ distanceM: Math.round(p.d), grade: Math.round(smoothed[i] * 10) / 10 })), 500),
    maxGrade: Math.round(p95 * 10) / 10,
    ascentM: Math.round(ascentM),
    descentM: Math.round(descentM),
  };
}

async function geocode(text: string) {
  const url = new URL('https://api.openrouteservice.org/geocode/search');
  url.searchParams.set('api_key', ORS_API_KEY);
  url.searchParams.set('text', text);
  url.searchParams.set('boundary.country', 'JP');
  url.searchParams.set('size', '1');
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`目的地検索に失敗しました (${res.status})`);
  const feature = body?.features?.[0];
  const c = feature?.geometry?.coordinates;
  if (!Array.isArray(c) || c.length < 2) throw new Error('目的地を地図上で見つけられませんでした。住所をもう少し詳しく入力してください。');
  return {
    lng: Number(c[0]),
    lat: Number(c[1]),
    label: feature?.properties?.label || text,
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const headers = cors(origin);
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, headers);
  if (origin && origin !== ALLOWED_ORIGIN && !origin.startsWith('http://localhost:') && !origin.startsWith('http://127.0.0.1:')) {
    return json({ error: 'Origin not allowed' }, 403, headers);
  }
  try {
    if (!ORS_API_KEY) throw new Error('ORS_API_KEY がSupabase Secretsに設定されていません。');
    const body = await req.json();
    const originLat = finite(body?.origin?.lat), originLng = finite(body?.origin?.lng);
    if (originLat === null || originLng === null || Math.abs(originLat) > 90 || Math.abs(originLng) > 180) {
      throw new Error('現在地の座標が正しくありません。');
    }

    let destination: { lat: number; lng: number; label: string };
    const destLat = finite(body?.destination?.lat), destLng = finite(body?.destination?.lng);
    if (destLat !== null && destLng !== null) {
      destination = { lat: destLat, lng: destLng, label: String(body?.destination?.label || '目的地') };
    } else {
      const text = String(body?.destination?.text || '').trim();
      const label = String(body?.destination?.label || '').trim();
      const fixed = knownDestination(label) || knownDestination(text);
      if (fixed) {
        destination = fixed;
      } else {
        if (!text) throw new Error('目的地を入力してください。');
        destination = await geocode(text);
      }
    }

    const profile = ['cycling-road', 'cycling-regular'].includes(body?.profile) ? body.profile : 'cycling-road';
    const routeRes = await fetch(`https://api.openrouteservice.org/v2/directions/${profile}/geojson`, {
      method: 'POST',
      headers: {
        'Authorization': ORS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coordinates: [[originLng, originLat], [destination.lng, destination.lat]],
        elevation: true,
        instructions: false,
        preference: 'recommended',
        extra_info: ['steepness'],
        units: 'm',
      }),
    });
    const routeJson = await routeRes.json().catch(() => ({}));
    if (!routeRes.ok) {
      const detail = routeJson?.error?.message || routeJson?.error || `HTTP ${routeRes.status}`;
      throw new Error(`自転車ルートを計算できませんでした：${detail}`);
    }
    const feature = routeJson?.features?.[0];
    const coords = feature?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) throw new Error('ルートデータを取得できませんでした。');
    const props = feature?.properties || {};
    const summary = props?.summary || {};
    const profiles = buildProfiles(coords);
    const routePoints = downsample(coords.map((c: number[]) => [Number(c[1]), Number(c[0])]), 1200);

    return json({
      destination,
      summary: {
        distanceM: Math.round(Number(summary.distance || 0)),
        durationS: Math.round(Number(summary.duration || 0)),
        ascentM: Math.round(Number(props.ascent ?? profiles.ascentM ?? 0)),
        descentM: Math.round(Number(props.descent ?? profiles.descentM ?? 0)),
        maxGrade: profiles.maxGrade,
      },
      route: routePoints,
      elevationProfile: profiles.elevationProfile,
      gradeProfile: profiles.gradeProfile,
      calculatedAt: new Date().toISOString(),
    }, 200, headers);
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : 'ルート計算に失敗しました。' }, 500, headers);
  }
});
