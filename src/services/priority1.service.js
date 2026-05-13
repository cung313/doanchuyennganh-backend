const pool = require('../db/pool');

// ======================================================
// HELPER
// ======================================================
function numberValue(value) {
  return Number(value || 0);
}

async function getProductStock(client, productId) {
  const result = await client.query(
    `
    SELECT
      sp.ma_sp,
      sp.ten_sp,
      sp.ma_vach,
      sp.gia_nhap,
      sp.gia_ban,
      COALESCE(tk.so_luong_ton, 0) AS so_luong_ton
    FROM san_pham sp
    LEFT JOIN ton_kho tk ON tk.ma_sp = sp.ma_sp
    WHERE sp.ma_sp = $1
    `,
    [productId]
  );

  return result.rows[0] || null;
}

// ======================================================
// ROLE NHÂN VIÊN KHO - DASHBOARD
// ======================================================
async function getWarehouseDashboard() {
  const [
    stockSummary,
    lowStock,
    recentReceipts,
    recentIssues,
    pendingCounts,
  ] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(sp.ma_sp)::int AS tong_san_pham,
        COALESCE(SUM(tk.so_luong_ton), 0)::int AS tong_ton,
        COALESCE(SUM(tk.so_luong_ton * sp.gia_nhap), 0) AS gia_tri_ton
      FROM san_pham sp
      LEFT JOIN ton_kho tk ON tk.ma_sp = sp.ma_sp
      WHERE sp.trang_thai_kinh_doanh = TRUE
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
      WHERE sp.trang_thai_kinh_doanh = TRUE
        AND COALESCE(tk.so_luong_ton, 0) <= sp.ton_toi_thieu
      ORDER BY COALESCE(tk.so_luong_ton, 0) ASC
      LIMIT 10
    `),

    pool.query(`
      SELECT
        pn.ma_pn,
        pn.so_phieu,
        pn.ngay_nhap,
        pn.tong_gia_tri,
        ncc.ten_ncc
      FROM phieu_nhap pn
      LEFT JOIN nha_cung_cap ncc ON ncc.ma_ncc = pn.ma_ncc
      ORDER BY pn.ngay_nhap DESC
      LIMIT 5
    `),

    pool.query(`
      SELECT
        px.ma_px,
        px.so_phieu,
        px.ngay_xuat,
        px.loai::text AS loai,
        px.tong_gia_tri
      FROM phieu_xuat px
      ORDER BY px.ngay_xuat DESC
      LIMIT 5
    `),

    pool.query(`
      SELECT COUNT(*)::int AS so_phieu_cho_duyet
      FROM bien_ban_kiem_ke
      WHERE trang_thai::text = 'CHO_DUYET'
    `),
  ]);

  return {
    stats: {
      tong_san_pham: Number(stockSummary.rows[0]?.tong_san_pham || 0),
      tong_ton: Number(stockSummary.rows[0]?.tong_ton || 0),
      gia_tri_ton: Number(stockSummary.rows[0]?.gia_tri_ton || 0),
      so_phieu_cho_duyet: Number(
        pendingCounts.rows[0]?.so_phieu_cho_duyet || 0
      ),
    },
    san_pham_sap_het: lowStock.rows,
    phieu_nhap_gan_day: recentReceipts.rows,
    phieu_xuat_gan_day: recentIssues.rows,
  };
}

// ======================================================
// DANH SÁCH TỒN KHO
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
      COALESCE(tk.so_luong_ton, 0) AS so_luong_ton,
      CASE
        WHEN COALESCE(tk.so_luong_ton, 0) = 0 THEN 'HET_HANG'
        WHEN COALESCE(tk.so_luong_ton, 0) <= sp.ton_toi_thieu THEN 'SAP_HET'
        ELSE 'BINH_THUONG'
      END AS trang_thai_ton
    FROM san_pham sp
    LEFT JOIN ton_kho tk ON tk.ma_sp = sp.ma_sp
    WHERE
      sp.trang_thai_kinh_doanh = TRUE
      AND (
        $1 = '%%'
        OR sp.ten_sp ILIKE $1
        OR sp.ma_vach ILIKE $1
      )
    ORDER BY sp.ten_sp ASC
    `,
    [q]
  );

  return result.rows;
}

