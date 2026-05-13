const pool = require('../db/pool');
const bcrypt = require('bcryptjs');

// ======================================================
// DASHBOARD QUẢN LÝ
// ======================================================
async function getDashboardSummary() {
  const [
    revenueResult,
    orderResult,
    customerResult,
    lowStockCountResult,
    lowStockProductsResult,
    recentOrdersResult,
  ] = await Promise.all([
    pool.query(`
      SELECT COALESCE(SUM(tong_tien), 0) AS doanh_thu_hom_nay
      FROM don_hang
      WHERE DATE(ngay_tao) = CURRENT_DATE
    `),

    pool.query(`
      SELECT COUNT(*)::int AS so_don_hom_nay
      FROM don_hang
      WHERE DATE(ngay_tao) = CURRENT_DATE
    `),

    pool.query(`
      SELECT COUNT(*)::int AS tong_khach_hang
      FROM khach_hang
    `),

    pool.query(`
      SELECT COUNT(*)::int AS so_san_pham_sap_het
      FROM san_pham sp
      JOIN ton_kho tk ON tk.ma_sp = sp.ma_sp
      WHERE tk.so_luong_ton <= sp.ton_toi_thieu
        AND sp.trang_thai_kinh_doanh = TRUE
    `),

    pool.query(`
      SELECT
        sp.ma_sp,
        sp.ten_sp,
        sp.ma_vach,
        sp.ton_toi_thieu,
        tk.so_luong_ton
      FROM san_pham sp
      JOIN ton_kho tk ON tk.ma_sp = sp.ma_sp
      WHERE tk.so_luong_ton <= sp.ton_toi_thieu
        AND sp.trang_thai_kinh_doanh = TRUE
      ORDER BY tk.so_luong_ton ASC
      LIMIT 5
    `),

    pool.query(`
      SELECT
        dh.ma_dh,
        dh.so_don,
        dh.ngay_tao,
        dh.tong_tien,
        dh.trang_thai,
        COALESCE(kh.ten_kh, 'Khách lẻ') AS ten_kh
      FROM don_hang dh
      LEFT JOIN khach_hang kh ON kh.ma_kh = dh.ma_kh
      ORDER BY dh.ngay_tao DESC
      LIMIT 5
    `),
  ]);

  return {
    stats: {
      doanh_thu_hom_nay: Number(
        revenueResult.rows[0]?.doanh_thu_hom_nay ?? 0
      ),
      so_don_hom_nay: Number(orderResult.rows[0]?.so_don_hom_nay ?? 0),
      tong_khach_hang: Number(customerResult.rows[0]?.tong_khach_hang ?? 0),
      so_san_pham_sap_het: Number(
        lowStockCountResult.rows[0]?.so_san_pham_sap_het ?? 0
      ),
    },
    san_pham_sap_het: lowStockProductsResult.rows,
    don_gan_day: recentOrdersResult.rows,
  };
}

// ======================================================
// DANH MỤC
// ======================================================
async function getCategories() {
  const result = await pool.query(`
    SELECT
      dm.ma_dm,
      dm.ten_dm,
      dm.mo_ta,
      COUNT(sp.ma_sp)::int AS so_luong_san_pham
    FROM danh_muc dm
    LEFT JOIN san_pham sp ON sp.ma_dm = dm.ma_dm
    GROUP BY dm.ma_dm, dm.ten_dm, dm.mo_ta
    ORDER BY dm.ten_dm ASC
  `);

  return result.rows;
}

async function createCategory({ ten_dm, mo_ta }) {
  const result = await pool.query(
    `
    INSERT INTO danh_muc (ten_dm, mo_ta)
    VALUES ($1, $2)
    RETURNING ma_dm, ten_dm, mo_ta
    `,
    [ten_dm, mo_ta || null]
  );

  return result.rows[0];
}

async function updateCategory(ma_dm, { ten_dm, mo_ta }) {
  const result = await pool.query(
    `
    UPDATE danh_muc
    SET ten_dm = $1,
        mo_ta = $2
    WHERE ma_dm = $3
    RETURNING ma_dm, ten_dm, mo_ta
    `,
    [ten_dm, mo_ta || null, ma_dm]
  );

  return result.rows[0] || null;
}

