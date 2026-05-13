const pool = require('../db/pool');

// ======================================================
// 1. TỔNG QUAN KHO
// ======================================================
async function getWarehouseSummary() {
  const [
    totalProductsResult,
    totalStockResult,
    inventoryValueResult,
    lowStockCountResult,
    lowStockProductsResult,
  ] = await Promise.all([
    pool.query(`
      SELECT COUNT(*)::int AS tong_san_pham
      FROM san_pham
      WHERE trang_thai_kinh_doanh = TRUE
    `),

    pool.query(`
      SELECT COALESCE(SUM(so_luong_ton), 0)::int AS tong_so_luong_ton
      FROM ton_kho
    `),

    pool.query(`
      SELECT COALESCE(SUM(tk.so_luong_ton * sp.gia_nhap), 0) AS gia_tri_ton_kho
      FROM ton_kho tk
      JOIN san_pham sp ON sp.ma_sp = tk.ma_sp
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
        sp.don_vi_tinh,
        sp.ton_toi_thieu,
        tk.so_luong_ton
      FROM san_pham sp
      JOIN ton_kho tk ON tk.ma_sp = sp.ma_sp
      WHERE tk.so_luong_ton <= sp.ton_toi_thieu
        AND sp.trang_thai_kinh_doanh = TRUE
      ORDER BY tk.so_luong_ton ASC, sp.ten_sp ASC
      LIMIT 10
    `),
  ]);

  return {
    stats: {
      tong_san_pham: Number(totalProductsResult.rows[0]?.tong_san_pham ?? 0),
      tong_so_luong_ton: Number(
        totalStockResult.rows[0]?.tong_so_luong_ton ?? 0
      ),
      gia_tri_ton_kho: Number(
        inventoryValueResult.rows[0]?.gia_tri_ton_kho ?? 0
      ),
      so_san_pham_sap_het: Number(
        lowStockCountResult.rows[0]?.so_san_pham_sap_het ?? 0
      ),
    },
    san_pham_sap_het: lowStockProductsResult.rows,
  };
}

// ======================================================
// 2. DANH SÁCH TỒN KHO
// ======================================================
async function getStockItems(keyword = '') {
  const q = `%${keyword.trim()}%`;

  const result = await pool.query(
    `
    SELECT
      sp.ma_sp,
      sp.ten_sp,
      sp.ma_vach,
      sp.don_vi_tinh,
      sp.gia_nhap,
      sp.gia_ban,
      sp.ton_toi_thieu,
      sp.trang_thai_kinh_doanh,
      COALESCE(tk.so_luong_ton, 0) AS so_luong_ton,
      tk.cap_nhat_luc,
      CASE
        WHEN COALESCE(tk.so_luong_ton, 0) = 0 THEN 'HET_HANG'
        WHEN COALESCE(tk.so_luong_ton, 0) <= sp.ton_toi_thieu THEN 'SAP_HET'
        ELSE 'BINH_THUONG'
      END AS trang_thai_ton
    FROM san_pham sp
    LEFT JOIN ton_kho tk ON tk.ma_sp = sp.ma_sp
    WHERE
      $1 = '%%'
      OR sp.ten_sp ILIKE $1
      OR sp.ma_vach ILIKE $1
    ORDER BY
      CASE
        WHEN COALESCE(tk.so_luong_ton, 0) = 0 THEN 1
        WHEN COALESCE(tk.so_luong_ton, 0) <= sp.ton_toi_thieu THEN 2
        ELSE 3
      END,
      sp.ten_sp ASC
    `,
    [q]
  );

  return result.rows;
}

