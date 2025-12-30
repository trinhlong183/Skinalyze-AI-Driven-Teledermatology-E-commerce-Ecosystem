import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { EmailService } from '../email/email.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;
  let emailService: EmailService;
  let cloudinaryService: CloudinaryService;

  const mockUser: User = {
    userId: '1',
    email: 'test@example.com',
    password: 'hashedPassword123',
    fullName: 'Test User',
    phone: '0901234567',
    role: UserRole.CUSTOMER,
    isActive: true,
    isVerified: true,
    balance: 0,
    addresses: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockEmailService = {
    sendVerification: jest.fn(),
    sendPasswordReset: jest.fn(),
  };

  const mockCloudinaryService = {
    uploadImage: jest.fn(),
    deleteImage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: CloudinaryService,
          useValue: mockCloudinaryService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
    emailService = module.get<EmailService>(EmailService);
    cloudinaryService = module.get<CloudinaryService>(CloudinaryService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user with hashed password', async () => {
      // Arrange
      const createUserDto: CreateUserDto = {
        email: 'newuser@example.com',
        password: 'password123',
        fullName: 'New User',
        phone: '0912345678',
      };

      const hashedPassword = 'hashedPassword123';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const createdUser = { ...mockUser, ...createUserDto, password: hashedPassword };
      mockRepository.create.mockReturnValue(createdUser);
      mockRepository.save.mockResolvedValue(createdUser);

      // Act
      const result = await service.create(createUserDto);

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10);
      expect(repository.create).toHaveBeenCalledWith({
        ...createUserDto,
        password: hashedPassword,
      });
      expect(repository.save).toHaveBeenCalled();
      expect(result.password).toBe(hashedPassword);
      expect(result.email).toBe(createUserDto.email);
    });

    it('should throw BadRequestException when email is missing', async () => {
      // Arrange
      const invalidDto: CreateUserDto = {
        email: '',
        password: 'password123',
        fullName: 'Test User',
      };

      // Act & Assert
      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(invalidDto)).rejects.toThrow(
        'Email, password, and fullName are required fields',
      );
    });

    it('should throw BadRequestException when password is missing', async () => {
      // Arrange
      const invalidDto: CreateUserDto = {
        email: 'test@example.com',
        password: '',
        fullName: 'Test User',
      };

      // Act & Assert
      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when fullName is missing', async () => {
      // Arrange
      const invalidDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password123',
        fullName: '',
      };

      // Act & Assert
      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      // Arrange
      const mockUsers = [mockUser, { ...mockUser, userId: '2', email: 'user2@example.com' }];
      mockRepository.find.mockResolvedValue(mockUsers);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual(mockUsers);
      expect(repository.find).toHaveBeenCalledWith({
        relations: ['addresses'],
      });
    });

    it('should return empty array when no users exist', async () => {
      // Arrange
      mockRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return a user when found by ID', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.findOne('1');

      // Assert
      expect(result).toEqual(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { userId: '1' },
        relations: ['addresses'],
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('999')).rejects.toThrow('User with ID 999 not found');
    });
  });

  describe('findByEmail', () => {
    it('should return a user when found by email', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.findByEmail('test@example.com');

      // Assert
      expect(result).toEqual(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        relations: ['addresses'],
      });
    });

    it('should return null when user not found by email', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findByEmail('notfound@example.com');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      // Arrange
      const updateDto: UpdateUserDto = {
        fullName: 'Updated Name',
        phone: '0999999999',
      };

      const updatedUser = { ...mockUser, ...updateDto };
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(updatedUser);

      // Act
      const result = await service.update('1', updateDto);

      // Assert
      expect(result.fullName).toBe(updateDto.fullName);
      expect(result.phone).toBe(updateDto.phone);
    });

    it('should throw NotFoundException when updating non-existent user', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update('999', { fullName: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove user successfully', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.delete.mockResolvedValue({ affected: 1, raw: {} });

      // Act
      await service.remove('1');

      // Assert
      expect(repository.findOne).toHaveBeenCalled();
      expect(repository.delete).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException when removing non-existent user', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('999')).rejects.toThrow(NotFoundException);
    });
  });
});
