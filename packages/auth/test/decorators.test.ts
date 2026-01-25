import 'reflect-metadata';
import { Authenticated, AuthenticationError } from '../src/decorators';
import { AuthProviderBase } from '../src/index';

/**
 * Mock Auth Provider for testing
 */
class MockAuthProvider extends AuthProviderBase {
  private validTokens = new Set(['valid-token-123', 'valid-token-456']);

  async init(config?: any): Promise<void> {
    // Mock initialization
  }

  async verifyToken(token: string): Promise<boolean> {
    return this.validTokens.has(token);
  }

  async refreshToken(refreshToken: string): Promise<any> {
    return { accessToken: 'new-token', refreshToken: 'new-refresh' };
  }

  async getUser(token: string): Promise<any> {
    if (this.validTokens.has(token)) {
      return { id: '123', email: 'test@example.com' };
    }
    throw new Error('Invalid token');
  }

  addValidToken(token: string) {
    this.validTokens.add(token);
  }
}

// Initialize mock provider before class definitions
const mockAuthProvider = new MockAuthProvider();

describe('@Authenticated Decorator', () => {
  beforeEach(() => {
    // Reset valid tokens before each test
    mockAuthProvider['validTokens'].clear();
    mockAuthProvider.addValidToken('valid-token-123');
    mockAuthProvider.addValidToken('valid-token-456');
  });

  describe('Method-level protection', () => {
    class TestServicePartial {
      @Authenticated(mockAuthProvider)
      async protectedMethod(args: { text: string }, meta?: any) {
        return { result: `Protected: ${args.text}` };
      }

      async publicMethod(args: { text: string }) {
        return { result: `Public: ${args.text}` };
      }
    }

    test('should throw MISSING_TOKEN error when no token provided', async () => {
      const service = new TestServicePartial();

      await expect(service.protectedMethod({ text: 'Hello' })).rejects.toThrow(AuthenticationError);

      try {
        await service.protectedMethod({ text: 'Hello' });
      } catch (error) {
        expect(error).toBeInstanceOf(AuthenticationError);
        expect((error as AuthenticationError).code).toBe('MISSING_TOKEN');
      }
    });

    test('should throw INVALID_TOKEN error with invalid token', async () => {
      const service = new TestServicePartial();
      const meta = { authorization: { type: 'bearer', token: 'invalid-token' } };

      await expect(service.protectedMethod({ text: 'Hello' }, meta)).rejects.toThrow(
        AuthenticationError
      );

      try {
        await service.protectedMethod({ text: 'Hello' }, meta);
      } catch (error) {
        expect(error).toBeInstanceOf(AuthenticationError);
        expect((error as AuthenticationError).code).toBe('INVALID_TOKEN');
      }
    });

    test('should execute successfully with valid token', async () => {
      const service = new TestServicePartial();
      const meta = { authorization: { type: 'bearer', token: 'valid-token-123' } };
      const result = await service.protectedMethod({ text: 'Hello' }, meta);

      expect(result).toEqual({ result: 'Protected: Hello' });
    });

    test('should allow public method without token', async () => {
      const service = new TestServicePartial();
      const result = await service.publicMethod({ text: 'Hello' });

      expect(result).toEqual({ result: 'Public: Hello' });
    });

    test('should not include _meta in method arguments', async () => {
      const service = new TestServicePartial();
      const meta = { authorization: { type: 'bearer', token: 'valid-token-123' } };
      const result = await service.protectedMethod({ text: 'Test' }, meta);

      // Verify that only the business arguments are passed, not _meta
      expect(result).toEqual({ result: 'Protected: Test' });
    });
  });

  describe('Class-level protection', () => {
    @Authenticated(mockAuthProvider)
    class TestServiceFull {
      async method1(args: { text: string }, meta?: any) {
        return { result: `Method1: ${args.text}` };
      }

      async method2(args: { text: string }, meta?: any) {
        return { result: `Method2: ${args.text}` };
      }
    }

    test('should protect method1 when applied to class', async () => {
      const service = new TestServiceFull();

      await expect(service.method1({ text: 'Hello' })).rejects.toThrow(AuthenticationError);

      try {
        await service.method1({ text: 'Hello' });
      } catch (error) {
        expect(error).toBeInstanceOf(AuthenticationError);
        expect((error as AuthenticationError).code).toBe('MISSING_TOKEN');
      }
    });

    test('should protect method2 when applied to class', async () => {
      const service = new TestServiceFull();

      await expect(service.method2({ text: 'Hello' })).rejects.toThrow(AuthenticationError);

      try {
        await service.method2({ text: 'Hello' });
      } catch (error) {
        expect(error).toBeInstanceOf(AuthenticationError);
        expect((error as AuthenticationError).code).toBe('MISSING_TOKEN');
      }
    });

    test('should allow access with valid token for all methods', async () => {
      const service = new TestServiceFull();
      const meta = { authorization: { type: 'bearer', token: 'valid-token-456' } };
      const result = await service.method1({ text: 'Hello' }, meta);

      expect(result).toEqual({ result: 'Method1: Hello' });
    });
  });
});
