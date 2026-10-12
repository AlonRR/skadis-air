// The download (backlog item download-stl; D60): the board the page last built, as a binary STL
// named for its type, size and closed sides (C52). Whatever is generated is the user's (D8).
// saveFile is parametric-window-sealer's web/src/download-dialog.ts function (C32).
import type { Manifold } from 'manifold-3d';
import { meshOf, toStl } from 'skadis-ultralight-generator';

function saveFile(name: string, bytes: Uint8Array, type: string): void {
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

export function downloadStl(board: Manifold, fileName: string): void {
  saveFile(fileName, toStl(meshOf(board), fileName.replace(/\.stl$/, '')), 'model/stl');
}
