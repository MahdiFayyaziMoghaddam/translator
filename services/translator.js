// Translation via Gemini (gemini-api-proxy, OpenAI-compatible). Requires a Gemini API key set in Settings.

import { getSettings } from "../utils/storage.js";
import { labelFor } from "../utils/detect.js";
import { system } from "../utils/system.js";

const ENDPOINT = "https://gemini-api-proxy-v1.vercel.app/v1/chat/completions";
const MODEL = "gemini-3.5-flash-lite";

const SPEAK_LANG = {
	fa: "fa-IR",
	en: "en-US",
	fr: "fr-FR",
	de: "de-DE",
	es: "es-ES",
	ar: "ar-SA",
	tr: "tr-TR"
};

export async function translate(q, src, tgt) {
	const { apiKey } = await getSettings();
	if (!apiKey) throw new Error("nokey");

	const to = labelFor(tgt);

	let res;
	try {
		res = await fetch(ENDPOINT, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				model: MODEL,
				messages: [
					{ role: "system", content: system },
					{ role: "user", content: `Translate to ${to}: ${q}` }
				]
			})
		});
		console.log("response:", res);
	} catch {
		throw new Error("network_error");
	}

	const data = await res.json().catch(() => null);
	if (!res.ok) {
		const msg = data?.error?.message;
		if (res.status === 401 || res.status === 403) throw new Error("unauthorized");
		if (res.status === 429) throw new Error("rate_limit");
		if (res.status >= 500) throw new Error("server_error");
		throw new Error(msg || `http_${res.status}`);
	}
	if (data?.error) throw new Error(data.error.message || "provider_error");

	const raw = typeof data?.choices?.[0]?.message?.content === "string" ? data.choices[0].message.content : "";
	const text = raw
		.replace(/&#39;/g, "'")
		.replace(/&quot;/g, '"')
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&");
	if (!text.trim()) throw new Error("empty_response");

	return { text, detected: src === "auto" ? "" : src };
}

// TTS via browser speechSynthesis (no network, no key).
export function speak(text, lang) {
	try {
		const u = new SpeechSynthesisUtterance(text);
		u.lang = SPEAK_LANG[lang] || "en-US";
		speechSynthesis.cancel();
		speechSynthesis.speak(u);
	} catch {
		/* nope */
	}
}
