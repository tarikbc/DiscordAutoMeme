import { t } from "../i18n";

export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[${t("logging.info")}] ${message}`, ...args);
  },
  error: (message: string, error?: any) => {
    console.error(`[${t("logging.error")}] ${message}`, error || "");
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[${t("logging.warn")}] ${message}`, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    if (process.env.DEBUG === "true") {
      console.debug(`[${t("logging.debug")}] ${message}`, ...args);
    }
  },
};
