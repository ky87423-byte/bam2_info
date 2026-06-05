#!/usr/bin/env bash
# =============================================================
# bam2_info 서버 초기 세팅 스크립트 (Shinjiru KVM VPS, Ubuntu 기준)
# 실행: root 또는 sudo 권한으로
#   bash setup-server.sh
# 멱등성: 재실행해도 안전하도록 작성됨
# =============================================================
set -euo pipefail

echo "=== [0/7] OS 확인 ==="
. /etc/os-release
echo "OS: $PRETTY_NAME"
if [[ "${ID:-}" != "ubuntu" && "${ID:-}" != "debian" ]]; then
  echo "경고: Ubuntu/Debian이 아닙니다. 패키지 명령을 수동 조정해야 할 수 있습니다."
fi

echo "=== [1/7] 시스템 업데이트 + 기본 도구 ==="
apt-get update -y
apt-get install -y curl ca-certificates gnupg rsync tmux ufw nginx

echo "=== [2/7] Node.js 22 LTS 설치 (Next.js 요구: >=20.9) ==="
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v
npm -v

echo "=== [3/7] PostgreSQL 18 설치 (로컬 덤프가 PG18 형식 — 버전 일치 필수) ==="
if ! command -v psql >/dev/null 2>&1 || ! psql --version | grep -q " 18"; then
  install -d /usr/share/postgresql-common/pgdg
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc
  CODENAME=$(. /etc/os-release && echo "$VERSION_CODENAME")
  echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt ${CODENAME}-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list
  apt-get update -y
  apt-get install -y postgresql-18
fi
systemctl enable --now postgresql
psql --version

echo "=== [4/7] DB + 사용자 생성 ==="
DB_PASS_FILE=/root/.bam2_db_password
if [[ ! -f "$DB_PASS_FILE" ]]; then
  # 강력한 랜덤 비밀번호 생성 (로컬의 '1234'를 공개 서버에서 쓰지 않음)
  openssl rand -hex 24 > "$DB_PASS_FILE"
  chmod 600 "$DB_PASS_FILE"
fi
DB_PASS=$(cat "$DB_PASS_FILE")

sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bam2') THEN
    CREATE ROLE bam2 LOGIN PASSWORD '${DB_PASS}';
  ELSE
    ALTER ROLE bam2 WITH PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;
SQL
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'bam2_info'" | grep -q 1 \
  || sudo -u postgres createdb -O bam2 bam2_info
echo "DB 준비 완료. 비밀번호는 $DB_PASS_FILE 에 저장됨."

echo "=== [5/7] PM2 설치 ==="
command -v pm2 >/dev/null 2>&1 || npm install -g pm2
pm2 -v

echo "=== [6/7] 방화벽 (SSH + HTTP/HTTPS 개방) + certbot ==="
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status
# Let's Encrypt (도메인 bt-001.com DNS 전파 후: certbot --nginx -d bt-001.com -d www.bt-001.com)
apt-get install -y certbot python3-certbot-nginx

echo "=== [7/7] opga037.com IP 차단 테스트 (말레이시아 IP 차단 여부) ==="
echo "--- curl 결과: ---"
if curl -I -s -m 15 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" https://opga037.com | head -5; then
  echo ">>> 응답 수신됨 — 서버에서 직접 스크랩 가능할 수 있음"
else
  echo ">>> 응답 없음/차단 — 스크래퍼는 로컬에서 돌리고 incremental rsync 필요"
fi

echo ""
echo "============================================="
echo " 세팅 완료. 다음 단계:"
echo " 1. 로컬에서 rsync로 코드+이미지 업로드"
echo " 2. 덤프 복원: pg_restore"
echo " 3. .env 작성 → npm ci → build → pm2"
echo " DB 비밀번호: cat $DB_PASS_FILE"
echo "============================================="
