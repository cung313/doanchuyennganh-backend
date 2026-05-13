const employeeService = require('../services/employee.service');

// ======================================================
// GET /api/employee/profile/:userId
// ======================================================
async function getProfile(req, res, next) {
  try {
    const data = await employeeService.getProfile(req.params.userId);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản',
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

// ======================================================
// PATCH /api/employee/change-password/:userId
// ======================================================
async function changePassword(req, res, next) {
  try {
    const {
      current_password,
      new_password,
      confirm_password,
    } = req.body;

    if (!current_password || !new_password || !confirm_password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin mật khẩu',
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự',
      });
    }

    if (new_password !== confirm_password) {
      return res.status(400).json({
        success: false,
        message: 'Xác nhận mật khẩu mới không khớp',
      });
    }

    await employeeService.changePassword({
      userId: req.params.userId,
      currentPassword: current_password,
      newPassword: new_password,
    });

    res.json({
      success: true,
      message: 'Đổi mật khẩu thành công',
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
}

// ======================================================
// GET /api/employee/orders/:userId
// ======================================================
async function getMyOrders(req, res, next) {
  try {
    const data = await employeeService.getMyOrders({
      userId: req.params.userId,
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

// ======================================================
// GET /api/employee/orders/:userId/:orderId
// ======================================================
async function getMyOrderDetail(req, res, next) {
  try {
    const data = await employeeService.getMyOrderDetail({
      userId: req.params.userId,
      orderId: req.params.orderId,
    });

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

// ======================================================
// GET /api/employee/notifications/:userId
// ======================================================
async function getNotifications(req, res, next) {
  try {
    const data = await employeeService.getEmployeeNotifications(
      req.params.userId
    );

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProfile,
  changePassword,

  getMyOrders,
  getMyOrderDetail,

  getNotifications,
};