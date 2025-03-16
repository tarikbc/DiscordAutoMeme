import { Request, Response, NextFunction } from "express";
import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { Strategy as LocalStrategy } from "passport-local";
import { User, UserDocument } from "../../models/User";
import config from "../../config";
import logger from "../../utils/logger";
import rateLimit from "express-rate-limit";
import "express";

// Configure passport with JWT strategy
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.jwt.secret,
    },
    async (jwtPayload, done) => {
      try {
        const user = await User.findById(jwtPayload.id);

        if (!user) {
          return done(null, false);
        }

        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    },
  ),
);

// Configure local strategy (username/password)
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
          return done(null, false, { message: "Invalid email or password" });
        }

        // Check if account is locked
        if (user.isAccountLocked()) {
          return done(null, false, {
            message: "Account is locked due to too many failed attempts. Try again later.",
          });
        }

        // Verify password
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
          // Increment failed login attempts
          await user.incrementLoginAttempts();
          return done(null, false, { message: "Invalid email or password" });
        }

        // Reset failed login attempts on successful login
        await user.resetLoginAttempts();

        return done(null, user);
      } catch (error) {
        logger.error("Login error:", error);
        return done(error);
      }
    },
  ),
);

// Initialize passport
export const initializePassport = () => {
  return passport.initialize();
};

// Authentication middleware
export const authenticateJwt = passport.authenticate("jwt", { session: false });

// Local authentication (for login)
export const authenticateLocal = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate(
    "local",
    { session: false },
    (err: Error, user: UserDocument, info: any) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(401).json({ error: info.message || "Authentication failed" });
      }

      req.user = user;
      next();
    },
  )(req, res, next);
};

// Role-based access control middleware
export const requireRole = (role: "admin" | "user") => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Log deprecation warning
    logger.warn(
      "requireRole middleware is deprecated. Please use requirePermission from permissions.ts instead.",
    );

    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = req.user as UserDocument;

    // Deprecated: Use permission-based approach instead
    // For admin role check, now redirecting to check if user has admin permissions
    if (role === "admin") {
      user
        .hasPermission("roles:manage")
        .then(hasPermission => {
          if (!hasPermission) {
            return res.status(403).json({ error: "Forbidden" });
          }
          next();
        })
        .catch(error => {
          logger.error("Permission check error:", error);
          return res.status(500).json({ error: "Error checking permissions" });
        });
    } else {
      next();
    }
  };
};

// Rate limiting for login attempts
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per IP per window
  message: { error: "Too many login attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});
