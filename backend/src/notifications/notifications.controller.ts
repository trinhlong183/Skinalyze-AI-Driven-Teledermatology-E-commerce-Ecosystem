import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { MarkAsReadDto } from './dto/mark-as-read.dto';
import { SendNotificationToUserDto } from './dto/send-notification-to-user.dto';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ResponseHelper } from '../utils/responses';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all notifications (Admin only)' })
  async getAllNotifications() {
    const notifications = await this.notificationsService.getAllNotifications();
    return ResponseHelper.success(
      'Notifications retrieved successfully',
      notifications,
    );
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a notification (Admin only)' })
  async create(@Body() createNotificationDto: CreateNotificationDto) {
    const notification = await this.notificationsService.create(
      createNotificationDto,
    );
    return ResponseHelper.created(
      'Notification created successfully',
      notification,
    );
  }

  @Get('my')
  @Roles(
    UserRole.CUSTOMER,
    UserRole.DERMATOLOGIST,
    UserRole.STAFF,
    UserRole.ADMIN,
  )
  @ApiOperation({ summary: 'Get my notifications' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getMyNotifications(
    @Req() req: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const userId = req.user.userId;
    const result = await this.notificationsService.findAllByUser(
      userId,
      limit ? +limit : 20,
      offset ? +offset : 0,
    );
    return ResponseHelper.success(
      'Notifications retrieved successfully',
      result,
    );
  }

  @Get('my/unread')
  @Roles(
    UserRole.CUSTOMER,
    UserRole.DERMATOLOGIST,
    UserRole.STAFF,
    UserRole.ADMIN,
  )
  @ApiOperation({ summary: 'Get my unread notifications' })
  async getMyUnreadNotifications(@Req() req: any) {
    const userId = req.user.userId;
    const notifications =
      await this.notificationsService.findUnreadByUser(userId);
    return ResponseHelper.success(
      'Unread notifications retrieved successfully',
      notifications,
    );
  }

  @Get('my/unread-count')
  @Roles(
    UserRole.CUSTOMER,
    UserRole.DERMATOLOGIST,
    UserRole.STAFF,
    UserRole.ADMIN,
  )
  @ApiOperation({ summary: 'Get unread notification count (for badge)' })
  async getUnreadCount(@Req() req: any) {
    const userId = req.user.userId;
    const count = await this.notificationsService.getUnreadCount(userId);
    return ResponseHelper.success('Unread count retrieved successfully', {
      count,
    });
  }

  @Post('mark-as-read')
  @Roles(
    UserRole.CUSTOMER,
    UserRole.DERMATOLOGIST,
    UserRole.STAFF,
    UserRole.ADMIN,
  )
  @ApiOperation({ summary: 'Mark notifications as read' })
  async markAsRead(@Body() markAsReadDto: MarkAsReadDto, @Req() req: any) {
    const userId = req.user.userId;
    await this.notificationsService.markAsRead(
      markAsReadDto.notificationIds,
      userId,
    );
    return ResponseHelper.success('Notifications marked as read');
  }

  @Post('mark-all-as-read')
  @Roles(
    UserRole.CUSTOMER,
    UserRole.DERMATOLOGIST,
    UserRole.STAFF,
    UserRole.ADMIN,
  )
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Req() req: any) {
    const userId = req.user.userId;
    await this.notificationsService.markAllAsRead(userId);
    return ResponseHelper.success('All notifications marked as read');
  }

  @Delete(':id')
  @Roles(
    UserRole.CUSTOMER,
    UserRole.DERMATOLOGIST,
    UserRole.STAFF,
    UserRole.ADMIN,
  )
  @ApiOperation({ summary: 'Delete a notification' })
  async deleteNotification(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.userId;
    await this.notificationsService.deleteNotification(id, userId);
    return ResponseHelper.success('Notification deleted successfully');
  }

  @Delete()
  @Roles(
    UserRole.CUSTOMER,
    UserRole.DERMATOLOGIST,
    UserRole.STAFF,
    UserRole.ADMIN,
  )
  @ApiOperation({ summary: 'Delete all my notifications' })
  async deleteAllNotifications(@Req() req: any) {
    const userId = req.user.userId;
    await this.notificationsService.deleteAllByUser(userId);
    return ResponseHelper.success('All notifications deleted successfully');
  }

  @Post('send-to-user')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Send notification to a specific user (Admin only)',
    description:
      'Admin can send custom notification to any user with any content. Optionally upload an image.',
  })
  async sendToUser(
    @Body() dto: SendNotificationToUserDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    image?: Express.Multer.File,
  ) {
    const notification = await this.notificationsService.sendToUser(
      dto.userId,
      dto.type,
      dto.title,
      dto.message,
      dto.data,
      dto.actionUrl,
      dto.imageUrl,
      dto.priority,
      image,
    );
    return ResponseHelper.created(
      'Notification sent to user successfully',
      notification,
    );
  }

  @Post('broadcast')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Broadcast notification to all users (Admin only)',
    description:
      'Admin can send notification to all active users at once. Useful for system announcements, maintenance notices, or promotions. Optionally upload an image.',
  })
  async broadcast(
    @Body() dto: BroadcastNotificationDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    image?: Express.Multer.File,
  ) {
    const result = await this.notificationsService.broadcastToAllUsers(
      dto.type,
      dto.title,
      dto.message,
      dto.data,
      dto.actionUrl,
      dto.imageUrl,
      dto.priority,
      image,
    );
    return ResponseHelper.created(
      `Notification broadcast to ${result.sent} users successfully`,
      result,
    );
  }
}
