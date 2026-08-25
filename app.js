/* ==========================================================================
   PANCHA TATVA - ELEMENTAL HOUSE PORTAL
   Frontend Controller with PostgreSQL Backend Integration
   ========================================================================== */

// --- 5 Elemental Houses Configuration ---
const HOUSES = {
  vayu: {
    number: 1,
    name: "Vayu",
    element: "Air & Wind",
    motto: "Master of the Whispering Winds and Boundless Freedom",
    virtue: "Agility & Wisdom",
    icon: "💨",
    themeClass: "theme-2d-vayu",
    imgClass: "img-bg-vayu",
    color: "#0284c7",
    tagline: "Swift, elusive, and perceptive as the atmospheric currents."
  },
  agni: {
    number: 2,
    name: "Agni",
    element: "Fire & Energy",
    motto: "Igniting the Sacred Flame of Will and Infinite Radiance",
    virtue: "Courage & Passion",
    icon: "🔥",
    themeClass: "theme-2d-agni",
    imgClass: "img-bg-agni",
    color: "#ea580c",
    tagline: "Bold, transformative, and burning with unyielding determination."
  },
  jal: {
    number: 3,
    name: "Jal",
    element: "Water & Ocean",
    motto: "Unstoppable as the River, Deep as the Eternal Abyss",
    virtue: "Adaptability & Intuition",
    icon: "💧",
    themeClass: "theme-2d-jal",
    imgClass: "img-bg-jal",
    color: "#2563eb",
    tagline: "Fluid, healing, and capable of carving through mountains."
  },
  akash: {
    number: 4,
    name: "Akash",
    element: "Sky & Ether / Cosmos",
    motto: "Transcending Boundaries into the Infinite Cosmic Realm",
    virtue: "Vision & Illumination",
    icon: "🌌",
    themeClass: "theme-2d-akash",
    imgClass: "img-bg-akash",
    color: "#7c3aed",
    tagline: "Omnipresent, boundless, holding the fabric of space and spirit."
  },
  prudhvi: {
    number: 5,
    name: "Prudhvi",
    element: "Earth & Nature",
    motto: "Unshakable Foundation of Ancient Roots and Living Mountains",
    virtue: "Resilience & Strength",
    icon: "🌍",
    themeClass: "theme-2d-prudhvi",
    imgClass: "img-bg-prudhvi",
    color: "#059669",
    tagline: "Solid, protective, nurturing life with immense grounded power."
  }
};

// Storage Keys
const STORAGE_CURRENT_USER_KEY = "pancha_tatva_current_user_pg";

// Global State
let currentUser = null;
let isPostgresConnected = false;
const API_BASE = window.location.port === "5500" ? "http://localhost:3000" : "";

// --- Initialize Application ---
document.addEventListener("DOMContentLoaded", () => {
  checkPostgresStatus();
  checkExistingSession();
});

// Check Backend / PostgreSQL connection status
async function checkPostgresStatus() {
  const dbStatusPill = document.getElementById("dbStatusPill");
  try {
    const res = await fetch(`${API_BASE}/api/status`);
    if (res.ok) {
      const data = await res.json();
      isPostgresConnected = true;
      if (dbStatusPill) {
        dbStatusPill.innerHTML = `<span class="db-dot active"></span> PostgreSQL Connected (${data.totalUsers} saved)`;
        dbStatusPill.classList.add("online");
      }
    } else {
      throw new Error("DB server returned error");
    }
  } catch (err) {
    isPostgresConnected = false;
    if (dbStatusPill) {
      dbStatusPill.innerHTML = `<span class="db-dot offline"></span> PostgreSQL Syncing`;
      dbStatusPill.classList.remove("online");
    }
  }
}

// Session Management
function checkExistingSession() {
  const sessionUser = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
  if (sessionUser) {
    try {
      currentUser = JSON.parse(sessionUser);
      renderDashboard();
      return;
    } catch (e) {
      currentUser = null;
    }
  }
  showAuthView();
}

