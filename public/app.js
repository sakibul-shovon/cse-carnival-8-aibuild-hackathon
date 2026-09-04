const SYSTEM_CONFIG = {
  schedules: { label: "Schedules", icon: "◷", description: "Weekly classes and teaching slots", columns: ["course", "title", "day", "start_time", "end_time", "room", "section"], fields: [
    ["id", "ID", "text"], ["course", "Course", "text"], ["title", "Course title", "text"], ["day", "Day", "select", ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"]], ["start_time", "Starts", "time"], ["end_time", "Ends", "time"], ["room", "Room", "text"], ["instructor", "Instructor", "text"], ["section", "Section", "text"]
  ]},
  rooms: { label: "Rooms", icon: "⌂", description: "Spaces, equipment and reservations", columns: ["room_number", "type", "capacity", "equipment", "floor", "status", "bookings"], fields: [
    ["id", "ID", "text"], ["room_number", "Room number", "text"], ["type", "Type", "select", ["classroom", "lab", "seminar"]], ["capacity", "Capacity", "number"], ["equipment", "Equipment (comma-separated)", "array"], ["floor", "Floor", "number"], ["status", "Operational status", "select", ["available", "unavailable"]]
  ]},
  events: { label: "Events", icon: "◇", description: "Campus activities and registrations", columns: ["name", "date", "start_time", "venue", "organizer", "registered", "status"], fields: [
    ["id", "ID", "text"], ["name", "Name", "text"], ["description", "Description", "textarea"], ["date", "Start date", "date"], ["start_time", "Starts", "time"], ["end_time", "Ends", "time"], ["end_date", "End date", "date"], ["venue", "Venue", "text"], ["organizer", "Organizer", "text"], ["capacity", "Capacity", "number"], ["status", "Status", "select", ["upcoming", "ongoing", "completed", "cancelled", "full"]]
  ]},
  announcements: { label: "Announcements", icon: "◉", description: "Notices and time-sensitive updates", columns: ["title", "priority", "date", "posted_by", "expires"], fields: [
    ["id", "ID", "text"], ["title", "Title", "text"], ["body", "Announcement", "textarea"], ["date", "Posted date", "date"], ["priority", "Priority", "select", ["high", "medium", "low"]], ["posted_by", "Posted by", "text"], ["expires", "Expires", "date"]
  ]},
  assignments: { label: "Assignments", icon: "✓", description: "Coursework, deadlines and submission status", columns: ["course", "title", "deadline", "submission_platform", "status", "marks"], fields: [
    ["id", "ID", "text"], ["course", "Course", "text"], ["course_title", "Course title", "text"], ["title", "Assignment title", "text"], ["description", "Description", "textarea"], ["assigned_date", "Assigned date", "date"], ["deadline", "Deadline", "date"], ["submission_platform", "Submission platform", "text"], ["status", "Status", "select", ["pending", "submitted", "graded", "late"]], ["marks", "Marks", "number"]
  ]}
};

const state = { view: "overview", data: {}, query: "", config: { student: {} }, loading: false };
const $ = (selector, root = document) => root.querySelector(selector);
const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
const titleCase = (value) => String(value).replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

async function api(url, options = {}) {
  const response = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
}

function toast(message, kind = "success") {
  const item = document.createElement("div");
  item.className = `toast ${kind}`;
  item.textContent = message;
  $("#toastRegion").appendChild(item);
  setTimeout(() => item.remove(), 3800);
}

function setLoading(value) {
  state.loading = value;
  $("#globalLoading").classList.toggle("active", value);
}

function formatValue(key, value) {
  if (key === "bookings") return `${value?.length || 0} booking${value?.length === 1 ? "" : "s"}`;
  if (key === "registered") return String(value ?? 0);
  if (Array.isArray(value)) return value.join(" · ") || "—";
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

function badgeClass(key, value) {
  if (["status", "priority"].includes(key)) return `badge badge-${String(value).toLowerCase()}`;
  return "";
}

function renderNavigation() {
  const entries = [{ key: "overview", label: "Overview", icon: "▦" }, ...Object.entries(SYSTEM_CONFIG).map(([key, config]) => ({ key, label: config.label, icon: config.icon })), { key: "assistant", label: "AI Assistant", icon: "✦" }];
  $("#systemTabs").innerHTML = entries.map((item) => `<button type="button" class="nav-item ${state.view === item.key ? "active" : ""}" data-view="${item.key}"><span>${item.icon}</span>${item.label}</button>`).join("");
  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.view)));
}

