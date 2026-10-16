import rateLimit from "express-rate-limit";

/**
 * General API rate limiter
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for sensitive operations
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Only 5 requests per 15 minutes
  skipSuccessfulRequests: true,
  message: "Too many attempts, please try again later.",
});

/**
 * Auth rate limiter (login, register)
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 attempts per hour
  skipSuccessfulRequests: true,
  message: "Too many authentication attempts, please try again later.",
});

/**
 * Upload rate limiter
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: "Upload limit reached, please try again later.",
});

/**
 * Comment/Tweet rate limiter (prevent spam)
 */
export const contentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 posts/comments per minute
  message: "You're posting too quickly, please slow down.",
});
