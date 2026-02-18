/**
 * Microsoft Authentication Library (MSAL) configuration for Entra External ID.
 * Handles browser-based authentication with Azure AD B2C / CIAM.
 */

import { PublicClientApplication, LogLevel, type Configuration } from '@azure/msal-browser';

/**
 * MSAL configuration object.
 * Configure redirect URIs in Azure Portal > App Registrations > Authentication.
 */
const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_ENTRA_CLIENT_ID || '',
    authority: import.meta.env.VITE_ENTRA_AUTHORITY || '',
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: 'localStorage', // Use localStorage for persistence across tabs
    storeAuthStateInCookie: false, // Set to true if you have issues on IE11 or Edge
  },
  system: {
    loggerOptions: {
      loggerCallback: (level: LogLevel, message: string, containsPii: boolean) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Info:
            console.info(message);
            return;
          case LogLevel.Verbose:
            console.debug(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
          default:
            return;
        }
      },
      logLevel: import.meta.env.DEV ? LogLevel.Verbose : LogLevel.Warning,
    },
  },
};

/**
 * Scopes for API access tokens.
 * Configure API permissions in Azure Portal > App Registrations > API permissions.
 */
export const apiScopes = {
  // Default user impersonation scope
  user: ['user.read'],
  // API access scopes (replace with your actual API scope)
  api: [`api://${import.meta.env.VITE_ENTRA_CLIENT_ID}/access_as_user`],
};

/**
 * Create MSAL instance.
 * This should be created once and used throughout the application.
 */
export const msalInstance = new PublicClientApplication(msalConfig);

/**
 * Initialize MSAL instance.
 * Must be called before using the instance.
 */
export async function initializeMsal(): Promise<void> {
  await msalInstance.initialize();
}

/**
 * Login request configuration.
 */
export const loginRequest = {
  scopes: [...apiScopes.user, ...apiScopes.api],
  prompt: 'select_account' as const,
};

/**
 * Token request configuration.
 */
export const tokenRequest = {
  scopes: apiScopes.api,
  forceRefresh: false,
};
