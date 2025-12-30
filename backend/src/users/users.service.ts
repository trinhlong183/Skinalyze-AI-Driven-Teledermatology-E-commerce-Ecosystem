import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { TopupBalanceDto } from './dto/topup-balance.dto';
import { User, UserRole } from './entities/user.entity';
import { ResponseHelper } from '../utils/responses';
import { EmailService } from '../email/email.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { DermatologistsService } from '../dermatologists/dermatologists.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
    private readonly cloudinaryService: CloudinaryService,
    @Inject(forwardRef(() => DermatologistsService))
    private readonly dermatologistsService: DermatologistsService,
  ) {}
  private getRepository(manager?: EntityManager): Repository<User> {
    return manager ? manager.getRepository(User) : this.userRepository;
  }
  async create(createUserDto: CreateUserDto): Promise<User> {
    // Validate required fields
    if (
      !createUserDto.email ||
      !createUserDto.password ||
      !createUserDto.fullName
    ) {
      throw new BadRequestException(
        'Email, password, and fullName are required fields',
      );
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);

    // If user role is dermatologist, automatically create dermatologist profile
    if (savedUser.role === UserRole.DERMATOLOGIST) {
      try {
        await this.dermatologistsService.create(savedUser.userId, {
          yearsOfExp: 0,
          defaultSlotPrice: 0,
        });
        this.logger.log(`Dermatologist profile created for user ${savedUser.userId}`);
      } catch (error) {
        this.logger.error(
          `Failed to create dermatologist profile for user ${savedUser.userId}: ${error.message}`,
        );
        // Don't throw error to avoid blocking user creation
      }
    }

    return savedUser;
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find({
      relations: ['addresses'],
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { userId: id },
      relations: ['addresses'],
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email },
      relations: ['addresses'],
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // If password is being updated, hash it
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    Object.assign(user, updateUserDto);
    return await this.userRepository.save(user);
  }

  /**
   * Update user profile with optional photo upload to Cloudinary
   */
  async updateProfile(
    userId: string,
    updateUserDto: UpdateUserDto,
    photo?: Express.Multer.File,
  ): Promise<any> {
    const user = await this.findOne(userId);

    // If photo is provided, upload to Cloudinary
    if (photo) {
      try {
        const uploadResult = await this.cloudinaryService.uploadImage(
          photo,
          'user-profiles',
        );
        updateUserDto.photoUrl = uploadResult.secure_url;
        this.logger.log(
          `Profile photo uploaded for user ${userId}: ${uploadResult.secure_url}`,
        );
      } catch (error) {
        this.logger.error('Failed to upload profile photo:', error);
        throw new BadRequestException('Failed to upload profile photo');
      }
    }

    // If password is being updated, hash it
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    Object.assign(user, updateUserDto);
    const updatedUser = await this.userRepository.save(user);

    return ResponseHelper.success('Profile updated successfully', {
      userId: updatedUser.userId,
      email: updatedUser.email,
      fullName: updatedUser.fullName,
      photoUrl: updatedUser.photoUrl,
      phone: updatedUser.phone,
      dob: updatedUser.dob,
      gender: updatedUser.gender,
    });
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }

  /**
   * Admin reset password - generates random password and sends email to user
   */
  async adminResetPassword(
    userId: string,
  ): Promise<{ message: string; temporaryPassword?: string }> {
    const user = await this.findOne(userId);

    // Generate random 16-character password
    const newPassword =
      Math.random().toString(36).slice(-8) +
      Math.random().toString(36).slice(-8).toUpperCase();

    // Hash password
    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);

    // Try to send email notification to user
    let emailSent = false;
    try {
      await this.emailService.sendAdminPasswordResetEmail(
        user.email,
        user.fullName,
        newPassword,
      );
      emailSent = true;
    } catch (error) {
      // Log error but don't fail the reset
      console.error('Failed to send password reset email:', error.message);
    }

    // Return password to admin if email failed
    if (emailSent) {
      return {
        message: `Password has been reset and sent to ${user.email}`,
      };
    } else {
      return {
        message: `Password has been reset but email delivery failed. Please provide this password to the user manually.`,
        temporaryPassword: newPassword,
      };
    }
  }

  async topupBalance(userId: string, topupDto: TopupBalanceDto) {
    const user = await this.findOne(userId);

    if (!user.isActive) {
      throw new BadRequestException('Tài khoản đã bị vô hiệu hóa');
    }

    // Validate amount
    if (topupDto.amount < 10000) {
      throw new BadRequestException('Số tiền nạp tối thiểu là 10,000 VND');
    }

    if (topupDto.amount > 50000000) {
      throw new BadRequestException('Số tiền nạp tối đa là 50,000,000 VND');
    }

    const { oldBalance, newBalance } = await this.updateBalance(
      userId,
      topupDto.amount,
    );

    // Return transaction info
    return ResponseHelper.success('Nạp tiền thành công', {
      userId: user.userId,
      email: user.email,
      fullName: user.fullName,
      oldBalance,
      topupAmount: topupDto.amount,
      newBalance,
      paymentMethod: topupDto.paymentMethod || 'unknown',
      note: topupDto.note,
      timestamp: new Date(),
    });
  }

  async getBalance(userId: string) {
    const user = await this.findOne(userId);
    return ResponseHelper.success('Lấy thông tin số dư thành công', {
      userId: user.userId,
      email: user.email,
      fullName: user.fullName,
      balance: parseFloat(user.balance.toString()),
      currency: 'VND',
    });
  }

  async getTopupHistory(userId: string) {
    // Note: Để track history đầy đủ, nên tạo bảng transactions riêng
    // Hiện tại chỉ return current balance
    const user = await this.findOne(userId);
    return ResponseHelper.success('Lịch sử nạp tiền', {
      userId: user.userId,
      currentBalance: parseFloat(user.balance.toString()),
      message: 'Để xem lịch sử chi tiết, cần implement bảng transactions riêng',
    });
  }

  async updateBalance(
    userId: string,
    amountToChange: number, // Number (+/-) to add or deduct
    manager?: EntityManager,
  ): Promise<{ oldBalance: number; newBalance: number }> {
    if (amountToChange === 0) {
      this.logger.warn(`Attempted to change balance with 0 for user ${userId}`);
      const user = await this.findOne(userId);
      return {
        oldBalance: Number(user.balance),
        newBalance: Number(user.balance),
      };
    }

    const userRepo = this.getRepository(manager);

    const user = await userRepo.findOne({
      where: { userId },
      select: ['userId', 'balance'],
    });

    if (!user) {
      throw new NotFoundException(
        `User ${userId} not found for balance update.`,
      );
    }

    const oldBalance = parseFloat(user.balance.toString());
    const newBalance = oldBalance + amountToChange;

    // 2. Check no negative balance
    if (newBalance < 0) {
      throw new BadRequestException(
        `Insufficient funds. Cannot deduct ${Math.abs(amountToChange)}. Current balance is ${oldBalance}`,
      );
    }

    // Increment safely using atomic operation avoiding race conditions
    await userRepo.increment({ userId: userId }, 'balance', amountToChange);

    this.logger.log(
      `Balance updated for user ${userId}: ${oldBalance} -> ${newBalance} (Change: ${amountToChange})`,
    );

    return { oldBalance, newBalance };
  }

  /**
   * Upload user profile photo to Cloudinary
   * @param userId - User ID
   * @param photo - Image file to upload
   * @returns Updated user with new photoUrl
   */
  async uploadProfilePhoto(
    userId: string,
    photo: Express.Multer.File,
  ): Promise<any> {
    const user = await this.findOne(userId);

    try {
      const uploadResult = await this.cloudinaryService.uploadImage(
        photo,
        'user-profiles',
      );

      user.photoUrl = uploadResult.secure_url;
      const updatedUser = await this.userRepository.save(user);

      this.logger.log(
        `Profile photo uploaded for user ${userId}: ${uploadResult.secure_url}`,
      );

      return ResponseHelper.success('Profile photo uploaded successfully', {
        userId: updatedUser.userId,
        photoUrl: updatedUser.photoUrl,
      });
    } catch (error) {
      this.logger.error('Failed to upload profile photo:', error);
      throw new BadRequestException('Failed to upload profile photo');
    }
  }
}
