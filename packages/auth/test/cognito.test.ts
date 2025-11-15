import { AuthProvider } from '../src/index';

/**
 * Cognito AuthProvider tests
 * 
 * Note: These tests require AWS Cognito credentials to be set in environment variables.
 * If credentials are not provided, tests will be skipped.
 */

describe('Cognito AuthProvider', () => {
  const hasCredentials = !!(
    process.env.COGNITO_USER_POOL_ID && 
    process.env.COGNITO_CLIENT_ID
  );

  const skipIfNoCredentials = hasCredentials ? test : test.skip;

  describe('Initialization', () => {
    test('should create AuthProvider with cognito provider', () => {
      const authProvider = new AuthProvider('cognito', {
        region: 'us-east-1',
        userPoolId: 'test-pool-id',
        clientId: 'test-client-id'
      });

      expect(authProvider).toBeDefined();
      expect(authProvider.getProviderType()).toBe('cognito');
    });

    test('should throw error for unsupported provider', async () => {
      const provider = new AuthProvider('unsupported-provider' as any, {});
      await expect(provider.init()).rejects.toThrow('Unsupported auth provider');
    });
  });

  describe('With real AWS credentials', () => {
    let authProvider: AuthProvider;
    let freshIdToken: string | null = null;

    beforeAll(async () => {
      if (hasCredentials) {
        authProvider = new AuthProvider('cognito', {
          region: process.env.AWS_REGION || 'us-east-1',
          userPoolId: process.env.COGNITO_USER_POOL_ID!,
          clientId: process.env.COGNITO_CLIENT_ID!,
          clientSecret: process.env.COGNITO_CLIENT_SECRET
        });
        await authProvider.init();
      }
    });

    skipIfNoCredentials('should initialize successfully', () => {
      expect(authProvider).toBeDefined();
      expect(authProvider.getProviderType()).toBe('cognito');
    });

    skipIfNoCredentials('should detect expired token and refresh it', async () => {
      const expiredToken = process.env.COGNITO_ID_TOKEN;
      const refreshToken = process.env.COGNITO_REFRESH_TOKEN;
      const username = process.env.COGNITO_USERNAME;
      
      if (!expiredToken || !refreshToken || !username) {
        console.warn('Skipping: Required credentials not provided');
        return;
      }

      // First, verify the token is expired
      let isExpired = false;
      try {
        await authProvider.verifyToken(expiredToken);
      } catch (error) {
        if (error instanceof Error && error.message.includes('expired')) {
          isExpired = true;
        }
      }

      expect(isExpired).toBe(true);

      // Then refresh to get a new token
      const result = await authProvider.refreshToken(refreshToken, username);
      expect(result).toBeDefined();
      expect(result.AuthenticationResult).toBeDefined();
      expect(result.AuthenticationResult.IdToken).toBeDefined();

      // Store the fresh token for subsequent tests
      freshIdToken = result.AuthenticationResult.IdToken;
      
      // Verify the new token is valid
      const isValid = await authProvider.verifyToken(freshIdToken!);
      expect(isValid).toBe(true);
    });

    skipIfNoCredentials('should verify fresh token', async () => {
      if (!freshIdToken) {
        console.warn('Skipping: No fresh token available from previous test');
        return;
      }

      const isValid = await authProvider.verifyToken(freshIdToken!);
      expect(isValid).toBe(true);
    });

    skipIfNoCredentials('should get user from fresh token', async () => {
      if (!freshIdToken) {
        console.warn('Skipping: No fresh token available from previous test');
        return;
      }

      const user = await authProvider.getUser(freshIdToken!);
      expect(user).toBeDefined();
      expect(user.email).toBeDefined();
    });

    skipIfNoCredentials('should reject invalid token', async () => {
      await expect(authProvider.verifyToken('invalid.token.here')).rejects.toThrow('Invalid token');
    });

    skipIfNoCredentials('should refresh token independently', async () => {
      const refreshToken = process.env.COGNITO_REFRESH_TOKEN;
      const username = process.env.COGNITO_USERNAME;
      
      if (!refreshToken || !username) {
        console.warn('Skipping: COGNITO_REFRESH_TOKEN or COGNITO_USERNAME not provided');
        return;
      }

      const result = await authProvider.refreshToken(refreshToken, username);
      expect(result).toBeDefined();
      expect(result.AuthenticationResult).toBeDefined();
      expect(result.AuthenticationResult.IdToken).toBeDefined();
      expect(result.AuthenticationResult.AccessToken).toBeDefined();
    });
  });

  describe('Error handling', () => {
    test('should handle missing configuration gracefully', async () => {
      const authProvider = new AuthProvider('cognito', {
        region: 'us-east-1'
        // Missing required fields: userPoolId and clientId
      });

      // Since init() doesn't validate config, we test that token operations fail
      await authProvider.init();
      await expect(authProvider.verifyToken('some.token.here')).rejects.toThrow();
    });
  });
});