async function deleteCategory(ma_dm) {
  const countResult = await pool.query(
    `
    SELECT COUNT(*)::int AS total
    FROM san_pham
    WHERE ma_dm = $1
    `,
    [ma_dm]
  );

  if ((countResult.rows[0]?.total ?? 0) > 0) {
    const error = new Error('Danh mục đang có sản phẩm, không thể xóa');
    error.statusCode = 409;
    throw error;
  }

  const result = await pool.query(
    `
    DELETE FROM danh_muc
    WHERE ma_dm = $1
    RETURNING ma_dm
    `,
    [ma_dm]
  );

  return result.rows[0] || null;
}

// ======================================================
// SẢN PHẨM
// ======================================================
async function getProducts(keyword = '') {
  const q = `%${keyword.trim()}%`;

  const result = await pool.query(
    `
    SELECT
      sp.ma_sp,
      sp.ma_dm,
      dm.ten_dm,
      sp.ten_sp,
      sp.don_vi_tinh,
      sp.ma_vach,
      sp.gia_ban,
      sp.gia_nhap,
      sp.ton_toi_thieu,
      sp.trang_thai_kinh_doanh,
      sp.hinh_anh,
      COALESCE(tk.so_luong_ton, 0) AS so_luong_ton
    FROM san_pham sp
    LEFT JOIN danh_muc dm ON dm.ma_dm = sp.ma_dm
    LEFT JOIN ton_kho tk ON tk.ma_sp = sp.ma_sp
    WHERE
      $1 = '%%'
      OR sp.ten_sp ILIKE $1
      OR sp.ma_vach ILIKE $1
      OR dm.ten_dm ILIKE $1
    ORDER BY sp.ten_sp ASC
    `,
    [q]
  );

  return result.rows;
}

async function createProduct(payload) {
  const {
    ma_dm,
    ten_sp,
    don_vi_tinh,
    ma_vach,
    gia_ban,
    gia_nhap,
    ton_toi_thieu,
    trang_thai_kinh_doanh,
    hinh_anh,
  } = payload;

  const result = await pool.query(
    `
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
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *
    `,
    [
      ma_dm,
      ten_sp,
      don_vi_tinh,
      ma_vach,
      gia_ban,
      gia_nhap,
      ton_toi_thieu,
      trang_thai_kinh_doanh ?? true,
      hinh_anh || null,
    ]
  );

  return result.rows[0];
}

async function updateProduct(ma_sp, payload) {
  const {
    ma_dm,
    ten_sp,
    don_vi_tinh,
    ma_vach,
    gia_ban,
    gia_nhap,
    ton_toi_thieu,
    trang_thai_kinh_doanh,
    hinh_anh,
  } = payload;

  const result = await pool.query(
    `
    UPDATE san_pham
    SET
      ma_dm = $1,
      ten_sp = $2,
      don_vi_tinh = $3,
      ma_vach = $4,
      gia_ban = $5,
      gia_nhap = $6,
      ton_toi_thieu = $7,
      trang_thai_kinh_doanh = $8,
      hinh_anh = $9
    WHERE ma_sp = $10
    RETURNING *
    `,
    [
      ma_dm,
      ten_sp,
      don_vi_tinh,
      ma_vach,
      gia_ban,
      gia_nhap,
      ton_toi_thieu,
      trang_thai_kinh_doanh ?? true,
      hinh_anh || null,
      ma_sp,
    ]
  );

  return result.rows[0] || null;
}

async function updateProductStatus(ma_sp, status) {
  const result = await pool.query(
    `
    UPDATE san_pham
    SET trang_thai_kinh_doanh = $1
    WHERE ma_sp = $2
    RETURNING ma_sp, ten_sp, trang_thai_kinh_doanh
    `,
    [status, ma_sp]
  );

  return result.rows[0] || null;
}

// ======================================================
// NHÀ CUNG CẤP
// ======================================================
async function getSuppliers(keyword = '') {
  const q = `%${keyword.trim()}%`;

  const result = await pool.query(
    `
    SELECT
      ma_ncc,
      ten_ncc,
      sdt,
      dia_chi,
      email,
      ma_so_thue
    FROM nha_cung_cap
    WHERE
      $1 = '%%'
      OR ten_ncc ILIKE $1
      OR sdt ILIKE $1
      OR email ILIKE $1
      OR ma_so_thue ILIKE $1
    ORDER BY ten_ncc ASC
    `,
    [q]
  );

  return result.rows;
}

