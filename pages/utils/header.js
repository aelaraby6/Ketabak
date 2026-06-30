// header.js
// Header injection script using Supabase Auth and modular ES6 pattern

import { supabase } from "../../js/supabase-config.js";

const isPagesFolder = window.location.pathname.includes("/pages/");
const rootPath = isPagesFolder ? "../" : "";
const pagesPath = isPagesFolder ? "" : "pages/";

// Calculate cart item count
function updateHeaderCartCount() {
  const cart = JSON.parse(localStorage.getItem("ketabak_cart")) || [];
  const cartTotalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartCountEl = document.querySelector(".cart-count");
  if (cartCountEl) {
    cartCountEl.textContent = cartTotalItems;
  }
}

// Generate Auth Area HTML based on User Session
function renderAuthArea(user) {
  const authArea = document.getElementById("auth-area");
  const mobileAuthArea = document.getElementById("mobile-auth-links");
  
  if (!authArea) return;

  if (user) {
    const firstName = user.user_metadata?.first_name || user.email.split("@")[0];
    
    // Desktop layout
    authArea.innerHTML = `
      <div class="user-menu">
        <button class="profile-btn" onclick="window.location.href='${pagesPath}profile.html'">
          <i class="fas fa-user-circle"></i>
          <span>${firstName}</span>
        </button>
        <button class="logout-btn" id="headerLogoutBtn">
          <i class="fas fa-sign-out-alt"></i>
          Logout
        </button>
      </div>
    `;

    // Mobile layout
    if (mobileAuthArea) {
      mobileAuthArea.innerHTML = `
        <button onclick="window.location.href='${pagesPath}profile.html'" class="mobile-profile-btn">
          <i class="fas fa-user-circle"></i> ${firstName}
        </button>
        <button id="mobileLogoutBtn" class="mobile-logout-btn">
          <i class="fas fa-sign-out-alt"></i> Logout
        </button>
      `;
    }
  } else {
    // Desktop layout
    authArea.innerHTML = `
      <a href="${pagesPath}signup.html" class="signup-btn">Sign Up</a>
      <a href="${pagesPath}login.html" class="login-btn">Login</a>
    `;

    // Mobile layout
    if (mobileAuthArea) {
      mobileAuthArea.innerHTML = `
        <a href="${pagesPath}signup.html" class="signup-btn">Sign Up</a>
        <a href="${pagesPath}login.html" class="login-btn">Login</a>
      `;
    }
  }

  // Bind logout events
  const logoutBtn = document.getElementById("headerLogoutBtn");
  const mobileLogoutBtn = document.getElementById("mobileLogoutBtn");
  
  const handleLogoutClick = async () => {
    const confirmLogout = confirm("Are you sure you want to logout?");
    if (confirmLogout) {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        localStorage.removeItem("ketabak_cart");
        localStorage.removeItem("ketabak_wishlist");
        window.showNotification("Logged out successfully", "success");
        setTimeout(() => {
          window.location.href = `${rootPath}index.html`;
        }, 800);
      } catch (err) {
        window.showNotification(err.message, "error");
      }
    }
  };

  if (logoutBtn) logoutBtn.addEventListener("click", handleLogoutClick);
  if (mobileLogoutBtn) mobileLogoutBtn.addEventListener("click", handleLogoutClick);
}

// Check session and update header state
async function initHeaderAuth() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    renderAuthArea(session ? session.user : null);
    
    // Subscribe to auth state changes to update header dynamically
    supabase.auth.onAuthStateChange((event, session) => {
      renderAuthArea(session ? session.user : null);
    });
  } catch (error) {
    console.error("Error getting session for header:", error);
    renderAuthArea(null);
  }
}

// HTML Structure of the Header
const headerHTML = `
  <header class="header" role="banner">
    <div class="header-container">
      <a href="${rootPath}index.html" class="logo" aria-label="Ketabak Home">ketabak</a>

      <nav aria-label="Main Navigation" id="main-nav">
        <ul class="nav-links" id="nav-links">
          <li><a href="${pagesPath}books.html">Books</a></li>
          <li><a href="${pagesPath}categories.html">Categories</a></li>
          <li><a href="${pagesPath}authors.html">Authors</a></li>
          <li><a href="${pagesPath}about.html">About Us</a></li>
          <li class="mobile-auth-links" id="mobile-auth-links" style="display:none;"></li>
        </ul>
      </nav>

      <div class="header-actions" aria-label="User Actions">
        <button class="theme-toggle-btn" id="theme-toggle-btn" aria-label="Toggle Theme">
          <i class="fas fa-moon" aria-hidden="true"></i>
        </button>

        <div class="cart-icon" onclick="window.location.href='${pagesPath}cart.html'" style="cursor:pointer;" tabindex="0" aria-label="Shopping Cart">
          <i class="fas fa-shopping-cart" aria-hidden="true"></i>
          <span class="cart-count">0</span>
        </div>

        <div id="auth-area" class="auth-area">
          <div class="header-skeleton" style="width: 140px; height: 36px; border-radius: var(--radius-full);"></div>
        </div>

        <button class="hamburger-btn" id="hamburger-btn" aria-label="Toggle Menu" aria-expanded="false">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </div>
  </header>
`;

// Insert header markup
document.body.insertAdjacentHTML("afterbegin", headerHTML);

// Theme toggle binding
const toggleBtn = document.getElementById("theme-toggle-btn");
if (toggleBtn) {
  toggleBtn.addEventListener("click", () => {
    if (window.ThemeSystem) {
      window.ThemeSystem.toggle();
    }
  });
}

// Mobile Hamburger Toggle
const hamburgerBtn = document.getElementById("hamburger-btn");
const navLinks = document.getElementById("nav-links");

if (hamburgerBtn && navLinks) {
  hamburgerBtn.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    hamburgerBtn.classList.toggle("open", isOpen);
    hamburgerBtn.setAttribute("aria-expanded", isOpen);
  });

  // Close menu on link click
  navLinks.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      hamburgerBtn.classList.remove("open");
      hamburgerBtn.setAttribute("aria-expanded", false);
    });
  });

  // Close menu on outside click
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".header")) {
      navLinks.classList.remove("open");
      hamburgerBtn.classList.remove("open");
      hamburgerBtn.setAttribute("aria-expanded", false);
    }
  });
}

// Initialize header count and auth check
document.addEventListener("DOMContentLoaded", () => {
  updateHeaderCartCount();
  initHeaderAuth();
  if (window.ThemeSystem) {
    window.ThemeSystem.updateToggleButton();
  }
});

// Watch for storage events to update cart badge across tabs
window.addEventListener("storage", (e) => {
  if (e.key === "ketabak_cart") {
    updateHeaderCartCount();
  }
});

// Export helper to force-update cart count from other scripts
window.updateHeaderCartCount = updateHeaderCartCount;