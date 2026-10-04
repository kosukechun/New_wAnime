import "dotenv/config";
import { cpSync, existsSync } from "node:fs";
if (!existsSync(".next/standalone/server.js"))
  throw new Error("npm run build を先に実行してください");
cpSync("public", ".next/standalone/public", { recursive: true });
cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
process.env.HOSTNAME = "127.0.0.1";
await import("../.next/standalone/server.js");
