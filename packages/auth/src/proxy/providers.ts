/**
 * Pre-configured OAuth Providers
 * 
 * Ready-to-use configurations for popular identity providers.
 * Just add your client credentials.
 */

import type { OAuthProviderConfig } from './types';

/**
 * Google OAuth provider configuration
 * 
 * @example
 * ```typescript
 * const google = googleProvider({
 *   clientId: process.env.GOOGLE_CLIENT_ID!,
 *   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
 *   scopes: ['email', 'profile'],
 * });
 * ```
 */
export function googleProvider(options: {
    clientId: string;
    clientSecret: string;
    scopes?: string[];
}): OAuthProviderConfig {
    return {
        id: 'google',
        name: 'Google',
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
        userInfoEndpoint: 'https://www.googleapis.com/oauth2/v3/userinfo',
        clientId: options.clientId,
        clientSecret: options.clientSecret,
        scopes: options.scopes ?? ['openid', 'email', 'profile'],
        tokenEndpointAuthMethod: 'client_secret_post',
        supportsPkce: true,
        authorizationParams: {
            access_type: 'offline',
            prompt: 'consent',
        },
    };
}

/**
 * GitHub OAuth provider configuration
 * 
 * @example
 * ```typescript
 * const github = githubProvider({
 *   clientId: process.env.GITHUB_CLIENT_ID!,
 *   clientSecret: process.env.GITHUB_CLIENT_SECRET!,
 * });
 * ```
 */
export function githubProvider(options: {
    clientId: string;
    clientSecret: string;
    scopes?: string[];
}): OAuthProviderConfig {
    return {
        id: 'github',
        name: 'GitHub',
        authorizationEndpoint: 'https://github.com/login/oauth/authorize',
        tokenEndpoint: 'https://github.com/login/oauth/access_token',
        userInfoEndpoint: 'https://api.github.com/user',
        clientId: options.clientId,
        clientSecret: options.clientSecret,
        scopes: options.scopes ?? ['read:user', 'user:email'],
        tokenEndpointAuthMethod: 'client_secret_post',
        supportsPkce: false, // GitHub doesn't support PKCE for web apps
    };
}

/**
 * Microsoft Azure AD / Entra ID provider configuration
 * 
 * @example
 * ```typescript
 * const azure = azureProvider({
 *   clientId: process.env.AZURE_CLIENT_ID!,
 *   clientSecret: process.env.AZURE_CLIENT_SECRET!,
 *   tenantId: process.env.AZURE_TENANT_ID ?? 'common',
 * });
 * ```
 */
export function azureProvider(options: {
    clientId: string;
    clientSecret: string;
    tenantId?: string;
    scopes?: string[];
}): OAuthProviderConfig {
    const tenantId = options.tenantId ?? 'common';
    return {
        id: 'azure',
        name: 'Microsoft',
        authorizationEndpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
        tokenEndpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        userInfoEndpoint: 'https://graph.microsoft.com/oidc/userinfo',
        clientId: options.clientId,
        clientSecret: options.clientSecret,
        scopes: options.scopes ?? ['openid', 'email', 'profile', 'offline_access'],
        tokenEndpointAuthMethod: 'client_secret_post',
        supportsPkce: true,
    };
}

/**
 * GitLab OAuth provider configuration
 * 
 * @example
 * ```typescript
 * const gitlab = gitlabProvider({
 *   clientId: process.env.GITLAB_CLIENT_ID!,
 *   clientSecret: process.env.GITLAB_CLIENT_SECRET!,
 *   // Optional: use self-hosted GitLab
 *   baseUrl: 'https://gitlab.mycompany.com',
 * });
 * ```
 */
export function gitlabProvider(options: {
    clientId: string;
    clientSecret: string;
    baseUrl?: string;
    scopes?: string[];
}): OAuthProviderConfig {
    const baseUrl = options.baseUrl ?? 'https://gitlab.com';
    return {
        id: 'gitlab',
        name: 'GitLab',
        authorizationEndpoint: `${baseUrl}/oauth/authorize`,
        tokenEndpoint: `${baseUrl}/oauth/token`,
        userInfoEndpoint: `${baseUrl}/api/v4/user`,
        clientId: options.clientId,
        clientSecret: options.clientSecret,
        scopes: options.scopes ?? ['openid', 'read_user', 'email'],
        tokenEndpointAuthMethod: 'client_secret_post',
        supportsPkce: true,
    };
}

/**
 * Slack OAuth provider configuration
 * 
 * @example
 * ```typescript
 * const slack = slackProvider({
 *   clientId: process.env.SLACK_CLIENT_ID!,
 *   clientSecret: process.env.SLACK_CLIENT_SECRET!,
 * });
 * ```
 */
export function slackProvider(options: {
    clientId: string;
    clientSecret: string;
    scopes?: string[];
}): OAuthProviderConfig {
    return {
        id: 'slack',
        name: 'Slack',
        authorizationEndpoint: 'https://slack.com/oauth/v2/authorize',
        tokenEndpoint: 'https://slack.com/api/oauth.v2.access',
        userInfoEndpoint: 'https://slack.com/api/users.identity',
        clientId: options.clientId,
        clientSecret: options.clientSecret,
        scopes: options.scopes ?? ['openid', 'email', 'profile'],
        tokenEndpointAuthMethod: 'client_secret_post',
        supportsPkce: false,
    };
}

/**
 * Discord OAuth provider configuration
 * 
 * @example
 * ```typescript
 * const discord = discordProvider({
 *   clientId: process.env.DISCORD_CLIENT_ID!,
 *   clientSecret: process.env.DISCORD_CLIENT_SECRET!,
 * });
 * ```
 */
export function discordProvider(options: {
    clientId: string;
    clientSecret: string;
    scopes?: string[];
}): OAuthProviderConfig {
    return {
        id: 'discord',
        name: 'Discord',
        authorizationEndpoint: 'https://discord.com/api/oauth2/authorize',
        tokenEndpoint: 'https://discord.com/api/oauth2/token',
        userInfoEndpoint: 'https://discord.com/api/users/@me',
        clientId: options.clientId,
        clientSecret: options.clientSecret,
        scopes: options.scopes ?? ['identify', 'email'],
        tokenEndpointAuthMethod: 'client_secret_post',
        supportsPkce: true,
    };
}

/**
 * Create a custom OAuth provider
 * 
 * @example
 * ```typescript
 * const custom = customProvider({
 *   id: 'my-idp',
 *   name: 'My Identity Provider',
 *   authorizationEndpoint: 'https://idp.example.com/authorize',
 *   tokenEndpoint: 'https://idp.example.com/token',
 *   clientId: process.env.MY_IDP_CLIENT_ID!,
 *   clientSecret: process.env.MY_IDP_CLIENT_SECRET!,
 *   scopes: ['openid', 'profile'],
 * });
 * ```
 */
export function customProvider(config: OAuthProviderConfig): OAuthProviderConfig {
    return {
        tokenEndpointAuthMethod: 'client_secret_post',
        supportsPkce: false,
        ...config,
    };
}
