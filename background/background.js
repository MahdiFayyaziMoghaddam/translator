// Background service worker (MV3 module): context menu + stash selection for popup.
import { KEYS } from "../utils/storage.js";

const ext = globalThis.browser ?? globalThis.chrome;
const MENU_ID = "ft-translate";

ext.runtime.onInstalled.addListener(async () => {
	try {
		await ext.contextMenus.removeAll();
		ext.contextMenus.create({
			id: MENU_ID,
			title: "Translate with Farsi Translator",
			contexts: ["selection"]
		});
	} catch {
		/* noop */
	}
});

ext.contextMenus.onClicked.addListener(async (info) => {
	if (info.menuItemId !== MENU_ID) return;
	const text = (info.selectionText || "").trim().slice(0, 2000);
	if (text) {
		// Popup reads + clears this on open (see takePendingSelection).
		await ext.storage.local.set({ [KEYS.PENDING]: text });
	}
	// Open popup if possible (Chrome); unsupported browsers fall back to icon click.
	try {
		await ext.action.openPopup?.();
	} catch {
		/* noop */
	}
});
