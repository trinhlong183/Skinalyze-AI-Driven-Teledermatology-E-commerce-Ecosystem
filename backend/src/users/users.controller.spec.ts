import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { DeviceTokensService } from './device-tokens.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserRole } from './entities/user.entity';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;
  let deviceTokensService: DeviceTokensService;

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

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    topUpBalance: jest.fn(),
    updateProfilePicture: jest.fn(),
  };

  const mockDeviceTokensService = {
    register: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: DeviceTokensService,
          useValue: mockDeviceTokensService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
    deviceTokensService = module.get<DeviceTokensService>(DeviceTokensService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      // Arrange
      const createUserDto: CreateUserDto = {
        email: 'newuser@example.com',
        password: 'password123',
        fullName: 'New User',
        phone: '0912345678',
      };

      mockUsersService.create.mockResolvedValue(mockUser);

      // Act
      const result = await controller.create(createUserDto);

      // Assert
      expect(usersService.create).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(mockUser);
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      // Arrange
      const mockUsers = [mockUser, { ...mockUser, userId: '2' }];
      mockUsersService.findAll.mockResolvedValue(mockUsers);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(usersService.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockUsers);
    });
  });

  describe('findOne', () => {
    it('should return a single user', async () => {
      // Arrange
      mockUsersService.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await controller.findOne('1');

      // Assert
      expect(usersService.findOne).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockUser);
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      // Arrange
      const updateUserDto: UpdateUserDto = {
        fullName: 'Updated Name',
      };

      const updatedUser = { ...mockUser, ...updateUserDto };
      mockUsersService.update.mockResolvedValue(updatedUser);

      // Act
      const result = await controller.update('1', updateUserDto);

      // Assert
      expect(usersService.update).toHaveBeenCalledWith('1', updateUserDto);
      expect(result.fullName).toBe(updateUserDto.fullName);
    });
  });

  describe('remove', () => {
    it('should remove a user', async () => {
      // Arrange
      mockUsersService.remove.mockResolvedValue(undefined);

      // Act
      await controller.remove('1');

      // Assert
      expect(usersService.remove).toHaveBeenCalledWith('1');
    });
  });
});
