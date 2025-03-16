declare module "google-search-results-nodejs" {
  export class SerpApi {
    static GoogleSearch: any;
    constructor(apiKey: string);
    json(params: any, callback: (data: any) => void): void;
  }
}
