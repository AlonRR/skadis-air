# Sending a Skadis Air part to the user's printer

Research report, 23 Oct 2026, by an agent, for the owner's question: "look into how to upload the print to the user
printer. or maybe it should be a different site or maybe someone already developed an easy connect tool or library."
Nothing was built from it; its questions are D354 and Q355 in [`status.md`](../status.md). Every source was read on
23 Oct 2026; the list at the end gives the URL and, for source code, the exact release tag or commit read. Tags: **(verified: S#)** means I read it in that source; **(inferred)** is my
reasoning from verified facts; **(relayed: S#)** is someone else's report I could not check myself; **(unverified)** is
a gap.

## Short answer

A file that exists only inside the browser cannot be handed to anything else. Every "open in slicer" link
(PrusaSlicer, OrcaSlicer, Bambu Studio, Cura) and SimplyPrint's import link takes an **https address that the other
program downloads by itself** (verified: S1, S5, S8, S9, S32). Bambu Connect takes a **path on the user's disk to a file
that is already sliced** (verified: S11). Every printer interface takes **G-code, not a mesh**, OctoPrint excepted
when a slicing plugin is installed (verified: S13, S23, S25, S11). So, with the page as it is (static, no server, nothing uploaded), the honest options are:

- **Make the download open in the slicer by itself.** The user turns on the slicer's file association once; after
  that, clicking the finished download opens it in the slicer. No code, nothing leaves the browser, works for every
  slicer and every printer. This is the recommendation for now.
- **One-click "open in slicer" only for fixed preset sizes**, by publishing those files as ordinary public files next
  to the page. It works today in OrcaSlicer and Cura with no prompt and in Bambu Studio after one "not from a trusted
  site" prompt; PrusaSlicer refuses any site Prusa has not allowlisted (verified: S1, S5, S8, S9). Custom sizes stay
  download-only.
- **For custom sizes, anything one-click needs either a server** (the file, or at least the settings, leave the
  browser, so the "nothing is sent" promise has to change) **or a slicer inside the page**, which then reaches only
  OctoPrint and Klipper printers whose owners switch on cross-origin access. Prusa's PrusaLink sends no CORS headers
  at all and Bambu's printers speak protocols a web page cannot use, so neither can be reached from the page
  (verified: S14, S15, S16, S11, S27).

Nobody already offers a "send this to my printer" library that works from a static page without uploading. The closest
ready-made service is **Send to SimplyPrint**: a link or button, no API key, but SimplyPrint's server downloads the file
from a host it has approved, and the user needs a SimplyPrint account with the printer connected (verified: S32).

## Why this is hard: the chain from a mesh to a print

1. The page makes a **mesh** (STL or 3MF).
2. A **slicer** turns the mesh into **G-code** for one printer, one nozzle and one filament. That needs the printer's
   and filament's profiles, which the user keeps in their own slicer.
3. The G-code reaches the **printer**: by USB stick, by the printer's local network interface (PrusaLink, OctoPrint,
   Moonraker, Bambu LAN), or through a cloud (Prusa Connect, Bambu Cloud, SimplyPrint, OctoEverywhere).

The page can do step 1 alone. "Send to printer" means either handing the mesh to the user's own slicer (step 2 stays
with the user, with their profiles), or doing step 2 in the page and then step 3.

## The options at a glance

"Leaves the browser" asks whether the part file (or the settings that make it) goes to any server.