// --- Auth Tab Switching ---
function switchAuthTab(tab) {
  const tabRegister = document.getElementById("tabRegister");
  const tabLogin = document.getElementById("tabLogin");
  const registerForm = document.getElementById("registerForm");
  const loginForm = document.getElementById("loginForm");

  if (tab === "register") {
    tabRegister.classList.add("active");
    tabLogin.classList.remove("active");
    registerForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
  } else {
    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
  }
}

// Password field visibility toggle
function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    input.type = input.type === "password" ? "text" : "password";
  }
}

// --- Registration Logic (PostgreSQL Backend) ---
async function handleRegister(e) {
  e.preventDefault();

  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim().toLowerCase();
  const password = document.getElementById("regPassword").value;
  const confirmPassword = document.getElementById("regConfirmPassword").value;
  const houseOption = document.querySelector('input[name="houseSelection"]:checked');
  const btnSubmit = document.getElementById("btnSubmitRegister");

  if (!name || !email || !password || !houseOption) {
    showToast("Please complete all registration fields", true);
    return;
  }

  if (password.length < 6) {
    showToast("Password must be at least 6 characters long", true);
    return;
  }

  if (password !== confirmPassword) {
    showToast("Passwords do not match", true);
    return;
  }

  const payload = {
    name: name,
    email: email,
    password: password,
    houseKey: houseOption.value
  };

  btnSubmit.disabled = true;
  btnSubmit.innerHTML = `<span>Saving to PostgreSQL...</span>`;

  try {
    const res = await fetch(`${API_BASE}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      showToast(data.message || "Registration failed", true);
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `<span>Complete Registration</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>`;
      return;
    }

    // Successfully saved to PostgreSQL
    currentUser = data.user;
    localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(currentUser));
    document.getElementById("registerForm").reset();

    showToast(`Registered successfully in PostgreSQL! Welcome to House ${HOUSES[currentUser.houseKey]?.name || ''}!`);
    checkPostgresStatus();
    renderDashboard();
  } catch (err) {
    console.error("Register fetch error:", err);
    showToast("Server connection error. Please make sure the PostgreSQL server is running.", true);
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = `<span>Complete Registration</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>`;
  }
}

// --- Login Logic (PostgreSQL Backend) ---
async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value.trim().toLowerCase();
  const password = document.getElementById("loginPassword").value;
  const btnSubmit = document.getElementById("btnSubmitLogin");

  if (!email || !password) {
    showToast("Please provide both email and password", true);
    return;
  }

  btnSubmit.disabled = true;
  btnSubmit.innerHTML = `<span>Authenticating...</span>`;

  try {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      showToast(data.message || "Login failed", true);
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `<span>Log In to Realm</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>`;
      return;
    }

    currentUser = data.user;
    localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(currentUser));
    document.getElementById("loginForm").reset();

    showToast(`Welcome back, ${currentUser.name}!`);
    renderDashboard();
  } catch (err) {
    console.error("Login fetch error:", err);
    showToast("Unable to connect to database server. Please ensure server is running.", true);
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = `<span>Log In to Realm</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>`;
  }
}

// --- View Switching ---
function showAuthView() {
  document.getElementById("authSection").classList.remove("hidden");
  document.getElementById("dashboardSection").classList.add("hidden");
  document.getElementById("statusText").textContent = "System Ready";
}

function handleLogout() {
  currentUser = null;
  localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
  showToast("Logged out successfully");
  showAuthView();
}

// --- Render Dashboard (Only House Button) ---
function renderDashboard() {
  if (!currentUser) return;

  const authSection = document.getElementById("authSection");
  const dashboardSection = document.getElementById("dashboardSection");

  authSection.classList.add("hidden");
  dashboardSection.classList.remove("hidden");

  // User Profile
  document.getElementById("userNameDisplay").textContent = currentUser.name;
  document.getElementById("userEmailDisplay").textContent = currentUser.email;
  document.getElementById("userAvatar").textContent = currentUser.name.charAt(0).toUpperCase();

  const house = HOUSES[currentUser.houseKey] || HOUSES.vayu;

  document.getElementById("statusText").textContent = `House ${house.name} Online`;

  renderHouseButton(house);
  loadHandRaiseStatus();
}

// Render the student's house identity beside the hand-raise action
function renderHouseButton(house) {
  const houseBadge = document.getElementById("studentHouseBadge");
  const houseIcon = document.getElementById("studentHouseIcon");
  const houseName = document.getElementById("studentHouseName");

  if (houseBadge) houseBadge.textContent = `House ${house.name}`;
  if (houseIcon) houseIcon.textContent = house.icon;
  if (houseName) houseName.textContent = house.name;
}

async function loadHandRaiseStatus() {
  if (!currentUser) return;

  try {
    const res = await fetch(`${API_BASE}/api/hand-raises`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "Unable to load hand raises");
    updateRaiseButton(data.raises[0]);
    updateFirstRaiser(data.raises[0]);
  } catch (err) {
    console.error("Hand raise status error:", err);
    showToast("Unable to check hand-raise status", true);
  }
}

function updateFirstRaiser(firstRaise) {
  const card = document.getElementById("firstRaiserCard");
  const name = document.getElementById("firstRaiserName");
  const houseIcon = document.getElementById("firstRaiserHouseIcon");
  const houseName = document.getElementById("firstRaiserHouse");
  if (!card || !name || !houseIcon || !houseName) return;

  if (!firstRaise) {
    card.hidden = true;
    return;
  }

  const house = HOUSES[firstRaise.house_key] || HOUSES.vayu;
  name.textContent = firstRaise.name;
  houseIcon.textContent = house.icon;
  houseName.textContent = house.name;
  card.hidden = false;
}

function updateRaiseButton(existingRaise) {
  const button = document.getElementById("raiseHandButton");
  const status = document.getElementById("raiseHandStatus");
  if (!button || !status) return;

  button.disabled = Boolean(existingRaise);
  button.classList.toggle("raised", Boolean(existingRaise));
  status.textContent = existingRaise
    ? `First hand raised by ${existingRaise.name} from House ${HOUSES[existingRaise.house_key]?.name || existingRaise.house_key}.`
    : "Your submission will be timestamped and added to the faculty queue.";
  button.querySelector(".raise-button-label").textContent = existingRaise ? "Hand Raised" : "Raise Hand";
}

async function handleRaiseHand() {
  if (!currentUser) return;
  const button = document.getElementById("raiseHandButton");
  button.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/hand-raises`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Unable to raise hand");
    updateRaiseButton(data.raise);
    await loadHandRaiseStatus();
    showToast("Your hand is raised. Faculty can see your place in line.");
  } catch (err) {
    button.disabled = false;
    showToast(err.message, true);
  }
}

// --- House Modal Display Logic ---
function openHouseModal() {
  if (!currentUser) return;
  const houseKey = currentUser.houseKey || "vayu";
  const house = HOUSES[houseKey] || HOUSES.vayu;
  const modal = document.getElementById("houseModal");

  // Populate Modal Info
  document.getElementById("modal3DBadge").textContent = house.icon;
  document.getElementById("modalHouseTitle").textContent = `HOUSE ${house.name.toUpperCase()}`;
  document.getElementById("modalHouseMotto").textContent = `"${house.motto}"`;
  
  document.getElementById("modalElement").textContent = house.element;
  document.getElementById("modalNumber").textContent = `House #${house.number}`;
  document.getElementById("modalVirtue").textContent = house.virtue;
  document.getElementById("modalHouseDesc").textContent = house.tagline;

  modal.classList.remove("hidden");
}

function closeHouseModal(e) {
  if (e && e.target !== document.getElementById("houseModal") && !e.target.classList.contains("modal-close-btn") && !e.target.classList.contains("btn-primary-blue")) {
    return;
  }
  document.getElementById("houseModal").classList.add("hidden");
}

// --- Toast Utility ---
let toastTimer = null;
function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  const toastMsg = document.getElementById("toastMsg");
  const toastIcon = document.getElementById("toastIcon");

  if (!toast) return;

  if (toastTimer) clearTimeout(toastTimer);

  toastMsg.textContent = message;
  if (isError) {
    toast.classList.add("toast-error");
    toastIcon.textContent = "✕";
  } else {
    toast.classList.remove("toast-error");
    toastIcon.textContent = "✓";
  }

  toast.classList.remove("hidden");

  toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 3500);
}
