// Track admin state globally so product cards know whether to render the Delete button
let isAdmin = false;

// ==========================================
// 1. PAGE INITIALIZATION & SESSION CHECK
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    fetchProducts();
    setupAddProductForm();

    try {
        const response = await fetch('/api/admin/check', {
            credentials: 'same-origin'
        });
        const data = await response.json();

        if (data.logged_in || data.is_admin) {
            showAdminPanel();
        }
    } catch (err) {
        console.error("Error checking admin status:", err);
    }
});

// ==========================================
// 2. ADMIN LOGIN & LOGOUT HANDLING
// ==========================================
function promptAdminLogin() {
    const loginModal = document.getElementById('admin-login-modal');
    if (loginModal) {
        loginModal.style.display = 'block';
        const passwordInput = document.getElementById('admin-password-input');
        if (passwordInput) {
            passwordInput.value = '';
            passwordInput.focus();
        }
    }
}

async function submitAdminLogin() {
    const passwordInput = document.getElementById('admin-password-input');
    const password = passwordInput ? passwordInput.value : '';

    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ password: password })
        });

        const data = await response.json();

        if (data.success === true) {
            const loginModal = document.getElementById('admin-login-modal');
            if (loginModal) loginModal.style.display = 'none';

            showAdminPanel();

            const roleDisplay = document.getElementById('role-display');
            if (roleDisplay) roleDisplay.innerText = 'Role: Admin';
        } else {
            alert("Incorrect password!");
        }
    } catch (err) {
        console.error("Login error:", err);
        alert("An error occurred during login.");
    }
}

function showAdminPanel() {
    isAdmin = true;

    const roleText = document.getElementById('user-role-text');
    if (roleText) roleText.innerText = 'Role: Admin';

    const loginBtn = document.getElementById('admin-login-btn');
    if (loginBtn) loginBtn.style.display = 'none';

    const addPhoneBtn = document.getElementById('add-phone-btn');
    if (addPhoneBtn) addPhoneBtn.style.display = 'inline-block';

    const logoutBtn = document.getElementById('admin-logout-btn');
    if (logoutBtn) logoutBtn.style.display = 'inline-block';

    const jumpContainer = document.getElementById('admin-jump-container');
    if (jumpContainer) jumpContainer.style.display = 'block';

    const ordersSection = document.getElementById('customer-orders');
    if (ordersSection) ordersSection.style.display = 'block';

    fetchProducts();

    if (typeof fetchOrders === 'function') {
        fetchOrders();
    }
}

async function logoutAdmin() {
    isAdmin = false;

    try {
        await fetch('/api/admin/logout', {
            method: 'POST',
            credentials: 'same-origin'
        });
    } catch (err) {
        console.error("Logout error:", err);
    }

    const roleText = document.getElementById('user-role-text');
    if (roleText) roleText.innerText = 'Role: Guest';

    const loginBtn = document.getElementById('admin-login-btn');
    if (loginBtn) loginBtn.style.display = 'inline-block';

    const addPhoneBtn = document.getElementById('add-phone-btn');
    if (addPhoneBtn) addPhoneBtn.style.display = 'none';

    const logoutBtn = document.getElementById('admin-logout-btn');
    if (logoutBtn) logoutBtn.style.display = 'none';

    const jumpContainer = document.getElementById('admin-jump-container');
    if (jumpContainer) jumpContainer.style.display = 'none';

    const ordersSection = document.getElementById('customer-orders');
    if (ordersSection) ordersSection.style.display = 'none';

    fetchProducts();
}

// ==========================================
// 3. PRODUCTS & ADD PRODUCT MODAL
// ==========================================
async function fetchProducts() {
    try {
        const response = await fetch('/api/products', {
            credentials: 'same-origin'
        });
        const products = await response.json();

        const productGrid = document.getElementById('product-grid');
        if (!productGrid) return;

        productGrid.innerHTML = '';

        if (!Array.isArray(products) || products.length === 0) {
            productGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #64748b;">No phones available right now.</p>';
            return;
        }

        const fallbackImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='160'%3E%3Crect width='200' height='160' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-family='sans-serif' font-size='14'%3ENo Image%3C/text%3E%3C/svg%3E";

        products.forEach(product => {
            const brand = product.brand || product.manufacturer || '';
            const model = product.model || product.name || product.title || product.phone_model || product.device || 'Phone';
            const phoneTitle = `${brand} ${model}`.trim() || 'Second-Hand Phone';

            const phoneRam = product.ram || product.RAM || product.ram_size || 'N/A';
            const phoneStorage = product.storage || product.Storage || product.rom || 'N/A';
            const phonePrice = product.price || product.cost || product.amount || '0.00';
            const imageUrl = product.image_url || product.image || product.img || fallbackImg;

            const adminDeleteButton = isAdmin
                ? `<button type="button" onclick="deleteProduct(${product.id}, '${phoneTitle.replace(/'/g, "\\'")}')" style="margin-top: 0.35rem; background: #ef4444; color: white; border: none; padding: 0.45rem; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 0.85rem;">
                       🗑️ Delete (Sold In-Store)
                   </button>`
                : '';

            const card = document.createElement('div');
            card.className = 'product-card';
            card.style.cssText = 'background: white; border-radius: 8px; padding: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; flex-direction: column; gap: 0.5rem;';

            card.innerHTML = `
                <img src="${imageUrl}" alt="${phoneTitle}" style="width: 100%; height: 160px; object-fit: cover; border-radius: 6px; background: #f1f5f9;" onerror="this.onerror=null;this.src='${fallbackImg}'">
                <h3 style="margin: 0; font-size: 1.1rem; color: #1e293b;">${phoneTitle}</h3>
                <p style="color: #64748b; font-size: 0.9rem; margin: 0;">RAM: ${phoneRam} | Storage: ${phoneStorage}</p>
                <p style="font-weight: bold; color: #2563eb; font-size: 1.1rem; margin: 0;">$${phonePrice}</p>
                <button type="button" onclick="openOrderModal(${product.id}, '${phoneTitle.replace(/'/g, "\\'")}')" style="margin-top: 0.5rem; background: #2563eb; color: white; border: none; padding: 0.5rem; border-radius: 4px; cursor: pointer; font-weight: 600;">
                    Order
                </button>
                ${adminDeleteButton}
            `;
            productGrid.appendChild(card);
        });
    } catch (err) {
        console.error("Error fetching products:", err);
    }
}

