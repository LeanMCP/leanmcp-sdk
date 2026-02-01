/**
 * leanmcp send-feedback command
 *
 * Sends feedback to the LeanMCP API with support for authenticated and anonymous feedback.
 * Supports multi-line messages and optional log file attachments.
 */
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { getApiKey, getApiUrl } from './login';
import { logger, chalk, debug as loggerDebug } from '../logger';

// Debug mode flag
let DEBUG_MODE = false;

export function setFeedbackDebugMode(enabled: boolean) {
  DEBUG_MODE = enabled;
}

function debug(message: string, ...args: any[]) {
  if (DEBUG_MODE) {
    console.log(chalk.gray(`[DEBUG] ${message}`), ...args);
  }
}

interface FeedbackAttachment {
  name: string;
  content: string;
  size: number;
  type: string;
}

/**
 * Read and encode a file as base64
 */
async function readFileAsBase64(
  filePath: string
): Promise<{ content: string; size: number; type: string }> {
  try {
    const absolutePath = path.resolve(filePath);
    const stats = await fs.stat(absolutePath);

    if (!stats.isFile()) {
      throw new Error(`${filePath} is not a file`);
    }

    const content = await fs.readFile(absolutePath, 'base64');
    const ext = path.extname(absolutePath).toLowerCase();

    // Simple MIME type detection
    let mimeType = 'application/octet-stream';
    switch (ext) {
      case '.txt':
      case '.log':
        mimeType = 'text/plain';
        break;
      case '.json':
        mimeType = 'application/json';
        break;
      case '.js':
        mimeType = 'application/javascript';
        break;
      case '.ts':
        mimeType = 'application/typescript';
        break;
      case '.md':
        mimeType = 'text/markdown';
        break;
    }

    return {
      content,
      size: stats.size,
      type: mimeType,
    };
  } catch (error) {
    throw new Error(
      `Failed to read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Collect log files from various locations
 */
async function collectLogFiles(): Promise<FeedbackAttachment[]> {
  const attachments: FeedbackAttachment[] = [];
  const logLocations = [
    path.join(os.homedir(), '.leanmcp', 'logs'),
    path.join(process.cwd(), 'logs'),
    path.join(process.cwd(), '.leanmcp', 'logs'),
  ];

  for (const logDir of logLocations) {
    try {
      if (await fs.pathExists(logDir)) {
        const files = await fs.readdir(logDir);

        // Filter for .log files and get stats
        const logFiles = [];
        for (const file of files) {
          if (!file.endsWith('.log')) continue;

          try {
            const filePath = path.join(logDir, file);
            const stats = await fs.stat(filePath);
            logFiles.push({ file, filePath, mtime: stats.mtimeMs });
          } catch (e) {
            // Ignore stat errors
          }
        }

        // Sort by modification time (newest first) and take top 3
        const recentLogs = logFiles
          .sort((a, b) => b.mtime - a.mtime)
          .slice(0, 3);

        for (const log of recentLogs) {
          try {
            const fileData = await readFileAsBase64(log.filePath);

            // Check if we already have this file (avoid duplicates from multiple paths)
            if (!attachments.some(a => a.name === log.file)) {
              attachments.push({
                name: log.file,
                ...fileData,
              });
            }
          } catch (error) {
            debug(`Failed to read log file ${log.filePath}: ${error}`);
          }
        }
      }
    } catch (error) {
      debug(`Failed to scan log directory ${logDir}: ${error}`);
    }
  }

  // Also try to collect npm debug log if it exists
  const npmDebugLog = path.join(os.homedir(), '.npm', '_logs');
  try {
    if (await fs.pathExists(npmDebugLog)) {
      const logFiles = await fs.readdir(npmDebugLog);
      const latestLog = logFiles
        .filter((file) => file.endsWith('.log'))
        .sort()
        .pop(); // Get the latest log file

      if (latestLog) {
        const filePath = path.join(npmDebugLog, latestLog);
        try {
          const fileData = await readFileAsBase64(filePath);
          attachments.push({
            name: `npm-${latestLog}`,
            ...fileData,
          });
        } catch (error) {
          debug(`Failed to read npm debug log: ${error}`);
        }
      }
    }
  } catch (error) {
    debug(`Failed to collect npm debug logs: ${error}`);
  }

  return attachments;
}

/**
 * Send feedback to the API
 */
async function sendFeedbackToApi(
  message: string,
  attachments: FeedbackAttachment[] = [],
  isAnonymous = false
): Promise<any> {
  const apiUrl = await getApiUrl();
  const endpoint = isAnonymous ? '/feedback/anonymous' : '/feedback';
  const url = `${apiUrl}${endpoint}`;

  debug('API URL:', apiUrl);
  debug('Endpoint:', endpoint);
  debug('Message length:', message.length);
  debug('Attachments count:', attachments.length);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add authorization for non-anonymous feedback
  if (!isAnonymous) {
    const apiKey = await getApiKey();
    if (!apiKey) {
      throw new Error('Not authenticated. Please run `leanmcp login` first.');
    }
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const payload = {
    message,
    attachments: attachments.map((att) => ({
      name: att.name,
      content: att.content,
      size: att.size,
      type: att.type,
    })),
  };

  debug('Sending feedback request...');

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  debug('Response status:', response.status);
  debug('Response ok:', response.ok);

  if (!response.ok) {
    const errorText = await response.text();
    debug('Error response:', errorText);

    if (response.status === 401) {
      throw new Error('Authentication failed. Please run `leanmcp login` to re-authenticate.');
    } else if (response.status === 413) {
      throw new Error('Attachments too large. Please try again without log files.');
    } else {
      throw new Error(`Failed to send feedback: ${response.status} ${response.statusText}`);
    }
  }

  return await response.json();
}

/**
 * Main feedback command implementation
 */
export async function sendFeedbackCommand(
  message: string | undefined,
  options: { anon?: boolean; includeLogs?: boolean }
): Promise<void> {
  logger.info('\nLeanMCP Feedback\n');

  const isAnonymous = options.anon || false;
  const includeLogs = options.includeLogs || false;

  debug('Feedback options:', { isAnonymous, includeLogs });

  // 1. Get feedback message (handle piped input or argument)
  let feedbackMessage = message;

  // Handle piped input if message is not provided
  if (!feedbackMessage && !process.stdin.isTTY) {
    debug('Reading feedback message from stdin...');
    feedbackMessage = await new Promise<string>((resolve) => {
      let data = '';
      process.stdin.on('data', (chunk) => {
        data += chunk;
      });
      process.stdin.on('end', () => {
        resolve(data.trim());
      });
    });
  }

  // Validate message
  if (!feedbackMessage || feedbackMessage.trim().length === 0) {
    logger.error('Feedback message cannot be empty.');
    logger.info('Usage examples:');
    logger.info('  leanmcp send-feedback "Your message"');
    logger.gray('  leanmcp send-feedback << EOF');
    logger.gray('    multi-line');
    logger.gray('    message');
    logger.gray('  EOF');
    logger.info('  leanmcp send-feedback --anon "Anonymous feedback"');
    logger.info('  leanmcp send-feedback "Issue with deploy" --include-logs');
    process.exit(1);
  }

  if (feedbackMessage.length > 5000) {
    logger.error('Feedback message is too long (max 5000 characters).');
    process.exit(1);
  }

  // 2. Check authentication for non-anonymous feedback
  if (!isAnonymous) {
    const apiKey = await getApiKey();
    if (!apiKey) {
      logger.error('need to login');
      logger.info(
        'Please run `leanmcp login` to authenticate, or use `--anon` for anonymous feedback.'
      );
      process.exit(1);
    }
  }

  let attachments: FeedbackAttachment[] = [];

  // 3. Collect log files if requested
  if (includeLogs) {
    const spinner = ora('Collecting log files...').start();

    try {
      attachments = await collectLogFiles();
      spinner.succeed(`Collected ${attachments.length} log file(s)`);

      if (attachments.length > 0) {
        logger.log('Log files:', chalk.gray);
        attachments.forEach((att) => {
          logger.log(`  - ${att.name} (${(att.size / 1024).toFixed(1)} KB)`, chalk.gray);
        });
        logger.log('');
      } else {
        logger.log('No log files found.', chalk.gray);
        logger.log('');
      }
    } catch (error) {
      spinner.fail('Failed to collect log files');
      debug('Log collection error:', error);
      logger.warn('Continuing without log files...');
    }
  }

  // 4. Send feedback
  const spinner = ora('Sending feedback...').start();

  try {
    const result = await sendFeedbackToApi(feedbackMessage, attachments, isAnonymous);
    spinner.succeed('Feedback sent successfully!');

    logger.success('\nThank you for your feedback!');
    logger.log(`Feedback ID: ${result.id}`, chalk.gray);

    if (isAnonymous) {
      logger.log('Type: Anonymous', chalk.gray);
    } else {
      logger.log('Type: Authenticated', chalk.gray);
    }

    if (attachments.length > 0) {
      logger.log(`Attachments: ${attachments.length}`, chalk.gray);
    }

    logger.log('\nWe appreciate your input and will review it soon.', chalk.cyan);
  } catch (error) {
    spinner.fail('Failed to send feedback');

    if (error instanceof Error) {
      logger.error(`\n${error.message}`);
    } else {
      logger.error('\nAn unknown error occurred.');
    }

    if (DEBUG_MODE) {
      debug('Full error:', error);
    }

    process.exit(1);
  }
}
