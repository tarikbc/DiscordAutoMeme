import { Express } from "express";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import config from "../config";

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Discord Auto Content API",
      version: "1.0.0",
      description: "Discord Auto Content Server API",
    },
    servers: [
      {
        url: `http://localhost:${config.port}/api`,
        description: "Development Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./src/api/routes/*.ts"],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

const setupSwagger = (app: Express): void => {
  // Swagger UI
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // JSON endpoint for the Swagger spec
  app.get("/api-spec.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
};

export default setupSwagger;
