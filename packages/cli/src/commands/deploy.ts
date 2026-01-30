/**
 * leanmcp deploy command
 *
 * Deploys an MCP server to LeanMCP cloud using the stored API key.
 */
import ora from 'ora';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import archiver from 'archiver';
import { input, confirm, select } from '@inquirer/prompts';
import { getApiKey, getApiUrl } from './login';
import { generateProjectName } from '../utils';
import { logger, chalk, debug as loggerDebug } from '../logger';

// Debug mode flag
let DEBUG_MODE = false;

export function setDeployDebugMode(enabled: boolean) {
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

/**
 * Retry wrapper for fetch operations with exponential backoff
 * Shows in-place retry counter updates without filling the terminal
 *
 * @param fetchFn - Function that performs the fetch operation
 * @param options - Configuration options
 * @param options.maxRetries - Maximum number of retry attempts after initial failure (default: 15). Total attempts = maxRetries + 1
 * @param options.initialDelay - Initial delay in ms before first retry (default: 1000)
 * @param options.maxDelay - Maximum delay in ms between retries (default: 10000)
 * @param options.operation - Name of the operation for display purposes (default: 'Fetch')
 * @param options.spinner - Optional ora spinner instance for UI updates
 * @param options.retryOnHttpErrors - Whether to retry on HTTP 5xx server errors. Default: false
 *
 * @throws Error if all retry attempts are exhausted
 *
 * @remarks
 * - Only retries on network errors by default (connection failures, timeouts, etc.)
 * - Set retryOnHttpErrors=true to also retry HTTP 5xx server errors (not 4xx client errors)
 * - Uses exponential backoff: 1s, 2s, 4s, 8s, 10s (max), 10s, ...
 * - With maxRetries=15: 1 initial attempt + 15 retries = 16 total attempts
 */
async function fetchWithRetry(
  fetchFn: () => Promise<Response>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    operation?: string;
    spinner?: ReturnType<typeof ora>;
    retryOnHttpErrors?: boolean;
  } = {}
): Promise<Response> {
  const maxRetries = options.maxRetries ?? 15;
  const initialDelay = options.initialDelay ?? 1000;
  const maxDelay = options.maxDelay ?? 10000;
  const operation = options.operation ?? 'Fetch';
  const spinner = options.spinner;
  const retryOnHttpErrors = options.retryOnHttpErrors ?? false;

  let lastError: Error | null = null;

  // Initial attempt (0) + retries (1 to maxRetries)
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchFn();

      // Check if we should retry on HTTP errors
      if (retryOnHttpErrors && !response.ok && response.status >= 500) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        // Calculate delay with exponential backoff
        const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);

        // Show retry message - either via spinner or stdout
        const message = `${operation} failed. Retrying... (${attempt + 1}/${maxRetries})`;
        if (spinner) {
          spinner.text = message;
        } else {
          process.stdout.write('\r' + chalk.yellow(message));
        }

        debug(`Retry ${attempt + 1}/${maxRetries}: ${lastError.message}, waiting ${delay}ms`);

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // Clear the retry message if not using spinner
  if (!spinner) {
    process.stdout.write('\x1b[2K\r'); // ANSI escape to clear entire line
  }

  throw new Error(
    `${operation} failed after ${maxRetries + 1} attempts (1 initial + ${maxRetries} retries): ${lastError?.message || 'Unknown error'}`
  );
}

// API endpoints (relative to base URL)
const API_ENDPOINTS = {
  // Projects
  projects: '/api/projects',
  getUploadUrl: '/api/projects',
  // Lambda builds
  triggerBuild: '/api/lambda-builds/trigger',
  getBuild: '/api/lambda-builds',
  // Lambda deployments
  createDeployment: '/api/lambda-deploy',
  getDeployment: '/api/lambda-deploy',
  // Lambda mapping
  checkSubdomain: '/api/lambda-mapping/check',
  createMapping: '/api/lambda-mapping',
};

