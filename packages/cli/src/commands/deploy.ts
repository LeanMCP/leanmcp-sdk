/**
 * leanmcp deploy command
 * 
 * Deploys an MCP server to LeanMCP cloud using the stored API key.
 */
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import archiver from 'archiver';
import { input, confirm, select } from '@inquirer/prompts';
import { getApiKey, getApiUrl } from './login';
import { generateProjectName } from '../utils';

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
    const response = await debugFetch(`${apiUrl}${API_ENDPOINTS.getBuild}/${buildId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to get build status: ${response.statusText}`);
    }

    const build = await response.json();
    spinner.text = `Building... (${build.status || 'pending'})`;

    if (build.status === 'succeeded' || build.status === 'SUCCEEDED') {
      return { imageUri: build.imageUri, status: 'succeeded' };
    }

    if (build.status === 'failed' || build.status === 'FAILED') {
      throw new Error(`Build failed: ${build.errorMessage || 'Unknown error'}`);
    }

    await new Promise(r => setTimeout(r, 5000)); // Wait 5 seconds
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
    const response = await debugFetch(`${apiUrl}${API_ENDPOINTS.getDeployment}/${deploymentId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

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

    await new Promise(r => setTimeout(r, 5000)); // Wait 5 seconds
    attempts++;
  }

  throw new Error('Deployment timed out after 5 minutes');
}

/**
 * Deploy command implementation
 */
export async function deployCommand(folderPath: string, options: DeployOptions = {}) {
  const deployStartTime = Date.now();
  
  console.log(chalk.cyan('\nLeanMCP Deploy\n'));
  
  debug('Starting deployment...');

  // Check authentication
  const apiKey = await getApiKey();
  if (!apiKey) {
    console.error(chalk.red('Not logged in.'));
    console.log(chalk.gray('Run `leanmcp login` first to authenticate.\n'));
    process.exit(1);
  }

  const apiUrl = await getApiUrl();
  debug('API URL:', apiUrl);

  // Resolve folder path
  const absolutePath = path.resolve(process.cwd(), folderPath);

  // Validate folder exists
  if (!await fs.pathExists(absolutePath)) {
    console.error(chalk.red(`Folder not found: ${absolutePath}`));
    process.exit(1);
  }

  // Check if it's a valid LeanMCP project
  const hasMainTs = await fs.pathExists(path.join(absolutePath, 'main.ts'));
  const hasPackageJson = await fs.pathExists(path.join(absolutePath, 'package.json'));

  if (!hasMainTs && !hasPackageJson) {
    console.error(chalk.red('Not a valid project folder.'));
    console.log(chalk.gray('Expected main.ts or package.json in the folder.\n'));
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
    console.log(chalk.cyan(`Found existing deployment config for '${existingConfig.projectName}'`));
    console.log(chalk.gray(`  Project ID: ${existingConfig.projectId}`));
    console.log(chalk.gray(`  URL: ${existingConfig.url}`));
    console.log(chalk.gray(`  Last deployed: ${existingConfig.lastDeployedAt}\n`));

    const choice = await select({
      message: 'What would you like to do?',
      choices: [
        { value: 'update', name: `Update existing deployment '${existingConfig.projectName}'` },
        { value: 'new', name: 'Create a new project with a random name' },
        { value: 'cancel', name: 'Cancel deployment' },
      ],
    });

    if (choice === 'cancel') {
      console.log(chalk.gray('\nDeployment cancelled.\n'));
      return;
    }

    if (choice === 'update') {
      existingProject = { id: existingConfig.projectId, name: existingConfig.projectName };
      projectName = existingConfig.projectName;
      subdomain = existingConfig.subdomain;
      isUpdate = true;
      console.log(chalk.yellow('\nUpdating existing deployment...'));
      console.log(chalk.gray('The previous version will be replaced.\n'));
    } else {
      // Generate new random name
      projectName = generateProjectName();
      console.log(chalk.cyan(`\nGenerated project name: ${chalk.bold(projectName)}\n`));
    }
  } else {
    // No existing config - check for existing projects on server
    debug('Fetching existing projects...');
    let existingProjects: Array<{ id: string; name: string; s3Location?: string }> = [];
    try {
      const projectsResponse = await debugFetch(`${apiUrl}${API_ENDPOINTS.projects}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
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
    const matchingProject = existingProjects.find(p => p.name === folderName);
    
    if (matchingProject) {
      console.log(chalk.yellow(`Project '${folderName}' already exists.\n`));
      
      const choice = await select({
        message: 'What would you like to do?',
        choices: [
          { value: 'update', name: `Update existing project '${folderName}'` },
          { value: 'new', name: 'Create a new project with a random name' },
          { value: 'cancel', name: 'Cancel deployment' },
        ],
      });

      if (choice === 'cancel') {
        console.log(chalk.gray('\nDeployment cancelled.\n'));
        return;
      }

      if (choice === 'update') {
        existingProject = matchingProject;
        projectName = matchingProject.name;
        isUpdate = true;
        console.log(chalk.yellow('\nWARNING: This will replace the existing deployment.'));
        console.log(chalk.gray('The previous version will be overwritten.\n'));
      } else {
        // Generate new random name
        projectName = generateProjectName();
        console.log(chalk.cyan(`\nGenerated project name: ${chalk.bold(projectName)}\n`));
      }
    } else {
      // No existing project - generate a new random name
      projectName = generateProjectName();
      console.log(chalk.cyan(`Generated project name: ${chalk.bold(projectName)}`));
    }
  }

  console.log(chalk.gray(`Path: ${absolutePath}\n`));

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
    const checkResponse = await debugFetch(`${apiUrl}${API_ENDPOINTS.checkSubdomain}/${subdomain}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (checkResponse.ok) {
      const result = await checkResponse.json();
      if (!result.available) {
        checkSpinner.fail(`Subdomain '${subdomain}' is already taken`);
        console.log(chalk.gray('\nPlease choose a different subdomain.\n'));
        process.exit(1);
      }
    }
    checkSpinner.succeed(`Subdomain '${subdomain}' is available`);
  } catch (error) {
    checkSpinner.warn('Could not verify subdomain availability');
  }

  // Confirm deployment
  if (!options.skipConfirm) {
    console.log(chalk.cyan('\nDeployment Details:'));
    console.log(chalk.gray(`  Project: ${projectName}`));
    console.log(chalk.gray(`  Subdomain: ${subdomain}`));
    console.log(chalk.gray(`  URL: https://${subdomain}.leanmcp.app\n`));

    const shouldDeploy = await confirm({
      message: 'Proceed with deployment?',
      default: true,
    });

    if (!shouldDeploy) {
      console.log(chalk.gray('\nDeployment cancelled.\n'));
      return;
    }
  }

  console.log();

  // Step 1: Create or use existing project
  let projectId: string;
  
  if (isUpdate && existingProject) {
    // Use existing project
    projectId = existingProject.id;
    console.log(chalk.gray(`Using existing project: ${projectId.substring(0, 8)}...`));
  } else {
    // Create new project
    const projectSpinner = ora('Creating project...').start();
    try {
      debug('Step 1: Creating project:', projectName);
      const createResponse = await debugFetch(`${apiUrl}${API_ENDPOINTS.projects}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
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
      console.error(chalk.red(`\n${error instanceof Error ? error.message : String(error)}`));
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
    const uploadUrlResponse = await debugFetch(`${apiUrl}${API_ENDPOINTS.projects}/${projectId}/upload-url`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: `${subdomain}.zip`,
        fileType: 'application/zip',
        fileSize: zipSize,
      }),
    });

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
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ s3Location }),
    });

    // Cleanup temp file
    await fs.remove(tempZip);

    uploadSpinner.succeed('Project uploaded');
  } catch (error) {
    uploadSpinner.fail('Failed to upload');
    console.error(chalk.red(`\n${error instanceof Error ? error.message : String(error)}`));
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
      headers: { 'Authorization': `Bearer ${apiKey}` },
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
    console.error(chalk.red(`\n${error instanceof Error ? error.message : String(error)}`));
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
        'Authorization': `Bearer ${apiKey}`,
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
    console.error(chalk.red(`\n${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  }

  // Step 5: Create subdomain mapping
  const mappingSpinner = ora('Configuring subdomain...').start();
  try {
    debug('Step 5: Creating subdomain mapping:', subdomain);
    const mappingResponse = await debugFetch(`${apiUrl}${API_ENDPOINTS.createMapping}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
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
  console.log(chalk.green('\n' + '='.repeat(60)));
  console.log(chalk.green.bold('  DEPLOYMENT SUCCESSFUL!'));
  console.log(chalk.green('='.repeat(60) + '\n'));

  console.log(chalk.white('  Your MCP server is now live:\n'));
  console.log(chalk.cyan(`  URL:  `) + chalk.white.bold(`https://${subdomain}.leanmcp.app`));
  console.log();
  console.log(chalk.gray('  Test endpoints:'));
  console.log(chalk.gray(`    curl https://${subdomain}.leanmcp.app/health`));
  console.log(chalk.gray(`    curl https://${subdomain}.leanmcp.app/mcp`));
  console.log();
  const totalDuration = Math.round((Date.now() - deployStartTime) / 1000);
  console.log(chalk.gray(`  Total time: ${totalDuration}s`));
  console.log();

  // Dashboard links
  const dashboardBaseUrl = 'https://ship.leanmcp.com';
  console.log(chalk.cyan('  Dashboard links:'));
  console.log(chalk.gray(`    Project:    ${dashboardBaseUrl}/projects/${projectId}`));
  console.log(chalk.gray(`    Build:      ${dashboardBaseUrl}/builds/${buildId}`));
  console.log(chalk.gray(`    Deployment: ${dashboardBaseUrl}/deployments/${deploymentId}`));
  console.log();

  console.log(chalk.cyan('  Need help? Join our Discord:'));
  console.log(chalk.blue('    https://discord.com/invite/DsRcA3GwPy'));
  console.log();
}
