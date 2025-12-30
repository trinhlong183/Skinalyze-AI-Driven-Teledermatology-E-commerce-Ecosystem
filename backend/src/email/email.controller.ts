import { Controller } from '@nestjs/common';
import { EmailService } from './email.service';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  // Email service không có REST endpoints
  // Các method được gọi internally từ AuthService
  // Để test email, dùng /auth/register và /auth/resend-verification
}
