const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const recoveredAppRoot =
  process.env.FOLGE_RECOVERED_APP_ROOT ||
  "/Users/jsh/Desktop/folge_asar_full_app";

const localDistPath = path.join(projectRoot, "dist");
const recoveredDistPath = path.join(recoveredAppRoot, "dist");
const force = process.argv.includes("--force");

function copyRecoveredDist() {
  fs.cpSync(recoveredDistPath, localDistPath, {
    recursive: true,
    dereference: true,
    force: true,
    preserveTimestamps: true
  });
}

function main() {
  if (!fs.existsSync(recoveredDistPath)) {
    throw new Error(`Recovered dist directory not found: ${recoveredDistPath}`);
  }

  if (!fs.existsSync(localDistPath)) {
    copyRecoveredDist();
    console.log(
      "[folge-runtime] dist-localized",
      JSON.stringify({ localDistPath, recoveredDistPath, mode: "created" })
    );
    return;
  }

  const stat = fs.lstatSync(localDistPath);

  if (stat.isSymbolicLink()) {
    fs.rmSync(localDistPath, { recursive: true, force: true });
    copyRecoveredDist();
    console.log(
      "[folge-runtime] dist-localized",
      JSON.stringify({ localDistPath, recoveredDistPath, mode: "replaced-symlink" })
    );
    return;
  }

  if (force) {
    fs.rmSync(localDistPath, { recursive: true, force: true });
    copyRecoveredDist();
    console.log(
      "[folge-runtime] dist-localized",
      JSON.stringify({ localDistPath, recoveredDistPath, mode: "replaced-directory" })
    );
    return;
  }

  console.log(
    "[folge-runtime] dist-already-local",
    JSON.stringify({ localDistPath })
  );
}

main();
