// Content script: answers popup's GET_SELECTION with the page's selected text.
// Runs on all pages (see manifest content_scripts).

const ext = globalThis.browser ?? globalThis.chrome;

ext.runtime.onMessage.addListener((msg, _sender, reply) => {
	if (msg?.type === "GET_SELECTION") {
		reply({ text: (window.getSelection()?.toString() || "").trim() });
		return true;
	}
});
