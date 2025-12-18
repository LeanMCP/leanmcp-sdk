/**
 * leanmcp login command
 * 
 * Authenticates with LeanMCP cloud using an API key.
 * Stores the API key in ~/.leanmcp/config.json
 */
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { input, confirm } from '@inquirer/prompts';

// Config directory and file paths
const CONFIG_DIR = path.join(os.homedir(), '.leanmcp');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export interface LeanMCPConfig {
  apiKey?: string;
  apiUrl?: string;
  lastUpdated?: string;
}

/**
 * Get the config directory path
 */
export function getConfigDir(): string {
  return CONFIG_DIR;
}

/**
 * Get the config file path
 */
export function getConfigFile(): string {
  return CONFIG_FILE;
}

/**
 * Load existing config
 */
export async function loadConfig(): Promise<LeanMCPConfig> {
  try {
    if (await fs.pathExists(CONFIG_FILE)) {
      return await fs.readJSON(CONFIG_FILE);
    }
  } catch (error) {
    // Ignore errors, return empty config
  }
  return {};
}

/**
 * Save config to file
 */
export async function saveConfig(config: LeanMCPConfig): Promise<void> {
  await fs.ensureDir(CONFIG_DIR);
  await fs.writeJSON(CONFIG_FILE, config, { spaces: 2 });
}

/**
 * Get API key from config
 */
export async function getApiKey(): Promise<string | null> {
  const config = await loadConfig();
  return config.apiKey || null;
}

// Allowed API URLs
const ALLOWED_API_URLS = [
  'https://api.leanmcp.com',
  'https://devapi.leanmcp.com',
  'https://qaapi.leanmcp.com',
  'http://localhost:3001',
];

const DEFAULT_API_URL = 'https://api.leanmcp.com';

/**
 * Validate that API URL is one of the allowed values
 */
function isValidApiUrl(url: string): boolean {
  return ALLOWED_API_URLS.includes(url);
}

/**
 * Get API URL from config (with default)
 * Throws error if configured URL is not in the allowed list
 */
export async function getApiUrl(): Promise<string> {
  const config = await loadConfig();
  
  if (!config.apiUrl) {
    return DEFAULT_API_URL;
  }
  
  if (!isValidApiUrl(config.apiUrl)) {
    throw new Error(
      `Invalid API URL: ${config.apiUrl}\n` +
      `Allowed URLs:\n` +
      `  - https://api.leanmcp.com\n` +
      `  - https://devapi.leanmcp.com\n` +
      `  - https://qaapi.leanmcp.com\n` +
      `  - http://localhost:3001`
    );
  }
  
  return config.apiUrl;
}

/**
 * Login command implementation
 */
export async function loginCommand() {
  console.log(chalk.cyan('\n🔐 LeanMCP Login\n'));

  // Check if already logged in
  const existingConfig = await loadConfig();
  if (existingConfig.apiKey) {
    console.log(chalk.yellow('You are already logged in.'));
    
    const shouldRelogin = await confirm({
      message: 'Do you want to replace the existing API key?',
      default: false,
    });

    if (!shouldRelogin) {
      console.log(chalk.gray('\nLogin cancelled. Existing API key preserved.'));
      return;
    }
  }

  // Show instructions
  console.log(chalk.white('To authenticate, you need an API key from LeanMCP.\n'));
  console.log(chalk.cyan('Steps:'));
  console.log(chalk.gray('  1. Go to: ') + chalk.blue.underline('https://ship.leanmcp.com/api-keys'));
  console.log(chalk.gray('  2. Create a new API key with "BUILD_AND_DEPLOY" scope'));
  console.log(chalk.gray('  3. Copy the API key and paste it below\n'));

  // Prompt for API key
  const apiKey = await input({
    message: 'Enter your API key:',
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return 'API key is required';
      }
      if (!value.startsWith('airtrain_')) {
        return 'Invalid API key format. API key should start with "airtrain_"';
      }
      return true;
    },
  });

  // Validate API key
  const spinner = ora('Validating API key...').start();

  try {
    const apiUrl = await getApiUrl();
    const response = await fetch(`${apiUrl}/api-keys/validate`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      spinner.fail('Invalid API key');
      console.error(chalk.red('\nThe API key is invalid or has expired.'));
      console.log(chalk.gray('Please check your API key and try again.'));
      process.exit(1);
    }

    // Save config
    await saveConfig({
      apiKey: apiKey.trim(),
      apiUrl: apiUrl,
      lastUpdated: new Date().toISOString(),
    });

    spinner.succeed('API key validated and saved');

    console.log(chalk.green('\n✅ Login successful!'));
    console.log(chalk.gray(`   Config saved to: ${CONFIG_FILE}\n`));
    console.log(chalk.cyan('You can now use:'));
    console.log(chalk.gray('  leanmcp deploy <folder>   - Deploy your MCP server'));
    console.log(chalk.gray('  leanmcp logout            - Remove your API key'));

  } catch (error) {
    spinner.fail('Failed to validate API key');
    
    if (error instanceof Error && error.message.includes('fetch')) {
      console.error(chalk.red('\nCould not connect to LeanMCP servers.'));
      console.log(chalk.gray('Please check your internet connection and try again.'));
    } else {
      console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : String(error)}`));
    }
    process.exit(1);
  }
}

/**
 * Logout command implementation
 */
export async function logoutCommand() {
  console.log(chalk.cyan('\n🔓 LeanMCP Logout\n'));

  const config = await loadConfig();
  
  if (!config.apiKey) {
    console.log(chalk.yellow('You are not currently logged in.'));
    return;
  }

  const shouldLogout = await confirm({
    message: 'Are you sure you want to logout and remove your API key?',
    default: false,
  });

  if (!shouldLogout) {
    console.log(chalk.gray('\nLogout cancelled.'));
    return;
  }

  // Remove API key from config
  await saveConfig({
    ...config,
    apiKey: undefined,
    lastUpdated: new Date().toISOString(),
  });

  console.log(chalk.green('\n✅ Logged out successfully!'));
  console.log(chalk.gray(`   API key removed from: ${CONFIG_FILE}`));
}

/**
 * Whoami command - show current login status
 */
export async function whoamiCommand() {
  const config = await loadConfig();
  
  if (!config.apiKey) {
    console.log(chalk.yellow('\nYou are not logged in.'));
    console.log(chalk.gray('Run `leanmcp login` to authenticate.\n'));
    return;
  }

  console.log(chalk.cyan('\n🔐 LeanMCP Authentication Status\n'));
  console.log(chalk.green('✓ Logged in'));
  console.log(chalk.gray(`  API Key: ${config.apiKey.substring(0, 15)}...`));
  console.log(chalk.gray(`  API URL: ${config.apiUrl || 'https://ship.leanmcp.com'}`));
  if (config.lastUpdated) {
    console.log(chalk.gray(`  Last updated: ${new Date(config.lastUpdated).toLocaleString()}`));
  }
  console.log();
}
