/**
 * SSO Configuration Types
 */

export type SsoProvider = 'saml' | 'oidc';

/**
 * SAML Configuration
 */
export interface SamlConfig {
  entityId: string;
  ssoUrl: string;
  certificate: string;
  signRequests?: boolean;
  signatureAlgorithm?: 'sha256' | 'sha512';
}

/**
 * OIDC Configuration
 */
export interface OidcConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  userinfoEndpoint?: string;
  scopes?: string[];
}

/**
 * Team SSO Settings
 * Note: ssoConfig uses Record<string, unknown> for flexibility with partial updates
 */
export interface TeamSsoSettings {
  ssoEnabled: boolean;
  ssoProvider: SsoProvider | null;
  ssoConfig: SamlConfig | OidcConfig | Record<string, unknown> | null;
  ssoDomain: string | null;
  ssoEnforced: boolean;
}

/**
 * SSO Setup Status
 */
export interface SsoStatus {
  enabled: boolean;
  provider: SsoProvider | null;
  domain: string | null;
  enforced: boolean;
  configured: boolean;
}

/**
 * Well-known identity providers and their typical configurations
 */
export const SSO_PROVIDERS = {
  okta: {
    name: 'Okta',
    type: 'saml' as SsoProvider,
    docs: 'https://developer.okta.com/docs/guides/build-sso-integration/saml2/main/',
  },
  azure_ad: {
    name: 'Microsoft Entra ID (Azure AD)',
    type: 'saml' as SsoProvider,
    docs: 'https://learn.microsoft.com/en-us/azure/active-directory/manage-apps/configure-saml-single-sign-on',
  },
  google_workspace: {
    name: 'Google Workspace',
    type: 'saml' as SsoProvider,
    docs: 'https://support.google.com/a/answer/6087519',
  },
  onelogin: {
    name: 'OneLogin',
    type: 'saml' as SsoProvider,
    docs: 'https://developers.onelogin.com/saml',
  },
  custom_saml: {
    name: 'Custom SAML Provider',
    type: 'saml' as SsoProvider,
    docs: null,
  },
  custom_oidc: {
    name: 'Custom OIDC Provider',
    type: 'oidc' as SsoProvider,
    docs: null,
  },
} as const;

export type KnownSsoProvider = keyof typeof SSO_PROVIDERS;
