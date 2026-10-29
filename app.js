"use strict";

const state = {
  mode: "text",
  thinkingLevel: "off",
  voiceGender: "female",
  keyReady: false,
  history: [],
  attachments: [],
  followConversation: true,
  busy: false,
  activeChatController: null,
  stopRequested: false,
  cameraStream: null,
  voiceStream: null,
  audioContext: null,
  analyser: null,
  analyserData: null,
  audioProcessor: null,
  silentGain: null,
  liveSocket: null,
  liveReady: false,
  liveConnecting: false,
  liveMode: null,
  liveUtilityTurnPending: false,
  liveUtilityWaitForTurn: false,
  liveUtilityWaitForCard: false,
  pendingUtilityFollowUp: null,
  liveAttempt: 0,
  liveVideoTimer: 0,
  livePlaybackTime: 0,
  liveAudioSources: [],
  liveAssistantBubble: null,
  liveAssistantText: "",
  liveAssistantVisible: 0,
  liveCaptionTarget: 0,
  liveCaptionSchedule: [],
  liveTurnComplete: false,
  liveCaptionFrame: 0,
  listening: false,
  speaking: false,
  voiceCaptionTimer: 0,
  voiceSpeechToken: 0,
  voiceCaptionBubble: null,
  voiceCaptionText: "",
  speechRequestController: null,
  speechAudio: null,
  speechAudioUrl: "",
  browserSpeechActive: false,
  syntheticVoiceLevel: 0,
  orbFrame: 0,
  orbPoints: [],
  toastTimer: 0,
  fullscreenPlaceholder: null,
  clockTimer: 0
};

const el = {
  workspace: document.getElementById("workspace"),
  modeTitle: document.getElementById("mode-title"),
  modeDescription: document.getElementById("mode-description"),
  thinkingOptions: Array.from(document.querySelectorAll(".thinking-option")),
  modeButtons: Array.from(document.querySelectorAll(".mode-button")),
  conversation: document.getElementById("conversation"),
  welcome: document.getElementById("welcome"),
  composerArea: document.getElementById("composer-area"),
  form: document.getElementById("composer-form"),
  input: document.getElementById("message-input"),
  send: document.getElementById("send-button"),
  stop: document.getElementById("stop-button"),
  attach: document.getElementById("attach-button"),
  fileInput: document.getElementById("file-input"),
  attachmentList: document.getElementById("attachment-list"),
  keyNotice: document.getElementById("key-notice"),
  connectionLabel: document.getElementById("connection-label"),
  statusDot: document.querySelector(".status-dot"),
  dialog: document.getElementById("settings-dialog"),
  keyInput: document.getElementById("api-key"),
  keyForm: document.getElementById("key-form"),
  voiceGender: document.getElementById("voice-gender"),
  keyVisibility: document.getElementById("key-visibility"),
  dialogStatus: document.getElementById("dialog-status"),
  voiceState: document.getElementById("voice-state"),
  voiceHint: document.getElementById("voice-hint"),
  micToggle: document.getElementById("mic-toggle"),
  voiceCanvas: document.getElementById("voice-orb"),
  videoPanel: document.getElementById("video-panel"),
  cameraVideo: document.getElementById("camera-video"),
  cameraFrame: document.getElementById("camera-frame"),
  cameraStart: document.getElementById("camera-start"),
  cameraStop: document.getElementById("camera-stop"),
  cameraFullscreen: document.getElementById("camera-fullscreen"),
  analyzeFrame: document.getElementById("analyze-frame"),
  videoLiveToggle: document.getElementById("video-live-toggle"),
  videoLiveNote: document.getElementById("video-live-note"),
  cameraStatus: document.getElementById("camera-status"),
  cameraTitle: document.getElementById("camera-title"),
  cameraNote: document.getElementById("camera-note"),
  toast: document.getElementById("toast")
};

function setStatus(label, busy) {
  el.connectionLabel.textContent = label;
  el.statusDot.classList.toggle("busy", Boolean(busy));
}

function setThinkingLevel(level) {
  state.thinkingLevel = ["off", "low", "medium", "high"].includes(level) ? level : "off";
  el.thinkingOptions.forEach(function (button) {
    const selected = button.dataset.thinking === state.thinkingLevel;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  });
}

function openSettings() {
  el.keyInput.value = "";
  el.voiceGender.value = state.voiceGender;
  el.dialogStatus.textContent = "";
  el.dialogStatus.classList.remove("error");
  el.dialog.classList.remove("closing");
  if (!el.dialog.open) el.dialog.showModal();
  window.setTimeout(function () { el.keyInput.focus(); }, 60);
}

function setVoiceGender(gender, announce) {
  state.voiceGender = gender === "male" ? "male" : "female";
  el.voiceGender.value = state.voiceGender;
  try { localStorage.setItem("vyoion.voiceGender", state.voiceGender); } catch (_) {}
  if (announce) showToast("Narrator voice set to " + (state.voiceGender === "male" ? "masculine" : "feminine") + ".");
}

function requestedVoiceGender(text) {
  const value = String(text || "").trim();
  if (!value || !/\bvoice\b|आवाज़|आवाज|awaaz|awaz/i.test(value)) return "";
  if (!/\b(use|switch|change|set|choose|select|speak|talk|want|prefer|make|please)\b|\b(bolo|bol|karo|chahiye)\b|बोलो|करो|चाहिए/i.test(value)) return "";
  if (/\b(?:not|don't|do not|never)\b.{0,22}\b(?:male|masculine|man|female|feminine|woman)\b/i.test(value)) return "";
  if (/\b(?:male|masculine|manly|man's|guy)\b|पुरुष|मर्दाना|आदमी|mardana/i.test(value)) return "male";
  if (/\b(?:female|feminine|girly|woman|lady)\b|महिला|स्त्री|लड़की|ladki|aurat/i.test(value)) return "female";
  return "";
}

function closeSettings() {
  if (!el.dialog.open || el.dialog.classList.contains("closing")) return;
  el.dialog.classList.add("closing");
  window.setTimeout(function () {
    if (el.dialog.open) el.dialog.close();
    el.dialog.classList.remove("closing");
  }, 180);
}

async function saveKey(key) {
  const response = await fetch("/api/key", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: key })
  });
  let result = {};
  try { result = await response.json(); } catch (_) {}
  if (!response.ok) throw new Error(result.error || "Could not configure the local app.");
  state.keyReady = Boolean(result.configured);
  el.keyInput.value = "";
  updateWelcome();
  return state.keyReady;
}

async function verifyKeyAccess() {
  const response = await fetch("/api/verify-key", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });
  let result = {};
  try { result = await response.json(); } catch (_) {}
  if (!response.ok || !result.verified) {
    const error = new Error(result.error || "The key could not be verified.");
    error.invalidKey = response.status === 401 || response.status === 403;
    throw error;
  }
}

async function refreshKeyStatus() {
  try {
    const response = await fetch("/api/status", { cache: "no-store" });
    if (!response.ok) throw new Error("Local status unavailable");
    const result = await response.json();
    state.keyReady = Boolean(result.configured);
  } catch (_) {
    state.keyReady = false;
  }
  updateWelcome();
}

function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("visible");
  window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(function () { el.toast.classList.remove("visible"); }, 3000);
}

function setMode(mode) {
  if (state.liveMode && state.liveMode !== mode) stopLiveSession();
  state.mode = mode;
  el.workspace.classList.remove("mode-text", "mode-voice", "mode-video");
  el.workspace.classList.add("mode-" + mode);
  el.modeButtons.forEach(function (button) {
    const selected = button.dataset.mode === mode;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-current", selected ? "page" : "false");
  });
  if (mode === "text") {
    el.modeTitle.textContent = "Let’s make sense of it.";
    el.modeDescription.textContent = "Ask a question or bring a report. I’ll explain it in clear, everyday language.";
    el.input.placeholder = "Ask vyoiōn anything...";
  } else if (mode === "voice") {
    el.modeTitle.textContent = "Let’s talk it through.";
    el.modeDescription.textContent = "Talk naturally for a real-time, spoken conversation, or type below.";
    el.input.placeholder = "Type a message or start live voice chat...";
    updateVoiceCopy();
  } else {
    el.modeTitle.textContent = "Let’s look together.";
    el.modeDescription.textContent = "Preview your camera, then start a live conversation or ask about one frame.";
    el.input.placeholder = "Ask about the camera frame or type a question...";
  }
  if (mode !== "video") stopCamera();
  if (mode !== "voice") stopVoice();
  state.followConversation = true;
  requestAnimationFrame(function () {
    scrollConversationToLatest(true);
    resizeOrb();
  });
}

function updateWelcome() {
  const hasMessages = state.history.length > 0;
  el.welcome.hidden = hasMessages || state.mode !== "text";
  el.keyNotice.hidden = state.keyReady || hasMessages;
}

