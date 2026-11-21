/** Local file delivery remains available when clipboard permission is denied. */
export function downloadMarkdown(text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'bug-report.md';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
