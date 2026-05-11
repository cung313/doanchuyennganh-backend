const pool = require('../db/pool');

exports.searchProducts = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();

    const result = await pool.query(
      `
      SELECT 
        sp.ma_sp,
        sp.ten_sp,
        sp.ma_vach,
        sp.gia_ban,
        COALESCE(tk.so_luong_ton, 0) AS so_luong_ton
      FROM san_pham sp
      LEFT JOIN ton_kho tk ON tk.ma_sp = sp.ma_sp
      WHERE
        sp.trang_thai_kinh_doanh = TRUE
        AND (
          $1 = '' OR
          LOWER(sp.ten_sp) LIKE LOWER($2) OR
          LOWER(COALESCE(sp.ma_vach, '')) LIKE LOWER($2)
        )
      ORDER BY sp.ten_sp ASC
      LIMIT 20
      `,
      [q, `%${q}%`]
    );

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('SEARCH PRODUCTS ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi tìm kiếm sản phẩm',
    });
  }
};

exports.getProductByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;

    const result = await pool.query(
      `
      SELECT 
        sp.ma_sp,
        sp.ten_sp,
        sp.ma_vach,
        sp.gia_ban,
        COALESCE(tk.so_luong_ton, 0) AS so_luong_ton
      FROM san_pham sp
      LEFT JOIN ton_kho tk ON tk.ma_sp = sp.ma_sp
      WHERE sp.ma_vach = $1
      LIMIT 1
      `,
      [barcode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm',
      });
    }

    return res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('GET PRODUCT BY BARCODE ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi tìm sản phẩm theo mã vạch',
    });
  }
};