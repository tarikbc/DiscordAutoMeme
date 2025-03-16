declare module "google-search-results-nodejs" {
  export class SerpApi {
    static GoogleSearch: new (apiKey: string) => {
      json: (params: Record<string, any>, callback: (data: any) => void) => void;
    };
  }
}