function safeMarkdown(text) {
  const escaped = String(text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const lines = escaped.split(/\r?\n/);
  let output = "";
  let inList = false;
  function closeList() { if (inList) output += "</ul>"; inList = false; }
  function inline(line) { return line.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>"); }
  lines.forEach(function (line) {
    const trimmed = line.trim();
    if (!trimmed) { closeList(); return; }
    if (/^#{1,3}\s+/.test(trimmed)) {
      closeList();
      output += "<h3>" + inline(trimmed.replace(/^#{1,3}\s+/, "")) + "</h3>";
      return;
    }
    if (/^[-*]\s+/.test(trimmed)) {
      if (!inList) output += "<ul>";
      inList = true;
      output += "<li>" + inline(trimmed.replace(/^[-*]\s+/, "")) + "</li>";
      return;
    }
    closeList();
    output += "<p>" + inline(trimmed) + "</p>";
  });
  closeList();
  return output;
}

function renderMessage(message, options) {
  const opts = options || {};
  const item = document.createElement("article");
  item.className = "message " + (message.role === "user" ? "user" : "assistant");
  if (message.role !== "user") {
    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = "✳";
    avatar.setAttribute("aria-hidden", "true");
    item.appendChild(avatar);
  }
  const content = document.createElement("div");
  content.className = "message-content";
  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  if (opts.loading) {
    bubble.innerHTML = '<div class="typing-row"><span></span><span></span><span></span><b>vyoiōn is thinking</b></div>';
  } else if (message.role === "user") {
    bubble.textContent = message.text;
  } else {
    bubble.innerHTML = safeMarkdown(message.text);
  }
  content.appendChild(bubble);
  if (!opts.loading && message.card) content.appendChild(renderUtilityCard(message));
  (message.attachments || []).forEach(function (attachment) {
    const badge = document.createElement("div");
    badge.className = "message-attachment";
    badge.textContent = "▤  " + attachment.name;
    content.appendChild(badge);
  });
  if (!opts.loading && message.role !== "user") {
    const stamp = document.createElement("div");
    stamp.className = "message-stamp";
    stamp.textContent = "vyoiōn";
    content.appendChild(stamp);
  }
  item.appendChild(content);
  el.conversation.appendChild(item);
  scrollConversationToLatest(Boolean(opts.forceScroll));
  return { item: item, bubble: bubble, content: content };
}

function activeConversationScroller() {
  return state.mode === "voice" ? el.conversation : el.workspace;
}

function isNearConversationBottom(scroller) {
  return scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <= 110;
}

function scrollConversationToLatest(force) {
  const scroller = activeConversationScroller();
  if (!force && !state.followConversation) return;
  scroller.scrollTop = scroller.scrollHeight;
  state.followConversation = true;
}

function updateConversationFollow(scroller) {
  state.followConversation = isNearConversationBottom(scroller);
}

function renderConnectionError(message) {
  const item = document.createElement("article");
  item.className = "message connection-error";
  item.setAttribute("role", "alert");
  const icon = document.createElement("div");
  icon.className = "message-avatar connection-error-icon";
  icon.textContent = "!";
  icon.setAttribute("aria-hidden", "true");
  const content = document.createElement("div");
  content.className = "message-content";
  const bubble = document.createElement("div");
  bubble.className = "message-bubble connection-error-bubble";
  const title = document.createElement("strong");
  title.className = "connection-error-title";
  title.textContent = "Couldn’t get a reply";
  const detail = document.createElement("p");
  detail.className = "connection-error-detail";
  detail.textContent = message || "The cloud service could not complete this request. Please try again.";
  bubble.append(title, detail);
  content.appendChild(bubble);
  item.append(icon, content);
  el.conversation.appendChild(item);
  scrollConversationToLatest(true);
}

function utilityCardElement(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function addMapPreview(card, container) {
  const lat = Number(card.latitude);
  const lon = Number(card.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
  const south = Math.max(-85, lat - 0.025);
  const north = Math.min(85, lat + 0.025);
  const west = Math.max(-180, lon - 0.04);
  const east = Math.min(180, lon + 0.04);
  const map = document.createElement("iframe");
  map.className = "utility-map-frame";
  map.loading = "lazy";
  map.referrerPolicy = "no-referrer";
  map.title = "Map of " + (card.locationName || "the selected location");
  map.src = "https://www.openstreetmap.org/export/embed.html?bbox=" + [west, south, east, north].join(",") + "&layer=mapnik&marker=" + lat + "," + lon;
  container.appendChild(map);
  const link = document.createElement("a");
  link.className = "utility-map-link";
  link.href = "https://www.openstreetmap.org/?mlat=" + encodeURIComponent(lat) + "&mlon=" + encodeURIComponent(lon) + "#map=14/" + encodeURIComponent(lat) + "/" + encodeURIComponent(lon);
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Open larger map ↗";
  container.appendChild(link);
}

function renderUtilityCard(message) {
  const data = message.card;
  const card = utilityCardElement("section", "utility-card utility-card-" + data.type);
  card.setAttribute("aria-label", data.title || "Information card");
  const heading = utilityCardElement("div", "utility-card-heading");
  const icon = utilityCardElement("span", "utility-card-icon", data.icon || "✦");
  icon.setAttribute("aria-hidden", "true");
  const headingText = utilityCardElement("div", "utility-card-heading-text");
  headingText.appendChild(utilityCardElement("strong", "", data.title || "Details"));
  if (data.subtitle) headingText.appendChild(utilityCardElement("small", "", data.subtitle));
  heading.append(icon, headingText);
  card.appendChild(heading);

  if (data.type === "loading") {
    card.appendChild(utilityCardElement("p", "utility-card-copy utility-card-loading", data.subtitle || "Loading current information…"));
  } else if (data.type === "weatherPrompt" || data.type === "locationPrompt") {
    card.appendChild(utilityCardElement("p", "utility-card-copy", data.description || "Share a place name and I’ll look it up."));
    if (data.action) {
      const action = utilityCardElement("button", "utility-card-action", data.actionLabel || "Use my location");
      action.type = "button";
      action.addEventListener("click", function () {
        state.pendingUtilityFollowUp = null;
        resolveCurrentLocation(message, data.action);
      });
      card.appendChild(action);
    }
  } else if (data.type === "weather") {
    const current = utilityCardElement("div", "weather-current");
    current.appendChild(utilityCardElement("span", "weather-emoji", data.weatherIcon || "🌤️"));
    const reading = utilityCardElement("div", "weather-reading");
    reading.appendChild(utilityCardElement("strong", "weather-temperature", data.temperature + "°C"));
    reading.appendChild(utilityCardElement("span", "", data.condition || "Current conditions"));
    current.appendChild(reading);
    card.appendChild(current);
    const grid = utilityCardElement("div", "utility-stat-grid");
    [
      ["Feels like", data.apparent + "°C"],
      ["Humidity", data.humidity + "%"],
      ["Wind", data.wind + " km/h"],
      ["Today", data.low + "° / " + data.high + "°"]
    ].forEach(function (entry) {
      const stat = utilityCardElement("div", "utility-stat");
      stat.append(utilityCardElement("small", "", entry[0]), utilityCardElement("strong", "", entry[1]));
      grid.appendChild(stat);
    });
    card.appendChild(grid);
    card.appendChild(utilityCardElement("div", "utility-card-attribution", "Open-Meteo forecast model · " + (data.updated || "latest available conditions")));
    const refresh = utilityCardElement("button", "utility-card-action", "Refresh weather");
    refresh.type = "button";
    refresh.addEventListener("click", function () { refreshWeatherMessage(message, data); });
    card.appendChild(refresh);
  } else if (data.type === "clock") {
    card.dataset.timezone = data.timezone || "local";
    const clock = utilityCardElement("strong", "clock-time", "");
    clock.dataset.timezone = data.timezone || "local";
    const date = utilityCardElement("div", "clock-date", "");
    date.dataset.timezone = data.timezone || "local";
    card.append(clock, date);
    card.appendChild(utilityCardElement("div", "utility-card-attribution", data.locationName ? "Local time · " + data.locationName : "Your device’s local time"));
    updateClockCard(card);
    if (!state.clockTimer) state.clockTimer = window.setInterval(updateVisibleClocks, 1000);
  } else if (data.type === "location" || data.type === "map") {
    card.appendChild(utilityCardElement("p", "utility-location-name", data.locationName || "Selected location"));
    card.appendChild(utilityCardElement("div", "utility-coordinates", Number(data.latitude).toFixed(4) + "°, " + Number(data.longitude).toFixed(4) + "°"));
    addMapPreview(data, card);
    card.appendChild(utilityCardElement("div", "utility-card-attribution", "Map data © OpenStreetMap contributors · Place search by Open-Meteo / GeoNames"));
  }
  return card;
}

function updateClockCard(card) {
  const now = new Date();
  const timeZone = card.dataset.timezone || "local";
  const resolvedZone = timeZone === "local" ? (Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC") : timeZone;
  const options = timeZone === "local" ? {} : { timeZone: timeZone };
  const timeNode = card.querySelector(".clock-time");
  const dateNode = card.querySelector(".clock-date");
  try {
    timeNode.textContent = new Intl.DateTimeFormat("en-US", Object.assign({ hour: "numeric", minute: "2-digit", second: "2-digit" }, options)).format(now);
    const dateText = new Intl.DateTimeFormat("en-US", Object.assign({ weekday: "long", year: "numeric", month: "long", day: "numeric" }, options)).format(now);
    let offset = "GMT";
    try { offset = new Intl.DateTimeFormat("en-US", { timeZone: resolvedZone, timeZoneName: "longOffset" }).formatToParts(now).find(function (part) { return part.type === "timeZoneName"; }).value; } catch (_) {}
    dateNode.textContent = dateText + " · " + offset;
  } catch (_) {
    timeNode.textContent = new Intl.DateTimeFormat().format(now);
    dateNode.textContent = "Local device time · GMT";
  }
}

function updateVisibleClocks() {
  document.querySelectorAll(".clock-time").forEach(function (node) {
    const card = node.closest(".utility-card");
    if (card) { card.dataset.timezone = node.dataset.timezone || "local"; updateClockCard(card); }
  });
}

function identifyUtilityRequest(text) {
  const normalized = String(text || "").trim();
  const explicitCurrentLocation = /\bwhere\s+am\s+i\b|\bmy\s+(?:current\s+)?location\b|\bmeri?\s+location\b|\bmera\s+location\b|\bmy\s+aas\s+paas\b|\bmere\s+(?:aas\s+paas|paas)\b|\bmain\s+kahan\s+hoon\b|मेरी\s+लोकेशन|मेरा\s+लोकेशन|मैं\s+कहाँ\s+हूँ/i.test(normalized);
  const currentAreaReference = /\bnear\s+me\b|\baround\s+me\b|\bhere\b|\bwhere\s+i\s+am\b|\bin\s+my\s+area\b|\bmy\s+(?:country|city)\b/i.test(normalized);
  const asksForLocalInfo = /\b(?:weather|forecast|rain|sunny|mausam|time|clock|date|map|maps|directions|location)\b|मौसम|बारिश|समय|वक़्त|नक्शा|रास्ता/i.test(normalized);
  const currentLocation = explicitCurrentLocation || (currentAreaReference && asksForLocalInfo);
  if (currentLocation) {
    if (/\b(?:weather|forecast|rain|sunny|mausam)\b|मौसम|बारिश/i.test(normalized)) return { type: "weather", current: true };
    if (/\b(?:time|clock|samay|waqt)\b|समय|वक़्त/i.test(normalized)) return { type: "clock", current: true };
    if (/\bmap|directions\b|नक्शा|रास्ता/i.test(normalized)) return { type: "map", current: true };
    return { type: "location", current: true };
  }
  if (/\b(?:weather|forecast|rainfall|rainy|sunny|snowfall|mausam)\b|मौसम|बारिश/i.test(normalized)) return { type: "weather", place: extractUtilityPlace(normalized) };
  if (/\bwhat(?:'s| is)\s+(?:the\s+)?time\b|\bwhat\s+time\s+is\s+it\b|\b(?:current|local)\s+time\b|\btime\s+(?:now|in|at|for)\b|\bclock(?:\s+(?:now|in|at|for))?\b|\b(?:tell|show|give)\s+(?:me|my)\s+(?:the\s+)?(?:current\s+)?time\b|\bwhat(?:'s| is)\s+(?:the\s+)?date\b|\bdate\s+(?:in|at|for|here)\b|\b(?:samay|waqt)\b|\b(?:kya\s+)?time\s+(?:hai|hua)\b|समय|वक़्त/i.test(normalized) || /^\s*(?:time|clock|date)\s*[?!.]*\s*$/i.test(normalized)) return { type: "clock", place: extractUtilityPlace(normalized) };
  if (/\bmap\b|\bmaps\b|\bdirections\b|\bnaksha\b|नक्शा|नक्शे|रास्ता/i.test(normalized)) return { type: "map", place: extractUtilityPlace(normalized) };
  if (/\bwhere\s+is\s+[^?]+|\blocation\s+(?:of|for)\s+[^?]+/i.test(normalized)) return { type: "location", place: extractUtilityPlace(normalized) };
  return null;
}

function pendingUtilityType() {
  if (state.pendingUtilityFollowUp && state.pendingUtilityFollowUp.type) return state.pendingUtilityFollowUp.type;
  const last = state.history[state.history.length - 1];
  if (!last || last.role !== "assistant") return null;
  if (last.card && (last.card.type === "weatherPrompt" || last.card.type === "locationPrompt")) return last.card.action || (last.card.type === "weatherPrompt" ? "weather" : null);
  if (!/\b(?:which|what)\s+(?:city|country|place)|\bwhere\s+should\s+i\s+(?:check|look)|\bwhat\s+city\s+or\s+country\b/i.test(last.text || "")) return null;
  for (let i = state.history.length - 2; i >= 0; i--) {
    const prior = state.history[i];
    if (prior.role !== "user") continue;
    const intent = identifyUtilityRequest(prior.text || "");
    return intent && !intent.place && !intent.current ? intent.type : null;
  }
  return null;
}

function resolveUtilityFollowUpIntent(text, consume) {
  const type = pendingUtilityType();
  if (!type) return null;
  const value = String(text || "").trim().replace(/[.!?]+$/, "").trim();
  if (!value || value.length > 80) return null;
  if (/^(?:use\s+(?:my\s+)?(?:current\s+)?location|(?:my\s+)?current\s+location|my\s+location|near\s+me|here)$/i.test(value)) {
    if (consume !== false) state.pendingUtilityFollowUp = null;
    return { type: type, current: true };
  }
  if (identifyUtilityRequest(value) || /\b(?:i|me|my|you|we|they|he|she|it|can|could|would|should|what|why|how|when|where|tell|show|give|please|thanks|thank|no|not|yes|yeah|okay|ok|sure|hello|hi|hey|stop|skip|cancel)\b/i.test(value)) return null;
  if (!/^[\p{L}\p{M}\p{N}\s,.'’()\-]+$/u.test(value)) return null;
  if (consume !== false) state.pendingUtilityFollowUp = null;
  return { type: type, place: value };
}

function extractUtilityPlace(text) {
  const value = String(text || "");
  const possessiveMatch = value.match(/^\s*(.+?)\s+(?:ka|ki|ke|का|की|के)\s+(?:weather|mausam|time|samay|समय|map|maps|location|मौसम|नक्शा)(?=\s|[?.!]|$)/i);
  if (possessiveMatch) return possessiveMatch[1].replace(/^(?:what(?:'s| is)\s+)?/i, "").replace(/\s+/g, " ").trim().replace(/[,.]+$/, "");
  const whereMatch = value.match(/\bwhere\s+is\s+(.+?)(?:[?.!]|$)/i);
  if (whereMatch) return whereMatch[1].replace(/\b(?:today|tomorrow|tonight|now|please|thanks|thank you)\b.*$/i, "").replace(/\s+/g, " ").trim().replace(/[,.]+$/, "");
  const weatherMatch = value.match(/(?:weather|forecast|mausam|मौसम)\s+(?:like\s+)?(?:in|at|for|near)?\s*(.+?)(?:[?.!]|$)/i);
  if (weatherMatch) return weatherMatch[1].replace(/\b(?:today|tomorrow|tonight|now|please|thanks|thank you|batao|bataye|bataiye|kaisa hai|kaisi hai|kaise hai|kya hai)\b.*$/i, "").replace(/\s+/g, " ").trim().replace(/[,.]+$/, "");
  const match = value.match(/\b(?:in|at|near|for|of|to|around)\s+(.+?)(?:[?.!]|$)/i);
  if (!match) return "";
  return match[1].replace(/\b(?:today|tomorrow|tonight|now|right now|please|thanks|thank you)\b.*$/i, "").replace(/\s+/g, " ").trim().replace(/[,.]+$/, "");
}

function weatherDescription(code) {
  const map = {
    0: ["Clear sky", "☀️"], 1: ["Mostly clear", "🌤️"], 2: ["Partly cloudy", "⛅"], 3: ["Overcast", "☁️"],
    45: ["Fog", "🌫️"], 48: ["Rime fog", "🌫️"], 51: ["Light drizzle", "🌦️"], 53: ["Drizzle", "🌦️"], 55: ["Heavy drizzle", "🌧️"],
    56: ["Freezing drizzle", "🌧️"], 57: ["Heavy freezing drizzle", "🌧️"], 61: ["Light rain", "🌧️"], 63: ["Rain", "🌧️"], 65: ["Heavy rain", "🌧️"],
    66: ["Freezing rain", "🌧️"], 67: ["Heavy freezing rain", "🌧️"], 71: ["Light snow", "🌨️"], 73: ["Snow", "🌨️"], 75: ["Heavy snow", "❄️"],
    77: ["Snow grains", "🌨️"], 80: ["Light showers", "🌦️"], 81: ["Rain showers", "🌧️"], 82: ["Heavy showers", "⛈️"],
    85: ["Snow showers", "🌨️"], 86: ["Heavy snow showers", "❄️"], 95: ["Thunderstorm", "⛈️"], 96: ["Thunderstorm with hail", "⛈️"], 99: ["Severe thunderstorm with hail", "⛈️"]
  };
  return map[Number(code)] || ["Conditions unavailable", "🌡️"];
}

async function fetchJson(url, signal) {
  const requestController = new AbortController();
  let timedOut = false;
  const timeout = window.setTimeout(function () {
    timedOut = true;
    requestController.abort();
  }, 6500);
  const abortRequest = function () { requestController.abort(); };
  if (signal) {
    if (signal.aborted) abortRequest();
    else signal.addEventListener("abort", abortRequest, { once: true });
  }
  try {
    const response = await fetch(url, { cache: "no-store", signal: requestController.signal });
    if (!response.ok) throw new Error("The location service returned an error.");
    return await response.json();
  } catch (error) {
    if (signal && signal.aborted) throw new Error("Response stopped.");
    if (timedOut) throw new Error("The location service took too long to respond. Check your internet connection and try again.");
    if (error && error.message === "The location service returned an error.") throw error;
    throw new Error("I couldn’t reach the location service. Check your internet connection and try again.");
  } finally {
    window.clearTimeout(timeout);
    if (signal) signal.removeEventListener("abort", abortRequest);
  }
}

async function searchUtilityPlace(query, signal) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", "5");
  url.searchParams.set("language", "en");
  const payload = await fetchJson(url.toString(), signal);
  const results = payload.results || [];
  const exactName = String(query || "").split(",")[0].trim().toLocaleLowerCase();
  const result = results.find(function (item) { return String(item.name || "").toLocaleLowerCase() === exactName; }) || results[0];
  if (!result) throw new Error("I couldn’t find that place. Try a city and country, such as “Pune, India”.");
  const placeNames = [result.name, result.admin1 && result.admin1 !== result.name ? result.admin1 : "", result.country].filter(Boolean);
  const uniquePlaceNames = placeNames.filter(function (name, index) { return placeNames.findIndex(function (candidate) { return candidate.toLocaleLowerCase() === name.toLocaleLowerCase(); }) === index; });
  return {
    latitude: Number(result.latitude),
    longitude: Number(result.longitude),
    timezone: result.timezone || "local",
    locationName: uniquePlaceNames.join(", ")
  };
}

function requestCurrentPosition() {
  return new Promise(function (resolve, reject) {
    if (!navigator.geolocation) { reject(new Error("This browser does not provide location access.")); return; }
    navigator.geolocation.getCurrentPosition(function (position) {
      resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude, timezone: "local", locationName: "Your current location" });
    }, function (error) {
      reject(new Error(error.code === 1 ? "Location access was blocked. Allow location access in your browser, then ask again." : "I couldn’t get your location. Check the device’s location settings and try again."));
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  });
}

async function resolveTimezone(place, signal) {
  if (place.timezone && place.timezone !== "local") return place.timezone;
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(place.latitude));
  url.searchParams.set("longitude", String(place.longitude));
  url.searchParams.set("current", "temperature_2m");
  url.searchParams.set("timezone", "auto");
  const payload = await fetchJson(url.toString(), signal);
  if (!payload.timezone) throw new Error("I couldn’t determine the local time zone for that location.");
  return payload.timezone;
}

async function fetchWeather(place, signal) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(place.latitude));
  url.searchParams.set("longitude", String(place.longitude));
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m");
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_probability_max");
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("timezone", place.timezone && place.timezone !== "local" ? place.timezone : "auto");
  url.searchParams.set("timeformat", "unixtime");
  const payload = await fetchJson(url.toString(), signal);
  const current = payload.current || {};
  const daily = payload.daily || {};
  const condition = weatherDescription(current.weather_code);
  const timezone = payload.timezone || place.timezone || "UTC";
  const dataTimestamp = Number(current.time);
  const updated = Number.isFinite(dataTimestamp)
    ? new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", minute: "2-digit", timeZoneName: "longOffset" }).format(new Date(dataTimestamp * 1000))
    : "time unavailable";
  return {
    type: "weather", title: "Weather", subtitle: place.locationName,
    locationName: place.locationName,
    latitude: place.latitude, longitude: place.longitude, timezone: timezone,
    temperature: Math.round(Number(current.temperature_2m)),
    apparent: Math.round(Number(current.apparent_temperature)),
    humidity: Math.round(Number(current.relative_humidity_2m)),
    wind: Math.round(Number(current.wind_speed_10m)),
    low: Math.round(Number(daily.temperature_2m_min && daily.temperature_2m_min[0])),
    high: Math.round(Number(daily.temperature_2m_max && daily.temperature_2m_max[0])),
    condition: condition[0], weatherIcon: condition[1], updated: "Model data at " + updated,
    precipitation: daily.precipitation_probability_max && daily.precipitation_probability_max[0]
  };
}

function updateUtilityMessage(message, text, card) {
  message.text = text || "";
  message.card = card || null;
  rerenderHistory();
}

async function refreshWeatherMessage(message, previousData) {
  const place = {
    latitude: previousData.latitude,
    longitude: previousData.longitude,
    timezone: previousData.timezone,
    locationName: previousData.locationName
  };
  updateUtilityMessage(message, "", { type: "loading", title: "Refreshing weather", icon: "🌦", subtitle: "Fetching the latest available model data" });
  try { updateUtilityMessage(message, "", await fetchWeather(place)); }
  catch (error) { updateUtilityMessage(message, error.message || "I couldn’t refresh the weather right now.", null); }
}

async function resolveCurrentLocation(message, action, signal) {
  message.text = "";
  message.card = { type: "loading", title: "Finding your location", icon: "⌖", subtitle: "Waiting for your permission" };
  rerenderHistory();
  try {
    const place = await requestCurrentPosition();
    if (signal && signal.aborted) throw new Error("Response stopped.");
    if (action === "weather") updateUtilityMessage(message, "", await fetchWeather(place, signal));
    else if (action === "clock") {
      const timezone = await resolveTimezone(place, signal);
      updateUtilityMessage(message, "", { type: "clock", title: "Local time", icon: "◷", ...place, timezone });
    } else updateUtilityMessage(message, "", { type: action === "map" ? "map" : "location", title: action === "map" ? "Map" : "Your location", icon: action === "map" ? "⌖" : "◎", ...place });
  } catch (error) {
    updateUtilityMessage(message, error.message, null);
  }
}

async function runUtilityRequest(intent, message, signal) {
  try {
    if (signal && signal.aborted) throw new Error("Response stopped.");
    if (intent.place) state.pendingUtilityFollowUp = null;
    if (intent.type === "clock" && (intent.current || !intent.place)) {
      await resolveCurrentLocation(message, "clock", signal);
      return;
    }
    if (intent.current) {
      state.pendingUtilityFollowUp = { type: intent.type };
      const weather = intent.type === "weather";
      const title = weather ? "Where should I check the weather?" : intent.type === "clock" ? "Where should I check the time?" : "Find your current location";
      const description = weather
        ? "Tell me a city or country, or choose your current location. I won’t use device location unless you press the button and allow it."
        : intent.type === "clock"
          ? "Tell me a city or country, or choose your current location. I’ll show its local time with the GMT offset."
          : "Choose the button to share your current location with this app. Your browser will ask before sharing it.";
      updateUtilityMessage(message, "", { type: weather ? "weatherPrompt" : "locationPrompt", title: title, icon: weather ? "🌦" : intent.type === "clock" ? "◷" : "⌖", description: description, action: intent.type, actionLabel: "Use my location" });
      return;
    }
    if (intent.type === "weather" && !intent.place && !intent.current) {
      state.pendingUtilityFollowUp = { type: intent.type };
      updateUtilityMessage(message, "", { type: "weatherPrompt", title: "Where should I check the weather?", icon: "🌦", description: "Tell me a city or country, or choose your current location. I won’t use device location unless you press the button and allow it.", action: "weather", actionLabel: "Use my location" });
      return;
    }
    if ((intent.type === "map" || intent.type === "location") && !intent.place && !intent.current) {
      state.pendingUtilityFollowUp = { type: intent.type };
      const title = intent.type === "map" ? "Find a place" : "Look up a place";
      updateUtilityMessage(message, "", { type: "locationPrompt", title: title, icon: "⌖", description: "Add a city or place name, or choose your current location.", action: intent.type, actionLabel: "Use my location" });
      return;
    }
    const place = await searchUtilityPlace(intent.place, signal);
    if (signal && signal.aborted) throw new Error("Response stopped.");
    if (intent.type === "weather") updateUtilityMessage(message, "", await fetchWeather(place, signal));
    else if (intent.type === "clock") {
      const timezone = await resolveTimezone(place, signal);
      updateUtilityMessage(message, "", { type: "clock", title: "Local time", icon: "◷", ...place, timezone });
    }
    else updateUtilityMessage(message, "", { type: intent.type === "map" ? "map" : "location", title: intent.type === "map" ? "Map" : "Location", icon: "⌖", ...place });
  } catch (error) {
    updateUtilityMessage(message, error.message || "I couldn’t load that information right now.", null);
  }
}

function handleUtilityRequest(text, attachments, userMessage, onComplete, intentOverride) {
  if (attachments.length) return false;
  const intent = intentOverride || identifyUtilityRequest(text);
  if (!intent) return false;
  const assistantMessage = { role: "assistant", text: "", card: { type: "loading", title: "Getting details", icon: "✦", subtitle: "Checking current information" } };
  state.history.push(assistantMessage);
  renderMessage(assistantMessage);
  updateWelcome();
  state.stopRequested = false;
  const controller = new AbortController();
  state.activeChatController = controller;
  setBusy(true, intent.type === "weather" ? "Checking the weather…" : intent.type === "clock" ? "Checking local time…" : "Finding that place…");
  runUtilityRequest(intent, assistantMessage, controller.signal).finally(function () {
    if (state.activeChatController === controller) state.activeChatController = null;
    state.stopRequested = false;
    setBusy(false);
    if (typeof onComplete === "function") onComplete();
  });
  return true;
}

function instantGreeting(text) {
  const value = String(text || "").trim();
  if (/^(?:नमस्ते|नमस्कार|हाय|हेलो|हैलो)[!,.?\s]*$/u.test(value)) return "Namaste! Bataiye, main kaise help karun?";
  if (/^(?:what(?:'|’)s\s+up|wassup|what\s+is\s+up|sup|yo)(?:\s+bro)?[!,.?\s]*$/i.test(value)) return "Hey! What can I help with?";
  if (!/^(?:hi|hello|hey|hiya|heya|good morning|good afternoon|good evening|namaste|namaskar|salaam)(?:\s+vyoiōn)?[!,.?\s]*$/i.test(value)) return "";
  if (/^(?:namaste|namaskar|salaam)/i.test(value)) return "Namaste! Batao, main kaise help karun?";
  return "Hi! How can I help?";
}

function showInstantExchange(text, reply, speak) {
  const userMessage = { role: "user", text: text, attachments: [] };
  const assistantMessage = { role: "assistant", text: reply };
  state.history.push(userMessage, assistantMessage);
  renderMessage(userMessage, { forceScroll: true });
  const rendered = renderMessage(assistantMessage);
  if (speak && state.mode === "voice") speakReply(reply, rendered.bubble);
  updateWelcome();
}

function rerenderHistory() {
  el.conversation.replaceChildren();
  state.history.forEach(function (message) { renderMessage(message); });
  updateWelcome();
}

function resizeInput() {
  el.input.style.height = "auto";
  el.input.style.height = Math.min(el.input.scrollHeight, 132) + "px";
}

function renderAttachments() {
  el.attachmentList.replaceChildren();
  state.attachments.forEach(function (attachment, index) {
    const chip = document.createElement("div");
    chip.className = "attachment-chip";
    const icon = document.createElement("b");
    icon.textContent = attachment.mimeType === "application/pdf" ? "PDF" : "IMG";
    const name = document.createElement("span");
    name.textContent = attachment.name;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.setAttribute("aria-label", "Remove " + attachment.name);
    remove.textContent = "×";
    remove.addEventListener("click", function () {
      state.attachments.splice(index, 1);
      renderAttachments();
    });
    chip.append(icon, name, remove);
    el.attachmentList.appendChild(chip);
  });
}

function readFileAsBase64(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onload = function () {
      const result = String(reader.result || "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = function () { reject(new Error("Could not read " + file.name)); };
    reader.readAsDataURL(file);
  });
}

function selectFiles(files) {
  const selectedFiles = Array.from(files || []);
  const hasUsableFile = selectedFiles.some(function (file) {
    const extension = file.name.toLowerCase().split(".").pop();
    const mimeType = file.type || ({ pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" })[extension] || "";
    return mimeType === "application/pdf" || ["image/jpeg", "image/png", "image/webp"].includes(mimeType);
  });
  if (hasUsableFile && (state.liveReady || state.liveConnecting || state.liveMode)) {
    stopLiveSession();
    showToast("Live chat ended so I can review the file without overlapping audio.");
  }
  selectedFiles.forEach(async function (file) {
    const extension = file.name.toLowerCase().split(".").pop();
    const mimeType = file.type || ({ pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" })[extension] || "";
    const allowed = mimeType === "application/pdf" || ["image/jpeg", "image/png", "image/webp"].includes(mimeType);
    if (!allowed) { showToast("Choose a PDF, JPG, PNG, or WebP file."); return; }
    const currentSize = state.attachments.reduce(function (total, item) { return total + item.size; }, 0);
    if (file.size > 12 * 1024 * 1024 || currentSize + file.size > 12 * 1024 * 1024) {
      showToast("Keep all attachments together under 12 MB for this portable app.");
      return;
    }
    try {
      const data = await readFileAsBase64(file);
      state.attachments.push({ name: file.name, mimeType: mimeType, size: file.size, data: data });
      renderAttachments();
    } catch (error) { showToast(error.message); }
  });
  el.fileInput.value = "";
}

function buildContents(currentAttachments) {
  const contents = state.history.slice(-24).map(function (message) {
    let text = message.text || "";
    if (!text && message.card) {
      const card = message.card;
      if (card.type === "weather") text = "Weather card shown: " + card.locationName + ", " + card.temperature + "°C, " + card.condition + ", feels like " + card.apparent + "°C, humidity " + card.humidity + "%, wind " + card.wind + " km/h, today's low/high " + card.low + "°/" + card.high + "°.";
      else if (card.type === "clock") text = "Clock card shown: " + (card.locationName || "local device time") + ", timezone " + (card.timezone || "local") + ".";
      else if (card.type === "map" || card.type === "location") text = "Location card shown: " + card.locationName + " at " + card.latitude + ", " + card.longitude + ".";
      else if (card.type === "weatherPrompt") text = "Asked the user whether to use current location for weather, or provide a city.";
      else if (card.type === "locationPrompt") text = "Asked the user to provide a place name or choose current location.";
    }
    return { role: message.role === "assistant" ? "model" : "user", parts: [{ text: text }] };
  });
  if (currentAttachments && currentAttachments.length && contents.length) {
    const latest = contents[contents.length - 1];
    currentAttachments.forEach(function (attachment) {
      latest.parts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });
    });
  }
  return contents;
}

function apiErrorMessage(payload, status) {
  if (status === 400 || status === 403) return "The cloud service could not use that API key or request. Open settings and check the key and its API access.";
  if (status === 401) return "Add your cloud API key in settings and try again.";
  if (status === 429) return "The cloud service is receiving too many requests right now. Please wait a moment and try again.";
  if (status === 413) return "Those files are too large to send together. Try fewer or smaller files.";
  if (status >= 500) return "The cloud service is temporarily unavailable. Please try again shortly.";
  return "I couldn’t reach the cloud service. Check your internet connection and try again.";
}

async function streamResponse(contents, onText, onSlow, onFallback) {
  const url = "/api/chat";
  function visibleText(parts) {
    return (parts || []).filter(function (part) { return part.text && !part.thought; }).map(function (part) { return part.text; }).join("");
  }
  async function requestAtLevel(thinkingLevel, fallbackLevel) {
    if (state.stopRequested) {
      const stopped = new Error("Response stopped.");
      stopped.name = "AbortError";
      throw stopped;
    }
    const controller = new AbortController();
    state.activeChatController = controller;
    syncComposerAction();
    let started = false;
    let timedOutForFallback = false;
    const timer = window.setTimeout(function () {
      if (started) return;
      onSlow();
      if (fallbackLevel) {
        timedOutForFallback = true;
        onFallback(fallbackLevel);
        controller.abort();
      }
    }, 3000);
    function markStarted() {
      if (!started) {
        started = true;
        window.clearTimeout(timer);
        setStatus("Reply in progress…", true);
      }
    }
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: contents, thinkingLevel: thinkingLevel, voiceGender: state.voiceGender, spokenReply: state.mode === "voice" }),
        signal: controller.signal
      });
      if (!response.ok) {
        let payload = {};
        try { payload = await response.json(); } catch (_) {}
        throw new Error(apiErrorMessage(payload, response.status));
      }
      if (!response.body) {
        const payload = await response.json();
        const text = visibleText((((payload.candidates || [])[0] || {}).content || {}).parts || []);
        markStarted();
        onText(text);
        return text;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let output = "";
      let finished = false;
      while (!finished) {
        const read = await reader.read();
        finished = read.done;
        buffer += decoder.decode(read.value || new Uint8Array(), { stream: !finished });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() || "";
        for (const event of events) {
          const dataLine = event.split(/\r?\n/).find(function (line) { return line.startsWith("data:"); });
          if (!dataLine) continue;
          const raw = dataLine.slice(5).trim();
          if (!raw || raw === "[DONE]") continue;
          let chunk;
          try { chunk = JSON.parse(raw); } catch (_) { continue; }
          if (chunk.error) throw new Error(chunk.error.message || "The cloud service could not complete this request.");
          const parts = ((((chunk.candidates || [])[0] || {}).content || {}).parts || []);
          const delta = visibleText(parts);
          if (delta) {
            markStarted();
            output += delta;
            onText(output);
          }
        }
      }
      if (buffer.trim()) {
        const dataLine = buffer.split(/\r?\n/).find(function (line) { return line.startsWith("data:"); });
        if (dataLine) {
          try {
            const chunk = JSON.parse(dataLine.slice(5).trim());
            const parts = ((((chunk.candidates || [])[0] || {}).content || {}).parts || []);
            const delta = visibleText(parts);
            if (delta) { markStarted(); output += delta; onText(output); }
          } catch (_) {}
        }
      }
      if (!output) throw new Error("The cloud service returned an empty response. Please try again.");
      return output;
    } catch (error) {
      if (state.stopRequested) {
        const stopped = new Error("Response stopped.");
        stopped.name = "AbortError";
        throw stopped;
      }
      if (timedOutForFallback) return requestAtLevel(fallbackLevel, fallbackLevel === "low" ? "minimal" : null);
      throw error;
    } finally {
      window.clearTimeout(timer);
      if (state.activeChatController === controller) state.activeChatController = null;
      syncComposerAction();
      controller.abort();
    }
  }
  return requestAtLevel(state.thinkingLevel, state.thinkingLevel === "off" ? null : "off");
}

function syncComposerAction() {
  const canStop = Boolean((state.busy && state.activeChatController) || state.speechRequestController || state.speechAudio || state.browserSpeechActive || (window.speechSynthesis && window.speechSynthesis.speaking));
  el.send.hidden = canStop;
  el.send.disabled = state.busy;
  el.stop.hidden = !canStop;
  el.stop.disabled = state.stopRequested;
}

function setBusy(busy, label) {
  state.busy = busy;
  syncComposerAction();
  el.composerArea.classList.toggle("is-busy", busy);
  if (busy) {
    setStatus(label || "Connecting to the cloud…", true);
    if (state.mode === "voice") updateVoiceCopy();
  } else if (state.speechRequestController || state.speechAudio || state.browserSpeechActive) {
    setStatus(state.speechRequestController && !state.speechAudio ? "Preparing spoken reply…" : "Speaking reply…", true);
    if (state.mode === "voice") updateVoiceCopy();
  } else {
    setStatus("Ready when you are", false);
    if (state.mode === "voice") updateVoiceCopy();
  }
}

function stopResponse() {
  if (state.speechRequestController || state.speechAudio || state.browserSpeechActive || (window.speechSynthesis && window.speechSynthesis.speaking)) {
    stopNarration();
    showToast("Response stopped.");
    return;
  }
  if (!state.busy || !state.activeChatController || state.stopRequested) return;
  state.stopRequested = true;
  syncComposerAction();
  setStatus("Stopping response…", true);
  if (state.activeChatController) state.activeChatController.abort();
}

async function sendMessage(explicitText, frameAttachment) {
  if (state.busy) return;
  const text = typeof explicitText === "string" ? explicitText.trim() : el.input.value.trim();
  const attachments = frameAttachment ? [frameAttachment].concat(state.attachments) : state.attachments.slice();
  if (!text && !attachments.length) return;
  if (attachments.length) {
    if (state.liveReady || state.liveConnecting || state.liveMode) stopLiveSession();
    stopNarration();
  }
  const messageText = text || "Please look at this image and explain anything visible that may help me understand it.";
  const voiceRequest = attachments.length ? "" : requestedVoiceGender(messageText);
  if (voiceRequest) {
    setVoiceGender(voiceRequest, false);
    if (typeof explicitText !== "string" || text === el.input.value.trim()) { el.input.value = ""; resizeInput(); }
    const reply = "Got it. I’ll use a " + (voiceRequest === "male" ? "masculine" : "feminine") + " voice from now on.";
    showInstantExchange(messageText, reply, true);
    return;
  }
  const directUtilityIntent = !attachments.length && identifyUtilityRequest(messageText);
  const followUpUtilityIntent = !attachments.length && !directUtilityIntent ? resolveUtilityFollowUpIntent(messageText, false) : null;
  const utilityIntent = directUtilityIntent || followUpUtilityIntent;
  if (state.liveConnecting) { showToast("Wait for the live session to connect, then try again."); return; }
  if (utilityIntent && state.liveReady) stopLiveSession();
  if (directUtilityIntent || followUpUtilityIntent || (!followUpUtilityIntent && !attachments.length)) state.pendingUtilityFollowUp = null;
  const greeting = !attachments.length && !state.liveReady ? instantGreeting(messageText) : "";
  if (greeting) {
    if (typeof explicitText !== "string" || text === el.input.value.trim()) { el.input.value = ""; resizeInput(); }
    showInstantExchange(messageText, greeting);
    return;
  }
  if (!state.keyReady && !utilityIntent) {
    openSettings();
    el.dialogStatus.textContent = "Add your cloud API key to start chatting.";
    return;
  }
  if (state.liveReady && !attachments.length && text && !utilityIntent) {
    if (!sendLiveInput({ text: text })) { showToast("The live session is reconnecting. Try again in a moment."); return; }
    const liveUserMessage = { role: "user", text: text, attachments: [] };
    state.history.push(liveUserMessage);
    renderMessage(liveUserMessage, { forceScroll: true });
    updateWelcome();
    if (typeof explicitText !== "string" || text === el.input.value.trim()) { el.input.value = ""; resizeInput(); }
    return;
  }
  if (state.liveReady && attachments.length) stopLiveSession();
  if (typeof explicitText !== "string" || text === el.input.value.trim()) {
    el.input.value = "";
    resizeInput();
  }
  const attachmentLabels = attachments.map(function (item) { return { name: item.name }; });
  const userMessage = { role: "user", text: messageText, attachments: attachmentLabels };
  state.history.push(userMessage);
  state.attachments = [];
  renderAttachments();
  renderMessage(userMessage, { forceScroll: true });
  updateWelcome();
  if (utilityIntent && handleUtilityRequest(text || messageText, attachments, userMessage, null, utilityIntent)) return;
  const apiContents = buildContents(attachments);
  const pending = renderMessage({ role: "assistant", text: "" }, { loading: true });
  state.stopRequested = false;
  setBusy(true);
  let slowTimerFired = false;
  let partialAnswer = "";
  try {
      const answer = await streamResponse(apiContents, function (partial) {
      partialAnswer = partial;
      pending.bubble.className = "message-bubble";
      pending.bubble.innerHTML = safeMarkdown(partial);
      scrollConversationToLatest();
    }, function () {
      slowTimerFired = true;
      setStatus("Still connecting…", true);
      if (state.mode === "voice") el.voiceState.textContent = "Still connecting to vyoiōn…";
    }, function (fallbackLevel) {
      setStatus("No reply after 3 seconds; retrying with thinking Off…", true);
      if (state.mode === "voice") el.voiceState.textContent = "Retrying with thinking Off for a quicker reply…";
    });
    pending.item.remove();
    const assistantMessage = { role: "assistant", text: answer };
    state.history.push(assistantMessage);
    if (state.mode === "voice") {
      const rendered = renderMessage({ role: "assistant", text: "" });
      speakReply(answer, rendered.bubble);
    } else {
      renderMessage(assistantMessage);
    }
  } catch (error) {
    if (state.stopRequested) {
      pending.item.remove();
      if (partialAnswer.trim()) {
        const partialMessage = { role: "assistant", text: partialAnswer };
        state.history.push(partialMessage);
        renderMessage(partialMessage);
      }
      showToast("Response stopped.");
      return;
    }
    pending.item.remove();
    const message = error && error.message ? error.message : "Something went wrong. Please try again.";
    renderConnectionError(message);
    showToast(slowTimerFired ? "The connection took longer than usual." : "Couldn’t get a reply. See the connection notice.");
    if (state.mode === "voice") { el.voiceState.textContent = "I couldn’t connect"; el.voiceHint.textContent = message; }
  } finally {
    state.activeChatController = null;
    state.stopRequested = false;
    setBusy(false);
  }
}

function clearChat() {
  if (state.busy) return;
  state.history = [];
  state.attachments = [];
  renderAttachments();
  rerenderHistory();
  el.input.value = "";
  resizeInput();
  if (state.mode === "voice") { el.voiceState.textContent = "Ready to listen"; el.voiceHint.textContent = "Tap the microphone, then speak naturally."; }
}

function setCameraLive(live, note) {
  el.cameraFrame.classList.toggle("is-live", live);
  el.cameraStatus.classList.toggle("live", live);
  el.cameraTitle.textContent = live ? "Camera preview is on" : "Camera preview";
  el.cameraStart.hidden = live;
  el.cameraStop.hidden = !live;
  el.analyzeFrame.disabled = !live;
  el.cameraNote.textContent = note || (live ? "Preview only. Video is shared only while live chat is connected or when you send a frame." : "Your camera stays off until you turn it on.");
  el.cameraNote.classList.remove("error");
  if (el.videoLiveToggle) {
    el.videoLiveToggle.disabled = !live && !state.liveConnecting && state.liveMode !== "video";
    el.videoLiveToggle.textContent = state.liveMode === "video" ? "End live video chat" : "Start live video chat";
  }
}

async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    el.cameraNote.textContent = "Camera preview needs a modern browser with camera access.";
    el.cameraNote.classList.add("error");
    return;
  }
  try {
    stopCamera();
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
    state.cameraStream = stream;
    el.cameraVideo.srcObject = stream;
    await el.cameraVideo.play();
    setCameraLive(true, "Preview only. Video is shared only while live chat is connected or when you send a frame.");
  } catch (error) {
    const message = error && error.name === "NotAllowedError" ? "Camera access was not allowed. You can still type or attach an image." : "Could not start the camera. Check that it is connected and not in use.";
    el.cameraNote.textContent = message;
    el.cameraNote.classList.add("error");
  }
}

function stopCamera() {
  if (state.liveMode === "video") stopLiveSession();
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach(function (track) { track.stop(); });
    state.cameraStream = null;
  }
  if (el.cameraVideo) el.cameraVideo.srcObject = null;
  if (el.cameraFrame) setCameraLive(false, "Your camera stays off until you turn it on.");
  if (el.videoPanel && el.videoPanel.classList.contains("fullscreen-fallback")) exitFallbackFullscreen();
  if (document.fullscreenElement === el.videoPanel && document.exitFullscreen) document.exitFullscreen().catch(function () {});
}

function toggleCameraFullscreen() {
  if (el.videoPanel.classList.contains("fullscreen-fallback")) exitFallbackFullscreen();
  else enterFallbackFullscreen();
}

function syncFullscreenButton() {
  const active = document.fullscreenElement === el.videoPanel || el.videoPanel.classList.contains("fullscreen-fallback");
  const label = el.cameraFullscreen.querySelector("span");
  if (label) label.textContent = active ? "Restore size" : "Full screen";
  el.cameraFullscreen.title = active ? "Restore camera size" : "Full screen camera";
  el.cameraFullscreen.setAttribute("aria-label", active ? "Restore camera size" : "Full screen camera");
}

function enterFallbackFullscreen() {
  if (!state.fullscreenPlaceholder) {
    state.fullscreenPlaceholder = document.createComment("video-panel-position");
    el.videoPanel.parentNode.insertBefore(state.fullscreenPlaceholder, el.videoPanel);
    document.body.appendChild(el.videoPanel);
  }
  el.videoPanel.classList.add("fullscreen-fallback");
  syncFullscreenButton();
}

function exitFallbackFullscreen() {
  el.videoPanel.classList.remove("fullscreen-fallback");
  if (state.fullscreenPlaceholder && state.fullscreenPlaceholder.parentNode) {
    state.fullscreenPlaceholder.parentNode.insertBefore(el.videoPanel, state.fullscreenPlaceholder);
    state.fullscreenPlaceholder.remove();
  }
  state.fullscreenPlaceholder = null;
  syncFullscreenButton();
}

function captureFrame() {
  if (!state.cameraStream || !el.cameraVideo.videoWidth) return null;
  const canvas = document.createElement("canvas");
  const maxWidth = 1400;
  const scale = Math.min(1, maxWidth / el.cameraVideo.videoWidth);
  canvas.width = Math.round(el.cameraVideo.videoWidth * scale);
  canvas.height = Math.round(el.cameraVideo.videoHeight * scale);
  const context = canvas.getContext("2d", { alpha: false });
  context.drawImage(el.cameraVideo, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.84);
  return { name: "Camera frame", mimeType: "image/jpeg", data: dataUrl.slice(dataUrl.indexOf(",") + 1) };
}

function sendLiveInput(input) {
  if (!state.liveSocket || !state.liveReady || state.liveSocket.readyState !== WebSocket.OPEN) return false;
  state.liveSocket.send(JSON.stringify({ realtimeInput: input }));
  return true;
}

function pcmBase64(input, sampleRate) {
  const ratio = sampleRate / 16000;
  const sampleCount = Math.floor(input.length / ratio);
  const pcm = new Int16Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.max(start + 1, Math.min(input.length, Math.floor((i + 1) * ratio)));
    let total = 0;
    for (let j = start; j < end; j++) total += input[j];
    const sample = Math.max(-1, Math.min(1, total / (end - start)));
    pcm[i] = sample < 0 ? sample * 32768 : sample * 32767;
  }
  const bytes = new Uint8Array(pcm.buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x4000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + 0x4000, bytes.length)));
  }
  return window.btoa(binary);
}

async function startLiveAudioCapture(stream) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error("Live voice needs a browser with Web Audio support.");
  const context = state.audioContext || new AudioContextClass({ latencyHint: "interactive" });
  state.audioContext = context;
  await context.resume();
  if (!context.createScriptProcessor) throw new Error("This browser does not support live microphone audio.");
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.7;
  state.analyser = analyser;
  state.analyserData = new Uint8Array(analyser.fftSize);
  source.connect(analyser);

  const processor = context.createScriptProcessor(2048, 1, 1);
  processor.onaudioprocess = function (event) {
    if (!state.liveReady || state.liveUtilityTurnPending || !state.liveSocket || state.liveSocket.readyState !== WebSocket.OPEN) return;
    const audio = event.inputBuffer.getChannelData(0);
    const encoded = pcmBase64(audio, context.sampleRate);
    sendLiveInput({ audio: { data: encoded, mimeType: "audio/pcm;rate=16000" } });
  };
  const silentGain = context.createGain();
  silentGain.gain.value = 0;
  source.connect(processor);
  processor.connect(silentGain);
  silentGain.connect(context.destination);
  state.audioProcessor = processor;
  state.silentGain = silentGain;
}

function appendLiveUserText(text) {
  const cleanText = String(text || "").trim();
  if (!cleanText) return;
  const directUtilityIntent = identifyUtilityRequest(cleanText);
  const followUpUtilityIntent = !directUtilityIntent ? resolveUtilityFollowUpIntent(cleanText) : null;
  const utilityIntent = directUtilityIntent || followUpUtilityIntent;
  if (directUtilityIntent || (!followUpUtilityIntent && !utilityIntent)) state.pendingUtilityFollowUp = null;
  if (utilityIntent) {
    finishLiveAssistantTurn();
    stopLivePlayback();
    state.liveUtilityTurnPending = true;
    state.liveUtilityWaitForTurn = true;
    state.liveUtilityWaitForCard = true;
  }
  const userMessage = { role: "user", text: cleanText, attachments: [] };
  state.history.push(userMessage);
  renderMessage(userMessage, { forceScroll: true });
  updateWelcome();
  if (utilityIntent) {
    handleUtilityRequest(cleanText, [], userMessage, function () {
      state.liveUtilityWaitForCard = false;
      releaseLiveUtilityGate();
    }, utilityIntent);
  } else if (state.liveUtilityTurnPending) {
    state.liveUtilityWaitForCard = false;
    releaseLiveUtilityGate();
  }
}

function releaseLiveUtilityGate() {
  if (!state.liveUtilityWaitForTurn && !state.liveUtilityWaitForCard) state.liveUtilityTurnPending = false;
}

function appendLiveAssistantText(text) {
  if (!text) return;
  if (!state.liveAssistantBubble) {
    const rendered = renderMessage({ role: "assistant", text: "" });
    state.liveAssistantBubble = rendered.bubble;
    state.liveAssistantText = "";
    state.liveAssistantVisible = 0;
    state.liveCaptionTarget = 0;
  }
  state.liveAssistantText += text;
  renderLiveAssistantCaption();
  scrollConversationToLatest();
}

function renderLiveAssistantCaption(forceComplete) {
  if (!state.liveAssistantBubble) return;
  if (forceComplete) state.liveAssistantVisible = state.liveAssistantText.length;
  if (state.liveAssistantVisible > state.liveAssistantText.length) state.liveAssistantVisible = state.liveAssistantText.length;
  if (!forceComplete && state.liveAssistantBubble.dataset.visibleLength === String(state.liveAssistantVisible)) return;
  state.liveAssistantBubble.dataset.visibleLength = String(state.liveAssistantVisible);
  state.liveAssistantBubble.innerHTML = safeMarkdown(state.liveAssistantText.slice(0, state.liveAssistantVisible));
  scrollConversationToLatest();
}

function finishLiveAssistantTurn() {
  renderLiveAssistantCaption(true);
  if (state.liveAssistantText.trim()) state.history.push({ role: "assistant", text: state.liveAssistantText.trim(), attachments: [] });
  if (state.liveCaptionFrame) { window.cancelAnimationFrame(state.liveCaptionFrame); state.liveCaptionFrame = 0; }
  state.liveAssistantBubble = null;
  state.liveAssistantText = "";
  state.liveAssistantVisible = 0;
  state.liveCaptionTarget = 0;
  state.liveCaptionSchedule = [];
  state.liveTurnComplete = false;
}

function stopLivePlayback() {
  state.liveAudioSources.forEach(function (source) { try { source.stop(); } catch (_) {} });
  state.liveAudioSources = [];
  state.livePlaybackTime = state.audioContext ? state.audioContext.currentTime : 0;
  state.speaking = false;
  if (state.liveCaptionFrame) { window.cancelAnimationFrame(state.liveCaptionFrame); state.liveCaptionFrame = 0; }
  state.liveCaptionSchedule = [];
}

function animateLiveCaption() {
  if (state.liveCaptionFrame || !state.audioContext) return;
  function frame() {
    state.liveCaptionFrame = 0;
    const visibleBefore = state.liveAssistantVisible;
    const now = state.audioContext ? state.audioContext.currentTime : 0;
    while (state.liveCaptionSchedule.length && now >= state.liveCaptionSchedule[0].endAt) {
      state.liveAssistantVisible = Math.max(state.liveAssistantVisible, state.liveCaptionSchedule.shift().endIndex);
    }
    const next = state.liveCaptionSchedule[0];
    if (next && now >= next.startAt) {
      const progress = Math.max(0, Math.min(1, (now - next.startAt) / Math.max(.01, next.endAt - next.startAt)));
      const revealTo = Math.round(next.startIndex + ((next.endIndex - next.startIndex) * progress));
      state.liveAssistantVisible = Math.max(state.liveAssistantVisible, revealTo);
    }
    if (state.liveAssistantVisible !== visibleBefore) renderLiveAssistantCaption();
    if (state.liveCaptionSchedule.length) state.liveCaptionFrame = window.requestAnimationFrame(frame);
  }
  state.liveCaptionFrame = window.requestAnimationFrame(frame);
}

function playLiveAudio(base64Audio) {
  if (!state.audioContext || !base64Audio) return;
  try {
    const binary = window.atob(base64Audio);
    const sampleCount = Math.floor(binary.length / 2);
    const samples = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      const low = binary.charCodeAt(i * 2);
      const high = binary.charCodeAt(i * 2 + 1);
      let value = (high << 8) | low;
      if (value >= 32768) value -= 65536;
      samples[i] = value / 32768;
    }
    const audioBuffer = state.audioContext.createBuffer(1, sampleCount, 24000);
    audioBuffer.copyToChannel(samples, 0);
    const source = state.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(state.audioContext.destination);
    const startAt = Math.max(state.audioContext.currentTime + 0.015, state.livePlaybackTime);
    state.livePlaybackTime = startAt + audioBuffer.duration;
    const startIndex = state.liveCaptionTarget;
    const charsToReveal = Math.max(0, Math.round(audioBuffer.duration * 17));
    const endIndex = Math.min(state.liveAssistantText.length, startIndex + charsToReveal);
    if (endIndex > startIndex) {
      state.liveCaptionSchedule.push({ startAt: startAt, endAt: startAt + audioBuffer.duration, startIndex: startIndex, endIndex: endIndex });
      state.liveCaptionTarget = endIndex;
      animateLiveCaption();
    }
    state.liveAudioSources.push(source);
    source.onended = function () {
      state.liveAudioSources = state.liveAudioSources.filter(function (item) { return item !== source; });
      if (!state.liveAudioSources.length && state.audioContext && state.audioContext.currentTime + 0.025 >= state.livePlaybackTime) {
        state.speaking = false;
        if (state.liveTurnComplete) {
          renderLiveAssistantCaption(true);
          finishLiveAssistantTurn();
        }
        if (state.mode === "voice") updateVoiceCopy();
      }
    };
    source.start(startAt);
    state.speaking = true;
    if (state.mode === "voice") updateVoiceCopy();
  } catch (_) {
    showToast("Could not play the live voice response in this browser.");
  }
}

