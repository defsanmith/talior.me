import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { QueueService } from "../queue/queue.service";

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

  constructor(private readonly queueService: QueueService) {}

  afterInit() {
    console.log("WebSocket Gateway initialized");
    this.setupQueueListeners();
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  private setupQueueListeners() {
    const { queueEvents } = this.queueService;

    queueEvents.on(
      "progress",
      ({ jobId, data }: { jobId: string; data: any }) => {
        console.log(`Job ${jobId} progress:`, data);
        this.server.emit("job.progress", {
          jobId,
          progress: data.progress,
          stage: data.stage,
        });
      }
    );

    queueEvents.on("completed", ({ jobId }) => {
      console.log(`Job ${jobId} completed`);
      this.server.emit("job.completed", { jobId });
    });

    queueEvents.on("failed", ({ jobId, failedReason }) => {
      console.log(`Job ${jobId} failed:`, failedReason);
      this.server.emit("job.failed", {
        jobId,
        error: failedReason,
      });
    });
  }
}
