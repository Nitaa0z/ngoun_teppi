// Track admin state globally so product cards know whether to render the Delete button
let isAdmin = false;

// ==========================================
// 1. PAGE INITIALIZATION & SESSION CHECK
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    fetchProducts();

    try {
        const response = await fetch('/api/admin/check');
        const data = await response.json();
        
        if (data.logged_in || data.is_admin) {
            showAdminPanel();
        }
    } catch (err) {
        console.error("Error checking admin status:", err);
    }
});

// ==========================================
// 2. ADMIN LOGIN HANDLING
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
            body: JSON.stringify({ password: password })
        });
        
        const data = await response.json();
        
        if (data.success === true) {
            document.getElementById('admin-login-modal').style.display = 'none';
            showAdminPanel();
            
            // Update role label if it exists
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

// 1. Update showAdminPanel() to set isAdmin = true and refresh the product grid
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

    // Re-render products so the Admin Delete buttons appear immediately
    fetchProducts();

    if (typeof fetchOrders === 'function') {
        fetchOrders();
    }
}

// 2. Update logoutAdmin() to set isAdmin = false and refresh the product grid
async function logoutAdmin() {
    isAdmin = false;

    try {
        await fetch('/api/admin/logout', { method: 'POST' });
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

    // Re-render products so the Admin Delete buttons disappear immediately
    fetchProducts();
}

// 3. Update fetchProducts() to render the Delete button ONLY when isAdmin is true
async function fetchProducts() {
    try {
        const response = await fetch('/api/products');
        const products = await response.json();
        
        const productGrid = document.getElementById('product-grid');
        if (!productGrid) return;

        productGrid.innerHTML = '';
        
        if (!Array.isArray(products) || products.length === 0) {
            productGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #64748b;">No phones available right now.</p>';
            return;
        }

        products.forEach(product => {
            const brand = product.brand || product.manufacturer || '';
            const model = product.model || product.name || product.title || product.phone_model || product.device || 'Phone';
            const phoneTitle = `${brand} ${model}`.trim() || 'Second-Hand Phone';

            const phoneRam = product.ram || product.RAM || product.ram_size || 'N/A';
            const phoneStorage = product.storage || product.Storage || product.rom || 'N/A';
            const phonePrice = product.price || product.cost || product.amount || '0.00';
            const imageUrl = product.image_url || product.image || product.img || 'https://via.placeholder.com/150?text=No+Image';

            // Only create the Delete button HTML if logged in as Admin
            const adminDeleteButton = isAdmin 
                ? `<button onclick="deleteProduct(${product.id}, '${phoneTitle.replace(/'/g, "\\'")}')" style="margin-top: 0.35rem; background: #ef4444; color: white; border: none; padding: 0.45rem; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 0.85rem;">
                       🗑️ Delete (Sold In-Store)
                   </button>` 
                : '';

            const card = document.createElement('div');
            card.className = 'product-card';
            card.style.cssText = 'background: white; border-radius: 8px; padding: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; flex-direction: column; gap: 0.5rem;';
            
            card.innerHTML = `
                <img src="${imageUrl}" alt="${phoneTitle}" style="width: 100%; height: 160px; object-fit: cover; border-radius: 6px; background: #f1f5f9;" onerror="this.src='https://via.placeholder.com/150?text=Phone'">
                <h3 style="margin: 0; font-size: 1.1rem; color: #1e293b;">${phoneTitle}</h3>
                <p style="color: #64748b; font-size: 0.9rem; margin: 0;">RAM: ${phoneRam} | Storage: ${phoneStorage}</p>
                <p style="font-weight: bold; color: #2563eb; font-size: 1.1rem; margin: 0;">$${phonePrice}</p>
                <button onclick="openOrderModal(${product.id}, '${phoneTitle.replace(/'/g, "\\'")}')" style="margin-top: 0.5rem; background: #2563eb; color: white; border: none; padding: 0.5rem; border-radius: 4px; cursor: pointer; font-weight: 600;">
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

// 4. Function to manually delete a product when sold in-store
async function deleteProduct(productId, productName) {
    if (!confirm(`Delete "${productName}" from inventory? (Use this if sold directly in-store)`)) return;

    try {
        const response = await fetch(`/api/products/${productId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            fetchProducts(); // Instantly remove the card from the grid
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
        const response = await fetch('/api/orders');
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
                    <button onclick="markOrderCompleted(${order.id})" style="background: #16a34a; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 0.85rem;">
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
            method: 'DELETE'
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

// Placeholder for your order modal trigger if you use one
function openOrderModal(productId, productName) {
    // Hook up your customer order form/modal logic here
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