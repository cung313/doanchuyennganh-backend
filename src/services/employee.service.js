const pool = require('../db/pool');
const bcrypt = require('bcryptjs');

// ======================================================
// 1. THÔNG TIN TÀI KHOẢN
// ======================================================
async function getProfile(userId) {
  const result = await pool.query(
    `
    SELECT
      ma_nd,
      ho_ten,
      ten_dang_nhap,
      email,
      vai_tro,
      trang_thai,
      tao_luc
    FROM nguoi_dung
    WHERE ma_nd = $1
    `,
    [userId]
  );

  return result.rows[0] || null;
}

// ======================================================
// 2. ĐỔI MẬT KHẨU
// ======================================================
async function changePassword({
  userId,
  currentPassword,
  newPassword,
}) {
  const userResult = await pool.query(
    `
    SELECT
      ma_nd,
      mat_khau_hash
    FROM nguoi_dung
    WHERE ma_nd = $1
    `,
    [userId]
  );

  const user = userResult.rows[0];

  if (!user) {
    const error = new Error('Không tìm thấy tài khoản');
    error.statusCode = 404;
    throw error;
  }

  const isCorrectPassword = await bcrypt.compare(
    currentPassword,
    user.mat_khau_hash
  );

  if (!isCorrectPassword) {
    const error = new Error('Mật khẩu hiện tại không đúng');
    error.statusCode = 400;
    throw error;
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  await pool.query(
    `
    UPDATE nguoi_dung
    SET mat_khau_hash = $1
    WHERE ma_nd = $2
    `,
    [newPasswordHash, userId]
  );

  return true;
}

// ======================================================
// 3. DANH SÁCH ĐƠN CỦA TÔI
// ======================================================
async function getMyOrders({
  userId,
  keyword = '',
  status = '',
}) {
  const q = `%${keyword.trim()}%`;

  const result = await pool.query(
    `
    SELECT
      dh.ma_dh,
      dh.so_don,
      dh.ngay_tao,
      dh.trang_thai::text AS trang_thai,
      dh.giam_gia,
      dh.tong_tien,
      COALESCE(kh.ten_kh, 'Khách lẻ') AS ten_kh,
      COALESCE(kh.sdt, '') AS sdt_kh,
      COUNT(ct.ma_ct)::int AS so_dong_san_pham
    FROM don_hang dh
    LEFT JOIN khach_hang kh ON kh.ma_kh = dh.ma_kh
    LEFT JOIN ct_don_hang ct ON ct.ma_dh = dh.ma_dh
    WHERE
      dh.ma_nd_tao = $1
      AND ($2 = '' OR dh.trang_thai::text = $2)
      AND (
        $3 = '%%'
        OR dh.so_don ILIKE $3
        OR COALESCE(kh.ten_kh, '') ILIKE $3
        OR COALESCE(kh.sdt, '') ILIKE $3
      )
    GROUP BY
      dh.ma_dh,
      dh.so_don,
      dh.ngay_tao,
      dh.trang_thai,
      dh.giam_gia,
      dh.tong_tien,
      kh.ten_kh,
      kh.sdt
    ORDER BY dh.ngay_tao DESC
    `,
    [userId, status, q]
  );

  return result.rows;
}

// ======================================================
// 4. CHI TIẾT ĐƠN CỦA TÔI
// ======================================================
async function getMyOrderDetail({
  userId,
  orderId,
}) {
  const orderResult = await pool.query(
    `
    SELECT
      dh.ma_dh,
      dh.so_don,
      dh.ngay_tao,
      dh.trang_thai::text AS trang_thai,
      dh.giam_gia,
      dh.tong_tien,
      COALESCE(kh.ten_kh, 'Khách lẻ') AS ten_kh,
      COALESCE(kh.sdt, '') AS sdt_kh,
      COALESCE(kh.dia_chi, '') AS dia_chi_kh
    FROM don_hang dh
    LEFT JOIN khach_hang kh ON kh.ma_kh = dh.ma_kh
    WHERE
      dh.ma_dh = $1
      AND dh.ma_nd_tao = $2
    `,
    [orderId, userId]
  );

  const order = orderResult.rows[0] || null;

  if (!order) {
    return null;
  }

  const itemsResult = await pool.query(
    `
    SELECT
      ct.ma_ct,
      ct.ma_sp,
      sp.ten_sp,
      sp.ma_vach,
      ct.so_luong,
      ct.don_gia,
      ct.thanh_tien
    FROM ct_don_hang ct
    LEFT JOIN san_pham sp ON sp.ma_sp = ct.ma_sp
    WHERE ct.ma_dh = $1
    ORDER BY sp.ten_sp ASC
    `,
    [orderId]
  );

  return {
    order,
    items: itemsResult.rows,
  };
}

// ======================================================
// 5. THÔNG BÁO NHÂN VIÊN BÁN HÀNG
// ======================================================
async function getEmployeeNotifications(userId) {
  const [
    outOfStockResult,
    lowStockResult,
    draftOrdersResult,
  ] = await Promise.all([
    pool.query(`
      SELECT
        sp.ma_sp,
        sp.ten_sp,
        sp.ma_vach,
        COALESCE(tk.so_luong_ton, 0) AS so_luong_ton
      FROM san_pham sp
      LEFT JOIN ton_kho tk ON tk.ma_sp = sp.ma_sp
      WHERE
        sp.trang_thai_kinh_doanh = TRUE
        AND COALESCE(tk.so_luong_ton, 0) = 0
      ORDER BY sp.ten_sp ASC
      LIMIT 10
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
      WHERE
        sp.trang_thai_kinh_doanh = TRUE
        AND COALESCE(tk.so_luong_ton, 0) > 0
        AND COALESCE(tk.so_luong_ton, 0) <= sp.ton_toi_thieu
      ORDER BY COALESCE(tk.so_luong_ton, 0) ASC
      LIMIT 10
    `),

    pool.query(
      `
      SELECT
        ma_dh,
        so_don,
        ngay_tao,
        tong_tien
      FROM don_hang
      WHERE
        ma_nd_tao = $1
        AND trang_thai::text = 'NHAP'
      ORDER BY ngay_tao DESC
      LIMIT 10
      `,
      [userId]
    ),
  ]);

  const items = [];

  for (const item of outOfStockResult.rows) {
    items.push({
      type: 'OUT_OF_STOCK',
      level: 'danger',
      title: 'Sản phẩm đã hết hàng',
      message: `${item.ten_sp} (${item.ma_vach}) hiện không còn tồn kho.`,
      data: item,
    });
  }

  for (const item of lowStockResult.rows) {
    items.push({
      type: 'LOW_STOCK',
      level: 'warning',
      title: 'Sản phẩm sắp hết hàng',
      message:
        `${item.ten_sp} còn ${item.so_luong_ton} sản phẩm, ` +
        `ngưỡng cảnh báo là ${item.ton_toi_thieu}.`,
      data: item,
    });
  }

  for (const item of draftOrdersResult.rows) {
    items.push({
      type: 'DRAFT_ORDER',
      level: 'info',
      title: 'Đơn nháp cần hoàn tất',
      message: `Đơn ${item.so_don} đang ở trạng thái nháp.`,
      data: item,
    });
  }

  return {
    count: items.length,
    summary: {
      het_hang: outOfStockResult.rows.length,
      sap_het: lowStockResult.rows.length,
      don_nhap: draftOrdersResult.rows.length,
    },
    items,
  };
}

module.exports = {
  getProfile,
  changePassword,

  getMyOrders,
  getMyOrderDetail,

  getEmployeeNotifications,
};