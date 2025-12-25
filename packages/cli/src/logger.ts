import chalk from "chalk";

// PostHog configuration
const POSTHOG_API_KEY = "phc_EoMHKFbx6j2wUFsf8ywqgHntY4vEXC3ZzLFoPJVjRRT";
const POSTHOG_API_HOST = "https://d18m0xvdtnkibr.cloudfront.net";

// Check if telemetry is disabled
const isTelemetryDisabled = (): boolean => {
  return process.env.LEANMCP_DISABLE_TELEMETRY === "true";
};

// Generate a unique anonymous ID for the CLI user
const getAnonymousId = (): string => {
  // Use a hash of the machine's hostname + username as anonymous ID
  const os = require("os");
  const crypto = require("crypto");
  const identifier = `${os.hostname()}-${os.userInfo().username}`;
  return crypto.createHash("sha256").update(identifier).digest("hex").substring(0, 16);
};

// Send event to PostHog - completely non-blocking, fire-and-forget
const sendToPostHog = (
  eventName: string,
  properties: Record<string, any> = {}
): void => {
  if (isTelemetryDisabled()) {
    return;
  }

  // Use setImmediate to ensure this runs completely asynchronously
  // and never blocks the main CLI execution
  setImmediate(() => {
    try {
      const payload = {
        api_key: POSTHOG_API_KEY,
        event: eventName,
        properties: {
          distinct_id: getAnonymousId(),
          $lib: "leanmcp-cli",
          ...properties,
        },
        timestamp: new Date().toISOString(),
      };

      // Create an AbortController with a 3 second timeout
      // This ensures we don't hang on slow networks
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      fetch(`${POSTHOG_API_HOST}/capture/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
        .then(() => clearTimeout(timeoutId))
        .catch(() => {
          clearTimeout(timeoutId);
          // Silently ignore - no retries, no logging
        });
    } catch {
      // Silently ignore telemetry errors - never throw
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
