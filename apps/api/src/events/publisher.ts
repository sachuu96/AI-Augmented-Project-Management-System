import { Worker } from "worker_threads";
import path from "path";

import { Event } from "../schemas/index";

type EventType =
  | "ProductCreated"
  | "ProductUpdated"
  | "ProductDeleted"
  | "LowStockWarning";

let worker: Worker | null = null;

function getWorker() {
  if (!worker) {
    worker = new Worker(path.resolve(__dirname, "worker.ts"));
  }
  return worker;
}

/**
 * Publish an event asynchronously using a shared worker thread.
 */
export const publishEvent = (type: EventType, payload: Event) => {
  return new Promise<void>((resolve, reject) => {
    const workerInstance = getWorker();

    // create unique correlation ID for responses
    const correlationId = `${type}-${Date.now()}-${Math.random()}`;

    const handleMessage = (msg: any) => {
      if (msg.correlationId !== correlationId) return; // ignore unrelated messages

      if (msg.success) {
        resolve();
      } else {
        reject(new Error(msg.error || "Unknown worker failure"));
      }
      workerInstance.off("message", handleMessage);
    };

    workerInstance.on("message", handleMessage);
    workerInstance.postMessage({ correlationId, type, payload });
  });
};
