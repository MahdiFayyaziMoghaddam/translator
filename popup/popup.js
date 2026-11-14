// Popup logic: focus, selection prefill, typing detection, translate (Enter/button only), theme.
import { detectLang, labelFor, defaultTargetFor } from "../utils/detect.js";
import { getSettings, saveSettings, takePendingSelection } from "../utils/storage.js";
import { translate, speak } from "../services/translator.js";

const ext = globalThis.browser ?? globalThis.chrome;
const $ = (id) => document.getElementById(id);
const input = $("input"),
	srcSel = $("srcSel"),
	tgtSel = $("tgtSel");
let settings,
	lastResult = null,
	reqId = 0;

init();

async function init() {
	settings = await getSettings();
	applyTheme(settings.theme);
	srcSel.value = settings.src;
	tgtSel.value = settings.tgt;
	wireEvents();
	// Focus while the popup is loading — Chrome popups ignore pre-layout focus.
	input.focus();
	requestAnimationFrame(() => input.focus());

	// 1) Context-menu selection wins, 2) live tab selection.
	const pending = await takePendingSelection();
	const live = pending || (await readTabSelection().catch(() => ""));
	if (live) {
		input.value = live.slice(0, 2000);
		onDetect();
		doTranslate();
	} else {
		onDetect();
	}
}

function wireEvents() {
	$("goBtn").onclick = doTranslate;
	$("inSpeak").onclick = () => {
		const v = input.value.trim();
		if (v) speak(v, srcSel.value === "auto" ? detectLang(v) : srcSel.value);
	};
	// Auto detection updates live while typing; translation only on demand.
	input.addEventListener("input", onDetect);
	input.addEventListener("keydown", (e) => {
		if (e.key !== "Enter" || e.isComposing) return;
		e.preventDefault(); // never insert a newline
		if (!e.shiftKey) doTranslate(); // shift+enter does nothing
	});
	$("clearBtn").onclick = () => {
		input.value = "";
		input.focus();
		hideResult();
		onDetect();
	};
	$("swapBtn").onclick = async () => {
		if (srcSel.value === "auto") {
			// auto -> materialize detected pair then swap
			srcSel.value = detectLang(input.value);
		}
		[srcSel.value, tgtSel.value] = [tgtSel.value, srcSel.value];
		settings = await saveSettings({ src: srcSel.value, tgt: tgtSel.value });
		onDetect();
		if (input.value.trim()) doTranslate();
	};
	srcSel.onchange = async () => {
		// A concrete source must never equal the target: fix the pair on selection.
		if (srcSel.value !== "auto" && srcSel.value === tgtSel.value) tgtSel.value = defaultTargetFor(srcSel.value);
		settings = await saveSettings({ src: srcSel.value, tgt: tgtSel.value });
		onDetect();
	};
	tgtSel.onchange = async () => {
		if (srcSel.value !== "auto" && tgtSel.value === srcSel.value) srcSel.value = defaultTargetFor(tgtSel.value);
		settings = await saveSettings({ src: srcSel.value, tgt: tgtSel.value });
		onDetect();
	};
	$("copyBtn").onclick = copyMain;
	$("speakBtn").onclick = () => {
		if (lastResult) speak(lastResult.text, tgtSel.value);
	};
	$("themeBtn").onclick = async () => {
		const cur = document.documentElement.dataset.theme;
		const next = cur === "dark" ? "light" : "dark";
		settings = await saveSettings({ theme: next });
		applyTheme(next);
	};
	$("settingsBtn").onclick = () => ext.runtime.openOptionsPage();
}

function onDetect() {
	const q = input.value.trim();
	const code = detectLang(input.value);
	$("detectBadge").textContent = "Detected: " + (q ? labelFor(code) : "—");
	if (!q) return;
	if (code === tgtSel.value || srcSel.value === tgtSel.value) {
		const prevSrc = srcSel.value;
		srcSel.value = code;
		tgtSel.value = prevSrc !== "auto" && prevSrc !== code ? prevSrc : defaultTargetFor(code);
		const patch = {};
		if (settings?.src !== srcSel.value) patch.src = srcSel.value;
		if (settings?.tgt !== tgtSel.value) patch.tgt = tgtSel.value;
		if (Object.keys(patch).length) {
			settings = { ...settings, ...patch };
			void saveSettings(patch).catch(() => {});
		}
		return;
	}
	if (srcSel.value === "auto" && (tgtSel.value === "en" || tgtSel.value === "fa")) {
		const want = defaultTargetFor(code);
		if (tgtSel.value !== want) tgtSel.value = want;
	}
}

async function doTranslate() {
	const q = input.value.trim();
	if (!q) return;
	const id = ++reqId;
	showLoading();
	input.focus();
	onDetect();
	try {
		const r = await translate(q, srcSel.value, tgtSel.value);
		if (id !== reqId) return;
		lastResult = r;
		showResult(r);
		// Use service detection when known, otherwise keep text-based badge.
		if (r.detected) $("detectBadge").textContent = "Detected: " + labelFor(r.detected);
	} catch (e) {
		if (id !== reqId) return;
		const m = e?.message;
		if (m === "nokey") showError("Add your Gemini API key in Settings.");
		else if (m === "unauthorized") showError("Invalid API key or unauthorized. Check your key in Settings.");
		else if (m === "rate_limit") showError("Rate limit reached. Try again in a moment.", false);
		else if (m === "server_error") showError("Translation service error. Try again later.", false);
		else if (m === "empty_response") showError("Translation came back empty. Try again.", false);
		else if (m === "network_error" || !navigator.onLine)
			showError("You appear to be offline. Translation needs an internet connection.", false);
		else showError("Translation failed. Check your connection or retry.", false);
	}
}

// Ask content script of the active tab for its current selection.
async function readTabSelection() {
	const [tab] = await ext.tabs.query({ active: true, currentWindow: true });
	if (!tab?.id || /^(chrome|edge|about):/.test(tab.url || "")) return "";
	const res = await ext.tabs.sendMessage(tab.id, { type: "GET_SELECTION" });
	return res?.text || "";
}

function showLoading() {
	$("result").hidden = false;
	$("skeleton").hidden = false;
	$("outWrap").hidden = true;
	$("errBox").hidden = true;
}

function showResult(r) {
	$("skeleton").hidden = true;
	$("errBox").hidden = true;
	$("outWrap").hidden = false;
	const out = $("mainOut");
	out.textContent = r.text;
	out.dir = /[؀-ۿ]/.test(r.text) ? "rtl" : "ltr";
}

function showError(msg, showSettings = true) {
	$("skeleton").hidden = true;
	$("outWrap").hidden = true;
	$("errBox").hidden = false;
	$("errBox").textContent = showSettings ? msg + " " : msg;
	if (showSettings) {
		const b = document.createElement("button");
		b.className = "link";
		b.textContent = "Open settings";
		b.onclick = () => ext.runtime.openOptionsPage();
		$("errBox").appendChild(b);
	}
}

function hideResult() {
	$("result").hidden = true;
}

async function copyMain() {
	if (!lastResult) return;
	await navigator.clipboard.writeText(lastResult.text).catch(() => {});
	toast("Copied ✓");
}

function applyTheme(mode) {
	if (mode === "system") document.documentElement.removeAttribute("data-theme");
	else document.documentElement.dataset.theme = mode;
}

function toast(msg) {
	const t = document.createElement("div");
	t.className = "toast";
	t.textContent = msg;
	document.body.appendChild(t);
	setTimeout(() => t.remove(), 1400);
}