| Option | What it takes to build | What the user does | Printers | Leaves the browser? | Effort | Main risks |
|---|---|---|---|---|---|---|
| **A. Download, opened by the slicer** | A help line next to the download buttons | Once: turn on "associate .3mf / .stl files" in the slicer, or tell the browser to always open that file type. Then click the download | All, through their own slicer | No | Very small | The user must do the one-time setting; the slicer's own association setting defaults to off in PrusaSlicer and OrcaSlicer (verified: S4, S7); what their installers register was not checked (unverified) |
| **B. "Open in slicer" for preset files** | Publish the preset STL/3MF files with the page (Pages now ships only the site, verified: S61); add `orcaslicer://`, `cura://`, `bambustudio://` links | Click the link; Bambu Studio asks once per link whether to trust the site | All, through OrcaSlicer, Cura or Bambu Studio. PrusaSlicer only after Prusa allowlists the domain | No (the files are public already) | Small to medium | Covers presets only. The slicer must be installed with its URL handler. PrusaSlicer users go to the Printables listing instead |
| **C. "Open in slicer" for custom parts via an upload** | A server that stores each built file for a few minutes at an https address, or that builds the part from the settings in the address | Click the link | As B | **Yes**, the file or its settings | Medium, plus hosting | Breaks the promise; an open upload endpoint is a free file host for abusers; costs; Workers Free allows 10 ms CPU per request, a board takes 0.67 to 2.1 s (verified: S59, S61) |
| **D. Send to SimplyPrint** | A link `https://simplyprint.io/panel?import=<file URL>` or their button script, plus host approval from SimplyPrint | Sign in to SimplyPrint, then slice in its cloud slicer or queue | Whatever the user has connected to SimplyPrint: Prusa (PrusaLink/Prusa Connect), Bambu (through the SimplyPrint Client app), Klipper, OctoPrint (verified: S35) | Yes, SimplyPrint downloads the file | Small (link) once approved | Needs B's public files or C's server; free plan 2 printers and 15 cloud slices a month (verified: S34) |
| **E. Slice in the page, download G-code** | A WebAssembly slicer (three-slicer, OrcaWasm, Kiri:Moto) plus printer and filament profiles | Choose printer and filament in the page, download G-code | Those whose profiles the page carries | No | Large | AGPL code in the page; the page becomes responsible for print settings; young libraries |
| **F. E, then send to OctoPrint or Moonraker on the LAN** | E, plus an upload form with the printer's address and API key | Switch on CORS in OctoPrint (`allowCrossOrigin`) or Moonraker (`cors_domains`), paste address and key, accept the browser's local-network prompt | OctoPrint and Klipper machines only | No (LAN only) | Large | API key typed into a web page; works only with an IP address or `.local` name; Firefox behaviour unclear |
| **G. PrusaLink direct** | Not possible from the page | n/a | n/a | n/a | n/a | PrusaLink sends no CORS headers (verified: S14, S15, S16) |
| **H. Prusa Connect** | Not possible: no public upload API found | n/a | n/a | n/a | n/a | Only a camera API is documented (verified: S31) |
| **I. Bambu Lab direct** | Not possible from the page | n/a | n/a | n/a | n/a | LAN control is MQTT and FTP over TLS; Bambu Connect wants a disk path to a sliced file (verified: S11, S12) |
| **J. USB cable (Web Serial)** | E, plus a G-code streamer over Web Serial | Plug in USB, pick the port, keep the tab open for the whole print | Printers that take G-code over USB serial | No | Large | A closed tab or a sleeping laptop stops the print; no maintained library found |
| **K. OctoEverywhere App Connections** | Developer agreement with OctoEverywhere, then their relay | Sign in to OctoEverywhere; needs its paid Supporter Perks (verified: S37) | OctoPrint, Klipper, Bambu Lab, PrusaLink, Elegoo (verified: S37) | Yes, through their relay | Medium | A paid account for the user; still needs G-code, so E as well |
| **L. Generator on MakerWorld** | Rewrite the geometry in OpenSCAD or Fusion 360 | Customise on MakerWorld, download 3MF | Bambu users mainly | Yes (it is their site) | Very large | Contradicts D2; two codebases to keep equal |
| **M. Preset files on model sites** | Upload preset 3MFs (MakerWorld) or pre-sliced G-code (Printables) | Use the site's own print button | Bambu (MakerWorld one-step printing), Prusa printers in Prusa Connect (Printables) | Yes, but only fixed files the owner chose | Small per file | Presets only; each G-code is for one printer and filament |

## 1. Handing the file to the user's slicer

### What each slicer accepts

| Slicer (version read) | Link format | What it does with the address | Domain check |
|---|---|---|---|
| PrusaSlicer 2.9.6 | `prusaslicer://open?file=<url>` or `prusaslicer://open/?file=<url>` (verified: S1) | Downloads the file itself | Must be `https://` and on an allowed domain: `printables.com`, `testprusaverse.com`, `thingiverse.com`, `cults3d.com` in the 2.9.6 release; `printables.com` and `thingiverse.com` in today's master (verified: S1, S2). Prusa adds domains "following a brief security review", on request by email or a GitHub issue (verified: S3). The feature has existed since 2.6.0 (verified: S3) |
| OrcaSlicer 2.4.2 | `orcaslicer://open?file=<url>`; its downloader also accepts the `prusaslicer://`, `bambustudio://` and `cura://` forms when handed one (verified: S5) | Downloads the file itself | **None.** The scheme is checked and the file downloaded; `is_subdomain` is defined but never called on this path (verified: S5, S6). Orca registers `orcaslicer://` with Windows itself (verified: S6) |
| Bambu Studio 02.08.02.61 | `bambustudio://open?file=<url>` (verified: S8) | Downloads the file itself | Addresses from `makerworld…`, `public-cdn.bblmw.com`, or containing `amazonaws.com` or `aliyuncs.com` open directly; anything else gets the prompt "This file is not from a trusted site, do you want to open it anyway?" (verified: S8). The macOS handler also insists on http or https (verified: S8) |
| Cura 5.13.0 | `cura://open?file=<url>` or `slicer://open?file=<url>` (verified: S9) | Downloads the file itself | **None** in the handler (verified: S9). The Windows installer registers both schemes as an optional "URL Protocols" feature (verified: S10), selected by default (inferred: its install level is 1) |
| Bambu Connect (beta) | `bambu-connect://import-file?path=<absolute disk path>&name=<name>&version=1.0.0` (verified: S11) | Opens a file already on disk | Takes only a sliced `.gcode.3mf` (verified: S11) |

