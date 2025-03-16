import { body, param } from "express-validator";

export const discordAccountValidation = {
  create: [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Name is required")
      .isLength({ min: 1, max: 100 })
      .withMessage("Name must be between 1 and 100 characters"),
    body("token")
      .trim()
      .notEmpty()
      .withMessage("Discord token is required")
      .isLength({ min: 50, max: 100 })
      .withMessage("Invalid Discord token format"),
    body("settings.autoReconnect")
      .optional()
      .isBoolean()
      .withMessage("autoReconnect must be a boolean"),
    body("settings.statusUpdateInterval")
      .optional()
      .isInt({ min: 5000, max: 300000 })
      .withMessage("statusUpdateInterval must be between 5000 and 300000 ms"),
    body("settings.activityTypes")
      .optional()
      .isArray()
      .withMessage("activityTypes must be an array")
      .custom((value: string[]) => {
        const validTypes = ["GAME", "MUSIC", "STREAMING", "WATCHING", "CUSTOM", "COMPETING"];
        return value.every(type => validTypes.includes(type));
      })
      .withMessage("Invalid activity type"),
  ],

  update: [
    param("id").isMongoId().withMessage("Invalid account ID"),
    body("name")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Name cannot be empty")
      .isLength({ min: 1, max: 100 })
      .withMessage("Name must be between 1 and 100 characters"),
    body("token")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Token cannot be empty")
      .isLength({ min: 50, max: 100 })
      .withMessage("Invalid Discord token format"),
    body("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
    body("settings").optional().isObject().withMessage("settings must be an object"),
  ],

  getOne: [param("id").isMongoId().withMessage("Invalid account ID")],

  delete: [param("id").isMongoId().withMessage("Invalid account ID")],
};
