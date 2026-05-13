BEGIN;

-- =========================================================
-- 1. TẠO ENUM NẾU CHƯA CÓ
-- =========================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'trang_thai_kiem_ke'
  ) THEN
    CREATE TYPE trang_thai_kiem_ke AS ENUM (
      'CHO_DUYET',
      'DA_DUYET',
      'TU_CHOI'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'loai_phieu_xuat'
  ) THEN
    CREATE TYPE loai_phieu_xuat AS ENUM (
      'XUAT_HAO_HUT',
      'XUAT_HONG',
      'XUAT_NOI_BO',
      'XUAT_KHAC'
    );
  END IF;
END $$;

-- =========================================================
-- 2. BỔ SUNG CỘT CHO BẢNG BIÊN BẢN KIỂM KÊ
-- =========================================================

ALTER TABLE bien_ban_kiem_ke
ADD COLUMN IF NOT EXISTS ma_nd_duyet UUID REFERENCES nguoi_dung(ma_nd);

ALTER TABLE bien_ban_kiem_ke
ADD COLUMN IF NOT EXISTS trang_thai trang_thai_kiem_ke DEFAULT 'CHO_DUYET';

ALTER TABLE bien_ban_kiem_ke
ADD COLUMN IF NOT EXISTS ly_do TEXT;

ALTER TABLE bien_ban_kiem_ke
ADD COLUMN IF NOT EXISTS ngay_duyet TIMESTAMP;

ALTER TABLE bien_ban_kiem_ke
ADD COLUMN IF NOT EXISTS tao_luc TIMESTAMP DEFAULT NOW();

ALTER TABLE bien_ban_kiem_ke
ADD COLUMN IF NOT EXISTS cap_nhat_luc TIMESTAMP DEFAULT NOW();

-- Nếu cột trạng thái đã tồn tại dưới kiểu text cũ thì không làm gì.
-- Nếu chưa có thì câu trên đã tạo đúng kiểu enum.

-- =========================================================
-- 3. BỔ SUNG CỘT CHO CHI TIẾT KIỂM KÊ
-- =========================================================

ALTER TABLE ct_kiem_ke
ADD COLUMN IF NOT EXISTS ton_he_thong INT DEFAULT 0;

ALTER TABLE ct_kiem_ke
ADD COLUMN IF NOT EXISTS ton_thuc_te INT DEFAULT 0;

ALTER TABLE ct_kiem_ke
ADD COLUMN IF NOT EXISTS chenh_lech INT DEFAULT 0;

ALTER TABLE ct_kiem_ke
ADD COLUMN IF NOT EXISTS ghi_chu TEXT;

-- =========================================================
-- 4. TẠO BẢNG PHIẾU ĐIỀU CHỈNH TỒN NẾU CHƯA CÓ
-- =========================================================

CREATE TABLE IF NOT EXISTS phieu_dieu_chinh_ton (
  ma_pdc UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  so_phieu VARCHAR(50) UNIQUE NOT NULL,
  ma_bb UUID REFERENCES bien_ban_kiem_ke(ma_bb),
  ngay_lap TIMESTAMP NOT NULL DEFAULT NOW(),
  ma_nd_lap UUID REFERENCES nguoi_dung(ma_nd),
  ly_do TEXT
);

-- =========================================================
-- 5. BỔ SUNG CỘT CHO PHIẾU XUẤT KHO
-- =========================================================

ALTER TABLE phieu_xuat
ADD COLUMN IF NOT EXISTS loai loai_phieu_xuat DEFAULT 'XUAT_HAO_HUT';

ALTER TABLE phieu_xuat
ADD COLUMN IF NOT EXISTS ly_do TEXT;

ALTER TABLE phieu_xuat
ADD COLUMN IF NOT EXISTS tong_gia_tri NUMERIC(14,2) DEFAULT 0;

ALTER TABLE phieu_xuat
ADD COLUMN IF NOT EXISTS tao_luc TIMESTAMP DEFAULT NOW();

-- =========================================================
-- 6. BỔ SUNG CỘT CHO CHI TIẾT PHIẾU XUẤT
-- =========================================================

ALTER TABLE ct_phieu_xuat
ADD COLUMN IF NOT EXISTS gia_xuat NUMERIC(14,2) DEFAULT 0;

ALTER TABLE ct_phieu_xuat
ADD COLUMN IF NOT EXISTS thanh_tien NUMERIC(14,2) DEFAULT 0;

-- =========================================================
-- 7. TẠO LỊCH SỬ KHO NẾU CHƯA CÓ
-- =========================================================

CREATE TABLE IF NOT EXISTS lich_su_kho (
  ma_ls UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loai VARCHAR(50) NOT NULL,
  ma_sp UUID REFERENCES san_pham(ma_sp),
  so_luong_thay_doi INT NOT NULL,
  tham_chieu_loai VARCHAR(50),
  tham_chieu_ma UUID,
  ghi_chu TEXT,
  tao_luc TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================================================
-- 8. BỔ SUNG CỘT HỦY ĐƠN
-- =========================================================

ALTER TABLE don_hang
ADD COLUMN IF NOT EXISTS ly_do_huy TEXT;

ALTER TABLE don_hang
ADD COLUMN IF NOT EXISTS ma_nd_huy UUID REFERENCES nguoi_dung(ma_nd);

ALTER TABLE don_hang
ADD COLUMN IF NOT EXISTS ngay_huy TIMESTAMP;

COMMIT;