### Can a page whose file is only a browser blob use them?

**No.** A `blob:` address exists only inside the browser that made it; the slicer is a separate program that fetches
the address over the network, so it cannot read a blob (inferred, from S1, S5, S8, S9: each fetches over HTTP). Bambu
Connect needs a path on disk, and a web page is never told where the browser saved a download (inferred).

Passing the whole file inside the link as a `data:` address is untested and I do not recommend it: none of the
handlers documents it, and link-length limits are unknown (unverified).

### The least that would make it work

- **For files that are already public** (preset sizes published with the page, or the files on the Printables
  listing): nothing is uploaded, so the promise holds. The page today publishes only the site, not part files
  (verified: S61), so the preset files would have to be added to the Pages build. OrcaSlicer and Cura take them as is;
  Bambu Studio after one prompt; PrusaSlicer not until Prusa allowlists `alonrr.github.io` (verified: S1, S3).
  Whether Prusa allowlists a `github.io` sub-domain is unknown (unverified). PrusaSlicer users can already use the
  Printables listing's "Open in PrusaSlicer" button for the files posted there (verified: S3).
- **For custom parts:** the file must sit at a public https address for at least the minutes it takes the user to
  click. That is an upload, so **the "nothing is sent to a server" promise would no longer be true** and must change.
  Two forms:
  - *Temporary upload*: the page uploads the finished file; a store deletes it after some minutes. Anyone could use the
    endpoint as a free file host unless it checks size and type and limits the rate (inferred).
  - *Build from the settings*: the link carries the settings (`?board=…&width=…`), and a small server function builds
    the part on request with the same library. No file is stored and nothing but Skadis parts can come out of it, so it
    is not a free file host (inferred). Only the settings leave the browser, but that is still "sent". The library
    runs in Node already (its tests do, per the repo's CLAUDE.md). A board takes 0.67 to 2.1 s to build (verified:
    S61), far beyond the 10 ms CPU per request of Cloudflare's free plan; its paid plan allows 30 s by default
    (verified: S59). Other hosts were not checked.

## 2. Sending to the printer directly from the browser

### The browser rules that apply to every local printer

- **Mixed content and local-network permission.** An https page normally may not call an `http://` address. Chrome
  142 added a "local network access" prompt; once the user allows it, requests to a **private IP address written as
  numbers or a `.local` name** are exempt from the mixed-content block. A normal domain name that happens to point at
  the LAN is not exempt (verified: S18, S19). Firefox is rolling out its own local-network permission, for all users
  from Firefox 151 (relayed: S20); whether Firefox also lifts the mixed-content block for such requests I could not
  find (unverified).
- **CORS still applies.** The permission replaces the old "device must answer a preflight" design (verified: S19); it
  does not let a page read a reply that lacks `Access-Control-Allow-Origin` (inferred: the explainer changes the
  permission step only; the server must still opt in, verified: S21). An upload with an API key header, a `PUT`, or
  digest authentication is not a "simple" request, so the printer must answer the browser's preflight too (verified:
  S21).
- **No raw sockets.** A web page has HTTP, WebSocket and a few others, but not plain TCP or TLS. Chrome's Direct
  Sockets API exists only for Isolated Web Apps, not for ordinary pages (verified: S27).

### PrusaLink (built into the printer firmware on newer Prusas, a Raspberry Pi package for older ones: inferred from S15, S16)

- **API**: `PUT /api/v1/files/{storage}/{path}` with the file as the body, headers `Print-After-Upload: ?1` and
  `Overwrite: ?1`, protected by HTTP digest authentication (verified: S13). Some printers also offer an API key
  (unverified: mentioned in a forum thread found by search, not opened).
- **CORS**: none. Prusa's own developer wrote in April 2023 "we not set any CORS headers at this moment"; the issue
  is still open (verified: S14). The printer firmware's web server (Buddy firmware v6.9.2, `lib/WUI`) contains no
  `Access-Control` header anywhere, and neither does the Raspberry Pi PrusaLink at its latest commit (verified: S15,
  S16, by text search of the source). A forum moderator told a Core One owner the API is compiled into the firmware and
  cannot be reconfigured without a custom firmware image (verified: S17).
- **Verdict**: a web page cannot upload to PrusaLink, whatever the user sets (inferred, from the above). The page also
  cannot make G-code today. For the owner's own MK3S, the upload scripts in the 3d-printing repository stay the route.

### Prusa Connect (Prusa's cloud)

- The only documented public API I found is the **camera API**, for third-party cameras to post snapshots (verified:
  S31). PrusaSlicer talks to Connect after the user signs in to their Prusa account inside the slicer, and can send
  G-code from its Printables tab only when the G-code was sliced for the same printer (verified: S29).
