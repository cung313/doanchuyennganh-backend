const priority1Service = require('../services/priority1.service');
async function getWarehouseDashboard(req, res, next) {
  try {
    const data = await service.getWarehouseDashboard();

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function getStocks(req, res, next) {
  try {
    const data = await service.getStockItems(req.query.q || '');

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function createStockCount(req, res, next) {
  try {
    const { ma_nd_lap, ly_do, ghi_chu, items } = req.body;

    if (!ma_nd_lap) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu người lập biên bản',
      });
    }

    const data = await service.createStockCount({
      ma_nd_lap,
      ly_do,
      ghi_chu,
      items,
    });

    res.status(201).json({
      success: true,
      message: 'Tạo biên bản kiểm kê thành công, đang chờ quản lý duyệt',
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function getStockCounts(req, res, next) {
  try {
    const data = await service.getStockCounts({
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

async function getStockCountDetail(req, res, next) {
  try {
    const data = await service.getStockCountDetail(req.params.id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy biên bản kiểm kê',
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

async function approveStockCount(req, res, next) {
  try {
    const { ma_nd_duyet } = req.body;

    if (!ma_nd_duyet) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu người duyệt',
      });
    }

    const data = await service.approveStockCount({
      ma_bb: req.params.id,
      ma_nd_duyet,
    });

    res.json({
      success: true,
      message: 'Duyệt kiểm kê và điều chỉnh tồn kho thành công',
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function rejectStockCount(req, res, next) {
  try {
    const { ma_nd_duyet, ly_do } = req.body;

    if (!ma_nd_duyet) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu người duyệt',
      });
    }

    const data = await service.rejectStockCount({
      ma_bb: req.params.id,
      ma_nd_duyet,
      ly_do,
    });

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy biên bản hoặc biên bản đã xử lý',
      });
    }

    res.json({
      success: true,
      message: 'Đã từ chối biên bản kiểm kê',
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function createStockIssue(req, res, next) {
  try {
    const { ma_nd_lap, loai, ly_do, ghi_chu, items } = req.body;

    if (!ma_nd_lap) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu người lập phiếu xuất',
      });
    }

    if (!ly_do || !ly_do.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập lý do xuất kho / hao hụt',
      });
    }

    const data = await service.createStockIssue({
      ma_nd_lap,
      loai,
      ly_do,
      ghi_chu,
      items,
    });

    res.status(201).json({
      success: true,
      message: 'Lập phiếu xuất kho thành công',
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function getStockIssues(req, res, next) {
  try {
    const data = await service.getStockIssues(req.query.q || '');

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function getStockIssueDetail(req, res, next) {
  try {
    const data = await service.getStockIssueDetail(req.params.id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phiếu xuất kho',
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

async function cancelOrder(req, res, next) {
  try {
    const { ma_nd_huy, ly_do } = req.body;

    if (!ma_nd_huy) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu người hủy đơn',
      });
    }

    if (!ly_do || !ly_do.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập lý do hủy đơn',
      });
    }

    const data = await service.cancelOrder({
      ma_dh: req.params.id,
      ma_nd_huy,
      ly_do,
    });

    res.json({
      success: true,
      message: 'Hủy đơn và hoàn tồn kho thành công',
      data,
    });
  } catch (error) {
    next(error);
  }
}
async function approveStockIssue(req, res, next) {
  try {
    const { ma_nd_duyet } = req.body;

    if (!ma_nd_duyet) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu mã người duyệt',
      });
    }

    const data = await priority1Service.approveStockIssue({
      ma_px: req.params.id,
      ma_nd_duyet,
    });

    res.json({
      success: true,
      message: 'Đã duyệt phiếu xuất kho',
      data,
    });
  } catch (error) {
    next(error);
  }
}async function rejectStockIssue(req, res, next) {
  try {
    const { ma_nd_duyet, ly_do_tu_choi } = req.body;

    if (!ma_nd_duyet) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu mã người duyệt',
      });
    }

    if (!ly_do_tu_choi || !ly_do_tu_choi.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập lý do từ chối',
      });
    }

    const data = await priority1Service.rejectStockIssue({
      ma_px: req.params.id,
      ma_nd_duyet,
      ly_do_tu_choi: ly_do_tu_choi.trim(),
    });

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phiếu xuất đang chờ duyệt',
      });
    }

    res.json({
      success: true,
      message: 'Đã từ chối phiếu xuất kho',
      data,
    });
  } catch (error) {
    next(error);
  }
}async function updateOrderStatus(req, res, next) {
  try {
    const { trang_thai } = req.body;

    if (!trang_thai) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu trạng thái đơn hàng',
      });
    }

    const data = await priority1Service.updateOrderStatus({
      ma_dh: req.params.id,
      trang_thai,
    });

    res.json({
      success: true,
      message: 'Cập nhật trạng thái đơn hàng thành công',
      data,
    });
  } catch (error) {
    next(error);
  }
}
module.exports = {
  getWarehouseDashboard,
  getStocks,

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