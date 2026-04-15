/**
 * Multi-tenancy middleware
 * Ensures all queries are filtered by tenant_id
 *
 * Extracts tenant_id from JWT token if authenticated,
 * otherwise uses DEFAULT_TENANT_ID from .env for development
 */

export const getTenantId = (req) => {
  // If authenticated via JWT, use tenantId from token
  if (req.tenantId) {
    return req.tenantId;
  }

  // Fallback to default tenant for development (when not authenticated)
  return process.env.DEFAULT_TENANT_ID;
};

export const enforceTenantFilter = (req, res, next) => {
  req.tenantId = getTenantId(req);

  if (!req.tenantId) {
    return res.status(401).json({
      success: false,
      error: 'Tenant ID not found'
    });
  }

  next();
};
