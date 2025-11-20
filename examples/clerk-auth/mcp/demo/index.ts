import { Tool, SchemaConstraint } from "@leanmcp/core";
import { Authenticated } from "@leanmcp/auth";
import { authProvider } from "../config.js";

/**
 * Input for getting user profile
 */
class GetProfileInput {
  @SchemaConstraint({
    description: 'ID token from Clerk authentication',
    minLength: 1
  })
  token!: string;
}

/**
 * Input for echo tool
 */
class EchoInput {
  @SchemaConstraint({
    description: 'ID token from Clerk authentication',
    minLength: 1
  })
  token!: string;

  @SchemaConstraint({
    description: 'Message to echo back',
    minLength: 1
  })
  message!: string;
}

/**
 * Demo Service
 * 
 * Demonstrates protected endpoints that require authentication.
 * All tools in this service are protected by the class-level @Authenticated decorator.
 */
@Authenticated(authProvider)
export class DemoService {
  /**
   * Get the authenticated user's profile
   * 
   * This is a protected endpoint that requires a valid Clerk token.
   * Authentication is automatically enforced by the class-level decorator.
   */
  @Tool({ 
    description: 'Get the authenticated user profile information from Clerk',
    inputClass: GetProfileInput
  })
  async getUserProfile(args: GetProfileInput): Promise<{
    sub: string;
    email: string;
    email_verified: boolean;
    first_name: string;
    last_name: string;
    attributes: any;
  }> {
    try {
      const user = await authProvider.getUser(args.token);
      
      return {
        sub: user.sub,
        email: user.email,
        email_verified: user.email_verified,
        first_name: user.first_name,
        last_name: user.last_name,
        attributes: user.attributes
      };
    } catch (error) {
      throw new Error(
        `Failed to get user profile: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * A simple protected endpoint that echoes back a message
   * Authentication is automatically enforced by the class-level decorator.
   */
  @Tool({ 
    description: 'Echo back a message (requires authentication)',
    inputClass: EchoInput
  })
  async echo(args: EchoInput): Promise<{ 
    message: string;
    timestamp: string;
    authenticated: boolean;
  }> {
    return {
      message: args.message,
      timestamp: new Date().toISOString(),
      authenticated: true
    };
  }
}
