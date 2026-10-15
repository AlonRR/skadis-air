// The download (backlog item download-stl; D60): the board the page last built, as a binary STL
// named for its type, size and closed sides (C52), lying as it prints: face down (D66). Whatever is generated is the user's (D8).
// The build worker writes the file (build-worker.ts); this hands it to the browser.
// saveFile is parametric-window-sealer's web/src/download-dialog.ts function (C32).

export function saveFile(name: string, bytes: Uint8Array, type: string): void {
  const blob = new Blob([new Uint8Array(bytes)], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
