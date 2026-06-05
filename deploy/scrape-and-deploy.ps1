<#
  scrape-and-deploy.ps1 — 스크래핑 → 서버 반영을 한 방에.

  실행:  pwsh deploy\scrape-and-deploy.ps1
  옵션:  -SkipScrape   이미 받아둔 scraped_data/이미지로 서버 반영만
         -SkipImages   이미지 업로드 건너뜀 (데이터만 갱신)

  하는 일:
    1. 로컬 스크래핑 (npm run scrape) — Puppeteer, 이미지/shops.json 생성
    2. 새 이미지 → 서버 업로드 (rclone, 기존 파일은 자동 스킵)
    3. shops.json + urls.json → 서버 전송 (scp)
    4. 서버 DB 동기화 (SSH 내부에서 sync API 호출 — SNI 차단 무관)

  git push 는 여기서 안 함. 코드(scraper.js 등)를 고쳤을 때만 따로 push 하면 됨.
#>
param(
  [switch]$SkipScrape,
  [switch]$SkipImages
)
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$Server  = "111.90.150.89"
$KeyFile = "$env:USERPROFILE\.ssh\bam2_deploy"
$Rclone  = "C:\Users\User\AppData\Local\Microsoft\WinGet\Packages\Rclone.Rclone_Microsoft.Winget.Source_8wekyb3d8bbwe\rclone-v1.74.2-windows-amd64\rclone.exe"
$SyncKey = (Get-Content "$PSScriptRoot\.sync-api-key" -Raw).Trim()

function Step($n, $msg) { Write-Host "`n[$n] $msg" -ForegroundColor Cyan }

# 1. 스크래핑 ------------------------------------------------------------
if (-not $SkipScrape) {
  Step 1 "로컬 스크래핑 (npm run scrape)"
  Push-Location "$ProjectRoot\scraper"
  try { npm run scrape } finally { Pop-Location }
} else { Step 1 "스크래핑 건너뜀 (-SkipScrape)" }

# 2. 이미지 업로드 -------------------------------------------------------
if (-not $SkipImages) {
  Step 2 "새 이미지 업로드 (rclone, 기존 파일 자동 스킵)"
  & $Rclone copy "$ProjectRoot\public\images" "bam2srv:/var/www/bam2_info/public/images" `
    --transfers 8 --checkers 16 --stats 30s --stats-one-line
} else { Step 2 "이미지 업로드 건너뜀 (-SkipImages)" }

# 3. 데이터 전송 ---------------------------------------------------------
Step 3 "shops.json + urls.json → 서버 전송"
scp -i $KeyFile -o BatchMode=yes `
  "$ProjectRoot\scraper\scraped_data\shops.json" `
  "$ProjectRoot\scraper\scraped_data\urls.json" `
  "root@${Server}:/var/www/bam2_info/scraper/scraped_data/"

# 4. 서버 DB 동기화 (SSH 내부에서 호출 → 도메인 SNI 차단 무관) -----------
Step 4 "서버 DB 동기화 (shops upsert + 가시성)"
$remote = @"
set -e
echo '  → shops 동기화...'
curl -fsS -X POST -H 'X-Sync-Key: $SyncKey' http://127.0.0.1:3000/api/admin/sync | head -c 400; echo
echo '  → 가시성 동기화...'
curl -fsS -X POST -H 'X-Sync-Key: $SyncKey' http://127.0.0.1:3000/api/admin/sync/visibility | head -c 400; echo
"@
ssh -i $KeyFile -o BatchMode=yes "root@$Server" $remote

Write-Host "`n✅ 완료 — https://bt-001.com 에 반영됨" -ForegroundColor Green
