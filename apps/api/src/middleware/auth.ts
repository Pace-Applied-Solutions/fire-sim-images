/**
 * Authentication middleware for Azure Functions.
 * Validates JWT bearer tokens from Azure Static Web Apps CIAM authentication.
 */

import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import jwt from 'jsonwebtoken';
import type { User, UserRole } from '@fire-sim/shared';

/**
 * Configuration for auth middleware.
 */
interface AuthConfig {
  enabled: boolean;
  jwtSecret?: string; // For dev/mock auth
  issuer?: string; // Expected token issuer (Entra External ID)
  audience?: string; // Expected token audience (App ID)
  mockUser?: User; // Mock user for development
}

let config: AuthConfig = {
  enabled: false,
  mockUser: {
    id: 'dev-user-123',
    email: 'trainer@example.com',
    name: 'Development Trainer',
    roles: ['trainer'],
    authMethod: 'email',
  },
};

/**
 * Initialize auth middleware with configuration.
 */
export function initializeAuth(authConfig: AuthConfig): void {
  config = authConfig;
  console.log(`[Auth] Authentication ${config.enabled ? 'enabled' : 'disabled (using mock user)'}`);
}

/**
 * Extract and validate JWT bearer token from request.
 * Returns authenticated user or null if invalid/missing.
 */
export async function authenticateRequest(
  request: HttpRequest,
  context: InvocationContext
): Promise<User | null> {
  // In dev mode with auth disabled, return mock user
  if (!config.enabled && config.mockUser) {
    context.log('[Auth] Using mock user for development');
    return config.mockUser;
  }

  // Extract Authorization header
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    context.log('[Auth] Missing or invalid Authorization header');
    return null;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    // Azure Static Web Apps with CIAM provides pre-validated tokens via Easy Auth
    // The token is in the X-MS-CLIENT-PRINCIPAL header (Base64 encoded JSON)
    const clientPrincipalHeader = request.headers.get('X-MS-CLIENT-PRINCIPAL');

    if (clientPrincipalHeader) {
      // Parse Easy Auth principal
      const principalJson = Buffer.from(clientPrincipalHeader, 'base64').toString('utf-8');
      const principal = JSON.parse(principalJson);

      // Extract user info from principal
      const user: User = {
        id: principal.userId || principal.userDetails,
        email: principal.userDetails || principal.userId,
        name: principal.claims?.find((c: any) => c.typ === 'name')?.val,
        roles: extractRolesFromPrincipal(principal),
        authMethod: principal.identityProvider === 'aad' ? 'sso' : 'email',
      };

      context.log(`[Auth] Authenticated user: ${user.email} (${user.roles.join(', ')})`);
      return user;
    }

    // Fallback: Validate JWT manually (for non-Easy Auth scenarios)
    if (config.jwtSecret) {
      const decoded = jwt.verify(token, config.jwtSecret, {
        issuer: config.issuer,
        audience: config.audience,
      }) as any;

      const user: User = {
        id: decoded.sub || decoded.oid,
        email: decoded.email || decoded.preferred_username,
        name: decoded.name,
        roles: extractRolesFromToken(decoded),
        authMethod: 'email', // Default to email
      };

      context.log(`[Auth] Authenticated user via JWT: ${user.email}`);
      return user;
    }

    context.log('[Auth] No valid authentication method available');
    return null;
  } catch (error) {
    context.error('[Auth] Token validation failed:', error);
    return null;
  }
}

/**
 * Extract roles from Easy Auth principal claims.
 */
function extractRolesFromPrincipal(principal: any): UserRole[] {
  const roles: UserRole[] = [];

  // Check for role claims
  const roleClaims = principal.claims?.filter(
    (c: any) =>
      c.typ === 'roles' ||
      c.typ === 'role' ||
      c.typ === 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
  );

  for (const claim of roleClaims || []) {
    const role = claim.val?.toLowerCase();
    if (role === 'admin' || role === 'trainer') {
      roles.push(role as UserRole);
    }
  }

  // Default to trainer if no roles found
  if (roles.length === 0) {
    roles.push('trainer');
  }

  return roles;
}

/**
 * Extract roles from JWT token claims.
 */
function extractRolesFromToken(decoded: any): UserRole[] {
  const roles: UserRole[] = [];

  // Check various role claim locations
  const roleClaimLocations = [
    decoded.roles,
    decoded.role,
    decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
    decoded.extension_UserRole, // Custom attribute
  ];

  for (const roleClaim of roleClaimLocations) {
    if (roleClaim) {
      const roleArray = Array.isArray(roleClaim) ? roleClaim : [roleClaim];
      for (const role of roleArray) {
        const normalizedRole = role.toLowerCase();
        if (normalizedRole === 'admin' || normalizedRole === 'trainer') {
          roles.push(normalizedRole as UserRole);
        }
      }
    }
  }

  // Default to trainer if no roles found
  if (roles.length === 0) {
    roles.push('trainer');
  }

  return roles;
}

/**
 * Create a 401 Unauthorized response.
 */
export function createUnauthorizedResponse(
  message: string = 'Authentication required'
): HttpResponseInit {
  return {
    status: 401,
    jsonBody: {
      error: 'Unauthorized',
      message,
    },
  };
}

/**
 * Wrapper for authenticated function handlers.
 * Validates authentication before calling the handler.
 */
export function withAuth(
  handler: (
    request: HttpRequest,
    context: InvocationContext,
    user: User
  ) => Promise<HttpResponseInit>
) {
  return async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const user = await authenticateRequest(request, context);

    if (!user) {
      return createUnauthorizedResponse();
    }

    return handler(request, context, user);
  };
}
