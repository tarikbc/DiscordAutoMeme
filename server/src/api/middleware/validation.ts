import { body, param, CustomValidator } from "express-validator";
import { AccountService } from "../../services/AccountService";
import { WorkerManager } from "../../workers/WorkerManager";

// Custom validator for Discord tokens
const isValidDiscordToken: CustomValidator = value => {
  // Use the WorkerManager singleton for AccountService initialization
  const workerManager = WorkerManager.getInstance();
  const accountService = AccountService.getInstance(workerManager);

  if (!accountService.validateToken(value)) {
    throw new Error("Invalid Discord token format or structure");
  }
  return true;
};

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
      .custom(isValidDiscordToken),
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
      .custom(isValidDiscordToken),
    body("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
    body("settings").optional().isObject().withMessage("settings must be an object"),
  ],

  getOne: [param("id").isMongoId().withMessage("Invalid account ID")],

  delete: [param("id").isMongoId().withMessage("Invalid account ID")],
};
