BEGIN;

-- =========================================================
-- 1. DANH MỤC
-- =========================================================
INSERT INTO danh_muc (ten_dm, mo_ta)
VALUES
  ('Điện tử', 'Các sản phẩm điện tử dân dụng'),
  ('Gia dụng', 'Các sản phẩm gia dụng'),
  ('Văn phòng phẩm', 'Các sản phẩm văn phòng phẩm'),
  ('Thực phẩm', 'Các sản phẩm thực phẩm'),
  ('Mỹ phẩm', 'Các sản phẩm chăm sóc cá nhân')
ON CONFLICT (ten_dm) DO NOTHING;

-- =========================================================
-- 2. NGƯỜI DÙNG
-- Mật khẩu mẫu:
-- admin123
-- Lưu ý: đây chỉ là hash demo. Khi làm backend thật, nên tạo bằng bcrypt.
-- =========================================================
INSERT INTO nguoi_dung (
  ho_ten,
  ten_dang_nhap,
  mat_khau_hash,
  vai_tro,
  trang_thai,
   email
)
VALUES
  (
    'Quản trị hệ thống',
    'admin',
    '$2b$10$8wJm2Q7LwN7m4Q0m1W0M7eD7mY8M2s6A2v0lV4TqM5D0VJmP0k8uG',
    'QUAN_LY',
    TRUE
  ),
  (
    'Nguyễn Văn Bán Hàng',
    'nvbanhang',
    '$2b$10$8wJm2Q7LwN7m4Q0m1W0M7eD7mY8M2s6A2v0lV4TqM5D0VJmP0k8uG',
    'NV_BAN_HANG',
    TRUE
  ),
  (
    'Trần Thị Kho',
    'nvkho',
    '$2b$10$8wJm2Q7LwN7m4Q0m1W0M7eD7mY8M2s6A2v0lV4TqM5D0VJmP0k8uG',
    'NV_KHO',
    TRUE
  ),
  (
    'Lê Thị Kế Toán',
    'ketoan',
    '$2b$10$8wJm2Q7LwN7m4Q0m1W0M7eD7mY8M2s6A2v0lV4TqM5D0VJmP0k8uG',
    'KE_TOAN',
    TRUE
  )
ON CONFLICT (ten_dang_nhap) DO NOTHING;

-- =========================================================
-- 3. KHÁCH HÀNG
-- =========================================================
INSERT INTO khach_hang (ten_kh, sdt, dia_chi, ghi_chu)
VALUES
  ('Nguyễn Minh Anh', '0901000001', 'Quận 1, TP.HCM', 'Khách lẻ'),
  ('Trần Quốc Bảo', '0901000002', 'Quận 3, TP.HCM', 'Khách quen'),
  ('Công ty TNHH ABC', '0901000003', 'Thủ Đức, TP.HCM', 'Khách doanh nghiệp'),
  ('Phạm Thu Hà', '0901000004', 'Biên Hòa, Đồng Nai', 'Khách mới'),
  ('Lê Hoàng Nam', '0901000005', 'Dĩ An, Bình Dương', 'Khách mua sỉ')
ON CONFLICT (sdt) DO NOTHING;

-- =========================================================
-- 4. NHÀ CUNG CẤP
-- =========================================================
INSERT INTO nha_cung_cap (ten_ncc, sdt, dia_chi, email, ma_so_thue)
VALUES
  ('Công ty Phân phối Điện tử Sao Việt', '0912000001', 'Quận 7, TP.HCM', 'saoviet@ncc.com', '0312345678'),
  ('Công ty Gia dụng Hoàng Gia', '0912000002', 'Tân Bình, TP.HCM', 'hoanggia@ncc.com', '0312345679'),
  ('Công ty VPP Minh Phát', '0912000003', 'Gò Vấp, TP.HCM', 'minhphat@ncc.com', '0312345680'),
  ('Công ty Thực phẩm An Khang', '0912000004', 'Bình Tân, TP.HCM', 'ankhang@ncc.com', '0312345681'),
  ('Công ty Mỹ phẩm Thiên Nhiên', '0912000005', 'Quận 10, TP.HCM', 'thiennhien@ncc.com', '0312345682')
ON CONFLICT DO NOTHING;

-- =========================================================
-- 5. SẢN PHẨM
-- =========================================================
INSERT INTO san_pham (
  ma_dm,
  ten_sp,
  don_vi_tinh,
  ma_vach,
  gia_ban,
  gia_nhap,
  ton_toi_thieu,
  trang_thai_kinh_doanh,
  hinh_anh
)
SELECT
  dm.ma_dm,
  x.ten_sp,
  x.don_vi_tinh,
  x.ma_vach,
  x.gia_ban,
  x.gia_nhap,
  x.ton_toi_thieu,
  TRUE,
  x.hinh_anh
