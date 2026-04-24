export function sanitizeMarkdown(markdown: string): string {
  return markdown.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
}
