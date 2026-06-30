// signup.js
// SignUp Controller using Supabase Auth Service

import { AuthService } from "./services/auth.js";

const signupForm = document.getElementById("signupForm");

signupForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const firstName = document.getElementById("firstname").value.trim();
  const lastName = document.getElementById("lastname").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const terms = document.getElementById("terms").checked;

  if (!terms) {
    window.showNotification("Please agree to the Terms and Conditions", "warning");
    return;
  }

  // Disable button and show loading state
  const submitBtn = signupForm.querySelector("button[type='submit']");
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "Creating Account...";

  try {
    const data = await AuthService.signUp(email, password, firstName, lastName);
    
    window.showNotification("Registration Successful! Please sign in.", "success");
    
    // Redirect after brief delay to allow toast to show
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1500);

  } catch (error) {
    console.error("SignUp error:", error);
    window.showNotification(error.message || "An error occurred during sign up", "error");
    
    // Restore button state
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});