function navigate(view) {
  if (view !== "overview" && view !== "assistant" && !SYSTEM_CONFIG[view]) view = "overview";
  state.view = view;
  if (location.hash !== `#${view}`) history.replaceState(null, "", `#${view}`);
  state.query = "";
  renderNavigation();
  $("#overview").classList.toggle("hidden", view !== "overview");
  $("#systemContent").classList.toggle("hidden", !SYSTEM_CONFIG[view]);
  $("#assistant").classList.toggle("hidden", view !== "assistant");
  $("#pageTitle").textContent = view === "overview" ? `Good day, ${state.config.student?.name?.split(" ")[0] || "Student"}` : view === "assistant" ? "AI Campus Assistant" : SYSTEM_CONFIG[view].label;
  if (view === "overview") renderOverview();
  else if (view === "assistant") renderAssistant();
  else renderSystem(view);
  document.body.classList.remove("nav-open");
}

function renderOverview() {
  const counts = Object.entries(SYSTEM_CONFIG).map(([key, config]) => `<button class="metric-card" data-jump="${key}"><span class="metric-icon">${config.icon}</span><span><strong>${state.data[key]?.length || 0}</strong><small>${config.label}</small></span><b>↗</b></button>`).join("");
  const announcements = [...(state.data.announcements || [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  const events = [...(state.data.events || [])].filter((event) => !["cancelled", "completed"].includes(event.status)).sort((a, b) => `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`)).slice(0, 4);
  $("#overview").innerHTML = `
    <div class="hero"><div><span class="hero-kicker">Everything connected. Always current.</span><h2>Your university data,<br><em>one intelligent assistant.</em></h2><p>Manage campus operations and ask questions against the same live database.</p><div class="hero-actions"><button class="primary big" data-jump="assistant">Ask CampusOS <span>→</span></button><a class="database-link" href="/api/database/export" target="_blank" rel="noopener">View database JSON</a></div></div><div class="orbit" aria-hidden="true"><div class="orb orb-main">✦</div><div class="orb one">◷</div><div class="orb two">⌂</div><div class="orb three">✓</div></div></div>
    <div class="metrics-grid">${counts}</div>
    <div class="overview-grid">
      <article class="panel"><div class="panel-heading"><div><p class="eyebrow">Notice board</p><h3>Latest announcements</h3></div><button class="text-button" data-jump="announcements">View all →</button></div><div class="feed-list">${announcements.map((item) => `<button data-edit-id="${esc(item.id)}" data-edit-system="announcements" class="feed-item"><span class="priority-dot ${esc(item.priority)}"></span><span><strong>${esc(item.title)}</strong><small>${esc(item.posted_by)} · ${esc(item.date)}</small></span></button>`).join("") || '<p class="empty">No announcements yet.</p>'}</div></article>
      <article class="panel"><div class="panel-heading"><div><p class="eyebrow">On campus</p><h3>Upcoming events</h3></div><button class="text-button" data-jump="events">View all →</button></div><div class="feed-list">${events.map((item) => `<button data-manage-event="${esc(item.id)}" class="feed-item calendar-item"><span class="date-tile"><b>${esc(item.date.slice(8))}</b><small>${new Date(`${item.date}T00:00:00`).toLocaleString("en", { month: "short" })}</small></span><span><strong>${esc(item.name)}</strong><small>${esc(item.start_time)} · ${esc(item.venue)} · ${item.registered}/${item.capacity}</small></span></button>`).join("") || '<p class="empty">No upcoming events.</p>'}</div></article>
    </div>`;
  attachViewActions($("#overview"));
}

function filteredRecords(system) {
  const query = state.query.toLowerCase();
  return (state.data[system] || []).filter((record) => !query || JSON.stringify(record).toLowerCase().includes(query));
}

function renderSystem(system) {
  const config = SYSTEM_CONFIG[system];
  const records = filteredRecords(system);
  $("#systemContent").innerHTML = `
    <div class="section-heading"><div><p class="eyebrow">Live data manager</p><h2>${config.label}</h2><p>${config.description}. Changes are immediately available to the AI.</p></div><button class="primary" data-create="${system}">+ Add ${config.label.slice(0, -1)}</button></div>
    <div class="panel table-panel"><div class="table-toolbar"><label class="search-box"><span>⌕</span><input id="recordSearch" value="${esc(state.query)}" placeholder="Search ${config.label.toLowerCase()}…" /></label><span>${records.length} of ${state.data[system]?.length || 0} records</span></div>
    <div class="table-wrap">${records.length ? `<table><thead><tr>${config.columns.map((key) => `<th>${esc(titleCase(key))}</th>`).join("")}<th><span class="sr-only">Actions</span></th></tr></thead><tbody>${records.map((record) => `<tr>${config.columns.map((key) => `<td><span class="${badgeClass(key, record[key])}">${esc(formatValue(key, record[key]))}</span></td>`).join("")}<td class="row-actions">${system === "rooms" ? `<button class="small-button accent" data-manage-room="${esc(record.id)}">Bookings</button>` : ""}${system === "events" ? `<button class="small-button accent" data-manage-event="${esc(record.id)}">Attendees</button>` : ""}<button class="small-button" data-edit-id="${esc(record.id)}" data-edit-system="${system}">Edit</button><button class="small-button danger" data-delete-id="${esc(record.id)}" data-delete-system="${system}">Delete</button></td></tr>`).join("")}</tbody></table>` : '<div class="empty"><span>⌕</span><h3>No matching records</h3><p>Try another search or add the first record.</p></div>'}</div></div>`;
  $("#recordSearch").addEventListener("input", (event) => {
    state.query = event.target.value;
    const cursor = event.target.selectionStart ?? state.query.length;
    renderSystem(system);
    const nextInput = $("#recordSearch");
    nextInput.focus();
    nextInput.setSelectionRange(cursor, cursor);
  });
  attachViewActions($("#systemContent"));
}

function attachViewActions(root) {
  root.querySelectorAll("[data-jump]").forEach((el) => el.addEventListener("click", () => navigate(el.dataset.jump)));
  root.querySelectorAll("[data-create]").forEach((el) => el.addEventListener("click", () => openRecordModal(el.dataset.create)));
  root.querySelectorAll("[data-edit-id]").forEach((el) => el.addEventListener("click", () => openRecordModal(el.dataset.editSystem, state.data[el.dataset.editSystem].find((item) => item.id === el.dataset.editId))));
  root.querySelectorAll("[data-delete-id]").forEach((el) => el.addEventListener("click", () => confirmDelete(el.dataset.deleteSystem, el.dataset.deleteId)));
  root.querySelectorAll("[data-manage-room]").forEach((el) => el.addEventListener("click", () => openRoomModal(state.data.rooms.find((item) => item.id === el.dataset.manageRoom))));
  root.querySelectorAll("[data-manage-event]").forEach((el) => el.addEventListener("click", () => openEventModal(state.data.events.find((item) => item.id === el.dataset.manageEvent))));
}

function modalShell(title, subtitle, content, wide = false) {
  $("#modalRoot").innerHTML = `<div class="modal-backdrop" role="presentation"><section class="modal-card ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><header><div><h2 id="modalTitle">${esc(title)}</h2><p>${esc(subtitle)}</p></div><button class="icon-button" data-close aria-label="Close">×</button></header><div class="modal-body">${content}</div></section></div>`;
  const backdrop = $(".modal-backdrop");
  backdrop.addEventListener("click", (event) => { if (event.target === backdrop) closeModal(); });
  $("[data-close]", backdrop).addEventListener("click", closeModal);
  document.addEventListener("keydown", escapeModal);
  return backdrop;
}
function escapeModal(event) { if (event.key === "Escape") closeModal(); }
function closeModal() { $("#modalRoot").innerHTML = ""; document.removeEventListener("keydown", escapeModal); }

function inputMarkup(field, record, editing) {
  const [name, label, type, options] = field;
  const value = record?.[name] ?? "";
  const disabled = editing && name === "id" ? "disabled" : "";
  if (type === "textarea") return `<label class="form-field full"><span>${esc(label)}</span><textarea name="${name}" required>${esc(value)}</textarea></label>`;
  if (type === "select") return `<label class="form-field"><span>${esc(label)}</span><select name="${name}" required>${options.map((option) => `<option value="${esc(option)}" ${option === value ? "selected" : ""}>${esc(titleCase(option))}</option>`).join("")}</select></label>`;
  return `<label class="form-field ${name === "title" || name === "name" ? "full" : ""}"><span>${esc(label)}</span><input name="${name}" type="${type === "array" ? "text" : type}" value="${esc(type === "array" && Array.isArray(value) ? value.join(", ") : value)}" ${type === "number" ? 'min="0"' : ""} ${disabled} required /></label>`;
}

function nextId(system) {
  const prefix = { schedules: "sch", rooms: "room", events: "evt", announcements: "ann", assignments: "asgn" }[system];
  const max = Math.max(0, ...(state.data[system] || []).map((item) => Number(String(item.id).match(/(\d+)$/)?.[1] || 0)));
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

function openRecordModal(system, record = null) {
  const editing = Boolean(record);
  const initial = record || { id: nextId(system), ...(system === "rooms" ? { type: "classroom", status: "available", equipment: [] } : {}), ...(system === "events" ? { status: "upcoming" } : {}), ...(system === "announcements" ? { priority: "medium" } : {}), ...(system === "assignments" ? { status: "pending" } : {}) };
  const modal = modalShell(`${editing ? "Edit" : "Add"} ${SYSTEM_CONFIG[system].label.slice(0, -1)}`, editing ? `Updating ${record.id}` : "Create a new live campus record", `<form id="recordForm" class="form-grid">${SYSTEM_CONFIG[system].fields.map((field) => inputMarkup(field, initial, editing)).join("")}<div class="form-actions full"><button type="button" class="secondary" data-close-form>Cancel</button><button type="submit" class="primary">${editing ? "Save changes" : "Create record"}</button></div></form>`, true);
  $("[data-close-form]", modal).addEventListener("click", closeModal);
  $("#recordForm", modal).addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    for (const [name, , type] of SYSTEM_CONFIG[system].fields) {
      if (type === "number") payload[name] = Number(payload[name]);
      if (type === "array") payload[name] = payload[name].split(",").map((item) => item.trim()).filter(Boolean);
    }
    if (editing) payload.id = record.id;
    if (!editing && system === "rooms") payload.bookings = [];
    if (!editing && system === "events") { payload.registrations = []; payload.registered = 0; }
    try {
      const submit = form.querySelector("button[type=submit]"); submit.disabled = true; submit.textContent = "Saving…";
      await api(`/api/${system}${editing ? `/${encodeURIComponent(record.id)}` : ""}`, { method: editing ? "PUT" : "POST", body: JSON.stringify(payload) });
      closeModal(); await loadData(); toast(`${SYSTEM_CONFIG[system].label.slice(0, -1)} ${editing ? "updated" : "created"}.`);
    } catch (error) { toast(error.message, "error"); form.querySelector("button[type=submit]").disabled = false; }
  });
}

async function confirmDelete(system, id) {
  if (!window.confirm(`Delete ${id}? This change will also be visible to the AI.`)) return;
  try { await api(`/api/${system}/${encodeURIComponent(id)}`, { method: "DELETE" }); await loadData(); toast("Record deleted."); } catch (error) { toast(error.message, "error"); }
}

function openRoomModal(room) {
  const bookings = room.bookings || [];
  const modal = modalShell(`Room ${room.room_number}`, `${room.capacity} seats · ${room.equipment.join(" · ")}`, `<div class="split-modal"><div><h3>Current bookings</h3><div class="booking-list">${bookings.map((booking) => `<div class="booking-card"><div><strong>${esc(booking.date)} · ${esc(booking.start_time)}–${esc(booking.end_time)}</strong><span>${esc(booking.purpose)} · ${esc(booking.booked_by)}</span></div><button class="small-button danger" data-cancel-booking="${esc(booking.booking_id)}">Cancel</button></div>`).join("") || '<p class="empty compact">No bookings for this room.</p>'}</div></div><form id="bookingForm" class="stack-form"><h3>New booking</h3><label><span>Booked by</span><input name="booked_by" value="${esc(state.config.student.name || "")}" required></label><label><span>Date</span><input name="date" type="date" required></label><div class="form-row"><label><span>Starts</span><input name="start_time" type="time" required></label><label><span>Ends</span><input name="end_time" type="time" required></label></div><label><span>Purpose</span><input name="purpose" placeholder="e.g. Project meeting" required></label><button type="submit" class="primary">Confirm booking</button></form></div>`, true);
  modal.querySelectorAll("[data-cancel-booking]").forEach((button) => button.addEventListener("click", async () => {
    if (!window.confirm("Cancel this booking?")) return;
    try { await api(`/api/rooms/${encodeURIComponent(room.id)}/bookings/${encodeURIComponent(button.dataset.cancelBooking)}`, { method: "DELETE" }); await loadData(); toast("Booking cancelled."); openRoomModal(state.data.rooms.find((item) => item.id === room.id)); } catch (error) { toast(error.message, "error"); }
  }));
  $("#bookingForm", modal).addEventListener("submit", async (event) => {
    event.preventDefault();
    try { await api(`/api/rooms/${encodeURIComponent(room.id)}/book`, { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) }); closeModal(); await loadData(); toast(`Room ${room.room_number} booked.`); } catch (error) { toast(error.message, "error"); }
  });
}

