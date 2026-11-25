let isAdmin = false;
let allProducts = [];

const FALLBACK_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='160'%3E%3Crect width='200' height='160' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-family='sans-serif' font-size='14'%3ENo Image%3C/text%3E%3C/svg%3E";

document.addEventListener("DOMContentLoaded", async () => {
  setupClipboardPaste();
  await fetchProducts();
  await checkAdminSession();
});

async function checkAdminSession() {
  try {
    const response = await fetch("/api/admin/check", {
      credentials: "same-origin",
    });
    const data = await response.json();
    if (Boolean(data.logged_in || data.is_admin || data.isAdmin)) {
      showAdminPanel();
    }
  } catch (err) {
    console.error("Error checking admin status:", err);
  }
}

window.promptAdminLogin = function () {
  const loginModal = document.getElementById("admin-login-modal");
  if (!loginModal) return;
  loginModal.style.display = "block";
  const passwordInput = document.getElementById("admin-password-input");
  if (passwordInput) {
    passwordInput.value = "";
    passwordInput.focus();
  }
};

window.submitAdminLogin = async function () {
  const passwordInput = document.getElementById("admin-password-input");
  const password = passwordInput ? passwordInput.value : "";

  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ password }),
    });
    const data = await response.json();

    if (response.ok && data.success) {
      const loginModal = document.getElementById("admin-login-modal");
      if (loginModal) loginModal.style.display = "none";
      showAdminPanel();
    } else {
      alert(data.message || "Incorrect password!");
    }
  } catch (err) {
    console.error("Login error:", err);
    alert("An error occurred during login.");
  }
};

function showAdminPanel() {
  isAdmin = true;

  const roleText = document.getElementById("user-role-text");
  if (roleText) roleText.innerText = "Role: Admin";

  const loginBtn = document.getElementById("admin-login-btn");
  if (loginBtn) loginBtn.style.display = "none";

  const addPhoneBtn = document.getElementById("add-phone-btn");
  if (addPhoneBtn) addPhoneBtn.style.display = "inline-block";

  const logoutBtn = document.getElementById("admin-logout-btn");
  if (logoutBtn) logoutBtn.style.display = "inline-block";

  const jumpContainer = document.getElementById("admin-jump-container");
  if (jumpContainer) jumpContainer.style.display = "block";

  const ordersSection = document.getElementById("customer-orders");
  if (ordersSection) ordersSection.style.display = "block";

  renderProducts(allProducts);
  fetchOrders();
}

window.logoutAdmin = async function () {
  isAdmin = false;

  try {
    await fetch("/api/admin/logout", {
      method: "POST",
      credentials: "same-origin",
    });
  } catch (err) {
    console.error("Logout error:", err);
  }

  const roleText = document.getElementById("user-role-text");
  if (roleText) roleText.innerText = "Role: Guest";

  const loginBtn = document.getElementById("admin-login-btn");
  if (loginBtn) loginBtn.style.display = "inline-block";

  const addPhoneBtn = document.getElementById("add-phone-btn");
  if (addPhoneBtn) addPhoneBtn.style.display = "none";

  const logoutBtn = document.getElementById("admin-logout-btn");
  if (logoutBtn) logoutBtn.style.display = "none";

  const jumpContainer = document.getElementById("admin-jump-container");
  if (jumpContainer) jumpContainer.style.display = "none";

  const ordersSection = document.getElementById("customer-orders");
  if (ordersSection) ordersSection.style.display = "none";

  renderProducts(allProducts);
};

async function fetchProducts() {
  try {
    const response = await fetch("/api/products", {
      credentials: "same-origin",
    });
    const products = await response.json();
    allProducts = Array.isArray(products) ? products : [];
    renderProducts(allProducts);
  } catch (err) {
    console.error("Error fetching products:", err);
  }
}

