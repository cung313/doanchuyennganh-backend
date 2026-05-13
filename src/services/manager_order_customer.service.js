const pool = require('../db/pool');

// ======================================================
// CUSTOMERS
// ======================================================
async function getCustomers(keyword = '') {
  const q = `%${keyword.trim()}%`;

  const result = await pool.query(
    `
    SELECT
      ma_kh,
      ten_kh,
      sdt,
      dia_chi,
      ghi_chu
    FROM khach_hang
    WHERE
      $1 = '%%'
      OR ten_kh ILIKE $1
      OR sdt ILIKE $1
      OR dia_chi ILIKE $1
      OR ghi_chu ILIKE $1
    ORDER BY ten_kh ASC
    `,
    [q]
  );

  return result.rows;
}

async function createCustomer(payload) {
  const result = await pool.query(
    `
    INSERT INTO khach_hang (
      ten_kh,
      sdt,
      dia_chi,
      ghi_chu
    )
    VALUES ($1, $2, $3, $4)
    RETURNING
      ma_kh,
      ten_kh,
      sdt,
      dia_chi,
      ghi_chu
    `,
    [
      payload.ten_kh,
      payload.sdt,
      payload.dia_chi || null,
      payload.ghi_chu || null,
    ]
  );

  return result.rows[0];
}

async function updateCustomer(ma_kh, payload) {
  const result = await pool.query(
    `
    UPDATE khach_hang
    SET
      ten_kh = $1,
      sdt = $2,
      dia_chi = $3,
      ghi_chu = $4
    WHERE ma_kh = $5
    RETURNING
      ma_kh,
      ten_kh,
      sdt,
      dia_chi,
      ghi_chu
    `,
    [
      payload.ten_kh,
      payload.sdt,
      payload.dia_chi || null,
      payload.ghi_chu || null,
      ma_kh,
    ]
  );

  return result.rows[0] || null;
}

async function deleteCustomer(ma_kh) {
  const checkResult = await pool.query(
    `
    SELECT COUNT(*)::int AS total
    FROM don_hang
    WHERE ma_kh = $1
    `,
    [ma_kh]
  );

  const totalOrders = checkResult.rows[0]?.total ?? 0;

  if (totalOrders > 0) {
    const error = new Error(
      'Khách hàng đã phát sinh đơn hàng, không thể xóa'
    );
    error.statusCode = 409;
    throw error;
  }

  const result = await pool.query(
    `
    DELETE FROM khach_hang
    WHERE ma_kh = $1
    RETURNING ma_kh
    `,
    [ma_kh]
  );

  return result.rows[0] || null;
}

// ======================================================
// ORDERS
// ======================================================
async function getOrders({
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
      COALESCE(nd.ho_ten, 'Không xác định') AS nguoi_tao,
      COUNT(ct.ma_ct)::int AS so_dong_san_pham
    FROM don_hang dh
    LEFT JOIN khach_hang kh ON kh.ma_kh = dh.ma_kh
    LEFT JOIN nguoi_dung nd ON nd.ma_nd = dh.ma_nd_tao
    LEFT JOIN ct_don_hang ct ON ct.ma_dh = dh.ma_dh
    WHERE
      ($1 = '' OR dh.trang_thai::text = $1)
      AND (
        $2 = '%%'
        OR dh.so_don ILIKE $2
        OR COALESCE(kh.ten_kh, '') ILIKE $2
        OR COALESCE(kh.sdt, '') ILIKE $2
      )
    GROUP BY
      dh.ma_dh,
      dh.so_don,
      dh.ngay_tao,
      dh.trang_thai,
      dh.giam_gia,
      dh.tong_tien,
      kh.ten_kh,
      kh.sdt,
      nd.ho_ten
    ORDER BY dh.ngay_tao DESC
    `,
    [status, q]
  );

  return result.rows;
}

async function getOrderDetail(ma_dh) {
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
      COALESCE(kh.dia_chi, '') AS dia_chi_kh,
      COALESCE(nd.ho_ten, 'Không xác định') AS nguoi_tao
    FROM don_hang dh
    LEFT JOIN khach_hang kh ON kh.ma_kh = dh.ma_kh
    LEFT JOIN nguoi_dung nd ON nd.ma_nd = dh.ma_nd_tao
    WHERE dh.ma_dh = $1
    `,
    [ma_dh]
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
    [ma_dh]
  );

  return {
    order,
    items: itemsResult.rows,
  };
}

module.exports = {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,

  getOrders,
  getOrderDetail,
};