// ======================================================
// 3. DỮ LIỆU CHỌN CHO PHIẾU NHẬP
// ======================================================
async function getReceiptFormOptions() {
  const [suppliersResult, productsResult] = await Promise.all([
    pool.query(`
      SELECT
        ma_ncc,
        ten_ncc,
        sdt,
        email
      FROM nha_cung_cap
      ORDER BY ten_ncc ASC
    `),

    pool.query(`
      SELECT
        sp.ma_sp,
        sp.ten_sp,
        sp.ma_vach,
        sp.don_vi_tinh,
        sp.gia_nhap,
        COALESCE(tk.so_luong_ton, 0) AS so_luong_ton
      FROM san_pham sp
      LEFT JOIN ton_kho tk ON tk.ma_sp = sp.ma_sp
      WHERE sp.trang_thai_kinh_doanh = TRUE
      ORDER BY sp.ten_sp ASC
    `),
  ]);

  return {
    suppliers: suppliersResult.rows,
    products: productsResult.rows,
  };
}

// ======================================================
// 4. TẠO PHIẾU NHẬP
// ======================================================
async function createGoodsReceipt(payload) {
  const {
    ma_ncc,
    ma_nd_lap,
    phuong_thuc,
    ghi_chu,
    items,
  } = payload;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const tongGiaTri = items.reduce((sum, item) => {
      const soLuong = Number(item.so_luong || 0);
      const giaNhap = Number(item.gia_nhap || 0);
      return sum + soLuong * giaNhap;
    }, 0);

    const receiptNumber = `PN${Date.now()}`;

    const receiptResult = await client.query(
      `
      INSERT INTO phieu_nhap (
        so_phieu,
        ngay_nhap,
        ma_ncc,
        tong_gia_tri,
        phuong_thuc,
        ma_nd_lap
      )
      VALUES ($1, NOW(), $2, $3, $4, $5)
      RETURNING
        ma_pn,
        so_phieu,
        ngay_nhap,
        ma_ncc,
        tong_gia_tri,
        phuong_thuc,
        ma_nd_lap
      `,
      [
        receiptNumber,
        ma_ncc,
        tongGiaTri,
        phuong_thuc,
        ma_nd_lap,
      ]
    );

    const receipt = receiptResult.rows[0];

    for (const item of items) {
      const maSp = item.ma_sp;
      const soLuong = Number(item.so_luong || 0);
      const giaNhap = Number(item.gia_nhap || 0);
      const thanhTien = soLuong * giaNhap;

      await client.query(
        `
        INSERT INTO ct_phieu_nhap (
          ma_pn,
          ma_sp,
          so_luong,
          gia_nhap,
          thanh_tien
        )
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          receipt.ma_pn,
          maSp,
          soLuong,
          giaNhap,
          thanhTien,
        ]
      );

      await client.query(
        `
        UPDATE ton_kho
        SET
          so_luong_ton = so_luong_ton + $1,
          cap_nhat_luc = NOW()
        WHERE ma_sp = $2
        `,
        [soLuong, maSp]
      );

      await client.query(
        `
        INSERT INTO lich_su_kho (
          loai,
          ma_sp,
          so_luong_thay_doi,
          tham_chieu_loai,
          tham_chieu_ma,
          ghi_chu
        )
        VALUES (
          'NHAP',
          $1,
          $2,
          'PHIEU_NHAP',
          $3,
          $4
        )
        `,
        [
          maSp,
          soLuong,
          receipt.ma_pn,
          ghi_chu || `Nhập kho theo phiếu ${receipt.so_phieu}`,
        ]
      );
    }

    // Nếu ghi công nợ: tăng công nợ phải trả nhà cung cấp
    // LƯU Ý:
    // Nếu enum/phương thức thanh toán trong schema của bạn khác,
    // chỉ cần đổi giá trị 'CONG_NO' ở frontend/backend cho khớp.
    if (phuong_thuc === 'CONG_NO') {
      const debtResult = await client.query(
        `
        SELECT ma_so
        FROM so_cong_no
        WHERE loai::text = 'PHAI_TRA'
          AND ma_ncc = $1
        LIMIT 1
        `,
        [ma_ncc]
      );

      if (debtResult.rows.length > 0) {
        await client.query(
          `
          UPDATE so_cong_no
          SET so_du_hien_tai = so_du_hien_tai + $1
          WHERE ma_so = $2
          `,
          [tongGiaTri, debtResult.rows[0].ma_so]
        );
      } else {
        await client.query(
          `
          INSERT INTO so_cong_no (
            loai,
            ma_kh,
            ma_ncc,
            so_du_hien_tai
          )
          VALUES (
            'PHAI_TRA',
            NULL,
            $1,
            $2
          )
          `,
          [ma_ncc, tongGiaTri]
        );
      }
    }

    await client.query('COMMIT');

    return {
      receipt,
      tong_gia_tri: tongGiaTri,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ======================================================
// 5. LỊCH SỬ PHIẾU NHẬP
// ======================================================
async function getGoodsReceipts(keyword = '') {
  const q = `%${keyword.trim()}%`;

  const result = await pool.query(
    `
    SELECT
      pn.ma_pn,
      pn.so_phieu,
      pn.ngay_nhap,
      pn.tong_gia_tri,
      pn.phuong_thuc::text AS phuong_thuc,
      ncc.ten_ncc,
      COALESCE(nd.ho_ten, 'Không xác định') AS nguoi_lap,
      COUNT(ct.ma_ct)::int AS so_dong_hang
    FROM phieu_nhap pn
    LEFT JOIN nha_cung_cap ncc ON ncc.ma_ncc = pn.ma_ncc
    LEFT JOIN nguoi_dung nd ON nd.ma_nd = pn.ma_nd_lap
    LEFT JOIN ct_phieu_nhap ct ON ct.ma_pn = pn.ma_pn
    WHERE
      $1 = '%%'
      OR pn.so_phieu ILIKE $1
      OR COALESCE(ncc.ten_ncc, '') ILIKE $1
      OR COALESCE(nd.ho_ten, '') ILIKE $1
    GROUP BY
      pn.ma_pn,
      pn.so_phieu,
      pn.ngay_nhap,
      pn.tong_gia_tri,
      pn.phuong_thuc,
      ncc.ten_ncc,
      nd.ho_ten
    ORDER BY pn.ngay_nhap DESC
    `,
    [q]
  );

  return result.rows;
}

// ======================================================
// 6. CHI TIẾT PHIẾU NHẬP
// ======================================================
async function getGoodsReceiptDetail(ma_pn) {
  const receiptResult = await pool.query(
    `
    SELECT
      pn.ma_pn,
      pn.so_phieu,
      pn.ngay_nhap,
      pn.tong_gia_tri,
      pn.phuong_thuc::text AS phuong_thuc,
      ncc.ten_ncc,
      ncc.sdt AS sdt_ncc,
      ncc.email AS email_ncc,
      COALESCE(nd.ho_ten, 'Không xác định') AS nguoi_lap
    FROM phieu_nhap pn
    LEFT JOIN nha_cung_cap ncc ON ncc.ma_ncc = pn.ma_ncc
    LEFT JOIN nguoi_dung nd ON nd.ma_nd = pn.ma_nd_lap
    WHERE pn.ma_pn = $1
    `,
    [ma_pn]
  );

  const receipt = receiptResult.rows[0] || null;

  if (!receipt) {
    return null;
  }

  const itemsResult = await pool.query(
    `
    SELECT
      ct.ma_ct,
      ct.ma_sp,
      sp.ten_sp,
      sp.ma_vach,
      sp.don_vi_tinh,
      ct.so_luong,
      ct.gia_nhap,
      ct.thanh_tien
    FROM ct_phieu_nhap ct
    LEFT JOIN san_pham sp ON sp.ma_sp = ct.ma_sp
    WHERE ct.ma_pn = $1
    ORDER BY sp.ten_sp ASC
    `,
    [ma_pn]
  );

  return {
    receipt,
    items: itemsResult.rows,
  };
}

module.exports = {
  getWarehouseSummary,
  getStockItems,
  getReceiptFormOptions,
  createGoodsReceipt,
  getGoodsReceipts,
  getGoodsReceiptDetail,
};