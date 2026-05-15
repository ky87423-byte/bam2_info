/**
 * public/images/imgs/ 의 GIF/JPG/JPEG/PNG 를 WebP 로 일괄 변환.
 *
 * 흐름:
 *   1. 파일 목록 수집 (이미 .webp 이거나 .webp 짝꿍이 있으면 스킵)
 *   2. 워커 풀로 병렬 변환 (CPU 코어 수 기준)
 *   3. 원본 별도 보존 (--delete-original 옵션 시 삭제)
 *   4. 변환 실패는 별도 로그 — 원본은 유지
 *
 * 사용법:
 *   node bulk-convert-to-webp.js --dry-run --limit 50      # 50개 테스트
 *   node bulk-convert-to-webp.js --concurrency 4           # 4개 병렬
 *   node bulk-convert-to-webp.js --delete-original         # 변환 후 원본 삭제
 *   node bulk-convert-to-webp.js --ext gif                 # GIF만
 */
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { toWebP, toWebPFilename } = require('./lib/webp-convert');

const IMG_DIR = path.join(__dirname, '..', 'public', 'images', 'imgs');
const LOG_FILE = path.join(__dirname, 'scraped_data', 'webp-convert.log');
const FAIL_FILE = path.join(__dirname, 'scraped_data', 'webp-convert-failures.txt');

function parseArgs() {
    const a = process.argv.slice(2);
    const out = { dryRun: false, limit: null, concurrency: Math.min(8, Math.max(2, os.cpus().length - 1)), deleteOriginal: false, extFilter: null };
    for (let i = 0; i < a.length; i++) {
        if (a[i] === '--dry-run')          out.dryRun = true;
        else if (a[i] === '--delete-original') out.deleteOriginal = true;
        else if (a[i] === '--limit')       out.limit = parseInt(a[++i], 10);
        else if (a[i] === '--concurrency') out.concurrency = parseInt(a[++i], 10);
        else if (a[i] === '--ext')         out.extFilter = a[++i].toLowerCase();
    }
    return out;
}

function log(msg) {
    const line = `[${new Date().toISOString()}] ${msg}`;
    console.log(line);
    fs.appendFileSync(LOG_FILE, line + '\n');
}

// 변환 대상 파일 수집
function collectTargets({ extFilter, limit }) {
    const allFiles = fs.readdirSync(IMG_DIR);
    const targetExts = extFilter ? [extFilter] : ['gif', 'jpg', 'jpeg', 'png'];

    const targets = [];
    const existingWebp = new Set(allFiles.filter((f) => f.toLowerCase().endsWith('.webp')));

    for (const f of allFiles) {
        const m = f.match(/\.(gif|jpg|jpeg|png)$/i);
        if (!m) continue;
        const ext = m[1].toLowerCase();
        if (!targetExts.includes(ext)) continue;

        // 이미 .webp 짝꿍이 있으면 스킵 (이전 변환된 거)
        const webpName = toWebPFilename(f);
        if (existingWebp.has(webpName)) continue;

        targets.push(f);
        if (limit && targets.length >= limit) break;
    }
    return targets;
}

async function convertOne(filename, { dryRun, deleteOriginal }) {
    const src = path.join(IMG_DIR, filename);
    const ext = path.extname(filename).slice(1).toLowerCase();
    const dest = path.join(IMG_DIR, toWebPFilename(filename));

    try {
        const buf = fs.readFileSync(src);
        const { buffer: webpBuf, originalSize, finalSize } = await toWebP(buf, ext);

        if (!dryRun) {
            fs.writeFileSync(dest, webpBuf);
            if (deleteOriginal && dest !== src) {
                fs.unlinkSync(src);
            }
        }
        return { ok: true, filename, originalSize, finalSize };
    } catch (e) {
        return { ok: false, filename, error: e.message };
    }
}

// 동시 N개 처리 (Promise pool)
async function runPool(items, concurrency, worker, onResult) {
    let i = 0;
    async function next() {
        while (i < items.length) {
            const idx = i++;
            const r = await worker(items[idx]);
            onResult(r, idx);
        }
    }
    await Promise.all(Array.from({ length: concurrency }, () => next()));
}

async function main() {
    const opts = parseArgs();
    log(`=== bulk-convert-to-webp 시작 ===`);
    log(`설정: dryRun=${opts.dryRun}, limit=${opts.limit ?? '전체'}, concurrency=${opts.concurrency}, deleteOriginal=${opts.deleteOriginal}, ext=${opts.extFilter ?? '전체'}`);

    const targets = collectTargets(opts);
    log(`대상 파일: ${targets.length} 개`);
    if (targets.length === 0) { log('변환할 파일 없음. 종료.'); return; }

    const totalStart = Date.now();
    let done = 0, failed = 0;
    let totalOriginal = 0, totalFinal = 0;
    const failures = [];

    await runPool(targets, opts.concurrency, (f) => convertOne(f, opts), (r, idx) => {
        done++;
        if (r.ok) {
            totalOriginal += r.originalSize;
            totalFinal    += r.finalSize;
            const ratio = ((r.finalSize / r.originalSize) * 100).toFixed(0);
            if (done % 100 === 0 || idx < 5) {
                log(`[${done}/${targets.length}] ${r.filename}: ${(r.originalSize / 1024).toFixed(0)}KB → ${(r.finalSize / 1024).toFixed(0)}KB (${ratio}%)`);
            }
        } else {
            failed++;
            failures.push(r.filename + '\t' + r.error);
            log(`[FAIL] ${r.filename}: ${r.error}`);
        }
    });

    const dur = ((Date.now() - totalStart) / 1000).toFixed(1);
    const saved = totalOriginal - totalFinal;
    const reduction = totalOriginal > 0 ? ((saved / totalOriginal) * 100).toFixed(1) : '0';

    log('');
    log('=== 결과 ===');
    log(`처리:     ${done - failed} 성공 / ${failed} 실패 / ${targets.length} 전체`);
    log(`원본:     ${(totalOriginal / 1024 / 1024 / 1024).toFixed(2)} GB`);
    log(`변환후:    ${(totalFinal / 1024 / 1024 / 1024).toFixed(2)} GB`);
    log(`절감:     ${(saved / 1024 / 1024 / 1024).toFixed(2)} GB (${reduction}%)`);
    log(`소요:     ${dur}초 (평균 ${(dur / done).toFixed(2)}초/건)`);

    if (failures.length > 0) {
        fs.writeFileSync(FAIL_FILE, failures.join('\n'));
        log(`실패 목록: ${FAIL_FILE}`);
    }

    if (opts.dryRun) log('\n※ dry-run 모드 — 파일 안 만들었음');
}

if (require.main === module) {
    main().catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { main, collectTargets, convertOne };
