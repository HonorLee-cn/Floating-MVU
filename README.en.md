# Floating MVU

**Language / 语言:** [中文](README.md) · [English](README.en.md)

> I’m a SillyTavern newcomer. I know HTML, CSS, and JS well enough, but I didn’t want to keep editing character cards and World Lore just to wire up MVU updates—so I vibe-coded this extension.

> Floating MVU is a standalone take on MVU: no tedious hand-written update rules. Modular variable presets give you a shortcut to custom MVU. Hope you enjoy it.

<center>

[![INTRO](image/Title.png "Title")]()

</center>

**Floating MVU** is a third-party extension for [SillyTavern](https://github.com/SillyTavern/SillyTavern). It adds a draggable floating panel in chat to define, display, and **automatically track** character/scene state variables (MVU — multi-variable update workflow).

The model returns updates as `<floating-mvu>{...JSON...}</floating-mvu>` from recent dialogue and your variable definitions; the extension parses that into the chat’s `chat_metadata` and refreshes the panel. Presets are stored globally; **each chat can bind its own preset and theme**.

---

## Features

<center>

[![INTRO](image/Full.png "Title")]()

*Please ignore my questionable taste in demo presets ε==(づ′▽`)づ*

</center>

- **Modular custom variables, assembled at runtime**: Configure variables in the preset editor like building blocks (name, type, description, range/length limits, etc.)—no hand-written MVU rules in World Info or character cards. On each refresh or auto-update, the extension **builds the full prompt** from the bound preset and **live values in that chat** (character context → recent messages → variable list and constraints → current values → output format and language rules), then asks the model for `<floating-mvu>` JSON. Change the preset layout and the AI-side tracked fields change—no code edits.
- **Floating UI**: FAB entry, draggable/resizable panel, remembered position and size, reset support.
- **MVU presets**: Multiple presets; variable types **text / long text / range / image**; nested groups and drag-to-reorder.
- **Per-chat binding**: Each chat picks its own MVU preset; values live in that chat’s metadata.
- **AI updates**: Manual refresh or optional auto-update after **character messages**; prompts follow UI language (zh/en) with footer rules for text variable language.
- **Dual API paths**: Default SillyTavern generation, or optional **OpenAI-compatible** custom API (`/v1/chat/completions`) plus model list fetch.
- **Timeline sync**: On message delete or swipe branch change, snapshots restore or drop values so state matches the transcript.
- **Themes**: Built-in `default`; create/copy/edit themes (colors, background image, custom CSS), **bound per chat**.
- **i18n**: Extension UI language (简体中文 / English); settings, panel, editors, and MVU prompts switch with locale.
- **Debug mode**: Logs assembled prompts, API calls, and parse details in the browser console.

---

## Feature reference

### 1. Extension settings (SillyTavern → Extensions → Floating MVU)

| Area | Description |
|------|-------------|
| **Extension UI language** | UI and MVU prompt language (`zh` / `en`). |
| **General** | Enable extension, show FAB in chat, expand panel by default, debug mode, reset FAB/panel position. |
| **Custom API (MVU updates)** | When enabled, refresh/auto-update uses custom Base URL + API Key + model; manual model or fetch from `/v1/models`. Otherwise SillyTavern `generateRaw` (etc.). |

<center>

[![INTRO](image/Setting.png "Title")]()

</center>

### 2. Floating panel

| Area | Description |
|------|-------------|
| **Main view** | Tree of variables and current values for the chat’s bound preset; quick preset picker when unbound. |
| **Header** | Preset name, updating indicator, refresh (when bound), theme, presets & settings, collapse. |
| **Interaction** | Drag title to move; resize handle; scrollable body even at small height. |

<center>

[![INTRO](image/Main.png "Title")]()

</center>

### 3. Presets and variables (gear → preset list / editor)

| Area | Description |
|------|-------------|
| **Presets** | Create/edit/delete; name, description, “auto-update after new messages”. |
| **Variable types** | **Text**, **long text** (optional max length), **range** (min/max), **image** (URL + height; **not** included in MVU prompt assembly). |
| **Structure** | Nested groups; add/edit/delete variables and groups; drag to reorder in the config panel. |
| **Read-only view** | Main panel shows values; full editing is in the preset editor. |

<center>

[![INTRO](image/Preset.png "Title")]()

</center>

### 4. Modular prompt assembly (core)

You don’t maintain long MVU instructions on character cards or in World Info. **Preset = variable schema** in the UI; each update run builds the model-facing text at runtime:

| Block | Source | Description |
|-------|--------|-------------|
| System prompt | i18n + fixed role | State-tracking assistant; output only `<floating-mvu>` JSON, etc. |
| Character & user / description | Current card `description`, `name1`/`name2` | Changes with the active character. |
| Recent dialogue | Tail of current chat | Bounded message count for story context. |
| Variable list | Non-image variables in **bound preset** | Per variable: type, description, range/length limits, **stored values**; includes example JSON shape. |
| Format footer | i18n | Strict format + language rules for text fields. |

Image variables are **panel-only** and **excluded** from prompt assembly. Change preset, variables, or constraints— the next refresh uses the new schema (“modular” custom MVU).

<center>

[![INTRO](image/Var_1.png "Title")]()
[![INTRO](image/Var_2.png "Title")]()
[![INTRO](image/Var_3.png "Title")]()

</center>

### 5. MVU update pipeline

| Step | Description |
|------|-------------|
| Assemble | Build `userPrompt` / `systemPrompt` dynamically (`buildMvuUpdateRequest`). |
| Call | Non-streaming request; parse `<floating-mvu>` JSON from the reply. |
| Write | Validate names/types → `chat_metadata.floating_mvu.values`; record snapshot (anchor index + branch `pathKey`). |
| Trigger | Header refresh button, or `MESSAGE_RECEIVED` (non-empty character message + preset auto-update on). |

### 6. Themes (palette)

| Area | Description |
|------|-------------|
| **Manage** | Pick a theme for **current chat**; other chats keep their own binding (`default` if unset). |
| **Edit** | Name, panel background image and opacity, CSS variable colors, optional scoped custom CSS. |
| **Built-in** | `default` cannot be edited/deleted; duplicate to customize. |

<center>

[![INTRO](image/Theme_1.png "Title")]()
[![INTRO](image/Theme_2.png "Title")]()

</center>

### 7. Data storage

| Data | Location |
|------|----------|
| Extension settings, preset list, custom themes | `extension_settings.floating_mvu` |
| Bound preset ID, theme ID, values, snapshots | That chat’s `chat_metadata.floating_mvu` |

---

## Installation

### Requirements

- A working **SillyTavern** install with third-party extensions enabled.
- **Git** on the SillyTavern host, with permission to run `git clone` (used when installing from the UI).
- A recent Chromium-based browser is recommended.

### Steps

#### Method 1: Install from Git URL in SillyTavern (recommended)

SillyTavern can clone a repository from the Web UI—no manual file copy.

1. Open SillyTavern → **Extensions** in the sidebar.
2. Click **Install extension** (cloud download icon — “Import Extension From Git Repo”).
3. Enter:

   ```text
   https://github.com/HonorLee-cn/Floating-MVU.git
   ```

4. (Optional) **Branch or tag name**; leave empty for the default branch.
5. Confirm the third-party warning, then:
   - **Install just for me / Install** — installs to the **current user’s** extensions folder.
   - Admins may choose **Install for all users** — `public/scripts/extensions/third-party/` for all users on the host.
6. Enable **Floating MVU** in the list (folder is usually `third-party/Floating-MVU`).
7. Configure **Extension UI language**, FAB, custom API, etc. in the Floating MVU settings drawer.

> After Git install, the on-disk folder is usually `Floating-MVU` (repo name), shown as `third-party/Floating-MVU`. A manual folder named `FloatingMVU` also works—don’t install two copies.

#### Method 2: Manual `git clone` (advanced)

```bash
cd /path/to/SillyTavern/public/scripts/extensions/third-party
git clone https://github.com/HonorLee-cn/Floating-MVU.git
```

Enable **Floating MVU** in the extension list.

#### Method 3: Manual copy

Download a [ZIP or release](https://github.com/HonorLee-cn/Floating-MVU) and extract under `public/scripts/extensions/third-party/` with a valid `manifest.json`.

Expect at least: `manifest.json`, `index.js`, `style.css`, `settings.html`, `LICENSE`, and folders such as `i18n/`, `mvu/`, `ui/`, `theme/`.

#### Using in chat

- Enter a character chat; confirm the FAB appears (enabled in settings + auto-show in chat).
- Open the panel → **Presets & settings** → bind or create a preset.
- Configure variables in the preset editor; use **Refresh** or wait for auto-update to see values on the panel.

### Updating

**Git installs (methods 1 & 2):**

1. **Extensions** → **Manage extensions**.
2. **Update** on **Floating MVU**, or run `git pull` in the extension folder (e.g. `third-party/Floating-MVU`).

**Manual copy (method 3):** Replace the folder with a new release.

Refresh the browser after updating. Back up `extension_settings.floating_mvu` if needed.

### Uninstall

Disable and **Delete** in **Manage extensions**, or remove `third-party/Floating-MVU` (or your folder name). Data in each chat’s `chat_metadata` is not removed automatically.

---

## BUY ME A COFFEE

<center>

<table>
  <tr>
    <td><img src="image/BMAC_W.png" width="200"></td>
    <td>~</td>
    <td><img src="image/BMAC_U.png" width="200"></td>
  </tr>
</table>

</center>

---

## Copyright and license

```
Floating MVU (SillyTavern extension)
Copyright (C) 2026 HonorLee

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
```

This extension is licensed under **GNU GPL v3.0**. Full text: [`LICENSE`](LICENSE).

- You may use, modify, and redistribute under GPLv3 (including source availability obligations for derivatives).
- This is a **third-party** SillyTavern extension, separate from SillyTavern’s own license; comply with both when combined.
- For custom APIs, follow provider terms and protect your API keys.

Standalone repo: <https://github.com/HonorLee-cn/Floating-MVU>. Set `homePage` in `manifest.json` to that URL for in-app links.
