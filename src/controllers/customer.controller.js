const pool = require('../db/pool');

exports.getCustomers = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT ma_kh, ten_kh, sdt
      FROM khach_hang
      ORDER BY ten_kh ASC
      LIMIT 50
      `
    );

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('GET CUSTOMERS ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách khách hàng',
    });
  }
};

exports.searchCustomers = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();

    const result = await pool.query(
      `
      SELECT ma_kh, ten_kh, sdt
      FROM khach_hang
      WHERE
        $1 = '' OR
        LOWER(ten_kh) LIKE LOWER($2) OR
        LOWER(COALESCE(sdt, '')) LIKE LOWER($2)
      ORDER BY ten_kh ASC
      LIMIT 20
      `,
      [q, `%${q}%`]
    );

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('SEARCH CUSTOMERS ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi tìm kiếm khách hàng',
    });
  }
};