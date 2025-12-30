import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { TrackingService } from './tracking.service';

interface LocationUpdate {
  orderId: string;
  location: {
    lat: number;
    lng: number;
  };
  timestamp?: string;
}

interface JoinRoomData {
  orderId: string;
  role: 'shipper' | 'customer'; // Phân biệt ai đang join
}

@WebSocketGateway({
  cors: {
    origin: '*', // Trong production nên giới hạn origin
    credentials: true,
  },
  namespace: '/tracking', // WebSocket namespace riêng cho tracking
  transports: ['websocket', 'polling'], // ✅ Support cả websocket và polling cho React Native
  allowEIO3: true, // ✅ Support socket.io v2 clients (compatibility)
})
export class TrackingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TrackingGateway.name);

  constructor(private readonly trackingService: TrackingService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * 🚪 Client tham gia phòng tracking của một đơn hàng
   */
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() data: JoinRoomData,
    @ConnectedSocket() client: Socket,
  ) {
    const { orderId, role } = data;
    const roomName = `order_${orderId}`;

    // Client tham gia phòng
    await client.join(roomName);

    this.logger.log(
      `${role} joined room: ${roomName} (socket: ${client.id})`,
    );

    // Gửi thông báo cho client đã join thành công
    client.emit('joinedRoom', {
      orderId,
      message: `Đã tham gia phòng tracking đơn hàng ${orderId}`,
      room: roomName,
    });

    return { success: true, room: roomName };
  }

  /**
   * 🚪 Client rời phòng tracking
   */
  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @MessageBody() data: { orderId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const roomName = `order_${data.orderId}`;
    await client.leave(roomName);

    this.logger.log(`Client left room: ${roomName} (socket: ${client.id})`);

    return { success: true, message: 'Left room successfully' };
  }

  /**
   * 📍 Shipper cập nhật vị trí real-time (via WebSocket)
   * Note: Nên dùng REST API POST /tracking/location thay vì WebSocket
   */
  @SubscribeMessage('updateLocation')
  async handleUpdateLocation(
    @MessageBody() data: LocationUpdate,
    @ConnectedSocket() client: Socket,
  ) {
    const { orderId, location } = data;
    const roomName = `order_${orderId}`;

    this.logger.debug(
      `📍 Location update for order ${orderId}: ${location.lat}, ${location.lng}`,
    );

    // Broadcast vị trí mới cho tất cả client trong phòng
    this.server.to(roomName).emit('shipperMoved', {
      orderId,
      location,
      timestamp: new Date().toISOString(),
    });

    return { success: true, message: 'Location broadcasted' };
  }

  /**
   * 📊 Gửi ETA update cho tất cả client trong phòng
   */
  async broadcastETA(orderId: string, eta: any) {
    const roomName = `order_${orderId}`;

    this.server.to(roomName).emit('updateETA', {
      orderId,
      eta,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`📊 ETA broadcasted to room ${roomName}: ${eta.text}`);
  }

  /**
   * 🚚 Cập nhật trạng thái đơn hàng (ví dụ: DELIVERED)
   */
  async broadcastStatusChange(orderId: string, status: string, message: string) {
    const roomName = `order_${orderId}`;

    this.server.to(roomName).emit('statusChanged', {
      orderId,
      status,
      message,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`🚚 Status change broadcasted to room ${roomName}: ${status}`);
  }
}