function openEventModal(event) {
  const registrations = event.registrations || [];
  const modal = modalShell(event.name, `${event.date} · ${event.start_time}–${event.end_time} · ${event.registered}/${event.capacity} registered`, `<div class="split-modal"><div><h3>Known registrations</h3><div class="booking-list">${registrations.map((item) => `<div class="booking-card"><div><strong>${esc(item.name)}</strong><span>${esc(item.student_id)}</span></div><button class="small-button danger" data-cancel-registration="${esc(item.student_id)}">Cancel</button></div>`).join("") || '<p class="empty compact">No individual registrations listed.</p>'}</div><p class="muted-note">The total can include registrations imported without individual details.</p></div><form id="registrationForm" class="stack-form"><h3>Register student</h3><label><span>Student ID</span><input name="student_id" value="${esc(state.config.student.student_id || "")}" required></label><label><span>Name</span><input name="name" value="${esc(state.config.student.name || "")}" required></label><button type="submit" class="primary" ${["full", "cancelled", "completed"].includes(event.status) ? "disabled" : ""}>Register</button></form></div>`, true);
  modal.querySelectorAll("[data-cancel-registration]").forEach((button) => button.addEventListener("click", async () => {
    if (!window.confirm("Cancel this registration?")) return;
    try { await api(`/api/events/${encodeURIComponent(event.id)}/registrations/${encodeURIComponent(button.dataset.cancelRegistration)}`, { method: "DELETE" }); await loadData(); toast("Registration cancelled."); openEventModal(state.data.events.find((item) => item.id === event.id)); } catch (error) { toast(error.message, "error"); }
  }));
  $("#registrationForm", modal).addEventListener("submit", async (submitEvent) => {
    submitEvent.preventDefault();
    try { await api(`/api/events/${encodeURIComponent(event.id)}/register`, { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(submitEvent.currentTarget).entries())) }); closeModal(); await loadData(); toast(`Registered for ${event.name}.`); } catch (error) { toast(error.message, "error"); }
  });
}

