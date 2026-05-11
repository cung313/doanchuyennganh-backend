const pool = require('../db/pool');

function generateOrderCode() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const t = Date.now().toString().slice(-6);
  return `DH${y}${m}${d}${t}`;
}

async function createOrderService({
  userId,
  customerId,
  discount,
  total,
  items,
}) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (!items || items.length === 0) {
      throw new Error('Đơn hàng không có sản phẩm');
    }

    const soDon = generateOrderCode();

    // kiểm tra customer nếu có truyền lên
    if (customerId) {
      const customerCheck = await client.query(
        `
        SELECT ma_kh
        FROM khach_hang
        WHERE ma_kh = $1
        LIMIT 1
        `,
        [customerId]
      );

      if (customerCheck.rows.length === 0) {
        throw new Error('Khách hàng không tồn tại hoặc sai mã khách hàng');
      }
    }

    // kiểm tra sản phẩm tồn tại
    const normalizedItems = [];

    for (const item of items) {
      const productResult = await client.query(
        `
        SELECT ma_sp, ten_sp, gia_ban
        FROM san_pham
        WHERE ma_sp = $1
        LIMIT 1
        `,
        [item.product_id]
      );

      if (productResult.rows.length === 0) {
        throw new Error(`Không tìm thấy sản phẩm: ${item.product_id}`);
      }

      const product = productResult.rows[0];

      normalizedItems.push({
        product_id: product.ma_sp,
        name: product.ten_sp,
        price: Number(item.price ?? product.gia_ban ?? 0),
        quantity: Number(item.quantity ?? 0),
      });
    }

    // tạo đơn hàng
    const orderResult = await client.query(
      `
      INSERT INTO don_hang (
        so_don,
        trang_thai,
        ma_kh,
        ma_nd_tao,
        giam_gia,
        tong_tien,
        ghi_chu
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING ma_dh, so_don
      `,
      [
        soDon,
        'NHAP',
        customerId || null,
        userId || null,
        Number(discount || 0),
        Number(total || 0),
        'Tạo từ app bán hàng',
      ]
    );

    const createdOrder = orderResult.rows[0];
    const maDh = createdOrder.ma_dh;

    // tạo chi tiết đơn
    for (const item of normalizedItems) {
      const thanhTien = Number(item.price) * Number(item.quantity);

      await client.query(
        `
        INSERT INTO ct_don_hang (
          ma_dh,
          ma_sp,
          so_luong,
          don_gia,
          thanh_tien
        )
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          maDh,
          item.product_id,
          item.quantity,
          item.price,
          thanhTien,
        ]
      );
    }

    // trừ tồn thật ở bảng ton_kho
    for (const item of normalizedItems) {
      const tonResult = await client.query(
        `
        SELECT ma_ton, so_luong_ton
        FROM ton_kho
        WHERE ma_sp = $1
        LIMIT 1
        `,
        [item.product_id]
      );

      if (tonResult.rows.length === 0) {
        throw new Error(`Sản phẩm chưa có bản ghi tồn kho: ${item.product_id}`);
      }

      const ton = tonResult.rows[0];

      if ((ton.so_luong_ton ?? 0) < item.quantity) {
        throw new Error(`Không đủ tồn kho cho sản phẩm ${item.name}`);
      }

      await client.query(
        `
        UPDATE ton_kho
        SET so_luong_ton = so_luong_ton - $1,
            cap_nhat_luc = NOW()
        WHERE ma_sp = $2
        `,
        [item.quantity, item.product_id]
      );
    }

    await client.query('COMMIT');

    return {
      orderId: maDh,
      orderCode: createdOrder.so_don,
      message: 'Tạo đơn hàng thành công',
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  createOrderService,
};