export function getErrorMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : String(error);

  return raw.replace(/^Error invoking remote method '[^']+':\s*Error:\s*/u, "");
}
