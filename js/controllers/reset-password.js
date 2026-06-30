// reset-password.js
// Reset Password Controller utilizing Supabase Auth

import { AuthService } from "../services/auth.js";

const resetPasswordForm = document.getElementById("resetPasswordForm");

// Check if user has redirect hash or session
async function checkAccess() {
  try {
    const session = await AuthService.getSession();
    if (!session) {
      window.showNotification("Access denied. No active recovery session found.", "error");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1500);
    }
  } catch (error) {
    console.error("Session check error on reset:", error);
  }
}

resetPasswordForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (newPassword !== confirmPassword) {
    window.showNotification("Passwords do not match!", "warning");
    return;
  }

  // Disable button and show loading state
  const submitBtn = resetPasswordForm.querySelector("button[type='submit']");
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "Updating Password...";

  try {
    await AuthService.updatePassword(newPassword);
    
    window.showNotification("Password updated successfully! Redirecting to login...", "success");
    
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1500);

  } catch (error) {
    console.error("Password update error:", error);
    window.showNotification(error.message || "Failed to update password", "error");
    
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});

// Run access check on load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", checkAccess);
} else {
  checkAccess();
}
