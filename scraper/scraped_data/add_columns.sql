-- nf_shop 테이블에 텔레그램 + 조회수 컬럼 추가
-- phpMyAdmin에서 실행하세요

ALTER TABLE nf_shop
  ADD COLUMN wr_telegram VARCHAR(100) NOT NULL DEFAULT '' COMMENT '텔레그램 아이디' AFTER wr_hphone,
  ADD COLUMN wr_hit INT NOT NULL DEFAULT 0 COMMENT '조회수(원본)' AFTER wr_telegram;