interface DeployOptions {
  subdomain?: string;
  skipConfirm?: boolean;
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
 * Write .leanmcp/config.json
 */
async function writeLeanMCPConfig(projectPath: string, config: LeanMCPConfig): Promise<void> {
  const configDir = path.join(projectPath, LEANMCP_CONFIG_DIR);
  const configPath = path.join(configDir, LEANMCP_CONFIG_FILE);

  await fs.ensureDir(configDir);
  await fs.writeJSON(configPath, config, { spaces: 2 });
  debug('Saved .leanmcp config:', config);
}

/**
 * Create a zip archive of the project folder
 */
async function createZipArchive(folderPath: string, outputPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve(archive.pointer()));
    archive.on('error', reject);

    archive.pipe(output);

    // Add all files except node_modules, .git, dist, etc.
    archive.glob('**/*', {
      cwd: folderPath,
      ignore: [
        'node_modules/**',
        '.git/**',
        '.leanmcp/**',
        'dist/**',
        '.next/**',
        '.nuxt/**',
        '__pycache__/**',
        '*.log',
        '.env.local',
        '.DS_Store',
      ],
    });

    archive.finalize();
  });
}

/**
 * Custom error for build failures with structured data
 */
class BuildError extends Error {
  constructor(
    message: string,
    public buildId: string,
    public errorSummary?: string,
    public errorDetails?: string[]
  ) {
    super(message);
    this.name = 'BuildError';
  }
}

/**
 * Poll for build completion
 */
async function waitForBuild(
  apiUrl: string,
  apiKey: string,
  buildId: string,
  spinner: ReturnType<typeof ora>
): Promise<{ imageUri: string; status: string }> {
  const maxAttempts = 60; // 5 minutes max
  let attempts = 0;

  while (attempts < maxAttempts) {
    const response = await fetchWithRetry(
      () =>
        debugFetch(`${apiUrl}${API_ENDPOINTS.getBuild}/${buildId}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        }),
      { operation: 'Build status check', spinner, maxRetries: 3 }
    );

    if (!response.ok) {
      throw new Error(`Failed to get build status: ${response.statusText}`);
    }

    const build = await response.json();
    spinner.text = `Building... (${build.status || 'pending'})`;

    if (build.status === 'succeeded' || build.status === 'SUCCEEDED') {
      return { imageUri: build.imageUri, status: 'succeeded' };
    }

    if (build.status === 'failed' || build.status === 'FAILED') {
      throw new BuildError(
        build.errorSummary || build.errorMessage || 'Unknown error',
        buildId,
        build.errorSummary,
        build.errorDetails
      );
    }

    await new Promise((r) => setTimeout(r, 5000)); // Wait 5 seconds
    attempts++;
  }

  throw new Error('Build timed out after 5 minutes');
}

/**
 * Poll for deployment completion
 */
async function waitForDeployment(
  apiUrl: string,
  apiKey: string,
  deploymentId: string,
  spinner: ReturnType<typeof ora>
): Promise<{ functionUrl: string; status: string }> {
  const maxAttempts = 60; // 5 minutes max
  let attempts = 0;

  while (attempts < maxAttempts) {
    const response = await fetchWithRetry(
      () =>
        debugFetch(`${apiUrl}${API_ENDPOINTS.getDeployment}/${deploymentId}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        }),
      { operation: 'Deployment status check', spinner, maxRetries: 3 }
    );

    if (!response.ok) {
      throw new Error(`Failed to get deployment status: ${response.statusText}`);
    }

    const deployment = await response.json();
    spinner.text = `Deploying... (${deployment.status || 'pending'})`;

    if (deployment.status === 'RUNNING') {
      return { functionUrl: deployment.functionUrl, status: 'running' };
    }

    if (deployment.status === 'FAILED') {
      throw new Error(`Deployment failed: ${deployment.errorMessage || 'Unknown error'}`);
    }

    await new Promise((r) => setTimeout(r, 5000)); // Wait 5 seconds
    attempts++;
  }

  throw new Error('Deployment timed out after 5 minutes');
}

