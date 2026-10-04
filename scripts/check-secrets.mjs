import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const forbidden = files.filter((f) =>
  /(^|\/)(\.env($|\.(?!example$))|data\/|\.tools\/|id_rsa|id_ed25519)|\.(pem|pfx|key)$/.test(
    f,
  ),
);
const findings = [];
for (const file of files) {
  if (
    !/\.(ts|tsx|js|mjs|json|ya?ml|md|ps1|sh|sql|example)$/.test(file) ||
    file === "scripts/check-secrets.mjs"
  )
    continue;
  const data = readFileSync(file, "utf8");
  if (
    /gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[0-9A-Z]{16}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(
      data,
    )
  )
    findings.push(file);
}
if (forbidden.length || findings.length) {
  console.error(
    "秘密情報の可能性があるファイル:",
    [...forbidden, ...findings].join(", "),
  );
  process.exit(1);
}
console.log(`秘密情報検査: ${files.length} tracked files checked`);