function renderAssistant() {
  if ($("#chatMessages")) return;
  const configured = state.config.ai_configured;
  $("#assistant").innerHTML = `<div class="assistant-layout"><aside class="assistant-intro"><span class="ai-mark">✦</span><p class="eyebrow">Grounded in live data</p><h2>Ask CampusOS</h2><p>Look up classes and deadlines, find spaces, or take an action. Every answer is fetched from the current SQLite database.</p><div class="identity-card"><small>Acting as</small><strong>${esc(state.config.student.name)}</strong><span>${esc(state.config.student.student_id)}</span></div><div class="ai-status ${configured ? "ready" : "offline"}"><span></span>${configured ? "Gemini connected" : "API key required"}</div></aside><section class="chat-card"><div id="chatMessages" class="chat-messages"><div class="chat-welcome"><span>✦</span><h3>How can I help on campus?</h3><p>I’ll check live records before I answer or act.</p><div class="prompt-grid">${["When is my next class?", "What assignments are due this week?", "Show high priority announcements", "Which labs have a projector and fit 30 people?", "Find a projector room for 5 tomorrow from 2 to 4 PM", "Register me for the Guest Lecture on Deep Learning"].map((prompt) => `<button data-prompt="${esc(prompt)}">${esc(prompt)}</button>`).join("")}</div></div></div><form id="chatForm" class="chat-form"><textarea id="chatInput" rows="1" placeholder="Ask about your campus…"></textarea><button type="submit" aria-label="Send">↑</button></form>${configured ? "" : '<p class="config-hint">Chat is available, but AI replies require <code>GEMINI_API_KEY</code> in <code>.env</code> and a server restart.</p>'}</section></div>`;
  $("#assistant").querySelectorAll("[data-prompt]").forEach((button) => button.addEventListener("click", () => { $("#chatInput").value = button.dataset.prompt; $("#chatForm").requestSubmit(); }));
  $("#chatForm").addEventListener("submit", sendChat);
  $("#chatInput").addEventListener("keydown", (event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); $("#chatForm").requestSubmit(); } });
}

