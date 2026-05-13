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
    const data = await managerService.deleteCategory(req.params.id);

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
    const data = await managerService.getProducts(req.query.q || '');

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function createProduct(req, res, next) {
  try {
    const data = await managerService.createProduct(req.body);

    res.status(201).json({
      success: true,
      message: 'Thêm sản phẩm thành công',
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function updateProduct(req, res, next) {
  try {
    const data = await managerService.updateProduct(
      req.params.id,
      req.body
    );

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
    next(error);
  }
}

async function updateProductStatus(req, res, next) {
  try {
    const { trang_thai_kinh_doanh } = req.body;

    const data = await managerService.updateProductStatus(
      req.params.id,
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

// ======================================================
// NHÀ CUNG CẤP
// ======================================================
async function getSuppliers(req, res, next) {
  try {
    const data = await managerService.getSuppliers(req.query.q || '');

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function createSupplier(req, res, next) {
  try {
    const { ten_ncc } = req.body;

    if (!ten_ncc || !ten_ncc.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tên nhà cung cấp không được để trống',
      });
    }

    const data = await managerService.createSupplier(req.body);

    res.status(201).json({
      success: true,
      message: 'Thêm nhà cung cấp thành công',
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function updateSupplier(req, res, next) {
  try {
    const data = await managerService.updateSupplier(
      req.params.id,
      req.body
    );

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhà cung cấp',
      });
    }

    res.json({
      success: true,
      message: 'Cập nhật nhà cung cấp thành công',
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteSupplier(req, res, next) {
  try {
    const data = await managerService.deleteSupplier(req.params.id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhà cung cấp',
      });
    }

    res.json({
      success: true,
      message: 'Xóa nhà cung cấp thành công',
    });
  } catch (error) {
    next(error);
  }
}

// ======================================================
// CÔNG NỢ
// ======================================================
async function getDebts(req, res, next) {
  try {
    const data = await managerService.getDebts({
      keyword: req.query.q || '',
      type: req.query.type || '',
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
// BÁO CÁO
// ======================================================
async function getReportsSummary(req, res, next) {
  try {
    const data = await managerService.getReportsSummary();

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

// ======================================================
// NGƯỜI DÙNG
// ======================================================
async function getUsers(req, res, next) {
  try {
    const data = await managerService.getUsers(req.query.q || '');

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const {
      ho_ten,
      ten_dang_nhap,
      email,
      mat_khau,
      vai_tro,
    } = req.body;

    if (
      !ho_ten ||
      !ten_dang_nhap ||
      !email ||
      !mat_khau ||
      !vai_tro
    ) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin người dùng',
      });
    }

    const data = await managerService.createUser(req.body);

    res.status(201).json({
      success: true,
      message: 'Tạo người dùng thành công',
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function updateUserStatus(req, res, next) {
  try {
    const { trang_thai } = req.body;

    const data = await managerService.updateUserStatus(
      req.params.id,
      trang_thai
    );

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng',
      });
    }

    res.json({
      success: true,
      message: 'Cập nhật trạng thái tài khoản thành công',
      data,
    });
  } catch (error) {
    next(error);
  }
}
async function updateUserRole(req, res, next) {
  try {
    const { vai_tro } = req.body;

    const allowedRoles = [
      'QUAN_LY',
      'NV_BAN_HANG',
      'NV_KHO',
    ];

    if (!allowedRoles.includes(vai_tro)) {
      return res.status(400).json({
        success: false,
        message: 'Quyền người dùng không hợp lệ',
      });
    }

    const data = await managerService.updateUserRole(
      req.params.id,
      vai_tro
    );

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng',
      });
    }

    res.json({
      success: true,
      message: 'Cập nhật quyền người dùng thành công',
      data,
    });
  } catch (error) {
    // Nếu DB enum chưa có role NV_KHO thì báo rõ hơn
    if (error.code === '22P02') {
      return res.status(400).json({
        success: false,
        message:
          'Database chưa hỗ trợ quyền này. Cần thêm role vào enum vai_tro.',
      });
    }

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

  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,

  getDebts,

  getReportsSummary,

  getUsers,
  createUser,
  updateUserStatus,
  updateUserRole,
};