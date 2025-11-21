import axios from "axios";
import jwt from "jsonwebtoken";
import jwkToPem from "jwk-to-pem";
import { AuthProviderBase } from "../index";

export class AuthAuth0 extends AuthProviderBase {
  private domain: string = "";
  private clientId: string = "";
  private clientSecret: string = "";
  private audience: string = "";
  private scopes: string = "openid profile email offline_access";
  private jwksCache: any[] | null = null;

  async init(config?: {
    domain?: string;
    clientId?: string;
    clientSecret?: string;
    audience?: string;
    scopes?: string;
  }): Promise<void> {
    this.domain = config?.domain || process.env.AUTH0_DOMAIN || "";
    this.clientId = config?.clientId || process.env.AUTH0_CLIENT_ID || "";
    this.clientSecret = config?.clientSecret || process.env.AUTH0_CLIENT_SECRET || "";
    this.audience = config?.audience || process.env.AUTH0_AUDIENCE || "";
    this.scopes = config?.scopes || this.scopes;

    if (!this.domain || !this.clientId || !this.audience) {
      throw new Error("Auth0 config missing: domain, clientId, and audience are required");
    }
  }

  async refreshToken(refreshToken: string): Promise<any> {
    const url = `https://${this.domain}/oauth/token`;
    const payload: Record<string, string> = {
      grant_type: "refresh_token",
      client_id: this.clientId,
      refresh_token: refreshToken,
      audience: this.audience,
      scope: this.scopes
    };

    if (this.clientSecret) {
      payload.client_secret = this.clientSecret;
    }

    const { data } = await axios.post(url, payload, {
      headers: { "Content-Type": "application/json" }
    });

    return data;
  }

  async verifyToken(token: string): Promise<boolean> {
    try {
      await this.verifyJwt(token);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("jwt expired")) throw new Error("Token has expired");
        if (error.message.includes("invalid signature")) throw new Error("Invalid token signature");
        if (error.message.includes("jwt malformed")) throw new Error("Malformed token");
        if (error.message.includes("invalid issuer")) throw new Error("Invalid token issuer");
        throw error;
      }
      return false;
    }
  }

	async getUser(idToken: string): Promise<any> {
    const decoded = jwt.decode(idToken) as any;
    if (!decoded) throw new Error("Invalid ID token");

    return {
      sub: decoded.sub,
      email: decoded.email,
      email_verified: decoded.email_verified,
      name: decoded.name,
      attributes: decoded
    };
  }

  private async fetchJWKS(): Promise<any[]> {
    if (!this.jwksCache) {
      const jwksUri = `https://${this.domain}/.well-known/jwks.json`;
      const { data } = await axios.get(jwksUri);
      this.jwksCache = data.keys;
    }
    return this.jwksCache!;
  }

  private async verifyJwt(token: string): Promise<any> {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded) throw new Error("Invalid token");

    const jwks = await this.fetchJWKS();
    const key = jwks.find(k => k.kid === decoded.header.kid);
    if (!key) throw new Error("Signing key not found in JWKS");

    const pem = jwkToPem(key);

    return jwt.verify(token, pem, {
      algorithms: ["RS256"],
      issuer: `https://${this.domain}/`
    });
  }
}
