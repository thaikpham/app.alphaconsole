/** Saves bytes as a file download in the browser. Web only: callers check Platform.OS first. */
export function downloadFile(name: string, bytes: Uint8Array, type: string): void {
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
