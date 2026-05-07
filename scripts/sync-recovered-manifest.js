const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const recoveredAppRoot =
  process.env.FOLGE_RECOVERED_APP_ROOT ||
  "/Users/jsh/Desktop/folge_asar_full_app";

const localPackageJsonPath = path.join(projectRoot, "package.json");
const recoveredPackageJsonPath = path.join(recoveredAppRoot, "package.json");
const recoveredNodeModulesRoot = path.join(recoveredAppRoot, "node_modules");
const vendorRoot = path.join(projectRoot, "vendor-deps");
const forcedVendoredPackages = new Set([
  "active-win",
  "electron-app-universal-protocol-client",
  "font-scanner",
  "libuiohook-node",
  "npm-platform-dependencies",
  "sharp",
  "sqlite3",
  "vue-color"
]);
const vendoredPackageProtocols = new Map([
  ["libuiohook-node", "link"],
  ["active-win", "file"],
  ["electron-app-universal-protocol-client", "file"],
  ["font-scanner", "file"],
  ["npm-platform-dependencies", "file"],
  ["sharp", "file"],
  ["sqlite3", "file"],
  ["vue-color", "file"]
]);

const vendoredPackageFilePatches = new Map([
  [
    "sharp",
    (packageJson) => ({
      ...packageJson,
      files: Array.from(
        new Set([
          ...(packageJson.files || []),
          "build/Release/*.node",
          "vendor/**"
        ])
      )
    })
  ],
  [
    "libuiohook-node",
    (packageJson) => ({
      ...packageJson,
      files: Array.from(
        new Set([
          ...(packageJson.files || []).flatMap((entry) =>
            entry === "/lib/**/*.js" ? ["/lib/**/*"] : [entry]
          ),
          "/build/Release/**/*.node"
        ])
      )
    })
  ]
]);

function readJson(targetPath) {
  return JSON.parse(fs.readFileSync(targetPath, "utf8"));
}

function getInstalledVersion(packageName) {
  const packageJsonPath = path.join(
    recoveredNodeModulesRoot,
    packageName,
    "package.json"
  );

  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }

  const installedPackageJson = readJson(packageJsonPath);
  return installedPackageJson.version || null;
}

function getRecoveredPackagePath(packageName) {
  return path.join(recoveredNodeModulesRoot, packageName);
}

function isNonRegistrySpec(originalSpec) {
  return (
    typeof originalSpec === "string" &&
    (/^(git|ssh|https?:)/.test(originalSpec) ||
      (originalSpec.includes("/") && !originalSpec.startsWith("@")))
  );
}

function getVendoredDependencySpec(packageName) {
  const protocol = vendoredPackageProtocols.get(packageName) || "file";
  return `${protocol}:./vendor-deps/${packageName}`;
}

function shouldVendorPackage(packageName, originalSpec) {
  return forcedVendoredPackages.has(packageName) || isNonRegistrySpec(originalSpec);
}

function vendorRecoveredPackage(packageName) {
  const sourcePath = getRecoveredPackagePath(packageName);
  const destinationPath = path.join(vendorRoot, packageName);

  if (!fs.existsSync(sourcePath)) {
    return false;
  }

  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.rmSync(destinationPath, { recursive: true, force: true });
  fs.cpSync(sourcePath, destinationPath, {
    recursive: true,
    dereference: true,
    force: true,
    preserveTimestamps: true
  });

  patchVendoredPackageManifest(packageName, destinationPath);

  return true;
}

function patchVendoredPackageManifest(packageName, packageRoot) {
  const patcher = vendoredPackageFilePatches.get(packageName);
  if (!patcher) {
    return;
  }

  const packageJsonPath = path.join(packageRoot, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    return;
  }

  const packageJson = readJson(packageJsonPath);
  const nextPackageJson = patcher(packageJson);

  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(nextPackageJson, null, 2) + "\n"
  );
}

function resolveDependencyMap(sourceMap = {}) {
  const resolved = {};
  const warnings = [];

  Object.entries(sourceMap).forEach(([packageName, originalSpec]) => {
    if (shouldVendorPackage(packageName, originalSpec) && vendorRecoveredPackage(packageName)) {
      resolved[packageName] = getVendoredDependencySpec(packageName);
      warnings.push({
        packageName,
        originalSpec,
        resolvedVersion: resolved[packageName]
      });
      return;
    }

    const installedVersion = getInstalledVersion(packageName);

    if (installedVersion) {
      resolved[packageName] = installedVersion;
      if (isNonRegistrySpec(originalSpec)) {
        warnings.push({
          packageName,
          originalSpec,
          resolvedVersion: installedVersion
        });
      }
      return;
    }

    resolved[packageName] = originalSpec;
    warnings.push({
      packageName,
      originalSpec,
      resolvedVersion: null
    });
  });

  return { resolved, warnings };
}

function main() {
  const localPackageJson = readJson(localPackageJsonPath);
  const recoveredPackageJson = readJson(recoveredPackageJsonPath);

  const dependencyResult = resolveDependencyMap(recoveredPackageJson.dependencies);
  const optionalDependencyResult = resolveDependencyMap(
    recoveredPackageJson.optionalDependencies
  );

  const nextPackageJson = {
    ...localPackageJson,
    author: recoveredPackageJson.author || localPackageJson.author,
    dependencies: dependencyResult.resolved,
    optionalDependencies: optionalDependencyResult.resolved,
    resolutions: recoveredPackageJson.resolutions || localPackageJson.resolutions,
    darwinDependencies:
      recoveredPackageJson.darwinDependencies || localPackageJson.darwinDependencies,
    win32Dependencies:
      recoveredPackageJson.win32Dependencies || localPackageJson.win32Dependencies
  };

  fs.writeFileSync(
    localPackageJsonPath,
    JSON.stringify(nextPackageJson, null, 2) + "\n"
  );

  const warnings = [
    ...dependencyResult.warnings,
    ...optionalDependencyResult.warnings
  ];

  console.log(
    "[folge-runtime] manifest-synced",
    JSON.stringify({
      dependencyCount: Object.keys(nextPackageJson.dependencies || {}).length,
      optionalDependencyCount: Object.keys(nextPackageJson.optionalDependencies || {}).length,
      warningCount: warnings.length
    })
  );

  if (warnings.length > 0) {
    console.log(
      "[folge-runtime] manifest-sync-warnings",
      JSON.stringify(warnings, null, 2)
    );
  }
}

main();
