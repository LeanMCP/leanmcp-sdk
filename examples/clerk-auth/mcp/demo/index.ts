import { Tool, SchemaConstraint } from "@leanmcp/core";
import { Authenticated } from "@leanmcp/auth";
import { authProvider } from "../config.js";

/**
 * Global authUser variable injected by @Authenticated decorator
 * Contains authenticated user information from Clerk
 */
declare const authUser: any;

/**
 * Input for echo tool
 */
class EchoInput {
  @SchemaConstraint({
    description: 'Message to echo back',
    minLength: 1
  })
  message!: string;
}

/**
 * Demo Service
 * 
 * Demonstrates protected endpoints with automatic authUser injection.
 * All tools in this service are protected by the class-level @Authenticated decorator.
 * The authUser variable is automatically available in all methods with user information from Clerk.
 */
@Authenticated(authProvider)
export class DemoService {
  /**
   * Get the authenticated user's profile
   * 
   * Demonstrates automatic authUser injection.
   * The authUser variable contains the authenticated user's information from Clerk.
   */
  @Tool({ 
    description: 'Get the authenticated user profile information from Clerk. Returns user details automatically extracted from the JWT token.'
  })
  async getUserProfile(): Promise<{
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    imageUrl?: string;
  }> {
    // authUser is automatically available - injected by @Authenticated decorator
    // It contains the decoded JWT token payload from Clerk
    return {
      userId: authUser.userId || authUser.sub,
      email: authUser.email,
      firstName: authUser.firstName,
      lastName: authUser.lastName,
      imageUrl: authUser.imageUrl
    };
  }

  /**
   * Echo back a message with user information
   * Demonstrates accessing authUser in a tool with input arguments.
   */
  @Tool({ 
    description: 'Echo back a message with authenticated user information',
    inputClass: EchoInput
  })
  async echo(args: EchoInput): Promise<{ 
    message: string;
    timestamp: string;
    userId: string;
    userEmail: string;
  }> {
    // authUser is automatically available
    return {
      message: args.message,
      timestamp: new Date().toISOString(),
      userId: authUser.userId || authUser.sub,
      userEmail: authUser.email
    };
  }
}
