/**
 * Authentication hook using MSAL for Entra External ID.
 * Provides sign-in, sign-out, token acquisition, and user state management.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  useMsal,
  useAccount,
} from '@azure/msal-react';
import {
  InteractionRequiredAuthError,
  type AuthenticationResult,
  type AccountInfo,
} from '@azure/msal-browser';
import { tokenRequest } from '../config/msal';
import type { User, UserRole } from '@fire-sim/shared';

/**
 * Auth state and methods returned by the hook.
 */
export interface UseAuthResult {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

/**
 * Extract user roles from MSAL account claims.
 */
function extractRolesFromAccount(account: AccountInfo | null): UserRole[] {
  if (!account?.idTokenClaims) {
    return ['trainer']; // Default role
  }

  const claims = account.idTokenClaims as any;
  const roles: UserRole[] = [];

  // Check various role claim locations
  const roleClaims = claims.roles || claims.role || [];
  const roleArray = Array.isArray(roleClaims) ? roleClaims : [roleClaims];

  for (const role of roleArray) {
    const normalizedRole = role.toLowerCase();
    if (normalizedRole === 'admin' || normalizedRole === 'trainer') {
      roles.push(normalizedRole as UserRole);
    }
  }

  // Default to trainer if no roles found
  if (roles.length === 0) {
    roles.push('trainer');
  }

  return roles;
}

/**
 * Convert MSAL account to User object.
 */
function accountToUser(account: AccountInfo | null): User | null {
  if (!account) {
    return null;
  }

  return {
    id: account.localAccountId || account.homeAccountId,
    email: account.username,
    name: account.name,
    roles: extractRolesFromAccount(account),
    authMethod: 'email', // MSAL uses email/password or social auth
  };
}

/**
 * Custom hook for authentication with MSAL.
 */
export function useAuth(): UseAuthResult {
  const { instance, accounts, inProgress } = useMsal();
  const account = useAccount(accounts[0] || null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Determine if user is authenticated
  const isAuthenticated = !!account;

  // Convert account to User object
  const user = accountToUser(account);

  // Initialize loading state
  useEffect(() => {
    if (inProgress === 'none') {
      setIsLoading(false);
    }
  }, [inProgress]);

  /**
   * Sign in using redirect flow.
   */
  const signIn = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      await instance.loginRedirect({
        scopes: tokenRequest.scopes,
        prompt: 'select_account',
      });
    } catch (err) {
      setError(err as Error);
      setIsLoading(false);
    }
  }, [instance]);

  /**
   * Sign out and redirect to home page.
   */
  const signOut = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      await instance.logoutRedirect({
        account: account || undefined,
      });
    } catch (err) {
      setError(err as Error);
      setIsLoading(false);
    }
  }, [instance, account]);

  /**
   * Get access token for API calls.
   * Handles silent token acquisition and interactive fallback.
   */
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (!account) {
      return null;
    }

    try {
      // Try silent token acquisition first
      const response: AuthenticationResult = await instance.acquireTokenSilent({
        ...tokenRequest,
        account,
      });

      return response.accessToken;
    } catch (err) {
      if (err instanceof InteractionRequiredAuthError) {
        // Fall back to interactive if silent fails
        try {
          // acquireTokenRedirect doesn't return immediately, it redirects
          await instance.acquireTokenRedirect({
            ...tokenRequest,
            account,
          });

          // This code won't be reached due to redirect, but TypeScript needs it
          return null;
        } catch (interactiveErr) {
          console.error('[Auth] Interactive token acquisition failed:', interactiveErr);
          setError(interactiveErr as Error);
          return null;
        }
      } else {
        console.error('[Auth] Token acquisition failed:', err);
        setError(err as Error);
        return null;
      }
    }
  }, [instance, account]);

  return {
    isAuthenticated,
    user,
    isLoading,
    error,
    signIn,
    signOut,
    getAccessToken,
  };
}
