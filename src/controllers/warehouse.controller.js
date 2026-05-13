const warehouseService = require('../services/warehouse.service');

// ======================================================
// GET /api/warehouse/summary
// ======================================================
async function getSummary(req, res, next) {
  try {
    const data = await warehouseService.getWarehouseSummary();

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

// ======================================================
// GET /api/warehouse/stocks
// ======================================================
async function getStocks(req, res, next) {
  try {
    const keyword = req.query.q?.toString() || '';
    const data = await warehouseService.getStockItems(keyword);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

// ======================================================
// GET /api/warehouse/receipt-options
// ======================================================
async function getReceiptOptions(req, res, next) {
  try {
    const data = await warehouseService.getReceiptFormOptions();

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

// ======================================================
// POST /api/warehouse/receipts
// ======================================================
async function createReceipt(req, res, next) {
  try {
    const {
      ma_ncc,
      ma_nd_lap,
      phuong_thuc,
      items,
      ghi_chu,
    } = req.body;

    if (!ma_ncc) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn nhà cung cấp',
      });
    }

    if (!ma_nd_lap) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin người lập phiếu',
      });
    }

    if (!phuong_thuc) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn hình thức thanh toán',
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Phiếu nhập phải có ít nhất một sản phẩm',
      });
    }

    for (const item of items) {
      if (!item.ma_sp) {
        return res.status(400).json({
          success: false,
          message: 'Có dòng hàng chưa chọn sản phẩm',
        });
      }

      if (Number(item.so_luong) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Số lượng nhập phải lớn hơn 0',
        });
      }

      if (Number(item.gia_nhap) < 0) {
        return res.status(400).json({
          success: false,
          message: 'Giá nhập không hợp lệ',
        });
      }
    }

    const data = await warehouseService.createGoodsReceipt({
      ma_ncc,
      ma_nd_lap,
      phuong_thuc,
      ghi_chu: ghi_chu?.toString().trim(),
      items,
    });

    res.status(201).json({
      success: true,
      message: 'Lập phiếu nhập kho thành công',
      data,
    });
  } catch (error) {
    next(error);
  }
}

// ======================================================
// GET /api/warehouse/receipts
// ======================================================
async function getReceipts(req, res, next) {
  try {
    const keyword = req.query.q?.toString() || '';
    const data = await warehouseService.getGoodsReceipts(keyword);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

// ======================================================
// GET /api/warehouse/receipts/:id
// ======================================================
async function getReceiptDetail(req, res, next) {
  try {
    const data = await warehouseService.getGoodsReceiptDetail(req.params.id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phiếu nhập',
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
  getSummary,
  getStocks,
  getReceiptOptions,
  createReceipt,
  getReceipts,
  getReceiptDetail,
};