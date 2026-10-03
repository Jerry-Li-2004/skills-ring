import ts from "typescript";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

mkdirSync("server/generated", { recursive: true });
for (const name of ["domain", "live-snapshot", "starter"]) {
  const source = readFileSync(`src/${name}.ts`, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  writeFileSync(`server/generated/${name}.mjs`, outputText.replaceAll('"./domain"', '"./domain.mjs"').replaceAll('"./starter"', '"./starter.mjs"'));
}