FROM (
  VALUES
    ('Điện tử', 'Tai nghe Bluetooth X100', 'cai', 'SP001', 450000, 300000, 10, 'tai-nghe-bluetooth.jpg'),
    ('Điện tử', 'Chuột không dây M20', 'cai', 'SP002', 250000, 150000, 15, 'chuot-khong-day.jpg'),
    ('Gia dụng', 'Nồi cơm điện Mini', 'cai', 'SP003', 890000, 650000, 5, 'noi-com-dien.jpg'),
    ('Gia dụng', 'Bình siêu tốc 1.8L', 'cai', 'SP004', 420000, 280000, 8, 'binh-sieu-toc.jpg'),
    ('Văn phòng phẩm', 'Giấy A4 Double A', 'ram', 'SP005', 78000, 62000, 20, 'giay-a4.jpg'),
    ('Văn phòng phẩm', 'Bút bi Thiên Long', 'hop', 'SP006', 50000, 35000, 30, 'but-bi.jpg'),
    ('Thực phẩm', 'Bánh quy bơ hộp', 'hop', 'SP007', 120000, 90000, 12, 'banh-quy-bo.jpg'),
    ('Thực phẩm', 'Cà phê rang xay 500g', 'goi', 'SP008', 165000, 120000, 10, 'ca-phe.jpg'),
    ('Mỹ phẩm', 'Sữa rửa mặt dịu nhẹ', 'tuyp', 'SP009', 145000, 100000, 10, 'sua-rua-mat.jpg'),
    ('Mỹ phẩm', 'Kem dưỡng ẩm ban đêm', 'hop', 'SP010', 320000, 240000, 6, 'kem-duong-am.jpg')
) AS x(ten_dm, ten_sp, don_vi_tinh, ma_vach, gia_ban, gia_nhap, ton_toi_thieu, hinh_anh)
JOIN danh_muc dm ON dm.ten_dm = x.ten_dm
ON CONFLICT (ma_vach) DO NOTHING;

-- =========================================================
-- 6. CẬP NHẬT TỒN KHO BAN ĐẦU
-- Trigger đã tự tạo bản ghi ton_kho khi thêm sản phẩm
-- Giờ cập nhật số lượng tồn đầu kỳ
-- =========================================================
UPDATE ton_kho tk
SET so_luong_ton = x.so_luong_ton,
    cap_nhat_luc = NOW()
FROM (
  SELECT sp.ma_sp, 25 AS so_luong_ton FROM san_pham sp WHERE sp.ma_vach = 'SP001'
  UNION ALL
  SELECT sp.ma_sp, 40 AS so_luong_ton FROM san_pham sp WHERE sp.ma_vach = 'SP002'
  UNION ALL
  SELECT sp.ma_sp, 12 AS so_luong_ton FROM san_pham sp WHERE sp.ma_vach = 'SP003'
  UNION ALL
  SELECT sp.ma_sp, 18 AS so_luong_ton FROM san_pham sp WHERE sp.ma_vach = 'SP004'
  UNION ALL
  SELECT sp.ma_sp, 60 AS so_luong_ton FROM san_pham sp WHERE sp.ma_vach = 'SP005'
  UNION ALL
  SELECT sp.ma_sp, 80 AS so_luong_ton FROM san_pham sp WHERE sp.ma_vach = 'SP006'
  UNION ALL
  SELECT sp.ma_sp, 22 AS so_luong_ton FROM san_pham sp WHERE sp.ma_vach = 'SP007'
  UNION ALL
  SELECT sp.ma_sp, 16 AS so_luong_ton FROM san_pham sp WHERE sp.ma_vach = 'SP008'
  UNION ALL
  SELECT sp.ma_sp, 20 AS so_luong_ton FROM san_pham sp WHERE sp.ma_vach = 'SP009'
  UNION ALL
  SELECT sp.ma_sp, 14 AS so_luong_ton FROM san_pham sp WHERE sp.ma_vach = 'SP010'
) AS x
WHERE tk.ma_sp = x.ma_sp;

-- =========================================================
-- 7. LỊCH SỬ KHO BAN ĐẦU
-- =========================================================
INSERT INTO lich_su_kho (
  loai,
  ma_sp,
  so_luong_thay_doi,
  tham_chieu_loai,
  tham_chieu_ma,
  ghi_chu
)
SELECT
  'NHAP',
  tk.ma_sp,
  tk.so_luong_ton,
  NULL,
  NULL,
  'Khởi tạo tồn kho ban đầu'
FROM ton_kho tk
WHERE tk.so_luong_ton > 0;

COMMIT;