import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Patch,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiResponseProperty,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { GetUser } from './decorators/get-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { ResponseHelper } from '../utils/responses';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Create a new user account with email and password. Returns access token upon successful registration.',
  })
  @ApiBody({
    type: RegisterDto,
    examples: {
      complete: {
        summary: 'Complete user registration with address',
        value: {
          email: 'john.doe@example.com',
          password: 'SecurePassword123!',
          fullName: 'John Doe',
          phone: '+84901234567',
          dob: '1990-01-15',
          photoUrl: 'https://example.com/photos/john.jpg',
          gender: true, // Add this to the example (true for Male)
          street: '123 Nguyen Hue Street',
          streetLine1: 'Building A, Floor 5',
          streetLine2: 'Apartment 502',
          wardOrSubDistrict: 'Ben Nghe Ward',
          district: 'District 1',
          city: 'Ho Chi Minh City',
        },
      },
      minimal: {
        summary: 'Minimal registration (required fields only)',
        value: {
          email: 'jane.smith@example.com',
          password: 'SecurePassword456!',
          fullName: 'Jane Smith',
          gender: false, // Add this to the example (false for Female)
          street: '456 Le Loi Boulevard',
          wardOrSubDistrict: 'Ben Thanh Ward',
          district: 'District 1',
          city: 'Ho Chi Minh City',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    schema: {
      example: {
        statusCode: 201,
        message: 'User registered successfully',
        data: {
          access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          user: {
            userId: '550e8400-e29b-41d4-a716-446655440000',
            email: 'john.doe@example.com',
            fullName: 'John Doe',
            phone: '+84901234567',
            dob: '1990-01-15',
            photoUrl: null,
            addresses: [
              {
                addressId: '650e8400-e29b-41d4-a716-446655440000',
                userId: '550e8400-e29b-41d4-a716-446655440000',
                street: '123 Nguyen Hue Street',
                streetLine1: 'Building A, Floor 5',
                streetLine2: 'Apartment 502',
                wardOrSubDistrict: 'Ben Nghe Ward',
                district: 'District 1',
                city: 'Ho Chi Minh City',
                createdAt: '2025-10-03T10:30:00.000Z',
                updatedAt: '2025-10-03T10:30:00.000Z',
              },
            ],
            balance: 0,
            role: 'customer',
            isActive: true,
            isVerified: false,
            createdAt: '2025-10-03T10:30:00.000Z',
            updatedAt: '2025-10-03T10:30:00.000Z',
          },
        },
        timestamp: '2025-10-03T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
    schema: {
      example: {
        statusCode: 400,
        message: 'Validation failed',
        errors: {
          email: 'Invalid email format',
          password: 'Password must be at least 8 characters',
        },
        timestamp: '2025-10-03T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'User already exists',
    schema: {
      example: {
        statusCode: 409,
        message: 'User with this email already exists',
        timestamp: '2025-10-03T10:30:00.000Z',
      },
    },
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login user',
    description:
      'Authenticate user with email and password. Returns JWT access token for subsequent API calls.',
  })
  @ApiBody({
    type: LoginDto,
    examples: {
      customer: {
        summary: 'Customer login',
        value: {
          email: 'customer@example.com',
          password: 'CustomerPass123!',
        },
      },
      admin: {
        summary: 'Admin login',
        value: {
          email: 'admin@example.com',
          password: 'AdminPass123!',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful - returns access token',
    schema: {
      example: {
        statusCode: 200,
        message: 'Login successful',
        data: {
          access_token:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImpvaG4uZG9lQGV4YW1wbGUuY29tIiwic3ViIjoiNTUwZTg0MDAtZTI5Yi00MWQ0LWE3MTYtNDQ2NjU1NDQwMDAwIiwicm9sZSI6ImN1c3RvbWVyIiwiaWF0IjoxNjk2MzI5MDAwLCJleHAiOjE2OTYzMzI2MDB9...',
          user: {
            userId: '550e8400-e29b-41d4-a716-446655440000',
            email: 'john.doe@example.com',
            fullName: 'John Doe',
            phone: '+84901234567',
            dob: '1990-01-15',
            photoUrl: 'https://example.com/photos/john.jpg',
            addresses: [
              {
                addressId: '650e8400-e29b-41d4-a716-446655440000',
                street: '123 Nguyen Hue Street',
                wardOrSubDistrict: 'Ben Nghe Ward',
                district: 'District 1',
                city: 'Ho Chi Minh City',
              },
            ],
            balance: 1500000,
            role: 'customer',
            isActive: true,
            isVerified: true,
            createdAt: '2025-09-01T10:00:00.000Z',
            updatedAt: '2025-10-03T10:30:00.000Z',
          },
        },
        timestamp: '2025-10-03T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or account deactivated',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid email or password',
        timestamp: '2025-10-03T10:30:00.000Z',
      },
    },
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      "Retrieve the authenticated user's profile information. Requires valid JWT token.",
  })
  @ApiResponse({
    status: 200,
    description: 'Returns user profile',
    schema: {
      example: {
        statusCode: 200,
        message: 'Profile retrieved successfully',
        data: {
          userId: '550e8400-e29b-41d4-a716-446655440000',
          email: 'john.doe@example.com',
          fullName: 'John Doe',
          phone: '+84901234567',
          dob: '1990-01-15',
          photoUrl: 'https://example.com/photos/john.jpg',
          addresses: [
            {
              addressId: '650e8400-e29b-41d4-a716-446655440000',
              street: '123 Nguyen Hue Street',
              wardOrSubDistrict: 'Ben Nghe Ward',
              district: 'District 1',
              city: 'Ho Chi Minh City',
            },
          ],
          balance: 1500000,
          role: 'customer',
          isActive: true,
          isVerified: true,
          createdAt: '2025-09-01T10:00:00.000Z',
          updatedAt: '2025-10-03T10:30:00.000Z',
        },
        timestamp: '2025-10-03T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        timestamp: '2025-10-03T10:30:00.000Z',
      },
    },
  })
  async getProfile(@GetUser() user: User) {
    return this.authService.getProfile(user.userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update current user profile',
    description:
      "Update the authenticated user's profile information. Cannot update password, role, or isActive fields through this endpoint. To manage addresses, use the /address endpoints.",
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fullName: { type: 'string', example: 'John Updated Doe' },
        phone: { type: 'string', example: '+84907654321' },
        dob: { type: 'string', example: '1990-01-15' },
        photoUrl: {
          type: 'string',
          example: 'https://example.com/photos/new-john.jpg',
        },
        allergies: { type: 'array', items: { type: 'string' }, example: ['peanuts', 'shellfish'] },
      },
    },
    examples: {
      updateName: {
        summary: 'Update name only',
        value: {
          fullName: 'John Updated Doe',
        },
      },
      updateMultiple: {
        summary: 'Update multiple fields',
        value: {
          fullName: 'John Updated Doe',
          phone: '+84907654321',
          photoUrl: 'https://example.com/photos/new-john.jpg',
          allergies: ['peanuts', 'shellfish'],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Profile updated successfully',
        data: {
          userId: '550e8400-e29b-41d4-a716-446655440000',
          email: 'john.doe@example.com',
          fullName: 'John Updated Doe',
          phone: '+84907654321',
          dob: '1990-01-15',
          photoUrl: 'https://example.com/photos/new-john.jpg',
          addresses: [
            {
              addressId: '650e8400-e29b-41d4-a716-446655440000',
              street: '123 Nguyen Hue Street',
              wardOrSubDistrict: 'Ben Nghe Ward',
              district: 'District 1',
              city: 'Ho Chi Minh City',
            },
          ],
          balance: 1500000,
          role: 'customer',
          isActive: true,
          isVerified: true,
          createdAt: '2025-09-01T10:00:00.000Z',
          updatedAt: '2025-10-03T11:00:00.000Z',
        },
        timestamp: '2025-10-03T11:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        timestamp: '2025-10-03T10:30:00.000Z',
      },
    },
  })
  async updateProfile(
    @GetUser() user: User,
    @Body() updateData: Partial<User>,
  ) {
    return this.authService.updateProfile(user.userId, updateData);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change user password',
    description:
      "Change the authenticated user's password. Requires current password for verification.",
  })
  @ApiBody({
    type: ChangePasswordDto,
    examples: {
      changePassword: {
        summary: 'Change password example',
        value: {
          currentPassword: 'OldPassword123!',
          newPassword: 'NewSecurePassword456!',
          confirmPassword: 'NewSecurePassword456!',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Password changed successfully',
        timestamp: '2025-10-03T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      "Bad request - Current password is incorrect or passwords don't match",
    schema: {
      example: {
        statusCode: 400,
        message: 'Current password is incorrect',
        timestamp: '2025-10-03T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        timestamp: '2025-10-03T10:30:00.000Z',
      },
    },
  })
  async changePassword(
    @GetUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.userId, changePasswordDto);
  }

  @Post('verify-email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify user email',
    description:
      "Mark the user's email as verified. In production, this would typically be called after email verification link is clicked.",
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Email verified successfully',
        timestamp: '2025-10-03T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        timestamp: '2025-10-03T10:30:00.000Z',
      },
    },
  })
  async updateProfileEndpoint(
    @GetUser() user: User,
    @Body() updateData: Partial<User>,
  ) {
    return this.authService.updateProfile(user.userId, updateData);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deactivate user account',
    description:
      "Deactivate the authenticated user's account. User will not be able to login after deactivation.",
  })
  @ApiResponse({
    status: 200,
    description: 'Account deactivated successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Account deactivated successfully',
        timestamp: '2025-10-03T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        timestamp: '2025-10-03T10:30:00.000Z',
      },
    },
  })
  async deactivateAccount(@GetUser() user: User) {
    return this.authService.deactivateAccount(user.userId);
  }

  // Admin only routes
  @Get('admin/users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all users (Admin only)',
    description:
      'Retrieve a list of all registered users. Only accessible by administrators.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns all users',
    schema: {
      example: {
        statusCode: 200,
        message: 'Admin access granted - implement user list here',
        timestamp: '2025-10-03T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        timestamp: '2025-10-03T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        timestamp: '2025-10-03T10:30:00.000Z',
      },
    },
  })
  async getAllUsers() {
    // This would typically be in a separate admin controller
    // but including here for demonstration
    return ResponseHelper.success(
      'Admin access granted - implement user list here',
    );
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email address',
    description:
      'Verify user email using token sent via email. Token is valid for 24 hours.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          example: '550e8400-e29b-41d4-a716-446655440000',
          description: 'Email verification token received in email',
        },
      },
      required: ['token'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    schema: {
      example: {
        statusCode: 200,
        message:
          'Email đã được xác thực thành công! Chào mừng bạn đến với Skinalyze.',
        timestamp: '2025-10-21T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired token',
    schema: {
      example: {
        statusCode: 400,
        message: 'Token xác thực không hợp lệ hoặc đã hết hạn',
        timestamp: '2025-10-21T10:30:00.000Z',
      },
    },
  })
  async verifyEmail(@Body('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          example: 'user@example.com',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Resend verification email',
    description: 'Request a new email verification link to be sent.',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent',
    schema: {
      example: {
        statusCode: 200,
        message: 'Email xác thực đã được gửi lại. Vui lòng kiểm tra hộp thư.',
        timestamp: '2025-10-21T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Email already verified or user not found',
    schema: {
      example: {
        statusCode: 400,
        message: 'Email đã được xác thực',
        timestamp: '2025-10-21T10:30:00.000Z',
      },
    },
  })
  async resendVerification(@Body('email') email: string) {
    return this.authService.resendVerificationEmail(email);
  }

  @Post('revoke-all-tokens')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke all JWT tokens (Admin only)',
    description:
      'Force logout all users by invalidating all existing JWT tokens. This is useful when you need to immediately revoke access for security reasons or after major changes.',
  })
  @ApiResponse({
    status: 200,
    description: 'All tokens revoked successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'All tokens have been revoked. All users must login again.',
        data: {
          revokedAt: '2025-12-01T12:45:00.000Z',
          instruction:
            'Change JWT_SECRET in environment variables and restart the application',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async revokeAllTokens() {
    return ResponseHelper.success(
      '⚠️ To revoke all tokens, change JWT_SECRET in .env and restart the server. All users will be forced to login again.',
      {
        currentAction: 'Manual intervention required',
        steps: [
          '1. SSH into production server',
          '2. Edit .env file and change JWT_SECRET value',
          '3. Run: docker-compose restart app',
          '4. All existing tokens will become invalid immediately',
        ],
        security:
          'This ensures all old tokens from any environment become invalid',
      },
    );
  }
}