async function createSupplier(payload) {
  const result = await pool.query(
    `
    INSERT INTO nha_cung_cap (
      ten_ncc,
      sdt,
      dia_chi,
      email,
      ma_so_thue
    )
    VALUES ($1,$2,$3,$4,$5)
    RETURNING *
    `,
    [
      payload.ten_ncc,
      payload.sdt || null,
      payload.dia_chi || null,
      payload.email || null,
      payload.ma_so_thue || null,
    ]
  );

  return result.rows[0];
}

async function updateSupplier(ma_ncc, payload) {
  const result = await pool.query(
    `
    UPDATE nha_cung_cap
    SET
      ten_ncc = $1,
      sdt = $2,
      dia_chi = $3,
      email = $4,
      ma_so_thue = $5
    WHERE ma_ncc = $6
    RETURNING *
    `,
    [
      payload.ten_ncc,
      payload.sdt || null,
      payload.dia_chi || null,
      payload.email || null,
      payload.ma_so_thue || null,
      ma_ncc,
    ]
  );

  return result.rows[0] || null;
}

async function deleteSupplier(ma_ncc) {
  const countResult = await pool.query(
    `
    SELECT COUNT(*)::int AS total
    FROM phieu_nhap
    WHERE ma_ncc = $1
    `,
    [ma_ncc]
  );

  if ((countResult.rows[0]?.total ?? 0) > 0) {
    const error = new Error(
      'Nhà cung cấp đã phát sinh phiếu nhập, không thể xóa'
    );
    error.statusCode = 409;
    throw error;
  }

  const result = await pool.query(
    `
    DELETE FROM nha_cung_cap
    WHERE ma_ncc = $1
    RETURNING ma_ncc
    `,
    [ma_ncc]
  );

  return result.rows[0] || null;
}

// ======================================================
// CÔNG NỢ
// ======================================================
async function getDebts({ keyword = '', type = '' }) {
  const q = `%${keyword.trim()}%`;

  const result = await pool.query(
    `
    SELECT
      scn.ma_so,
      scn.loai::text AS loai,
      scn.ma_kh,
      scn.ma_ncc,
      scn.so_du_hien_tai,
      COALESCE(kh.ten_kh, ncc.ten_ncc, 'Không xác định') AS doi_tuong,
      COALESCE(kh.sdt, ncc.sdt, '') AS sdt
    FROM so_cong_no scn
    LEFT JOIN khach_hang kh ON kh.ma_kh = scn.ma_kh
    LEFT JOIN nha_cung_cap ncc ON ncc.ma_ncc = scn.ma_ncc
    WHERE
      ($1 = '' OR scn.loai::text = $1)
      AND (
        $2 = '%%'
        OR COALESCE(kh.ten_kh, ncc.ten_ncc, '') ILIKE $2
        OR COALESCE(kh.sdt, ncc.sdt, '') ILIKE $2
      )
    ORDER BY scn.so_du_hien_tai DESC
    `,
    [type, q]
  );

  const summaryResult = await pool.query(`
    SELECT
      COALESCE(SUM(CASE WHEN loai::text = 'PHAI_THU' THEN so_du_hien_tai ELSE 0 END), 0) AS tong_phai_thu,
      COALESCE(SUM(CASE WHEN loai::text = 'PHAI_TRA' THEN so_du_hien_tai ELSE 0 END), 0) AS tong_phai_tra,
      COUNT(*)::int AS tong_so_so_cong_no
    FROM so_cong_no
  `);

  return {
    summary: {
      tong_phai_thu: Number(summaryResult.rows[0]?.tong_phai_thu ?? 0),
      tong_phai_tra: Number(summaryResult.rows[0]?.tong_phai_tra ?? 0),
      tong_so_so_cong_no: Number(
        summaryResult.rows[0]?.tong_so_so_cong_no ?? 0
      ),
    },
    items: result.rows,
  };
}

