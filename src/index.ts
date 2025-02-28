/**
 * Discord Auto Meme Bot
 *
 * This application connects to Discord as a user client (self-bot),
 * monitors your friends' gaming activities, and automatically sends
 * them memes related to the games they're playing.
 *
 * IMPORTANT: Self-bots may be against Discord's Terms of Service.
 * Use this application at your own risk and for educational purposes only.
 */

import dotenv from "dotenv";
import { DiscordClient } from "./discord-client";
import { MemeSearcher } from "./meme-searcher";
import { MemeService } from "./meme-service";
import { logger } from "./utils/logger";
import { initI18n, t, getAvailableLanguages } from "./i18n";
import * as readline from "readline";

// Load environment variables from .env file first
dotenv.config();

// Create readline interface for language selection
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Function to prompt user for language selection
const promptForLanguage = async (
  availableLanguages: string[],
): Promise<string> => {
  return new Promise((resolve) => {
    const defaultLanguage = process.env.LANGUAGE || "en";

    console.log("\n=== Language Selection / Seleção de Idioma ===");
    console.log("Available languages / Idiomas disponíveis:");

    availableLanguages.forEach((lang, index) => {
      const langName =
        lang === "en" ? "English" : lang === "pt" ? "Português" : lang;
      console.log(`${index + 1}. ${langName}`);
    });

    rl.question(
      `\nSelect a language (1-${availableLanguages.length}) [default: ${defaultLanguage}]: `,
      (answer) => {
        const index = parseInt(answer, 10) - 1;

        // If input is valid and within range, use selected language
        if (!isNaN(index) && index >= 0 && index < availableLanguages.length) {
          resolve(availableLanguages[index]);
        } else {
          // Otherwise use default language
          resolve(defaultLanguage);
        }
      },
    );
  });
};

// App bootstrap function
const bootstrap = async () => {
  // Get available languages first
  const availableLanguages = getAvailableLanguages();

  // Prompt for language selection
  const selectedLanguage = await promptForLanguage(availableLanguages);

  // Close the readline interface
  rl.close();

  // Initialize i18n with selected language
  await initI18n(selectedLanguage);

  console.log(
    `\n=== ${t("common:config.languageSelected", {
      language: selectedLanguage,
    })} ===\n`,
  );

  // Check for required environment variables
  const requiredEnvVars = ["DISCORD_TOKEN", "SERPAPI_API_KEY"];
  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar],
  );

  if (missingEnvVars.length > 0) {
    logger.error(
      t("config.missingEnvVars", { variables: missingEnvVars.join(", ") }),
    );
    logger.error(t("config.createEnvFile"));
    process.exit(1);
  }

  // Initialize services with configuration from environment variables
  const discordToken = process.env.DISCORD_TOKEN!;
  const serpApiKey = process.env.SERPAPI_API_KEY!;
  const memeCount = parseInt(process.env.MEME_COUNT || "5", 10);
  const checkIntervalMinutes = parseInt(
    process.env.CHECK_INTERVAL_MINUTES || "15",
    10,
  );
  const sendMemes = process.env.SEND_MEMES?.toLowerCase() === "true";

  // Parse target user IDs (split comma-separated string into array)
  const targetUserIdsString = process.env.TARGET_USER_IDS || "";
  let targetUserIds: string[] = [];
  if (targetUserIdsString) {
    targetUserIds = targetUserIdsString
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id);
  }

  // Create service instances
  const discordClient = new DiscordClient(
    discordToken,
    targetUserIds.length > 0 ? targetUserIds : undefined,
  );
  const memeSearcher = new MemeSearcher(serpApiKey);
  const memeService = new MemeService(
    discordClient,
    memeSearcher,
    memeCount,
    checkIntervalMinutes,
    sendMemes,
    targetUserIds.length > 0 ? targetUserIds : undefined,
  );

  // Handle graceful shutdown
  const gracefulShutdown = () => {
    logger.info(t("app.stopping"));
    memeService.stop();
    process.exit(0);
  };

  // Listen for termination signals
  process.on("SIGINT", gracefulShutdown);
  process.on("SIGTERM", gracefulShutdown);
  process.on("uncaughtException", (error) => {
    logger.error(t("app.uncaughtException"), error);
    gracefulShutdown();
  });

  // Start the meme service
  memeService.start();

  // Log application startup information
  logger.info(t("app.started"));
  logger.info(
    t("config.memeCountConfig", {
      count: memeCount,
      minutes: checkIntervalMinutes,
    }),
  );
  logger.info(
    sendMemes ? t("config.memeSendingEnabled") : t("config.memeSendingDisabled"),
  );

  if (targetUserIds.length > 0) {
    logger.info(
      t("config.targetingSpecificUsers", {
        count: targetUserIds.length,
        userIds: targetUserIds.join(", "),
      }),
    );
  } else {
    logger.info(t("config.targetingAllFriends"));
  }

  logger.info(t("app.pressCtrlC"));
};

// Start the application
bootstrap().catch((error) => {
  console.error("Failed to start application:", error);
  process.exit(1);
});
