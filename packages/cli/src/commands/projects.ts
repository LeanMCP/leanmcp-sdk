/**
 * leanmcp projects commands
 * 
 * Manage LeanMCP cloud projects via API key authentication.
 */
import chalk from 'chalk';
import ora from 'ora';
import { getApiKey, getApiUrl } from './login';

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
    console.error(chalk.red('\nNot logged in.'));
    console.log(chalk.gray('Run `leanmcp login` first to authenticate.\n'));
    process.exit(1);
  }

  const spinner = ora('Fetching projects...').start();

  try {
    const apiUrl = await getApiUrl();
    const response = await fetch(`${apiUrl}${API_ENDPOINT}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    const projects: Project[] = await response.json();
    spinner.stop();

    if (projects.length === 0) {
      console.log(chalk.yellow('\nNo projects found.'));
      console.log(chalk.gray('Create one with: leanmcp deploy <folder>\n'));
      return;
    }

    console.log(chalk.cyan(`\n📁 Your Projects (${projects.length})\n`));
    console.log(chalk.gray('─'.repeat(60)));

    for (const project of projects) {
      const statusColor = project.status === 'ACTIVE' ? chalk.green : chalk.yellow;
      console.log(chalk.white.bold(`  ${project.name}`));
      console.log(chalk.gray(`    ID: ${project.id}`));
      console.log(chalk.gray(`    Status: `) + statusColor(project.status));
      console.log(chalk.gray(`    Created: ${new Date(project.createdAt).toLocaleDateString()}`));
      console.log();
    }

  } catch (error) {
    spinner.fail('Failed to fetch projects');
    console.error(chalk.red(`\n${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  }
}

/**
 * Get details of a specific project
 */
export async function projectsGetCommand(projectId: string) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    console.error(chalk.red('\nNot logged in.'));
    console.log(chalk.gray('Run `leanmcp login` first to authenticate.\n'));
    process.exit(1);
  }

  const spinner = ora('Fetching project...').start();

  try {
    const apiUrl = await getApiUrl();
    const response = await fetch(`${apiUrl}${API_ENDPOINT}/${projectId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Project not found: ${projectId}`);
      }
      throw new Error(`Failed to fetch project: ${response.statusText}`);
    }

    const project: Project = await response.json();
    spinner.stop();

    console.log(chalk.cyan('\n📁 Project Details\n'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(chalk.white.bold(`  Name: ${project.name}`));
    console.log(chalk.gray(`  ID: ${project.id}`));
    console.log(chalk.gray(`  Status: ${project.status}`));
    if (project.s3Location) {
      console.log(chalk.gray(`  S3 Location: ${project.s3Location}`));
    }
    console.log(chalk.gray(`  Created: ${new Date(project.createdAt).toLocaleString()}`));
    if (project.updatedAt) {
      console.log(chalk.gray(`  Updated: ${new Date(project.updatedAt).toLocaleString()}`));
    }
    console.log();

  } catch (error) {
    spinner.fail('Failed to fetch project');
    console.error(chalk.red(`\n${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  }
}

/**
 * Delete a project
 */
export async function projectsDeleteCommand(projectId: string, options: { force?: boolean } = {}) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    console.error(chalk.red('\nNot logged in.'));
    console.log(chalk.gray('Run `leanmcp login` first to authenticate.\n'));
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
      console.log(chalk.gray('\nDeletion cancelled.\n'));
      return;
    }
  }

  const spinner = ora('Deleting project...').start();

  try {
    const apiUrl = await getApiUrl();
    const response = await fetch(`${apiUrl}${API_ENDPOINT}/${projectId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Project not found: ${projectId}`);
      }
      throw new Error(`Failed to delete project: ${response.statusText}`);
    }

    spinner.succeed('Project deleted successfully');
    console.log();

  } catch (error) {
    spinner.fail('Failed to delete project');
    console.error(chalk.red(`\n${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  }
}
