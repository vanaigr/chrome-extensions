# Resume Generator

A Chrome extension + Node.js native-messaging host. The extension opens a popup
on **Alt+X**, scrapes info from the current page, and the **Generate** button
sends that info to the host, which does async work and replies ok / error.

```
resume-generator/
├── extension/   Chrome MV3 extension (popup UI)
└── host/        Node.js native messaging host
```

## Prerequisites

- Google Chrome or Chromium
- Node.js (any recent LTS) available on `PATH` as `node`
- Linux (the install script targets `~/.config/google-chrome/...` /
  `~/.config/chromium/...`; see [Other OSes](#other-oses) below for macOS / Windows)

## Setup

### 1. Load the extension

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked** and select `resume-generator/extension/`.
4. Copy the extension's **ID** (the long hex string shown on the extension card).

### 2. Install the native host manifest

From this directory:

```bash
cd host
./install.sh <extension-id>
```

This:

- `chmod +x host.js` so Chrome can execute it directly via its `#!/usr/bin/env node` shebang.
- Writes `com.resume_generator.host.json` (with an absolute `path` to `host.js`
  and your extension ID in `allowed_origins`) into:
  - `~/.config/google-chrome/NativeMessagingHosts/`
  - `~/.config/chromium/NativeMessagingHosts/`

### 3. Restart Chrome

Chrome only reads native host manifests at startup. Fully quit and relaunch.

### 4. Try it

1. Navigate to any page.
2. Press **Alt+X** (rebind at `chrome://extensions/shortcuts` if it clashes).
3. The popup shows the page title, URL, and a snippet (current selection if any,
   otherwise the first 2000 chars of `body.innerText`).
4. Click **Generate**. Status should turn green (`Generated (<title>)`).
   The host writes the request to `host/last-request.json`.

## Customizing the host

The real work lives in `host/host.js`, in `process_request()` (around line 56).
It currently sleeps 500 ms and writes the incoming message to `last-request.json`.
Replace that block with whatever you actually need — spawn a child process,
call an API, write files, etc. Return any JSON-serializable object; it will be
included in the `ok` response as `result`.

Request shape sent by the extension:

```json
{
  "action": "generate",
  "page": {
    "title": "...",
    "url": "...",
    "snippet": "...",
    "html_length": 12345
  },
  "requested_at": "2026-04-21T12:34:56.000Z"
}
```

Response shape expected by the extension:

```json
{ "status": "ok",    "message": "…", "result": { ... } }
{ "status": "error", "message": "…" }
```

## Debugging

- **Host log:** `host/host.log` — every request and error is appended here.
- **Popup devtools:** right-click the popup → *Inspect*.
- **`Host error: Specified native messaging host not found.`**
  Usually means Chrome wasn't restarted, the manifest is in the wrong directory
  for your browser channel, or the `name` field doesn't match `com.resume_generator.host`.
- **`Host error: Native host has exited.`**
  The host crashed before sending a reply. Check `host.log` and try running
  `node host/host.js < /dev/null` — it should exit with an error about stdin,
  not a syntax error.
- **Alt+X does nothing:** some sites / other extensions swallow the shortcut.
  Verify the binding at `chrome://extensions/shortcuts`.

## Other OSes

The install script only handles Linux. For other platforms, place the manifest here
(see [Chrome docs][nm-docs]):

- **macOS:** `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.resume_generator.host.json`
- **Windows:** register under
  `HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\com.resume_generator.host`
  pointing at a `.json` file on disk. `path` inside that JSON should point to a
  `.bat` that invokes `node host.js`, since Windows can't execute `.js` shebangs.

In all cases the manifest must contain:

```json
{
  "name": "com.resume_generator.host",
  "description": "Resume Generator native host",
  "path": "<absolute path to host.js (or wrapper)>",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://<extension-id>/"]
}
```

[nm-docs]: https://developer.chrome.com/docs/apps/nativeMessaging#native-messaging-host-location

## Uninstall

```bash
rm ~/.config/google-chrome/NativeMessagingHosts/com.resume_generator.host.json
rm ~/.config/chromium/NativeMessagingHosts/com.resume_generator.host.json
```

Then remove the extension from `chrome://extensions`.






---

host/.env:
```
GENERATE_SCRIPT_PATH=[absolute path to generate.ts]
OPENROUTER_API_KEY=[key]
```
