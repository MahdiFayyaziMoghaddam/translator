# AGENTS.md — Master Plan (Translator / En-Fa Browser Extension)

> **Status:** Active master plan for Builder/Reviewer. Gemini/proxy migration (Tasks 1–4) and popup language-direction fix (Task 6) are **implemented** in the current codebase. Popup prefill/auto-translate behavior is **confirmed and kept as-is** (Option A considered and declined). `README.md` is updated and accurate. Researcher updates this plan and `README.md` only.
> **Scope:** Plan and document only. Builder implements application code; Researcher does not edit files outside `AGENTS.md` and `README.md`.
> **Last updated:** 2026-11-13

---

## 1) Goal

Maintain the extension’s translation backend on **Google Gemini `gemini-3.5-flash-lite`** through the **public `MahdiFayyaziMoghaddam/gemini-api-proxy`** (OpenAI-compatible), using the **default system prompt** in **`utils/system.js`** as the translation instruction source, and keep popup language-direction and prefill/translate UX predictable and consistent with confirmed behavior.

**Confirmed decisions (user):**
1. Use the **public gemini-api-proxy URL**: `https://gemini-api-proxy-v1.vercel.app/v1` (chat endpoint `https://gemini-api-proxy-v1.vercel.app/v1/chat/completions`). Mention this public URL in `README.md`.
2. `utils/system.js` exports **just a string** (used directly as the system prompt content in the request). **Contract (current):** `export const system = "<instructions>";` (named string export). This file is **present by default**.
3. **System prompt** = instructions for the AI only. **User message** = text included in a simple template, e.g. `Translate to ${to}: ${q}` (target label + source text `q`).
4. Keep everything simple (no extra tuning/abstractions/options).
5. **Language-direction fix (implemented):** in addition to auto-detect, if the input text’s detected language is **equal to the translate target**, automatically switch input/output languages to a valid different pair.
6. **Prefill/auto-translate behavior (confirmed, kept as-is):** when the popup opens with a **pending context-menu selection** or a **live tab selection**, auto-fill the input, run detection/correction, and **auto-translate**. When there is no selection, open empty (detect shows `—`). Manual typing/paste/translate flows unchanged. **Option A** (auto-translate only for context-menu intent; prefill live selection without auto-run) was considered and **declined** — current behavior is intentional. The extension **never reads the clipboard** (it reads page selection / pending stash only; clipboard is written only on copy).

**Success criteria (high level):**
- Popup translation works (EN↔FA primary, other supported languages preserved) using `gemini-3.5-flash-lite` via the **public** proxy `/v1/chat/completions`.
- Requests use a **Gemini API key** (BYOK, stored in existing settings) and send `[ { role:"system", content: system }, { role:"user", content: <template with target and q> } ]` using the default `system` export from `utils/system.js`.
- `manifest.json` host permission, UI copy/errors, and `README.md` accurately reflect the public proxy, Gemini model/key, proxy project reference, included `utils/system.js`, and current prefill/translate behavior.
- When trimmed input’s detected language equals the current target, the popup auto-corrects src/tgt so translation never targets the same language as the detected input (typing, paste/selection prefill, and relevant manual target changes), without oscillation/regressions. *(Implemented.)*
- Prefill/auto-translate behavior remains as-is: pending context-menu selection or live tab selection on popup open auto-fills and auto-translates; no selection opens empty. *(Implemented/kept.)*
- Existing non-provider behaviors remain intact: auto-detect/Farsi-priority badge logic, swap/auto-target for En↔Fa, selection/context-menu prefill, copy, browser TTS (`speak`), theme/settings persistence, keyboard/focus, and error handling behavior.

---

## 2) Current state (as-is, verified in repo)

