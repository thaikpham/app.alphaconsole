/**
 * How this browser reaches the card. Two ways, and the browser decides which:
 * - Chromium desktop: the card folder, opened with the File System Access API (read and write).
 * - Other browsers (iPhone and iPad Safari, Firefox): the user picks the card's CAMPR .DAT files (read only). The picked
 *   files are kept in memory, so a reload asks again.
 */

/** A CAMPR file the user picked. The bytes are read once, at pick time. */
export type PickedFile = { name: string; bytes: Uint8Array };

/** The camera setting file names. Same pattern as the card reader in modules/usb-volume/index.web.ts. */
export const CAMPR = /^CAMPR0([1-4])([NP])\.DAT$/;

/**
 * True when this browser can open the card folder (File System Access API). Chromium desktop only: Safari, Firefox and
 * mobile browsers have no showDirectoryPicker.
 */
export function canPickCardFolder(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

let picked: PickedFile[] | null = null;

/** The CAMPR files picked on a browser without the folder picker, or null when none are picked. */
export function pickedCardFiles(): PickedFile[] | null {
  return picked;
}

export function setPickedCardFiles(files: PickedFile[] | null): void {
  picked = files;
}

async function readChosen(list: FileList): Promise<PickedFile[]> {
  const chosen = [...list].filter((f) => CAMPR.test(f.name)).sort((a, b) => a.name.localeCompare(b.name));
  return Promise.all(chosen.map(async (f) => ({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) })));
}

/**
 * Opens the file chooser for the card's CAMPR .DAT files. Call it synchronously from a tap: the browser allows the
 * chooser only inside a user gesture. Resolves to the files read (possibly none), or null when the user cancels.
 */
export function chooseCardFiles(): Promise<PickedFile[] | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = ".DAT,.dat";
    input.style.display = "none";
    const done = () => input.remove();
    input.onchange = () => {
      const list = input.files;
      done();
      if (list === null) resolve(null);
      else readChosen(list).then(resolve, reject);
    };
    input.oncancel = () => {
      done();
      resolve(null);
    };
    document.body.appendChild(input);
    input.click();
  });
}
