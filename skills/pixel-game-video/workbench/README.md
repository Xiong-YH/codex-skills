# Pixel Video Workbench

This standalone local editor is adapted from [video-shotcraft Workbench](https://github.com/Vincentwei1021/video-shotcraft). It ships with `pixel-game-video`; no separate video-shotcraft checkout, gallery, demos or template is needed. Original copyright and Apache-2.0 terms are in `NOTICE` and `LICENSE`.

## Open an editable film

Use Node 18.18+ (Node 20/22 LTS recommended). The runtime pins Remotion **4.0.534** and React **19.2.0**, matching the foundation renderer.

```bash
cd /path/to/skills/pixel-game-video/workbench
npm ci --ignore-scripts
node scripts/open.mjs /path/to/video/build/remotion --port 5208 --no-open
```

Visit `http://127.0.0.1:5208/?import=project`. Omit `--no-open` to open a browser automatically. Omit the project path to reuse the last linked film. `--no-import` opens the editor without asking it to import the linked original. The command never terminates an unverified process; use a different `--port` if occupied.

The project must contain `src/workbench.ts` (or `.tsx`) exporting `WORKBENCH`, and its media in `public/`. The foundation build command generates the manifest and source units. A manual source project can use the structurally typed interface in `src/cards/manifest.ts`; it need not import this workbench package.

The foundation bridge currently accepts native focus-desk scenes with silent or SFX-only audio. It rejects narration, BGM and standalone `role=title` cues; the original Remotion build and export still support those inputs. Each shot's `heading`, title style and task labels remain editable in the inspector. This bridge restriction does not remove the workbench's native text/title cards.

The `proj` and `public/*` links, generated local media indexes, dependencies, cache and output videos are local runtime state excluded by `.gitignore`. They can be recreated by the open script. Never copy those links into a deliverable instead of copying the actual project assets.

## Edit and save

- Click a clip in the bottom timeline. The right inspector exposes that clip's content, font size, colors, timing, speed, volume and position according to its schema.
- Drag clips to change their start, drag their edges to trim, and drag clips between tracks. These are free edits; other clips do not ripple automatically. Hidden tracks are omitted from playback and export.
- For imported foundation shots, shortening a clip trims the source action; extending past the source end holds its final frame. Duration changes do not stretch the whole action. The speed control changes playback speed separately, and splitting keeps source frames continuous. Imported transitions retain their source timing and settle after their source end.
- The library offers the linked film's scene/caption/transition components, all project images/video/audio, native title/caption/text/background cards, and the foundation arcade sound library. Drag a sound to an audio track, then adjust start/duration/volume independently.
- A book-sweep transition links its outgoing text to the source shot. Editing its linked title/labels in the inspector updates the source shot too. If the source is deleted, the transition keeps its original snapshot.
- Edits autosave in this browser on the same address and port, separately for each linked project directory. **保存工程 JSON** immediately saves and downloads a portable editing snapshot. **导入** restores that JSON with validation and undo support. Keep the accompanying source project and media: JSON does not embed the media or component code.
- Reopening a film always keeps saved edits. If the original manifest changed, a visible message offers explicit reimport via the media library; it never silently resets edits. Reimport and reset can be undone. Changing port/browser creates a separate browser storage context, so restore a JSON snapshot when moving.

The imported original's 900 frames at 60 fps play and export as exactly 15 seconds. The timeline retains a little empty editing space after the content, which is not exported.

## Export MP4

Click **导出成片**. The editor renders the timeline submitted at that moment (including your edits) through Remotion, reports progress, and shows **下载 MP4** after completion. Render failures are shown in the top bar; hover for the full error. Each export submission durably saves a `.project.json` beside its matching MP4 in `exports/`, using the same basename; **导出版本 JSON** downloads that exact submitted timeline. **保存工程 JSON** downloads the current editing state, which may differ if you keep editing during a render. Deliver the MP4 with its export-version JSON. Saved files remain in `exports/` after a server restart; JSON still needs the accompanying source project and media to reopen correctly.

An installed Chrome/Chromium is required. On macOS, Google Chrome is detected automatically. Set `PIXEL_BROWSER_EXECUTABLE` before starting the server for another browser installation:

```bash
PIXEL_BROWSER_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  node scripts/open.mjs /path/to/video/build/remotion --port 5208 --no-open
```

The workbench never downloads a browser automatically. It listens only on `127.0.0.1`, accepts same-origin export requests, limits project JSON to 5 MB, validates the project shape and relative media paths, and copies linked static media into a dereferenced per-render snapshot for Remotion.

HTTP interface:

- `POST /api/export`, JSON `{ "project": ProjectData }` → `202 { "id": "..." }`.
- `GET /api/export/:id` → `status`, `progress`, `lastLine`, `logTail`, and `downloadUrl` when done.
- `GET /api/export/:id/download` → MP4 attachment.
- `GET /api/export/:id/project` → durable `.project.json` timeline snapshot (`projectUrl` in job status).
- `POST /api/export/:id/reveal` → optional Finder reveal on macOS.

## Verify the integration

```bash
npm test
npm run build
PIXEL_PYTHON=/path/to/python-with-pillow \
PIXEL_BROWSER_EXECUTABLE=/path/to/installed/chrome \
  npm run parity -- --frames 0,89,179,299,449,599,749,899
```

Parity renders the manifest import (`ProjImported`) and source composition (`ProjOriginal`) at the same frames. The manifest must provide `original`. It writes evidence to `.parity/`, exits nonzero for differences or inconclusive checks, and uses `PIXEL_PYTHON` (fallback `python3`) for Pillow image comparison. Select valid frames for films of other lengths. The comparison is for an unchanged import; a deliberately edited timeline should differ.

The foundation bridge separately verifies the independent audio cues against its original mixed audio. A release check must also use the real UI to change text, move/trim a scene, adjust an independent sound, save/reload/import JSON and export a playable MP4.

## Export a Jianying draft

Click **导出剪映草稿** to render a clean plate and package the current submitted timeline as a ZIP with native text and separate audio tracks. Install the optional Python requirements from `../requirements-jianying.txt` and set `PIXEL_JIANYING_PYTHON` before starting the server. **下载剪映 ZIP** and its paired export JSON appear after completion. MP4 export remains separate.

The bridge currently accepts known foundation cards with the default theme. Unknown visible cards, custom themes or captions layered below baked visuals are rejected rather than silently changed. Shot headings, camera motion and internal scene animation are baked; native subtitles retain editable text/style with approximate typography.

A portable ZIP is not an installed Mac draft: extract it on the receiving computer, then use `python install.py --check` and the included instructions. Installation requires Python 3.10+, FFmpeg, a closed Jianying application and an unused draft name. The installer detects the Mac application version: exactly **11.2.0** supports the tested platform record containing only `os=mac` and `app_version=11.2.0`, with no device identifier or plaintext donor required. Other Mac versions still need a usable local plaintext donor and stop if none is available. Save and Cmd+Q before installation; the actual 11.2.0 application can be named `VideoFusion-macOS.app`. Its standalone tray helper may remain after the main application and editing helpers exit; the installer does not force-quit processes.

The 15-second demo was opened and played to its end in Mac Jianying 11.2.0 build 477: all 3 shot segments, 3 native text segments and 4 audio materials loaded, and native text properties were inspected. Existing projects were preserved. Changing native subtitles and previewing the result, manual shot retiming and subjective audio listening were not reviewed. Windows installation and other Mac versions have no native-app acceptance in this project. See [the detailed guide](../references/jianying-export.md).