/**
 * Deploy command implementation
 */
export async function deployCommand(folderPath: string, options: DeployOptions = {}) {
  const deployStartTime = Date.now();

  logger.info('\nLeanMCP Deploy\n');

  debug('Starting deployment...');

  // Check authentication
  const apiKey = await getApiKey();
  if (!apiKey) {
    logger.error('Not logged in.');
    logger.gray('Run `leanmcp login` first to authenticate.\n');
    process.exit(1);
  }

  const apiUrl = await getApiUrl();
  debug('API URL:', apiUrl);

  // Resolve folder path
  const absolutePath = path.resolve(process.cwd(), folderPath);

  // Validate folder exists
  if (!(await fs.pathExists(absolutePath))) {
    logger.error(`Folder not found: ${absolutePath}`);
    process.exit(1);
  }

  // Check if it's a valid LeanMCP project (Node.js or Python)
  const hasMainTs = await fs.pathExists(path.join(absolutePath, 'main.ts'));
  const hasPackageJson = await fs.pathExists(path.join(absolutePath, 'package.json'));
  const hasMainPy = await fs.pathExists(path.join(absolutePath, 'main.py'));
  const hasRequirementsTxt = await fs.pathExists(path.join(absolutePath, 'requirements.txt'));
  const hasPyprojectToml = await fs.pathExists(path.join(absolutePath, 'pyproject.toml'));

  const isNodeProject = hasMainTs || hasPackageJson;
  const isPythonProject = hasMainPy || hasRequirementsTxt || hasPyprojectToml;

  if (!isNodeProject && !isPythonProject) {
    logger.error('Not a valid project folder.');
    logger.gray(
      'Expected one of: main.ts, package.json, main.py, requirements.txt, or pyproject.toml\n'
    );
    process.exit(1);
  }

  // Check for existing .leanmcp config first
  const existingConfig = await readLeanMCPConfig(absolutePath);

  // Get project name - check if we should use existing or create new
  let projectName: string;
  let existingProject: { id: string; name: string; s3Location?: string } | null = null;
  let isUpdate = false;
  let subdomain = options.subdomain;

  if (existingConfig) {
    // Found existing config - this is a redeployment
    logger.info(`Found existing deployment config for '${existingConfig.projectName}'`);
    logger.gray(`  Project ID: ${existingConfig.projectId}`);
    logger.gray(`  URL: ${existingConfig.url}`);
    logger.gray(`  Last deployed: ${existingConfig.lastDeployedAt}\n`);

    const choice = await select({
      message: 'What would you like to do?',
      choices: [
        { value: 'update', name: `Update existing deployment '${existingConfig.projectName}'` },
        { value: 'new', name: 'Create a new project with a random name' },
        { value: 'cancel', name: 'Cancel deployment' },
      ],
    });

    if (choice === 'cancel') {
      logger.gray('\nDeployment cancelled.\n');
      return;
    }

    if (choice === 'update') {
      existingProject = { id: existingConfig.projectId, name: existingConfig.projectName };
      projectName = existingConfig.projectName;
      subdomain = existingConfig.subdomain;
      isUpdate = true;
      logger.warn('\nUpdating existing deployment...');
      logger.gray('The previous version will be replaced.\n');
    } else {
      // Generate new random name
      projectName = generateProjectName();
      logger.info(`\nGenerated project name: ${chalk.bold(projectName)}\n`);
    }
  } else {
    // No existing config - check for existing projects on server
    debug('Fetching existing projects...');
    let existingProjects: Array<{ id: string; name: string; s3Location?: string }> = [];
    try {
      const projectsResponse = await debugFetch(`${apiUrl}${API_ENDPOINTS.projects}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (projectsResponse.ok) {
        existingProjects = await projectsResponse.json();
        debug(`Found ${existingProjects.length} existing projects`);
      }
    } catch (e) {
      debug('Could not fetch existing projects');
    }

    // Check folder/package name first
    let folderName = path.basename(absolutePath);
    if (hasPackageJson) {
      try {
        const pkg = await fs.readJSON(path.join(absolutePath, 'package.json'));
        folderName = pkg.name || folderName;
      } catch (e) {
        // Use folder name
      }
    }

    // Check if a project with the folder name exists
    const matchingProject = existingProjects.find((p) => p.name === folderName);

    if (matchingProject) {
      logger.warn(`Project '${folderName}' already exists.\n`);

      const choice = await select({
        message: 'What would you like to do?',
        choices: [
          { value: 'update', name: `Update existing project '${folderName}'` },
          { value: 'new', name: 'Create a new project with a random name' },
          { value: 'cancel', name: 'Cancel deployment' },
        ],
      });

      if (choice === 'cancel') {
        logger.gray('\nDeployment cancelled.\n');
        return;
      }

      if (choice === 'update') {
        existingProject = matchingProject;
        projectName = matchingProject.name;
        isUpdate = true;
        logger.warn('\nWARNING: This will replace the existing deployment.');
        logger.gray('The previous version will be overwritten.\n');
      } else {
        // Generate new random name
        projectName = generateProjectName();
        logger.info(`\nGenerated project name: ${chalk.bold(projectName)}\n`);
      }
    } else {
      // No existing project - generate a new random name
      projectName = generateProjectName();
      logger.info(`Generated project name: ${chalk.bold(projectName)}`);
    }
  }

  logger.gray(`Path: ${absolutePath}\n`);

  // Get or prompt for subdomain (if not already set from config)
  if (!subdomain) {
    // Suggest subdomain from project name
    const suggestedSubdomain = projectName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    subdomain = await input({
      message: 'Subdomain for your deployment:',
      default: suggestedSubdomain,
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Subdomain is required';
        }
        if (!/^[a-z0-9-]+$/.test(value)) {
          return 'Subdomain can only contain lowercase letters, numbers, and hyphens';
        }
        if (value.length < 3) {
          return 'Subdomain must be at least 3 characters';
        }
        return true;
      },
    });
  }

  // Check subdomain availability
  const checkSpinner = ora('Checking subdomain availability...').start();
  try {
    debug('Checking subdomain:', subdomain);
    const checkResponse = await debugFetch(
      `${apiUrl}${API_ENDPOINTS.checkSubdomain}/${subdomain}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    );

    if (checkResponse.ok) {
      const result = await checkResponse.json();
      debug('Subdomain check result:', result);

      if (!result.available) {
        // Subdomain is taken - check ownership
        const ourProjectId = isUpdate && existingProject ? existingProject.id : null;

        if (ourProjectId && result.ownedByProject === ourProjectId) {
          // It's our subdomain from the same project - proceed with update
          checkSpinner.succeed(`Subdomain '${subdomain}' is yours - will update existing mapping`);
        } else if (result.ownedByCurrentUser) {
          // User owns it but for a different project
          checkSpinner.fail(`Subdomain '${subdomain}' is used by your other project`);
          logger.gray(
            `\nThis subdomain is associated with project: ${result.ownedByProject?.substring(0, 8)}...`
          );
          logger.gray('Please choose a different subdomain or update that project instead.\n');
          process.exit(1);
        } else {
          // Someone else owns it
          checkSpinner.fail(`Subdomain '${subdomain}' is not available`);
          logger.gray(
            '\nThis subdomain is taken by another user. Please choose a different subdomain.\n'
          );
          process.exit(1);
        }
      } else {
        checkSpinner.succeed(`Subdomain '${subdomain}' is available`);
      }
    }
  } catch (error) {
    checkSpinner.warn('Could not verify subdomain availability');
  }

  // Confirm deployment
  if (!options.skipConfirm) {
    logger.info('\nDeployment Details:');
    logger.gray(`  Project: ${projectName}`);
    logger.gray(`  Subdomain: ${subdomain}`);
    logger.gray(`  URL: https://${subdomain}.leanmcp.app\n`);

    const shouldDeploy = await confirm({
      message: 'Proceed with deployment?',
      default: true,
    });

    if (!shouldDeploy) {
      logger.gray('\nDeployment cancelled.\n');
      return;
    }
  }

  logger.log('');

  // Step 1: Create or use existing project
  let projectId: string;

  if (isUpdate && existingProject) {
    // Use existing project
    projectId = existingProject.id;
    logger.gray(`Using existing project: ${projectId.substring(0, 8)}...`);
  } else {
    // Create new project
    const projectSpinner = ora('Creating project...').start();
    try {
      debug('Step 1: Creating project:', projectName);
      const createResponse = await debugFetch(`${apiUrl}${API_ENDPOINTS.projects}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: projectName }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.text();
        throw new Error(`Failed to create project: ${error}`);
      }

      const project = await createResponse.json();
      projectId = project.id;
      projectSpinner.succeed(`Project created: ${projectId.substring(0, 8)}...`);
    } catch (error) {
      projectSpinner.fail('Failed to create project');
      logger.error(`\n${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  // Step 2: Create zip and upload
  const uploadSpinner = ora('Packaging and uploading...').start();
  try {
    // Create temp zip file
    const tempZip = path.join(os.tmpdir(), `leanmcp-${Date.now()}.zip`);
    const zipSize = await createZipArchive(absolutePath, tempZip);
    uploadSpinner.text = `Packaging... (${Math.round(zipSize / 1024)}KB)`;

    // Get presigned URL
    debug('Step 2a: Getting upload URL for project:', projectId);
    const uploadUrlResponse = await debugFetch(
      `${apiUrl}${API_ENDPOINTS.projects}/${projectId}/upload-url`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: `${subdomain}.zip`,
          fileType: 'application/zip',
          fileSize: zipSize,
        }),
      }
    );

    if (!uploadUrlResponse.ok) {
      throw new Error('Failed to get upload URL');
    }

    const uploadResult = await uploadUrlResponse.json();
    const uploadUrl = uploadResult.url || uploadResult.uploadUrl;
    const s3Location = uploadResult.s3Location;

    debug('Upload URL response:', JSON.stringify(uploadResult));

    if (!uploadUrl) {
      throw new Error('Backend did not return upload URL');
    }

    // Upload to S3
    debug('Step 2b: Uploading to S3...');
    const zipBuffer = await fs.readFile(tempZip);
    const s3Response = await fetch(uploadUrl, {
      method: 'PUT',
      body: zipBuffer,
      headers: { 'Content-Type': 'application/zip' },
    });
    debug('S3 upload response:', s3Response.status);

    if (!s3Response.ok) {
      throw new Error('Failed to upload to S3');
    }

    // Update project with S3 location
    debug('Step 2c: Updating project with S3 location:', s3Location);
    await debugFetch(`${apiUrl}${API_ENDPOINTS.projects}/${projectId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ s3Location }),
    });

    // Cleanup temp file
    await fs.remove(tempZip);

    uploadSpinner.succeed('Project uploaded');
  } catch (error) {
    uploadSpinner.fail('Failed to upload');
    logger.error(`\n${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  // Step 3: Trigger build
  const buildSpinner = ora('Building...').start();
  const buildStartTime = Date.now();
  let buildId: string;
  let imageUri: string;
  try {
    debug('Step 3: Triggering build for project:', projectId);
    const buildResponse = await debugFetch(`${apiUrl}${API_ENDPOINTS.triggerBuild}/${projectId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!buildResponse.ok) {
      const error = await buildResponse.text();
      throw new Error(`Failed to trigger build: ${error}`);
    }

    const build = await buildResponse.json();
    buildId = build.id;

    // Wait for build to complete
    const buildResult = await waitForBuild(apiUrl, apiKey, buildId, buildSpinner);
    imageUri = buildResult.imageUri;

    const buildDuration = Math.round((Date.now() - buildStartTime) / 1000);
    buildSpinner.succeed(`Build complete (${buildDuration}s)`);
  } catch (error) {
    buildSpinner.fail('Build failed');

    // Display structured build errors if available
    if (error instanceof BuildError && error.errorDetails?.length) {
      logger.error(`\n${error.errorSummary || 'Build failed'}\n`);
      error.errorDetails.forEach((err) => logger.gray(`  ${err}`));
      // logger.gray(`\nFull logs: https://ship.leanmcp.com/builds/${error.buildId}`);
    } else {
      logger.error(`\n${error instanceof Error ? error.message : String(error)}`);
    }
    process.exit(1);
  }

  // Step 4: Deploy to LeanMCP
  const deploySpinner = ora('Deploying to LeanMCP...').start();
  let deploymentId: string;
  let functionUrl: string;
  try {
    debug('Step 4: Creating deployment for build:', buildId);
    const deployResponse = await debugFetch(`${apiUrl}${API_ENDPOINTS.createDeployment}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ buildId }),
    });

    if (!deployResponse.ok) {
      const error = await deployResponse.text();
      throw new Error(`Failed to create deployment: ${error}`);
    }

    const deployment = await deployResponse.json();
    deploymentId = deployment.id;

    // Wait for deployment to complete
    const deployResult = await waitForDeployment(apiUrl, apiKey, deploymentId, deploySpinner);
    functionUrl = deployResult.functionUrl;

    deploySpinner.succeed('Deployed');
  } catch (error) {
    deploySpinner.fail('Deployment failed');
    logger.error(`\n${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  // Step 5: Create subdomain mapping
  const mappingSpinner = ora('Configuring subdomain...').start();
  try {
    debug('Step 5: Creating subdomain mapping:', subdomain);
    const mappingResponse = await debugFetch(`${apiUrl}${API_ENDPOINTS.createMapping}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subdomain,
        lambdaUrl: functionUrl,
        projectId,
        deploymentId,
      }),
    });

    if (!mappingResponse.ok) {
      mappingSpinner.warn('Subdomain mapping may need manual setup');
    } else {
      mappingSpinner.succeed('Subdomain configured');
    }
  } catch (error) {
    mappingSpinner.warn('Subdomain mapping may need manual setup');
  }

  // Save .leanmcp config for future deployments
  const deploymentUrl = `https://${subdomain}.leanmcp.app`;
  try {
    await writeLeanMCPConfig(absolutePath, {
      projectId,
      projectName,
      subdomain,
      url: deploymentUrl,
      lastDeployedAt: new Date().toISOString(),
      buildId,
      deploymentId,
    });
    debug('Saved .leanmcp config');
  } catch (e) {
    debug('Could not save .leanmcp config:', e);
  }

  // Success!
  logger.success('\n' + '='.repeat(60));
  logger.log('  DEPLOYMENT SUCCESSFUL!', chalk.green.bold);
  logger.success('='.repeat(60) + '\n');

  logger.log('  Your MCP server is now live:\n', chalk.white);
  logger.log(`  URL:  ${chalk.white.bold(`https://${subdomain}.leanmcp.app`)}`, chalk.cyan);
  logger.log('');
  logger.gray('  Test endpoints:');
  logger.gray(`    curl https://${subdomain}.leanmcp.app/health`);
  logger.gray(`    curl https://${subdomain}.leanmcp.app/mcp`);
  logger.log('');
  const totalDuration = Math.round((Date.now() - deployStartTime) / 1000);
  logger.gray(`  Total time: ${totalDuration}s`);
  logger.log('');

  // Dashboard links
  const dashboardBaseUrl = 'https://ship.leanmcp.com';
  logger.info('  Dashboard links:');
  logger.gray(`    Project:    ${dashboardBaseUrl}/projects/${projectId}`);
  logger.gray(`    Build:      ${dashboardBaseUrl}/builds/${buildId}`);
  logger.gray(`    Deployment: ${dashboardBaseUrl}/deployments/${deploymentId}`);
  logger.log('');

  logger.info('  Need help? Join our Discord:');
  logger.log('    https://discord.com/invite/DsRcA3GwPy', chalk.blue);
  logger.log('');
}
