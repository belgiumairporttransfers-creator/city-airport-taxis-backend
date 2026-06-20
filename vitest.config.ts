import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30000,
    fileParallelism: false,
    maxWorkers: 1,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/scripts/**",
        "src/shared/types/**",
        "src/**/types/**",
        "src/**/index.ts",
        "src/server.ts",
        "src/config/env.ts",
        "src/infrastructure/database/connection.ts",
        "src/infrastructure/database/indexes/**",
      ],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 70,
        branches: 58,
      },
    },
    env: {
      REDIS_ENABLED: "false",
      SOCKET_ENABLED: "false",
      JWT_SECRET: "test-jwt-secret-minimum-32-characters-long",
      JWT_REFRESH_SECRET: "test-jwt-refresh-secret-min-32-chars",
      JWT_EXPIRES_IN: "15m",
      JWT_REFRESH_EXPIRES_IN: "7d",
      BCRYPT_ROUNDS: "12",
      REQUIRE_EMAIL_VERIFICATION: "false",
    },
  },
});
