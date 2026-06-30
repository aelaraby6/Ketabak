// toast.js
// Global Toast Notifications System

(function () {
  window.showNotification = function (message, type = "info") {
    // 1. Ensure toast container exists
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    // 2. Create the toast element
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.setAttribute("role", "alert");
    
    // Choose font-awesome icon based on type
    let iconClass = "fa-info-circle";
    switch (type) {
      case "success":
        iconClass = "fa-check-circle";
        break;
      case "error":
        iconClass = "fa-exclamation-circle";
        break;
      case "warning":
        iconClass = "fa-exclamation-triangle";
        break;
      case "info":
      default:
        iconClass = "fa-info-circle";
        break;
    }

    toast.innerHTML = `
      <i class="fas ${iconClass}" aria-hidden="true"></i>
      <div class="toast-message">${message}</div>
    `;

    // 3. Add to DOM and trigger transition
    container.appendChild(toast);
    
    // Trigger transition
    setTimeout(() => {
      toast.classList.add("show");
    }, 20);

    // 4. Auto dismiss
    setTimeout(() => {
      toast.classList.remove("show");
      // Remove element after transition completes
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3500);
  };
})();
