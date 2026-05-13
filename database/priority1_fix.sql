BEGIN;

-- =========================================================
-- PATCH BẢNG BIÊN BẢN KIỂM KÊ
-- Fix lỗi:
-- column bb.so_bien_ban does not exist
-- và bổ sung ghi_chu để khớp backend
-- =========================================================

-- 1. Thêm cột số biên bản nếu chưa có
ALTER TABLE bien_ban_kiem_ke
ADD COLUMN IF NOT EXISTS so_bien_ban VARCHAR(50);

-- 2. Thêm cột ghi chú nếu chưa có
ALTER TABLE bien_ban_kiem_ke
ADD COLUMN IF NOT EXISTS ghi_chu TEXT;

-- 3. Tạo mã biên bản cho dữ liệu cũ nếu đang NULL
UPDATE bien_ban_kiem_ke
SET so_bien_ban = 'KK-' || REPLACE(ma_bb::text, '-', '')
WHERE so_bien_ban IS NULL
   OR TRIM(so_bien_ban) = '';

-- 4. Bắt buộc so_bien_ban không được NULL
ALTER TABLE bien_ban_kiem_ke
ALTER COLUMN so_bien_ban SET NOT NULL;

-- 5. Thêm ràng buộc UNIQUE nếu chưa có
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_bien_ban_kiem_ke_so_bien_ban'
  ) THEN
    ALTER TABLE bien_ban_kiem_ke
    ADD CONSTRAINT uq_bien_ban_kiem_ke_so_bien_ban
    UNIQUE (so_bien_ban);
  END IF;
END $$;

COMMIT;