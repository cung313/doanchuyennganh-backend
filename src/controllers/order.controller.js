const { createOrderService } = require('../services/order.service');

exports.createOrder = async (req, res) => {
  try {
    const {
      customer_id,
      discount,
      total,
      items,
    } = req.body;

    const userId = req.user?.ma_nd || req.body.user_id || null;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng chưa có sản phẩm',
      });
    }

    const result = await createOrderService({
      userId,
      customerId: customer_id,
      discount,
      total,
      items,
    });

    return res.status(201).json({
      success: true,
      message: result.message,
      order_id: result.orderId,
      order_code: result.orderCode,
    });
  } catch (error) {
    console.error('CREATE ORDER ERROR:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi tạo đơn hàng',
    });
  }
};