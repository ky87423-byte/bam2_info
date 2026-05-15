/**
 * WebP 변환 유틸 — scraper.js 와 bulk-convert-to-webp.js 가 공유.
 *
 * 입력 버퍼 + 원본 확장자 → WebP 버퍼 반환.
 * - GIF (애니메이션 가능): { animated: true } 옵션 필수
 * - JPG/JPEG/PNG: 일반 변환
 * - WebP: 그대로 반환 (재변환 안 함)
 *
 * 화질 설정:
 *   - quality 85 (육안 구별 불가, 용량 70% 절감)
 *   - effort 4 (압축 효율 vs 변환 시간 균형)
 */
const sharp = require('sharp');

const DEFAULT_QUALITY = 85;
const DEFAULT_EFFORT  = 4;

/**
 * @param {Buffer} buffer
 * @param {string} originalExt  e.g. 'gif', 'jpg', 'png', 'webp', 'jpeg'
 * @param {object} opts  { quality, effort, lossless }
 * @returns {Promise<{ buffer: Buffer, converted: boolean, originalSize: number, finalSize: number }>}
 */
async function toWebP(buffer, originalExt, opts = {}) {
    const ext = String(originalExt || '').toLowerCase().replace(/^\./, '');
    const originalSize = buffer.length;

    if (ext === 'webp') {
        return { buffer, converted: false, originalSize, finalSize: originalSize };
    }

    const isAnimated = ext === 'gif';
    const quality    = opts.quality  ?? DEFAULT_QUALITY;
    const effort     = opts.effort   ?? DEFAULT_EFFORT;
    const lossless   = opts.lossless ?? false;

    const s = sharp(buffer, { animated: isAnimated });
    const out = await s.webp({ quality, effort, lossless }).toBuffer();
    return { buffer: out, converted: true, originalSize, finalSize: out.length };
}

/** 파일명을 .webp 확장자로 교체 */
function toWebPFilename(filename) {
    return filename.replace(/\.(gif|jpe?g|png|webp)$/i, '.webp');
}

module.exports = { toWebP, toWebPFilename, DEFAULT_QUALITY };
