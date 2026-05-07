function stripTags(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|blockquote|h1|h2|h3|h4|h5|h6)>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function htmlToPlainText(value: string | null | undefined): string {
  return stripTags(value ?? "");
}

export function plainTextToHtml(value: string | null | undefined): string {
  const source = (value ?? "").trim();
  if (!source) {
    return "";
  }

  return source
    .split(/\n{2,}/)
    .map((paragraph) => {
      const lines = paragraph
        .split("\n")
        .map((line) => escapeHtml(line.trim()))
        .join("<br />");
      return `<p>${lines}</p>`;
    })
    .join("");
}

export function normalizeNotesHtml(
  html: string | null | undefined,
  fallbackText: string | null | undefined
): string {
  const normalizedHtml = (html ?? "").trim();
  if (normalizedHtml) {
    return normalizedHtml;
  }

  return plainTextToHtml(fallbackText);
}