- **How Printables does it**: on the Printables website, the "Print" button on a G-code file opens Prusa Connect, and
  one user found a signed Google Cloud Storage link valid for 120 s appended to the file name (relayed, single report,
  June 2025: S30). That looks like a private Printables-to-Connect hand-off, not something offered to other sites
  (inferred). No partner programme was found (unverified absence).

### OctoPrint (OctoPrint 1.11.8, released 23 Jun 2026, verified: S62)

- **Upload**: `POST /api/files/local`, `multipart/form-data`, form fields `file`, and optionally `select` and `print`
  (`print=true` starts the job) (verified: S23).
- **Auth**: an API key in the `X-Api-Key` header, or as a Bearer token; a `?apikey=` query parameter exists "for
  testing purposes" (verified: S22).
- **CORS**: off until the user sets `api.allowCrossOrigin: true` in `config.yml` or ticks it in the API settings
  (verified: S22).
- **File types**: G-code; STL only if a slicing plugin is installed and enabled, through a separate `slice` command
  (verified: S23).
- **User sets up**: CORS on, an API key, and an address the browser treats as local (IP or `.local`). **Printers**:
  anything OctoPrint drives over USB, Prusa MK3S included (inferred). **Security**: the key is typed into a public page and
  kept in that browser; a malicious page with that key could start prints (inferred). Turning on CORS lets any site
  the user permits call the printer with a key (inferred).

### Moonraker / Klipper

- **Upload**: `POST /server/files/upload`, `multipart/form-data`, field `file`, optional `root` (`gcodes`), `path`,
  `checksum`, and `print=true` to start (verified: S25).
- **CORS**: off unless `cors_domains` is set in the `[authorization]` section; wildcards are allowed except in the top
  level domain, and `*` is "reserved for client developers" (verified: S24). API key authentication is on by default
  (`enable_api_key`); `trusted_clients` lists IP ranges that get full access (verified: S24).
- **User sets up**: add `https://alonrr.github.io` to `cors_domains`, supply a key or trust the browser's IP.
  **Printers**: Klipper machines. **Security**: as OctoPrint.
- Moonraker has no tagged releases since v0.1.0 (2020) but is pushed to daily (verified: S62).

### Bambu Lab

- Bambu printers now require authorisation for starting a print from anything other than Bambu Studio, in both cloud
  and normal LAN mode; starting a print from other software "will require Bambu Connect" (verified: S11).
- **Developer Mode** (only with LAN Only mode, so no Bambu Cloud) restores the old open behaviour: it "will open the
  MQTT channel, live stream, and FTP" (verified: S12). MQTT and FTP over TLS are not available to a web page (verified:
  S27, inferred for Bambu).
- **Bambu Connect** accepts `bambu-connect://import-file?path=…` for a sliced `.gcode.3mf` on disk (verified: S11).
- **Bambu Local Server SDK** is for enterprise partners, by application (verified: S11).
- No public cloud API for third parties was found (unverified absence).
- **Verdict**: not reachable from the page. Bambu users are best served by `bambustudio://open?file=` for public files
  (one prompt), or by a MakerWorld listing (section 4).

### USB cable: the Web Serial API

- Available in Chrome and Edge 89+ on desktop, Chrome for Android 148+, Firefox 151+; not in Safari (verified: S26).
  Needs https and a click to choose the port (verified: S26).
- A G-code streamer must send one line, wait for the firmware's `ok`, and repeat, for hours (relayed: general
  articles found by search). I found no maintained library for this: the one dedicated project, `browserGcodeSender`,
  was last pushed in January 2022 with 4 stars (verified: S28).
- **Practical problem**: the print lives and dies with the browser tab (inferred). Also needs G-code, so option E too.

## 3. Existing tools, services and libraries

### Cloud print services

| Service | What a website can do | Notes |
|---|---|---|
| **SimplyPrint** | **Send to SimplyPrint**: a link `https://simplyprint.io/panel?import=<https file URL>&filename=…`, or their `button.js` script or iframe; "no API key, no OAuth client and no SimplyPrint account on your side" (verified: S32) | SimplyPrint's servers download the file, only from **approved hosts**; https, no auth, up to 1 GB, STL, 3MF, OBJ, STEP or G-code. They "don't approve hosts where anyone can upload files (GitHub raw, Google Drive, Dropbox, Discord)" and approve shared hosts only for your own path (verified: S32). Used by Printpal and Tinkercad (verified: S32). User needs an account; free plan 2 printers, 15 cloud slices a month (verified: S34). Has a cloud slicer, so an STL can be sliced there (verified: S36, S34). A full OAuth2 API exists for approved partners (verified: S32); the API-key API needs SimplyPrint's Pro plan or above (verified: S33) |
| **OctoEverywhere** | **App Connections**: an OAuth-style portal gives an app a relay address and credentials for the user's printer, uploads included (verified: S37) | Requires the printer owner to have paid Supporter Perks; access by contacting their developers (verified: S37) |
| **Obico** | No documented "send from a website" API found (unverified absence). Upload through its own web interface (relayed, 2020: S39) | Server is open source, AGPL-3.0, pushed 21 Oct 2026 (verified: S38) |
| **3DPrinterOS** | A Thingiverse app that uploads to the user's account (relayed: S40); no public web API found (unverified) | Cloud slicing (relayed) |
| **Polar Cloud** | Advertises an enterprise API (relayed: S41) | Education focus; still listed as active (relayed: S41) |
| **AstroPrint** | Had a "Print with AstroPrint" Thingiverse app (relayed: S42) | Current state unknown (unverified) |

