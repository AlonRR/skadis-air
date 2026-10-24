# Opening a Skadis Air part in the user's slicer, on a desktop or a phone

Research report, 24 Oct 2026, by an agent, for the owner's aim D354: "an option to open the users prefered slicer, also
if possible to open the users slicer phone app, needs research." It builds on
[the 23 Oct report](2026-10-23-send-to-printer.md) ("first report" below), whose findings I checked and extend. Nothing
was built from this. Every source was read on 24 Oct 2026. Tags: **(verified: R#)** means I read it in that source or
ran it; **(relayed: R#)** is someone else's report I did not check; **(inferred)** is my reasoning from verified facts;
**(unverified)** is a gap. The rule that bounds every design (Q355): no analytics and no other collection of data from
users; a user who wants a file sent to an external service gets a warning and must confirm first.

## The question and the answer

**Can a static page, with nothing uploaded, open a part it just built in the user's own slicer, or in a phone app?**

- **Desktop: not by a link, yes by the download.** Every slicer's deep link takes an address the slicer downloads by
  itself, over http or https, and a file that exists only inside the browser has no such address (verified: R9 to R16;
  the data URL, local path, File System Access and service-worker ideas all fail, section 2). What does work, with no
  upload: the browser saves the file and the operating system opens it in the slicer that owns `.3mf` or `.stl`. Chrome
  offers "Always open files of this type" for both (verified: R7). The page can help with that one-time setup, and it
  can remember which slicer the user chose in `localStorage`, so the help and the preset links match it.
- **Desktop deep links still work for files that already have a public address**, such as preset sizes published with
  the page: `orcaslicer://`, `cura://` and `elegooslicer://` fetch them with no further check on the address; Bambu
  Studio asks once; PrusaSlicer refuses an address Prusa has not allowlisted (verified: R9, R10, R11, R15, R16).
- **Phones: no slicer app takes a file from a link, and the share sheet cannot carry these files on Android.**
  Chrome for Android's Web Share refuses `.stl`, `.3mf` and `.gcode` by an allowlist of file types, and `canShare()`
  does not check that list, so it says yes and `share()` then fails (verified: R1 to R4). Safari on iOS has no such list
  in WebKit, so the share sheet should accept the file and offer "Save to Files" and any app that declares the type
  (verified: R5 for the code, inferred for what the user sees; no device was available). I found no phone slicer or
  printer app that I could confirm accepts a 3MF or STL from another app; the two I could read the source of do not
  (verified: R17, R18); the rest are closed-source and unverified.
- **Everything that would make a link work for a custom part needs the file uploaded to a host first.** That is a
  Q355 event: it needs the warning and the confirmation, and a host the page can write to, which today means a server
  (first report, option C).

## 1. Desktop slicers: what each takes

"Scheme" is the URL scheme the operating system hands to the program. "Takes" is what the program does with the address
after `file=`. All programs below download the address themselves; none accepts bytes in the link.

| Slicer (version or commit read) | Scheme and form | Takes | Who registers the scheme on Windows | Notes |
|---|---|---|---|---|
| PrusaSlicer 2.9.6 | `prusaslicer://open?file=<https url>` | https only, and only allowlisted domains (verified: R9 and first report S1, S2) | The Configuration Wizard's "Allow built-in downloader" box, ticked by default the first time the wizard runs (verified: R9, `ConfigWizard.cpp` line 1635). On macOS and Linux (without desktop integration) a link is refused if that setting is off (verified: R9, `GUI_App.cpp` near line 3849) | A machine with PrusaSlicer 2.9.x installed had the `prusaslicer` scheme registered and `.3mf` and `.stl` associated with it (verified: R26). Allowlist wait: first report S3 |
| OrcaSlicer 2.4.2 | `orcaslicer://open?file=<url>`; its downloader also accepts the `prusaslicer`, `bambustudio` and `cura` forms | The address after `file=`; the code checks the scheme prefix, not the host (verified: R10, `Downloader.cpp` lines 145 to 170). A non-http address is not checked in this code; the fetch library's behaviour was not tested (unverified) | The app itself, at every start, unconditionally (verified: R10, `GUI_App.cpp` line 2913) | File associations for `.3mf` and `.stl` are off by default (verified: first report S7) |
| ElegooSlicer (main, 2d507e39a) | `elegooslicer://open?file=<url>`, and the Orca, PrusaSlicer, Bambu and Cura forms | Must start with `http://` or `https://` (verified: R11, `Downloader.cpp` `process_url`). What its `request_model_download` path does with a non-Elegoo address was not read (unverified) | The app itself, at every start (verified: R11, `GUI_App.cpp` line 2991) | An OrcaSlicer fork |
| Anycubic Slicer Next (main, last push 3 Feb 2026) | Registers `orcaslicer://`, not its own (verified: R14, `GUI_App.cpp` line 2472) | As OrcaSlicer, by inheritance (inferred) | The app itself | It and OrcaSlicer claim the same scheme; on one Windows account the one started last would own it (inferred) |
| Bambu Studio 02.08.02.61 | `bambustudio://open?file=<url>` | Trusted hosts open directly (MakerWorld and Bambu's CDN); any other address asks "This file is not from a trusted site" (verified: first report S8) | Not the app's own code: no `associate_url` call (verified: R16, text search of `GUI_App.cpp`). The installer was not read (unverified) | Bambu Connect takes a disk path to a sliced `.gcode.3mf` only (first report S11) |
| UltiMaker Cura 5.13.0 | `cura://open?file=<url>` and `slicer://open?file=<url>` | Any address its Qt network layer can fetch; no host check (verified: R15). The saved name is the last path segment plus `.stl`, unless the server sends a `Content-Disposition` header (verified: R15, lines 1860 to 1880) | The Windows installer: `cura://` is installed by default, `slicer://` is optional (verified: R15, `UltiMaker-Cura.wxs.jinja`, feature levels 1 and 4) | A static host sends no `Content-Disposition`, so a `.3mf` behind a `cura://` link would be saved as `.stl` and fail to load (inferred); only STL presets suit Cura |
| Creality Print (master, 59ae8cbb0) | Its own `crealityprintlink://open?code=` goes to a web-view handler, not a download; `crealityprintlink://open?file=` goes to its cloud model-download path (verified: R12) | Its downloader regex also accepts the other four forms if the OS routes them to it (verified: R12) | Nobody in the code: the `associate_url` call is commented out (verified: R12, `GUI_App.cpp` line 4752). The installer was not read (unverified) | Not usable as a target for a generic file address |
| SuperSlicer (master_27, last commit 18 Nov 2025) | Handles `prusaslicer://open?file=` | `printables.com` only (verified: R13, `Downloader.cpp` line 153) | Unclear: no `associate_url` found in its `GUI_App.cpp` (verified: R13); installer unread (unverified) | Effectively closed to other sites |
| Lychee Slicer (resin) | Meshy's docs describe a browser prompt "open links of this type in the associated app", then a Save As dialog (relayed: R22) | Scheme and mechanism not stated | Unverified | Cited only as proof that a registered link type exists; resin, not filament |
| ideaMaker, Simplify3D, Chitubox | No documented scheme found by search (unverified absence) | n/a | n/a | n/a |
| Bambu Connect (beta) | `bambu-connect://import-file?path=<disk path>` (first report S11) | A path on the user's disk to a sliced file | The Bambu Connect installer | A web page cannot know a download's path, see section 2 |

A **registry probe** on a Windows machine (read-only: `reg query` equivalents; no scheme was opened): `prusaslicer` was
registered; `orcaslicer`, `bambustudio`, `cura`, `slicer`, `superslicer`, `bambu-connect` and the Creality and Elegoo
names were absent; `.3mf` and `.stl` were associated with PrusaSlicer, `.gcode` with its G-code viewer (verified:
R26). Absence says only that the program was not installed or never started on that machine; I did not check which.

### What the browser shows when a page opens one of these links

On desktop Chrome the first launch shows a dialog "Open *program*?" with a checkbox "Always allow *the site* to open
links of this type in the associated app" (verified: R19, Chromium's string table and dialog code); the checkbox can be
switched off by policy (verified: R19). The page cannot tell whether a handler exists: no web API reports installed
programs for an arbitrary scheme (inferred; I found none), so a link to a missing program does nothing or shows the
browser's own "no app" message. The user has to choose the slicer; the page cannot guess it.

## 2. Can a page hand over a file made in the browser? Each idea, concretely

| Idea | Result | Why |
|---|---|---|
| **`blob:` address in the link** | Fails | A blob address lives only inside the browser process that made it; the slicer is a separate program that fetches over the network (inferred from R9 to R16, which all fetch over http). |
| **`data:` address in the link** (`orcaslicer://open?file=data:...`) | Fails for every slicer except possibly Cura, and is impractical anyway | ElegooSlicer rejects anything not http or https (verified: R11). PrusaSlicer wants https (verified: R9). Bambu Studio's macOS handler insists on http or https (first report S8). The Orca family hands the string on after a prefix check; whether its fetch library takes `data:` was not tested (unverified, probably not). Cura passes the address to a Qt network request; whether that layer fetches `data:` was not tested (unverified; Qt's page does not list schemes, R28), and Cura would still add `.stl` to the name (verified: R15). Size: a link is one command-line argument, and a board STL is hundreds of kilobytes (inferred). Not to be confused with Chrome's block on navigating the browser to a `data:` page, which is a separate rule (verified: R21). |
| **Download, then the OS opens it** | **Works** | After the download, the operating system opens a `.3mf` in whatever program owns the type. Chrome's list of file types it treats as dangerous does not include `.stl`, `.3mf` or `.gcode`; unlisted types get `NOT_DANGEROUS` and `ALLOW_AUTO_OPEN`, so "Always open files of this type" is offered (verified: R7). Nothing leaves the browser. The user does it once per browser, and the slicer must own the type (a setting in PrusaSlicer, OrcaSlicer and ElegooSlicer, off by default in the first two: first report S4, S7; verified: R11 for Elegoo's code path). Firefox and Safari behaviour was not tested (unverified). |
| **File System Access API** (`showSaveFilePicker`) | Does not help | The user picks where the file goes and the page writes it. The page gets a handle with a name, not a full path, and nothing in the API launches another program (inferred from the API's shape; spec not re-read). Support: Chrome 86 and Edge desktop, Chrome for Android 132; not Firefox, not Safari (verified: R6). |
| **Custom scheme pointed at a file the user just saved** (`bambu-connect://import-file?path=...`, or a slicer given a `file:` address) | Fails | The page is never told where a download landed (inferred), and browsers do not let a web page link to a `file:` address (inferred; not re-checked). The user would have to type a path. |
| **Service worker serving the file at an address of the page's own site** | Fails | A service worker answers only requests the browser makes; the slicer's request never goes through the browser (inferred). |
| **Drag the part out of the page into the slicer window** | Unverified, desktop Chrome only at best | Chrome has a non-standard `DownloadURL` drag format that creates a file when dropped on the desktop or a file manager; Safari does not support it (relayed: R27). Whether a blob address works there, and whether a slicer window accepts the dropped item, I could not check. A short test page would settle it. |
| **Local helper program** (a small app the user installs, listening on the machine) | Possible, out of scope | It would be a second product to build, sign and keep updated, and it is not "a static page". Listed because it is the only way to give the slicer bytes without a public address. |
| **Web Share on desktop** | Not for these files | Same allowlist as the phone (section 3); and the Windows share list is not a list of slicers. |

**Conclusion for the question "can a page hand over a file made in the browser": no, other than through the browser's
own download and the operating system's file association.**

### Remembering the user's slicer

What it would take (all of it stays in the browser, so it fits Q355):

- A list of slicers in the code, one entry each (id, display name, scheme, whether it takes https from any host, how to
  turn on its file association). That is the shape the repository already uses for boards and connectors
  (`extension-registry`), so a new slicer is one file and one list entry.
- One `<select>` or a row of buttons: "My slicer: PrusaSlicer / OrcaSlicer / Bambu Studio / Cura / ElegooSlicer /
  Creality Print / Other". The page cannot detect which are installed (section 1), so the user picks.
- `localStorage` under one key, holding only the id. Reads and writes in `try/catch`, because storage can be absent in a
  private window or throw; the page must work without it. `localStorage` is per browser and per site, never sent
  anywhere and not shared between the user's devices (inferred from how browser storage works; no network is involved). No cookie and no request is needed.
- What the choice changes: the help line next to the download buttons names that slicer's setting; the preset
  "Open in ..." button (option B) uses that slicer's scheme; on phones the choice is not used (section 3).

## 3. Phones

### Web Share with files

| Browser | `navigator.share` | `canShare({ files })` | File-type limit |
|---|---|---|---|
| Chrome for Android | from 61 | from 76 (verified: R6) | **Yes**: allowlist of 41 extensions and 28 MIME types, exact match, at most 10 files and 50 MiB (verified: R1, R2, R3) |
| Samsung Internet | mirrors Chrome | from 11.0 (verified: R6) | Chromium-based; the list was not read for Samsung's own build (unverified) |
| Firefox for Android | from 79 (verified: R6) | files **not** supported (verified: R6) | n/a |
| Android WebView | not supported (verified: R6) | not supported | n/a |
| Safari on iOS and macOS | from 12.1 (verified: R6) | files from 14 (verified: R6) | **No allowlist in WebKit's code** (verified: R5) |
| Chrome on Windows and ChromeOS | share with files from 89, on all desktops from 128 (verified: R6) | yes | Same allowlist as Android (verified: R1) |

- **Chrome's allowlist:** extensions include images, audio, video, `.pdf`, `.csv`, `.txt`, `.html` and
  a few others; MIME types include `application/pdf`, `image/*` types, `text/plain`, `text/csv` and video and audio
  types. **`.stl`, `.3mf`, `.gcode`, `.zip` and `.obj` are not on it; neither are `model/stl`, `model/3mf` or
  `application/octet-stream`** (verified: R1, R2, R3; the desktop C++ list and the Android Java list and the shared
  `FILE_TYPES.md` agree). IANA registers `model/stl` and `model/3mf` (verified: R8), but that does not matter to the
  check. A file passes only if both its name and its MIME type are on the list (verified: R1, `Share()` loop).
- **`canShare` does not check the list.** Chromium's `CanShareInternal` returns true when any of title, text, URL or a
  non-empty file list is present, and checks nothing about types (verified: R4). The refusal happens later, in the
  browser process, when `share()` runs (verified: R1, R2). So the page cannot ask first; it has to call `share()` from a
  click and catch the rejection, then fall back to the plain download (inferred from R1, R2, R4). `share()` also needs
  a click (transient user activation) (verified: R5, `Navigator.cpp`).
- **A disguise is not an answer.** A part renamed `.txt` would pass the check and arrive as a text file; I do not
  recommend it.
- **WebKit:** `Navigator.cpp` and `ShareDataReader.cpp` read each file into memory with no type check. The UI process
  writes each file into a temporary folder and takes its type from the file extension, falling back to generic data
  (verified: R5, `WKShareSheet.mm`). Files in `share()` are enabled by default on Apple platforms other than watchOS and
  tvOS (verified: R5, `UnifiedWebPreferences.yaml`). So an iOS share sheet should list "Save to Files", AirDrop and any
  app that declares the type; what shows for `.3mf` depends on the installed apps (inferred; not tried on a device).

### Opening a downloaded file in an app

- **iOS:** a downloaded file sits in the Files app. An app appears under "Open in..." or in the share sheet only if it
  declares that document type in its `Info.plist` (`CFBundleDocumentTypes`) (inferred from how iOS document types work;
  not re-read in Apple's documentation). I could confirm the absence in two apps, below.
- **Android:** after a download, tapping it in the browser's notification or the Files app opens the system chooser for
  that type; an app is offered only if it has a matching `VIEW` or `SEND` intent filter (inferred; not tried).
- **Android intent links** (`intent://...#Intent;scheme=...;package=...;end`) can launch an app from a tapped link, with
  a fallback address, but carry strings, not files (verified: R20, which does not mention files). They need the app to
  publish a browsable scheme; I found none for a slicer.

### The apps

| App | Takes a file from another app? | Source |
|---|---|---|
| Mobileraker (Klipper) | **No.** The Android manifest's `SEND */*` entry is under `<queries>` (what the app may launch), not an `intent-filter`; its only filters are the launcher and a `mobileraker://` sign-in callback. The iOS `Info.plist` exports a G-code type but declares no `CFBundleDocumentTypes`. G-code only anyway | verified: R17, master pushed 3 Oct 2026 |
| OctoPod (OctoPrint, iOS) | **No.** No document types in its `Info.plist` | verified: R18, master pushed 25 Aug 2026 |
| OctoApp (OctoPrint, Android) | Unknown: closed source; search found nothing on share-sheet uploads | unverified |
| Bambu Handy | Probably not: a user's request for opening STEP, STL or 3MF files in Handy and sending them to print, with no sign it was added; Bambu's own pages point Handy at MakerWorld models | relayed: R23 (search summary; thread not opened) |
| Prusa mobile app | Manages files already in Prusa Connect and prints G-code from Printables projects; no local-file import found | relayed: R25 |
| Creality Cloud | Has a slicer; sources conflict on STL-only versus 3MF, and none describes receiving a file from another app | relayed: R24; unverified |
| Elegoo and Anker (AnkerMake) apps | Not looked up | unverified |
| A phone slicer that takes a link | None found | unverified absence |

**For phones, the honest position:** no mobile slicer or printer app is known to accept a mesh from the browser. On iOS
the share sheet gets the file to Files, AirDrop or another computer, which is useful but is not "open my slicer app". On
Android the browser itself will not share these files. A user with a phone slicer opens the downloaded file from the
Files app or the download notification, if the app declares the type, which only that app's owner or a test can show.

## 4. What would send the file to an external service (Q355)

None of the options in sections 1 to 3 uploads anything. These would, and each needs the page to **warn, name the
service and what it receives, and ask for confirmation before the first byte**:

| Route | What it would receive | Needs | Note |
|---|---|---|---|
| **A temporary file host that the slicer then fetches from** (the page uploads the part, gets an https address, and builds `orcaslicer://` / `cura://` / `bambustudio://` links) | The whole STL or 3MF, the user's IP address and whatever the host logs | A host the page may write to: today a server of the owner's (first report, option C), or a third-party file host (I did not test any host's cross-origin rules or terms: unverified) | The only route that gives a custom part a link for OrcaSlicer, ElegooSlicer, Cura (STL only: section 1) and Bambu Studio (one prompt). PrusaSlicer still refuses unless Prusa allowlists the host |
| **Send to SimplyPrint** (`simplyprint.io/panel?import=<url>`) | The address; SimplyPrint's server then downloads the file from it, only from hosts SimplyPrint has approved (first report S32) | The host above, approved by SimplyPrint, and the user's SimplyPrint account | Not a route for a browser-made file by itself |
| **Creality Print's `crealityprintlink://open?file=`** | Goes to Creality's cloud model-download path (verified: R12) | Creality's own file ids | Not a generic file route (inferred) |
| **MakerWorld, Printables, Thingiverse** | Their upload APIs need the user's account (inferred; no public API for a third-party page found) | n/a | Fixed preset files posted there by the owner are a listing decision, not engineering (first report, M) |
| **Cloud slicers and print clouds** (Bambu cloud, Prusa Connect, OctoEverywhere) | The part, and the user's sign-in | Accounts, partner agreements | First report sections 2 and 3: none is open to a static page |

## 5. The options for the owner

Each option says what the user sees, what it costs, and how it keeps Q355. All of A, B and C send nothing from the
page.

### Option A: "My slicer" setting with tailored help (desktop)

- **The user sees:** under the download buttons, a "My slicer" choice. Choosing PrusaSlicer shows, in one or two lines,
  "To open downloads in PrusaSlicer, turn on 'Associate .3mf files' in Preferences; or in Chrome, open the download's
  menu and choose 'Always open files of this type'". The choice persists in that browser.
- **What it costs:** a list of about six slicers, one help string each, one `localStorage` key, one control. No new
  dependency. Each slicer's wording must be kept true as the slicers change; the list is one file and one entry per
  slicer. The help strings are the part most likely to age (inferred).
- **Q355:** fully kept: no request, no cookie, no third party. A `localStorage` value is read only by the page on the
  user's own browser.
- **Limits:** the user does the one-time association; the first click after that opens the file; the page cannot confirm
  it worked.

### Option B: A, plus "Open in <slicer>" for preset sizes (desktop)

- **The user sees:** a button "Open the 240 x 200 mm board in OrcaSlicer" next to the preset list. The browser asks
  "Open OrcaSlicer?" once and offers "Always allow". The slicer opens the model. For Bambu Studio there is one extra
  "not from a trusted site" prompt in the slicer. PrusaSlicer users get the Printables link or the plain download.
- **What it costs:** the preset files published with the Pages build (the build now ships only the site: first report
  S61), a size list, and about four scheme links. A Cura link needs STL files. It breaks silently for users whose slicer
  has no registered scheme, and the page cannot tell them apart from users whose slicer has one (section 1).
- **Q355:** the files are already public and no user data is sent. The slicer, not the page, contacts the host of the
  files, so the user's address is visible to that host. A one-line note beside the button ("Your slicer will download
  this file from alonrr.github.io") would make that plain; I think it is not a Q355 upload, but the owner may prefer to
  treat it as one (inferred).
- **Limits:** presets only; the page's point is custom sizes, which stay on A.

### Option C: A share button where the platform allows it (phones)

- **The user sees:** on a phone, next to the download buttons, a "Share" button. On iOS Safari the sheet opens with the
  file and offers "Save to Files", AirDrop and any app that accepts it. On Chrome for Android the page tries `share()`,
  the browser refuses, and the page quietly offers the plain download with one line: "Open the downloaded file from your
  Files app or the download notification, and choose your slicer app".
- **What it costs:** a click handler with a `try/catch` around `share()` (not `canShare`, which would say yes: section
  3), the fallback text, and a test on a real iPhone and a real Android phone, which I could not do.
- **Q355:** nothing leaves the browser; the share sheet is the operating system's.
- **Limits:** it gets the file to the phone's file layer, not into a slicer; Android gets only guidance.

### Option D: temporary upload so every deep link works for custom parts

- **The user sees:** a confirmation: "This sends your part file to <host> for 15 minutes so that <slicer> can download
  it. Continue?" Then the slicer opens with the part.
- **What it costs:** a server or a third-party host (first report, option C, with its abuse, cost and 10 ms CPU
  findings) and a warning dialog; it still does nothing for PrusaSlicer.
- **Q355:** allowed only with the warning and the confirmation each time, and a note of what the host keeps. It is the
  one option that changes the page's promise from "nothing is sent" to "nothing is sent unless you say so" (inferred).

### Option E: a drag-out test, as a possible later addition

- **The user sees:** a drag handle "Drag this into your slicer" (desktop Chrome only).
- **What it costs:** a short test first (section 2); if it works with blob addresses and with the big slicers' windows it
  is a few lines. If not, nothing is lost.
- **Q355:** nothing leaves the browser.

## 6. Recommendation

1. **Build A.** It is the only route that serves every desktop slicer, including the ones with no scheme, for custom
   parts, with nothing sent. The user's chosen slicer in `localStorage` earns its keep by tailoring the help and, if B is
   built, the link.
2. **Add C**, because it costs little and gives iPhone and iPad users a real hand-off to Files and AirDrop; for Android,
   ship the fallback text. Test on devices before saying more than "should work".
3. **Do B only if presets matter to the owner**; the first report's reasoning stands. Ship OrcaSlicer, ElegooSlicer,
   Bambu Studio and (STL) Cura links, and Printables for PrusaSlicer.
4. **Do not build D** unless the owner decides to change the promise (first report, decision on the promise).
5. **Ask the owner to run the E test** if he wants the drag idea checked: it needs a person with a mouse and the
   installed slicers.

## What I could not verify

- Any slicer's link behaviour on a running machine. Everything above comes from source and from a registry read; no
  scheme was opened.
- Bambu Studio's, SuperSlicer's and Creality Print's Windows installers (who registers their schemes).
- Whether Orca's or Cura's fetch layers take a `data:` address.
- iOS behaviour: nothing was tried on a phone. The share-sheet and "Open in" lists are inferred from the code and from
  how iOS document types work.
- Android's chooser for downloaded `.stl` and `.3mf` files; which Android apps declare those types.
- Firefox and Safari "open after download" behaviour on desktop.
- Bambu Handy, Prusa app, Creality Cloud, OctoApp, Elegoo and Anker apps (closed source).
- Whether `DownloadURL` accepts blob addresses (R27 shows only http examples).
- Whether Samsung Internet's own build has the same allowlist.
- Browser support for `showSaveFilePicker` on Chrome for Android 132 in practice (data from R6 only).

## Sources

All read on 2026-10-24. Source files are cited by repository and the branch or tag read; for the Chromium and WebKit
files the branch was `main` on that day, with no commit recorded.

- **R1** Chromium `chrome/browser/webshare/share_service_impl.cc` (`IsDangerousFilename`, `IsDangerousMimeType`, `Share()`):
  <https://chromium.googlesource.com/chromium/src/+/main/chrome/browser/webshare/share_service_impl.cc>
- **R2** Chromium `components/browser_ui/webshare/android/java/.../ShareServiceImpl.java` (`PERMITTED_EXTENSIONS`,
  `PERMITTED_MIME_TYPES`): <https://chromium.googlesource.com/chromium/src/+/main/components/browser_ui/webshare/android/java/src/org/chromium/components/browser_ui/webshare/ShareServiceImpl.java>
- **R3** Chromium `third_party/blink/renderer/modules/webshare/FILE_TYPES.md`:
  <https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/modules/webshare/FILE_TYPES.md>
- **R4** Chromium `third_party/blink/renderer/modules/webshare/navigator_share.cc` (`CanShareInternal`, lines 73 to 110):
  <https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/modules/webshare/navigator_share.cc>
- **R5** WebKit `Source/WebCore/page/Navigator.cpp`, `Source/WebCore/page/ShareDataReader.cpp`,
  `Source/WebKit/UIProcess/Cocoa/WKShareSheet.mm`, `Source/WTF/Scripts/Preferences/UnifiedWebPreferences.yaml`
  (`WebShareFileAPIEnabled`), all `main`: <https://github.com/WebKit/WebKit>
- **R6** MDN browser-compat-data, `api/Navigator.json` (`share`, `canShare`, `canShare.data.files`) and `api/Window.json`
  (`showSaveFilePicker`), `main`: <https://github.com/mdn/browser-compat-data>
- **R7** Chromium `components/safe_browsing/content/resources/download_file_types.asciipb` (`default_file_type`; no
  entry for `stl`, `3mf` or `gcode`): <https://chromium.googlesource.com/chromium/src/+/main/components/safe_browsing/content/resources/download_file_types.asciipb>
- **R8** IANA, media types, `model` registry (`model/stl`, `model/3mf`): <https://www.iana.org/assignments/media-types/model.csv>
- **R9** PrusaSlicer tag `version_2.9.6`, `src/slic3r/GUI/ConfigWizard.cpp` and `GUI_App.cpp`:
  <https://github.com/prusa3d/PrusaSlicer/tree/version_2.9.6/src/slic3r/GUI>
- **R10** OrcaSlicer tag `v2.4.2`, `src/slic3r/GUI/GUI_App.cpp` and `Downloader.cpp`:
  <https://github.com/OrcaSlicer/OrcaSlicer/tree/v2.4.2/src/slic3r/GUI>
- **R11** ElegooSlicer `main` at 2d507e39a (23 Sep 2026): `src/slic3r/GUI/GUI_App.cpp`, `Downloader.cpp`,
  `src/libslic3r/Utils.hpp`: <https://github.com/ELEGOO-3D/ElegooSlicer>
- **R12** CrealityPrint `master` at 59ae8cbb0 (24 Sep 2026): `src/slic3r/GUI/GUI_App.cpp`, `Downloader.cpp`,
  `src/libslic3r/Utils.hpp`: <https://github.com/CrealityOfficial/CrealityPrint>
- **R13** SuperSlicer `master_27` at 1f3d287e9 (18 Nov 2025): `src/slic3r/GUI/Downloader.cpp`, `GUI_App.cpp`:
  <https://github.com/supermerill/SuperSlicer>
- **R14** Anycubic Slicer Next `main` (last push 3 Feb 2026): `src/slic3r/GUI/GUI_App.cpp`:
  <https://github.com/ANYCUBIC-3D/AnycubicSlicerNext>
- **R15** Cura tag `5.13.0`: `cura/CuraApplication.py`, `packaging/msi/UltiMaker-Cura.wxs.jinja`:
  <https://github.com/Ultimaker/Cura/tree/5.13.0>
- **R16** Bambu Studio tag `v02.08.02.61`, `src/slic3r/GUI/GUI_App.cpp`: <https://github.com/bambulab/BambuStudio>
- **R17** Mobileraker `master` (last push 3 Oct 2026): `android/app/src/main/AndroidManifest.xml`,
  `ios/Runner/Info.plist`: <https://github.com/Clon1998/mobileraker>
- **R18** OctoPod `master` (last push 25 Aug 2026): `OctoPod/Info.plist`: <https://github.com/gdombiak/OctoPod>
- **R19** Chromium `chrome/browser/ui/views/external_protocol_dialog.cc` and `chrome/app/generated_resources.grd`
  (`IDS_EXTERNAL_PROTOCOL_TITLE`, `IDS_EXTERNAL_PROTOCOL_CHECKBOX_PER_ORIGIN_TEXT`):
  <https://chromium.googlesource.com/chromium/src/+/main/chrome/browser/ui/views/external_protocol_dialog.cc>
- **R20** Chrome for Developers, "Android Intents": <https://developer.chrome.com/docs/android/intents>
- **R21** Chrome for Developers, "Deprecations and removals in Chrome 60" (top-frame `data:` navigation):
  <https://developer.chrome.com/blog/chrome-60-deprecations/>
- **R22** Meshy docs, "Lychee Slicer" (relayed): <https://docs.meshy.ai/en/3d-printing/lychee-slicer>
- **R23** Bambu forum, "Slice and send to printer directly from Bambu Handy" (from a search summary, not opened):
  <https://forum.bambulab.com/t/slice-and-send-to-printer-directly-from-bambu-handy/101524>
- **R24** All3DP, "Creality Cloud App" and the Creality forum, "How to Upload .3MF Files to Creality Cloud?" (from search
  summaries, not opened): <https://all3dp.com/2/creality-cloud-app/> ;
  <https://forum.creality.com/t/how-to-upload-3mf-files-to-creality-cloud/22430>
- **R25** Prusa blog, "Prusa mobile app for Android and iOS" (from a search summary, not opened):
  <https://blog.prusa3d.com/prusa-mobile-app-for-android-and-ios_102881/>
- **R26** Local probe, 24 Oct 2026, on a Windows machine: registry keys for the schemes and file types named in section 1,
  read only (a PowerShell `Test-Path` on `HKEY_CLASSES_ROOT\<scheme>` and the `.3mf`, `.stl`, `.gcode` default values).
- **R27** Case study "Drag and Drop Download in Chrome" and a WHATWG list proposal for `DownloadURL` (from search
  summaries, not opened): <https://web.dev/case-studies/box-dnd-download> ;
  <https://lists.whatwg.org/pipermail/whatwg-whatwg.org/2009-August/064395.html>
- **R28** Qt, `QNetworkAccessManager` (names only http and https): <https://doc.qt.io/qt-6/qnetworkaccessmanager.html>
