// Writes the Copilot Studio agent definition (copilot-studio/agent/agent.mcs.yml) from the one
// source of the instructions, copilot-studio/instructions.md. Then: pac copilot push / publish
// (see power-platform/README.md). The agent has no tools, no knowledge and no web access: it reads.
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const instructions = readFileSync(new URL("copilot-studio/instructions.md", root), "utf8")
  .replace(/^> .*\n\n/m, "") // the version note is for people, not for the model
  .trim();
// Copilot Studio evaluates {…} in instructions as Power Fx. A literal brace is written as {Char(123)} and {Char(125)}.
const escaped = instructions.replace(/[{}]/g, (c) => (c === "{" ? "{Char(123)}" : "{Char(125)}"));
const indent = escaped.split("\n").map((l) => (l ? `  ${l}` : "")).join("\n");
writeFileSync(new URL("copilot-studio/agent/agent.mcs.yml", root), `mcs.metadata:
  componentName: Corlaan Mail Reader
kind: GptComponentMetadata
instructions: |-
${indent}
gptCapabilities:
  webBrowsing: false

aISettings:
  model:
    modelNameHint: GPT5Chat
`);
console.log(`agent.mcs.yml written (${instructions.length} characters of instructions)`);
