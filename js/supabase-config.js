
let supabaseInstance = null;

async function loadDynamicEnvJs() {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "/env.js";
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

async function loadDynamicEnvFile() {
  try {
    const response = await fetch("/.env");
    if (!response.ok) return;
    const text = await response.text();
    const env = {};
    text.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const index = trimmed.indexOf("=");
      if (index === -1) return;
      const key = trimmed.substring(0, index).trim();
      const val = trimmed.substring(index + 1).trim().replace(/^["']|["']$/g, "");
      env[key] = val;
    });
    window.ENV = { ...window.ENV, ...env };
  } catch (e) {
    // Silent catch if server blocks dotfiles or returns 401/404
  }
}

async function initSupabase() {
  await loadDynamicEnvJs();
  await loadDynamicEnvFile();

  let SUPABASE_URL = "";
  let SUPABASE_ANON_KEY = "";

  try {
    if (typeof import.meta !== "undefined" && import.meta.env) {
      SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
      SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
    }
  } catch (e) {
    // Fallback if import.meta is not supported by the environment
  }

  if (!SUPABASE_URL) {
    SUPABASE_URL = window.ENV?.SUPABASE_URL || window.ENV?.VITE_SUPABASE_URL || "";
  }
  if (!SUPABASE_ANON_KEY) {
    SUPABASE_ANON_KEY = window.ENV?.SUPABASE_ANON_KEY || window.ENV?.VITE_SUPABASE_ANON_KEY || "";
  }

  const isValidConfig = SUPABASE_URL && 
                        SUPABASE_ANON_KEY && 
                        SUPABASE_ANON_KEY !== "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5c3Z2bHF5Ymtxcm92a2RoZ2ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDg5NTAsImV4cCI6MjA5MTYyNDk1MH0.9E3BvuI-qdXFexWhegvJLREwR1gdfPwmk7R89wv_WGM" && 
                        SUPABASE_URL !== "https://gysvvlqybkqrovkdhgji.supabase.co" &&
                        SUPABASE_URL !== "";

  if (isValidConfig) {
    if (window.supabase) {
      try {
        supabaseInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      } catch (e) {
        console.error("Error creating Supabase client instance:", e);
      }
    } else {
      console.error("Supabase SDK is not loaded in the window. Ensure the CDN script is included.");
    }
  }

  if (!supabaseInstance) {
    console.warn("Supabase credentials missing or invalid. Running in fully-functional offline simulator mode.");
    setupOfflineSimulator();
  }
}


function setupOfflineSimulator() {
  const getReferenceBooks = () => {
    const cached = localStorage.getItem("ketabak_offline_books_ref");
    if (cached) return JSON.parse(cached);
    return [];
  };

  const mockQueries = {
    auth: {
      getSession: async () => {
        const token = localStorage.getItem("sb-mock-auth-token");
        return { data: { session: token ? JSON.parse(token) : null }, error: null };
      },
      onAuthStateChange: (callback) => {
        const token = localStorage.getItem("sb-mock-auth-token");
        const session = token ? JSON.parse(token) : null;
        setTimeout(() => callback("SIGNED_IN", session), 0);
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      signUp: async (email, password, options) => {
        const mockUser = {
          id: "mock-uid-" + Math.random().toString(36).substring(2, 9),
          email: email,
          user_metadata: {
            first_name: options?.options?.data?.first_name || "John",
            last_name: options?.options?.data?.last_name || "Doe"
          }
        };
        const mockSession = { access_token: "mock-access-token", user: mockUser };
        localStorage.setItem("sb-mock-auth-token", JSON.stringify(mockSession));
        
        const mockProfiles = JSON.parse(localStorage.getItem("ketabak_mock_profiles")) || {};
        mockProfiles[mockUser.id] = {
          id: mockUser.id,
          first_name: mockUser.user_metadata.first_name,
          last_name: mockUser.user_metadata.last_name,
          email: email
        };
        localStorage.setItem("ketabak_mock_profiles", JSON.stringify(mockProfiles));

        return { data: { user: mockUser, session: mockSession }, error: null };
      },
      signInWithPassword: async ({ email }) => {
        const mockUser = {
          id: "mock-uid-default",
          email: email,
          user_metadata: {
            first_name: "John",
            last_name: "Doe"
          }
        };
        const mockSession = { access_token: "mock-access-token", user: mockUser };
        localStorage.setItem("sb-mock-auth-token", JSON.stringify(mockSession));
        
        return { data: { session: mockSession, user: mockUser }, error: null };
      },
      signOut: async () => {
        localStorage.removeItem("sb-mock-auth-token");
        return { error: null };
      }
    },

    from: (table) => {
      const booksRef = getReferenceBooks();

      return {
        select: (columns = "*") => {
          return {
            eq: (col, val) => {
              return {
                single: async () => {
                  if (table === "profiles") {
                    const mockProfiles = JSON.parse(localStorage.getItem("ketabak_mock_profiles")) || {};
                    const profile = mockProfiles[val] || {
                      id: val,
                      first_name: "John",
                      last_name: "Doe",
                      email: "john.doe@example.com"
                    };
                    return { data: profile, error: null };
                  }
                  if (table === "cart_items") {
                    const mockCart = JSON.parse(localStorage.getItem("ketabak_mock_cart")) || [];
                    const item = mockCart.find(i => i.user_id === val);
                    return { data: item || null, error: null };
                  }
                  return { data: null, error: null };
                },
                order: async () => {
                  if (table === "orders") {
                    const mockOrders = JSON.parse(localStorage.getItem("ketabak_mock_orders")) || [];
                    const userOrders = mockOrders.filter(o => o.user_id === val);
                    return { data: userOrders, error: null };
                  }
                  if (table === "wishlists") {
                    const mockWishlist = JSON.parse(localStorage.getItem("ketabak_mock_wishlist")) || [];
                    const userWishlist = mockWishlist.filter(w => w.user_id === val).map(item => {
                      const book = booksRef.find(b => b.id === item.book_id) || {
                        id: item.book_id,
                        title: "Offline Mock Book",
                        price: "15.00",
                        image: "images/book-1.webp",
                        category: "Programming"
                      };
                      return { ...item, book };
                    });
                    return { data: userWishlist, error: null };
                  }
                  return { data: [], error: null };
                }
              };
            },
            or: () => ({
              order: () => ({
                limit: async () => ({ data: booksRef, error: null })
              })
            }),
            order: () => ({
              limit: async () => ({ data: booksRef, error: null })
            }),
            limit: async () => ({ data: booksRef.slice(0, 10), error: null })
          };
        },
        eq: (col, val) => {
          return {
            eq: (col2, val2) => {
              return {
                maybeSingle: async () => {
                  if (table === "cart_items") {
                    const mockCart = JSON.parse(localStorage.getItem("ketabak_mock_cart")) || [];
                    const item = mockCart.find(i => i.user_id === val && i.book_id === val2);
                    return { data: item || null, error: null };
                  }
                  return { data: null, error: null };
                },
                single: async () => {
                  if (table === "cart_items") {
                    const mockCart = JSON.parse(localStorage.getItem("ketabak_mock_cart")) || [];
                    const item = mockCart.find(i => i.user_id === val && i.book_id === val2);
                    return { data: item || null, error: null };
                  }
                  return { data: null, error: null };
                },
                delete: async () => {
                  if (table === "cart_items") {
                    let mockCart = JSON.parse(localStorage.getItem("ketabak_mock_cart")) || [];
                    mockCart = mockCart.filter(i => !(i.user_id === val && i.book_id === val2));
                    localStorage.setItem("ketabak_mock_cart", JSON.stringify(mockCart));
                  }
                  return { error: null };
                }
              };
            },
            delete: async () => {
              if (table === "cart_items") {
                let mockCart = JSON.parse(localStorage.getItem("ketabak_mock_cart")) || [];
                mockCart = mockCart.filter(i => i.user_id !== val);
                localStorage.setItem("ketabak_mock_cart", JSON.stringify(mockCart));
              }
              return { error: null };
            }
          };
        },
        insert: async (inputData) => {
          if (table === "orders") {
            const mockOrders = JSON.parse(localStorage.getItem("ketabak_mock_orders")) || [];
            const header = Array.isArray(inputData) ? inputData[0] : inputData;
            const newOrder = {
              ...header,
              id: "mock-order-" + Math.random().toString(36).substring(2, 9),
              created_at: new Date().toISOString(),
              status: "pending",
              order_items: []
            };
            mockOrders.unshift(newOrder);
            localStorage.setItem("ketabak_mock_orders", JSON.stringify(mockOrders));
            localStorage.setItem("ketabak_last_inserted_order", JSON.stringify(newOrder));
            
            return {
              data: newOrder,
              select: () => ({
                single: async () => ({ data: newOrder, error: null })
              }),
              error: null
            };
          }
          if (table === "order_items") {
            const lastOrder = JSON.parse(localStorage.getItem("ketabak_last_inserted_order"));
            if (lastOrder) {
              const mockOrders = JSON.parse(localStorage.getItem("ketabak_mock_orders")) || [];
              const orderIdx = mockOrders.findIndex(o => o.id === lastOrder.id);
              if (orderIdx !== -1) {
                const inserts = Array.isArray(inputData) ? inputData : [inputData];
                mockOrders[orderIdx].order_items = inserts.map(item => {
                  const book = booksRef.find(b => b.id === item.book_id) || {
                    id: item.book_id,
                    title: "Offline Mock Book",
                    price: item.price.toString(),
                    image: "images/book-1.webp",
                    category: "Programming"
                  };
                  return { ...item, book };
                });
                localStorage.setItem("ketabak_mock_orders", JSON.stringify(mockOrders));
              }
            }
            return { data: inputData, error: null };
          }
          if (table === "cart_items") {
            const mockCart = JSON.parse(localStorage.getItem("ketabak_mock_cart")) || [];
            const row = Array.isArray(inputData) ? inputData[0] : inputData;
            const existing = mockCart.find(i => i.user_id === row.user_id && i.book_id === row.book_id);
            if (existing) {
              existing.quantity = row.quantity;
            } else {
              mockCart.push({ id: Math.random().toString(), ...row });
            }
            localStorage.setItem("ketabak_mock_cart", JSON.stringify(mockCart));
            return { data: [row], select: () => ({ data: [row] }), error: null };
          }
          if (table === "wishlists") {
            const mockWish = JSON.parse(localStorage.getItem("ketabak_mock_wishlist")) || [];
            const row = Array.isArray(inputData) ? inputData[0] : inputData;
            if (!mockWish.some(w => w.user_id === row.user_id && w.book_id === row.book_id)) {
              mockWish.push(row);
            }
            localStorage.setItem("ketabak_mock_wishlist", JSON.stringify(mockWish));
            return { data: [row], select: () => ({ data: [row] }), error: null };
          }
          return { data: inputData, error: null };
        },
        update: (updateData) => {
          return {
            eq: async (col, val) => {
              if (table === "profiles") {
                const mockProfiles = JSON.parse(localStorage.getItem("ketabak_mock_profiles")) || {};
                if (mockProfiles[val]) {
                  mockProfiles[val] = { ...mockProfiles[val], ...updateData };
                  localStorage.setItem("ketabak_mock_profiles", JSON.stringify(mockProfiles));
                }
                const session = JSON.parse(localStorage.getItem("sb-mock-auth-token"));
                if (session && session.user.id === val) {
                  session.user.user_metadata = { ...session.user.user_metadata, ...updateData };
                  localStorage.setItem("sb-mock-auth-token", JSON.stringify(session));
                }
                return { data: null, error: null };
              }
              if (table === "cart_items") {
                const mockCart = JSON.parse(localStorage.getItem("ketabak_mock_cart")) || [];
                const item = mockCart.find(i => i.id === val);
                if (item) {
                  item.quantity = updateData.quantity;
                  localStorage.setItem("ketabak_mock_cart", JSON.stringify(mockCart));
                }
                return { data: [item], select: () => ({ data: [item] }), error: null };
              }
              return { data: null, error: null };
            }
          };
        }
      };
    }
  };

  supabaseInstance = mockQueries;

  // Build custom resolvers for Cart
  supabaseInstance.from = (table) => {
    const originalFrom = mockQueries.from(table);
    if (table === "cart_items") {
      originalFrom.select = (columns = "*") => {
        return {
          eq: (col, val) => {
            return {
              then: async (resolveFn) => {
                const mockCart = JSON.parse(localStorage.getItem("ketabak_mock_cart")) || [];
                const userCart = mockCart.filter(i => i.user_id === val);
                const booksRef = getReferenceBooks();
                const resolvedCart = userCart.map(item => {
                  const book = booksRef.find(b => b.id === item.book_id) || {
                    id: item.book_id,
                    title: "Offline Mock Book",
                    price: "15.00",
                    image: "images/book-1.webp",
                    category: "Programming"
                  };
                  return { ...item, book };
                });
                return resolveFn({ data: resolvedCart, error: null });
              }
            };
          }
        };
      };
    }
    return originalFrom;
  };
}

await initSupabase();

export const supabase = supabaseInstance;
export { initSupabase };
