const service = require('../services/manager_order_customer.service');

// ======================================================
// CUSTOMERS
// ======================================================
async function getCustomers(req, res, next) {
  try {
    const data = await service.getCustomers(req.query.q || '');

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function createCustomer(req, res, next) {
  try {
    const { ten_kh, sdt } = req.body;

    if (!ten_kh || !ten_kh.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tên khách hàng không được để trống',
      });
    }

    if (!sdt || !sdt.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại không được để trống',
      });
    }

    const data = await service.createCustomer({
      ten_kh: ten_kh.trim(),
      sdt: sdt.trim(),
      dia_chi: req.body.dia_chi?.trim(),
      ghi_chu: req.body.ghi_chu?.trim(),
    });

    res.status(201).json({
      success: true,
      message: 'Thêm khách hàng thành công',
      data,
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Số điện thoại khách hàng đã tồn tại',
      });
    }

    next(error);
  }
}

async function updateCustomer(req, res, next) {
  try {
    const { ten_kh, sdt } = req.body;

    if (!ten_kh || !ten_kh.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tên khách hàng không được để trống',
      });
    }

    if (!sdt || !sdt.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại không được để trống',
      });
    }

    const data = await service.updateCustomer(req.params.id, {
      ten_kh: ten_kh.trim(),
      sdt: sdt.trim(),
      dia_chi: req.body.dia_chi?.trim(),
      ghi_chu: req.body.ghi_chu?.trim(),
    });

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khách hàng',
      });
    }

    res.json({
      success: true,
      message: 'Cập nhật khách hàng thành công',
      data,
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Số điện thoại khách hàng đã tồn tại',
      });
    }

    next(error);
  }
}

async function deleteCustomer(req, res, next) {
  try {
    const data = await service.deleteCustomer(req.params.id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khách hàng',
      });
    }

    res.json({
      success: true,
      message: 'Xóa khách hàng thành công',
    });
  } catch (error) {
    next(error);
  }
}

// ======================================================
// ORDERS
// ======================================================
async function getOrders(req, res, next) {
  try {
    const data = await service.getOrders({
      keyword: req.query.q || '',
      status: req.query.status || '',
    });

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function getOrderDetail(req, res, next) {
  try {
    const data = await service.getOrderDetail(req.params.id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng',
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,

  getOrders,
  getOrderDetail,
};