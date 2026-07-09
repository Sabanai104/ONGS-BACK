import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.spec.ts"],
  clearMocks: true
//   setupFilesAfterEnv: ["<rootDir>/src/tests/setup.ts"]
};

export default config;