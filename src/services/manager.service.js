const pool = require('../db/pool');

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
      doanh_thu_hom_nay: Number(revenueResult.rows[0]?.doanh_thu_hom_nay ?? 0),
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

  const totalProducts = countResult.rows[0]?.total ?? 0;

  if (totalProducts > 0) {
    const error = new Error(
      'Danh mục đang có sản phẩm, không thể xóa'
    );
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
    RETURNING
      ma_sp,
      ma_dm,
      ten_sp,
      don_vi_tinh,
      ma_vach,
      gia_ban,
      gia_nhap,
      ton_toi_thieu,
      trang_thai_kinh_doanh,
      hinh_anh
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
    RETURNING
      ma_sp,
      ma_dm,
      ten_sp,
      don_vi_tinh,
      ma_vach,
      gia_ban,
      gia_nhap,
      ton_toi_thieu,
      trang_thai_kinh_doanh,
      hinh_anh
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

async function updateProductStatus(ma_sp, trang_thai_kinh_doanh) {
  const result = await pool.query(
    `
    UPDATE san_pham
    SET trang_thai_kinh_doanh = $1
    WHERE ma_sp = $2
    RETURNING ma_sp, ten_sp, trang_thai_kinh_doanh
    `,
    [trang_thai_kinh_doanh, ma_sp]
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
};