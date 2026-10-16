/** Saves a PDF blob response to the user's device, using the server's filename when it sends one. */
export function savePdfResponse(res: { data: Blob; headers?: Record<string, unknown> }, fallbackName: string) {
  const cd = String(res.headers?.['content-disposition'] ?? '');
  const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
  const name = m ? decodeURIComponent(m[1]) : fallbackName;
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