function handleLiveServerMessage(message) {
  if (message && message.setupComplete) {
    state.liveReady = true;
    return true;
  }
  if (message && message.error) throw new Error("The cloud service could not start this live session. Check the key and try again.");
  const content = message && message.serverContent;
  if (!content) return false;
  if (content.interimInputTranscription) {
    const interim = String(content.interimInputTranscription.text || "").trim();
    if (interim) {
      if (state.mode === "voice") el.voiceHint.textContent = interim;
      if ((identifyUtilityRequest(interim) || resolveUtilityFollowUpIntent(interim, false)) && !state.liveUtilityTurnPending) {
        state.liveUtilityTurnPending = true;
        state.liveUtilityWaitForTurn = true;
        state.liveUtilityWaitForCard = true;
        finishLiveAssistantTurn();
        stopLivePlayback();
      }
    }
  }
  if (content.inputTranscription && content.inputTranscription.text) appendLiveUserText(content.inputTranscription.text);
  if (!state.liveUtilityTurnPending && content.outputTranscription && content.outputTranscription.text) appendLiveAssistantText(content.outputTranscription.text);
  if (!state.liveUtilityTurnPending && content.modelTurn && Array.isArray(content.modelTurn.parts)) {
    content.modelTurn.parts.forEach(function (part) {
      if (part.inlineData && part.inlineData.data) playLiveAudio(part.inlineData.data);
    });
  }
  if (content.interrupted) { finishLiveAssistantTurn(); stopLivePlayback(); }
  if (content.turnComplete) {
    if (state.liveUtilityTurnPending) {
      stopLivePlayback();
      state.liveUtilityWaitForTurn = false;
      releaseLiveUtilityGate();
    } else {
      state.liveTurnComplete = true;
      if (!state.liveAudioSources.length) {
        renderLiveAssistantCaption(true);
        finishLiveAssistantTurn();
        state.speaking = false;
      }
    }
    if (state.mode === "voice") updateVoiceCopy();
  }
  return false;
}

