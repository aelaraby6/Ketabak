// footer.js
// Footer injection script using global variables and responsive styles

document.addEventListener("DOMContentLoaded", () => {
  const isPagesFolder = window.location.pathname.includes("/pages/");
  const rootPath = isPagesFolder ? "../" : "";
  const pagesPath = isPagesFolder ? "" : "pages/";

  const footerHTML = `
    <footer class="footer" role="contentinfo">
      <div class="footer-container">
        <div class="footer-section brand-section">
          <h3 class="footer-logo">ketabak</h3>
          <p class="footer-description">
            Your gateway to a world of knowledge and imagination. Discover, read, and transform your life one book at a time.
          </p>
          <div class="social-links" aria-label="Social Media Links">
            <a href="#" aria-label="Visit our Facebook page"><i class="fab fa-facebook-f" aria-hidden="true"></i></a>
            <a href="#" aria-label="Visit our Twitter page"><i class="fab fa-twitter" aria-hidden="true"></i></a>
            <a href="#" aria-label="Visit our Instagram page"><i class="fab fa-instagram" aria-hidden="true"></i></a>
            <a href="#" aria-label="Visit our LinkedIn page"><i class="fab fa-linkedin-in" aria-hidden="true"></i></a>
          </div>
        </div>

        <nav class="footer-section" aria-label="Quick Links">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="${rootPath}${pagesPath}books.html">All Books</a></li>
            <li><a href="${rootPath}${pagesPath}categories.html">Categories</a></li>
            <li><a href="${rootPath}${pagesPath}authors.html">Authors</a></li>
            <li><a href="${rootPath}${pagesPath}about.html">About Us</a></li>
          </ul>
        </nav>

        <nav class="footer-section" aria-label="Support Links">
          <h4>Support</h4>
          <ul>
            <li><a href="#">Help Center</a></li>
            <li><a href="#">FAQs</a></li>
            <li><a href="#">Shipping Info</a></li>
            <li><a href="#">Returns Policy</a></li>
          </ul>
        </nav>

        <div class="footer-section contact-section">
          <h4>Contact Info</h4>
          <address class="contact-info" style="font-style: normal;">
            <p><i class="fas fa-map-marker-alt" aria-hidden="true"></i> Cairo, Egypt</p>
            <p><i class="fas fa-phone" aria-hidden="true"></i> +20 123 456 7890</p>
            <p><i class="fas fa-envelope" aria-hidden="true"></i> info@ketabak.com </p>
          </address>
        </div>
      </div>

      <div class="footer-bottom">
        <p>&copy; 2024 Ketabak. All rights reserved.</p>
        <div class="footer-links" aria-label="Legal Links">
          <a href="#">Privacy Policy</a>
          <span aria-hidden="true">|</span>
          <a href="#">Terms of Service</a>
          <span aria-hidden="true">|</span>
          <a href="#">Cookie Policy</a>
        </div>
      </div>
    </footer>
  `;

  document.body.insertAdjacentHTML("beforeend", footerHTML);
});
