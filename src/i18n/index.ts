import i18next from "i18next";
import Backend from "i18next-fs-backend";
import path from "path";
import fs from "fs";

// Initialize i18next
const initI18n = async (language: string = "en") => {
  await i18next.use(Backend).init({
    backend: {
      loadPath: path.resolve(__dirname, "../locales/{{lng}}/{{ns}}.json"),
      addPath: path.resolve(
        __dirname,
        "../locales/{{lng}}/{{ns}}.missing.json"
      ),
    },
    debug: false,
    fallbackLng: "en",
    lng: language,
    preload: ["en", "pt"], // Preload English and Portuguese
    saveMissing: true,
    ns: ["common", "memes", "discord"],
    defaultNS: "common",
    returnObjects: false,
  });

  return i18next;
};

// Shorthand translation function with explicit return type
export const t = (key: string, options?: any): string => {
  return i18next.t(key, options) as string;
};

// Export the i18n instance and initialization function
export { i18next, initI18n };

// Helper function to check available languages
export const getAvailableLanguages = (): string[] => {
  const localesDir = path.resolve(__dirname, "../locales");
  return fs
    .readdirSync(localesDir)
    .filter((file) => fs.statSync(path.join(localesDir, file)).isDirectory());
};