window.openAddProductModal = function () {
    const modal = document.getElementById("add-product-modal");
    if (!modal) {
        console.warn("Modal #add-product-modal not found");
        return;
    }
    modal.style.display = "flex";
    modal.classList.add("active", "open", "show");
};

window.closeAddProductModal = function () {
    const modal = document.getElementById("add-product-modal");
    if (!modal) return;
    modal.style.display = "none";
    modal.classList.remove("active", "open", "show");
};

function setupAddProductForm() {
    const addForm = document.getElementById("addProductForm");
    if (!addForm) return;

    addForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const formData = new FormData(addForm);
        const submitBtn = addForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        try {
            const res = await fetch("/api/products", {
                method: "POST",
                body: formData,
                credentials: "same-origin"
            });

            if (res.ok) {
                addForm.reset();
                window.closeAddProductModal();
                await fetchProducts();
                if (isAdmin) {
                    showAdminPanel();
                }
            } else {
                const errData = await res.json().catch(() => ({}));
                alert(errData.error || `Failed to add phone (status ${res.status}).`);
            }
        } catch (err) {
            console.error("Error adding product:", err);
            alert("Network error while adding phone.");
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });
}

async function deleteProduct(productId, productName) {
    if (!confirm(`Delete "${productName}" from inventory? (Use this if sold directly in-store)`)) return;

    try {
        const response = await fetch(`/api/products/${productId}`, {
            method: 'DELETE',
            credentials: 'same-origin'
        });

        if (response.ok) {
            fetchProducts();
        } else {
            alert("Failed to delete product. Make sure you are logged in as Admin.");
        }
    } catch (err) {
        console.error("Error deleting product:", err);
        alert("Network error while deleting product.");
    }
}

// ==========================================
// 4. FETCH & RENDER CUSTOMER ORDERS
// ==========================================
async function fetchOrders() {
    try {
        const response = await fetch('/api/orders', {
            credentials: 'same-origin'
        });
        const orders = await response.json();

        const tableBody = document.getElementById('orders-table-body');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        if (!Array.isArray(orders) || orders.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 1.5rem; color: #64748b;">
                        No pending customer orders.
                    </td>
                </tr>
            `;
            return;
        }

        orders.forEach(order => {
            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid #e2e8f0';
            row.innerHTML = `
                <td style="padding: 0.75rem 1rem;">${order.customer_name || order.name || 'N/A'}</td>
                <td style="padding: 0.75rem 1rem;">${order.phone || 'N/A'}</td>
                <td style="padding: 0.75rem 1rem;">${order.order_type || 'Reservation'}</td>
                <td style="padding: 0.75rem 1rem;">${order.address || 'N/A'}</td>
                <td style="padding: 0.75rem 1rem;">
                    <button type="button" onclick="markOrderCompleted(${order.id})" style="background: #16a34a; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 0.85rem;">
                        ✓ Mark Sold / Done
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (err) {
        console.error("Error fetching orders:", err);
    }
}

// ==========================================
// 5. COMPLETE ORDER & UPDATE INVENTORY
// ==========================================
async function markOrderCompleted(orderId) {
    if (!confirm("Mark this order as completed and remove the phone from inventory?")) return;

    try {
        const response = await fetch(`/api/orders/${orderId}`, {
            method: 'DELETE',
            credentials: 'same-origin'
        });

        if (response.ok) {
            fetchOrders();
            fetchProducts();
        } else {
            alert("Failed to update order status.");
        }
    } catch (err) {
        console.error("Error completing order:", err);
    }
}

function openOrderModal(productId, productName) {
    // Hook up your customer order form/modal logic here
}

window.submitNewProduct = async function (event) {
    event.preventDefault();
    const addForm = document.getElementById("add-product-form");
    if (!addForm) return;

    const formData = new FormData(addForm);
    const submitBtn = addForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
        const res = await fetch("/api/products", {
            method: "POST",
            body: formData,
            credentials: "same-origin"
        });

        if (res.ok) {
            addForm.reset();
            if (typeof window.closeAddProductModal === "function") {
                window.closeAddProductModal();
            }
            await fetchProducts();
            if (isAdmin) {
                showAdminPanel();
            }
        } else {
            const errData = await res.json().catch(() => ({}));
            alert(errData.error || `Failed to add phone (status ${res.status}).`);
        }
    } catch (err) {
        console.error("Error adding product:", err);
        alert("Network error while adding phone.");
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
};

window.promptAdminLogin = function () {
    const loginModal = document.getElementById('admin-login-modal');
    if (loginModal) {
        loginModal.style.display = 'block';
        const passwordInput = document.getElementById('admin-password-input');
        if (passwordInput) {
            passwordInput.value = '';
            passwordInput.focus();
        }
    }
};