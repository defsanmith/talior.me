import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { JwtService } from "@nestjs/jwt";
import { Server, Socket } from "socket.io";
import { QueueService } from "../queue/queue.service";
import { PrismaService } from "../prisma/prisma.service";
import { JwtPayload } from "../auth/decorators/current-user.decorator";

@WebSocketGateway({
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly queueService: QueueService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService
  ) {}

  afterInit() {
    console.log("WebSocket Gateway initialized");
    this.setupQueueListeners();
  }

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake auth or query
      const token =
        client.handshake.auth?.token ||
        client.handshake.query?.token?.toString();

      if (!token) {
        console.log(`Client ${client.id} disconnected: No token provided`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: process.env.JWT_SECRET || "your-secret-key-change-in-production",
      });

      // Store userId on socket
      (client as any).userId = payload.userId;

      // Join user-specific room
      client.join(`user:${payload.userId}`);

      console.log(`Client ${client.id} connected for user ${payload.userId}`);
    } catch (error) {
      console.log(`Client ${client.id} disconnected: Invalid token`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  private setupQueueListeners() {
    const { queueEvents } = this.queueService;

    queueEvents.on("progress", ({ jobId, data }: any) => {
      // Extract userId from job data
      const userId = data?.userId;
      if (!userId) {
        console.warn(`Job ${jobId} progress event missing userId`);
        return;
      }
      console.log(`Job ${jobId} progress for user ${userId}:`, data);
      // Emit only to the specific user's room
      this.server.to(`user:${userId}`).emit("job.progress", {
        jobId,
        progress: data.progress,
        stage: data.stage,
      });
    });

    queueEvents.on("completed", async ({ jobId }: any) => {
      try {
        // Fetch job from database to get userId
        const job = await this.prisma.resumeJob.findUnique({
          where: { id: jobId },
          select: { userId: true },
        });

        if (job) {
          console.log(`Job ${jobId} completed for user ${job.userId}`);
          this.server.to(`user:${job.userId}`).emit("job.completed", { jobId });
        } else {
          console.warn(`Job ${jobId} not found in database`);
        }
      } catch (error) {
        console.error(`Error handling job completion for ${jobId}:`, error);
      }
    });

    queueEvents.on("failed", async ({ jobId, failedReason }: any) => {
      try {
        // Fetch job from database to get userId
        const job = await this.prisma.resumeJob.findUnique({
          where: { id: jobId },
          select: { userId: true },
        });

        if (job) {
          console.log(`Job ${jobId} failed for user ${job.userId}:`, failedReason);
          this.server.to(`user:${job.userId}`).emit("job.failed", {
            jobId,
            error: failedReason,
          });
        } else {
          console.warn(`Job ${jobId} not found in database`);
        }
      } catch (error) {
        console.error(`Error handling job failure for ${jobId}:`, error);
      }
    });
  }
}
