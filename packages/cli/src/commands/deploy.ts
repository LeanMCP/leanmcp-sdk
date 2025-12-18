/**
 * leanmcp deploy command
 * 
 * Deploys an MCP server to LeanMCP cloud using the stored API key.
 */
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs-extra';
import archiver from 'archiver';
import { input, confirm } from '@inquirer/prompts';
import { getApiKey, getApiUrl } from './login';

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

  // Get project name from package.json or folder name
  let projectName = path.basename(absolutePath);
  if (hasPackageJson) {
    try {
      const pkg = await fs.readJSON(path.join(absolutePath, 'package.json'));
      projectName = pkg.name || projectName;
    } catch (e) {
      // Use folder name
    }
  }

  console.log(chalk.white(`Project: ${chalk.bold(projectName)}`));
  console.log(chalk.gray(`Path: ${absolutePath}\n`));

  // Get or prompt for subdomain
  let subdomain = options.subdomain;
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
    console.log(chalk.gray(`  URL: https://${subdomain}.leanmcp.dev\n`));

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

  // Step 1: Create project
  const projectSpinner = ora('Creating project...').start();
  let projectId: string;
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

  // Step 2: Create zip and upload
  const uploadSpinner = ora('Packaging and uploading...').start();
  try {
    // Create temp zip file
    const tempZip = path.join(require('os').tmpdir(), `leanmcp-${Date.now()}.zip`);
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

    const { uploadUrl, s3Location } = await uploadUrlResponse.json();

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
  const buildSpinner = ora('Building Docker image...').start();
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

    buildSpinner.succeed('Build complete');
  } catch (error) {
    buildSpinner.fail('Build failed');
    console.error(chalk.red(`\n${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  }

  // Step 4: Deploy to Lambda
  const deploySpinner = ora('Deploying to Lambda...').start();
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

    deploySpinner.succeed('Lambda deployed');
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

  // Success!
  console.log(chalk.green('\n' + '='.repeat(60)));
  console.log(chalk.green.bold('  DEPLOYMENT SUCCESSFUL!'));
  console.log(chalk.green('='.repeat(60) + '\n'));

  console.log(chalk.white('  Your MCP server is now live:\n'));
  console.log(chalk.cyan(`  Custom Domain:  `) + chalk.white.bold(`https://${subdomain}.leanmcp.dev`));
  console.log(chalk.cyan(`  Lambda URL:     `) + chalk.gray(functionUrl));
  console.log();
  console.log(chalk.gray('  Test endpoints:'));
  console.log(chalk.gray(`    curl https://${subdomain}.leanmcp.dev/health`));
  console.log(chalk.gray(`    curl https://${subdomain}.leanmcp.dev/mcp`));
  console.log();
  console.log(chalk.gray(`  Project ID:    ${projectId}`));
  console.log(chalk.gray(`  Build ID:      ${buildId}`));
  console.log(chalk.gray(`  Deployment ID: ${deploymentId}`));
  console.log();
}
