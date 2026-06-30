import { supabase } from "../supabase-config.js";
import { DbService } from "../services/db.js";

let booksData = [];
let isOfflineMode = false;
const allBooksContainer = document.querySelector(".all-books");

// Render stars utility
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

// Generate single card HTML
function createBookCard(book, isInWishlist) {
  const isLowStock = book.stock < 10;
  const isOutOfStock = book.stock <= 0;
  const discountPercentage = 15; // fixed elegant discount
  const originalPriceVal = (parseFloat(book.price) * 1.15).toFixed(2);
  
  return `
    <article class="modern-card" data-category="${book.category}" data-price="${book.price}" data-rating="${book.rating}">
      <div class="card-header">
        ${
          isOutOfStock
            ? '<div class="stock-badge low-stock" style="background:#777;color:#fff;">Out of Stock</div>'
            : isLowStock
            ? '<div class="stock-badge low-stock">Low Stock!</div>'
            : '<div class="stock-badge in-stock">In Stock</div>'
        }
        <div class="discount-badge">-${discountPercentage}%</div>
      </div>
      
      <div class="book-image-container">
        <img src="../${book.image.replace("../", "")}" alt="Cover of ${book.title}" loading="lazy" />
        <div class="book-overlay">
          <button class="quick-view-btn" onclick="viewBookDetails(${book.id})" aria-label="View details for ${book.title}">
            <i class="fas fa-eye" aria-hidden="true"></i> View Details
          </button>
        </div>
      </div>
      
      <div class="book-info">
        <div class="category-tag">${book.category}</div>
        <h3 class="book-title" id="book-title-${book.id}">${book.title}</h3>
        <p class="book-author">by ${book.authors}</p>
        
        <div class="rating-container">
          <div class="stars">${generateStars(book.rating)}</div>
          <span class="rating-text">${book.rating}</span>
        </div>
        
        <div class="book-meta">
          <span>${book.publisherYear}</span>
          <span>•</span>
          <span>${book.publisher.split(",")[0]}</span>
        </div>
        
        <div class="price-container">
          <span class="original-price">$${originalPriceVal}</span>
          <span class="current-price">$${parseFloat(book.price).toFixed(2)}</span>
        </div>
        
        <div class="stock-info">
          <span class="stock-count ${isLowStock ? "low" : ""}">${book.stock} copies available</span>
        </div>
        
        <div class="card-actions">
          <button class="add-to-cart-btn" onclick="addToCart(${book.id})" ${isOutOfStock ? "disabled" : ""} aria-label="Add ${book.title} to cart">
            <i class="fas fa-shopping-cart" aria-hidden="true"></i> Add to Cart
          </button>
          <button class="wishlist-btn" onclick="toggleWishlist(${book.id})" aria-label="Toggle wishlist for ${book.title}">
            <i class="${isInWishlist ? "fas fa-heart" : "far fa-heart"}" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </article>
  `;
}

// Display books or skeletons
function displayBooks(books) {
  // Remove existing cards, keep title and filters
  const existingCards = allBooksContainer.querySelectorAll(
    ".modern-card, .no-results, .error-message"
  );
  existingCards.forEach((card) => card.remove());

  if (books.length === 0) {
    allBooksContainer.insertAdjacentHTML(
      "beforeend",
      `
      <div class="no-results">
        <i class="fas fa-search" aria-hidden="true"></i>
        <h3>No books found</h3>
        <p>Try adjusting your search query or filters.</p>
      </div>
    `
    );
    return;
  }

  const wishlist = JSON.parse(localStorage.getItem("ketabak_wishlist")) || [];

  books.forEach((book) => {
    const isInWishlist = wishlist.includes(book.id);
    allBooksContainer.insertAdjacentHTML("beforeend", createBookCard(book, isInWishlist));
  });
}

// Global actions exposed on window for card events
window.viewBookDetails = function (bookId) {
  window.location.href = `book.html?id=${bookId}`;
};

window.toggleWishlist = async function (bookId) {
  const id = parseInt(bookId);
  const btn = event.currentTarget;
  const icon = btn.querySelector("i");
  
  let wishlist = JSON.parse(localStorage.getItem("ketabak_wishlist")) || [];
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const isAdding = icon.classList.contains("far");
    
    if (isAdding) {
      icon.className = "fas fa-heart";
      if (!wishlist.includes(id)) wishlist.push(id);
      
      if (session) {
        await DbService.addToWishlist(session.user.id, id);
      }
      window.showNotification("Added to wishlist!", "success");
    } else {
      icon.className = "far fa-heart";
      wishlist = wishlist.filter(item => item !== id);
      
      if (session) {
        await DbService.removeFromWishlist(session.user.id, id);
      }
      window.showNotification("Removed from wishlist", "info");
    }
    
    localStorage.setItem("ketabak_wishlist", JSON.stringify(wishlist));
  } catch (error) {
    console.error("Wishlist toggle error:", error);
    window.showNotification("Failed to update wishlist", "error");
  }
};