### Browser slicers

| Library | Licence | State (verified: S46 to S50, S62) | Fit |
|---|---|---|---|
| **Kiri:Moto** (Grid.Space) | MIT | Release 4.7.3 on 16 Aug 2026; pushed 22 Oct 2026; 924 stars | Can be embedded in an iframe and driven by messages, or its engine loaded as a script: `load(url)`, `parse(STL data)`, `setDevice`, `slice`, `prepare`, `export` (verified: S43). Sends to OctoPrint only through a Grid.Space OctoPrint plugin that checks in with a Grid.Space cloud endpoint (verified: S44; relayed, 2020: S45). Uses its own printer profiles, not the vendors' (inferred) |
| **three-slicer** (OrcaSlicer engine port) | AGPL-3.0-or-later (viewer package MIT) | 0.3.5 on 16 Oct 2026; first published 6 Aug 2026; 19 MB unpacked; repository 31 stars | Ships OrcaSlicer's printer, process and filament presets; STL, OBJ, 3MF in, G-code out; runs single-threaded on a page without cross-origin isolation, multi-threaded only with COOP/COEP headers (verified: S48) |
| **OrcaWasm** | AGPL-3.0 | Created June 2026, pushed 8 Oct 2026, 1 star | Requires `SharedArrayBuffer` and a cross-origin isolated page (verified: S50) |
| Other OrcaSlicer WebAssembly builds | AGPL-3.0 | Several created between Sep and Oct 2026, 0 to 3 stars (verified: S49 search) | Too young to judge |
| **cura-wasm** (CuraEngine) | MIT and LGPL-3.0 and AGPL-3.0 (as declared) | Last release 1.5.2 in Jan 2021; repository archived (verified: S47) | Unmaintained |
| PrusaSlicer in WebAssembly | n/a | None found on npm or GitHub (unverified absence) | n/a |

**Hosting note.** GitHub Pages cannot send the COOP/COEP headers; the usual workaround is the `coi-serviceworker`
script, which reloads the page once and can break cross-origin resources (relayed: S51, S52). three-slicer still runs
without them, single-threaded (verified: S48).

**Licence note (the page's code is MPL-2.0).** MPL-2.0 names AGPL-3.0 as a "Secondary License" and allows a "Larger
Work" combining MPL code with AGPL code, provided the MPL files are not marked "Incompatible With Secondary Licenses"
(verified: S53). This repository's files carry no such mark: the phrase appears only in the licence texts (verified:
search of the repository). In plain words: the page with an AGPL slicer inside is allowed, and the combined page must
honour AGPL, chiefly by offering its full source to every user. The repository is public, so that is already met
(inferred). The STL files users make are unaffected (inferred). Kiri:Moto, being MIT, raises no such question.

## 4. "Maybe it should be a different site"

- **MakerWorld's Parametric Model Maker**, launched in May 2024 as an OpenSCAD tool (verified: S57), runs creators'
  **OpenSCAD** files (published as a `.scad` instead of a `.3mf`) and, since v1.0.0, **Fusion 360** files (verified:
  S54, S55). Users change the parameters and "download a
  printable 3mf file" (verified: S54). Only MakerWorld's installed libraries and fonts are allowed (relayed: S54);
  there is no official documentation page (relayed: S56). No TypeScript or JavaScript generator is accepted
  (inferred: S54 and S55 name only OpenSCAD and Fusion 360). **Offering Skadis Air there means rewriting the geometry in
  OpenSCAD (ruled out by D2) or in Fusion 360, and keeping the two equal by hand** (inferred).
- **MakerWorld one-step printing** slices in Bambu's cloud and sends to the printer from the Bambu Handy app, from the
  model's print profile (verified: S58). Fixed preset 3MFs posted there would get this for Bambu users without any
  change to the generator (inferred).
- **Printables** has no customiser (unverified absence, search found none). It has "Open in PrusaSlicer" for the files
  on a listing (verified: S3), and a "Print" button for G-code files that opens Prusa Connect (relayed: S30). Posting
  pre-sliced G-code for common printers on the existing listing would let Prusa owners press "Print" for those presets
  (inferred); each G-code is valid only for the printer and filament it was sliced for (verified: S29).

## Recommendation, on the merits

