<p align="center">
  <img src="assets/icon.png" alt="Translator icon" width="96" />
</p>

<h1 align="center">Translator</h1>
<p align="center"><strong>AI Translator</strong> · Fast English ↔ Persian browser extension</p>
<p align="center">Manifest V3 · Vanilla JS · Neomorphism UI</p>

---

## ✨ Features

- 🇬🇧↔🇮🇷 **English ↔ فارسی first-class** (other languages supported as secondary)
- 🔎 **Auto-detect** with **Farsi-script priority** and a live badge (`Detected: فارسی / English`)
- 🔁 **Smart language switching**
  - Auto target follows the EN↔FA pair when useful
  - If the detected input language equals the selected target, source/target switch automatically to a valid pair
  - Swap button to flip languages instantly
- 🖱️ **Quick input**: selected text on the page can auto-fill and translate in the popup
- 📋 **Context menu**: right-click → **Translate with Farsi Translator**
- ⌨️ **Shortcut**: `Ctrl+Shift+T` (Mac `⌘+Shift+T`)
- 📝 **Result tools**: copy, listen (browser speech synthesis), skeleton loading, and clear offline/error states
- ⚙️ **Settings**: Gemini API key, theme, and default languages
- 🎨 **UI**: light/dark neomorphism, Vazirmatn typography, 410px popup

## 🔌 Translation backend

- **Provider/model:** Google Gemini **`gemini-3.5-flash-lite`** via [MahdiFayyaziMoghaddam/gemini-api-proxy](https://github.com/MahdiFayyaziMoghaddam/gemini-api-proxy) (OpenAI-compatible)
- **Public proxy URL:** `https://gemini-api-proxy-v1.vercel.app/v1`
  - **Chat completions endpoint:** `https://gemini-api-proxy-v1.vercel.app/v1/chat/completions`
- **API key:** a **Gemini API key** from [Google AI Studio](https://aistudio.google.com/apikey) is required. Set it in **⚙ Settings**. Requests are sent only when you translate.
- **Prompting**
  - **System prompt:** provided by default in `utils/system.js` as the exported string `system`
  - **User message:** `Translate to <target>: <text>` (target language + source text)
- **Privacy/quota note:** translation requests (API key and text) pass through the **public** proxy above; the proxy has no SLA/control. Gemini free-tier quotas and data-use terms may apply — verify in Google AI Studio.

## 🧠 Default system prompt (`utils/system.js`)

`utils/system.js` is included by default and exports a string named `system`, used as the system instruction:

```js
export const system = "...translation instructions...";
```

The service sends:

```js
[
	{ role: "system", content: system },
	{ role: "user", content: "Translate to <target>: <text>" }
];
```

Keep the export name/shape as `export const system` (string).

## 🚀 Load unpacked

1. **Chrome/Chromium:** open `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select this folder.
2. **Firefox:** open `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** → select `manifest.json`.
3. Add your **Gemini API key** in **⚙ Settings**, then open the popup (`Ctrl+Shift+T` / `⌘+Shift+T`) to translate.

## 🗂️ Project structure

```text
manifest.json
popup/         popup.html popup.css popup.js
options/       options.html options.css options.js
content/       content.js
background/    background.js
services/      translator.js   # Gemini via public gemini-api-proxy + TTS
utils/         detect.js storage.js system.js  # system.js: default system prompt (included)
styles/        neu.css          # neomorphism tokens
assets/        icon.png
```

## ℹ️ Notes

- 🔊 Text-to-speech uses the browser’s built-in speech synthesis (no extra key).
- 📄 For the original migration plan and design contracts, see [AGENTS.md](AGENTS.md).
