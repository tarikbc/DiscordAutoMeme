import { Meme, GoogleSearchResult } from "./types";
import { logger } from "./utils/logger";
import { t } from "./i18n";

// Use proper CommonJS import for the SerpAPI
const SerpApi = require("google-search-results-nodejs");

export class MemeSearcher {
  private apiKey: string;
  private searchClient: any;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.searchClient = new SerpApi.GoogleSearch(this.apiKey);
  }

  public async searchMemes(
    gameName: string,
    count: number = 5,
  ): Promise<Meme[]> {
    try {
      const searchQuery = t("memes:search.terms.query", { gameName });

      logger.info(t("memes:search.searching", { count, gameName }));

      const params = {
        q: searchQuery,
        tbm: "isch", // Image search
        ijn: "0", // Page number
        safe: "active", // Safe search
        num: count * 2, // Get more results than needed to have options
      };

      // Search for memes using SerpAPI
      return new Promise<Meme[]>((resolve, reject) => {
        this.searchClient.json(params, (data: GoogleSearchResult) => {
          try {
            if (!data.images_results || !data.images_results.length) {
              logger.warn(t("memes:search.noResults", { gameName }));
              return resolve([]);
            }

            // Get a random selection of memes
            const memes: Meme[] = data.images_results
              .slice(0, count * 2) // Take twice as many for selection
              .map((result) => ({
                url: result.original,
                title: result.title || `${gameName} meme`,
                source: result.source,
              }))
              .filter((meme) => {
                // Simple filtering to avoid non-meme content
                return (
                  meme.url &&
                  !meme.url.includes("logo") &&
                  !meme.title.toLowerCase().includes("download")
                );
              })
              .sort(() => Math.random() - 0.5) // Shuffle
              .slice(0, count); // Take only what we need

            // Log when memes are found
            logger.info(
              t("memes:search.memesFound", { count: memes.length, gameName }),
            );

            resolve(memes);
          } catch (error) {
            reject(error);
          }
        });
      });
    } catch (error) {
      logger.error(t("memes:search.failed", { gameName }), error);
      return [];
    }
  }
}
