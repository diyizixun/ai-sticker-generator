import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.qq.com",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOTPEmail(email: string, code: string) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px;">
      <div style="background: white; border-radius: 12px; padding: 32px 24px; text-align: center;">
        <h1 style="color: #333; font-size: 24px; margin: 0 0 8px;">✨ AI Sticker</h1>
        <p style="color: #666; font-size: 14px; margin: 0 0 24px;">您的验证码</p>
        <div style="background: #f5f3ff; border-radius: 12px; padding: 24px; margin: 0 0 24px;">
          <p style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #6366f1; margin: 0; font-family: monospace;">${code}</p>
        </div>
        <p style="color: #999; font-size: 12px; margin: 0;">验证码 5 分钟内有效，请勿泄露</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"AI Sticker" <${process.env.SMTP_FROM}>`,
    to: email,
    subject: `AI Sticker 验证码: ${code}`,
    html,
  });
}
