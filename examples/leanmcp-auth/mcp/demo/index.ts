import { Tool, SchemaConstraint } from "@leanmcp/core";
import { Authenticated } from "@leanmcp/auth";
import { authProvider } from "../config.js";

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
 * Input for refresh token tool
 */
class RefreshTokenInput {
    @SchemaConstraint({
        description: 'The refresh token to use for obtaining a new ID token',
        minLength: 1
    })
    refreshToken!: string;
}

/**
 * Demo Service
 * 
 * Demonstrates protected endpoints with automatic authUser injection.
 * All tools in this service are protected by the class-level @Authenticated decorator.
 * The authUser variable is automatically available in all methods with user information from Leanmcp.
 */
export class DemoService {
    /**
     * Get the authenticated user's profile
     * 
     * Demonstrates automatic authUser injection.
     * The authUser variable contains the authenticated user's information from Leanmcp.
     */
    @Authenticated(authProvider)
    @Tool({
        description: 'Get the authenticated user profile information from Leanmcp. Returns user details automatically extracted from the token.'
    })
    async getUserProfile(): Promise<{
        userId: string;
        email: string;
        name?: string;
        picture?: string;
    }> {
        // authUser is automatically available - injected by @Authenticated decorator
        return {
            userId: authUser.uid || authUser.sub,
            email: authUser.email,
            name: authUser.name,
            picture: authUser.picture
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
            userId: authUser.uid || authUser.sub,
            userEmail: authUser.email
        };
    }

    /**
     * Refresh a user token
     * 
     * This tool allows refreshing a token using the refresh token.
     * It is NOT protected by authentication, as it is used to obtain a valid token.
     */
    @Tool({
        description: 'Refresh a user token using a refresh token',
        inputClass: RefreshTokenInput,
    })
    async refreshToken(args: RefreshTokenInput): Promise<any> {
        return await authProvider.refreshToken(args.refreshToken);
    }
}
