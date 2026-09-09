const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const ts = require("typescript");
const base = process.argv[2] || "4a632fc74299fceb3f7a7c49eda80cdd68f4fc17";
const paths = execFileSync("git", ["ls-tree", "-r", "--name-only", base], {
  encoding: "utf8",
})
  .trim()
  .split("\n");
let protectedCount = 0,
  routes = 0,
  metadata = 0;
const failures = [];
const original = (path) =>
  execFileSync("git", ["show", `${base}:${path}`], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
function metadataNodes(source, path) {
  const ast = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const found = [];
  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ["metadata", "viewport"].includes(node.name.getText(ast))
    )
      found.push(node.getText(ast).replace(/\s+/g, " "));
    if (
      ts.isFunctionDeclaration(node) &&
      ["generateMetadata", "generateStaticParams"].includes(node.name?.text)
    )
      found.push(node.getText(ast).replace(/\s+/g, " "));
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return found;
}
for (const path of paths) {
  if (!fs.existsSync(path)) {
    failures.push(`Removed file: ${path}`);
    continue;
  }
  if (
    /(^app\/api\/|^lib\/|^middleware\.|^app\/(robots|sitemap)\.|firebase.*rules|^package-lock\.json$|^app\/globals\.css$)/.test(
      path,
    )
  ) {
    protectedCount++;
    if (fs.readFileSync(path, "utf8") !== original(path))
      failures.push(`Protected source changed: ${path}`);
  }
  if (/^app\/.*\/(page|route)\.tsx?$/.test(path) || path === "app/page.tsx")
    routes++;
  if (/\.tsx?$/.test(path) && !path.startsWith("lib/")) {
    const before = metadataNodes(original(path), path);
    if (before.length) {
      metadata += before.length;
      const after = metadataNodes(fs.readFileSync(path, "utf8"), path);
      if (JSON.stringify(before) !== JSON.stringify(after))
        failures.push(`SEO declaration changed: ${path}`);
    }
  }
}
console.log(
  JSON.stringify(
    {
      base,
      protectedFiles: protectedCount,
      routes,
      metadataDeclarations: metadata,
      failures,
    },
    null,
    2,
  ),
);
if (failures.length) process.exitCode = 1;
