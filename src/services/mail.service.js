require('dotenv').config();

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendOtpEmail(toEmail, otp, purpose) {
  const subject =
    purpose === 'register'
      ? 'Mã OTP đăng ký tài khoản SAMCO'
      : 'Mã OTP đặt lại mật khẩu SAMCO';

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="color: #2563eb;">SAMCO OTP Verification</h2>
      <p>Mã OTP của bạn là:</p>

      <div style="
        display: inline-block;
        font-size: 32px;
        font-weight: bold;
        letter-spacing: 6px;
        padding: 14px 22px;
        background: #eff6ff;
        border-radius: 10px;
        color: #1d4ed8;
        margin: 12px 0;
      ">
        ${otp}
      </div>

      <p>Mã OTP có hiệu lực trong 5 phút.</p>
      <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.</p>
    </div>
  `;

  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM || 'SAMCO <onboarding@resend.dev>',
    to: [toEmail],
    subject,
    html,
  });

  if (error) {
    console.error('RESEND SEND OTP ERROR:', error);
    throw new Error(error.message || 'Không gửi được email OTP');
  }

  console.log('OTP email sent:', data);
  return data;
}

module.exports = {
  sendOtpEmail,
};