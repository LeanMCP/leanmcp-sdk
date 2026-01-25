/**
 * leanmcp projects commands
 *
 * Manage LeanMCP cloud projects via API key authentication.
 */
import ora from 'ora';
import { getApiKey, getApiUrl } from './login';
import { logger, chalk } from '../logger';

const API_ENDPOINT = '/api/projects';

interface Project {
  id: string;
  name: string;
  status: string;
  s3Location?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * List all projects for the authenticated user
 */
export async function projectsListCommand() {
  const apiKey = await getApiKey();
  if (!apiKey) {
    logger.error('\nNot logged in.');
    logger.gray('Run `leanmcp login` first to authenticate.\n');
    process.exit(1);
  }

  const spinner = ora('Fetching projects...').start();

  try {
    const apiUrl = await getApiUrl();
    const response = await fetch(`${apiUrl}${API_ENDPOINT}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    const projects: Project[] = await response.json();
    spinner.stop();

    if (projects.length === 0) {
      logger.warn('\nNo projects found.');
      logger.gray('Create one with: leanmcp deploy <folder>\n');
      return;
    }

    logger.info(`\nYour Projects (${projects.length})\n`);
    logger.gray('─'.repeat(60));

    for (const project of projects) {
      const statusColor = project.status === 'ACTIVE' ? chalk.green : chalk.yellow;
      logger.log(`  ${project.name}`, chalk.white.bold);
      logger.gray(`    ID: ${project.id}`);
      logger.log(`    Status: ${statusColor(project.status)}`, chalk.gray);
      logger.gray(`    Created: ${new Date(project.createdAt).toLocaleDateString()}`);
      logger.log('');
    }
  } catch (error) {
    spinner.fail('Failed to fetch projects');
    logger.error(`\n${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/**
 * Get details of a specific project
 */
export async function projectsGetCommand(projectId: string) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    logger.error('\nNot logged in.');
    logger.gray('Run `leanmcp login` first to authenticate.\n');
    process.exit(1);
  }

  const spinner = ora('Fetching project...').start();

  try {
    const apiUrl = await getApiUrl();
    const response = await fetch(`${apiUrl}${API_ENDPOINT}/${projectId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Project not found: ${projectId}`);
      }
      throw new Error(`Failed to fetch project: ${response.statusText}`);
    }

    const project: Project = await response.json();
    spinner.stop();

    logger.info('\nProject Details\n');
    logger.gray('─'.repeat(60));
    logger.log(`  Name: ${project.name}`, chalk.white.bold);
    logger.gray(`  ID: ${project.id}`);
    logger.gray(`  Status: ${project.status}`);
    if (project.s3Location) {
      logger.gray(`  S3 Location: ${project.s3Location}`);
    }
    logger.gray(`  Created: ${new Date(project.createdAt).toLocaleString()}`);
    if (project.updatedAt) {
      logger.gray(`  Updated: ${new Date(project.updatedAt).toLocaleString()}`);
    }
    logger.log('');
  } catch (error) {
    spinner.fail('Failed to fetch project');
    logger.error(`\n${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/**
 * Delete a project
 */
export async function projectsDeleteCommand(projectId: string, options: { force?: boolean } = {}) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    logger.error('\nNot logged in.');
    logger.gray('Run `leanmcp login` first to authenticate.\n');
    process.exit(1);
  }

  // Confirm deletion unless --force
  if (!options.force) {
    const { confirm } = await import('@inquirer/prompts');
    const shouldDelete = await confirm({
      message: `Are you sure you want to delete project ${projectId}?`,
      default: false,
    });

    if (!shouldDelete) {
      logger.gray('\nDeletion cancelled.\n');
      return;
    }
  }

  const spinner = ora('Deleting project...').start();

  try {
    const apiUrl = await getApiUrl();
    const response = await fetch(`${apiUrl}${API_ENDPOINT}/${projectId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Project not found: ${projectId}`);
      }
      throw new Error(`Failed to delete project: ${response.statusText}`);
    }

    spinner.succeed('Project deleted successfully');
    logger.log('');
  } catch (error) {
    spinner.fail('Failed to delete project');
    logger.error(`\n${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
