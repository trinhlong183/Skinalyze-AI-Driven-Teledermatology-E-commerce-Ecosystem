import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private fromEmail: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    const fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL');
    if (!apiKey || !fromEmail) {
      this.logger.error(
        '❌ RESEND_API_KEY or RESEND_FROM_EMAIL is missing in environment variables',
      );
      throw new Error('Resend API key or from email missing');
    }
    this.fromEmail = fromEmail;
    this.resend = new Resend(apiKey);
    this.logger.log('✅ Resend email service initialized');
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;
    const html = this.createVerificationEmailTemplate(verificationUrl);
    const subject = '🔬 Xác Thực Email - Skinalyze AI Platform';
    await this.sendEmail(
      email,
      subject,
      html,
      `Vui lòng xác thực email tại: ${verificationUrl}`,
    );
  }

  async sendWelcomeEmail(email: string, fullName: string): Promise<void> {
    const html = this.createWelcomeEmailTemplate(fullName);
    const subject = '🎉 Chào mừng đến với Skinalyze!';
    await this.sendEmail(
      email,
      subject,
      html,
      `Chào mừng ${fullName} đến với Skinalyze AI Platform!`,
    );
  }

  async sendForgotPasswordEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    const html = this.createForgotPasswordEmailTemplate(resetUrl);
    const subject = '🔑 Đặt lại mật khẩu - Skinalyze';
    await this.sendEmail(
      email,
      subject,
      html,
      `Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng truy cập: ${resetUrl}`,
    );
  }

  async sendForgotPasswordOtpEmail(email: string, otp: string): Promise<void> {
    const html = this.createForgotPasswordOtpEmailTemplate(otp);
    const subject = '🔑 Mã xác thực đặt lại mật khẩu (OTP) - Skinalyze';
    await this.sendEmail(
      email,
      subject,
      html,
      `Mã OTP đặt lại mật khẩu của bạn là: ${otp}`,
    );
  }

  async sendAdminPasswordResetEmail(
    email: string,
    fullName: string,
    newPassword: string,
  ): Promise<void> {
    const html = this.createAdminPasswordResetTemplate(fullName, newPassword);
    const subject = '🔐 Mật khẩu của bạn đã được đặt lại - Skinalyze';
    await this.sendEmail(
      email,
      subject,
      html,
      `Mật khẩu tạm thời của bạn là: ${newPassword}. Vui lòng đổi mật khẩu sau khi đăng nhập.`,
    );
  }

  private async sendEmail(
    to: string,
    subject: string,
    html: string,
    text: string,
  ) {
    try {
      this.logger.log(`📧 Attempting to send email to: ${to}`);

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
        text,
      });

      if (result.error) {
        this.logger.error(
          `❌ Resend API error for ${to}:`,
          JSON.stringify(result.error),
        );
        throw new Error(`Resend API error: ${result.error.message}`);
      }

      this.logger.log(
        `✅ Email sent successfully to: ${to} (ID: ${result.data?.id})`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Email send failed to ${to}:`,
        error.message,
        error.stack,
      );
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  private censorAccountNumber(accountNumber: string): string {
    if (!accountNumber || accountNumber.length < 4) {
      return '****';
    }
    const visibleStart = accountNumber.substring(0, 2);
    const visibleEnd = accountNumber.substring(accountNumber.length - 2);
    const maskedLength = accountNumber.length - 4;
    const masked = '*'.repeat(maskedLength);
    return `${visibleStart}${masked}${visibleEnd}`;
  }

  private createVerificationEmailTemplate(verificationUrl: string): string {
    return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <title>Xác Thực Email - Skinalyze</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
            }
        </style>
    </head>
    <body style="background-color: #F0FDFB; padding: 20px; margin: 0;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
                <td align="center">
                    <div style="padding: 20px 0; text-align: center;">
                        <h1 style="color: #0D9488; font-size: 32px; font-weight: 700; margin: 0;">
                            Skinalyze
                        </h1>
                    </div>
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 550px; background: #FFFFFF; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.07); margin: 0 auto; overflow: hidden;">
                        <tr>
                            <td style="background-color: #14B8A6; height: 10px;"></td>
                        </tr>
                        <tr>
                            <td style="padding: 40px 40px 35px 40px;">
                                <h2 style="color: #1F2937; margin: 0 0 15px 0; font-size: 24px; font-weight: 600;">
                                    Xác Thực Email Của Bạn ✉️
                                </h2>
                                <p style="font-size: 16px; color: #4B5563; margin-bottom: 30px;">
                                    Chào mừng đến với Skinalyze! Vui lòng xác thực email để kích hoạt tài khoản.
                                </p>
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="${verificationUrl}" style="display: inline-block; background-color: #14B8A6; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 50px; font-weight: 600; font-size: 16px;">
                                        🔐 Xác Thực Ngay
                                    </a>
                                </div>
                                <div style="margin-top: 25px; background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 20px;">
                                    <p style="color: #92400E; font-size: 14px; margin: 0; font-weight: 500;">
                                        <strong>⏰ Lưu ý:</strong> Link này chỉ có hiệu lực trong <strong>24 giờ</strong>. Nếu bạn không đăng ký, hãy bỏ qua email này.
                                    </p>
                                </div>
                            </td>
                        </tr>
                    </table>
                    <div style="text-align: center; padding: 30px 20px; max-width: 550px; margin: 0 auto;">
                        <p style="color: #6B7280; font-size: 14px; margin: 0;">
                            Bạn nhận được email này vì đã đăng ký tài khoản tại Skinalyze.
                        </p>
                        <p style="color: #9CA3AF; font-size: 14px; margin: 5px 0 0 0;">
                            © ${new Date().getFullYear()} Skinalyze.
                        </p>
                    </div>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
  }

  private createWelcomeEmailTemplate(fullName: string): string {
    return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <title>Chào mừng - Skinalyze</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
            }
        </style>
    </head>
    <body style="background-color: #F0FDFB; padding: 20px; margin: 0;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
                <td align="center">
                    <div style="padding: 20px 0; text-align: center;">
                        <h1 style="color: #0D9488; font-size: 32px; font-weight: 700; margin: 0;">
                            Skinalyze
                        </h1>
                    </div>
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 550px; background: #FFFFFF; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.07); margin: 0 auto; overflow: hidden;">
                        <tr>
                            <td style="background-color: #14B8A6; height: 10px;"></td>
                        </tr>
                        <tr>
                            <td style="padding: 40px 40px 35px 40px;">
                                <h2 style="color: #1F2937; margin: 0 0 15px 0; font-size: 24px; font-weight: 600;">
                                    Chào mừng ${fullName}! 🎉
                                </h2>
                                <p style="font-size: 16px; color: #4B5563; margin-bottom: 30px;">
                                    Tài khoản của bạn đã được xác thực thành công. Hãy khám phá AI phân tích da ngay bây giờ!
                                </p>
                                <div style="background-color: #D1FAE5; border-radius: 8px; padding: 20px; margin: 25px 0;">
                                    <p style="color: #065F46; font-size: 16px; margin: 0; font-weight: 600; text-align: center;">
                                        ✨ Chúc mừng! Bạn đã tham gia cộng đồng Skinalyze
                                    </p>
                                </div>
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}" style="display: inline-block; background-color: #14B8A6; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 50px; font-weight: 600; font-size: 16px;">
                                        🚀 Bắt Đầu Ngay
                                    </a>
                                </div>
                            </td>
                        </tr>
                    </table>
                    <div style="text-align: center; padding: 30px 20px; max-width: 550px; margin: 0 auto;">
                        <p style="color: #6B7280; font-size: 14px; margin: 0;">
                            Chúc bạn có trải nghiệm tuyệt vời với Skinalyze!
                        </p>
                        <p style="color: #9CA3AF; font-size: 14px; margin: 5px 0 0 0;">
                            © ${new Date().getFullYear()} Skinalyze.
                        </p>
                    </div>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
  }

  private createForgotPasswordEmailTemplate(resetUrl: string): string {
    return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <title>Đặt lại mật khẩu - Skinalyze</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
            }
        </style>
    </head>
    <body style="background-color: #F0FDFB; padding: 20px; margin: 0;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
                <td align="center">
                    <div style="padding: 20px 0; text-align: center;">
                        <h1 style="color: #0D9488; font-size: 32px; font-weight: 700; margin: 0;">
                            Skinalyze
                        </h1>
                    </div>
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 550px; background: #FFFFFF; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.07); margin: 0 auto; overflow: hidden;">
                        <tr>
                            <td style="background-color: #14B8A6; height: 10px;"></td>
                        </tr>
                        <tr>
                            <td style="padding: 40px 40px 35px 40px;">
                                <h2 style="color: #1F2937; margin: 0 0 15px 0; font-size: 24px; font-weight: 600;">
                                    Đặt Lại Mật Khẩu 🔑
                                </h2>
                                <p style="font-size: 16px; color: #4B5563; margin-bottom: 30px;">
                                    Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.
                                </p>
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="${resetUrl}" style="display: inline-block; background-color: #14B8A6; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 50px; font-weight: 600; font-size: 16px;">
                                        🔒 Đặt Lại Mật Khẩu
                                    </a>
                                </div>
                                <div style="margin-top: 25px; background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 20px;">
                                    <p style="color: #92400E; font-size: 14px; margin: 0; font-weight: 500;">
                                        <strong>⏰ Lưu ý:</strong> Link này chỉ có hiệu lực trong <strong>30 phút</strong>. Nếu bạn không yêu cầu, hãy bỏ qua email này.
                                    </p>
                                </div>
                            </td>
                        </tr>
                    </table>
                    <div style="text-align: center; padding: 30px 20px; max-width: 550px; margin: 0 auto;">
                        <p style="color: #6B7280; font-size: 14px; margin: 0;">
                            Nếu bạn gặp khó khăn, hãy liên hệ với đội ngũ hỗ trợ.
                        </p>
                        <p style="color: #9CA3AF; font-size: 14px; margin: 5px 0 0 0;">
                            © ${new Date().getFullYear()} Skinalyze.
                        </p>
                    </div>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
  }

  private createForgotPasswordOtpEmailTemplate(otp: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Mã OTP đặt lại mật khẩu - Skinora</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background: linear-gradient(135deg, #2ECC71 0%, #27AE60 100%); padding: 40px 30px; text-align: center; border-radius: 15px 15px 0 0; box-shadow: 0 4px 15px rgba(46, 204, 113, 0.3);">
            <h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">🏥 SKINORA</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px; font-weight: 500;">Healthcare & Skincare Solution</p>
        </div>
        <div style="background: white; padding: 50px 40px; border-radius: 0 0 15px 15px; box-shadow: 0 8px 25px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 40px;">
                <div style="background: linear-gradient(135deg, #2ECC71 0%, #27AE60 100%); width: 100px; height: 100px; border-radius: 50%; margin: 0 auto 25px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 6px 20px rgba(46, 204, 113, 0.4);">
                    <span style="font-size: 45px; line-height: 1;">🔑</span>
                </div>
                <h2 style="color: #27AE60; margin: 0; font-size: 24px; font-weight: bold;">Mã OTP đặt lại mật khẩu</h2>
            </div>
            <div style="text-align: center; margin-bottom: 30px;">
                <p style="font-size: 18px; margin-bottom: 15px; color: #2C3E50;">Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản Skinora.</p>
                <p style="font-size: 16px; margin-bottom: 0; color: #666;">Vui lòng nhập mã OTP bên dưới vào ứng dụng hoặc website để tiếp tục:</p>
            </div>
            <div style="text-align: center; margin: 40px 0;">
                <div style="display: inline-block; padding: 18px 45px; background: linear-gradient(135deg, #2ECC71 0%, #27AE60 100%); color: white; border-radius: 50px; font-weight: bold; font-size: 32px; letter-spacing: 8px; box-shadow: 0 6px 20px rgba(46, 204, 113, 0.4);">
                  ${otp}
                </div>
            </div>
            <div style="background: linear-gradient(135deg, #E8F8F5 0%, #D5F4E6 100%); border-left: 5px solid #27AE60; padding: 25px; margin: 40px 0; border-radius: 8px;">
                <h3 style="color: #27AE60; margin: 0 0 15px 0; font-size: 18px; display: flex; align-items: center;">
                    <span style="margin-right: 10px;">🛡️</span>Lưu ý bảo mật
                </h3>
                <ul style="margin: 0; padding-left: 25px; color: #2C3E50; line-height: 1.8;">
                    <li>Mã OTP chỉ có hiệu lực trong <strong>10 phút</strong></li>
                    <li>Không chia sẻ mã này với bất kỳ ai</li>
                    <li>Nếu bạn không yêu cầu, hãy bỏ qua email này</li>
                </ul>
            </div>
            <p style="text-align: center; color: #7F8C8D; font-style: italic; font-size: 16px; margin-top: 30px;">
                Nếu bạn gặp khó khăn, hãy liên hệ với đội ngũ hỗ trợ của chúng tôi.
            </p>
        </div>
        <div style="text-align: center; padding: 30px 20px; color: #95A5A6; font-size: 14px; background: #ECF0F1; border-radius: 0 0 15px 15px;">
            <p style="margin: 0 0 8px 0;"><strong style="color: #27AE60;">Skinora Healthcare</strong> - Giải pháp chăm sóc da toàn diện</p>
            <p style="margin: 0; font-size: 12px;">© 2025 Skinora Healthcare. All rights reserved.</p>
            <div style="margin-top: 15px;">
                <span style="margin: 0 10px; color: #27AE60;">📧</span>
                <span style="margin: 0 10px; color: #27AE60;">📱</span>
                <span style="margin: 0 10px; color: #27AE60;">🌐</span>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private createAdminPasswordResetTemplate(
    fullName: string,
    newPassword: string,
  ): string {
    return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <title>Đặt lại mật khẩu - Skinalyze</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
            }
            .align-right {
                text-align: right;
            }
        </style>
    </head>
    <body style="background-color: #F0FDFB; padding: 20px; margin: 0;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
                <td align="center">
                    <div style="padding: 20px 0; text-align: center;">
                        <h1 style="color: #0D9488; font-size: 32px; font-weight: 700; margin: 0;">
                            Skinalyze
                        </h1>
                    </div>
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 550px; background: #FFFFFF; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.07); margin: 0 auto; overflow: hidden;">
                        <tr>
                            <td style="background-color: #14B8A6; height: 10px;"></td>
                        </tr>
                        <tr>
                            <td style="padding: 40px 40px 35px 40px;">
                                <h2 style="color: #1F2937; margin: 0 0 15px 0; font-size: 24px; font-weight: 600;">
                                    Mật Khẩu Tạm Thời 🔐
                                </h2>
                                <p style="font-size: 16px; color: #4B5563; margin-bottom: 20px;">
                                    Xin chào <strong>${fullName}</strong>,
                                </p>
                                <p style="font-size: 16px; color: #4B5563; margin-bottom: 30px;">
                                    Quản trị viên đã đặt lại mật khẩu cho tài khoản của bạn. Đây là mật khẩu tạm thời:
                                </p>
                                <div style="text-align: center; margin: 30px 0;">
                                    <div style="background-color: #CCFBF1; border: 2px dashed #14B8A6; border-radius: 12px; padding: 25px;">
                                        <p style="color: #4B5563; font-size: 14px; margin: 0 0 10px 0;">Mật khẩu tạm thời:</p>
                                        <h1 style="color: #0D9488; margin: 0; font-size: 32px; letter-spacing: 4px; font-weight: 700; font-family: 'Courier New', monospace;">${newPassword}</h1>
                                    </div>
                                </div>
                                <div style="margin-top: 25px; background-color: #FEF3C7; border: 1px solid #FDE68A; border-radius: 8px; padding: 20px;">
                                    <p style="color: #92400E; font-size: 14px; margin: 0; font-weight: 500;">
                                        <strong>⚠️ Lưu ý quan trọng:</strong> Vui lòng đổi mật khẩu ngay sau khi đăng nhập để bảo mật tài khoản của bạn.
                                    </p>
                                </div>
                                <div style="margin-top: 25px; background-color: #D1FAE5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 20px;">
                                    <p style="color: #065F46; font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">📋 Hướng dẫn:</p>
                                    <ol style="margin: 0; padding-left: 20px; color: #065F46; line-height: 1.8; font-size: 14px;">
                                        <li>Đăng nhập bằng mật khẩu tạm thời ở trên</li>
                                        <li>Vào phần <strong>Cài đặt tài khoản</strong></li>
                                        <li>Chọn <strong>Đổi mật khẩu</strong></li>
                                        <li>Nhập mật khẩu mới của bạn</li>
                                    </ol>
                                </div>
                            </td>
                        </tr>
                    </table>
                    <div style="text-align: center; padding: 30px 20px; max-width: 550px; margin: 0 auto;">
                        <p style="color: #6B7280; font-size: 14px; margin: 0;">
                            Bạn nhận được email này vì quản trị viên đã đặt lại mật khẩu cho tài khoản của bạn.
                        </p>
                        <p style="color: #9CA3AF; font-size: 14px; margin: 5px 0 0 0;">
                            © ${new Date().getFullYear()} Skinalyze.
                        </p>
                    </div>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
  }

  /**
   * Lưu preview template email (dùng cho debug/test UI email, không gửi thật)
   * Có thể log ra console hoặc lưu file nếu cần.
   */
  async saveEmailTemplatePreview(
    email: string,
    token: string,
    fullName?: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;
    const htmlContent = this.createVerificationEmailTemplate(verificationUrl);
    this.logger.log(`📧 [PREVIEW] Email template preview for: ${email}`);
    this.logger.log(`🔗 [PREVIEW] Verification URL: ${verificationUrl}`);
    if (fullName) {
      this.logger.log(`👤 [PREVIEW] Full name: ${fullName}`);
    }
  }

  async sendWithdrawalOTP(
    email: string,
    otpCode: string,
    amount: number,
    bankName?: string,
    accountNumber?: string,
  ): Promise<void> {
    const censoredAccount = accountNumber ? this.censorAccountNumber(accountNumber) : 'Chưa cung cấp';
    
    const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mã OTP Rút tiền - Skinalyze</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
            }
            .align-right {
                text-align: right;
            }
        </style>
    </head>
    <body style="background-color: #F0FDFB; padding: 20px; margin: 0;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
                <td align="center">
                    <div style="padding: 20px 0; text-align: center;">
                        <h1 style="color: #0D9488; font-size: 32px; font-weight: 700; margin: 0;">
                            Skinalyze
                        </h1>
                    </div>
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 550px; background: #FFFFFF; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.07); margin: 0 auto; overflow: hidden;">
                        <tr>
                            <td style="background-color: #14B8A6; height: 10px;"></td>
                        </tr>
                        <tr>
                            <td style="padding: 40px 40px 35px 40px;">
                                <h2 style="color: #1F2937; margin: 0 0 15px 0; font-size: 24px; font-weight: 600;">
                                    Mã OTP Xác Thực Rút Tiền 🔐
                                </h2>
                                <p style="font-size: 16px; color: #4B5563; margin-bottom: 30px;">
                                    Vui lòng sử dụng mã OTP bên dưới để xác nhận yêu cầu rút tiền của bạn.
                                </p>
                                <div style="text-align: center; margin: 30px 0;">
                                    <div style="background-color: #CCFBF1; border: 2px dashed #14B8A6; border-radius: 12px; padding: 25px;">
                                        <p style="color: #4B5563; font-size: 14px; margin: 0 0 10px 0;">Mã xác thực của bạn:</p>
                                        <h1 style="color: #0D9488; margin: 0; font-size: 48px; letter-spacing: 8px; font-weight: 700;">${otpCode}</h1>
                                    </div>
                                </div>
                                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 30px 0 0 0;">
                                    <tr>
                                        <td style="padding: 12px 0; font-size: 16px; color: #4B5563; border-bottom: 1px solid #E5E7EB;">
                                            Số tiền
                                        </td>
                                        <td class="align-right" style="padding: 12px 0; font-size: 16px; color: #1F2937; font-weight: 600; text-align: right; border-bottom: 1px solid #E5E7EB;">
                                            ${amount.toLocaleString()} VND
                                        </td>
                                    </tr>
                                    ${bankName ? `
                                    <tr>
                                        <td style="padding: 12px 0; font-size: 16px; color: #4B5563; border-bottom: 1px solid #E5E7EB;">
                                            Ngân hàng
                                        </td>
                                        <td class="align-right" style="padding: 12px 0; font-size: 16px; color: #1F2937; font-weight: 600; text-align: right; border-bottom: 1px solid #E5E7EB;">
                                            ${bankName}
                                        </td>
                                    </tr>
                                    ` : ''}
                                    ${accountNumber ? `
                                    <tr>
                                        <td style="padding: 12px 0; font-size: 16px; color: #4B5563; border-bottom: 1px solid #E5E7EB;">
                                            Số tài khoản
                                        </td>
                                        <td class="align-right" style="padding: 12px 0; font-size: 16px; color: #1F2937; font-weight: 600; text-align: right; border-bottom: 1px solid #E5E7EB;">
                                            ${censoredAccount}
                                        </td>
                                    </tr>
                                    ` : ''}
                                </table>
                                <div style="margin-top: 25px; background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 20px;">
                                    <p style="color: #92400E; font-size: 14px; margin: 0; font-weight: 500;">
                                        <strong>⏰ Lưu ý:</strong> Mã OTP này chỉ có hiệu lực trong <strong>10 phút</strong>. Không chia sẻ mã này với bất kỳ ai.
                                    </p>
                                </div>
                            </td>
                        </tr>
                    </table>
                    <div style="text-align: center; padding: 30px 20px; max-width: 550px; margin: 0 auto;">
                        <p style="color: #6B7280; font-size: 14px; margin: 0;">
                            Bạn nhận được email này vì đã yêu cầu rút tiền tại Skinalyze.
                        </p>
                        <p style="color: #9CA3AF; font-size: 14px; margin: 5px 0 0 0;">
                            © ${new Date().getFullYear()} Skinalyze.
                        </p>
                    </div>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
    
    const subject = 'Mã OTP Xác Thực Rút Tiền - Skinalyze';
    const text = `Mã OTP xác thực rút tiền của bạn là: ${otpCode}. Mã này có hiệu lực trong 10 phút.`;
    
    await this.sendEmail(email, subject, html, text);
  }

  async sendWithdrawalStatusUpdate(
    email: string,
    status: string,
    amount: number,
    bankName: string,
    reason?: string,
  ): Promise<void> {
    const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cập nhật Yêu cầu Rút tiền</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
            }
            .align-right {
                text-align: right;
            }
        </style>
    </head>
    <body style="background-color: #F0FDFB; padding: 20px; margin: 0;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
                <td align="center">
                    <div style="padding: 20px 0; text-align: center;">
                        <h1 style="color: #0D9488; font-size: 32px; font-weight: 700; margin: 0;">
                            Skinalyze
                        </h1>
                    </div>
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 550px; background: #FFFFFF; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.07); margin: 0 auto; overflow: hidden;">
                        <tr>
                            <td style="background-color: #14B8A6; height: 10px;"></td>
                        </tr>
                        <tr>
                            <td style="padding: 40px 40px 35px 40px;">
                                <h2 style="color: #1F2937; margin: 0 0 15px 0; font-size: 24px; font-weight: 600;">
                                    Yêu cầu đã được cập nhật!
                                </h2>
                                <p style="font-size: 16px; color: #4B5563; margin-bottom: 30px;">
                                    Yêu cầu rút tiền của bạn vừa thay đổi trạng thái.
                                </p>
                                <div style="text-align: center; margin: 30px 0;">
                                    <span style="font-size: 18px; font-weight: 600; color: #134E4A; background-color: #CCFBF1; border-radius: 50px; padding: 12px 30px; text-transform: uppercase; letter-spacing: 0.5px;">
                                        ${status}
                                    </span>
                                </div>
                                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 30px 0 0 0;">
                                    <tr>
                                        <td style="padding: 12px 0; font-size: 16px; color: #4B5563; border-bottom: 1px solid #E5E7EB;">
                                            Số tiền
                                        </td>
                                        <td class="align-right" style="padding: 12px 0; font-size: 16px; color: #1F2937; font-weight: 600; text-align: right; border-bottom: 1px solid #E5E7EB;">
                                            ${amount.toLocaleString()} VND
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 0; font-size: 16px; color: #4B5563; border-bottom: 1px solid #E5E7EB;">
                                            Ngân hàng
                                        </td>
                                        <td class="align-right" style="padding: 12px 0; font-size: 16px; color: #1F2937; font-weight: 600; text-align: right; border-bottom: 1px solid #E5E7EB;">
                                            ${bankName}
                                        </td>
                                    </tr>
                                </table>
                                ${reason ? `
                                <div style="margin-top: 25px; background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 20px;">
                                    <p style="color: #92400E; font-size: 16px; margin: 0; font-weight: 500;">
                                        <strong>Lý do:</strong> ${reason}
                                    </p>
                                </div>
                                ` : ''}
                            </td>
                        </tr>
                    </table>
                    <div style="text-align: center; padding: 30px 20px; max-width: 550px; margin: 0 auto;">
                        <p style="color: #6B7280; font-size: 14px; margin: 0;">
                            Bạn nhận được email này vì đã yêu cầu rút tiền tại Skinalyze.
                        </p>
                        <p style="color: #9CA3AF; font-size: 14px; margin: 5px 0 0 0;">
                            © ${new Date().getFullYear()} Skinalyze.
                        </p>
                    </div>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
    
    const subject = `Cập nhật Yêu cầu Rút tiền - ${status} - Skinalyze`;
    const text = `Yêu cầu rút tiền của bạn đã được cập nhật sang trạng thái: ${status}. Số tiền: ${amount.toLocaleString()} VND.`;
    
    await this.sendEmail(email, subject, html, text);
  }
}
