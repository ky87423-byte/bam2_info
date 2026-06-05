# bam2_info 배포 가이드 (Shinjiru VPS, IP 직접 운영)

> 전제: 도메인 **bt-001.com (Njalla 등록)**, PostgreSQL 서버 직접 설치, 익명성 우선(외부 CDN 미사용).
> 서버: 111.90.150.89 (RAM 8GB). 아래 `<SERVER_IP>` 는 이 IP로 치환.
> Njalla DNS: A `@` → 111.90.150.89, A `www` → 111.90.150.89 (전파 후 7.5단계 certbot 실행)
> 전송 도구: Windows 로컬에 rsync가 없어 **코드 = git archive + scp / 이미지 = rclone(SFTP 병렬 전송)** 사용.
> 한국→말레이시아 고지연 구간에서는 rclone 병렬 전송이 단일 스트림 rsync보다 빠름.

## 0. SSH 키 등록 (최초 1회, 비밀번호 입력)

```powershell
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@<SERVER_IP> "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
# 확인 (비밀번호 안 물으면 성공):
ssh root@<SERVER_IP> "echo OK"
```

## 1. 서버 초기 세팅 (서버에서)

```bash
# 로컬에서 스크립트 전송
scp deploy/setup-server.sh root@<SERVER_IP>:/root/

# 서버 SSH 접속 후
bash /root/setup-server.sh
```

스크립트가 하는 일: Node 22 / PostgreSQL 18 / PM2 / nginx / rsync / tmux 설치,
DB(`bam2_info`) + 사용자(`bam2`) 생성(랜덤 비밀번호 → `/root/.bam2_db_password`),
UFW(SSH+80만 개방), opga037.com 차단 테스트.

## 2. 코드 업로드 (로컬 → 서버, 이미지 제외 먼저)

이미지(50GB)는 오래 걸리므로 코드 먼저 올려서 앱을 살린 뒤 이미지는 백그라운드로.
git에 추적된 파일만 깔끔하게 아카이브해서 전송 (node_modules/.next/격리폴더 자동 제외).

```powershell
# 로컬 (PowerShell)
git archive --format=tar.gz -o deploy\code.tar.gz HEAD
scp deploy\code.tar.gz root@<SERVER_IP>:/root/

# 서버
ssh root@<SERVER_IP> "mkdir -p /var/www/bam2_info && tar -xzf /root/code.tar.gz -C /var/www/bam2_info && rm /root/code.tar.gz"
```

## 3. DB 복원 (서버에서)

```bash
# 로컬에서 최신 덤프 전송 (.rsync-exclude가 backups/ 제외하므로 별도 전송)
scp backups/bam2_info_20260605_083425.dump root@<SERVER_IP>:/root/

# 서버에서 복원
sudo -u postgres pg_restore -d bam2_info --no-owner --role=bam2 /root/bam2_info_20260605_083425.dump
sudo -u postgres psql -d bam2_info -c "GRANT ALL ON SCHEMA public TO bam2; GRANT ALL ON ALL TABLES IN SCHEMA public TO bam2; GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO bam2;"
```

## 4. .env 작성 + 빌드 + 실행 (서버에서)

```bash
cd /var/www/bam2_info

DB_PASS=$(cat /root/.bam2_db_password)
cat > .env <<EOF
DATABASE_URL="postgresql://bam2:${DB_PASS}@localhost:5432/bam2_info?schema=public"
EOF
cat > .env.local <<EOF
AUTH_SECRET=$(openssl rand -hex 32)
AUTH_TRUST_HOST=true
EOF

npm ci
npx prisma generate
npm run build

pm2 start npm --name bam2 -- start
pm2 save
pm2 startup   # 출력되는 명령 한 번 실행 (부팅 시 자동시작)
```

## 5. Nginx 연결 (서버에서)

```bash
# 로컬에서: scp deploy/nginx-bam2.conf root@<SERVER_IP>:/etc/nginx/sites-available/bam2
ln -sf /etc/nginx/sites-available/bam2 /etc/nginx/sites-enabled/bam2
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

→ 브라우저에서 `http://<SERVER_IP>` 접속 확인 (이미지는 아직 깨짐 — 정상).

## 5.5 HTTPS 적용 (Njalla DNS 전파 확인 후, 서버에서)

```bash
# DNS 전파 확인 (서버 IP가 나오면 OK)
dig +short bt-001.com

# 인증서 발급 + nginx 자동 설정 (HTTP→HTTPS 리다이렉트 포함)
certbot --nginx -d bt-001.com -d www.bt-001.com --register-unsafely-without-email --agree-tos
# 자동 갱신은 certbot 패키지가 systemd timer로 처리
```

> 익명성: `--register-unsafely-without-email` 로 이메일 없이 발급 (만료 알림만 포기).

## 6. 이미지 업로드 (로컬에서 rclone, 50.94GB)

```powershell
# 최초 1회: SFTP 리모트 등록 (SSH 키 사용, 비밀번호 저장 안 함)
rclone config create bam2srv sftp host <SERVER_IP> user root key_file $env:USERPROFILE\.ssh\id_ed25519

# 병렬 8개 전송 + 진행률 표시. 끊겨도 재실행하면 이미 올라간 파일은 건너뜀(멱등).
rclone copy public\images bam2srv:/var/www/bam2_info/public/images `
  --transfers 8 --checkers 16 --progress --stats 30s --log-file deploy\rclone-upload.log --log-level INFO
```

- WebP는 이미 압축돼 있어 압축 옵션 불필요.
- 병렬 수는 회선 상태 보고 `--transfers 4~16` 사이로 조정.
- 완료 후 검증: `rclone check public\images bam2srv:/var/www/bam2_info/public/images --size-only`

## 7. 배포 후 확인 체크리스트

- [ ] `http://<SERVER_IP>` 메인 페이지 렌더
- [ ] 로그인/회원가입 동작 (AUTH_SECRET 새로 생성 → 기존 세션 무효는 정상)
- [ ] 어드민 `/admin/shops/source-status` 접근
- [ ] 이미지 업로드 완료 후 상세 페이지 WebP 이미지 표시
- [ ] `pm2 logs bam2` 에러 없음
- [ ] setup 스크립트의 opga037.com 차단 테스트 결과 기록

## 부록: 차단 시 스크래퍼 운영

서버에서 opga037.com이 차단된 경우: 스크래퍼는 로컬에서 계속 돌리고,
신규 이미지만 6번 rclone copy 명령 재실행으로 증분 동기화 (이미 올라간 파일은 자동 스킵).
