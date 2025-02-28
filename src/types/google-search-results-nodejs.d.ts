declare module "google-search-results-nodejs" {
  export function getJson(
    engine: string,
    params: Record<string, any>
  ): Promise<any>;
}