// ======================================================
// BÁO CÁO
// ======================================================
async function getReportsSummary() {
  const [
    revenueToday,
    revenueAll,
    inventorySummary,
    topProducts,
    lowStockProducts,
  ] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*)::int AS so_don_hom_nay,
        COALESCE(SUM(tong_tien), 0) AS doanh_thu_hom_nay
      FROM don_hang
      WHERE DATE(ngay_tao) = CURRENT_DATE
    `),

    pool.query(`
      SELECT
        COUNT(*)::int AS tong_so_don,
        COALESCE(SUM(tong_tien), 0) AS tong_doanh_thu,
        COALESCE(SUM(giam_gia), 0) AS tong_giam_gia
      FROM don_hang
    `),

    pool.query(`
      SELECT
        COUNT(sp.ma_sp)::int AS tong_san_pham,
        COALESCE(SUM(tk.so_luong_ton), 0) AS tong_so_luong_ton,
        COALESCE(SUM(tk.so_luong_ton * sp.gia_nhap), 0) AS gia_tri_ton_kho
      FROM san_pham sp
      LEFT JOIN ton_kho tk ON tk.ma_sp = sp.ma_sp
    `),

    pool.query(`
      SELECT
        sp.ma_sp,
        sp.ten_sp,
        SUM(ct.so_luong)::int AS tong_so_luong_ban,
        COALESCE(SUM(ct.thanh_tien), 0) AS tong_doanh_thu
      FROM ct_don_hang ct
      JOIN san_pham sp ON sp.ma_sp = ct.ma_sp
      GROUP BY sp.ma_sp, sp.ten_sp
      ORDER BY tong_so_luong_ban DESC
      LIMIT 5
    `),

    pool.query(`
      SELECT
        sp.ma_sp,
        sp.ten_sp,
        sp.ma_vach,
        sp.ton_toi_thieu,
        COALESCE(tk.so_luong_ton, 0) AS so_luong_ton
      FROM san_pham sp
      LEFT JOIN ton_kho tk ON tk.ma_sp = sp.ma_sp
      WHERE COALESCE(tk.so_luong_ton, 0) <= sp.ton_toi_thieu
      ORDER BY COALESCE(tk.so_luong_ton, 0) ASC
      LIMIT 10
    `),
  ]);

  return {
    doanh_thu_hom_nay: revenueToday.rows[0],
    tong_quan_doanh_thu: revenueAll.rows[0],
    ton_kho: inventorySummary.rows[0],
    san_pham_ban_chay: topProducts.rows,
    san_pham_sap_het: lowStockProducts.rows,
  };
}

// ======================================================
// NGƯỜI DÙNG & PHÂN QUYỀN
// ======================================================
async function getUsers(keyword = '') {
  const q = `%${keyword.trim()}%`;

  const result = await pool.query(
    `
    SELECT
      ma_nd,
      ho_ten,
      ten_dang_nhap,
      email,
      vai_tro::text AS vai_tro,
      trang_thai,
      tao_luc
    FROM nguoi_dung
    WHERE
      $1 = '%%'
      OR ho_ten ILIKE $1
      OR ten_dang_nhap ILIKE $1
      OR COALESCE(email, '') ILIKE $1
      OR vai_tro::text ILIKE $1
    ORDER BY tao_luc DESC
    `,
    [q]
  );

  return result.rows;
}

async function createUser(payload) {
  const passwordHash = await bcrypt.hash(payload.mat_khau, 10);

  const result = await pool.query(
    `
    INSERT INTO nguoi_dung (
      ho_ten,
      ten_dang_nhap,
      email,
      mat_khau_hash,
      vai_tro,
      trang_thai
    )
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING
      ma_nd,
      ho_ten,
      ten_dang_nhap,
      email,
      vai_tro,
      trang_thai
    `,
    [
      payload.ho_ten,
      payload.ten_dang_nhap,
      payload.email,
      passwordHash,
      payload.vai_tro,
      payload.trang_thai ?? true,
    ]
  );

  return result.rows[0];
}

async function updateUserStatus(userId, status) {
  const result = await pool.query(
    `
    UPDATE nguoi_dung
    SET trang_thai = $1
    WHERE ma_nd = $2
    RETURNING
      ma_nd,
      ho_ten,
      ten_dang_nhap,
      email,
      vai_tro::text AS vai_tro,
      trang_thai
    `,
    [status, userId]
  );

  return result.rows[0] || null;
}
async function updateUserRole(userId, newRole) {
  const result = await pool.query(
    `
    UPDATE nguoi_dung
    SET vai_tro = $1
    WHERE ma_nd = $2
    RETURNING
      ma_nd,
      ho_ten,
      ten_dang_nhap,
      email,
      vai_tro::text AS vai_tro,
      trang_thai
    `,
    [newRole, userId]
  );

  return result.rows[0] || null;
}
module.exports = {
  getDashboardSummary,

  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,

  getProducts,
  createProduct,
  updateProduct,
  updateProductStatus,

  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,

  getDebts,

  getReportsSummary,

  getUsers,
  createUser,
  updateUserStatus,
  updateUserRole,
};