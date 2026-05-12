const managerService = require('../services/manager.service');

// ======================================================
// DASHBOARD
// ======================================================
async function getDashboard(req, res, next) {
  try {
    const data = await managerService.getDashboardSummary();

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

// ======================================================
// DANH MỤC
// ======================================================
async function getCategories(req, res, next) {
  try {
    const data = await managerService.getCategories();

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function createCategory(req, res, next) {
  try {
    const { ten_dm, mo_ta } = req.body;

    if (!ten_dm || !ten_dm.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tên danh mục không được để trống',
      });
    }

    const data = await managerService.createCategory({
      ten_dm: ten_dm.trim(),
      mo_ta: mo_ta?.trim(),
    });

    res.status(201).json({
      success: true,
      message: 'Thêm danh mục thành công',
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    const { ten_dm, mo_ta } = req.body;

    if (!ten_dm || !ten_dm.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tên danh mục không được để trống',
      });
    }

    const data = await managerService.updateCategory(id, {
      ten_dm: ten_dm.trim(),
      mo_ta: mo_ta?.trim(),
    });

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy danh mục',
      });
    }

    res.json({
      success: true,
      message: 'Cập nhật danh mục thành công',
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteCategory(req, res, next) {
  try {
    const { id } = req.params;

    const data = await managerService.deleteCategory(id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy danh mục',
      });
    }

    res.json({
      success: true,
      message: 'Xóa danh mục thành công',
    });
  } catch (error) {
    next(error);
  }
}

// ======================================================
// SẢN PHẨM
// ======================================================
async function getProducts(req, res, next) {
  try {
    const keyword = req.query.q?.toString() || '';
    const data = await managerService.getProducts(keyword);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

function validateProductBody(body) {
  const {
    ma_dm,
    ten_sp,
    don_vi_tinh,
    ma_vach,
    gia_ban,
    gia_nhap,
    ton_toi_thieu,
  } = body;

  if (!ma_dm) return 'Vui lòng chọn danh mục';
  if (!ten_sp || !ten_sp.trim()) return 'Tên sản phẩm không được để trống';
  if (!don_vi_tinh || !don_vi_tinh.trim()) return 'Đơn vị tính không được để trống';
  if (!ma_vach || !ma_vach.trim()) return 'Mã vạch không được để trống';

  if (gia_ban === undefined || Number(gia_ban) < 0) {
    return 'Giá bán không hợp lệ';
  }

  if (gia_nhap === undefined || Number(gia_nhap) < 0) {
    return 'Giá nhập không hợp lệ';
  }

  if (ton_toi_thieu === undefined || Number(ton_toi_thieu) < 0) {
    return 'Tồn tối thiểu không hợp lệ';
  }

  return null;
}

async function createProduct(req, res, next) {
  try {
    const validationError = validateProductBody(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const data = await managerService.createProduct({
      ...req.body,
      gia_ban: Number(req.body.gia_ban),
      gia_nhap: Number(req.body.gia_nhap),
      ton_toi_thieu: Number(req.body.ton_toi_thieu),
    });

    res.status(201).json({
      success: true,
      message: 'Thêm sản phẩm thành công',
      data,
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Mã vạch đã tồn tại',
      });
    }

    next(error);
  }
}

async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const validationError = validateProductBody(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const data = await managerService.updateProduct(id, {
      ...req.body,
      gia_ban: Number(req.body.gia_ban),
      gia_nhap: Number(req.body.gia_nhap),
      ton_toi_thieu: Number(req.body.ton_toi_thieu),
    });

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm',
      });
    }

    res.json({
      success: true,
      message: 'Cập nhật sản phẩm thành công',
      data,
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Mã vạch đã tồn tại',
      });
    }

    next(error);
  }
}

async function updateProductStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { trang_thai_kinh_doanh } = req.body;

    if (typeof trang_thai_kinh_doanh !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái sản phẩm không hợp lệ',
      });
    }

    const data = await managerService.updateProductStatus(
      id,
      trang_thai_kinh_doanh
    );

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm',
      });
    }

    res.json({
      success: true,
      message: 'Cập nhật trạng thái thành công',
      data,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboard,

  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,

  getProducts,
  createProduct,
  updateProduct,
  updateProductStatus,
};