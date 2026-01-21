/**
 * leanmcp env command
 * 
 * Manages environment variables for deployed Lambda functions
 */
import ora from 'ora';
import path from 'path';
import fs from 'fs-extra';
import { confirm } from '@inquirer/prompts';
import { getApiKey, getApiUrl } from './login';
import { logger, chalk, debug as loggerDebug } from '../logger';
import {
    parseEnvVar,
    loadEnvFile,
    writeEnvFile,
    parseEnvArgs,
    isReservedKey,
    isSystemKey,
    formatEnvVarsForDisplay,
} from '../utils';

// Debug mode flag
let DEBUG_MODE = false;

export function setEnvDebugMode(enabled: boolean) {
    DEBUG_MODE = enabled;
}

function debug(message: string, ...args: any[]) {
    if (DEBUG_MODE) {
        console.log(chalk.gray(`[DEBUG] ${message}`), ...args);
    }
}

async function debugFetch(url: string, options: RequestInit = {}): Promise<Response> {
    debug(`HTTP ${options.method || 'GET'} ${url}`);
    if (options.body && typeof options.body === 'string') {
        try {
            const body = JSON.parse(options.body);
            debug('Request body:', JSON.stringify(body, null, 2));
        } catch {
            debug('Request body:', options.body);
        }
    }

    const startTime = Date.now();
    const response = await fetch(url, options);
    const duration = Date.now() - startTime;

    debug(`Response: ${response.status} ${response.statusText} (${duration}ms)`);
    return response;
}

// .leanmcp config interface
interface LeanMCPConfig {
    projectId: string;
    projectName: string;
    subdomain: string;
    url: string;
    lastDeployedAt: string;
    buildId?: string;
    deploymentId?: string;
}

const LEANMCP_CONFIG_DIR = '.leanmcp';
const LEANMCP_CONFIG_FILE = 'config.json';

/**
 * Read .leanmcp/config.json if it exists
 */
async function readLeanMCPConfig(projectPath: string): Promise<LeanMCPConfig | null> {
    const configPath = path.join(projectPath, LEANMCP_CONFIG_DIR, LEANMCP_CONFIG_FILE);
    try {
        if (await fs.pathExists(configPath)) {
            const config = await fs.readJSON(configPath);
            debug('Found existing .leanmcp config:', config);
            return config;
        }
    } catch (e) {
        debug('Could not read .leanmcp config:', e);
    }
    return null;
}

/**
 * Config type with guaranteed deploymentId (validated by getDeploymentContext)
 */
interface ValidatedLeanMCPConfig {
    projectId: string;
    projectName: string;
    subdomain: string;
    url: string;
    lastDeployedAt: string;
    buildId?: string;
    deploymentId: string; // Required after validation
}

/**
 * Check authentication and get deployment info
 */
async function getDeploymentContext(folderPath: string): Promise<{
    apiKey: string;
    apiUrl: string;
    config: ValidatedLeanMCPConfig;
} | null> {
    const apiKey = await getApiKey();
    if (!apiKey) {
        logger.error('Not logged in.');
        logger.gray('Run `leanmcp login` first to authenticate.\n');
        return null;
    }

    const apiUrl = await getApiUrl();
    const absolutePath = path.resolve(process.cwd(), folderPath);
    const config = await readLeanMCPConfig(absolutePath);

    if (!config) {
        logger.error('No deployment found.');
        logger.gray(`No .leanmcp/config.json found in ${absolutePath}`);
        logger.gray('Deploy first with: leanmcp deploy .\n');
        return null;
    }

    if (!config.deploymentId) {
        logger.error('Deployment ID not found in config.');
        logger.gray('Please redeploy with: leanmcp deploy .\n');
        return null;
    }

    // Cast to ValidatedLeanMCPConfig since we validated deploymentId exists
    return { apiKey, apiUrl, config: config as ValidatedLeanMCPConfig };
}

interface EnvOptions {
    reveal?: boolean;
    force?: boolean;
    file?: string;
    projectId?: string;
}

/**
 * List environment variables for a deployment
 */