1. **Do A now: make the download open in the slicer.** Next to the download buttons, one line: "To open downloads
   straight in your slicer, turn on '.3mf files' in its preferences (PrusaSlicer, OrcaSlicer), or tell your browser to
   always open .3mf files." It reaches every slicer and every printer, uses the user's own profiles (the part prints as
   their slicer would print anything), keeps the promise, and costs a sentence. In Chrome the option is "Always open
   files of this type" on the download's menu, greyed out for types Chrome considers dangerous (relayed: S60, third-party
   guides). Nothing to wait for.
2. **Consider B for the preset sizes.** Publish the preset files with the page and add three links: OrcaSlicer, Cura,
   Bambu Studio. For PrusaSlicer, link the Printables listing, which already has the button. Nothing to wait for,
   except PrusaSlicer's own link, which waits on Prusa's allowlist review (time not stated by Prusa, S3). Its merit
   depends on how many visitors take presets rather than custom sizes; the page's point is custom sizes, and those stay
   on A.
3. **Do not build the in-page slicer and LAN send (E, F, J) now.** On merit: it does not reach PrusaLink or Bambu
   printers at all (verified blocks above); it moves print settings into the page, where a wrong profile becomes the
   page's fault (inferred); the only maintained engine with vendor presets is two months old (three-slicer, first
   published 6 Aug 2026, available today); and it adds an AGPL obligation (met, but real). Kiri:Moto is mature and MIT
   but uses its own profiles.
