import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/ws/analysis',
})
export class AnalysisGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AnalysisGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to Analysis WebSocket: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from Analysis WebSocket: ${client.id}`);
  }

  @SubscribeMessage('subscribe_analysis')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId?: string }
  ) {
    if (data?.projectId) {
      client.join(`project:${data.projectId}`);
      this.logger.log(`Client ${client.id} joined channel project:${data.projectId}`);
    }
    return { status: 'subscribed', clientId: client.id };
  }

  /**
   * Broadcast real-time streamed status update to a specific client or project channel
   */
  emitStatusUpdate(step: string, message: string, projectId?: string, socketId?: string) {
    const payload = {
      step,
      message,
      timestamp: new Date().toISOString(),
    };

    if (socketId && this.server?.sockets?.sockets?.get(socketId)) {
      this.server.to(socketId).emit('status_update', payload);
    } else if (projectId && this.server) {
      this.server.to(`project:${projectId}`).emit('status_update', payload);
    } else if (this.server) {
      this.server.emit('status_update', payload);
    }
  }

  /**
   * Emit asynchronous critique completion event to targeted socket or project room
   */
  emitCritiqueComplete(jobId: string, result: any, projectId?: string, socketId?: string) {
    const payload = {
      jobId,
      result,
      timestamp: new Date().toISOString(),
    };

    if (socketId && this.server?.sockets?.sockets?.get(socketId)) {
      this.server.to(socketId).emit('critique_complete', payload);
    } else if (projectId && this.server) {
      this.server.to(`project:${projectId}`).emit('critique_complete', payload);
    } else if (this.server) {
      this.server.emit('critique_complete', payload);
    }
  }
}

