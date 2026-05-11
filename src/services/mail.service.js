const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

async function sendOtpEmail(toEmail, otp, purpose) {
  const subject =
    purpose === 'register'
      ? 'Mã OTP đăng ký tài khoản SAMCO'
      : 'Mã OTP đặt lại mật khẩu SAMCO';

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>SAMCO OTP Verification</h2>
      <p>Mã OTP của bạn là:</p>
      <h1 style="letter-spacing: 4px; color: #2563eb;">${otp}</h1>
      <p>Mã OTP có hiệu lực trong 5 phút.</p>
      <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.</p>
    </div>
  `;

  return transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: toEmail,
    subject,
    html,
  });
}

module.exports = {
  sendOtpEmail,
};