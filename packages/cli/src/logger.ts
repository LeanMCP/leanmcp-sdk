import chalk from "chalk";
import os from "os";
import crypto from "crypto";
import { execSync } from "child_process";

// PostHog configuration
const POSTHOG_API_KEY = "phc_EoMHKFbx6j2wUFsf8ywqgHntY4vEXC3ZzLFoPJVjRRT";
const POSTHOG_API_HOST = "https://d18m0xvdtnkibr.cloudfront.net";

// Global debug mode
let DEBUG_MODE = false;

/**
 * Enable or disable debug mode globally
 */
export function setDebugMode(enabled: boolean): void {
  DEBUG_MODE = enabled;
}

/**
 * Check if debug mode is enabled
 */
export function isDebugMode(): boolean {
  return DEBUG_MODE;
}

/**
 * Debug log - only prints when debug mode is enabled
 */
export function debug(message: string, ...args: any[]): void {
  if (DEBUG_MODE) {
    console.log(chalk.gray(`[DEBUG] ${message}`), ...args);
  }
}

// Check if telemetry is disabled
const isTelemetryDisabled = (): boolean => {
  return process.env.LEANMCP_DISABLE_TELEMETRY === "true";
};

// Generate a unique anonymous ID for the CLI user
const getAnonymousId = (): string => {
  // Use a hash of the machine's hostname + username as anonymous ID
  const identifier = `${os.hostname()}-${os.userInfo().username}`;
  return crypto.createHash("sha256").update(identifier).digest("hex").substring(0, 16);
};

// Get npm version (cached)
let cachedNpmVersion: string | null = null;
const getNpmVersion = (): string => {
  if (cachedNpmVersion) return cachedNpmVersion;
  try {
    cachedNpmVersion = execSync("npm --version", { encoding: "utf-8" }).trim();
  } catch {
    cachedNpmVersion = "unknown";
  }
  return cachedNpmVersion;
};

// Get system info for telemetry
const getSystemInfo = (): Record<string, any> => {
  return {
    $os: os.platform(),
    $os_version: os.release(),
    arch: os.arch(),
    node_version: process.version,
    npm_version: getNpmVersion(),
    cpu_count: os.cpus().length,
    cpu_model: os.cpus()[0]?.model || "unknown",
    ram_total_gb: Math.round(os.totalmem() / (1024 * 1024 * 1024) * 10) / 10,
    ram_free_gb: Math.round(os.freemem() / (1024 * 1024 * 1024) * 10) / 10,
    hostname_hash: getAnonymousId(),
  };
};

// Track if we've sent system info this session
let systemInfoSent = false;

// Send event to PostHog - completely non-blocking, fire-and-forget
const sendToPostHog = (
  eventName: string,
  properties: Record<string, any> = {}
): void => {
  if (isTelemetryDisabled()) {
    debug("[PostHog] Telemetry disabled, skipping event:", eventName);
    return;
  }

  // Use setImmediate to ensure this runs completely asynchronously
  // and never blocks the main CLI execution
  setImmediate(() => {
    try {
      // Include system info on first event of session
      const systemProps = !systemInfoSent ? getSystemInfo() : {};
      systemInfoSent = true;

      const payload = {
        api_key: POSTHOG_API_KEY,
        event: eventName,
        properties: {
          distinct_id: getAnonymousId(),
          $lib: "leanmcp-cli",
          ...systemProps,
          ...properties,
        },
        timestamp: new Date().toISOString(),
      };

      const url = `${POSTHOG_API_HOST}/capture/`;
      
      // Debug logging for PostHog requests
      debug(`[PostHog] POST ${url}`);
      debug(`[PostHog] Event: ${eventName}`);
      debug(`[PostHog] Payload:`, JSON.stringify(payload, null, 2));

      // Create an AbortController with a 3 second timeout
      // This ensures we don't hang on slow networks
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
        .then((response) => {
          clearTimeout(timeoutId);
          debug(`[PostHog] Response: ${response.status} ${response.statusText}`);
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          debug(`[PostHog] Error: ${err.message || err}`);
        });
    } catch (err: any) {
      debug(`[PostHog] Exception: ${err.message || err}`);
    }
  });
};

// Type for chalk style functions
type ChalkFunction = typeof chalk.cyan | typeof chalk.green | typeof chalk.gray | typeof chalk.red | typeof chalk.blue | typeof chalk.yellow | typeof chalk.white | typeof chalk.bold;

/**
 * Logger function that logs to console and sends telemetry to PostHog
 * @param text - The text to log
 * @param styleFn - Optional chalk style function (e.g., chalk.cyan, chalk.green)
 */
export const log = (text: string, styleFn?: ChalkFunction): void => {
  // Log to console with optional styling
  if (styleFn) {
    console.log(styleFn(text));
  } else {
    console.log(text);
  }

  // Send to PostHog telemetry
  sendToPostHog("cli_log", {
    message: text,
    styled: !!styleFn,
  });
};

/**
 * Track a specific CLI event
 * @param eventName - Name of the event (e.g., "create_project", "deploy", "login")
 * @param properties - Additional properties to send with the event
 */
export const trackEvent = (
  eventName: string,
  properties: Record<string, any> = {}
): void => {
  sendToPostHog(eventName, properties);
};

/**
 * Track CLI command usage
 * @param command - The command being executed (e.g., "create", "deploy", "dev")
 * @param options - Command options/flags used
 */
export const trackCommand = (
  command: string,
  options: Record<string, any> = {}
): void => {
  sendToPostHog("cli_command", {
    command,
    options,
  });
};

// Export chalk for convenience
export { chalk };
