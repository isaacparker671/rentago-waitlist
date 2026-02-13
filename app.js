// ===============================
// Rentago Waitlist Frontend Logic
// ===============================
//
// IMPORTANT:
// 1) Create a Google Apps Script Web App (I’ll give you the code next)
// 2) Paste the Web App URL into WEBHOOK_URL below

const WEBHOOK_URL = "PASTE_YOUR_GOOGLE_APPS_SCRIPT_URL_HERE";

// Elements
const countNum = document.getElementById("countNum");
const form = document.getElementById("waitlistForm");
const emailEl = document.getElementById("email");
const btn = document.getElementById("submitBtn");
const btnText = document.getElementById("btnText");
const spinner = document.getElementById("spinner");
const msg = document.getElementById("msg");

const overlay = document.getElementById("overlay");
const mEmail = document.getElementById("mEmail");
const closeBtn = document.getElementById("closeBtn");

// Helpers
const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const formatCount = (n) => {
  try { return Number(n).toLocaleString(); } catch { return String(n); }
};

const setLoading = (on) => {
  btn.disabled = on;
  spinner.style.display = on ? "inline-block" : "none";
  btnText.textContent = on ? "Joining..." : "Join the waitlist";
};

const setMsg = (type, text) => {
  msg.classList.remove("error", "success");
  if (type) msg.classList.add(type);
  msg.textContent = text;
};

const openModal = (email) => {
  mEmail.textContent = `Confirmed: ${email}`;
  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");
};

const closeModal = () => {
  overlay.classList.remove("show");
  overlay.setAttribute("aria-hidden", "true");
};

// Modal events
closeBtn.addEventListener("click", closeModal);
overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

// Get live count on load
async function fetchCount() {
  if (!WEBHOOK_URL || WEBHOOK_URL.includes("PASTE_")) return;
  try {
    const r = await fetch(WEBHOOK_URL, { method: "GET" });
    const d = await r.json();
    if (typeof d.count === "number") countNum.textContent = formatCount(d.count);
  } catch {
    // ignore
  }
}

// Submit signup
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = (emailEl.value || "").trim().toLowerCase();

  if (!validEmail(email)) {
    setMsg("error", "Please enter a valid email.");
    return;
  }

  if (!WEBHOOK_URL || WEBHOOK_URL.includes("PASTE_")) {
    setMsg("error", "Webhook URL not set yet. Create the Google Apps Script URL and paste it into app.js.");
    return;
  }

  setLoading(true);
  setMsg(null, "Early members get priority access.");

  // Optimistic bump (only if count already known)
  let prior = null;
  const raw = (countNum.textContent || "").replace(/,/g, "").trim();
  if (raw && raw !== "—" && !isNaN(Number(raw))) {
    prior = Number(raw);
    countNum.textContent = formatCount(prior + 1);
  }

  try {
    const r = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ email })
    });

    const d = await r.json().catch(() => ({}));

    if (d.status === "duplicate") {
      if (prior !== null) countNum.textContent = formatCount(prior);
      setMsg("error", "You’re already on the list. 👀");
      return;
    }

    if (d.status !== "ok") {
      if (prior !== null) countNum.textContent = formatCount(prior);
      setMsg("error", "Something went wrong. Try again.");
      return;
    }

    if (typeof d.count === "number") countNum.textContent = formatCount(d.count);

    setMsg("success", "Welcome — you’re officially early.");
    openModal(email);
    emailEl.value = "";
  } catch {
    if (prior !== null) countNum.textContent = formatCount(prior);
    setMsg("error", "Network error. Please try again.");
  } finally {
    setLoading(false);
  }
});

// Init
fetchCount();
