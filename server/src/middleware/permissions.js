/**
 * RBAC Permission Middleware
 * Checks if user has required permission to access resource
 */

/**
 * Require specific permission
 * Usage: requirePermission('rooms', 'write')
 */
export const requirePermission = (resource, action) => {
  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Check if user has the required permission
    const hasPermission = req.permissions.some(
      (perm) => perm.resource === resource && perm.action === action
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        required: { resource, action },
      });
    }

    next();
  };
};

/**
 * Require any of the specified permissions
 * Usage: requireAnyPermission([{resource: 'rooms', action: 'read'}, {resource: 'rooms', action: 'write'}])
 */
export const requireAnyPermission = (permissionsList) => {
  return (req, res, next) => {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const hasAnyPermission = permissionsList.some((required) =>
      req.permissions.some(
        (perm) =>
          perm.resource === required.resource && perm.action === required.action
      )
    );

    if (!hasAnyPermission) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        requiredAny: permissionsList,
      });
    }

    next();
  };
};

/**
 * Require all of the specified permissions
 * Usage: requireAllPermissions([{resource: 'rooms', action: 'read'}, {resource: 'payments', action: 'write'}])
 */
export const requireAllPermissions = (permissionsList) => {
  return (req, res, next) => {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const hasAllPermissions = permissionsList.every((required) =>
      req.permissions.some(
        (perm) =>
          perm.resource === required.resource && perm.action === required.action
      )
    );

    if (!hasAllPermissions) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        requiredAll: permissionsList,
      });
    }

    next();
  };
};

/**
 * Check if user is admin (has all permissions)
 */
export const requireAdmin = (req, res, next) => {
  if (!req.userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  // Check if user has admin-level permissions
  // Admin users should have permissions for all critical resources
  const adminResources = ['users', 'settings', 'tenants'];
  const isAdmin = adminResources.every((resource) =>
    req.permissions.some(
      (perm) => perm.resource === resource && perm.action === 'write'
    )
  );

  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
  }

  next();
};
