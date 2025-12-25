import ora from "ora";
import { spawn } from "child_process";
import path from "path";
import fs from "fs-extra";
import { logger, chalk } from "../logger";

export async function buildCommand(): Promise<void> {
  const cwd = process.cwd();
  
  // Check if tsconfig.json exists
  const tsconfigPath = path.join(cwd, "tsconfig.json");
  if (!fs.existsSync(tsconfigPath)) {
    logger.error("Error: tsconfig.json not found in current directory");
    logger.gray("Make sure you're in a LeanMCP project directory.");
    process.exit(1);
  }

  logger.info("\nLeanMCP Build\n");

  const spinner = ora("Compiling TypeScript...").start();

  return new Promise((resolve, reject) => {
    const tsc = spawn("npx", ["tsc"], {
      cwd,
      stdio: ["inherit", "pipe", "pipe"],
      shell: true,
    });

    let stdout = "";
    let stderr = "";

    tsc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    tsc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    tsc.on("close", (code) => {
      if (code === 0) {
        spinner.succeed("Build completed successfully");
        logger.gray("\nOutput directory: dist/");
        logger.gray("Run with: leanmcp start\n");
        resolve();
      } else {
        spinner.fail("Build failed");
        if (stdout) logger.log(stdout);
        if (stderr) logger.error(stderr);
        process.exit(1);
      }
    });

    tsc.on("error", (err) => {
      spinner.fail("Build failed");
      logger.error(`Failed to run tsc: ${err.message}`);
      process.exit(1);
    });
  });
}
