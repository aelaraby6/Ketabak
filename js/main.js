// main.js
// Home Page Bestseller Carousel and dynamic database integration

import { DbService } from "./services/db.js";

// Carousel scroll buttons logic
function initCarouselScroll() {
  const carousel = document.getElementById("carousel");
  const leftArrow = document.querySelector(".arrow.left");
  const rightArrow = document.querySelector(".arrow.right");

  if (carousel && leftArrow && rightArrow) {
    leftArrow.addEventListener("click", () => {
      carousel.scrollBy({ left: -280, behavior: "smooth" });
    });

    rightArrow.addEventListener("click", () => {
      carousel.scrollBy({ left: 280, behavior: "smooth" });
    });
  }
}

// Generate stars HTML for ratings
function generateStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  let starsHTML = "";

  for (let i = 0; i < fullStars; i++) {
    starsHTML += '<i class="fas fa-star"></i>';
  }
  if (hasHalfStar) {
    starsHTML += '<i class="fas fa-star-half-alt"></i>';
  }
  const emptyStars = 5 - Math.ceil(rating);
  for (let i = 0; i < emptyStars; i++) {
    starsHTML += '<i class="far fa-star"></i>';
  }
  return starsHTML;
}

// Create a carousel book card
function createCarouselCard(book) {
  // Use relative image path resolved from root
  const imagePath = book.image.replace("../", "");
  
  return `
    <article class="modern-card card" onclick="window.location.href='pages/book.html?id=${book.id}'">
      <div class="book-image-container">
        <img src="${imagePath}" alt="Cover of ${book.title}" loading="lazy" />
        <div class="book-overlay">
          <button class="quick-view-btn" aria-label="View details for ${book.title}">
            <i class="fas fa-eye"></i> Quick View
          </button>
        </div>
      </div>
      <div class="book-info">
        <div class="category-tag">${book.category}</div>
        <h3 class="book-title" style="font-size: 15px; height: 40px; margin-bottom: 2px;">${book.title}</h3>
        <p class="book-author" style="font-size: 12px; margin-bottom: 8px;">by ${book.authors}</p>
        
        <div class="rating-container" style="margin-bottom: 8px;">
          <div class="stars" style="color: #ffb800; font-size: 10px;">${generateStars(book.rating)}</div>
          <span class="rating-text" style="font-size: 11px;">${book.rating}</span>
        </div>
        
        <div class="price-container" style="margin-bottom: 0;">
          <span class="current-price" style="font-size: 16px;">${book.price.toString().startsWith("$") ? book.price : "$" + parseFloat(book.price).toFixed(2)}</span>
        </div>
      </div>
    </article>
  `;
}

// Load and display Bestseller Books
async function loadBestsellers() {
  const carousel = document.getElementById("carousel");
  if (!carousel) return;

  // Show loading skeletons first
  carousel.innerHTML = Array(6).fill().map(() => `
    <div class="modern-card card skeleton" style="min-width: 250px; max-width: 250px; flex-shrink: 0; height: 380px; border-radius: var(--radius-lg);">
      <div class="skeleton-image" style="height: 240px;"></div>
      <div class="book-info" style="padding: 16px;">
        <div class="skeleton-title" style="width: 40%;"></div>
        <div class="skeleton-title" style="width: 80%; height: 18px;"></div>
        <div class="skeleton-author" style="width: 60%; height: 12px;"></div>
      </div>
    </div>
  `).join("");

  let books = [];

  try {
    // 1. Try to fetch from Supabase
    books = await DbService.getBooks({ limit: 12 });
    if (!books || books.length === 0) {
      throw new Error("Supabase catalog is empty");
    }
  } catch (supabaseError) {
    console.error("Supabase fetch failed:", supabaseError);
    carousel.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Failed to load bestsellers</h3>
        <p>Please refresh the page or try again later.</p>
      </div>
    `;
    return;
  }

  // Cache reference books list for the offline simulator
  if (books && books.length > 0) {
    localStorage.setItem("ketabak_offline_books_ref", JSON.stringify(books));
  }

  // Filter for top rated books as bestsellers
  const bestsellers = books
    .filter(book => parseFloat(book.rating) >= 4.4)
    .slice(0, 10);

  if (bestsellers.length === 0) {
    carousel.innerHTML = '<div class="empty-cart-msg">No bestseller books found.</div>';
    return;
  }

  // Render cards
  carousel.innerHTML = bestsellers.map(book => createCarouselCard(book)).join("");
}

// Rotate background images of hero section
function initHeroBackgroundSlider() {
  const landing = document.querySelector(".landing-page");
  if (!landing) return;

  const images = [
    "images/landing-1.jpg",
    "images/landing-2.jpg",
    "images/landing-3.jpg",
    "images/landing-4.jpg"
  ];
  let currentIndex = 0;

  setInterval(() => {
    currentIndex = (currentIndex + 1) % images.length;
    landing.style.backgroundImage = `linear-gradient(rgba(10, 14, 30, 0.45), rgba(10, 14, 30, 0.55)), url("${images[currentIndex]}")`;
  }, 5000);
}

// Initialize on page load
function initHome() {
  initCarouselScroll();
  loadBestsellers();
  initHeroBackgroundSlider();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initHome);
} else {
  initHome();
}
