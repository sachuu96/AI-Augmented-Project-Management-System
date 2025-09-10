// aggregatorWorker.ts
import { parentPort } from "worker_threads";
import { LOW_STOCK_WARNING } from "../shared";

interface Aggregates {
  perCategory: Record<string, number>;
}

// In-memory aggregates (lives only inside worker)
const aggregates: Aggregates = {
  perCategory: {},
};

function updateAggregates(event: any) {
  console.info("low stock event: ", event);
  if (event.type === LOW_STOCK_WARNING) {
    if (event.category) {
      aggregates.perCategory[event.category] =
        (aggregates.perCategory[event.category] || 0) + 1;
    }
  }

  return aggregates;
}

// Worker entrypoint
if (!parentPort) {
  throw new Error("❌ Worker started without parentPort");
}

parentPort.on("message", (event: any) => {
  const updated = updateAggregates(event);
  parentPort?.postMessage({ type: "aggregatesUpdated", aggregates: updated });
});