function bubble(role, message, loading = false) {
  const welcome = $(".chat-welcome"); if (welcome) welcome.remove();
  const div = document.createElement("div"); div.className = `chat-bubble ${role}${loading ? " thinking" : ""}`; div.textContent = message;
  $("#chatMessages").appendChild(div); $("#chatMessages").scrollTop = $("#chatMessages").scrollHeight; return div;
}
async function sendChat(event) {
  event.preventDefault(); const input = $("#chatInput"); const message = input.value.trim(); if (!message) return;
  bubble("user", message); input.value = ""; const pending = bubble("assistant", "Checking live campus data…", true); const button = $("#chatForm button"); button.disabled = true;
  try { const result = await api("/api/agent/chat", { method: "POST", body: JSON.stringify({ message, student: state.config.student }) }); pending.classList.remove("thinking"); pending.textContent = result.message; if (result.tool_calls) pending.title = `${result.tool_calls} live data tool call(s)`; await loadData(false); }
  catch (error) { pending.classList.remove("thinking"); pending.classList.add("error"); pending.textContent = error.message; }
  finally { button.disabled = false; input.focus(); }
}

async function loadData(rerender = true) {
  setLoading(true);
  try {
    const keys = Object.keys(SYSTEM_CONFIG);
    const values = await Promise.all(keys.map((key) => api(`/api/${key}`)));
    state.data = Object.fromEntries(keys.map((key, index) => [key, values[index]]));
    if (rerender) navigate(state.view);
  } catch (error) {
    $("#overview").innerHTML = `<div class="empty error-state"><h2>CampusOS could not load</h2><p>${esc(error.message)}</p><button class="primary" onclick="location.reload()">Try again</button></div>`;
    toast(error.message, "error");
  } finally { setLoading(false); }
}

window.addEventListener("DOMContentLoaded", async () => {
  $("#menuButton").addEventListener("click", () => document.body.classList.toggle("nav-open"));
  $("#assistantShortcut").addEventListener("click", () => navigate("assistant"));
  try { state.config = await api("/api/config"); } catch {}
  const requestedView = location.hash.slice(1);
  if (requestedView === "overview" || requestedView === "assistant" || SYSTEM_CONFIG[requestedView]) state.view = requestedView;
  renderNavigation(); await loadData();
});
window.addEventListener("hashchange", () => navigate(location.hash.slice(1) || "overview"));
