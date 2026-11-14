// Tiny storage helper over chrome.storage.local (Promise API, FF-compatible).

const api = globalThis.chrome?.storage?.local ?? globalThis.browser?.storage?.local;

export const KEYS = {
	SETTINGS: "ft_settings",
	PENDING: "ft_pending_selection" // text captured from context menu
};

export const DEFAULT_SETTINGS = {
	apiKey: "",
	theme: "system", // system | light | dark
	src: "auto",
	tgt: "fa"
};

export async function getSettings() {
	try {
		const out = await api.get(KEYS.SETTINGS);
		return { ...DEFAULT_SETTINGS, ...(out[KEYS.SETTINGS] || {}) };
	} catch {
		return { ...DEFAULT_SETTINGS };
	}
}

export async function saveSettings(patch) {
	const cur = await getSettings();
	const next = { ...cur, ...patch };
	await api.set({ [KEYS.SETTINGS]: next });
	return next;
}

export async function takePendingSelection() {
	try {
		const out = await api.get(KEYS.PENDING);
		const v = out[KEYS.PENDING] || "";
		if (v) await api.remove(KEYS.PENDING);
		return v;
	} catch {
		return "";
	}
}
