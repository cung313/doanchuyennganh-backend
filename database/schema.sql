BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- 1. ENUM TYPES
-- =========================================================
DO $$ BEGIN
  CREATE TYPE vai_tro_enum AS ENUM ('QUAN_LY', 'NV_BAN_HANG', 'NV_KHO', 'KE_TOAN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE trang_thai_don_enum AS ENUM ('NHAP', 'XAC_NHAN', 'DA_THANH_TOAN', 'DA_HUY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE phuong_thuc_tt_enum AS ENUM ('TIEN_MAT', 'CHUYEN_KHOAN', 'THE', 'CONG_NO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE loai_cong_no_enum AS ENUM ('PHAI_THU', 'PHAI_TRA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE loai_bien_dong_kho_enum AS ENUM ('NHAP', 'XUAT', 'BAN', 'HUY_DON', 'DIEU_CHINH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE trang_thai_kiem_ke_enum AS ENUM ('NHAP', 'CHO_DUYET', 'DA_DUYET', 'TU_CHOI');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE loai_tham_chieu_kho_enum AS ENUM ('DON_HANG', 'PHIEU_NHAP', 'PHIEU_XUAT', 'KIEM_KE', 'DIEU_CHINH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================
-- 2. COMMON FUNCTIONS
-- =========================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION tao_ton_kho_mac_dinh()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO ton_kho(ma_sp, so_luong_ton)
  VALUES (NEW.ma_sp, 0)
  ON CONFLICT (ma_sp) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 3. CORE TABLES
-- =========================================================

-- 3.1 Người dùng
CREATE TABLE IF NOT EXISTS nguoi_dung (
  ma_nd UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ho_ten TEXT NOT NULL,
  ten_dang_nhap VARCHAR(60) NOT NULL UNIQUE,
  mat_khau_hash TEXT NOT NULL,
  vai_tro vai_tro_enum NOT NULL,
  trang_thai BOOLEAN NOT NULL DEFAULT TRUE,
  tao_luc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.2 Danh mục
CREATE TABLE IF NOT EXISTS danh_muc (
  ma_dm UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ten_dm TEXT NOT NULL UNIQUE,
  mo_ta TEXT,
  tao_luc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.3 Sản phẩm
CREATE TABLE IF NOT EXISTS san_pham (
  ma_sp UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_dm UUID REFERENCES danh_muc(ma_dm) ON DELETE SET NULL,
  ten_sp TEXT NOT NULL,
  don_vi_tinh VARCHAR(30) NOT NULL DEFAULT 'cai',
  ma_vach VARCHAR(80) UNIQUE,
  gia_ban NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (gia_ban >= 0),
  gia_nhap NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (gia_nhap >= 0),
  ton_toi_thieu INT NOT NULL DEFAULT 0 CHECK (ton_toi_thieu >= 0),
  trang_thai_kinh_doanh BOOLEAN NOT NULL DEFAULT TRUE,
  hinh_anh TEXT,
  tao_luc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.4 Tồn kho hiện tại
CREATE TABLE IF NOT EXISTS ton_kho (
  ma_ton UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_sp UUID NOT NULL UNIQUE REFERENCES san_pham(ma_sp) ON DELETE CASCADE,
  so_luong_ton INT NOT NULL DEFAULT 0 CHECK (so_luong_ton >= 0),
  cap_nhat_luc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.5 Khách hàng
CREATE TABLE IF NOT EXISTS khach_hang (
  ma_kh UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ten_kh TEXT NOT NULL,
  sdt VARCHAR(20),
  dia_chi TEXT,
  ghi_chu TEXT,
  tao_luc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_khach_hang_sdt UNIQUE (sdt)
);

-- 3.6 Nhà cung cấp
CREATE TABLE IF NOT EXISTS nha_cung_cap (
  ma_ncc UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ten_ncc TEXT NOT NULL,
  sdt VARCHAR(20),
  dia_chi TEXT,
  email TEXT,
  ma_so_thue TEXT,
  tao_luc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_ncc_sdt UNIQUE (sdt),
  CONSTRAINT uq_ncc_email UNIQUE (email),
  CONSTRAINT uq_ncc_mst UNIQUE (ma_so_thue)
);

-- =========================================================
-- 4. SALES
-- =========================================================

-- 4.1 Đơn hàng
CREATE TABLE IF NOT EXISTS don_hang (
  ma_dh UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  so_don VARCHAR(40) NOT NULL UNIQUE,
  ngay_tao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trang_thai trang_thai_don_enum NOT NULL DEFAULT 'NHAP',
  ma_kh UUID REFERENCES khach_hang(ma_kh) ON DELETE SET NULL,
  ma_nd_tao UUID REFERENCES nguoi_dung(ma_nd) ON DELETE SET NULL,
  giam_gia NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (giam_gia >= 0),
  tong_tien NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (tong_tien >= 0),
  ghi_chu TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.2 Chi tiết đơn hàng
CREATE TABLE IF NOT EXISTS ct_don_hang (
  ma_ct UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_dh UUID NOT NULL REFERENCES don_hang(ma_dh) ON DELETE CASCADE,
  ma_sp UUID NOT NULL REFERENCES san_pham(ma_sp) ON DELETE RESTRICT,
  so_luong INT NOT NULL CHECK (so_luong > 0),
  don_gia NUMERIC(14,2) NOT NULL CHECK (don_gia >= 0),
  thanh_tien NUMERIC(14,2) NOT NULL CHECK (thanh_tien >= 0),
  UNIQUE (ma_dh, ma_sp)
);

-- 4.3 Phiếu thu đơn hàng
CREATE TABLE IF NOT EXISTS phieu_thu (
  ma_pt UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_dh UUID NOT NULL REFERENCES don_hang(ma_dh) ON DELETE CASCADE,
  ngay_thu TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  phuong_thuc phuong_thuc_tt_enum NOT NULL,
  so_tien NUMERIC(14,2) NOT NULL CHECK (so_tien > 0),
  ma_nd_thu UUID REFERENCES nguoi_dung(ma_nd) ON DELETE SET NULL,
  ghi_chu TEXT
);

-- =========================================================
-- 5. INVENTORY IN
-- =========================================================

CREATE TABLE IF NOT EXISTS phieu_nhap (
  ma_pn UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  so_phieu VARCHAR(40) NOT NULL UNIQUE,
  ngay_nhap TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ma_ncc UUID REFERENCES nha_cung_cap(ma_ncc) ON DELETE SET NULL,
  tong_gia_tri NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (tong_gia_tri >= 0),
  phuong_thuc phuong_thuc_tt_enum NOT NULL DEFAULT 'TIEN_MAT',
  ma_nd_lap UUID REFERENCES nguoi_dung(ma_nd) ON DELETE SET NULL,
  ghi_chu TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ct_phieu_nhap (
  ma_ct UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_pn UUID NOT NULL REFERENCES phieu_nhap(ma_pn) ON DELETE CASCADE,
  ma_sp UUID NOT NULL REFERENCES san_pham(ma_sp) ON DELETE RESTRICT,
  so_luong INT NOT NULL CHECK (so_luong > 0),
  gia_nhap NUMERIC(14,2) NOT NULL CHECK (gia_nhap >= 0),
  thanh_tien NUMERIC(14,2) NOT NULL CHECK (thanh_tien >= 0),
  UNIQUE (ma_pn, ma_sp)
);

-- =========================================================
-- 6. INVENTORY OUT
-- =========================================================

CREATE TABLE IF NOT EXISTS phieu_xuat (
  ma_px UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  so_phieu VARCHAR(40) NOT NULL UNIQUE,
  ngay_xuat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ly_do TEXT,
  ma_nd_lap UUID REFERENCES nguoi_dung(ma_nd) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ct_phieu_xuat (
  ma_ct UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_px UUID NOT NULL REFERENCES phieu_xuat(ma_px) ON DELETE CASCADE,
  ma_sp UUID NOT NULL REFERENCES san_pham(ma_sp) ON DELETE RESTRICT,
  so_luong INT NOT NULL CHECK (so_luong > 0),
  UNIQUE (ma_px, ma_sp)
);

-- =========================================================
-- 7. STOCK JOURNAL
-- =========================================================

CREATE TABLE IF NOT EXISTS lich_su_kho (
  ma_ls UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thoi_gian TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  loai loai_bien_dong_kho_enum NOT NULL,
  ma_sp UUID NOT NULL REFERENCES san_pham(ma_sp) ON DELETE RESTRICT,
  so_luong_thay_doi INT NOT NULL,
  tham_chieu_loai loai_tham_chieu_kho_enum,
  tham_chieu_ma UUID,
  ghi_chu TEXT
);

-- =========================================================
-- 8. STOCK AUDIT / INVENTORY COUNT
-- =========================================================

CREATE TABLE IF NOT EXISTS bien_ban_kiem_ke (
  ma_bb UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ngay_lap TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trang_thai trang_thai_kiem_ke_enum NOT NULL DEFAULT 'CHO_DUYET',
  ly_do TEXT,
  ma_nd_lap UUID REFERENCES nguoi_dung(ma_nd) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ct_kiem_ke (
  ma_ct UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_bb UUID NOT NULL REFERENCES bien_ban_kiem_ke(ma_bb) ON DELETE CASCADE,
  ma_sp UUID NOT NULL REFERENCES san_pham(ma_sp) ON DELETE RESTRICT,
  ton_he_thong INT NOT NULL CHECK (ton_he_thong >= 0),
  ton_thuc_te INT NOT NULL CHECK (ton_thuc_te >= 0),
  chenh_lech INT NOT NULL,
  UNIQUE (ma_bb, ma_sp)
);

CREATE TABLE IF NOT EXISTS phieu_dieu_chinh_ton (
  ma_dc UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_bb UUID NOT NULL UNIQUE REFERENCES bien_ban_kiem_ke(ma_bb) ON DELETE CASCADE,
  ngay_duyet TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ly_do TEXT,
  ma_nd_duyet UUID REFERENCES nguoi_dung(ma_nd) ON DELETE SET NULL
);

-- =========================================================
-- 9. DEBT / RECEIVABLES / PAYABLES
-- =========================================================

CREATE TABLE IF NOT EXISTS so_cong_no (
  ma_so UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loai loai_cong_no_enum NOT NULL,
  ma_kh UUID REFERENCES khach_hang(ma_kh) ON DELETE CASCADE,
  ma_ncc UUID REFERENCES nha_cung_cap(ma_ncc) ON DELETE CASCADE,
  so_du_hien_tai NUMERIC(14,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (loai = 'PHAI_THU' AND ma_kh IS NOT NULL AND ma_ncc IS NULL) OR
    (loai = 'PHAI_TRA' AND ma_ncc IS NOT NULL AND ma_kh IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_so_cong_no_kh
  ON so_cong_no(ma_kh)
  WHERE ma_kh IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_so_cong_no_ncc
  ON so_cong_no(ma_ncc)
  WHERE ma_ncc IS NOT NULL;

CREATE TABLE IF NOT EXISTS phat_sinh_cong_no (
  ma_ps UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_so UUID NOT NULL REFERENCES so_cong_no(ma_so) ON DELETE CASCADE,
  ngay_ps TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  so_tien_thay_doi NUMERIC(14,2) NOT NULL,
  tham_chieu TEXT,
  tham_chieu_ma UUID,
  so_du_sau NUMERIC(14,2) NOT NULL DEFAULT 0,
  ghi_chu TEXT
);

CREATE TABLE IF NOT EXISTS phieu_thanh_toan_cong_no (
  ma_tt UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_so UUID NOT NULL REFERENCES so_cong_no(ma_so) ON DELETE CASCADE,
  ngay_tt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  phuong_thuc phuong_thuc_tt_enum NOT NULL,
  so_tien NUMERIC(14,2) NOT NULL CHECK (so_tien > 0),
  ghi_chu TEXT
);

-- =========================================================
-- 10. SESSION TABLE
-- =========================================================

CREATE TABLE IF NOT EXISTS app_sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR(30) NOT NULL, -- register / forgot_password
    expired_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_otp_email_purpose
ON otp_codes(email, purpose);
CREATE INDEX IF NOT EXISTS idx_app_sessions_expire
  ON app_sessions(expire);

-- =========================================================
-- 11. INDEXES
-- =========================================================
ALTER TABLE nguoi_dung
ADD COLUMN email TEXT;
CREATE INDEX IF NOT EXISTS idx_san_pham_ma_dm ON san_pham(ma_dm);
CREATE INDEX IF NOT EXISTS idx_san_pham_ten_sp ON san_pham(ten_sp);
CREATE INDEX IF NOT EXISTS idx_don_hang_ngay_tao ON don_hang(ngay_tao);
CREATE INDEX IF NOT EXISTS idx_don_hang_ma_kh ON don_hang(ma_kh);
CREATE INDEX IF NOT EXISTS idx_don_hang_ma_nd_tao ON don_hang(ma_nd_tao);

CREATE INDEX IF NOT EXISTS idx_ct_don_hang_ma_dh ON ct_don_hang(ma_dh);
CREATE INDEX IF NOT EXISTS idx_ct_don_hang_ma_sp ON ct_don_hang(ma_sp);

CREATE INDEX IF NOT EXISTS idx_phieu_nhap_ngay_nhap ON phieu_nhap(ngay_nhap);
CREATE INDEX IF NOT EXISTS idx_phieu_nhap_ma_ncc ON phieu_nhap(ma_ncc);
CREATE INDEX IF NOT EXISTS idx_ct_phieu_nhap_ma_pn ON ct_phieu_nhap(ma_pn);
CREATE INDEX IF NOT EXISTS idx_ct_phieu_nhap_ma_sp ON ct_phieu_nhap(ma_sp);

CREATE INDEX IF NOT EXISTS idx_phieu_xuat_ngay_xuat ON phieu_xuat(ngay_xuat);
CREATE INDEX IF NOT EXISTS idx_ct_phieu_xuat_ma_px ON ct_phieu_xuat(ma_px);
CREATE INDEX IF NOT EXISTS idx_ct_phieu_xuat_ma_sp ON ct_phieu_xuat(ma_sp);

CREATE INDEX IF NOT EXISTS idx_lich_su_kho_ma_sp ON lich_su_kho(ma_sp);
CREATE INDEX IF NOT EXISTS idx_lich_su_kho_thoi_gian ON lich_su_kho(thoi_gian);
CREATE INDEX IF NOT EXISTS idx_lich_su_kho_tham_chieu ON lich_su_kho(tham_chieu_loai, tham_chieu_ma);

CREATE INDEX IF NOT EXISTS idx_phat_sinh_cong_no_ma_so ON phat_sinh_cong_no(ma_so);
CREATE INDEX IF NOT EXISTS idx_phat_sinh_cong_no_ngay_ps ON phat_sinh_cong_no(ngay_ps);

-- =========================================================
-- 12. TRIGGERS updated_at
-- =========================================================

DROP TRIGGER IF EXISTS trg_nguoi_dung_updated_at ON nguoi_dung;
CREATE TRIGGER trg_nguoi_dung_updated_at
BEFORE UPDATE ON nguoi_dung
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_danh_muc_updated_at ON danh_muc;
CREATE TRIGGER trg_danh_muc_updated_at
BEFORE UPDATE ON danh_muc
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_san_pham_updated_at ON san_pham;
CREATE TRIGGER trg_san_pham_updated_at
BEFORE UPDATE ON san_pham
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_khach_hang_updated_at ON khach_hang;
CREATE TRIGGER trg_khach_hang_updated_at
BEFORE UPDATE ON khach_hang
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_nha_cung_cap_updated_at ON nha_cung_cap;
CREATE TRIGGER trg_nha_cung_cap_updated_at
BEFORE UPDATE ON nha_cung_cap
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_don_hang_updated_at ON don_hang;
CREATE TRIGGER trg_don_hang_updated_at
BEFORE UPDATE ON don_hang
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_phieu_nhap_updated_at ON phieu_nhap;
CREATE TRIGGER trg_phieu_nhap_updated_at
BEFORE UPDATE ON phieu_nhap
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_phieu_xuat_updated_at ON phieu_xuat;
CREATE TRIGGER trg_phieu_xuat_updated_at
BEFORE UPDATE ON phieu_xuat
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_bien_ban_kiem_ke_updated_at ON bien_ban_kiem_ke;
CREATE TRIGGER trg_bien_ban_kiem_ke_updated_at
BEFORE UPDATE ON bien_ban_kiem_ke
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_so_cong_no_updated_at ON so_cong_no;
CREATE TRIGGER trg_so_cong_no_updated_at
BEFORE UPDATE ON so_cong_no
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- 13. TRIGGER TẠO TỒN KHO MẶC ĐỊNH
-- =========================================================

DROP TRIGGER IF EXISTS trg_tao_ton_kho_mac_dinh ON san_pham;
CREATE TRIGGER trg_tao_ton_kho_mac_dinh
AFTER INSERT ON san_pham
FOR EACH ROW
EXECUTE FUNCTION tao_ton_kho_mac_dinh();

COMMIT;