4. **One-click for custom sizes needs a decision about the promise first.** If the owner is willing to say "only your
   settings are sent, to build the file", the cleanest form is the build-from-settings endpoint (C) plus Send to
   SimplyPrint (D) and the OrcaSlicer, Cura and Bambu Studio links. It needs a paid serverless plan (a board takes
   0.67 to 2.1 s; free plans like Cloudflare's allow 10 ms) and SimplyPrint's host approval (time not stated, S32).
   PrusaSlicer would still need Prusa's allowlist.
5. **MakerWorld as the generator's home: no**, on the merits of D2 and a second codebase. Posting preset 3MFs there
   (M) is a listing decision, not engineering, and gives Bambu owners one-step printing.

### Decisions this leaves for the owner (asked as D354 and Q355, 23 Oct 2026)

- Keep the "nothing is sent to a server" promise strictly, or allow "only your settings are sent"? This decides C, D
  and K.
- Is a one-click open for **preset sizes only** worth publishing those files with the page (B)?
- Write to Prusa to allowlist `alonrr.github.io` for PrusaSlicer's link? Only useful with B or C.
- Post presets on MakerWorld (3MF) or pre-sliced G-code on Printables (M)?

### Not verified, worth knowing

- Firefox's handling of mixed content for local-network requests (S20 covers the permission only).
- Whether Prusa would allowlist a `github.io` sub-domain, and whether SimplyPrint would approve it.
- How Printables hands G-code to Prusa Connect (one user report, S30).
- None of the URL handlers was tried on a real machine; every statement about them comes from reading their source at
  the tags listed below.

## Sources

All read on 2026-10-23.

- **S1** PrusaSlicer `src/slic3r/GUI/Downloader.cpp` at tag `version_2.9.6` (released 2026-06-25), line 171:
  <https://github.com/prusa3d/PrusaSlicer/blob/version_2.9.6/src/slic3r/GUI/Downloader.cpp>
- **S2** Same file on `master`, lines 155-175: <https://github.com/prusa3d/PrusaSlicer/blob/master/src/slic3r/GUI/Downloader.cpp>
- **S3** Prusa help, "Opening models in PrusaSlicer from supported websites":
  <https://help.prusa3d.com/article/opening-models-in-prusaslicer-from-supported-websites_399198>
- **S4** PrusaSlicer `src/libslic3r/AppConfig.cpp` at `version_2.9.6`, lines 96-99:
  <https://github.com/prusa3d/PrusaSlicer/blob/version_2.9.6/src/libslic3r/AppConfig.cpp>
- **S5** OrcaSlicer `src/slic3r/GUI/Downloader.cpp` at tag `v2.4.2` (released 2026-07-07), lines 145-170:
  <https://github.com/OrcaSlicer/OrcaSlicer/blob/v2.4.2/src/slic3r/GUI/Downloader.cpp>
- **S6** OrcaSlicer `src/slic3r/GUI/GUI_App.cpp` and `DownloaderFileGet.cpp` at `v2.4.2` (`start_download`,
  `associate_url`, `is_subdomain` defined at FileGet line 38 and not called):
  <https://github.com/OrcaSlicer/OrcaSlicer/blob/v2.4.2/src/slic3r/GUI/GUI_App.cpp>
- **S7** OrcaSlicer `src/libslic3r/AppConfig.cpp` at `v2.4.2`, lines 132-139:
  <https://github.com/OrcaSlicer/OrcaSlicer/blob/v2.4.2/src/libslic3r/AppConfig.cpp>
- **S8** Bambu Studio `src/slic3r/GUI/GUI_App.cpp` at tag `v02.08.02.61` (released 2026-08-21), lines 1125-1165 and
  7660-7705: <https://github.com/bambulab/BambuStudio/blob/v02.08.02.61/src/slic3r/GUI/GUI_App.cpp>
- **S9** Cura `cura/CuraApplication.py` at tag `5.13.0` (released 2026-05-28), line 287 and lines 1843-1890:
  <https://github.com/Ultimaker/Cura/blob/5.13.0/cura/CuraApplication.py>
- **S10** Cura `packaging/msi/UltiMaker-Cura.wxs.jinja` at `5.13.0`, lines 135-241:
  <https://github.com/Ultimaker/Cura/blob/5.13.0/packaging/msi/UltiMaker-Cura.wxs.jinja>
- **S11** Bambu Lab wiki, "Third-party integration" (page updated 2026-03-18):
  <https://wiki.bambulab.com/en/software/third-party-integration>
- **S12** Bambu Lab wiki, "Enable Developer Mode" (page updated 2025-10-15):
  <https://wiki.bambulab.com/en/knowledge-sharing/enable-developer-mode>
- **S13** PrusaLink OpenAPI spec, `spec/openapi.yaml` on `master`, lines 241-330 and 1700-1703:
  <https://github.com/prusa3d/Prusa-Link-Web/blob/master/spec/openapi.yaml>
- **S14** Prusa-Link-Web issue #391, "Access-Control-Allow-Origin: *", opened 2023-04-13, still open:
  <https://github.com/prusa3d/Prusa-Link-Web/issues/391>
- **S15** Prusa-Firmware-Buddy at tag `v6.9.2` (released 2026-10-07), `lib/WUI`: no `Access-Control` string (text
  search of a sparse clone): <https://github.com/prusa3d/Prusa-Firmware-Buddy/tree/v6.9.2/lib/WUI>
- **S16** Prusa-Link (Raspberry Pi) at commit `c42de4b` (2026-10-14): no `Access-Control` or CORS in any `.py` file;
  latest release 0.8.1, 2024-07-02: <https://github.com/prusa3d/Prusa-Link>
- **S17** Prusa forum, "Enable SSH to fix CORS issues for Prusa Link" (Core One+, posts 16-18 Jan 2026):
  <https://forum.prusa3d.com/forum/prusa-core-one-hardware-firmware-and-software-help/enable-ssh-to-fix-cors-issues-for-prusa-link>
- **S18** Chrome for Developers, "New permission prompt for Local Network Access" (2025-06-09, updated 2025-09-29 for
  Chrome 142): <https://developer.chrome.com/blog/local-network-access>
- **S19** Local Network Access explainer, `explainer.md`:
  <https://github.com/explainers-by-googlers/local-network-access/blob/main/explainer.md>
- **S20** Mozilla support, "Control personal device and local network permissions in Firefox":
  <https://support.mozilla.org/en-US/kb/control-personal-device-local-network-permissions-firefox>
- **S21** MDN, "Cross-Origin Resource Sharing (CORS)": <https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS>
- **S22** OctoPrint docs, "General information" (API key, CORS):
  <https://docs.octoprint.org/en/master/api/general.html>
- **S23** OctoPrint docs, "File operations": <https://docs.octoprint.org/en/master/api/files.html>
- **S24** Moonraker docs, "Configuration", `[authorization]`: <https://moonraker.readthedocs.io/en/latest/configuration/>
- **S25** Moonraker docs, "File manager" API: <https://moonraker.readthedocs.io/en/latest/external_api/file_manager/>
- **S26** MDN, "Web Serial API", and its compatibility data `api/Serial.json` (mdn/browser-compat-data, `main`):
  <https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API> ;
  <https://github.com/mdn/browser-compat-data/blob/main/api/Serial.json>
- **S27** Chrome for Developers, "Direct Sockets" (Isolated Web Apps): <https://developer.chrome.com/docs/iwa/direct-sockets>
- **S28** `Autodrop3d/browserGcodeSender` (last push 2022-01-08): <https://github.com/Autodrop3d/browserGcodeSender>
- **S29** Prusa help, "Printables in PrusaSlicer": <https://help.prusa3d.com/article/printables-in-prusaslicer_822448>
- **S30** Prusa forum, "Gcode Files from Printables are broken if you use the Print Button" (25 Jun 2025):
  <https://forum.prusa3d.com/forum/bugs-errors/gcode-files-from-printables-are-broken-if-you-use-the-print-button/>
- **S31** Prusa help, "Prusa Connect - Camera API": <https://help.prusa3d.com/article/prusa-connect-camera-api_569012>
- **S32** SimplyPrint API reference, sections "Send to SimplyPrint" and "Using OAuth2": <https://apidocs.simplyprint.io/>
- **S33** SimplyPrint, "API" feature page: <https://simplyprint.io/features/api>
- **S34** SimplyPrint pricing: <https://simplyprint.io/pricing>
- **S35** SimplyPrint, "Setup methods": <https://simplyprint.io/setup-guide/methods>
- **S36** SimplyPrint help, "The SimplyPrint integrations" (updated 11 Jul 2026):
  <https://help.simplyprint.io/en/article/the-simplyprint-integrations-connect-your-cad-slicer-and-automation-tools-1980dmd/>
- **S37** OctoEverywhere docs, "App Connections overview": <https://docs.octoeverywhere.com/app-connections/overview/>
- **S38** `TheSpaghettiDetective/obico-server` (AGPL-3.0, pushed 2026-10-21): <https://github.com/TheSpaghettiDetective/obico-server>
- **S39** Obico blog, "Remote G-code upload and printing" (2020-01-08):
  <https://www.obico.io/blog/2020/01/08/remote-g-code-upload-and-printing/>
- **S40** Thingiverse app "3D Print with 3DPrinterOS" (from search results only):
  <https://www.thingiverse.com/apps/3d-print-with-3dprinteros/>
- **S41** Polar Cloud, Wikipedia and Polar enterprise page (from search results only):
  <https://en.wikipedia.org/wiki/Polar_Cloud> ; <https://polar3d.com/solutions/enterprise>
- **S42** Thingiverse app "Print with AstroPrint" (from search results only): <https://www.thingiverse.com/app:1547/instructions>
- **S43** Kiri:Moto docs, "API, CLI, Embedding": <https://docs.grid.space/kiri-moto/apis>
- **S44** Kiri:Moto docs, "OctoPrint": <https://docs.grid.space/kiri-moto/octoprint>
- **S45** Grid.Space forum, "OctoPrint plugin" (posts July 2020): <https://forum.grid.space/t/octoprint-plugin/44>
- **S46** `GridSpace/grid-apps` (MIT; release 4.7.3, 2026-08-16): <https://github.com/GridSpace/grid-apps>
- **S47** npm `cura-wasm` (1.5.2, 2021-01-22) and `Cloud-CNC/cura-wasm` (archived):
  <https://www.npmjs.com/package/cura-wasm> ; <https://github.com/Cloud-CNC/cura-wasm>
- **S48** npm `three-slicer` 0.3.5 (2026-10-16) and its `README.md` (sections on licence and multithreaded WASM):
  <https://www.npmjs.com/package/three-slicer> ; <https://cdn.jsdelivr.net/npm/three-slicer@0.3.5/README.md>
- **S49** `kimgh06/Three_Slicer` (created 2026-07-25) and GitHub repository search "orcaslicer wasm":
  <https://github.com/kimgh06/Three_Slicer>
- **S50** `Hiosdra/OrcaWasm` README: <https://github.com/Hiosdra/OrcaWasm>
- **S51** GitHub community discussion #13309, "Allow setting COOP and COEP headers in Github Pages":
  <https://github.com/orgs/community/discussions/13309>
- **S52** npm `coi-serviceworker`: <https://www.npmjs.com/package/coi-serviceworker>
- **S53** Mozilla Public License 2.0, sections 1.12 and 3.3: <https://www.mozilla.org/en-US/MPL/2.0/>
- **S54** Bambu forum, "Create customizable models on MakerWorld using Parametric Model Maker" (27 Mar 2025):
  <https://forum.bambulab.com/t/create-customizable-models-on-maker-world-using-parametric-model-maker/156334>
- **S55** Bambu forum, "Parametric Model Maker V1.0.0 - Fusion 360 Support!":
  <https://forum.bambulab.com/t/parametric-model-maker-v1-0-0-fusion-360-support/179329>
- **S56** Unofficial MakerWorld PMM OpenSCAD docs (README):
  <https://github.com/nelsonjchen/unofficial-makerworld-parametric-model-maker-openscad-docs>
- **S57** All3DP, "Bambu Lab's 'Parametric Model Maker' Brings OpenSCAD to MakerWorld" (13 May 2024):
  <https://all3dp.com/4/bambu-labs-parametric-model-maker-brings-openscad-to-makerworld/>
- **S58** Bambu Lab blog, "MakerWorld: A Guide to One-Step Printing" (22 Sep 2023):
  <https://blog.bambulab.com/makerworld-one-step-printing>
- **S59** Cloudflare Workers, "Limits": <https://developers.cloudflare.com/workers/platform/limits/>
- **S60** Third-party guides to Chrome's "Always open files of this type": <https://kb.wisc.edu/hd-cps/149826> ;
  <https://services.dartmouth.edu/TDClient/KB/ArticleDet?ID=75023>
- **S61** This repository: `docs/choices.md` line 122 (build times 0.67 s and 2.1 s for a 240 x 200 mm board) and
  `.github/workflows/pages.yml` lines 90-104 (Pages publishes `web/out/site` only).
- **S62** GitHub releases and repository data, read through the GitHub API: OctoPrint 1.11.8 (2026-06-23),
  Moonraker latest tag v0.1.0 (2020-09-01) with pushes to 2026-10-21, and the dates and licences quoted above.
