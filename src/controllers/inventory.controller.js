const pool = require('../db/pool');

// Lấy tồn kho
const getInventory = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ton_kho');
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cập nhật tồn kho
const updateInventory = async (req, res) => {
  const { ma_sp, so_luong } = req.body;

  try {
    await pool.query('UPDATE ton_kho SET so_luong_ton = $1 WHERE ma_sp = $2', [so_luong, ma_sp]);
    res.status(200).json({ success: true, message: 'Inventory updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getInventory, updateInventory };