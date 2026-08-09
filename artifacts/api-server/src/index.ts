import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient";
import app from "./app";
import { logger } from "./lib/logger";

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.warn("DATABASE_URL is unavailable; starting without Stripe sync");
    return;
  }

  try {
    logger.info("Initializing Stripe schema...");
    await runMigrations({ databaseUrl });
    logger.info("Stripe schema ready");

    const stripeSync = await getStripeSync();

    const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
    if (!domain) {
      logger.warn("REPLIT_DOMAINS is unavailable; skipping Stripe webhook setup");
      return;
    }

    const webhookBaseUrl = `https://${domain}`;
    const webhookEndpoint = await stripeSync.findOrCreateManagedWebhook(
      `${webhookBaseUrl}/api/stripe/webhook`
    );
    logger.info({ url: webhookEndpoint?.url }, "Stripe webhook configured");

    // Backfill runs async — don't block server startup
    stripeSync.syncBackfill()
      .then(() => logger.info("Stripe data synced"))
      .catch((err) => logger.error({ err }, "Stripe backfill error"));
  } catch (err) {
    // Stripe is an optional billing subsystem. Do not prevent the health
    // tracker API from starting if the connector, sync schema, or webhook
    // setup is temporarily unavailable. Stripe routes report their own
    // availability errors when called.
    logger.error({ err }, "Stripe initialization failed; continuing without Stripe sync");
  }
}

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

await initStripe();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
