// Settings page: load/save API key, theme, default languages.
import { getSettings, saveSettings } from "../utils/storage.js";

const FIELDS = [
	["apiKey", "googleKey"],
	["theme", "theme"]
];
const $ = (id) => document.getElementById(id);

const s = await getSettings();
for (const [key, id] of FIELDS) $(id).value = s[key] ?? "";
applyTheme(s.theme);

$("theme").onchange = (e) => applyTheme(e.target.value);
$("save").onclick = async () => {
	await saveSettings(Object.fromEntries(FIELDS.map(([key, id]) => [key, $(id).value])));
	applyTheme($("theme").value);
	$("save").textContent = "Saved !";
	setTimeout(() => window.close(), 800);
};

function applyTheme(mode) {
	if (mode === "system") document.documentElement.removeAttribute("data-theme");
	else document.documentElement.dataset.theme = mode;
}