async function requestLiveToken() {
  const response = await fetch("/api/live-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voiceGender: state.voiceGender })
  });
  let result = {};
  try { result = await response.json(); } catch (_) {}
  if (!response.ok) throw new Error(result.error || "Could not start a live session.");
  if (!result.token) throw new Error("The local app did not return a live session token.");
  return result.token;
}

function connectLiveSocket(token, attempt) {
  const endpoint = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=" + encodeURIComponent(token);
  const socket = new WebSocket(endpoint);
  socket.binaryType = "arraybuffer";
  state.liveSocket = socket;
  return new Promise(function (resolve, reject) {
    let settled = false;
    let receiveQueue = Promise.resolve();
    const timeout = window.setTimeout(function () {
      if (!settled) { settled = true; reject(new Error("The live session took too long to connect. Check your internet and try again.")); }
    }, 15000);
    socket.onopen = function () {
      if (attempt !== state.liveAttempt) { socket.close(); return; }
      const voiceName = state.voiceGender === "male" ? "Puck" : "Aoede";
      const setupMessage = {
        setup: {
          model: "models/gemini-3.8-live",
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } } }
          }
        }
      };
      socket.send(JSON.stringify(setupMessage));
    };
    socket.onmessage = function (event) {
      receiveQueue = receiveQueue.then(async function () {
        if (attempt !== state.liveAttempt) return;
        let payload = event.data;
        if (typeof payload !== "string") {
          if (payload instanceof Blob) payload = await payload.text();
          else if (payload instanceof ArrayBuffer) payload = new TextDecoder().decode(payload);
          else if (ArrayBuffer.isView(payload)) payload = new TextDecoder().decode(payload);
          else throw new Error("The live service returned an unsupported message format.");
        }
        if (attempt !== state.liveAttempt) return;
        const message = JSON.parse(payload);
        const ready = handleLiveServerMessage(message);
        if (ready && !settled) { settled = true; window.clearTimeout(timeout); resolve(); }
      }).catch(function (error) {
        if (attempt !== state.liveAttempt) return;
        if (!settled) { settled = true; window.clearTimeout(timeout); reject(error); }
        else { showToast(error && error.message ? error.message : "The live session encountered an error."); stopLiveSession(); }
      });
    };
    socket.onerror = function () {
      if (!settled) { settled = true; window.clearTimeout(timeout); reject(new Error("Could not connect to the live cloud session.")); }
    };
    socket.onclose = function () {
      if (!settled) { settled = true; window.clearTimeout(timeout); reject(new Error("The live cloud session closed before it was ready.")); }
      if (state.liveSocket === socket && state.liveReady) {
        showToast("The live session ended. Start another whenever you’re ready.");
        stopLiveSession();
      }
    };
  });
}