// ======================================================
// KIỂM KÊ - TẠO BIÊN BẢN
// ======================================================
async function createStockCount({ ma_nd_lap, ly_do, ghi_chu, items }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Biên bản kiểm kê phải có ít nhất một sản phẩm');
    }

    const soBienBan = `KK${Date.now()}`;

    const bbResult = await client.query(
      `
      INSERT INTO bien_ban_kiem_ke (
        so_bien_ban,
        ma_nd_lap,
        ly_do,
        ghi_chu,
        trang_thai
      )
      VALUES ($1, $2, $3, $4, 'CHO_DUYET')
      RETURNING *
      `,
      [soBienBan, ma_nd_lap, ly_do || null, ghi_chu || null]
    );

    const bienBan = bbResult.rows[0];

    for (const item of items) {
      const product = await getProductStock(client, item.ma_sp);

      if (!product) {
        throw new Error('Không tìm thấy sản phẩm trong biên bản kiểm kê');
      }

      const tonHeThong = numberValue(product.so_luong_ton);
      const tonThucTe = Number(item.ton_thuc_te || 0);
      const chenhLech = tonThucTe - tonHeThong;

      await client.query(
        `
        INSERT INTO ct_kiem_ke (
          ma_bb,
          ma_sp,
          ton_he_thong,
          ton_thuc_te,
          chenh_lech,
          ghi_chu
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          bienBan.ma_bb,
          item.ma_sp,
          tonHeThong,
          tonThucTe,
          chenhLech,
          item.ghi_chu || null,
        ]
      );
    }

    await client.query('COMMIT');

    return bienBan;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ======================================================
// KIỂM KÊ - DANH SÁCH
// ======================================================
async function getStockCounts({ keyword = '', status = '' }) {
  const q = `%${keyword.trim()}%`;

  const result = await pool.query(
    `
    SELECT
      bb.ma_bb,
      bb.so_bien_ban,
      bb.ngay_lap,
      bb.trang_thai::text AS trang_thai,
      bb.ly_do,
      bb.ghi_chu,
      bb.ngay_duyet,
      COALESCE(nd_lap.ho_ten, 'Không xác định') AS nguoi_lap,
      COALESCE(nd_duyet.ho_ten, '') AS nguoi_duyet,
      COUNT(ct.ma_ct)::int AS so_dong,
      COALESCE(SUM(ABS(ct.chenh_lech)), 0)::int AS tong_chenh_lech
    FROM bien_ban_kiem_ke bb
    LEFT JOIN nguoi_dung nd_lap ON nd_lap.ma_nd = bb.ma_nd_lap
    LEFT JOIN nguoi_dung nd_duyet ON nd_duyet.ma_nd = bb.ma_nd_duyet
    LEFT JOIN ct_kiem_ke ct ON ct.ma_bb = bb.ma_bb
    WHERE
      ($1 = '' OR bb.trang_thai::text = $1)
      AND (
        $2 = '%%'
        OR bb.so_bien_ban ILIKE $2
        OR COALESCE(nd_lap.ho_ten, '') ILIKE $2
      )
    GROUP BY
      bb.ma_bb,
      bb.so_bien_ban,
      bb.ngay_lap,
      bb.trang_thai,
      bb.ly_do,
      bb.ghi_chu,
      bb.ngay_duyet,
      nd_lap.ho_ten,
      nd_duyet.ho_ten
    ORDER BY bb.ngay_lap DESC
    `,
    [status, q]
  );

  return result.rows;
}

// ======================================================
// KIỂM KÊ - CHI TIẾT
// ======================================================
async function getStockCountDetail(ma_bb) {
  const bbResult = await pool.query(
    `
    SELECT
      bb.*,
      bb.trang_thai::text AS trang_thai,
      COALESCE(nd_lap.ho_ten, 'Không xác định') AS nguoi_lap,
      COALESCE(nd_duyet.ho_ten, '') AS nguoi_duyet
    FROM bien_ban_kiem_ke bb
    LEFT JOIN nguoi_dung nd_lap ON nd_lap.ma_nd = bb.ma_nd_lap
    LEFT JOIN nguoi_dung nd_duyet ON nd_duyet.ma_nd = bb.ma_nd_duyet
    WHERE bb.ma_bb = $1
    `,
    [ma_bb]
  );

  const bienBan = bbResult.rows[0];

  if (!bienBan) return null;

  const itemsResult = await pool.query(
    `
    SELECT
      ct.ma_ct,
      ct.ma_sp,
      sp.ten_sp,
      sp.ma_vach,
      ct.ton_he_thong,
      ct.ton_thuc_te,
      ct.chenh_lech,
      ct.ghi_chu
    FROM ct_kiem_ke ct
    JOIN san_pham sp ON sp.ma_sp = ct.ma_sp
    WHERE ct.ma_bb = $1
    ORDER BY sp.ten_sp ASC
    `,
    [ma_bb]
  );

  return {
    bien_ban: bienBan,
    items: itemsResult.rows,
  };
}

// ======================================================
// KIỂM KÊ - DUYỆT VÀ ĐIỀU CHỈNH TỒN
// ======================================================
async function approveStockCount({ ma_bb, ma_nd_duyet }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const bbResult = await client.query(
      `
      SELECT *
      FROM bien_ban_kiem_ke
      WHERE ma_bb = $1
      FOR UPDATE
      `,
      [ma_bb]
    );

    const bienBan = bbResult.rows[0];

    if (!bienBan) {
      throw new Error('Không tìm thấy biên bản kiểm kê');
    }

    if (bienBan.trang_thai !== 'CHO_DUYET') {
      throw new Error('Biên bản này đã được xử lý');
    }

    const soPhieu = `DC${Date.now()}`;

    const pdcResult = await client.query(
      `
      INSERT INTO phieu_dieu_chinh_ton (
        so_phieu,
        ma_bb,
        ma_nd_lap,
        ly_do
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [soPhieu, ma_bb, ma_nd_duyet, bienBan.ly_do || 'Duyệt kiểm kê']
    );

    const phieuDieuChinh = pdcResult.rows[0];

    const ctResult = await client.query(
      `
      SELECT *
      FROM ct_kiem_ke
      WHERE ma_bb = $1
      `,
      [ma_bb]
    );

    for (const item of ctResult.rows) {
      await client.query(
        `
        UPDATE ton_kho
        SET
          so_luong_ton = $1,
          cap_nhat_luc = NOW()
        WHERE ma_sp = $2
        `,
        [item.ton_thuc_te, item.ma_sp]
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
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          'DIEU_CHINH_KIEM_KE',
          item.ma_sp,
          item.chenh_lech,
          'PHIEU_DIEU_CHINH_TON',
          phieuDieuChinh.ma_pdc,
          `Điều chỉnh tồn theo biên bản ${bienBan.so_bien_ban}`,
        ]
      );
    }

    await client.query(
      `
      UPDATE bien_ban_kiem_ke
      SET
        trang_thai = 'DA_DUYET',
        ma_nd_duyet = $1,
        ngay_duyet = NOW(),
        cap_nhat_luc = NOW()
      WHERE ma_bb = $2
      `,
      [ma_nd_duyet, ma_bb]
    );

    await client.query('COMMIT');

    return phieuDieuChinh;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ======================================================
// KIỂM KÊ - TỪ CHỐI
// ======================================================
async function rejectStockCount({ ma_bb, ma_nd_duyet, ly_do }) {
  const result = await pool.query(
    `
    UPDATE bien_ban_kiem_ke
    SET
      trang_thai = 'TU_CHOI',
      ma_nd_duyet = $1,
      ngay_duyet = NOW(),
      ghi_chu = COALESCE($2, ghi_chu),
      cap_nhat_luc = NOW()
    WHERE ma_bb = $3
      AND trang_thai::text = 'CHO_DUYET'
    RETURNING *
    `,
    [ma_nd_duyet, ly_do || null, ma_bb]
  );

  return result.rows[0] || null;
}

// ======================================================
// PHIẾU XUẤT KHO / HAO HỤT
// ======================================================
// ======================================================
// PHIẾU XUẤT KHO / HAO HỤT - TẠO PHIẾU CHỜ DUYỆT
// Nhân viên kho chỉ lập phiếu.
// Chưa trừ tồn kho ở bước này.
// ======================================================
async function createStockIssue({
  ma_nd_lap,
  loai,
  ly_do,
  ghi_chu,
  items,
}) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Phiếu xuất phải có ít nhất một sản phẩm');
    }

    if (!ma_nd_lap) {
      throw new Error('Thiếu người lập phiếu xuất');
    }

    if (!ly_do || !ly_do.trim()) {
      throw new Error('Vui lòng nhập lý do xuất kho');
    }

    let tongGiaTri = 0;

    for (const item of items) {
      const product = await getProductStock(client, item.ma_sp);

      if (!product) {
        throw new Error('Không tìm thấy sản phẩm trong phiếu xuất');
      }

      const soLuongTon = Number(product.so_luong_ton || 0);
      const soLuongXuat = Number(item.so_luong || 0);

      if (soLuongXuat <= 0) {
        throw new Error('Số lượng xuất phải lớn hơn 0');
      }

      if (soLuongTon < soLuongXuat) {
        throw new Error(
          `Sản phẩm ${product.ten_sp} không đủ tồn kho để đề xuất xuất`
        );
      }

      const giaXuat = Number(item.gia_xuat || product.gia_nhap || 0);
      tongGiaTri += soLuongXuat * giaXuat;
    }

    const soPhieu = `PX${Date.now()}`;

    const pxResult = await client.query(
      `
      INSERT INTO phieu_xuat (
        so_phieu,
        loai,
        ma_nd_lap,
        ly_do,
        ghi_chu,
        tong_gia_tri,
        trang_thai
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'CHO_DUYET')
      RETURNING *
      `,
      [
        soPhieu,
        loai || 'XUAT_HAO_HUT',
        ma_nd_lap,
        ly_do.trim(),
        ghi_chu?.trim() || null,
        tongGiaTri,
      ]
    );

    const phieuXuat = pxResult.rows[0];

    for (const item of items) {
      const product = await getProductStock(client, item.ma_sp);
      const soLuongXuat = Number(item.so_luong || 0);
      const giaXuat = Number(item.gia_xuat || product.gia_nhap || 0);
      const thanhTien = soLuongXuat * giaXuat;

      await client.query(
        `
        INSERT INTO ct_phieu_xuat (
          ma_px,
          ma_sp,
          so_luong,
          gia_xuat,
          thanh_tien
        )
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          phieuXuat.ma_px,
          item.ma_sp,
          soLuongXuat,
          giaXuat,
          thanhTien,
        ]
      );
    }

    await client.query('COMMIT');

    return phieuXuat;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ======================================================
// PHIẾU XUẤT - DANH SÁCH
// ======================================================
// ======================================================
// PHIẾU XUẤT - DANH SÁCH
// ======================================================
async function getStockIssues(keyword = '') {
  const q = `%${keyword.trim()}%`;

  const result = await pool.query(
    `
    SELECT
      px.ma_px,
      px.so_phieu,
      px.ngay_xuat,
      px.loai::text AS loai,
      px.ly_do,
      px.ghi_chu,
      px.tong_gia_tri,
      px.trang_thai,
      px.ngay_duyet,
      px.ly_do_tu_choi,
      COALESCE(nd_lap.ho_ten, 'Không xác định') AS nguoi_lap,
      COALESCE(nd_duyet.ho_ten, '') AS nguoi_duyet,
      COUNT(ct.ma_ct)::int AS so_dong
    FROM phieu_xuat px
    LEFT JOIN nguoi_dung nd_lap ON nd_lap.ma_nd = px.ma_nd_lap
    LEFT JOIN nguoi_dung nd_duyet ON nd_duyet.ma_nd = px.ma_nd_duyet
    LEFT JOIN ct_phieu_xuat ct ON ct.ma_px = px.ma_px
    WHERE
      $1 = '%%'
      OR px.so_phieu ILIKE $1
      OR px.loai::text ILIKE $1
      OR px.trang_thai ILIKE $1
      OR COALESCE(nd_lap.ho_ten, '') ILIKE $1
    GROUP BY
      px.ma_px,
      px.so_phieu,
      px.ngay_xuat,
      px.loai,
      px.ly_do,
      px.ghi_chu,
      px.tong_gia_tri,
      px.trang_thai,
      px.ngay_duyet,
      px.ly_do_tu_choi,
      nd_lap.ho_ten,
      nd_duyet.ho_ten
    ORDER BY px.ngay_xuat DESC
    `,
    [q]
  );

  return result.rows;
}

// ======================================================
// PHIẾU XUẤT - CHI TIẾT
// ======================================================
async function getStockIssueDetail(ma_px) {
  const pxResult = await pool.query(
    `
    SELECT
      px.*,
      px.loai::text AS loai,
      COALESCE(nd_lap.ho_ten, 'Không xác định') AS nguoi_lap,
      COALESCE(nd_duyet.ho_ten, '') AS nguoi_duyet
    FROM phieu_xuat px
    LEFT JOIN nguoi_dung nd_lap ON nd_lap.ma_nd = px.ma_nd_lap
    LEFT JOIN nguoi_dung nd_duyet ON nd_duyet.ma_nd = px.ma_nd_duyet
    WHERE px.ma_px = $1
    `,
    [ma_px]
  );

  const phieu = pxResult.rows[0];

  if (!phieu) return null;

  const itemsResult = await pool.query(
    `
    SELECT
      ct.ma_ct,
      ct.ma_sp,
      sp.ten_sp,
      sp.ma_vach,
      ct.so_luong,
      ct.gia_xuat,
      ct.thanh_tien
    FROM ct_phieu_xuat ct
    JOIN san_pham sp ON sp.ma_sp = ct.ma_sp
    WHERE ct.ma_px = $1
    ORDER BY sp.ten_sp ASC
    `,
    [ma_px]
  );

  return {
    phieu_xuat: phieu,
    items: itemsResult.rows,
  };
}

// ======================================================
// PHIẾU XUẤT - DUYỆT
// Khi duyệt mới trừ tồn kho và ghi lịch sử kho.
// ======================================================
async function approveStockIssue({ ma_px, ma_nd_duyet }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const issueResult = await client.query(
      `
      SELECT *
      FROM phieu_xuat
      WHERE ma_px = $1
      FOR UPDATE
      `,
      [ma_px]
    );

    const phieu = issueResult.rows[0];

    if (!phieu) {
      throw new Error('Không tìm thấy phiếu xuất kho');
    }

    if (phieu.trang_thai !== 'CHO_DUYET') {
      throw new Error('Phiếu xuất này đã được xử lý');
    }

    const itemsResult = await client.query(
      `
      SELECT
        ct.ma_sp,
        ct.so_luong,
        ct.gia_xuat,
        sp.ten_sp
      FROM ct_phieu_xuat ct
      JOIN san_pham sp ON sp.ma_sp = ct.ma_sp
      WHERE ct.ma_px = $1
      `,
      [ma_px]
    );

    if (itemsResult.rows.length === 0) {
      throw new Error('Phiếu xuất không có chi tiết hàng hóa');
    }

    for (const item of itemsResult.rows) {
      const updateStock = await client.query(
        `
        UPDATE ton_kho
        SET
          so_luong_ton = so_luong_ton - $1,
          cap_nhat_luc = NOW()
        WHERE ma_sp = $2
          AND so_luong_ton >= $1
        RETURNING ma_sp, so_luong_ton
        `,
        [item.so_luong, item.ma_sp]
      );

      if (updateStock.rowCount === 0) {
        throw new Error(
          `Tồn kho sản phẩm ${item.ten_sp} không đủ để duyệt phiếu xuất`
        );
      }

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
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          phieu.loai,
          item.ma_sp,
          -Number(item.so_luong),
          'PHIEU_XUAT',
          phieu.ma_px,
          phieu.ly_do || 'Duyệt phiếu xuất kho',
        ]
      );
    }

    const approvedResult = await client.query(
      `
      UPDATE phieu_xuat
      SET
        trang_thai = 'DA_DUYET',
        ma_nd_duyet = $1,
        ngay_duyet = NOW(),
        ly_do_tu_choi = NULL
      WHERE ma_px = $2
      RETURNING *
      `,
      [ma_nd_duyet, ma_px]
    );

    await client.query('COMMIT');

    return approvedResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ======================================================
// PHIẾU XUẤT - TỪ CHỐI
// ======================================================
async function rejectStockIssue({
  ma_px,
  ma_nd_duyet,
  ly_do_tu_choi,
}) {
  const result = await pool.query(
    `
    UPDATE phieu_xuat
    SET
      trang_thai = 'TU_CHOI',
      ma_nd_duyet = $1,
      ngay_duyet = NOW(),
      ly_do_tu_choi = $2
    WHERE ma_px = $3
      AND trang_thai = 'CHO_DUYET'
    RETURNING *
    `,
    [ma_nd_duyet, ly_do_tu_choi || 'Không phê duyệt', ma_px]
  );

  return result.rows[0] || null;
}
// ======================================================
// HỦY ĐƠN + HOÀN TỒN KHO
// ======================================================
async function cancelOrder({ ma_dh, ma_nd_huy, ly_do }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const orderResult = await client.query(
      `
      SELECT *
      FROM don_hang
      WHERE ma_dh = $1
      FOR UPDATE
      `,
      [ma_dh]
    );

    const order = orderResult.rows[0];

    if (!order) {
      throw new Error('Không tìm thấy đơn hàng');
    }

    if (order.trang_thai === 'HUY') {
      throw new Error('Đơn hàng đã bị hủy trước đó');
    }

    const itemsResult = await client.query(
      `
      SELECT
        ct.ma_sp,
        ct.so_luong,
        sp.ten_sp
      FROM ct_don_hang ct
      JOIN san_pham sp ON sp.ma_sp = ct.ma_sp
      WHERE ct.ma_dh = $1
      `,
      [ma_dh]
    );

    for (const item of itemsResult.rows) {
      await client.query(
        `
        UPDATE ton_kho
        SET
          so_luong_ton = so_luong_ton + $1,
          cap_nhat_luc = NOW()
        WHERE ma_sp = $2
        `,
        [item.so_luong, item.ma_sp]
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
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          'HOAN_TON_HUY_DON',
          item.ma_sp,
          item.so_luong,
          'DON_HANG',
          ma_dh,
          ly_do || `Hoàn tồn kho do hủy đơn ${order.so_don}`,
        ]
      );
    }

    const updateResult = await client.query(
      `
      UPDATE don_hang
      SET
        trang_thai = 'HUY',
        ly_do_huy = $1,
        ma_nd_huy = $2,
        ngay_huy = NOW()
      WHERE ma_dh = $3
      RETURNING *
      `,
      [ly_do || 'Hủy đơn', ma_nd_huy, ma_dh]
    );

    await client.query('COMMIT');

    return updateResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
// ======================================================
// ĐƠN HÀNG - CẬP NHẬT TRẠNG THÁI
// Quy trình an toàn:
// NHAP -> DA_THANH_TOAN
// Không cho đổi HUY sang trạng thái khác.
// ======================================================
async function updateOrderStatus({ ma_dh, trang_thai }) {
  const allowedStatuses = ['NHAP', 'DA_THANH_TOAN'];

  if (!allowedStatuses.includes(trang_thai)) {
    throw new Error('Trạng thái đơn hàng không hợp lệ');
  }

  const currentResult = await pool.query(
    `
    SELECT ma_dh, trang_thai
    FROM don_hang
    WHERE ma_dh = $1
    `,
    [ma_dh]
  );

  const current = currentResult.rows[0];

  if (!current) {
    throw new Error('Không tìm thấy đơn hàng');
  }

  if (current.trang_thai === 'HUY') {
    throw new Error('Đơn hàng đã hủy, không thể đổi trạng thái');
  }

  if (
    current.trang_thai === 'DA_THANH_TOAN' &&
    trang_thai === 'NHAP'
  ) {
    throw new Error('Không thể chuyển đơn đã thanh toán về nháp');
  }

  const result = await pool.query(
    `
    UPDATE don_hang
    SET trang_thai = $1
    WHERE ma_dh = $2
    RETURNING *
    `,
    [trang_thai, ma_dh]
  );

  return result.rows[0];
}
module.exports = {
  getWarehouseDashboard,
  getStockItems,

  createStockCount,
  getStockCounts,
  getStockCountDetail,
  approveStockCount,
  rejectStockCount,

  createStockIssue,
  getStockIssues,
  getStockIssueDetail,
  approveStockIssue,
  rejectStockIssue,

  cancelOrder,
  updateOrderStatus,
};