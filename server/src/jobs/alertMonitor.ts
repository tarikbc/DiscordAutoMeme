import { DiscordAccountService } from "../services/DiscordAccountService";
import { AlertService } from "../services/AlertService";
import logger from "../utils/logger";
import config from "../config";

const discordAccountService = DiscordAccountService.getInstance();
const alertService = AlertService.getInstance();

/**
 * Check for critical client issues and trigger alerts if necessary
 * @param batchSize Number of accounts to process per batch
 */
export async function monitorAndAlertForIssues(
  batchSize = config.alerts.monitoring.batchSize,
): Promise<void> {
  try {
    logger.info("Running Discord client health check");

    // Get total number of accounts
    const initialQuery = await discordAccountService.listAccounts({ limit: 1 });
    const totalAccounts = initialQuery.total;
    const totalBatches = Math.ceil(totalAccounts / batchSize);

    logger.info(`Processing ${totalAccounts} accounts in ${totalBatches} batches of ${batchSize}`);

    let processedCount = 0;
    let alertCount = 0;

    // Process accounts in batches
    for (let page = 1; page <= totalBatches; page++) {
      // Get batch of accounts
      const { accounts } = await discordAccountService.listAccounts({
        page,
        limit: batchSize,
        isActive: true, // Only process active accounts
      });

      logger.debug(`Processing batch ${page}/${totalBatches} (${accounts.length} accounts)`);

      // Process each account in the batch
      for (const account of accounts) {
        try {
          processedCount++;

          // Get client health metrics
          const health = await discordAccountService.getAccountHealth(account._id);

          // Check for critical issues
          if (!health) {
            logger.warn(`No health data for account ${account._id}`);
            continue;
          }

          // Check for token validity
          if (health.tokenStatus === "invalid") {
            await alertService.createAlert({
              userId: account.userId,
              accountId: account._id,
              accountName: account.name || "Unknown",
              type: "tokenInvalid",
              message: "Discord token is invalid or expired",
              severity: "critical",
              resolved: false,
              data: {
                accountId: account._id.toString(),
                lastChecked: new Date().toISOString(),
              },
            });
            alertCount++;
          }

          // Check for connection issues
          if (health.status === "disconnected" && health.disconnectionCount > 0) {
            // Get user's alert config to check threshold
            const userConfig = await alertService.getAlertConfig(account.userId);
            const threshold =
              userConfig?.thresholds?.disconnectionThreshold ||
              config.alerts.defaultThresholds.disconnectionThreshold;

            if (health.disconnectionCount >= threshold) {
              await alertService.createAlert({
                userId: account.userId,
                accountId: account._id,
                accountName: account.name || "Unknown",
                type: "connectionLost",
                message: `Discord client has disconnected ${health.disconnectionCount} times`,
                severity: "high",
                resolved: false,
                data: {
                  disconnectionCount: health.disconnectionCount,
                  lastDisconnect: health.lastDisconnect,
                },
              });
              alertCount++;
            }
          }

          // Check for high error rate
          if (health.errorRate > 0) {
            // Get user's alert config to check threshold
            const userConfig = await alertService.getAlertConfig(account.userId);
            const threshold =
              userConfig?.thresholds?.errorRateThreshold ||
              config.alerts.defaultThresholds.errorRateThreshold;

            if (health.errorRate >= threshold) {
              await alertService.createAlert({
                userId: account.userId,
                accountId: account._id,
                accountName: account.name || "Unknown",
                type: "highErrorRate",
                message: `Discord client has a high error rate (${health.errorRate}%)`,
                severity: "medium",
                resolved: false,
                data: {
                  errorRate: health.errorRate,
                  errorCount: health.errorCount,
                  requestCount: health.requestCount,
                },
              });
              alertCount++;
            }
          }

          // Check for rate limiting
          if (health.rateLimited) {
            await alertService.createAlert({
              userId: account.userId,
              accountId: account._id,
              accountName: account.name || "Unknown",
              type: "rateLimited",
              message: "Discord client is being rate limited",
              severity: "medium",
              resolved: false,
              data: {
                rateLimitResetAt: health.rateLimitResetAt,
                rateLimitRemaining: health.rateLimitRemaining,
              },
            });
            alertCount++;
          }
        } catch (error) {
          logger.error(`Error monitoring account ${account._id}:`, error);
        }
      }

      // Add a small delay between batches to reduce DB load
      if (page < totalBatches) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    logger.info(
      `Discord client health check completed. Processed ${processedCount} accounts, created ${alertCount} alerts.`,
    );
  } catch (error) {
    logger.error("Error in alert monitoring job:", error);
  }
}

/**
 * Schedule periodic alert monitoring
 * @param intervalMinutes How often to check for issues (in minutes)
 * @param batchSize Number of accounts to process per batch
 */
export function scheduleAlertMonitoring(
  intervalMinutes = config.alerts.monitoring.intervalMinutes,
  batchSize = config.alerts.monitoring.batchSize,
): void {
  // Run immediately on startup
  monitorAndAlertForIssues(batchSize);

  // Schedule periodic checks
  const interval = intervalMinutes * 60 * 1000;
  setInterval(() => monitorAndAlertForIssues(batchSize), interval);

  logger.info(
    `Alert monitoring scheduled to run every ${intervalMinutes} minutes with batch size of ${batchSize}`,
  );
}