export async function envListCommand(folderPath: string, options: EnvOptions = {}) {
    logger.info('\nLeanMCP Environment Variables\n');

    const context = await getDeploymentContext(folderPath);
    if (!context) {
        process.exit(1);
    }

    const { apiKey, apiUrl, config } = context;
    const spinner = ora('Fetching environment variables...').start();

    try {
        const reveal = options.reveal ? '?reveal=true' : '';
        const response = await debugFetch(
            `${apiUrl}/api/lambda-deploy/${config.deploymentId}/env${reveal}`,
            {
                headers: { 'Authorization': `Bearer ${apiKey}` },
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to fetch env vars: ${error}`);
        }

        const envVars = await response.json();
        spinner.succeed('Environment variables retrieved');

        logger.info(`\nProject: ${config.projectName}`);
        logger.gray(`Deployment: ${config.deploymentId.substring(0, 8)}...`);
        logger.gray(`URL: ${config.url}\n`);

        const formatted = formatEnvVarsForDisplay(envVars, options.reveal);
        logger.log(formatted);
        logger.log('');

        if (!options.reveal) {
            logger.gray('Use --reveal to show actual values\n');
        }
    } catch (error) {
        spinner.fail('Failed to fetch environment variables');
        logger.error(`\n${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
}

/**
 * Set an environment variable
 */
export async function envSetCommand(keyValue: string, folderPath: string, options: EnvOptions = {}) {
    const context = await getDeploymentContext(folderPath);
    if (!context) {
        process.exit(1);
    }

    const { apiKey, apiUrl, config } = context;

    let variables: Record<string, string> = {};

    // Check if loading from file
    if (options.file) {
        const spinner = ora(`Loading from ${options.file}...`).start();
        try {
            variables = await loadEnvFile(options.file);
            spinner.succeed(`Loaded ${Object.keys(variables).length} variable(s) from ${options.file}`);
        } catch (error) {
            spinner.fail(`Failed to load ${options.file}`);
            logger.error(`\n${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
        }
    } else {
        // Parse single KEY=VALUE
        const parsed = parseEnvVar(keyValue);
        if (!parsed) {
            logger.error('Invalid format. Expected: KEY=VALUE');
            logger.gray('Example: leanmcp env set API_KEY=secret123\n');
            process.exit(1);
        }

        // Check for reserved keys
        if (isReservedKey(parsed.key)) {
            logger.error(`Cannot set reserved key: ${parsed.key}`);
            logger.gray('This key is managed by AWS Lambda.\n');
            process.exit(1);
        }

        if (isSystemKey(parsed.key) && !options.force) {
            logger.warn(`Warning: ${parsed.key} is a system key.`);
            const shouldContinue = await confirm({
                message: 'Are you sure you want to modify it?',
                default: false,
            });
            if (!shouldContinue) {
                logger.gray('\nCancelled.\n');
                return;
            }
        }

        variables = { [parsed.key]: parsed.value };
    }

    if (Object.keys(variables).length === 0) {
        logger.warn('No variables to set.\n');
        return;
    }

    const spinner = ora('Updating environment variables...').start();

    try {
        const response = await debugFetch(
            `${apiUrl}/api/lambda-deploy/${config.deploymentId}/env`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ variables }),
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to update env vars: ${error}`);
        }

        const result = await response.json();
        spinner.succeed('Environment variables updated');

        logger.info(`\n${result.message || 'Variables updated successfully'}`);
        logger.gray('Note: Lambda will cold-start on next invocation.\n');
    } catch (error) {
        spinner.fail('Failed to update environment variables');
        logger.error(`\n${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
}

/**
 * Get a specific environment variable
 */
export async function envGetCommand(key: string, folderPath: string, options: EnvOptions = {}) {
    const context = await getDeploymentContext(folderPath);
    if (!context) {
        process.exit(1);
    }

    const { apiKey, apiUrl, config } = context;

    try {
        const reveal = options.reveal ? '?reveal=true' : '';
        const response = await debugFetch(
            `${apiUrl}/api/lambda-deploy/${config.deploymentId}/env${reveal}`,
            {
                headers: { 'Authorization': `Bearer ${apiKey}` },
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to fetch env vars: ${error}`);
        }

        const envVars = await response.json();

        if (key in envVars) {
            const value = envVars[key];
            logger.log(`${key}=${value}`);
        } else {
            logger.warn(`Variable '${key}' not found.`);
            process.exit(1);
        }
    } catch (error) {
        logger.error(`\n${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
}

/**
 * Remove an environment variable
 */
export async function envRemoveCommand(key: string, folderPath: string, options: EnvOptions = {}) {
    const context = await getDeploymentContext(folderPath);
    if (!context) {
        process.exit(1);
    }

    const { apiKey, apiUrl, config } = context;

    // Check for reserved/system keys
    if (isReservedKey(key)) {
        logger.error(`Cannot remove reserved key: ${key}`);
        process.exit(1);
    }

    if (isSystemKey(key)) {
        logger.error(`Cannot remove system key: ${key}`);
        process.exit(1);
    }

    // Confirm unless --force
    if (!options.force) {
        const shouldDelete = await confirm({
            message: `Remove environment variable '${key}'?`,
            default: false,
        });
        if (!shouldDelete) {
            logger.gray('\nCancelled.\n');
            return;
        }
    }

    const spinner = ora(`Removing ${key}...`).start();

    try {
        const response = await debugFetch(
            `${apiUrl}/api/lambda-deploy/${config.deploymentId}/env/${key}`,
            {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${apiKey}` },
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to remove env var: ${error}`);
        }

        spinner.succeed(`Removed ${key}`);
        logger.gray('Note: Lambda will cold-start on next invocation.\n');
    } catch (error) {
        spinner.fail(`Failed to remove ${key}`);
        logger.error(`\n${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
}

/**
 * Pull environment variables to a local file
 */
export async function envPullCommand(folderPath: string, options: EnvOptions = {}) {
    const context = await getDeploymentContext(folderPath);
    if (!context) {
        process.exit(1);
    }

    const { apiKey, apiUrl, config } = context;
    const outputFile = options.file || '.env.remote';

    const spinner = ora('Fetching environment variables...').start();

    try {
        const response = await debugFetch(
            `${apiUrl}/api/lambda-deploy/${config.deploymentId}/env?reveal=true`,
            {
                headers: { 'Authorization': `Bearer ${apiKey}` },
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to fetch env vars: ${error}`);
        }

        const envVars = await response.json();

        // Filter out system keys
        const userVars: Record<string, string> = {};
        for (const [key, value] of Object.entries(envVars)) {
            if (!isSystemKey(key)) {
                userVars[key] = value as string;
            }
        }

        spinner.text = `Writing to ${outputFile}...`;

        await writeEnvFile(outputFile, userVars);

        spinner.succeed(`Saved ${Object.keys(userVars).length} variable(s) to ${outputFile}`);
        logger.gray(`\nSystem variables (PORT, AWS_LWA_*) are not included.\n`);
    } catch (error) {
        spinner.fail('Failed to pull environment variables');
        logger.error(`\n${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
}

/**
 * Push environment variables from a local file
 */
export async function envPushCommand(folderPath: string, options: EnvOptions = {}) {
    const context = await getDeploymentContext(folderPath);
    if (!context) {
        process.exit(1);
    }

    const { apiKey, apiUrl, config } = context;
    const inputFile = options.file || '.env';

    // Load env file
    const loadSpinner = ora(`Loading from ${inputFile}...`).start();
    let variables: Record<string, string>;

    try {
        variables = await loadEnvFile(inputFile);
        loadSpinner.succeed(`Loaded ${Object.keys(variables).length} variable(s) from ${inputFile}`);
    } catch (error) {
        loadSpinner.fail(`Failed to load ${inputFile}`);
        logger.error(`\n${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }

    if (Object.keys(variables).length === 0) {
        logger.warn('No variables found in file.\n');
        return;
    }

    // Confirm replace operation
    logger.warn('\nThis will REPLACE ALL current environment variables.');
    logger.gray('System variables (PORT, AWS_LWA_*) will be preserved.\n');

    if (!options.force) {
        const shouldPush = await confirm({
            message: `Replace all env vars with ${Object.keys(variables).length} variables from ${inputFile}?`,
            default: false,
        });
        if (!shouldPush) {
            logger.gray('\nCancelled.\n');
            return;
        }
    }

    const pushSpinner = ora('Pushing environment variables...').start();

    try {
        const response = await debugFetch(
            `${apiUrl}/api/lambda-deploy/${config.deploymentId}/env`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    variables,
                    replaceAll: true,
                }),
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to push env vars: ${error}`);
        }

        const result = await response.json();
        pushSpinner.succeed('Environment variables pushed');

        logger.info(`\n${result.message || 'Variables updated successfully'}`);
        logger.gray('Note: Lambda will cold-start on next invocation.\n');
    } catch (error) {
        pushSpinner.fail('Failed to push environment variables');
        logger.error(`\n${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
}
