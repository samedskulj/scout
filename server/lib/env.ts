import { existsSync } from "node:fs";
import path from "node:path";

/** Load the nearest .env (app folder or monorepo root). Real environment variables win. */
export function loadEnv(): void {
  let dir = process.cwd();
  for (let depth = 0; depth < 3; depth++) {
    const file = path.join(dir, ".env");
    if (existsSync(file)) {
      process.loadEnvFile(file);
      return;
    }
    dir = path.dirname(dir);
  }
}
