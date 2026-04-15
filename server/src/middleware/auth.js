import jwt from 'jsonwebtoken';

/**
 * Middleware to verify JWT token and extract user information
 * Sets req.userId, req.tenantId, req.permissions
 */
export const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
      });
    }

    // Verify token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({
          success: false,
          error: 'Invalid or expired token',
        });
      }

      // Set user info on request
      req.userId = decoded.userId;
      req.tenantId = decoded.tenantId;
      req.userEmail = decoded.email;
      req.permissions = decoded.permissions || [];

      next();
    });
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: error.message,
    });
  }
};

/**
 * Optional authentication - sets user info if token exists but doesn't require it
 */
export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // No token provided, continue without authentication
      return next();
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (!err) {
        req.userId = decoded.userId;
        req.tenantId = decoded.tenantId;
        req.userEmail = decoded.email;
        req.permissions = decoded.permissions || [];
      }
      next();
    });
  } catch (error) {
    next();
  }
};