function captureLiveFrame() {
  if (!state.cameraStream || !el.cameraVideo.videoWidth || !state.liveReady || state.liveUtilityTurnPending) return;
  const scale = Math.min(1, 640 / el.cameraVideo.videoWidth, 360 / el.cameraVideo.videoHeight);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(el.cameraVideo.videoWidth * scale));
  canvas.height = Math.max(1, Math.round(el.cameraVideo.videoHeight * scale));
  const context = canvas.getContext("2d", { alpha: false });
  context.drawImage(el.cameraVideo, 0, 0, canvas.width, canvas.height);
  const image = canvas.toDataURL("image/jpeg", 0.58).split(",")[1];
  sendLiveInput({ video: { data: image, mimeType: "image/jpeg" } });
}

function stopLiveSession() {
  state.liveAttempt++;
  const previousMode = state.liveMode;
  finishLiveAssistantTurn();
  if (state.liveVideoTimer) { window.clearInterval(state.liveVideoTimer); state.liveVideoTimer = 0; }
  const socket = state.liveSocket;
  state.liveSocket = null;
  state.liveReady = false;
  state.liveConnecting = false;
  state.liveMode = null;
  if (state.liveUtilityTurnPending && state.activeChatController) state.activeChatController.abort();
  state.liveUtilityTurnPending = false;
  state.liveUtilityWaitForTurn = false;
  state.liveUtilityWaitForCard = false;
  if (socket && socket.readyState === WebSocket.OPEN) {
    try { socket.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } })); } catch (_) {}
    try { socket.close(1000, "Session ended by user"); } catch (_) {}
  } else if (socket) { try { socket.close(); } catch (_) {} }
  if (state.audioProcessor) { state.audioProcessor.onaudioprocess = null; try { state.audioProcessor.disconnect(); } catch (_) {} state.audioProcessor = null; }
  if (state.silentGain) { try { state.silentGain.disconnect(); } catch (_) {} state.silentGain = null; }
  stopLivePlayback();
  if (state.voiceStream) {
    state.voiceStream.getTracks().forEach(function (track) { track.stop(); });
    state.voiceStream = null;
  }
  if (state.audioContext) { state.audioContext.close().catch(function () {}); state.audioContext = null; }
  state.analyser = null;
  state.analyserData = null;
  state.listening = false;
  stopNarration();
  if (el.micToggle) {
    el.micToggle.classList.remove("listening");
    el.micToggle.setAttribute("aria-label", "Start voice chat");
  }
  if (el.videoLiveToggle) {
    el.videoLiveToggle.textContent = "Start live video chat";
    el.videoLiveToggle.disabled = !state.cameraStream;
  }
  if (previousMode === "video" && state.cameraStream) setCameraLive(true, "Live chat ended. Camera preview stays local; no more frames are being sent.");
  setStatus("Ready when you are", false);
  if (state.mode === "voice") updateVoiceCopy();
}

