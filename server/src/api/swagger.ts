import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Discord Auto Content API",
      version: "1.0.0",
      description: "API for managing Discord auto content service",
    },
    servers: [
      {
        url: "/api",
        description: "API base URL",
      },
    ],
    components: {
      schemas: {
        DiscordAccount: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              format: "ObjectId",
              description: "Account ID",
            },
            userId: {
              type: "string",
              format: "ObjectId",
              description: "User ID",
            },
            name: {
              type: "string",
              description: "Account name",
            },
            token: {
              type: "string",
              description: "Discord token (encrypted)",
            },
            isActive: {
              type: "boolean",
              description: "Whether the account is active",
            },
            settings: {
              type: "object",
              properties: {
                autoReconnect: {
                  type: "boolean",
                  description: "Auto reconnect on disconnect",
                },
                statusUpdateInterval: {
                  type: "number",
                  description: "Status update interval in ms",
                },
                contentPreferences: {
                  type: "object",
                  properties: {
                    memes: { type: "boolean" },
                    gifs: { type: "boolean" },
                    quotes: { type: "boolean" },
                    news: { type: "boolean" },
                    jokes: { type: "boolean" },
                  },
                },
                deliveryPreferences: {
                  type: "object",
                  properties: {
                    frequency: {
                      type: "number",
                      description: "Delivery frequency in ms",
                    },
                    timeWindows: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          start: { type: "string", format: "time" },
                          end: { type: "string", format: "time" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Error message",
            },
          },
        },
      },
    },
  },
  apis: ["./src/api/routes/*.ts"], // Path to the API routes
};

export const swaggerSpec = swaggerJsdoc(options);
