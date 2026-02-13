// ===============================
// Rentago Waitlist Frontend Logic
// ===============================
//
// Paste your Google Apps Script Web App URL below once deployed.
// Example: https://script.google.com/macros/s/XXXXX/exec
const WEBHOOK_URL = "PASTE_YOUR_GOOGLE_APPS_SCRIPT_URL_HERE";

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

// ---- Apple-like reveals (no libraries)
function setupReveals() {
  const els = document.querySelectorAll(".reveal");
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) e.target.classList.add("in");
    });
  }, { threshold: 0.12 });
  els.forEach((el) => io.observe(el));

  // Ensure hero animates even if already in view
  setTimeout(() => els.forEach(el => el.classList.add("in")), 200);
}

// ---- Helpers
const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const formatCount = (n) => {
  try { return Number(n).toLocaleString(); } catch { return String(n); }
};

const setLoading = (on) => {
  btn.disabled = on;
  spinner.style.display = on ? "inline-block" : "none";
  btnText.textContent = on ? "Joining..." : "Join waitlist";
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

// ---- Count
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

// ---- Submit
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = (emailEl.value || "").trim().toLowerCase();

  if (!validEmail(email)) {
    setMsg("error", "Please enter a valid email.");
    return;
  }

  // If webhook not set, still WOW the user (demo mode)
  const webhookReady = WEBHOOK_URL && !WEBHOOK_URL.includes("PASTE_");
  if (!webhookReady) {
    // Fake count bump locally so it feels live
    const raw = (countNum.textContent || "").replace(/,/g, "").trim();
    const current = (!raw || raw === "—" || isNaN(Number(raw))) ? 0 : Number(raw);
    countNum.textContent = formatCount(current + 1);

    setMsg("success", "You’re in. (Connect Sheets to save emails.)");
    openModal(email);
    emailEl.value = "";
    return;
  }

  setLoading(true);
  setMsg(null, "No spam. Just launch updates + early access.");

  // Optimistic bump if count known
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

setupReveals();
fetchCount();
