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
// Note: If deploying frontend on GitHub Pages, set BACKEND_URL to your deployed Node.js backend (e.g. "https://your-app.onrender.com")
const BACKEND_URL = "";
const API_BASE = BACKEND_URL || (window.location.port === "5500" ? "http://localhost:3000" : "");

// --- Initialize Application ---
document.addEventListener("DOMContentLoaded", () => {
  checkPostgresStatus();
  checkExistingSession();
});

// --- Local Storage Fallback Data Helpers for GitHub Pages / Offline ---
const DB_USERS_KEY = "pancha_tatva_all_users_db";
const DB_RAISES_KEY = "pancha_tatva_all_raises_db";
const DB_QUESTION_KEY = "pancha_tatva_current_question";

function getLocalUsers() {
  try { return JSON.parse(localStorage.getItem(DB_USERS_KEY) || "[]"); } catch(e) { return []; }
}
function saveLocalUsers(users) {
  localStorage.setItem(DB_USERS_KEY, JSON.stringify(users));
}
function getLocalRaises() {
  try { return JSON.parse(localStorage.getItem(DB_RAISES_KEY) || "[]"); } catch(e) { return []; }
}
function saveLocalRaises(raises) {
  localStorage.setItem(DB_RAISES_KEY, JSON.stringify(raises));
}
function getLocalQuestion() {
  return localStorage.getItem(DB_QUESTION_KEY) || "Question 1";
}

// Check Backend / PostgreSQL connection status
async function checkPostgresStatus() {
  const dbStatusPill = document.getElementById("dbStatusPill");
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${API_BASE}/api/status`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      isPostgresConnected = true;
      if (dbStatusPill) {
        dbStatusPill.innerHTML = `<span class="db-dot active"></span> PostgreSQL Connected (${data.totalUsers} saved)`;
        dbStatusPill.classList.add("online");
      }
      return;
    }
  } catch (err) {
    // Backend offline / GitHub Pages mode
  }
  isPostgresConnected = false;
  if (dbStatusPill) {
    const total = getLocalUsers().length;
    dbStatusPill.innerHTML = `<span class="db-dot active"></span> Active Portal (${total} registered)`;
    dbStatusPill.classList.add("online");
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

// --- Registration Logic ---
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
  btnSubmit.innerHTML = `<span>Registering...</span>`;

  try {
    let handled = false;
    // Attempt API register if server is reachable
    if (isPostgresConnected) {
      try {
        const res = await fetch(`${API_BASE}/api/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
          currentUser = data.user;
          handled = true;
        } else {
          showToast(data.message || "Registration failed", true);
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = `<span>Complete Registration</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>`;
          return;
        }
      } catch (err) {
        handled = false;
      }
    }

    // Fallback: Client Storage mode (GitHub Pages)
    if (!handled) {
      const users = getLocalUsers();
      if (users.some(u => u.email.toLowerCase() === email)) {
        showToast("This email is already registered. Please sign in!", true);
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<span>Complete Registration</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>`;
        return;
      }
      const newUser = {
        id: users.length + 1,
        name: name,
        email: email,
        password: password,
        house_key: houseOption.value,
        houseKey: houseOption.value,
        question: getLocalQuestion(),
        registered_at: new Date().toISOString()
      };
      users.push(newUser);
      saveLocalUsers(users);
      currentUser = newUser;
    }

    localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(currentUser));
    document.getElementById("registerForm").reset();

    showToast(`Registered successfully! Welcome to House ${HOUSES[currentUser.houseKey]?.name || ''}!`);
    checkPostgresStatus();
    renderDashboard();
  } catch (err) {
    console.error("Register error:", err);
    showToast("An error occurred during registration. Please try again.", true);
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = `<span>Complete Registration</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>`;
  }
}

// --- Login Logic ---
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
    let handled = false;
    if (isPostgresConnected) {
      try {
        const res = await fetch(`${API_BASE}/api/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          currentUser = data.user;
          handled = true;
        } else {
          showToast(data.message || "Login failed", true);
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = `<span>Log In to Realm</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>`;
          return;
        }
      } catch (err) {
        handled = false;
      }
    }

    // Fallback: Client Storage mode (GitHub Pages)
    if (!handled) {
      const users = getLocalUsers();
      const matched = users.find(u => u.email.toLowerCase() === email);
      if (!matched) {
        showToast("No account found with this email. Please register!", true);
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<span>Log In to Realm</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>`;
        return;
      }
      if (matched.password !== password) {
        showToast("Incorrect password. Please try again.", true);
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<span>Log In to Realm</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>`;
        return;
      }
      currentUser = {
        id: matched.id,
        name: matched.name,
        email: matched.email,
        houseKey: matched.houseKey || matched.house_key,
        registeredAt: matched.registered_at
      };
    }

    localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(currentUser));
    document.getElementById("loginForm").reset();

    showToast(`Welcome back, ${currentUser.name}!`);
    renderDashboard();
  } catch (err) {
    console.error("Login error:", err);
    showToast("Authentication failed. Please try again.", true);
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

  if (isPostgresConnected) {
    try {
      const res = await fetch(`${API_BASE}/api/hand-raises`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.success) {
        updateRaiseButton(data.raises[0]);
        updateFirstRaiser(data.raises[0]);
        return;
      }
    } catch (err) {
      // fallback below
    }
  }

  // Client Storage Fallback (GitHub Pages mode)
  const currentQ = getLocalQuestion();
  const raises = getLocalRaises().filter(r => (r.question || "Question 1") === currentQ);
  updateRaiseButton(raises[0]);
  updateFirstRaiser(raises[0]);
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

  if (isPostgresConnected) {
    try {
      const res = await fetch(`${API_BASE}/api/hand-raises`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        updateRaiseButton(data.raise);
        await loadHandRaiseStatus();
        showToast("Your hand is raised. Faculty can see your place in line.");
        return;
      }
    } catch (err) {
      // Fallback below
    }
  }

  // Client Storage Fallback (GitHub Pages mode)
  try {
    const currentQ = getLocalQuestion();
    const allRaises = getLocalRaises();
    const existing = allRaises.find(r => (r.question || "Question 1") === currentQ);
    if (existing) {
      showToast("A hand has already been raised for this question.", true);
      updateRaiseButton(existing);
      return;
    }
    const newRaise = {
      id: Date.now(),
      user_id: currentUser.id,
      name: currentUser.name,
      house_key: currentUser.houseKey,
      question: currentQ,
      raised_at: new Date().toISOString()
    };
    allRaises.push(newRaise);
    saveLocalRaises(allRaises);
    updateRaiseButton(newRaise);
    updateFirstRaiser(newRaise);
    showToast("Your hand is raised. Faculty can see your place in line.");
  } catch (err) {
    button.disabled = false;
    showToast(err.message, true);
  }
}

// Cross-tab auto-sync for GitHub Pages / client storage
window.addEventListener("storage", () => {
  if (currentUser) {
    loadHandRaiseStatus();
  }
});

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
