import { WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable, Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/message',
})
@Injectable()
export class MessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  public server: Server;

  private readonly logger = new Logger(MessageGateway.name);
  
  // 维护在线用户 ID 到 Socket 连接实例的内存 Map
  private readonly userSockets = new Map<number, Socket>();

  constructor(private readonly jwtService: JwtService) {}

  /**
   * 客户端建立长连接时的握手处理，验证并提取用户身份 Token
   */
  public async handleConnection(client: Socket): Promise<void> {
    try {
      let token = client.handshake.auth?.token || client.handshake.query?.token;
      
      if (Array.isArray(token)) {
        token = token[0];
      }
      
      if (token && token.startsWith('Bearer ')) {
        token = token.slice(7);
      }
      
      if (!token) {
        this.logger.warn(`[WebSocket] 未携带 token，断开连接: ${client.id}`);
        client.disconnect();
        return;
      }
      
      // 使用系统 jwt 秘钥对 Token 进行验证
      const payload = await this.jwtService.verifyAsync(token);
      const userId = Number(payload.userId || payload.id);
      
      if (!userId) {
        this.logger.warn(`[WebSocket] token 负载异常，断开连接: ${client.id}`);
        client.disconnect();
        return;
      }
      
      // 绑定映射关系，实现单点精准推送
      this.userSockets.set(userId, client);
      this.logger.log(`[WebSocket] 用户 ${userId} 握手成功并在线 (Socket ID: ${client.id})`);
    } catch (err) {
      this.logger.error(`[WebSocket] 连接校验异常: ${err.message}`);
      client.disconnect();
    }
  }

  /**
   * 客户端断开连接时触发，自动清除内存映射防止泄露
   */
  public handleDisconnect(client: Socket): void {
    for (const [userId, socket] of this.userSockets.entries()) {
      if (socket.id === client.id) {
        this.userSockets.delete(userId);
        this.logger.log(`[WebSocket] 用户 ${userId} 已离线断开`);
        break;
      }
    }
  }

  /**
   * 向指定的用户实时单播投递消息包
   */
  public sendToUser = (userId: number, event: string, data: any): boolean => {
    const socket = this.userSockets.get(userId);
    if (socket && socket.connected) {
      socket.emit(event, data);
      return true;
    }
    return false;
  };

  /**
   * 全网多点广播消息通知给所有当前连接中的用户
   */
  public broadcast = (event: string, data: any): void => {
    this.server.emit(event, data);
  };
}
