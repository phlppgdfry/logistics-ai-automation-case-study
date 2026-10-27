// ALM: exports the solution CorlaanCustomerEmail (unmanaged + managed) through the Web API, unpacks the
// unmanaged one into ../solution/src (reviewable source in git) and runs the solution checker on the
// managed one. The zips go to ../solution/out (ignored by git) and are attached to a GitHub release.
//
//   node export-solution.mjs [--version=1.0.0.1] [--no-check]
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, readFileSync, readdirSync } from "node:fs";
import { CONFIG, get, post, patch } from "./dv.mjs";

const version = process.argv.find((a) => a.startsWith("--version="))?.slice(10);
const check = !process.argv.includes("--no-check");
const out = new URL("../solution/out/", import.meta.url);
const src = new URL("../solution/src/", import.meta.url);
mkdirSync(out, { recursive: true });

if (version) {
  const sol = (await get(`solutions?$select=solutionid&$filter=uniquename eq '${CONFIG.solution}'`, { solution: null })).json.value[0];
  await patch(`solutions(${sol.solutionid})`, { version }, { solution: null });
  console.log(`version ${version}`);
}

for (const managed of [false, true]) {
  const res = await post("ExportSolution", { SolutionName: CONFIG.solution, Managed: managed }, { solution: null });
  const file = new URL(`${CONFIG.solution}${managed ? "_managed" : ""}.zip`, out);
  writeFileSync(file, Buffer.from(res.json.ExportSolutionFile, "base64"));
  console.log(`exported ${managed ? "managed" : "unmanaged"} → ${file.pathname}`);
}

// unpack the unmanaged solution as source (deterministic folder layout, diffable in pull requests)
rmSync(src, { recursive: true, force: true });
execFileSync("pac", ["solution", "unpack", "--zipfile", new URL(`${CONFIG.solution}.zip`, out).pathname, "--folder", src.pathname, "--packagetype", "Unmanaged", "--allowDelete", "true", "--allowWrite", "true"], { stdio: "inherit" });

// the environment URL never goes into git: flows and the bot keep only ids, but double-check
const leak = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => d.isDirectory() ? leak(new URL(`${d.name}/`, dir)) : (readFileSync(new URL(d.name, dir), "utf8").includes(new URL(CONFIG.url).hostname) ? [d.name] : []));
const leaks = leak(src);
if (leaks.length) console.log(`warning: environment host found in ${leaks.join(", ")}`);

if (check) {
  const res = new URL("../solution/checker/", import.meta.url);
  rmSync(res, { recursive: true, force: true });
  execFileSync("pac", ["solution", "check", "--path", new URL(`${CONFIG.solution}_managed.zip`, out).pathname, "--outputDirectory", res.pathname, "--geo", "Europe", "--environment", CONFIG.url], { stdio: "inherit" });
}