// Filter execution (fetches dynamically from DB or locally)
let filterTimeout;
async function performFiltering() {
  const search = document.getElementById("searchInput").value.trim();
  const category = document.getElementById("categoryFilter").value;
  const priceRange = document.getElementById("priceFilter").value;
  const rating = document.getElementById("ratingFilter").value;

  if (isOfflineMode) {
    // Local offline filtering fallback
    let filtered = booksData;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(b => 
        b.title.toLowerCase().includes(q) || 
        b.authors.toLowerCase().includes(q)
      );
    }
    if (category) {
      filtered = filtered.filter(b => b.category === category);
    }
    if (rating) {
      filtered = filtered.filter(b => b.rating >= parseFloat(rating));
    }
    if (priceRange) {
      const [min, max] = priceRange.split("-").map(Number);
      filtered = filtered.filter(b => b.price >= min && b.price <= (max || Infinity));
    }
    displayBooks(filtered);
    return;
  }

  try {
    const filtered = await DbService.getBooks({ search, category, priceRange, rating });
    displayBooks(filtered);
  } catch (error) {
    console.error("Error filtering books:", error);
    window.showNotification("Failed to filter books", "error");
  }
}

// Debounced filtering for text inputs
function debouncedFilter() {
  clearTimeout(filterTimeout);
  filterTimeout = setTimeout(performFiltering, 300);
}

// Populate Category Filter dropdown
function populateCategories(books) {
  const select = document.getElementById("categoryFilter");
  if (!select) return;
  
  // Clear extra options, keep the first "All Categories"
  select.innerHTML = '<option value="">All Categories</option>';
  
  const categories = [...new Set(books.map(b => b.category))].sort();
  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });
}

// Clear all filters
function clearFilters() {
  document.getElementById("searchInput").value = "";
  document.getElementById("categoryFilter").value = "";
  document.getElementById("priceFilter").value = "";
  document.getElementById("ratingFilter").value = "";
  performFiltering();
}

// Render Header Filter DOM
function renderFilterBar() {
  let titleEl = allBooksContainer.querySelector(".title");
  if (!titleEl) {
    titleEl = document.createElement("h1");
    titleEl.className = "title";
    titleEl.textContent = "All Books";
    allBooksContainer.appendChild(titleEl);
  }

  const filterContainer = document.createElement("div");
  filterContainer.className = "filter-container";
  filterContainer.innerHTML = `
    <div class="filter-controls">
      <div class="search-filter">
        <input type="text" id="searchInput" placeholder="Search books by title, author..." class="search-input" />
        <i class="fas fa-search search-icon"></i>
      </div>
      
      <select id="categoryFilter" class="filter-select">
        <option value="">All Categories</option>
      </select>
      
      <select id="priceFilter" class="filter-select">
        <option value="">All Prices</option>
        <option value="0-15">$0 - $15</option>
        <option value="15-30">$15 - $30</option>
        <option value="30-50">$30 - $50</option>
        <option value="50-100">$50 - $100</option>
      </select>
      
      <select id="ratingFilter" class="filter-select">
        <option value="">All Ratings</option>
        <option value="4.5">4.5+ Stars</option>
        <option value="4.0">4.0+ Stars</option>
        <option value="3.0">3.0+ Stars</option>
      </select>
      
      <button id="clearFiltersBtn" class="clear-btn">
        <i class="fas fa-times"></i> Reset
      </button>
    </div>
  `;

  titleEl.insertAdjacentElement("afterend", filterContainer);
}

// Initialise catalog page
async function initCatalog() {
  renderFilterBar();

  // Attach event listeners
  document.getElementById("searchInput").addEventListener("input", debouncedFilter);
  document.getElementById("categoryFilter").addEventListener("change", performFiltering);
  document.getElementById("priceFilter").addEventListener("change", performFiltering);
  document.getElementById("ratingFilter").addEventListener("change", performFiltering);
  document.getElementById("clearFiltersBtn").addEventListener("click", clearFilters);

  // Render skeletons first
  allBooksContainer.insertAdjacentHTML(
    "beforeend",
    Array(8).fill().map(() => `
      <div class="modern-card skeleton">
        <div class="skeleton-image"></div>
        <div class="book-info" style="padding:16px;">
          <div class="skeleton-title" style="width:40%;"></div>
          <div class="skeleton-title" style="width:80%; height:18px;"></div>
          <div class="skeleton-author" style="width:60%; height:12px;"></div>
          <div class="skeleton-price" style="height: 18px; width: 35%;"></div>
          <div class="skeleton-button"></div>
        </div>
      </div>
    `).join("")
  );

  try {
    // Fetch all books for initial render and category grouping
    booksData = await DbService.getBooks();
    if (!booksData || booksData.length === 0) {
      throw new Error("Supabase catalog is empty");
    }
    populateCategories(booksData);
    localStorage.setItem("ketabak_offline_books_ref", JSON.stringify(booksData));
    
    // Parse URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    if (categoryParam) {
      document.getElementById("categoryFilter").value = categoryParam;
      await performFiltering();
    } else {
      displayBooks(booksData);
    }
  } catch (error) {
    console.error("Initial load error:", error);
    allBooksContainer.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Failed to load catalog</h3>
        <p>Please check your network and try again.</p>
      </div>
    `;
  }
}

// Run initialisation
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCatalog);
} else {
  initCatalog();
}
