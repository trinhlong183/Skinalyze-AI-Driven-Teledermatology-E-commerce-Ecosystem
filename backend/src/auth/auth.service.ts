import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { AddressService } from '../address/address.service';
import { CustomersService } from '../customers/customers.service';
import { DermatologistsService } from '../dermatologists/dermatologists.service';
import { EmailService } from '../email/email.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { User, UserRole } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { ResponseHelper } from '../utils/responses';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly addressService: AddressService,
    private readonly customersService: CustomersService,
    private readonly dermatologistsService: DermatologistsService,
    private readonly emailService: EmailService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      if (!user.isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const fullUser = await this.usersService.findByEmail(loginDto.email);
    if (!fullUser) {
      throw new UnauthorizedException('User not found');
    }

    const payload = {
      email: user.email,
      sub: user.userId,
      role: user.role,
    };

    return ResponseHelper.success('Login successful', {
      access_token: this.jwtService.sign(payload),
      user: {
        userId: fullUser.userId,
        email: fullUser.email,
        fullName: fullUser.fullName,
        phone: fullUser.phone,
        dob: fullUser.dob,
        photoUrl: fullUser.photoUrl,
        addresses: fullUser.addresses || [],
        balance: fullUser.balance,
        role: fullUser.role,
        isActive: fullUser.isActive,
        isVerified: fullUser.isVerified,
        createdAt: fullUser.createdAt,
        updatedAt: fullUser.updatedAt,
      },
    });
  }

  async register(registerDto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Validate required fields
    if (!registerDto.fullName) {
      throw new BadRequestException('Full name is required');
    }

    // Create user data with explicit field mapping
    // Password will be hashed by usersService.create()
    const userData = {
      email: registerDto.email,
      password: registerDto.password, // Pass plain password, will be hashed in usersService
      fullName: registerDto.fullName,
      phone: registerDto.phone,
      dob: registerDto.dob,
      photoUrl: registerDto.photoUrl,
      gender: registerDto.gender, // Add this line to include gender
      role: registerDto.role || UserRole.CUSTOMER, // Default to CUSTOMER if not provided
    };

    const user = await this.usersService.create(userData);

    // Generate email verification token
    const emailVerificationToken = uuidv4();
    const emailVerificationTokenExpiry = new Date();
    emailVerificationTokenExpiry.setHours(
      emailVerificationTokenExpiry.getHours() + 24,
    ); // Token hết hạn sau 24 giờ

    // Save token to user
    await this.usersService.update(user.userId, {
      emailVerificationToken,
      emailVerificationTokenExpiry,
    });

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(
        user.email,
        emailVerificationToken,
      );
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Không throw error, vẫn cho phép đăng ký thành công
    }

    // Create address for the user
    const addressData = {
      userId: user.userId,
      street: registerDto.street,
      streetLine1: registerDto.streetLine1,
      streetLine2: registerDto.streetLine2,
      wardOrSubDistrict: registerDto.wardOrSubDistrict,
      district: registerDto.district,
      city: registerDto.city,
      districtId: registerDto.districtId,
      wardCode: registerDto.wardCode,
    };

    const address = await this.addressService.create(addressData);

    // Auto-create Customer or Dermatologist based on role
    if (user.role === UserRole.CUSTOMER) {
      await this.customersService.create({
        userId: user.userId,
        aiUsageAmount: 0,
      });
    } else if (user.role === UserRole.DERMATOLOGIST) {
      await this.dermatologistsService.create(user.userId, {
        yearsOfExp: 0,
      });
    }

    // Generate JWT token
    const payload = {
      email: user.email,
      sub: user.userId,
      role: user.role,
    };

    return ResponseHelper.created('User registered successfully', {
      access_token: this.jwtService.sign(payload),
      user: {
        userId: user.userId,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        dob: user.dob,
        photoUrl: user.photoUrl,
        addresses: [address],
        balance: user.balance,
        role: user.role,
        isActive: user.isActive,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      message:
        'Vui lòng kiểm tra email để xác thực tài khoản. Link xác thực có hiệu lực trong 24 giờ.',
    });
  }

  async verifyEmail(token: string) {
    // Find user with this token
    const users = await this.usersService.findAll();
    const user = users.find(
      (u) =>
        u.emailVerificationToken === token &&
        u.emailVerificationTokenExpiry &&
        new Date(u.emailVerificationTokenExpiry) > new Date(),
    );

    if (!user) {
      throw new BadRequestException(
        'Token xác thực không hợp lệ hoặc đã hết hạn',
      );
    }

    // Update user as verified
    await this.usersService.update(user.userId, {
      isVerified: true,
      emailVerificationToken: undefined,
      emailVerificationTokenExpiry: undefined,
    });

    // Send welcome email
    try {
      await this.emailService.sendWelcomeEmail(user.email, user.fullName);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }

    return ResponseHelper.success(
      'Email đã được xác thực thành công! Chào mừng bạn đến với Skinalyze.',
    );
  }

  async resendVerificationEmail(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new BadRequestException('Không tìm thấy người dùng');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email đã được xác thực');
    }

    // Generate new token
    const emailVerificationToken = uuidv4();
    const emailVerificationTokenExpiry = new Date();
    emailVerificationTokenExpiry.setHours(
      emailVerificationTokenExpiry.getHours() + 24,
    );

    await this.usersService.update(user.userId, {
      emailVerificationToken,
      emailVerificationTokenExpiry,
    });

    // Send email
    await this.emailService.sendVerificationEmail(
      user.email,
      emailVerificationToken,
    );

    return ResponseHelper.success(
      'Email xác thực đã được gửi lại. Vui lòng kiểm tra hộp thư.',
    );
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.usersService.findOne(userId);

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      saltRounds,
    );

    // Update password
    await this.usersService.update(userId, {
      password: hashedNewPassword,
    });

    return ResponseHelper.success('Password changed successfully');
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findOne(userId);
    const { password, ...profile } = user;
    return ResponseHelper.success('Profile retrieved successfully', profile);
  }

  async updateProfile(userId: string, updateData: Partial<User>) {
    // Remove sensitive fields that shouldn't be updated via this method
    const {
      password,
      role,
      isActive,
      userId: id,
      ...safeUpdateData
    } = updateData;

    const updatedUser = await this.usersService.update(userId, safeUpdateData);
    return ResponseHelper.success('Profile updated successfully', updatedUser);
  }

  async deactivateAccount(userId: string) {
    await this.usersService.update(userId, { isActive: false });
    return ResponseHelper.success('Account deactivated successfully');
  }
}
