// theme.js
// Theme System for Light/Dark Mode

(function () {
  // Determine initial theme
  const savedTheme = localStorage.getItem("ketabak_theme");
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  
  const initialTheme = savedTheme || (systemPrefersDark ? "dark" : "light");
  
  // Apply theme immediately to document element to avoid flicker
  document.documentElement.setAttribute("data-theme", initialTheme);

  // Expose theme functions globally
  window.ThemeSystem = {
    current: initialTheme,
    
    toggle: function () {
      const nextTheme = this.current === "dark" ? "light" : "dark";
      this.set(nextTheme);
      return nextTheme;
    },
    
    set: function (theme) {
      this.current = theme;
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("ketabak_theme", theme);
      
      // Dispatch custom event for pages to respond to theme changes
      window.dispatchEvent(new CustomEvent("themechange", { detail: theme }));
      
      this.updateToggleButton();
    },
    
    updateToggleButton: function () {
      const toggleBtns = document.querySelectorAll(".theme-toggle-btn");
      toggleBtns.forEach(btn => {
        const icon = btn.querySelector("i");
        if (icon) {
          if (this.current === "dark") {
            icon.className = "fas fa-sun";
            btn.setAttribute("aria-label", "Switch to Light Mode");
          } else {
            icon.className = "fas fa-moon";
            btn.setAttribute("aria-label", "Switch to Dark Mode");
          }
        }
      });
    }
  };

  // Listen to system preference changes if no user choice has been saved
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (!localStorage.getItem("ketabak_theme")) {
      window.ThemeSystem.set(e.matches ? "dark" : "light");
    }
  });

  // Setup theme button update on page load
  document.addEventListener("DOMContentLoaded", () => {
    window.ThemeSystem.updateToggleButton();
  });
})();
