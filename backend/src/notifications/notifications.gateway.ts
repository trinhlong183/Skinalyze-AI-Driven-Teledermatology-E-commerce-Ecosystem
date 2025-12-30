import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

@WebSocketGateway({
  cors: true, // Will be configured in afterInit
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private connectedUsers = new Map<string, string>(); // userId -> socketId

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    const ipAddress =
      this.configService.get<string>('IP_ADDRESS') || 'localhost';
    const port = this.configService.get<string>('PORT') || '3000';

    this.logger.log(`WebSocket Gateway initialized`);
    this.logger.log(`WebSocket URL: ws://${ipAddress}:${port}/notifications`);
    this.logger.log(`CORS enabled for all origins in development mode`);
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      this.logger.log(`🔌 New client attempting to connect: ${client.id}`);

      // Extract JWT token from handshake
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      this.logger.debug(`Auth object:`, client.handshake.auth);
      this.logger.debug(`Authorization header:`, client.handshake.headers?.authorization);
      this.logger.debug(`Token found: ${token ? 'YES (length: ' + token.length + ')' : 'NO'}`);

      if (!token) {
        this.logger.warn(`❌ Client ${client.id} connected without token - DISCONNECTING`);
        this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        client.disconnect();
        return;
      }

      this.logger.debug(`🔐 Attempting to verify JWT token...`);

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token);

      this.logger.debug(`✅ Token verified! Payload:`, payload);

      client.userId = payload.sub || payload.userId;
      client.user = payload;

      this.logger.debug(`👤 Extracted userId: ${client.userId}`);

      if (!client.userId) {
        this.logger.warn(`❌ Client ${client.id} has no userId in token payload - DISCONNECTING`);
        this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        client.disconnect();
        return;
      }

      // Store connection
      this.connectedUsers.set(client.userId, client.id);

      // Join user's personal room
      client.join(`user:${client.userId}`);

      this.logger.log(`✅ Client ${client.id} successfully connected as user ${client.userId}`);
      this.logger.log(`📊 Total connected users: ${this.connectedUsers.size}`);
      this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      // Note: Unread count will be sent via REST API or separate WebSocket event
      // Remove dependency on NotificationsService to avoid circular dependency
    } catch (error) {
      this.logger.error(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      this.logger.error(`❌ CONNECTION ERROR for client ${client.id}`);
      this.logger.error(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      this.logger.error(`Error name: ${error.name}`);
      this.logger.error(`Error message: ${error.message}`);
      if (error.stack) {
        this.logger.error(`Stack trace: ${error.stack}`);
      }
      this.logger.error(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      // Send error message to client before disconnecting
      client.emit('error', {
        message: 'Authentication failed. Please login again.',
        code: 'INVALID_TOKEN',
        details: error.message,
      });

      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);
      this.logger.log(
        `Client ${client.id} (user ${client.userId}) disconnected`,
      );
    } else {
      this.logger.log(`Client ${client.id} disconnected`);
    }
  }

  /**
   * Client subscribes to notifications
   */
  @SubscribeMessage('subscribe')
  handleSubscribe(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    this.logger.log(`User ${client.userId} subscribed to notifications`);
    return {
      message: 'Subscribed to notifications',
      userId: client.userId,
    };
  }

  /**
   * Send notification to a specific user (called by service)
   */
  sendToUser(userId: string, notification: any) {
    const socketId = this.connectedUsers.get(userId);

    if (socketId) {
      // User is connected, send realtime
      this.server.to(`user:${userId}`).emit('new-notification', notification);
      this.logger.log(`Sent notification to user ${userId} via WebSocket`);
    } else {
      this.logger.log(
        `User ${userId} not connected, notification saved to DB only`,
      );
    }
  }

  /**
   * Update unread count for a user
   */
  updateUnreadCount(userId: string, count: number) {
    this.server.to(`user:${userId}`).emit('unread-count', { count });
  }

  /**
   * Broadcast notification to all connected users
   */
  broadcastToAll(notification: any) {
    this.server.emit('new-notification', notification);
    this.logger.log('Broadcast notification to all connected users');
  }

  /**
   * Notify user that a notification was marked as read
   */
  notifyMarkedAsRead(userId: string, notificationIds: string[]) {
    this.server.to(`user:${userId}`).emit('notifications-read', {
      notificationIds,
    });
  }

  /**
   * Get online users count (for monitoring)
   */
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}
