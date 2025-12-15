import axios from "axios";
import jwt from "jsonwebtoken";
import { AuthProviderBase } from "../index";

export class AuthLeanmcp extends AuthProviderBase {
    private authUrl: string = "https://auth.leanmcp.com";
    private orchestrationApiUrl: string = "https://api.leanmcp.com";
    private apiKey?: string;

    async init(config?: {
        authUrl?: string;
        orchestrationApiUrl?: string;
        apiKey?: string;
    }): Promise<void> {
        this.authUrl = config?.authUrl || process.env.LEANMCP_AUTH_URL || "https://auth.leanmcp.com";
        this.orchestrationApiUrl = config?.orchestrationApiUrl || process.env.LEANMCP_ORCHESTRATION_API_URL || "https://qaapi.leanmcp.com";
        this.apiKey = config?.apiKey || process.env.LEANMCP_API_KEY;
    }

    async refreshToken(refreshToken: string): Promise<any> {
        const url = `${this.authUrl}/api/refresh`;
        try {
            const { data } = await axios.post(url, { refresh_token: refreshToken }, {
                headers: { "Content-Type": "application/json" }
            });
            return data;
        } catch (error: any) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(`Failed to refresh token: ${error.response.data.error?.message || error.response.data.error || "Unknown error"}`);
            }
            throw error;
        }
    }

    async verifyToken(token: string): Promise<boolean> {
        // If we have an API key, use the Orchestration API to verify the user token
        if (this.apiKey) {
            const url = `${this.orchestrationApiUrl}/public/auth/verify-user`;
            try {
                await axios.post(url, { token }, {
                    headers: {
                        "Content-Type": "application/json",
                        "x-api-key": this.apiKey
                    }
                });
                return true;
            } catch (error) {
                console.error("Failed to verify token:", error);
                return false;
            }
        }

        // Fallback to direct Auth service verification (legacy/client-side)
        const url = `${this.authUrl}/api/verify`;
        try {
            const { data } = await axios.post(url, { token }, {
                headers: { "Content-Type": "application/json" }
            });
            return data.valid;
        } catch (error) {
            return false;
        }
    }

    async getUser(token: string): Promise<any> {
        // If we have an API key, use the Orchestration API to get user info
        if (this.apiKey) {
            const url = `${this.orchestrationApiUrl}/public/auth/verify-user`;
            try {
                const { data } = await axios.post(url, { token }, {
                    headers: {
                        "Content-Type": "application/json",
                        "x-api-key": this.apiKey
                    }
                });

                return {
                    uid: data.uid,
                    email: data.email,
                    email_verified: data.emailVerified,
                    name: data.name,
                    picture: data.picture,
                    type: 'firebase'
                };
            } catch (error: any) {
                console.error("Failed to verify user token via Orchestration API:", error.response?.data || error.message);
                throw new Error("Invalid user token or API key");
            }
        }

        const decoded = jwt.decode(token) as any;
        if (!decoded) throw new Error("Invalid ID token");

        return {
            uid: decoded.user_id || decoded.sub,
            email: decoded.email,
            email_verified: decoded.email_verified,
            name: decoded.name || decoded.displayName,
            picture: decoded.picture || decoded.photoURL,
            attributes: decoded,
            type: 'jwt'
        };
    }

    /**
     * Fetch user-specific environment variables for a project
     * Uses the user's UID and project ID to retrieve their stored secrets
     * 
     * @param token - User's auth token
     * @param projectId - Project ID to scope the secrets
     * @returns Record of environment variables
     */
    async getUserSecrets(token: string, projectId: string): Promise<Record<string, string>> {
        if (!this.apiKey) {
            console.warn(
                '[LeanMCP] API key not configured - cannot fetch user secrets. ' +
                'Set LEANMCP_API_KEY environment variable or pass apiKey in config.'
            );
            return {};
        }

        const url = `${this.orchestrationApiUrl}/public/secrets/user/${projectId}`;

        try {
            const { data } = await axios.get(url, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "x-api-key": this.apiKey
                }
            });

            return data.secrets || {};
        } catch (error: any) {
            // Log error without sensitive details
            console.warn('[LeanMCP] Failed to fetch user secrets:', error.response?.status || error.message);
            // Return empty object instead of failing - let @RequireEnv handle missing vars
            return {};
        }
    }
}

