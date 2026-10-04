import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
config({ path: ".env.test" });
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test"))
  throw new Error(
    "DBテストは末尾 _test の専用DBと TEST_DATABASE_URL が必要です",
  );
process.env.DATABASE_URL = url;
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 30000,
  },
});