async function startLiveSession(mode) {
  if (state.liveMode === mode || (state.liveConnecting && state.liveMode === mode)) { stopLiveSession(); return; }
  if (!state.keyReady) { openSettings(); el.dialogStatus.textContent = "Add a replacement cloud API key to start a live session."; return; }
  if (mode === "video" && !state.cameraStream) {
    el.cameraNote.textContent = "Start camera preview before beginning live video chat.";
    el.cameraNote.classList.add("error");
    return;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast("This browser does not support live microphone access.");
    return;
  }
  const attempt = ++state.liveAttempt;
  state.liveMode = mode;
  state.liveConnecting = true;
  state.liveReady = false;
  if (mode === "voice") updateVoiceCopy();
  else { el.videoLiveToggle.disabled = true; el.videoLiveToggle.textContent = "Connecting…"; }
  setStatus("Connecting to live chat", true);
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error("Live voice needs a modern browser with Web Audio support.");
    state.audioContext = new AudioContextClass({ latencyHint: "interactive" });
    state.audioContext.resume().catch(function () {});
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
    if (attempt !== state.liveAttempt) { stream.getTracks().forEach(function (track) { track.stop(); }); return; }
    state.voiceStream = stream;
    const token = await requestLiveToken();
    if (attempt !== state.liveAttempt) return;
    await connectLiveSocket(token, attempt);
    if (attempt !== state.liveAttempt) return;
    await startLiveAudioCapture(stream);
    if (attempt !== state.liveAttempt) return;
    state.liveConnecting = false;
    state.listening = true;
    setStatus("Live conversation active", false);
    if (mode === "voice") {
      el.micToggle.classList.add("listening");
      el.micToggle.setAttribute("aria-label", "End voice chat");
      updateVoiceCopy();
    } else {
      el.videoLiveToggle.disabled = false;
      el.videoLiveToggle.textContent = "End live video chat";
      setCameraLive(true, "Live video is connected. Up to one camera frame per second is shared until you end the conversation.");
      state.liveVideoTimer = window.setInterval(captureLiveFrame, 1000);
      captureLiveFrame();
    }
  } catch (error) {
    if (attempt === state.liveAttempt) {
      showToast(error && error.message ? error.message : "Could not start the live conversation.");
      stopLiveSession();
      setStatus("Ready when you are", false);
    }
  }
}

