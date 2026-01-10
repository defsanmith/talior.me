import { Injectable } from "@nestjs/common";
import { Queue, QueueEvents } from "bullmq";

@Injectable()
export class QueueService {
  public readonly resumeQueue: Queue;
  public readonly queueEvents: QueueEvents;

  constructor() {
    const connection = {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
    };

    this.resumeQueue = new Queue("resume-build", {
      connection,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    this.queueEvents = new QueueEvents("resume-build", { connection });
  }

  async addJob(jobId: string, data: any) {
    return this.resumeQueue.add("process-resume", data, {
      jobId,
    });
  }

  async getJobCounts() {
    return this.resumeQueue.getJobCounts("active", "waiting");
  }
}
