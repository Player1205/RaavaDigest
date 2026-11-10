import { IntelligenceRepository } from "../src/lib/db/repository";
import { IntelligencePipelineService } from "../src/services/pipeline.service";

async function main() {
  console.log("=================================================");
  console.log("Personal Intelligence Engine - Daily Dispatch CLI");
  console.log(`Execution Time: ${new Date().toISOString()}`);
  console.log("=================================================");

  try {
    const repo = new IntelligenceRepository();
    const pipeline = new IntelligencePipelineService(repo);

    console.log("Starting daily intelligence ingestion, synthesis, and dispatch...");
    const result = await pipeline.runDailyPipeline();

    console.log("Pipeline Execution Result:");
    console.log(JSON.stringify(result, null, 2));

    if (!result.success) {
      console.error(`Pipeline completed with warning or error: ${result.error}`);
    } else {
      console.log(`Successfully dispatched briefing ${result.briefingId} (${result.itemCount} items) to ${result.dispatchedEmail}`);
      console.log(`Storage maintenance: Purged ${result.purgedCount || 0} records past 7-day TTL window.`);
    }

    process.exit(0);
  } catch (err) {
    console.error("Fatal error during CLI dispatch execution:", err);
    process.exit(1);
  }
}

main();
