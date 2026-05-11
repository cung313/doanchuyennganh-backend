const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { sendOtpEmail } = require('../services/mail.service');
require('dotenv').config();

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function saveOtp({ email, otp, purpose }) {
  const expiredAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

  await pool.query(
    `
    UPDATE otp_codes
    SET is_used = TRUE
    WHERE email = $1 AND purpose = $2 AND is_used = FALSE
    `,
    [email, purpose]
  );

  await pool.query(
    `
    INSERT INTO otp_codes (email, otp_code, purpose, expired_at)
    VALUES ($1, $2, $3, $4)
    `,
    [email, otp, purpose, expiredAt]
  );
}

async function getValidOtp({ email, otp, purpose }) {
  const result = await pool.query(
    `
    SELECT *
    FROM otp_codes
    WHERE email = $1
      AND otp_code = $2
      AND purpose = $3
      AND is_used = FALSE
      AND expired_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [email, otp, purpose]
  );

  return result.rows[0] || null;
}

async function markOtpUsed(id) {
  await pool.query(
    `
    UPDATE otp_codes
    SET is_used = TRUE
    WHERE id = $1
    `,
    [id]
  );
}

// ================= LOGIN =================
exports.login = async (req, res) => {
  try {
    const { ten_dang_nhap, mat_khau } = req.body;

    if (!ten_dang_nhap || !mat_khau) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu tên đăng nhập/email hoặc mật khẩu',
      });
    }

    const result = await pool.query(
      `
      SELECT ma_nd, ho_ten, ten_dang_nhap, email, mat_khau_hash, vai_tro, trang_thai
      FROM nguoi_dung
      WHERE ten_dang_nhap = $1 OR email = $1
      LIMIT 1
      `,
      [ten_dang_nhap]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Sai tên đăng nhập, email hoặc mật khẩu',
      });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(mat_khau, user.mat_khau_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Sai tên đăng nhập, email hoặc mật khẩu',
      });
    }

    if (user.trang_thai === false) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản đã bị khóa',
      });
    }

    const token = jwt.sign(
      {
        ma_nd: user.ma_nd,
        vai_tro: user.vai_tro,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    delete user.mat_khau_hash;

    return res.json({
      success: true,
      message: 'Đăng nhập thành công',
      token,
      user,
    });
  } catch (error) {
    console.error('LOGIN ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi đăng nhập',
      error: error.message,
    });
  }
};

// ================= REGISTER SEND OTP =================
exports.sendRegisterOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email',
      });
    }

    const checkUser = await pool.query(
      `
      SELECT ma_nd
      FROM nguoi_dung
      WHERE email = $1
      LIMIT 1
      `,
      [email]
    );

    if (checkUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email đã tồn tại',
      });
    }

    const otp = generateOtp();

    await saveOtp({
      email,
      otp,
      purpose: 'register',
    });

    await sendOtpEmail(email, otp, 'register');

    return res.json({
      success: true,
      message: 'OTP đăng ký đã được gửi qua email',
    });
  } catch (error) {
    console.error('SEND REGISTER OTP ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi gửi OTP đăng ký',
      error: error.message,
    });
  }
};

// ================= REGISTER VERIFY OTP =================
exports.verifyRegisterOtp = async (req, res) => {
  try {
    const { ten_dang_nhap, email, otp, ho_ten, mat_khau } = req.body;

    if (!ten_dang_nhap || !email || !otp || !ho_ten || !mat_khau) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin xác minh đăng ký',
      });
    }

    const validOtp = await getValidOtp({
      email,
      otp,
      purpose: 'register',
    });

    if (!validOtp) {
      return res.status(400).json({
        success: false,
        message: 'OTP không đúng hoặc đã hết hạn',
      });
    }

    const checkEmail = await pool.query(
      `
      SELECT ma_nd
      FROM nguoi_dung
      WHERE email = $1
      LIMIT 1
      `,
      [email]
    );

    if (checkEmail.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email đã tồn tại',
      });
    }

    const checkUsername = await pool.query(
      `
      SELECT ma_nd
      FROM nguoi_dung
      WHERE ten_dang_nhap = $1
      LIMIT 1
      `,
      [ten_dang_nhap]
    );

    if (checkUsername.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tên đăng nhập đã tồn tại',
      });
    }

    const passwordHash = await bcrypt.hash(mat_khau, 10);

    const createUser = await pool.query(
      `
      INSERT INTO nguoi_dung (
        ho_ten,
        ten_dang_nhap,
        email,
        mat_khau_hash,
        vai_tro,
        trang_thai
      )
      VALUES ($1, $2, $3, $4, 'NV_BAN_HANG', TRUE)
      RETURNING ma_nd, ho_ten, ten_dang_nhap, email, vai_tro, trang_thai
      `,
      [ho_ten, ten_dang_nhap, email, passwordHash]
    );

    await markOtpUsed(validOtp.id);

    return res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      user: createUser.rows[0],
    });
  } catch (error) {
    console.error('VERIFY REGISTER OTP ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi xác minh OTP đăng ký',
      error: error.message,
    });
  }
};
// ================= FORGOT PASSWORD SEND OTP =================
exports.sendForgotPasswordOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email',
      });
    }

    const checkUser = await pool.query(
      `
      SELECT ma_nd
      FROM nguoi_dung
      WHERE email = $1
      LIMIT 1
      `,
      [email]
    );

    if (checkUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản với email này',
      });
    }

    const otp = generateOtp();

    await saveOtp({
      email,
      otp,
      purpose: 'forgot_password',
    });

    await sendOtpEmail(email, otp, 'forgot_password');

    return res.json({
      success: true,
      message: 'OTP quên mật khẩu đã được gửi qua email',
    });
  } catch (error) {
    console.error('SEND FORGOT OTP ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi gửi OTP quên mật khẩu',
      error: error.message,
    });
  }
};

// ================= VERIFY OTP FORGOT PASSWORD =================
exports.verifyForgotPasswordOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu email hoặc OTP',
      });
    }

    const validOtp = await getValidOtp({
      email,
      otp,
      purpose: 'forgot_password',
    });

    if (!validOtp) {
      return res.status(400).json({
        success: false,
        message: 'OTP không đúng hoặc đã hết hạn',
      });
    }

    return res.json({
      success: true,
      message: 'OTP hợp lệ',
    });
  } catch (error) {
    console.error('VERIFY FORGOT OTP ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi xác minh OTP quên mật khẩu',
      error: error.message,
    });
  }
};

// ================= RESET PASSWORD =================
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, new_password } = req.body;

    if (!email || !otp || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin đặt lại mật khẩu',
      });
    }

    const validOtp = await getValidOtp({
      email,
      otp,
      purpose: 'forgot_password',
    });

    if (!validOtp) {
      return res.status(400).json({
        success: false,
        message: 'OTP không đúng hoặc đã hết hạn',
      });
    }

    const passwordHash = await bcrypt.hash(new_password, 10);

    const updateResult = await pool.query(
      `
      UPDATE nguoi_dung
      SET mat_khau_hash = $1
      WHERE email = $2
      RETURNING ma_nd
      `,
      [passwordHash, email]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản',
      });
    }

    await markOtpUsed(validOtp.id);

    return res.json({
      success: true,
      message: 'Đổi mật khẩu thành công',
    });
  } catch (error) {
    console.error('RESET PASSWORD ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi đặt lại mật khẩu',
      error: error.message,
    });
  }
};