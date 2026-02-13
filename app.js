// ===============================
// Rentago Waitlist Frontend Logic
// ===============================
//
// Connected Google Apps Script Web App URL (must end in /exec)
const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycby7rBKzZi1hHk2YfhINm7TY2rWdpzuaDUtMIDQgVpUJktfHtWqSTQIhviyPy4e-ZhCfZw/exec";

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

const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const formatCount = (n) => {
  try { return Number(n).toLocaleString(); } catch { return String(n); }
};

const setLoading = (on) => {
  if (!btn) return;
  btn.disabled = on;
  if (spinner) spinner.style.display = on ? "inline-block" : "none";
  if (btnText) btnText.textContent = on ? "Joining..." : "Join the waitlist";
};

const setMsg = (type, text) => {
  if (!msg) return;
  msg.classList.remove("error", "success");
  if (type) msg.classList.add(type);
  msg.textContent = text;
};

const openModal = (email) => {
  if (mEmail) mEmail.textContent = `Confirmed: ${email}`;
  if (overlay) {
    overlay.classList.add("show");
    overlay.setAttribute("aria-hidden", "false");
  }
};

const closeModal = () => {
  if (overlay) {
    overlay.classList.remove("show");
    overlay.setAttribute("aria-hidden", "true");
  }
};

// Modal events
closeBtn?.addEventListener("click", closeModal);
overlay?.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

// Fetch live count
async function fetchCount() {
  try {
    const r = await fetch(WEBHOOK_URL, { method: "GET" });
    const d = await r.json();
    if (countNum && typeof d.count === "number") {
      countNum.textContent = formatCount(d.count);
    }
  } catch (err) {
    console.warn("Count fetch failed:", err);
  }
}

// Submit signup
form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = (emailEl?.value || "").trim().toLowerCase();

  if (!validEmail(email)) {
    setMsg("error", "Please enter a valid email.");
    return;
  }

  setLoading(true);
  setMsg(null, "Adding you to the waitlist…");

  // Send as URL-encoded form data (most reliable with Apps Script)
  const body = new URLSearchParams({ email }).toString();

  try {
    const r = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body
    });

    // Try to read JSON response
    let d = null;
    try { d = await r.json(); } catch { d = null; }

    if (d && d.status) {
      if (d.status === "duplicate") {
        setMsg("error", "You’re already on the list. 👀");
        return;
      }

      if (d.status === "ok") {
        if (typeof d.count === "number" && countNum) {
          countNum.textContent = formatCount(d.count);
        }
        setMsg("success", "Welcome — you’re officially early.");
        openModal(email);
        if (emailEl) emailEl.value = "";
        return;
      }

      setMsg("error", "Something went wrong. Try again.");
      return;
    }

    // If response is opaque/unreadable but request likely succeeded:
    setMsg("success", "Submitted! Check the Waitlist sheet tab.");
    openModal(email);
    if (emailEl) emailEl.value = "";
    setTimeout(fetchCount, 700);

  } catch (err) {
    console.error("Signup failed:", err);
    setMsg("error", "Network error. Try again.");
  } finally {
    setLoading(false);
  }
});

// Init
fetchCount();