async function toggleVideoLive() {
  if (state.liveMode === "video" || (state.liveConnecting && state.liveMode === "video")) { stopLiveSession(); return; }
  await startLiveSession("video");
}

async function toggleVoice() {
  if (state.liveMode === "voice" || (state.liveConnecting && state.mode === "voice")) { stopLiveSession(); return; }
  await startLiveSession("voice");
}

function stopVoice() {
  stopLiveSession();
  state.voiceSpeechToken++;
  stopNarration();
  if (el.micToggle) {
    el.micToggle.classList.remove("listening");
    el.micToggle.setAttribute("aria-label", "Start voice chat");
  }
}

function updateVoiceCopy() {
  if (state.liveConnecting && state.liveMode === "voice") {
    el.voiceState.textContent = "Connecting";
    el.voiceHint.textContent = "Starting a private live voice session…";
  } else if (state.liveReady && state.liveMode === "voice" && state.speaking) {
    el.voiceState.textContent = "Speaking";
    el.voiceHint.textContent = "I’m listening as you speak; interrupt whenever you like.";
  } else if (state.liveReady && state.liveMode === "voice") {
    el.voiceState.textContent = "Listening";
    el.voiceHint.textContent = "Speak naturally. Tap the microphone to end this session.";
  } else if (state.speechRequestController) {
    el.voiceState.textContent = "Preparing reply";
    el.voiceHint.textContent = "Getting the spoken version ready.";
  } else if (state.busy) {
    el.voiceState.textContent = "Thinking it through";
    el.voiceHint.textContent = "I’m finding a clear way to explain it.";
  } else if (state.speaking) {
    el.voiceState.textContent = "Speaking";
    el.voiceHint.textContent = "Tap the microphone when you’re ready to reply.";
  } else {
    el.voiceState.textContent = "Ready to listen";
    el.voiceHint.textContent = "Tap the microphone, then speak naturally.";
  }
}

function speechLanguage(text) {
  return /[\u0900-\u097f]/.test(text) || /\b(?:hai|hain|hoon|aap|mujhe|mera|kaise|kya|nahi|nahin|karunga|karungi|bataunga|bataungi)\b/i.test(text) ? "hi-IN" : "en-IN";
}

function chooseSpeechVoice(text) {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const language = speechLanguage(text).toLowerCase().split("-")[0];
  const genderPattern = state.voiceGender === "male"
    ? /\b(?:male|david|guy|mark|ravi|mohan|arjun|rahul|jorge|daniel)\b/i
    : /\b(?:female|zira|aria|jenny|samantha|heera|kalpana|neerja|priya|swara|aditi|susan)\b/i;
  const inLanguage = voices.filter(function (voice) { return String(voice.lang || "").toLowerCase().startsWith(language); });
  return inLanguage.find(function (voice) { return genderPattern.test(voice.name); })
    || inLanguage[0]
    || voices.find(function (voice) { return genderPattern.test(voice.name); })
    || voices[0];
}

