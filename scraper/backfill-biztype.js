/**
 * shops.json 의 모든 항목에 bizType 필드를 채워 넣는 일회성 백필 스크립트.
 *
 * 매칭 우선순위:
 *  1) shops.json 항목에 externalId 가 있으면 그대로 wr_id 매칭
 *  2) 없으면 mainPhoto/photos 의 파일명에서 wr_id 추출 (파일명 패턴: `{wr_id}_{idx}.{ext}`)
 *  3) 둘 다 실패하면 unmatched 로 기록
 *
 * 결과: shops.json 을 백업 후 in-place 갱신.
 */
const fs   = require('fs');
const path = require('path');

const DATA_DIR  = path.join(__dirname, 'scraped_data');
const SHOPS     = path.join(DATA_DIR, 'shops.json');
const URLS      = path.join(DATA_DIR, 'urls.json');
const BACKUP    = path.join(DATA_DIR, `shops.json.bak.${Date.now()}`);

const shops = JSON.parse(fs.readFileSync(SHOPS, 'utf8'));
const urls  = JSON.parse(fs.readFileSync(URLS,  'utf8'));

// wr_id → bizName 맵
const wrToBiz = new Map();
for (const u of urls) {
  if (u.wr_id && u.bizName) wrToBiz.set(String(u.wr_id), u.bizName);
}

console.log(`urls.json: ${urls.length}건, wr_id↔bizName 맵: ${wrToBiz.size}개`);
console.log(`shops.json: ${shops.length}건`);

let byExtId = 0, byFilename = 0, unmatched = 0, alreadyHasBizType = 0;
const unmatchedSamples = [];

const RE_WRID = /\/(\d+)_\d+\.(?:gif|jpg|jpeg|png|webp)/i;

for (const s of shops) {
  if (s.bizType) { alreadyHasBizType++; continue; }

  let wrId = null;

  if (s.externalId !== undefined && s.externalId !== null) {
    wrId = String(s.externalId);
    if (wrToBiz.has(wrId)) byExtId++;
  }

  if (!wrId || !wrToBiz.has(wrId)) {
    const m = (s.mainPhoto || '').match(RE_WRID)
         || (s.photos    || '').split(',')[0]?.match(RE_WRID);
    if (m) {
      wrId = m[1];
      if (wrToBiz.has(wrId)) byFilename++;
    }
  }

  if (wrId && wrToBiz.has(wrId)) {
    s.bizType = wrToBiz.get(wrId);
    if (s.externalId === undefined) s.externalId = parseInt(wrId, 10);
  } else {
    s.bizType = '';
    unmatched++;
    if (unmatchedSamples.length < 5) {
      unmatchedSamples.push({ company: s.company, area: s.area, externalId: s.externalId, mainPhoto: s.mainPhoto });
    }
  }
}

// 백업 후 저장
fs.copyFileSync(SHOPS, BACKUP);
fs.writeFileSync(SHOPS, JSON.stringify(shops, null, 2));

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`✅ externalId 직접 매칭:       ${byExtId}`);
console.log(`✅ 이미지 파일명 fallback 매칭: ${byFilename}`);
console.log(`⏭  이미 bizType 있음 (스킵):  ${alreadyHasBizType}`);
console.log(`❌ 매칭 실패:                  ${unmatched}`);
console.log(`백업: ${BACKUP}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

if (unmatched) {
  console.log('\n매칭 실패 샘플:');
  for (const x of unmatchedSamples) console.log('  •', JSON.stringify(x));
}

// bizType 분포 출력 (검증용)
const dist = {};
for (const s of shops) dist[s.bizType || '(없음)'] = (dist[s.bizType || '(없음)'] || 0) + 1;
console.log('\n=== bizType 분포 (백필 후) ===');
for (const [k, v] of Object.entries(dist).sort((a,b)=>b[1]-a[1])) {
  console.log(`  ${k.padEnd(15)} ${v}`);
}
