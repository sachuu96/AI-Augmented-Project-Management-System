import { Worker } from 'worker_threads';
import path from 'path';
import { ProductCreated, ProductDeleted, ProductUpdated, LawStockWarning } from '../../../../packages/event-schemas/types';

type Event = ProductCreated | ProductUpdated | ProductDeleted | LawStockWarning;
type EventType = 'ProductCreated' | 'ProductUpdated' | 'ProductDeleted' | 'LowStockWarning';

/**
 * Publish an event asynchronously using a worker thread.
 */
export const publishEvent = (type: EventType, payload: Event) => {
  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(path.resolve(__dirname, 'worker.js'), {
      workerData: { type, payload }
    });

    worker.on('message', (msg) => {
      resolve();
    });

    worker.on('error', (err) => reject(err));
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
    });
  });
};
