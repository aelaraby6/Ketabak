// login.js
// Login Controller using Supabase Auth and Database Services

import { AuthService } from "./services/auth.js";
import { DbService } from "./services/db.js";

const loginForm = document.getElementById("loginForm");
const forgotPasswordLink = document.getElementById("forgotPasswordLink");

loginForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  // Disable button and show loading state
  const submitBtn = loginForm.querySelector("button[type='submit']");
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "Signing In...";

  try {
    const data = await AuthService.signIn(email, password);
    const user = data.user;

    window.showNotification(`Welcome back, ${user.user_metadata?.first_name || user.email}!`, "success");

    // Sync Local Wishlist & Cart to Supabase DB on Login
    const localWishlist = JSON.parse(localStorage.getItem("ketabak_wishlist")) || [];
    const localCart = JSON.parse(localStorage.getItem("ketabak_cart")) || [];

    if (localWishlist.length > 0) {
      await DbService.syncWishlist(user.id, localWishlist);
      // Clear temporary local wishlist
      localStorage.removeItem("ketabak_wishlist");
    }

    if (localCart.length > 0) {
      await DbService.syncCart(user.id, localCart);
      // Clear temporary local cart
      localStorage.removeItem("ketabak_cart");
    }

    // Load active cart/wishlist items from Supabase DB to localStorage cache
    const dbWishlist = await DbService.getWishlist(user.id);
    const dbWishlistIds = dbWishlist.map(b => b.id);
    localStorage.setItem("ketabak_wishlist", JSON.stringify(dbWishlistIds));

    const dbCart = await DbService.getCart(user.id);
    const dbCartItems = dbCart.map(item => ({ id: item.id, quantity: item.quantity }));
    localStorage.setItem("ketabak_cart", JSON.stringify(dbCartItems));

    // Redirect to profile dashboard
    setTimeout(() => {
      window.location.href = "profile.html";
    }, 1200);

  } catch (error) {
    console.error("Login error:", error);
    window.showNotification(error.message || "Invalid Email or Password", "error");
    
    // Restore button state
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});

// Forgot Password Handler
forgotPasswordLink.addEventListener("click", async function (e) {
  e.preventDefault();

  const email = prompt("Enter your email address to receive a password reset link:");
  if (!email) return;

  try {
    await AuthService.requestPasswordReset(email.trim());
    window.showNotification("Password reset email sent! Please check your inbox.", "success");
  } catch (error) {
    console.error("Password reset error:", error);
    window.showNotification(error.message || "Failed to send password reset email", "error");
  }
});
