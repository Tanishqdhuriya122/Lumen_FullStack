const cache = new Map();

class SimpleCacheService {
  set(key, value, expirationInSeconds = 3600) {
    const expiresAt = Date.now() + expirationInSeconds * 1000;
    cache.set(key, { value, expiresAt });
    return true;
  }

  get(key) {
    const cached = cache.get(key);
    if (!cached) return null;
    if (Date.now() > cached.expiresAt) {
      cache.delete(key);
      return null;
    }
    return cached.value;
  }

  delete(key) {
    cache.delete(key);
    return true;
  }

  deletePattern(pattern) {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    for (const key of cache.keys()) {
      if (regex.test(key)) {
        cache.delete(key);
      }
    }
    return true;
  }
}

export const cacheService = new SimpleCacheService();

export const cacheMiddleware = (expirationInSeconds = 300) => {
  return async (req, res, next) => {
    if (req.method !== "GET") {
      return next();
    }

    const cacheKey = `cache:${req.originalUrl || req.url}`;
    const cachedResponse = cacheService.get(cacheKey);

    if (cachedResponse) {
      return res.status(200).json({
        ...cachedResponse,
        cached: true,
      });
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      cacheService.set(cacheKey, body, expirationInSeconds);
      return originalJson(body);
    };

    next();
  };
};

export const invalidateCacheMiddleware = (patterns) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        for (const pattern of patterns) {
          cacheService.deletePattern(pattern);
        }
      }
      return originalJson(body);
    };
    next();
  };
};