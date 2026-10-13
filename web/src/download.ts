// The download (backlog item download-stl; D60): the board the page last built, as a binary STL
// named for its type, size and closed sides (C52), lying as it prints: face down (D66). Whatever is generated is the user's (D8).
// saveFile is parametric-window-sealer's web/src/download-dialog.ts function (C32).
import type { Manifold } from 'manifold-3d';
import { meshOf, printPose, toStl } from 'skadis-air';

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

/** The board as it prints, face down (D66): turned over from the way the page builds and shows it. */
export function downloadStl(board: Manifold, fileName: string): void {
  const printed = printPose(board);
  try {
    saveFile(fileName, toStl(meshOf(printed), fileName.replace(/\.stl$/, '')), 'model/stl');
  } finally {
    printed.delete();
  }
}