function renderProducts(products) {
  const productGrid = document.getElementById("product-grid");
  if (!productGrid) return;

  productGrid.innerHTML = "";

  if (!Array.isArray(products) || products.length === 0) {
    productGrid.innerHTML =
      '<p style="grid-column: 1/-1; text-align: center; color: #64748b;">No phones available right now.</p>';
    return;
  }

  products.forEach((product) => {
    const brand = product.brand || "";
    const model = product.model || "Phone";
    const phoneTitle = `${brand} ${model}`.trim() || "Second-Hand Phone";
    const phoneRam = product.ram || "N/A";
    const phoneStorage = product.storage || "N/A";
    const phonePrice = product.price ?? "0.00";
    const imageUrl = product.image_url || FALLBACK_IMG;
    const safeTitle = phoneTitle.replace(/'/g, "\\'");

    const adminDeleteButton = isAdmin
      ? `<button type="button" onclick="deleteProduct(${product.id}, '${safeTitle}')" style="margin-top: 0.35rem; background: #f4f4f5; color: #b91c1c; border: 1px solid #fecaca; padding: 0.5rem; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.85rem;">Delete (Sold In-Store)</button>`
      : "";

    const card = document.createElement("div");
    card.className = "product-card";
    card.style.cssText =
      "background: #ffffff; border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; gap: 0.55rem;";
    card.innerHTML = `
      <img src="${imageUrl}" alt="${phoneTitle}" style="width: 100%; height: 175px; object-fit: cover; border-radius: 8px; background: #f4f4f5; border: 1px solid #f4f4f5;" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'">
      <h3 style="margin: 0.25rem 0 0; font-size: 1.05rem; font-weight: 600; color: #09090b;">${phoneTitle}</h3>
      <p style="color: #71717a; font-size: 0.85rem; margin: 0;">RAM: ${phoneRam} · Storage: ${phoneStorage}</p>
      <p style="font-weight: 700; color: #18181b; font-size: 1.15rem; margin: 0.15rem 0;">$${phonePrice}</p>
      <button type="button" onclick="openOrderModal(${product.id}, '${safeTitle}')" style="margin-top: auto; background: #18181b; color: #ffffff; border: none; padding: 0.6rem; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9rem;">Reserve Phone</button>
      ${adminDeleteButton}
    `;
    productGrid.appendChild(card);
  });
}

window.filterProducts = function () {
  const query = (document.getElementById("search-input")?.value || "").toLowerCase().trim();
  const storageQuery = (document.getElementById("storage-input")?.value || "").toLowerCase().trim();
  const ramFilter = document.getElementById("ram-filter")?.value || "";
  const maxPrice = parseFloat(document.getElementById("price-filter")?.value || "");

  const filtered = allProducts.filter((p) => {
    const title = `${p.brand || ""} ${p.model || ""}`.toLowerCase();
    const storage = String(p.storage || "").toLowerCase();
    const ram = String(p.ram || "");
    const price = parseFloat(p.price || 0);

    if (query && !title.includes(query)) return false;
    if (storageQuery && !storage.includes(storageQuery)) return false;
    if (ramFilter && !ram.includes(ramFilter)) return false;
    if (!Number.isNaN(maxPrice) && price > maxPrice) return false;
    return true;
  });

  renderProducts(filtered);
};

window.openAddProductModal = function () {
  const modal = document.getElementById("add-product-modal");
  if (!modal) return;
  modal.style.display = "flex";
  modal.classList.add("active", "open", "show");
};

window.closeAddProductModal = function () {
  const modal = document.getElementById("add-product-modal");
  if (!modal) return;
  modal.style.display = "none";
  modal.classList.remove("active", "open", "show");
  const pasteStatus = document.getElementById("paste-status");
  if (pasteStatus) pasteStatus.style.display = "none";
};

function setupClipboardPaste() {
  const fileInput = document.getElementById("new-image-file");
  const pasteStatus = document.getElementById("paste-status");
  if (!fileInput) return;

  document.addEventListener("paste", (event) => {
    const modal = document.getElementById("add-product-modal");
    if (!modal || modal.style.display === "none") return;

    const items = event.clipboardData?.items || [];
    for (const item of items) {
      if (item.type && item.type.startsWith("image/")) {
        const blob = item.getAsFile();
        if (!blob) continue;
        const ext = item.type.split("/")[1] || "png";
        const file = new File([blob], `pasted_phone.${ext}`, { type: item.type });
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;
        if (pasteStatus) pasteStatus.style.display = "block";
        break;
      }
    }
  });
}

window.submitNewProduct = async function (event) {
  event.preventDefault();
  const form = document.getElementById("add-product-form");
  if (!form) return;

  const formData = new FormData(form);
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;

  try {
    const res = await fetch("/api/products", {
      method: "POST",
      body: formData,
      credentials: "same-origin",
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      form.reset();
      window.closeAddProductModal();
      await fetchProducts();
    } else {
      alert(data.error || `Failed to add phone (status ${res.status})`);
    }
  } catch (err) {
    console.error("Error adding product:", err);
    alert("Network error while adding phone.");
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
};

window.deleteProduct = async function (productId, productName) {
  if (!confirm(`Delete "${productName}" from inventory?`)) return;

  try {
    const response = await fetch(`/api/products/${productId}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (response.ok) {
      await fetchProducts();
    } else {
      alert("Failed to delete product.");
    }
  } catch (err) {
    console.error("Error deleting product:", err);
  }
};

async function fetchOrders() {
  try {
    const response = await fetch("/api/orders", {
      credentials: "same-origin",
    });
    const orders = await response.json();
    const tableBody = document.getElementById("orders-table-body");
    if (!tableBody) return;

    tableBody.innerHTML = "";
    if (!Array.isArray(orders) || orders.length === 0) {
      tableBody.innerHTML =
        '<tr><td colspan="5" style="text-align: center; padding: 1.5rem; color: #64748b;">No pending customer orders.</td></tr>';
      return;
    }

    orders.forEach((order) => {
      const row = document.createElement("tr");
      row.style.borderBottom = "1px solid #e2e8f0";
      row.innerHTML = `
        <td style="padding: 0.75rem 1rem;">${order.customer_name || "N/A"}</td>
        <td style="padding: 0.75rem 1rem;">${order.customer_phone || order.phone || "N/A"}</td>
        <td style="padding: 0.75rem 1rem;">${order.order_type || "Reservation"}</td>
        <td style="padding: 0.75rem 1rem;">${order.delivery_address || order.address || "N/A"}</td>
        <td style="padding: 0.75rem 1rem;">
          <button type="button" onclick="markOrderCompleted(${order.id})" style="background: #16a34a; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 0.85rem;">✓ Mark Sold / Done</button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  } catch (err) {
    console.error("Error fetching orders:", err);
  }
}

window.markOrderCompleted = async function (orderId) {
  if (!confirm("Mark this order as completed and remove the phone from inventory?")) return;

  try {
    const response = await fetch(`/api/orders/${orderId}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (response.ok) {
      await fetchOrders();
      await fetchProducts();
    }
  } catch (err) {
    console.error("Error completing order:", err);
  }
};

window.openOrderModal = function (productId, phoneTitle) {
  const modal = document.getElementById("order-modal");
  const idInput = document.getElementById("modal-product-id");
  const titleEl = document.getElementById("modal-phone-title");
  if (idInput) idInput.value = productId;
  if (titleEl) titleEl.innerText = `Reserve ${phoneTitle}`;
  if (modal) {
    modal.style.display = "flex";
    modal.classList.add("active", "open", "show");
  }
};

window.closeOrderModal = function () {
  const modal = document.getElementById("order-modal");
  if (!modal) return;
  modal.style.display = "none";
  modal.classList.remove("active", "open", "show");
};

window.toggleAddressField = function () {
  const orderType = document.getElementById("order-type")?.value;
  const addressBox = document.getElementById("address-container");
  if (addressBox) {
    addressBox.style.display = orderType === "Delivery" ? "block" : "none";
  }
};

window.submitOrder = async function (event) {
  event.preventDefault();
  const payload = {
    product_id: document.getElementById("modal-product-id")?.value,
    customer_name: document.getElementById("customer-name")?.value,
    customer_phone: document.getElementById("customer-phone")?.value,
    order_type: document.getElementById("order-type")?.value || "Store Pickup",
    delivery_address: document.getElementById("delivery-address")?.value || "Store Pickup",
  };

  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      document.getElementById("order-form")?.reset();
      window.closeOrderModal();
      alert("Reservation confirmed!");
      if (isAdmin) await fetchOrders();
    } else {
      alert("Failed to place reservation.");
    }
  } catch (err) {
    console.error("Error submitting order:", err);
    alert("Network error while placing reservation.");
  }
};