function speechTextFromReply(text) {
  return String(text || "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/^\s*(?:[-*•]|\d+[.)])\s+/gm, "")
    .replace(/[|*_`#]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function stopNarration() {
  if (state.speechRequestController) {
    state.speechRequestController.abort();
    state.speechRequestController = null;
  }
  if (state.speechAudio) {
    state.speechAudio.onended = null;
    state.speechAudio.onerror = null;
    state.speechAudio.pause();
    state.speechAudio.removeAttribute("src");
    state.speechAudio.load();
    state.speechAudio = null;
  }
  if (state.speechAudioUrl) {
    URL.revokeObjectURL(state.speechAudioUrl);
    state.speechAudioUrl = "";
  }
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  state.browserSpeechActive = false;
  if (state.voiceCaptionTimer) { window.clearInterval(state.voiceCaptionTimer); state.voiceCaptionTimer = 0; }
  if (state.voiceCaptionBubble) {
    state.voiceCaptionBubble.innerHTML = safeMarkdown(state.voiceCaptionText);
    state.voiceCaptionBubble = null;
    state.voiceCaptionText = "";
  }
  state.speaking = false;
  if (state.mode === "voice") updateVoiceCopy();
  if (!state.busy) setStatus("Ready when you are", false);
  syncComposerAction();
}

function speakWithBrowser(speechText, bubble, speechToken) {
  if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
    if (bubble) bubble.innerHTML = safeMarkdown(speechText);
    state.speaking = false;
    updateVoiceCopy();
    syncComposerAction();
    return;
  }
  const utterance = new SpeechSynthesisUtterance(speechText);
  utterance.lang = speechLanguage(speechText);
  utterance.voice = chooseSpeechVoice(speechText);
  utterance.rate = 0.98;
  utterance.pitch = state.voiceGender === "male" ? 0.9 : 1.08;
  const startedAt = Date.now();
  let visibleLength = 0;
  let boundarySeen = false;
  state.voiceCaptionBubble = bubble;
  state.voiceCaptionText = speechText;
  function reveal(endIndex) {
    if (!bubble || speechToken !== state.voiceSpeechToken) return;
    visibleLength = Math.max(visibleLength, Math.min(speechText.length, endIndex));
    bubble.innerHTML = safeMarkdown(speechText.slice(0, visibleLength));
    scrollConversationToLatest();
  }
  state.speaking = true;
  state.browserSpeechActive = true;
  setStatus("Speaking reply…", true);
  updateVoiceCopy();
  utterance.onboundary = function (event) {
    boundarySeen = true;
    const start = Math.max(0, Number(event.charIndex) || 0);
    const nextSpace = speechText.indexOf(" ", start);
    reveal(nextSpace < 0 ? speechText.length : nextSpace + 1);
  };
  state.voiceCaptionTimer = window.setInterval(function () {
    if (boundarySeen) return;
    const estimatedLength = Math.floor(Math.max(0, Date.now() - startedAt - 120) / 72);
    if (estimatedLength > visibleLength) reveal(estimatedLength);
  }, 60);
  function finishSpeech() {
    if (speechToken !== state.voiceSpeechToken) return;
    if (state.voiceCaptionTimer) { window.clearInterval(state.voiceCaptionTimer); state.voiceCaptionTimer = 0; }
    reveal(speechText.length);
    state.voiceCaptionBubble = null;
    state.voiceCaptionText = "";
    state.speaking = false;
    state.browserSpeechActive = false;
    updateVoiceCopy();
    if (!state.busy) setStatus("Ready when you are", false);
    syncComposerAction();
  }
  utterance.onend = finishSpeech;
  utterance.onerror = finishSpeech;
  window.speechSynthesis.speak(utterance);
}

async function speakReply(text, bubble) {
  const speechText = speechTextFromReply(text);
  state.voiceSpeechToken++;
  stopNarration();
  const speechToken = state.voiceSpeechToken;
  if (bubble) bubble.innerHTML = safeMarkdown(speechText);
  if (!speechText) return;

  const controller = new AbortController();
  state.speechRequestController = controller;
  syncComposerAction();
  try {
    const response = await fetch("/api/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: speechText, voiceGender: state.voiceGender }),
      signal: controller.signal
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Cloud speech generation failed.");
    if (speechToken !== state.voiceSpeechToken || controller.signal.aborted) return;
    if (!result.audio) throw new Error("Cloud speech did not return audio.");

    const bytes = Uint8Array.from(atob(result.audio), function (character) { return character.charCodeAt(0); });
    const audioUrl = URL.createObjectURL(new Blob([bytes], { type: result.mimeType || "audio/wav" }));
    const audio = new Audio(audioUrl);
    state.speechAudioUrl = audioUrl;
    state.speechAudio = audio;
    state.speechRequestController = null;
    state.voiceCaptionBubble = bubble;
    state.voiceCaptionText = speechText;
    if (bubble) bubble.textContent = "";
    audio.ontimeupdate = function () {
      if (!bubble || speechToken !== state.voiceSpeechToken) return;
      const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
      const progress = duration ? Math.min(1, audio.currentTime / duration) : 0;
      const end = Math.floor(progress * speechText.length);
      const nextSpace = speechText.indexOf(" ", end);
      bubble.textContent = speechText.slice(0, nextSpace < 0 ? speechText.length : nextSpace);
      scrollConversationToLatest();
    };
    audio.onplaying = function () { state.speaking = true; setStatus("Speaking reply…", true); updateVoiceCopy(); };
    function finishAudio() {
      if (speechToken !== state.voiceSpeechToken) return;
      if (bubble) bubble.innerHTML = safeMarkdown(speechText);
      state.voiceCaptionBubble = null;
      state.voiceCaptionText = "";
      state.speaking = false;
      state.speechAudio = null;
      if (state.speechAudioUrl) URL.revokeObjectURL(state.speechAudioUrl);
      state.speechAudioUrl = "";
      updateVoiceCopy();
      if (!state.busy) setStatus("Ready when you are", false);
      syncComposerAction();
    }
    audio.onended = finishAudio;
    audio.onerror = function () {
      if (speechToken !== state.voiceSpeechToken) return;
      audio.onerror = null;
      audio.onended = null;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      state.speechAudio = null;
      if (state.speechAudioUrl) URL.revokeObjectURL(state.speechAudioUrl);
      state.speechAudioUrl = "";
      speakWithBrowser(speechText, bubble, speechToken);
      syncComposerAction();
    };
    try { await audio.play(); }
    catch (_) {
      if (speechToken !== state.voiceSpeechToken) return;
      audio.onerror = null;
      audio.onended = null;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      state.speechAudio = null;
      if (state.speechAudioUrl) URL.revokeObjectURL(state.speechAudioUrl);
      state.speechAudioUrl = "";
      speakWithBrowser(speechText, bubble, speechToken);
    }
  } catch (error) {
    if (speechToken !== state.voiceSpeechToken || controller.signal.aborted) return;
    speakWithBrowser(speechText, bubble, speechToken);
  } finally {
    if (state.speechRequestController === controller) state.speechRequestController = null;
    syncComposerAction();
  }
}

function resizeOrb() {
  if (!el.voiceCanvas) return;
  const rect = el.voiceCanvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  el.voiceCanvas.width = Math.max(1, Math.round(rect.width * dpr));
  el.voiceCanvas.height = Math.max(1, Math.round(rect.height * dpr));
}

function initializeOrb() {
  const canvas = el.voiceCanvas;
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const golden = Math.PI * (3 - Math.sqrt(5));
  state.orbPoints = [];
  for (let i = 0; i < 740; i++) {
    const y = 1 - (i / 739) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = golden * i;
    state.orbPoints.push({ x: Math.cos(theta) * radius, y: y, z: Math.sin(theta) * radius, size: .45 + Math.random() * .8, phase: Math.random() * Math.PI * 2 });
  }
  function draw(now) {
    if (state.mode !== "voice") {
      state.orbFrame = requestAnimationFrame(draw);
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    ctx.clearRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;
    const seconds = now / 1000;
    let level = 0;
    if (state.analyser && state.analyserData) {
      state.analyser.getByteTimeDomainData(state.analyserData);
      let sum = 0;
      for (let i = 0; i < state.analyserData.length; i++) {
        const value = (state.analyserData[i] - 128) / 128;
        sum += value * value;
      }
      level = Math.min(.72, Math.sqrt(sum / state.analyserData.length) * 2.3);
    }
    if (state.speaking) {
      state.syntheticVoiceLevel = .12 + Math.abs(Math.sin(seconds * 7.3) * Math.sin(seconds * 2.4)) * .34;
      level = Math.max(level, state.syntheticVoiceLevel);
    }
    const motion = level + .025 + Math.sin(seconds * 1.15) * .012;
    const sphereRadius = Math.min(width, height) * (.36 + motion * .12);
    const angle = seconds * .23;
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const depth = sphereRadius * 2.9;
    const sorted = state.orbPoints.map(function (point) {
      const x = point.x * ca - point.z * sa;
      const z = point.x * sa + point.z * ca;
      const wave = Math.sin(seconds * 2.2 + point.phase + point.y * 5) * motion * 3;
      const perspective = depth / (depth - z * sphereRadius * .52);
      return { x: cx + x * (sphereRadius + wave) * perspective, y: cy + point.y * (sphereRadius + wave) * perspective, z: z, size: point.size * perspective, alpha: .23 + Math.max(0, z + .15) * .48 + motion * .38 };
    });
    sorted.sort(function (a, b) { return a.z - b.z; });
    const halo = ctx.createRadialGradient(cx, cy, sphereRadius * .12, cx, cy, sphereRadius * 1.22);
    halo.addColorStop(0, "rgba(85, 208, 170, " + (0.045 + motion * .065) + ")");
    halo.addColorStop(.63, "rgba(61, 149, 155, 0.035)");
    halo.addColorStop(1, "rgba(20, 60, 76, 0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, sphereRadius * 1.22, 0, Math.PI * 2);
    ctx.fill();
    sorted.forEach(function (point) {
      ctx.globalAlpha = Math.min(.92, point.alpha);
      ctx.fillStyle = point.z > .35 ? "#a7f2d8" : (point.z < -.35 ? "#548da2" : "#81d9c0");
      ctx.beginPath();
      ctx.arc(point.x, point.y, Math.max(.5, point.size * dpr * 1.05), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    const glow = ctx.createRadialGradient(cx - sphereRadius * .12, cy - sphereRadius * .17, 0, cx, cy, sphereRadius * .43);
    glow.addColorStop(0, "rgba(179, 255, 225, 0.16)");
    glow.addColorStop(.36, "rgba(103, 226, 187, 0.11)");
    glow.addColorStop(1, "rgba(64, 180, 160, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, sphereRadius * .44, 0, Math.PI * 2);
    ctx.fill();
    const orbGlow = document.querySelector(".orb-glow");
    if (orbGlow) orbGlow.style.transform = "scale(" + (1 + motion * .2) + ")";
    state.orbFrame = requestAnimationFrame(draw);
  }
  state.orbFrame = requestAnimationFrame(draw);
}

el.modeButtons.forEach(function (button) { button.addEventListener("click", function () { setMode(button.dataset.mode); }); });
el.workspace.addEventListener("scroll", function () {
  if (state.mode !== "voice") updateConversationFollow(el.workspace);
}, { passive: true });
el.conversation.addEventListener("scroll", function () {
  if (state.mode === "voice") updateConversationFollow(el.conversation);
}, { passive: true });
document.getElementById("new-chat").addEventListener("click", clearChat);
document.getElementById("settings-open").addEventListener("click", openSettings);
document.getElementById("notice-settings").addEventListener("click", openSettings);
document.getElementById("key-shortcut").addEventListener("click", openSettings);
document.getElementById("about-open").addEventListener("click", openSettings);
el.voiceGender.addEventListener("change", function () { setVoiceGender(el.voiceGender.value, true); });
el.form.addEventListener("submit", function (event) { event.preventDefault(); sendMessage(); });
el.stop.addEventListener("click", stopResponse);
el.input.addEventListener("input", resizeInput);
el.input.addEventListener("keydown", function (event) {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) { event.preventDefault(); el.form.requestSubmit(); }
});
el.attach.addEventListener("click", function () { el.fileInput.click(); });
el.fileInput.addEventListener("change", function () { selectFiles(el.fileInput.files); });
document.querySelectorAll(".suggestion-card").forEach(function (button) {
  button.addEventListener("click", function () { el.input.value = button.dataset.prompt || ""; resizeInput(); el.input.focus(); });
});
el.thinkingOptions.forEach(function (button) {
  button.addEventListener("click", function () { setThinkingLevel(button.dataset.thinking); });
});
document.getElementById("key-form").addEventListener("submit", async function (event) {
  event.preventDefault();
  const key = el.keyInput.value.trim();
  if (!key) return;
  const saveButton = document.getElementById("save-key-button");
  saveButton.disabled = true;
  saveButton.textContent = "Verifying…";
  el.dialogStatus.classList.remove("error");
  el.dialogStatus.textContent = "Checking access to the chat service…";
  try {
    const configured = await saveKey(key);
    if (!configured) throw new Error("Paste a fresh replacement key first.");
    state.keyReady = false;
    updateWelcome();
    await verifyKeyAccess();
    state.keyReady = true;
    updateWelcome();
    el.dialogStatus.classList.remove("error");
    el.dialogStatus.textContent = "Key verified. Chat access is ready; live access is checked when a live session starts.";
    setStatus("Ready when you are", false);
    window.setTimeout(closeSettings, 300);
  } catch (error) {
    if (error && error.invalidKey) {
      try { await saveKey(""); } catch (_) { state.keyReady = false; updateWelcome(); }
      el.dialogStatus.textContent = error.message;
    } else {
      state.keyReady = true;
      updateWelcome();
      el.dialogStatus.textContent = (error && error.message ? error.message : "The cloud check did not finish.") + " The key is still saved for this session.";
    }
    el.dialogStatus.classList.add("error");
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "Save and verify";
  }
});
el.keyVisibility.addEventListener("click", function () {
  const visible = el.keyInput.type === "password";
  el.keyInput.type = visible ? "text" : "password";
  el.keyVisibility.textContent = visible ? "Hide" : "Show";
});
document.getElementById("forget-key").addEventListener("click", async function () {
  el.keyInput.value = "";
  try {
    await saveKey("");
    el.dialogStatus.classList.remove("error");
    el.dialogStatus.textContent = "The key has been removed from the local app process.";
  } catch (error) {
    el.dialogStatus.textContent = error.message;
    el.dialogStatus.classList.add("error");
  }
});
el.micToggle.addEventListener("click", toggleVoice);
el.cameraStart.addEventListener("click", startCamera);
el.cameraStop.addEventListener("click", stopCamera);
el.cameraFullscreen.addEventListener("click", toggleCameraFullscreen);
el.videoLiveToggle.addEventListener("click", toggleVideoLive);
document.getElementById("dialog-close").addEventListener("click", closeSettings);
el.analyzeFrame.addEventListener("click", function () {
  const image = captureFrame();
  if (!image) { showToast("Wait for the camera preview to appear, then try again."); return; }
  if (!el.input.value.trim()) el.input.value = "Can you help me understand what is visible here?";
  if (!state.keyReady) {
    state.attachments.push(image);
    renderAttachments();
    openSettings();
    el.dialogStatus.textContent = "Add your cloud API key, then send the camera frame from the message box.";
    return;
  }
  sendMessage(el.input.value, image);
});
el.dialog.addEventListener("click", function (event) {
  const rect = el.dialog.getBoundingClientRect();
  const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    if (outside) closeSettings();
  });
el.dialog.addEventListener("cancel", function (event) { event.preventDefault(); closeSettings(); });
el.dialog.addEventListener("close", function () {
  el.keyInput.value = "";
  el.keyInput.type = "password";
  el.keyVisibility.textContent = "Show";
});
document.addEventListener("fullscreenchange", function () {
  syncFullscreenButton();
  if (!document.fullscreenElement && el.videoPanel.classList.contains("fullscreen-fallback")) exitFallbackFullscreen();
});
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && el.videoPanel.classList.contains("fullscreen-fallback")) exitFallbackFullscreen();
});
window.addEventListener("beforeunload", function () { stopCamera(); stopVoice(); });

try { if (localStorage.getItem("vyoion.voiceGender") === "male") state.voiceGender = "male"; } catch (_) {}
el.voiceGender.value = state.voiceGender;
updateWelcome();
refreshKeyStatus();
initializeOrb();