- **Provider/service (implemented):** `services/translator.js` posts to `https://gemini-api-proxy-v1.vercel.app/v1/chat/completions` with `Authorization: Bearer <apiKey>`, model `gemini-3.5-flash-lite`, messages `[ { role:"system", content: system }, { role:"user", content: \`Translate to ${to}: ${q}\` } ]` where `system` is imported from `utils/system.js` and `to = labelFor(tgt)`. Parses `choices[0].message.content` defensively, unescapes HTML entities, returns `{ text, detected: src === "auto" ? "" : src }`. Handles `nokey`, `network_error`, `unauthorized` (401/403), `rate_limit` (429), `server_error` (5xx), provider/HTTP message fallback, and `empty_response`. `speak(text, lang)` uses browser `speechSynthesis` (unchanged contract).
- **System prompt (implemented/default):** `utils/system.js` **exists by default** and exports `export const system = \`...\`;` (named string). It is **imported and used by `services/translator.js`** as the system message content. **Builder must not edit.**
- **Settings/storage:** `utils/storage.js` keeps `DEFAULT_SETTINGS = { apiKey, theme, src, tgt }` under `ft_settings`; helpers `getSettings/saveSettings/takePendingSelection`. No schema change.
- **Detection:** `utils/detect.js` provides `detectLang/labelFor/defaultTargetFor` (Farsi-script priority; heuristic clues). `defaultTargetFor(src)` returns `en` for `fa`, else `fa`.
- **UI/copy (implemented):** `options/options.html` labels **“Gemini API key”** (input id `googleKey` mapped to `apiKey` in `options/options.js`). `popup/popup.js` shows Gemini-specific `nokey`/unauthorized/rate-limit/server/empty/network/error messaging with existing categories.
- **Permissions/manifest (implemented):** `manifest.json` description references Gemini `gemini-3.5-flash-lite`; `host_permissions` is `["https://gemini-api-proxy-v1.vercel.app/*"]`.
- **Popup behavior (implemented, confirmed):**
  - **Prefill/auto-translate:** `init()` takes `takePendingSelection()` first (context-menu stash), else live tab selection via `readTabSelection()`/content-script `GET_SELECTION` (`window.getSelection()`). If any selection exists it sets input (capped), runs `onDetect()`, and calls `doTranslate()` (auto-fills and auto-translates). If no selection, it runs `onDetect()` only (badge `—`). **No clipboard read** (clipboard written only on copy).
  - **Language-direction (Task 6):** `onDetect()` updates badge live; on non-empty input, if detected language equals `tgtSel`, it materializes `srcSel` to detected, sets `tgtSel` to previous concrete source when usable else `defaultTargetFor(detected)`, keeps `settings` consistent and persists only changed `src/tgt` (fire-and-forget), and returns. For non-conflicting `src=auto` with `en|fa` target, it preserves En↔Fa auto-follow. `tgtSel.onchange` saves then calls `onDetect()` to correct manual conflicts. `doTranslate()` calls `onDetect()` before translate; swap/materialize/speak/copy/focus/keyboard flows preserved.
  - **Translate trigger:** on demand via button/Enter (and auto on open when selection/pending exists per above).
