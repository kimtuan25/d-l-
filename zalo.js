// ==UserScript==
// @name         Zalo Custom Reactions
// @version      1
// @description  Zalo web custom reaction
// @author       binhminh
// @match        https://*.zalo.me/*
// @match        https://chat.zalo.me/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
	"use strict";

	if (window.__zaloCustomReactionsLoaded) return;
	window.__zaloCustomReactionsLoaded = true;

	const STORAGE_RECENT_REACTION = "recentlyCustomReaction";
	const MAX_CUSTOM_REACTION_LENGTH = 20;
	const CUSTOM_REACTION_BASE = 1000000000;
	const CUSTOM_REACTION_RANGE = 1000000000;
	const CUSTOM_REACTION_PREFIX = "zalo-custom-reaction:";

	const settings = {
		isRecently: false,
	};

	const reactions = [
		{
			type: 100,
			icon: "👏",
			name: "clap",
			class: "emoji-sizer emoji-outer",
			bgPos: "80% 12.5%",
		},
		{
			type: 101,
			icon: "🎉",
			name: "party",
			class: "emoji-sizer emoji-outer",
			bgPos: "74% 62.5%",
		},
		{
			type: 102,
			icon: "🎨",
			name: "send_custom",
			class: "emoji-sizer emoji-outer",
			bgPos: "84% 82.5%",
		},
	];

	function ensureStyle(id, cssText) {
		if (document.getElementById(id)) return;
		const style = document.createElement("style");
		style.id = id;
		style.textContent = cssText;
		document.head.appendChild(style);
	}

	function graphemes(str) {
		const value = String(str ?? "");
		if (typeof Intl !== "undefined" && Intl.Segmenter) {
			return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value)].map(segment => segment.segment);
		}
		return Array.from(value);
	}

	function graphemeLength(str) {
		return graphemes(str).length;
	}

	function truncateGraphemes(str, maxLength) {
		return graphemes(str).slice(0, maxLength).join("");
	}

	function isLikelySingleEmoji(str) {
		const value = String(str ?? "").trim();
		if (!value || graphemeLength(value) !== 1) return false;

		// Extended_Pictographic bắt phần lớn emoji hiện đại. Fallback phía dưới giữ tương thích trình duyệt cũ.
		try {
			return /\p{Extended_Pictographic}/u.test(value);
		} catch (_) {
			return /[\u203C-\u3299\uD83C-\uDBFF\uDC00-\uDFFF]/u.test(value);
		}
	}

	function shouldRenderAsTextReaction(react) {
		return Boolean(
			react?.isCustomText ||
			react?.name === "text" ||
			(react?.isCustom && !isLikelySingleEmoji(react.icon))
		);
	}
	function simpleHash(str) {
		let hash = 2166136261;
		const input = `${CUSTOM_REACTION_PREFIX}${String(str)}`;

		for (const char of input) {
			const cp = char.codePointAt(0);
			hash ^= cp & 0xff;
			hash = Math.imul(hash, 16777619);
			hash ^= (cp >>> 8) & 0xff;
			hash = Math.imul(hash, 16777619);
			hash ^= (cp >>> 16) & 0xff;
			hash = Math.imul(hash, 16777619);
			hash ^= (cp >>> 24) & 0xff;
			hash = Math.imul(hash, 16777619);
		}

		return CUSTOM_REACTION_BASE + ((hash >>> 0) % CUSTOM_REACTION_RANGE);
	}

	function createCustomReaction(rawText, isRecentlyCustom = false) {
		const icon = truncateGraphemes(String(rawText ?? "").trim(), MAX_CUSTOM_REACTION_LENGTH);
		return {
			type: simpleHash(icon),
			icon,
			name: isLikelySingleEmoji(icon) ? "custom_emoji" : "text",
			class: "",
			bgPos: "",
			isCustom: true,
			isCustomText: !isLikelySingleEmoji(icon),
			isRecentlyCustom,
		};
	}

	function normalizeStoredReaction(value) {
		if (!value || typeof value.icon !== "string" || !value.icon.trim()) return null;
		return createCustomReaction(value.icon, true);
	}

	function registerReaction(react) {
		const info = window.S?.default?.reactionMsgInfo;
		if (!Array.isArray(info) || !react || typeof react.type !== "number" || !react.icon) return false;

		const existed = info.some(item => item?.rType === react.type);
		if (!existed) {
			info.push({
				rType: react.type,
				rIcon: react.icon,
				name: react.name,
			});
		}
		return true;
	}

	const RecentlyReaction = {
		add(reactionText) {
			const emojiCustom = createCustomReaction(reactionText, true);
			if (!emojiCustom.icon) return null;

			const recentIndex = reactions.findIndex(react => react.isRecentlyCustom);
			if (recentIndex >= 0) {
				reactions[recentIndex] = emojiCustom;
			} else {
				reactions.push(emojiCustom);
			}

			settings.isRecently = true;
			registerReaction(emojiCustom);
			localStorage.setItem(STORAGE_RECENT_REACTION, JSON.stringify(emojiCustom));
			return emojiCustom;
		},

		get() {
			try {
				const raw = localStorage.getItem(STORAGE_RECENT_REACTION);
				if (!raw) return null;
				return normalizeStoredReaction(JSON.parse(raw));
			} catch (err) {
				console.warn("[Zalo Custom Reactions] Invalid recentlyCustomReaction. Removed broken value.", err);
				localStorage.removeItem(STORAGE_RECENT_REACTION);
				return null;
			}
		},

		load() {
			const reaction = this.get();
			if (!reaction) return;

			settings.isRecently = true;
			const recentIndex = reactions.findIndex(react => react.isRecentlyCustom);
			if (recentIndex >= 0) {
				reactions[recentIndex] = reaction;
			} else {
				reactions.push(reaction);
			}
		},
	};

	const emojiCategories = {
		"Smileys": ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🥲", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥸", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😮‍💨", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🫣", "🤭", "🫢", "🫡", "🤫", "🫠", "🤥", "😶", "😶‍🌫️", "😐", "😑", "😬", "🫨", "🫥", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "😵‍💫", "🫩", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️", "👽", "👾", "🤖", "🎃", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾"],
		"Gestures": ["👋", "🤚", "🖐️", "✋", "🖖", "🫱", "🫲", "🫳", "🫴", "👌", "🤌", "🤏", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "🫵", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "🫶", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅", "👄", "🫦"],
		"People": ["👶", "🧒", "👦", "👧", "🧑", "👨", "👩", "🧔", "🧔‍♂️", "🧔‍♀️", "👱", "👱‍♂️", "👱‍♀️", "👨‍🦰", "👩‍🦰", "🧑‍🦰", "👨‍🦱", "👩‍🦱", "🧑‍🦱", "👨‍🦳", "👩‍🦳", "🧑‍🦳", "👨‍🦲", "👩‍🦲", "🧑‍🦲", "🧓", "👴", "👵", "🙍", "🙍‍♂️", "🙍‍♀️", "🙎", "🙎‍♂️", "🙎‍♀️", "🙅", "🙅‍♂️", "🙅‍♀️", "🙆", "🙆‍♂️", "🙆‍♀️", "💁", "💁‍♂️", "💁‍♀️", "🙋", "🙋‍♂️", "🙋‍♀️", "🧏", "🧏‍♂️", "🧏‍♀️", "🙇", "🙇‍♂️", "🙇‍♀️", "🤦", "🤦‍♂️", "🤦‍♀️", "🤷", "🤷‍♂️", "🤷‍♀️", "🧑‍⚕️", "👨‍⚕️", "👩‍⚕️", "🧑‍🎓", "👨‍🎓", "👩‍🎓", "🧑‍🏫", "👨‍🏫", "👩‍🏫", "🧑‍⚖️", "👨‍⚖️", "👩‍⚖️", "🧑‍🌾", "👨‍🌾", "👩‍🌾", "🧑‍🍳", "👨‍🍳", "👩‍🍳", "🧑‍🔧", "👨‍🔧", "👩‍🔧", "🧑‍💻", "👨‍💻", "👩‍💻", "🧑‍🎤", "👨‍🎤", "👩‍🎤", "🧑‍🎨", "👨‍🎨", "👩‍🎨", "🧑‍🚀", "👨‍🚀", "👩‍🚀", "🧑‍🚒", "👨‍🚒", "👩‍🚒", "👮", "🕵️", "💂", "🥷", "👷", "🫅", "🤴", "👸", "👳", "👲", "🧕", "🤵", "👰", "🤰", "🫃", "🫄", "🤱", "👼", "🎅", "🤶", "🧑‍🎄", "🦸", "🦹", "🧙", "🧚", "🧛", "🧜", "🧝", "🧞", "🧟", "🧌"],
		"Animals": ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨", "🐯", "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🪱", "🐛", "🦋", "🐌", "🐞", "🐜", "🪰", "🪲", "🪳", "🦟", "🦗", "🕷️", "🕸️", "🦂", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑", "🦐", "🦞", "🦀", "🪼", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🦭", "🐊", "🐅", "🐆", "🦓", "🦍", "🦧", "🦣", "🐘", "🦛", "🦏", "🐪", "🐫", "🦒", "🦘", "🦬", "🐃", "🐂", "🐄", "🐎", "🐖", "🐏", "🐑", "🦙", "🐐", "🦌", "🫎", "🐕", "🐩", "🦮", "🐕‍🦺", "🐈", "🐈‍⬛", "🪶", "🐓", "🦃", "🦤", "🦚", "🦜", "🦢", "🪿", "🦩", "🐇", "🦝", "🦨", "🦡", "🦫", "🦦", "🦥", "🐁", "🐀", "🐿️", "🦔"],
		"Nature": ["🌵", "🎄", "🌲", "🌳", "🌴", "🪵", "🌱", "🌿", "☘️", "🍀", "🎍", "🪴", "🎋", "🍃", "🍂", "🍁", "🪺", "🪹", "🍄", "🍄‍🟫", "🐚", "🪸", "🪨", "🌾", "💐", "🌷", "🪻", "🌹", "🥀", "🪷", "🌺", "🌸", "🌼", "🌻", "🌞", "🌝", "🌛", "🌜", "🌚", "🌕", "🌖", "🌗", "🌘", "🌑", "🌒", "🌓", "🌔", "🌙", "🌎", "🌍", "🌏", "🪐", "💫", "⭐", "🌟", "✨", "⚡", "☄️", "💥", "🔥", "🌪️", "🌈", "☀️", "🌤️", "⛅", "🌥️", "☁️", "🌦️", "🌧️", "⛈️", "🌩️", "🌨️", "❄️", "☃️", "⛄", "🌬️", "💨", "💧", "💦", "🫧", "☔", "☂️", "🌊", "🌫️"],
		"Food": ["🍎", "🍐", "🍊", "🍋", "🍋‍🟩", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🫒", "🥑", "🍆", "🥔", "🥕", "🌽", "🌶️", "🫑", "🥒", "🥬", "🥦", "🧄", "🧅", "🥜", "🫘", "🌰", "🫚", "🫛", "🍄", "🍞", "🥐", "🥖", "🫓", "🥨", "🥯", "🥞", "🧇", "🧀", "🍖", "🍗", "🥩", "🥓", "🍔", "🍟", "🍕", "🌭", "🥪", "🌮", "🌯", "🫔", "🥙", "🧆", "🥚", "🍳", "🥘", "🍲", "🫕", "🥣", "🥗", "🍿", "🧈", "🧂", "🥫", "🍱", "🍘", "🍙", "🍚", "🍛", "🍜", "🍝", "🍠", "🍢", "🍣", "🍤", "🍥", "🥮", "🍡", "🥟", "🥠", "🥡", "🦪", "🍦", "🍧", "🍨", "🍩", "🍪", "🎂", "🍰", "🧁", "🥧", "🍫", "🍬", "🍭", "🍮", "🍯", "🍼", "🥛", "☕", "🫖", "🍵", "🍶", "🍾", "🍷", "🍸", "🍹", "🍺", "🍻", "🥂", "🥃", "🫗", "🥤", "🧋", "🧃", "🧉", "🧊", "🥢", "🍽️", "🍴", "🥄", "🔪", "🫙", "🏺"],
		"Travel": ["🌍", "🌎", "🌏", "🌐", "🗺️", "🗾", "🧭", "🏔️", "⛰️", "🌋", "🗻", "🏕️", "🏖️", "🏜️", "🏝️", "🏞️", "🏟️", "🏛️", "🏗️", "🧱", "🪨", "🪵", "🛖", "🏘️", "🏚️", "🏠", "🏡", "🏢", "🏣", "🏤", "🏥", "🏦", "🏨", "🏩", "🏪", "🏫", "🏬", "🏭", "🏯", "🏰", "💒", "🗼", "🗽", "⛪", "🕌", "🛕", "🕍", "⛩️", "🕋", "⛲", "⛺", "🌁", "🌃", "🏙️", "🌄", "🌅", "🌆", "🌇", "🌉", "♨️", "🎠", "🛝", "🎡", "🎢", "💈", "🎪", "🚂", "🚃", "🚄", "🚅", "🚆", "🚇", "🚈", "🚉", "🚊", "🚝", "🚞", "🚋", "🚌", "🚍", "🚎", "🚐", "🚑", "🚒", "🚓", "🚔", "🚕", "🚖", "🚗", "🚘", "🚙", "🛻", "🚚", "🚛", "🚜", "🏎️", "🏍️", "🛵", "🦽", "🦼", "🛺", "🚲", "🛴", "🛹", "🛼", "🚏", "🛣️", "🛤️", "🛢️", "⛽", "🛞", "🚨", "🚥", "🚦", "🛑", "🚧", "⚓", "🛟", "⛵", "🛶", "🚤", "🛳️", "⛴️", "🛥️", "🚢", "✈️", "🛩️", "🛫", "🛬", "🪂", "💺", "🚁", "🚟", "🚠", "🚡", "🛰️", "🚀", "🛸", "🧳", "⌛", "⏳", "⌚", "⏰", "⏱️", "⏲️", "🕰️"],
		"Activities": ["⚽️", "🏀", "🏈", "⚾️", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳️", "🪁", "🏹", "🎣", "🤿", "🥊", "🥋", "🎽", "🛹", "🛼", "🛷", "⛸️", "🥌", "🎿", "⛷️", "🏂", "🪂", "🏋️", "🤼", "🤸", "⛹️", "🤺", "🤾", "🏌️", "🏇", "🧘", "🏄", "🏊", "🤽", "🚣", "🧗", "🚵", "🚴", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️", "🏵️", "🎗️", "🎫", "🎟️", "🎪", "🤹", "🎭", "🩰", "🎨", "🎬", "🎤", "🎧", "🎼", "🎹", "🥁", "🪘", "🎷", "🎺", "🪗", "🎸", "🪕", "🎻", "🪈", "🎲", "♟️", "🎯", "🎳", "🎮", "🎰", "🧩"],
		"Objects": ["⌚️", "📱", "📲", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "🖲️", "🕹️", "🗜️", "💽", "💾", "💿", "📀", "📼", "📷", "📸", "📹", "🎥", "📽️", "🎞️", "📞", "☎️", "📟", "📠", "📺", "📻", "🎙️", "🎚️", "🎛️", "🧭", "⏱️", "⏲️", "⏰", "🕰️", "⌛", "⏳", "📡", "🔋", "🪫", "🔌", "💡", "🔦", "🕯️", "🪔", "🧯", "🛢️", "💸", "💵", "💴", "💶", "💷", "🪙", "💰", "💳", "💎", "⚖️", "🪜", "🧰", "🪛", "🔧", "🔨", "⚒️", "🛠️", "⛏️", "🪚", "🔩", "⚙️", "🪤", "🧱", "⛓️", "⛓️‍💥", "🧲", "🔫", "💣", "🧨", "🪓", "🔪", "🗡️", "⚔️", "🛡️", "🚬", "⚰️", "🪦", "⚱️", "🏺", "🔮", "📿", "🧿", "🪬", "💈", "⚗️", "🔭", "🔬", "🕳️", "🩹", "🩺", "🩻", "🩼", "💊", "💉", "🩸", "🧬", "🦠", "🧫", "🧪", "🌡️", "🧹", "🪠", "🧺", "🧻", "🚽", "🚰", "🚿", "🛁", "🛀", "🧼", "🪥", "🪒", "🧽", "🪣", "🧴", "🛎️", "🔑", "🗝️", "🚪", "🪑", "🛋️", "🛏️", "🛌", "🧸", "🪆", "🖼️", "🪞", "🪟", "🛍️", "🛒", "🎁", "🎈", "🎏", "🎀", "🪄", "🪅", "🎊", "🎉", "🪩", "🎎", "🏮", "🎐", "🧧", "✉️", "📩", "📨", "📧", "💌", "📥", "📤", "📦", "🏷️", "🪧", "📪", "📫", "📬", "📭", "📮", "📯", "📜", "📃", "📄", "📑", "🧾", "📊", "📈", "📉", "🗒️", "🗓️", "📆", "📅", "🗑️", "📇", "🗃️", "🗳️", "🗄️", "📋", "📁", "📂", "🗂️", "🗞️", "📰", "📓", "📔", "📒", "📕", "📗", "📘", "📙", "📚", "📖", "🔖", "🧷", "🔗", "📎", "🖇️", "📐", "📏", "🧮", "📌", "📍", "✂️", "🖊️", "🖋️", "✒️", "🖌️", "🖍️", "📝", "✏️", "🔍", "🔎", "🔏", "🔐", "🔒", "🔓"],
		"Symbols": ["❤️", "🧡", "💛", "💚", "💙", "🩵", "💜", "🖤", "🩶", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "☮️", "✝️", "☪️", "🕉️", "☸️", "✡️", "🔯", "🕎", "☯️", "☦️", "🛐", "⛎", "♈️", "♉️", "♊️", "♋️", "♌️", "♍️", "♎️", "♏️", "♐️", "♑️", "♒️", "♓️", "🆔", "⚛️", "🉑", "☢️", "☣️", "📴", "📳", "🈶", "🈚", "🈸", "🈺", "🈷️", "✴️", "🆚", "💮", "🉐", "㊙️", "㊗️", "🈴", "🈵", "🈹", "🈲", "🅰️", "🅱️", "🆎", "🆑", "🅾️", "🆘", "❌", "⭕", "🛑", "⛔", "📛", "🚫", "💯", "💢", "♨️", "🚷", "🚯", "🚳", "🚱", "🔞", "📵", "🚭", "❗", "❕", "❓", "❔", "‼️", "⁉️", "🔅", "🔆", "〽️", "⚠️", "🚸", "🔱", "⚜️", "🔰", "♻️", "✅", "🈯", "💹", "❇️", "✳️", "❎", "🌐", "💠", "Ⓜ️", "🌀", "💤", "🏧", "🚾", "♿", "🅿️", "🛗", "🈳", "🈂️", "🛂", "🛃", "🛄", "🛅", "🚹", "🚺", "🚼", "⚧️", "🚻", "🚮", "🎦", "📶", "🈁", "🔣", "ℹ️", "🔤", "🔡", "🔠", "🆖", "🆗", "🆙", "🆒", "🆕", "🆓", "0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟", "🔢", "#️⃣", "*️⃣", "⏏️", "▶️", "⏸️", "⏯️", "⏹️", "⏺️", "⏭️", "⏮️", "⏩", "⏪", "⏫", "⏬", "◀️", "🔼", "🔽", "➡️", "⬅️", "⬆️", "⬇️", "↗️", "↘️", "↙️", "↖️", "↕️", "↔️", "↪️", "↩️", "⤴️", "⤵️", "🔀", "🔁", "🔂", "🔄", "🔃", "🎵", "🎶", "➕", "➖", "➗", "✖️", "🟰", "♾️", "💲", "💱", "™️", "©️", "®️", "〰️", "➰", "➿", "🔚", "🔙", "🔛", "🔝", "🔜", "✔️", "☑️", "🔘", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "⚫", "⚪", "🟤", "🔺", "🔻", "🔸", "🔹", "🔶", "🔷", "🔳", "🔲", "▪️", "▫️", "◾", "◽", "◼️", "◻️", "🟥", "🟧", "🟨", "🟩", "🟦", "🟪", "⬛", "⬜", "🟫"],
		"Flags": ["🏁", "🚩", "🎌", "🏴", "🏳️", "🏳️‍🌈", "🏳️‍⚧️", "🏴‍☠️", "🇺🇳", "🇦🇨", "🇦🇩", "🇦🇪", "🇦🇫", "🇦🇬", "🇦🇮", "🇦🇱", "🇦🇲", "🇦🇴", "🇦🇶", "🇦🇷", "🇦🇸", "🇦🇹", "🇦🇺", "🇦🇼", "🇦🇽", "🇦🇿", "🇧🇦", "🇧🇧", "🇧🇩", "🇧🇪", "🇧🇫", "🇧🇬", "🇧🇭", "🇧🇮", "🇧🇯", "🇧🇱", "🇧🇲", "🇧🇳", "🇧🇴", "🇧🇶", "🇧🇷", "🇧🇸", "🇧🇹", "🇧🇻", "🇧🇼", "🇧🇾", "🇧🇿", "🇨🇦", "🇨🇨", "🇨🇩", "🇨🇫", "🇨🇬", "🇨🇭", "🇨🇮", "🇨🇰", "🇨🇱", "🇨🇲", "🇨🇳", "🇨🇴", "🇨🇵", "🇨🇷", "🇨🇺", "🇨🇻", "🇨🇼", "🇨🇽", "🇨🇾", "🇨🇿", "🇩🇪", "🇩🇬", "🇩🇯", "🇩🇰", "🇩🇲", "🇩🇴", "🇩🇿", "🇪🇦", "🇪🇨", "🇪🇪", "🇪🇬", "🇪🇭", "🇪🇷", "🇪🇸", "🇪🇹", "🇪🇺", "🇫🇮", "🇫🇯", "🇫🇰", "🇫🇲", "🇫🇴", "🇫🇷", "🇬🇦", "🇬🇧", "🇬🇩", "🇬🇪", "🇬🇫", "🇬🇬", "🇬🇭", "🇬🇮", "🇬🇱", "🇬🇲", "🇬🇳", "🇬🇵", "🇬🇶", "🇬🇷", "🇬🇸", "🇬🇹", "🇬🇺", "🇬🇼", "🇬🇾", "🇭🇰", "🇭🇲", "🇭🇳", "🇭🇷", "🇭🇹", "🇭🇺", "🇮🇨", "🇮🇩", "🇮🇪", "🇮🇱", "🇮🇲", "🇮🇳", "🇮🇴", "🇮🇶", "🇮🇷", "🇮🇸", "🇮🇹", "🇯🇪", "🇯🇲", "🇯🇴", "🇯🇵", "🇰🇪", "🇰🇬", "🇰🇭", "🇰🇮", "🇰🇲", "🇰🇳", "🇰🇵", "🇰🇷", "🇰🇼", "🇰🇾", "🇰🇿", "🇱🇦", "🇱🇧", "🇱🇨", "🇱🇮", "🇱🇰", "🇱🇷", "🇱🇸", "🇱🇹", "🇱🇺", "🇱🇻", "🇱🇾", "🇲🇦", "🇲🇨", "🇲🇩", "🇲🇪", "🇲🇫", "🇲🇬", "🇲🇭", "🇲🇰", "🇲🇱", "🇲🇲", "🇲🇳", "🇲🇴", "🇲🇵", "🇲🇶", "🇲🇷", "🇲🇸", "🇲🇹", "🇲🇺", "🇲🇻", "🇲🇼", "🇲🇽", "🇲🇾", "🇲🇿", "🇳🇦", "🇳🇨", "🇳🇪", "🇳🇫", "🇳🇬", "🇳🇮", "🇳🇱", "🇳🇴", "🇳🇵", "🇳🇷", "🇳🇺", "🇳🇿", "🇴🇲", "🇵🇦", "🇵🇪", "🇵🇫", "🇵🇬", "🇵🇭", "🇵🇰", "🇵🇱", "🇵🇲", "🇵🇳", "🇵🇷", "🇵🇸", "🇵🇹", "🇵🇼", "🇵🇾", "🇶🇦", "🇷🇪", "🇷🇴", "🇷🇸", "🇷🇺", "🇷🇼", "🇸🇦", "🇸🇧", "🇸🇨", "🇸🇩", "🇸🇪", "🇸🇬", "🇸🇭", "🇸🇮", "🇸🇯", "🇸🇰", "🇸🇱", "🇸🇲", "🇸🇳", "🇸🇴", "🇸🇷", "🇸🇸", "🇸🇹", "🇸🇻", "🇸🇽", "🇸🇾", "🇸🇿", "🇹🇦", "🇹🇨", "🇹🇩", "🇹🇫", "🇹🇬", "🇹🇭", "🇹🇯", "🇹🇰", "🇹🇱", "🇹🇲", "🇹🇳", "🇹🇴", "🇹🇷", "🇹🇹", "🇹🇻", "🇹🇼", "🇹🇿", "🇺🇦", "🇺🇬", "🇺🇲", "🇺🇸", "🇺🇾", "🇺🇿", "🇻🇦", "🇻🇨", "🇻🇪", "🇻🇬", "🇻🇮", "🇻🇳", "🇻🇺", "🇼🇫", "🇼🇸", "🇽🇰", "🇾🇪", "🇾🇹", "🇿🇦", "🇿🇲", "🇿🇼"],
	};

	function createEmojiPicker(input, charCounter, emojiToggleButton) {
		ensureStyle("zalo-custom-reaction-emoji-picker-style", `
			#emoji-picker div::-webkit-scrollbar {
				display: none;
			}
			.emoji-category-tab {
				display: flex;
				align-items: center;
				justify-content: center;
				height: 28px;
				width: 28px;
			}
		`);

		const picker = document.createElement("div");
		picker.id = "emoji-picker";
		picker.style.cssText = `
			position: absolute;
			bottom: calc(100% + 10px);
			right: 0;
			background: white;
			border-radius: 12px;
			box-shadow: 0 4px 16px rgba(0,0,0,0.2);
			padding: 8px;
			z-index: 10000;
			animation: fadeIn 0.2s ease-out;
			width: 280px;
			max-height: 350px;
			overflow: hidden;
			display: none;
			flex-direction: column;
		`;

		const tabsContainer = document.createElement("div");
		tabsContainer.style.cssText = `
			display: flex;
			overflow-x: auto;
			padding-bottom: 5px;
			margin-bottom: 5px;
			border-bottom: 1px solid #eee;
			gap: 4px;
			scrollbar-width: none;
			-ms-overflow-style: none;
			height: 36px;
			min-height: 36px;
			align-items: center;
		`;

		tabsContainer.addEventListener("wheel", function (e) {
			this.scrollLeft += e.deltaY;
			e.preventDefault();
		}, { passive: false });

		const emojiContent = document.createElement("div");
		emojiContent.style.cssText = `
			overflow-y: auto;
			display: grid;
			grid-template-columns: repeat(8, 1fr);
			gap: 4px;
			padding-right: 4px;
			max-height: 240px;
		`;

		const categoryIcons = {
			"Smileys": "😀",
			"Gestures": "👍",
			"People": "👨",
			"Animals": "🐱",
			"Nature": "🌿",
			"Food": "🍔",
			"Travel": "✈️",
			"Activities": "⚽️",
			"Objects": "📱",
			"Symbols": "❤️",
			"Flags": "🏳️",
		};

		function populateCategory(category) {
			emojiContent.innerHTML = "";
			emojiCategories[category].forEach(emoji => {
				const emojiButton = document.createElement("button");
				emojiButton.type = "button";
				emojiButton.className = "emoji-button";
				emojiButton.textContent = emoji;
				emojiButton.style.cssText = `
					background: none;
					border: none;
					cursor: pointer;
					font-size: 18px;
					padding: 4px;
					border-radius: 4px;
					transition: background-color 0.2s, transform 0.2s;
				`;
				emojiButton.onmouseover = () => {
					emojiButton.style.backgroundColor = "#f0f0f0";
					emojiButton.style.transform = "scale(1.1)";
				};
				emojiButton.onmouseout = () => {
					emojiButton.style.backgroundColor = "transparent";
					emojiButton.style.transform = "scale(1)";
				};
				emojiContent.appendChild(emojiButton);
			});
		}

		Object.keys(emojiCategories).forEach((category, idx) => {
			const tab = document.createElement("button");
			tab.type = "button";
			tab.className = "emoji-category-tab";
			tab.dataset.category = category;
			tab.textContent = categoryIcons[category] || category.slice(0, 1);
			tab.title = category;
			tab.style.cssText = `
				background: ${idx === 0 ? "#e3f2fd" : "transparent"};
				border: none;
				border-radius: 6px;
				padding: 0;
				cursor: pointer;
				font-size: 16px;
				min-width: 28px;
				min-height: 28px;
				text-align: center;
				transition: background-color 0.2s;
				flex-shrink: 0;
				display: flex;
				align-items: center;
				justify-content: center;
			`;

			tab.addEventListener("click", () => {
				picker.querySelectorAll(".emoji-category-tab").forEach(t => {
					t.style.background = "transparent";
				});
				tab.style.background = "#e3f2fd";
				populateCategory(category);
			});

			tabsContainer.appendChild(tab);
		});

		picker.appendChild(tabsContainer);
		picker.appendChild(emojiContent);
		populateCategory(Object.keys(emojiCategories)[0]);

		picker.addEventListener("click", e => {
			if (!e.target.classList.contains("emoji-button")) return;
			input.value = truncateGraphemes(input.value + e.target.textContent, MAX_CUSTOM_REACTION_LENGTH);
			charCounter.textContent = `${graphemeLength(input.value)}/${MAX_CUSTOM_REACTION_LENGTH}`;
			picker.style.display = "none";
			input.focus();
		});

		document.addEventListener("click", e => {
			if (
				picker.style.display === "flex" &&
				!picker.contains(e.target) &&
				e.target !== emojiToggleButton
			) {
				picker.style.display = "none";
			}
		});

		return picker;
	}

	function createTextInputPopup() {
		const popup = document.createElement("div");
		popup.id = "custom-text-reaction-popup";
		popup.style.cssText = `
			position: fixed;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			background: white;
			border-radius: 12px;
			box-shadow: 0 4px 20px rgba(0,0,0,0.25);
			padding: 20px;
			z-index: 9999;
			display: none;
			flex-direction: column;
			gap: 15px;
			min-width: 300px;
			font-family: 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif;
			animation: fadeIn 0.2s ease-out;
		`;

		const title = document.createElement("div");
		title.textContent = "Tùy chỉnh reaction";
		title.style.cssText = "font-weight: bold; font-size: 16px; color: #333; margin-bottom: 5px;";

		const inputContainer = document.createElement("div");
		inputContainer.style.cssText = "position: relative;";

		const input = document.createElement("input");
		input.type = "text";
		input.id = "custom-text-reaction-input";
		input.placeholder = "Nhập nội dung reaction...";
		input.autocomplete = "off";
		input.style.cssText = `
			padding: 10px 12px;
			padding-right: 40px;
			border: 2px solid #e0e0e0;
			border-radius: 8px;
			width: 100%;
			box-sizing: border-box;
			font-size: 14px;
			transition: border-color 0.2s;
			outline: none;
		`;
		input.addEventListener("focus", () => {
			input.style.borderColor = "#2196F3";
		});
		input.addEventListener("blur", () => {
			input.style.borderColor = "#e0e0e0";
		});

		const emojiButton = document.createElement("button");
		emojiButton.type = "button";
		emojiButton.id = "emoji-button";
		emojiButton.textContent = "😊";
		emojiButton.style.cssText = `
			position: absolute;
			right: 10px;
			top: 50%;
			transform: translateY(-50%);
			background: none;
			border: none;
			font-size: 18px;
			cursor: pointer;
			padding: 0;
			opacity: 0.7;
			transition: opacity 0.2s, transform 0.2s;
		`;
		emojiButton.onmouseover = () => {
			emojiButton.style.opacity = "1";
			emojiButton.style.transform = "translateY(-50%) scale(1.1)";
		};
		emojiButton.onmouseout = () => {
			emojiButton.style.opacity = "0.7";
			emojiButton.style.transform = "translateY(-50%) scale(1)";
		};

		const charCounter = document.createElement("div");
		charCounter.style.cssText = "position: absolute; right: 10px; bottom: -18px; font-size: 11px; color: #999;";
		charCounter.textContent = `0/${MAX_CUSTOM_REACTION_LENGTH}`;

		const emojiPicker = createEmojiPicker(input, charCounter, emojiButton);

		emojiButton.addEventListener("click", e => {
			e.preventDefault();
			e.stopPropagation();
			emojiPicker.style.display = emojiPicker.style.display === "flex" ? "none" : "flex";
		});

		input.addEventListener("input", () => {
			const truncated = truncateGraphemes(input.value, MAX_CUSTOM_REACTION_LENGTH);
			if (input.value !== truncated) input.value = truncated;
			charCounter.textContent = `${graphemeLength(input.value)}/${MAX_CUSTOM_REACTION_LENGTH}`;
		});

		inputContainer.appendChild(input);
		inputContainer.appendChild(emojiButton);
		inputContainer.appendChild(charCounter);
		inputContainer.appendChild(emojiPicker);

		const buttonContainer = document.createElement("div");
		buttonContainer.style.cssText = "display: flex; justify-content: flex-end; gap: 12px; margin-top: 10px;";

		const cancelButton = document.createElement("button");
		cancelButton.type = "button";
		cancelButton.textContent = "Hủy";
		cancelButton.style.cssText = `
			padding: 8px 16px;
			border: none;
			border-radius: 6px;
			background-color: #f5f5f5;
			color: #333;
			font-weight: 500;
			cursor: pointer;
			transition: background-color 0.2s;
		`;
		cancelButton.onmouseover = () => {
			cancelButton.style.backgroundColor = "#e0e0e0";
		};
		cancelButton.onmouseout = () => {
			cancelButton.style.backgroundColor = "#f5f5f5";
		};

		const confirmButton = document.createElement("button");
		confirmButton.type = "button";
		confirmButton.textContent = "Gửi";
		confirmButton.style.cssText = `
			padding: 8px 16px;
			border: none;
			border-radius: 6px;
			background-color: #2196F3;
			color: white;
			font-weight: 500;
			cursor: pointer;
			transition: background-color 0.2s;
		`;
		confirmButton.onmouseover = () => {
			confirmButton.style.backgroundColor = "#1976D2";
		};
		confirmButton.onmouseout = () => {
			confirmButton.style.backgroundColor = "#2196F3";
		};

		buttonContainer.appendChild(cancelButton);
		buttonContainer.appendChild(confirmButton);

		popup.appendChild(title);
		popup.appendChild(inputContainer);
		popup.appendChild(buttonContainer);

		const overlay = document.createElement("div");
		overlay.id = "custom-reaction-overlay";
		overlay.style.cssText = `
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			background: rgba(0,0,0,0.4);
			z-index: 9998;
			display: none;
			animation: fadeIn 0.2s ease-out;
		`;

		let onSubmit = null;

		function hidePopup() {
			popup.style.display = "none";
			overlay.style.display = "none";
			emojiPicker.style.display = "none";
		}

		function submit() {
			const customText = truncateGraphemes(input.value.trim(), MAX_CUSTOM_REACTION_LENGTH);
			if (!customText) return;
			if (typeof onSubmit === "function") onSubmit(customText);
		}

		cancelButton.onclick = hidePopup;
		overlay.addEventListener("click", e => {
			if (e.target === overlay) hidePopup();
		});
		confirmButton.addEventListener("click", submit);
		input.addEventListener("keydown", e => {
			if (e.key === "Enter") {
				e.preventDefault();
				submit();
			}
			if (e.key === "Escape") {
				e.preventDefault();
				hidePopup();
			}
		});

		document.body.appendChild(popup);
		document.body.appendChild(overlay);

		return {
			popup,
			input,
			confirmButton,
			overlay,
			show(handler) {
				onSubmit = handler;
				popup.style.display = "flex";
				overlay.style.display = "block";
				input.value = "";
				charCounter.textContent = `0/${MAX_CUSTOM_REACTION_LENGTH}`;
				emojiPicker.style.display = "none";
				setTimeout(() => input.focus(), 0);
			},
			hide: hidePopup,
		};
	}

	function enhanceReactionPanel() {
		ensureStyle("zalo-custom-reaction-panel-style", `
			.reaction-emoji-list {
				display: flex !important;
				width: fit-content !important;
				gap: 2px !important;
				border-radius: 28px !important;
				background-color: white !important;
				box-shadow: 0 2px 12px rgba(0,0,0,0.15) !important;
			}

			.reaction-emoji-icon {
				display: flex !important;
				align-items: center !important;
				justify-content: center !important;
				font-size: 20px !important;
				border-radius: 50% !important;
				cursor: pointer !important;
				background-color: rgba(240, 240, 240, 0.5) !important;
				transition: transform 0.2s, background-color 0.2s !important;
			}

			.reaction-emoji-text {
				white-space: nowrap !important;
				overflow: hidden !important;
				text-overflow: ellipsis !important;
				max-width: 3ch !important;
				padding-left: 6px !important;
				padding-right: 6px !important;
				border-radius: 12px !important;
			}

			.reaction-emoji-icon:hover {
				transform: scale(1.1) !important;
				background-color: #e3f2fd !important;
			}

			.emoji-list-wrapper {
				padding: 0.07rem !important;
			}

			@keyframes fadeIn {
				from { opacity: 0; }
				to { opacity: 1; }
			}

			@keyframes popIn {
				0% { transform: scale(0.8); opacity: 0; }
				70% { transform: scale(1.05); opacity: 1; }
				100% { transform: scale(1); opacity: 1; }
			}
		`);
	}

	function applyBaseStyle() {
		ensureStyle("zalo-custom-reaction-base-style", `
			[data-custom="true"] {
				position: relative;
			}

			[data-custom="true"]::after {
				content: '';
				position: absolute;
				bottom: -2px;
				right: -2px;
				width: 6px;
				height: 6px;
				background: #2196F3;
				border-radius: 50%;
			}

			.msg-reaction-icon span {
				display: flex;
				align-items: center;
				justify-content: center;
			}

			.text-reaction {
				background-color: #e3f2fd;
				border-radius: 12px;
				padding: 3px 10px;
				font-size: 12px;
				font-weight: 600;
				color: #1976d2;
				max-width: 120px;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
				box-shadow: 0 1px 3px rgba(0,0,0,0.1);
			}

			[data-custom="true"]:hover::before {
				content: attr(title);
				position: absolute;
				top: -30px;
				left: 50%;
				transform: translateX(-50%);
				background-color: rgba(0,0,0,0.7);
				color: white;
				padding: 4px 8px;
				border-radius: 4px;
				font-size: 12px;
				white-space: nowrap;
				pointer-events: none;
				opacity: 0;
				animation: fadeIn 0.2s forwards;
				z-index: 9999;
			}
		`);
	}

	function getReactFiber(el) {
		if (!el) return null;
		const key = Object.keys(el).find(k =>
			k.startsWith("__reactFiber$") ||
			k.startsWith("__reactInternalInstance$")
		);
		return key ? el[key] : null;
	}

	function findSendReactionFromFiber(startFiber) {
		let fiber = startFiber;
		while (fiber) {
			const sendReaction = fiber.memoizedProps?.sendReaction || fiber.pendingProps?.sendReaction;
			if (typeof sendReaction === "function") return sendReaction;
			fiber = fiber.return;
		}
		return null;
	}

	function hideReactionWrapper(wrapper) {
		if (!wrapper) return;
		wrapper.classList.add("hide-elist");
		wrapper.classList.remove("show-elist");
	}

	function sendReaction(wrapper, id, react) {
		if (!wrapper || !react) return false;

		const payload = { rType: react.type, rIcon: react.icon };
		let sent = false;

		try {
			const sendReactionFromWrapper = findSendReactionFromFiber(getReactFiber(wrapper));
			if (sendReactionFromWrapper) {
				sendReactionFromWrapper(payload);
				sent = true;
			}

			if (!sent) {
				const msg = wrapper.closest(".msg-item");
				const sendReactionFromMessage = findSendReactionFromFiber(getReactFiber(msg));
				if (sendReactionFromMessage) {
					sendReactionFromMessage(payload);
					sent = true;
				}
			}
		} catch (err) {
			console.warn("[Zalo Custom Reactions] Failed to send reaction", err);
		}

		if (sent) {
			if (id) updateBtn(id, react);
			hideReactionWrapper(wrapper);
		} else {
			console.warn("[Zalo Custom Reactions] sendReaction function was not found. Zalo DOM/React internals may have changed.");
		}

		return sent;
	}

	function updateBtn(id, react) {
		const span = document.querySelector(`#reaction-btn-${CSS.escape(id)} span`);
		if (!span || !react) return;

		span.innerHTML = "";

		if (shouldRenderAsTextReaction(react)) {
			const textContainer = document.createElement("div");
			textContainer.className = "text-reaction";
			textContainer.textContent = react.icon;
			textContainer.title = react.icon;
			span.appendChild(textContainer);
			return;
		}

		const emoji = document.createElement("span");
		if (!react.isCustom && react.class && react.bgPos) {
			emoji.className = react.class;
			emoji.style.cssText = `background: url("assets/emoji.1e7786c93c8a0c1773f165e2de2fd129.png?v=20180604") ${react.bgPos} / 5100% no-repeat; margin: -1px; position: relative; top: 2px`;
		} else {
			emoji.textContent = react.icon;
			emoji.style.fontSize = "20px";
		}
		span.appendChild(emoji);
	}

	function initReactions() {
		const info = window.S?.default?.reactionMsgInfo;
		if (!Array.isArray(info)) {
			setTimeout(initReactions, 1000);
			return;
		}
		reactions.forEach(registerReaction);
	}

	function findReactionButtonId(wrapper) {
		const btn = wrapper?.querySelector?.('[id^="reaction-btn-"]') || wrapper?.closest?.(".msg-item")?.querySelector?.('[id^="reaction-btn-"]');
		return btn?.id ? btn.id.replace(/^reaction-btn-/, "") : "";
	}

	function createReactionElement(react, idx, wrapper, id) {
		const div = document.createElement("div");
		const divEmoji = document.createElement("span");

		div.className = "reaction-emoji-icon";
		if (shouldRenderAsTextReaction(react)) div.className += " reaction-emoji-text";

		div.setAttribute("data-custom", "true");
		div.style.animationDelay = `${50 * (idx + 7)}ms`;

		divEmoji.innerText = react.icon;
		div.appendChild(divEmoji);

		if (react.name === "send_custom") {
			div.title = "Gửi reaction tùy chỉnh";
		} else {
			div.title = react.icon;
		}

		div.addEventListener("click", e => {
			e.preventDefault();
			e.stopPropagation();

			if (react.name === "send_custom") {
				if (!window.textInputPopup) {
					window.textInputPopup = createTextInputPopup();
				}

				window.textInputPopup.show(customText => {
					const customReaction = RecentlyReaction.add(customText);
					if (customReaction) {
						sendReaction(wrapper, id, customReaction);
						window.textInputPopup.hide();
					}
				});
				return;
			}

			sendReaction(wrapper, id, react);
		});

		return div;
	}

	function processReactionPanels() {
		document.querySelectorAll(".reaction-emoji-list").forEach(list => {
			if (list.getAttribute("data-extended") === "true") return;

			const wrapper = list.closest(".emoji-list-wrapper");
			if (!wrapper) return;

			list.setAttribute("data-extended", "true");
			list.style.animation = "popIn 0.3s ease-out forwards";

			const id = findReactionButtonId(wrapper);
			reactions.forEach((react, idx) => {
				list.appendChild(createReactionElement(react, idx, wrapper, id));
			});
		});
	}

	let processQueued = false;
	function queueProcessReactionPanels() {
		if (processQueued) return;
		processQueued = true;
		setTimeout(() => {
			processQueued = false;
			processReactionPanels();
		}, 50);
	}

	const observer = new MutationObserver(mutations => {
		const hasReactionPanel = mutations.some(mutation => {
			if (mutation.type !== "childList" || mutation.addedNodes.length === 0) return false;
			return Array.from(mutation.addedNodes).some(node =>
				node.nodeType === Node.ELEMENT_NODE &&
				(node.matches?.(".reaction-emoji-list") || node.querySelector?.(".reaction-emoji-list"))
			);
		});

		if (hasReactionPanel) queueProcessReactionPanels();
	});

	function init() {
		if (!document.body || !document.head) {
			setTimeout(init, 250);
			return;
		}
		RecentlyReaction.load();
		applyBaseStyle();
		enhanceReactionPanel();
		observer.observe(document.body, { childList: true, subtree: true });
		initReactions();
		processReactionPanels();
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init, { once: true });
	} else {
		init();
	}
})();
