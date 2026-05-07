const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const recoveredAppRoot =
  process.env.FOLGE_RECOVERED_APP_ROOT ||
  "/Users/jsh/Desktop/folge_asar_full_app";

const stageRoot = path.join(projectRoot, ".packaging", "app");
const recoveredDist = path.join(recoveredAppRoot, "dist");
const recoveredNodeModules = path.join(recoveredAppRoot, "node_modules");
const bootstrapPath = path.join(projectRoot, "bootstrap.js");

function assertPathExists(targetPath, description) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`${description} not found: ${targetPath}`);
  }
}

function resetDir(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
  fs.mkdirSync(targetPath, { recursive: true });
}

function copyTree(sourcePath, destinationPath) {
  fs.cpSync(sourcePath, destinationPath, {
    recursive: true,
    dereference: true,
    force: true,
    preserveTimestamps: true
  });
}

function buildStagePackageJson() {
  const rootPackageJson = JSON.parse(
    fs.readFileSync(path.join(projectRoot, "package.json"), "utf8")
  );

  return {
    name: rootPackageJson.name,
    productName: rootPackageJson.productName,
    version: rootPackageJson.version,
    author: rootPackageJson.author,
    description: rootPackageJson.description,
    main: "./bootstrap.js"
  };
}

function main() {
  assertPathExists(bootstrapPath, "bootstrap.js");
  assertPathExists(recoveredDist, "Recovered dist directory");
  assertPathExists(recoveredNodeModules, "Recovered node_modules directory");

  resetDir(stageRoot);

  copyTree(bootstrapPath, path.join(stageRoot, "bootstrap.js"));
  copyTree(recoveredDist, path.join(stageRoot, "dist"));
  copyTree(recoveredNodeModules, path.join(stageRoot, "node_modules"));

  fs.writeFileSync(
    path.join(stageRoot, "package.json"),
    JSON.stringify(buildStagePackageJson(), null, 2) + "\n"
  );

  console.log(
    "[folge-runtime] package-stage-ready",
    JSON.stringify({
      stageRoot,
      recoveredAppRoot
    })
  );
}

main();