- **Docs:** `README.md` documents current Gemini/public-proxy implementation, mentions the public proxy URL/endpoint and the [gemini-api-proxy project](https://github.com/MahdiFayyaziMoghaddam/gemini-api-proxy), requires a Gemini API key, documents default `utils/system.js` contract and message template, describes quick input/selection prefill-and-translate behavior, and links to this plan as original migration/design contracts.

---

## 3) Research basis (primary sources, verified)

> Live web search was unavailable in-session; details below are from fetched official/project sources. Quotas, model availability, and terms can change — **verify in Google AI Studio / provider docs before implementation and at runtime.**

### 3.1 `MahdiFayyaziMoghaddam/gemini-api-proxy` (target proxy)
- **Repo:** https://github.com/MahdiFayyaziMoghaddam/gemini-api-proxy — lightweight Next.js (App Router) service exposing an **OpenAI-compatible API** backed by Google Gemini.
- **Upstream:** forwards to `https://generativelanguage.googleapis.com/v1beta/openai/` via the official `openai` SDK.
- **Published live base URL:** `https://gemini-api-proxy-v1.vercel.app/v1` (self-host/deploy also supported).
- **Auth:** `Authorization: Bearer <GEMINI_API_KEY>` (Google Gemini API key). Missing key → OpenAI-style 401 error.
- **Relevant endpoints:** `POST /v1/chat/completions` (non-stream JSON; `stream: true` SSE supported but not used), `GET /v1/models`, `GET /v1/models/{model}`. OpenAI-style error envelope `{ error: { message, type, param, code } }`.
- **Compatibility:** request/response shape matches current `fetch` + `choices[0].message.content` parsing.
- **Trust/reliability:** thin forwarder but **API key and translated text pass through the proxy server**. Public/shared deployments have no SLA and cannot be assumed private.

### 3.2 Gemini OpenAI compatibility (behavioral reference)
- **Docs:** https://ai.google.dev/gemini-api/docs/openai
- Chat completions use `model`, `messages` (`system`/`user`/assistant roles), bearer Gemini key, OpenAI-style response. Optional tuning is not used.

### 3.3 Model choice: `gemini-3.5-flash-lite`
- **Models doc:** https://ai.google.dev/gemini-api/docs/models/gemini — endpoint **`gemini-3.5-flash-lite`**: cost-efficient, optimized for high-volume agentic tasks, translation, and simple data processing.
- **Pricing/tiers:** https://ai.google.dev/gemini-api/docs/pricing — Free tier availability subject to account eligibility/rate limits; **Free tier content may be used to improve products** (paid tiers differ). Exact quotas managed in AI Studio and can change.
- **Note:** do not use deprecated/legacy-limited `gemini-2.5-flash`. Gemini 4 models are out of scope for a free BYOK popup translator.

---

## 4) Confirmed decisions (grilled & resolved)

1. **Proxy deployment:** Use the **public** gemini-api-proxy base URL **`https://gemini-api-proxy-v1.vercel.app/v1`**. Chat endpoint: `https://gemini-api-proxy-v1.vercel.app/v1/chat/completions`. Mention in `README.md`.
   - *Trade-off (accepted):* key and translated text pass through the public proxy and it has no SLA.
2. **`utils/system.js` export:** `export const system = "<instructions>";` (named string), present by default, used as-is as `role:"system"` content. **Builder must not edit `utils/system.js`.**
3. **Message composition:** system prompt = instructions only; user message = `Translate to ${to}: ${q}` (`to = labelFor(tgt)`).
4. **Keep everything simple:** no streaming, no extra tuning, no new config/UI, no abstractions/fallback prompt logic, no storage/schema changes. Minimal-churn internals (`apiKey`, options id `googleKey`).
5. **Auto-switch on target/input-language conflict (implemented):** if detected input language equals translate target, automatically switch input/output languages to a valid different pair (materialize/correct in popup logic, persist corrected pair consistently, deterministic/idempotent).
6. **Prefill/auto-translate (confirmed, kept as-is):** pending context-menu selection or live tab selection on popup open → auto-fill, detect/correct, and auto-translate; no selection → empty. Option A was considered and **declined** (current behavior intentional). Extension never reads clipboard.

---

## 5) Target/current design (architecture)

### 5.1 Provider integration (minimal, BYOK, OpenAI-compatible) — implemented
- **Endpoint:** `https://gemini-api-proxy-v1.vercel.app/v1/chat/completions`
- **Model:** `gemini-3.5-flash-lite`
- **Auth:** `Authorization: Bearer <apiKey>` (Gemini API key from settings)
- **Request:** `POST` JSON `{ model, messages }`, non-streaming
- **Response consumed:** `choices[0].message.content` (defensive, HTML-unescaped). `detected` remains `src === "auto" ? "" : src`.
- **Public service API:** `translate(q, src, tgt) → { text, detected }`; `speak(text, lang)` unchanged.

### 5.2 Message/prompt design — implemented
- **Messages:** `[ { role: "system", content: system }, { role: "user", content: \`Translate to ${to}: ${q}\` } ]` with `{ system }` from `../utils/system.js` and `to = labelFor(tgt)`.

### 5.3 `utils/system.js` (default, present — Builder must not edit)
- **Contract:** `export const system = "<instructions>";` (string) used as-is.

### 5.4 Popup language-direction UX (implemented)
- `onDetect()` enforces “never translate into the same language as detected input”: on non-empty input and `detected === tgtSel`, materialize `srcSel = detected`; set `tgtSel = (prevSrc concrete && prevSrc !== detected) ? prevSrc : defaultTargetFor(detected)`; keep `settings` consistent and persist changed pair (fire-and-forget). Preserve non-conflicting auto+En↔Fa follow. `tgtSel.onchange` saves and re-runs `onDetect()`; `doTranslate()` runs `onDetect()` before translating. Deterministic/idempotent (no oscillation). Heuristic detection limits apply.

### 5.5 Popup prefill / auto-translate UX (implemented, kept)
- On popup open: prefer `takePendingSelection()` (context-menu intent), else live tab selection via `readTabSelection()`/content-script `GET_SELECTION`.
- If selection exists: prefill input (capped), run detection/correction, and **auto-translate** (confirmed, intentional for both sources).
- If no selection: open empty and run detection (badge `—`).
- Extension never reads clipboard; selection may remain highlighted after copy, which can look like a clipboard paste but is page selection.

### 5.6 Errors, UX, and resilience — implemented
- Preserve error taxonomy/handling and defensive parsing. `speak()` unchanged.

---

## 6) Implementation plan (Builder) — ordered, file-by-file

> Keep everything simple (YAGNI/KISS/minimal diff). **Do not edit `utils/system.js`.** Tasks 1–6 are implemented; no pending popup/provider behavior tasks.

### Task 1 — Provider constants and manifest alignment (**implemented**)
- **State:** endpoint `https://gemini-api-proxy-v1.vercel.app/v1/chat/completions`, model `gemini-3.5-flash-lite`, host permission `https://gemini-api-proxy-v1.vercel.app/*`, Gemini description.

### Task 2 — Wire default system prompt and user template (**implemented**)
- **State:** imports `{ system }`, sends `[system, user template \`Translate to ${to}: ${q}\`]`, preserves contracts/error handling/`speak`.

### Task 3 — Settings and in-app copy (**implemented**)
- **State:** “Gemini API key” label, storage/ids semantics preserved, popup error copy updated.

### Task 4 — Documentation (`README.md`) and plan consistency (**implemented/maintained**)
- **State:** README documents current Gemini/public-proxy setup, public URL/endpoint, [gemini-api-proxy project](https://github.com/MahdiFayyaziMoghaddam/gemini-api-proxy), Gemini API key, `utils/system.js` contract/template, structure/privacy-quota, and current quick-input/prefill-and-translate behavior; links to this plan. Keep README accurate if behavior/details change.

### Task 5 — Verification (manual, required)
- **Precondition:** `utils/system.js` present; valid Gemini API key; extension reloaded after changes.
- Load unpacked (Chromium; smoke-test Firefox if feasible): no manifest/permission errors.
- Happy paths: EN→FA, FA→EN, auto-detect + badge, swap/auto-target, selection/context-menu prefill-and-translate, copy, TTS, theme/defaults persistence.
- Errors/edges: missing key (`nokey`), unauthorized, offline/network, 429, 5xx, empty response, long/mixed text — handled gracefully.
- Confirm system prompt applied and user template delivers target+text.
- No automated tests (keep simple).

### Task 6 — Auto-switch input/output when detected input language equals target (**implemented**)
- **File:** `popup/popup.js`
- **State (preserve):** `onDetect()` corrects `detected == tgt` by materializing src and choosing `prevSrc` (if concrete/different) else `defaultTargetFor(detected)`, persists changed pair (fire-and-forget), preserves non-conflicting auto+En↔Fa follow. `tgtSel.onchange` saves + `onDetect()`. Deterministic/idempotent; translation uses corrected pair.

---

## 7) Specific values & decisions (quick reference)

| Item | Confirmed/planned value | Notes |
|---|---|---|
| Model | `gemini-3.5-flash-lite` | Translation-optimized Flash-Lite |
| Proxy base (public) | `https://gemini-api-proxy-v1.vercel.app/v1` | Mention in README |
| Chat endpoint | `https://gemini-api-proxy-v1.vercel.app/v1/chat/completions` | OpenAI-compatible, non-stream |
| Host permission | `https://gemini-api-proxy-v1.vercel.app/*` | Matches public proxy |
| Auth | `Authorization: Bearer <Gemini API key>` | BYOK, stored as `apiKey` |
| System prompt source | `utils/system.js` → `export const system` (string) | Default, present |
| Messages | `[ {role:"system", content: system}, {role:"user", content: \`Translate to ${to}: ${q}\`} ]` | `to = labelFor(tgt)` |
| Tuning/streaming | none | Keep simple |
| Storage schema | unchanged (`apiKey`, `theme`, `src`, `tgt`) | no migration |
| Lang conflict rule | if detected input == target → auto-switch src/tgt | **Implemented (Task 6)** |
| Prefill + auto-translate | pending context-menu or live tab selection on open → auto-fill, detect, auto-translate | **Implemented/kept** (no clipboard read) |

---

## 8) Risks, trade-offs, and mitigations

- **Public proxy trust/privacy (accepted):** key/text pass through public proxy (no SLA). **Mitigation:** BYOK, disclosure in README.
- **Availability/rate limits:** proxy/Gemini quotas can change. **Mitigation:** clear error surfacing; verify in Google AI Studio.
- **`utils/system.js` contract mismatch:** breaks translation. **Mitigation:** documented contract; Builder must not edit.
- **Model/prompt compliance:** commentary/misformat possible. **Mitigation:** default system + simple user template.
- **Manifest/host mismatch:** blocked requests. **Mitigation:** keep aligned.
- **Free-tier data use:** may apply. **Mitigation:** README note.
- **Detection heuristic limits:** `detectLang` may misclassify short/ambiguous/mixed text; auto-switch follows it. **Mitigation:** deterministic simple rule, manual controls remain.
- **Oscillation/regression (Task 6):** correction must stay idempotent. **Mitigation:** stable post-correction state + manual verification.
- **Selection vs clipboard confusion:** popup may prefill/translate highlighted page text (or stashed context-menu selection), which can look like a clipboard paste, but the extension **never reads the clipboard** (reads selection/pending stash; writes clipboard only on copy). **Mitigation:** accurate docs and predictable behavior (kept as-is by decision).

---

## 9) Out of scope / non-goals

- Editing `utils/system.js` prompt content.
- Streaming, tuning, multi-provider abstraction, or new settings/UI/config.
- Changing detection/storage schemas, TTS, or unrelated UX/refactors.
- Automated tests/CI.
- Direct Gemini native API integration (use public gemini-api-proxy).

---

## 10) Handoff notes for Builder / Reviewer

- **Builder:** Tasks 1–6 are implemented; preserve existing contracts/flows (provider/model/endpoint/host, `{system}` + user template, Task 6 conflict correction with no oscillation, prefill/auto-translate behavior, swap/copy/TTS/theme/settings/errors). Any new behavior change must follow an updated `AGENTS.md`. **Do not edit `utils/system.js`.**
- **Reviewer:** verify migration invariants (endpoint/model/host_permissions = public proxy + `gemini-3.5-flash-lite`; service imports `{ system }` and sends `[system, user template with target+q]`; no Token Harbor remnants), Task 6 conflict correction/no regressions, prefill/auto-translate behavior as documented (no clipboard read), and README/AGENTS accuracy (proxy URL and [gemini-api-proxy project](https://github.com/MahdiFayyaziMoghaddam/gemini-api-proxy) mentioned).
- **Single source of truth:** if anything changes, update `AGENTS.md` first (Researcher). Researcher may update `README.md` only for documentation; application code changes are Builder’s responsibility.
