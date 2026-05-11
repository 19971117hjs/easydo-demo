const [binaryPath, command, ...args] = process.argv.slice(2);

function reply(message) {
  if (typeof process.send === "function") {
    process.send(message, () => {
      process.exit(message && message.ok ? 0 : 1);
    });
    return;
  }

  process.stdout.write(JSON.stringify(message), () => {
    process.exit(message && message.ok ? 0 : 1);
  });
}

try {
  const nativeModule = require(binaryPath);
  const Screenshots = nativeModule.Screenshots;

  if (!Screenshots || typeof Screenshots.all !== "function") {
    throw new Error("Folge native Screenshots API is unavailable in capture worker.");
  }

  if (command !== "capture-display" && command !== "capture-area") {
    throw new Error(`Unsupported capture worker command: ${command}`);
  }

  const displayId = args[0];
  const display = Screenshots.all().find((candidate) => String(candidate.id) === String(displayId));

  if (!display) {
    throw new Error(`Folge native capture worker could not find display ${displayId}.`);
  }

  const buffer =
    command === "capture-area"
      ? display.captureAreaSync(
          Number(args[1]),
          Number(args[2]),
          Number(args[3]),
          Number(args[4])
        )
      : display.captureSync();

  reply({
    ok: true,
    data: buffer.toString("base64")
  });
} catch (error) {
  reply({
    ok: false,
    error: error instanceof Error ? error.message : String(error)
  });
}
