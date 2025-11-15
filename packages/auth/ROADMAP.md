# @leanmcp/auth - Feature Roadmap

## Planned Features

### User Signup & Signin (Future Implementation)

The following authentication flows are planned for future implementation:

#### Signup Flow
```typescript
/**
 * Sign up a new user with Cognito
 * @param username - User's username/email
 * @param password - User's password
 * @param metadata - Additional user attributes (optional)
 */
async signup(username: string, password: string, metadata?: any): Promise<any>
```

**Implementation Notes:**
- Uses `SignUpCommand` from `@aws-sdk/client-cognito-identity-provider`
- Supports custom user attributes via metadata parameter
- Returns user confirmation status

#### Confirm Signup Flow
```typescript
/**
 * Confirm user signup with verification code
 * @param userId - User identifier
 * @param code - Verification code from email/SMS
 */
async confirmSignup(userId: string, code: string): Promise<any>
```

**Implementation Notes:**
- Uses `ConfirmSignUpCommand`
- Required for email/SMS verification flows
- Activates user account after verification

#### Signin Flow
```typescript
/**
 * Sign in an existing user
 * @param username - User's username/email
 * @param password - User's password
 * @returns IdToken, AccessToken, and RefreshToken
 */
async signin(username: string, password: string): Promise<any>
```

**Implementation Notes:**
- Uses `InitiateAuthCommand` with `USER_PASSWORD_AUTH` flow
- Returns authentication tokens
- Requires Cognito User Pool to have `USER_PASSWORD_AUTH` enabled

### Additional Provider Support

Planned authentication providers:
- **Clerk** - Modern authentication and user management
- **Firebase Auth** - Google's authentication service
- **Auth0** - Enterprise authentication platform
- **Supabase Auth** - Open source authentication

### Enhanced Security Features

- **Multi-factor Authentication (MFA)** support
- **Social Login** (Google, GitHub, etc.)
- **Passwordless authentication**
- **Token rotation** and automatic refresh
- **Rate limiting** for authentication attempts

### Developer Experience

- **Interactive CLI** for auth setup
- **Testing utilities** for mocked authentication
- **Migration tools** for switching providers
- **Better error messages** with recovery suggestions

## Contributing

If you'd like to contribute to implementing any of these features, please:
1. Open an issue to discuss the feature
2. Reference this roadmap in your PR
3. Follow the existing authentication pattern in `AuthProviderBase`

## Current Implementation Status

**Completed:**
- Token verification with JWKS
- Token refresh flow
- User info extraction from tokens
- `@Authenticated` decorator for protecting methods
- AWS Cognito provider

**In Progress:**
- None

**Planned:**
- User signup/signin flows (see above)
- Additional authentication providers
- Enhanced security features
