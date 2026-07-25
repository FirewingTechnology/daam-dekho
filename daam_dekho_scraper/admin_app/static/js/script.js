/* ==========================================================================
   DAAMDEKHO V1.0 ENTERPRISE ADMIN DASHBOARD CONTROLLER JS
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE ENGINE ---
    const state = {
        currentPage: 1,
        limit: 10,
        totalPages: 1,
        totalItems: 0,
        searchQuery: '',
        categoryFilter: '',
        brandFilter: '',
        sortBy: 'id_desc',
        selectedProductIds: new Set(),
        currentTheme: localStorage.getItem('daamdekho_admin_theme') || 'dark',
        chartCategories: null,
        chartBrands: null
    };

    // --- DOM REFERENCES ---
    const pageTitle = document.getElementById('page-title');
    const navLinks = document.querySelectorAll('.nav-link');
    const tabViews = document.querySelectorAll('.tab-view');
    const themeBtn = document.getElementById('btn-theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');

    // --- THEME ENGINE ---
    function initTheme() {
        document.documentElement.setAttribute('data-theme', state.currentTheme);
        themeIcon.className = state.currentTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }

    themeBtn.addEventListener('click', () => {
        state.currentTheme = state.currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('daamdekho_admin_theme', state.currentTheme);
        initTheme();
    });
    initTheme();

    // Mobile Sidebar Toggle
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
        });
    }

    // --- TAB ROUTING ENGINE ---
    function switchTab(tabId) {
        navLinks.forEach(link => {
            if (link.dataset.tab === tabId) link.classList.add('active');
            else link.classList.remove('active');
        });

        tabViews.forEach(view => {
            if (view.id === `view-${tabId}`) view.classList.add('active');
            else view.classList.remove('active');
        });

        // Set Page Title
        const activeLink = document.querySelector(`.nav-link[data-tab="${tabId}"]`);
        if (activeLink) {
            pageTitle.innerText = activeLink.querySelector('span').innerText;
        }

        // Trigger module load handlers
        if (tabId === 'dashboard') loadDashboard();
        else if (tabId === 'products') loadProducts();
        else if (tabId === 'categories') loadCategories();
        else if (tabId === 'brands') loadBrands();
        else if (tabId === 'vendor-coverage') loadVendorCoverage();
        else if (tabId === 'image-validation') loadImageValidation();
        else if (tabId === 'url-validation') loadUrlValidation();
        else if (tabId === 'spec-quality') loadSpecQuality();
        else if (tabId === 'analytics') loadAnalytics();
        else if (tabId === 'logs') loadFullLogs();
        else if (tabId === 'settings') loadSettings();
        else if (tabId === 'system-health') loadSystemHealth();

        // Close mobile sidebar if open
        sidebar.classList.remove('mobile-open');
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = link.dataset.tab;
            window.location.hash = tabId;
            switchTab(tabId);
        });
    });

    // Hash change handler
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.replace('#', '') || 'dashboard';
        switchTab(hash);
    });

    // Initial hash routing
    const initialHash = window.location.hash.replace('#', '') || 'dashboard';
    switchTab(initialHash);

    // --- TOAST ENGINE ---
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<i class="fas fa-circle-info"></i> <span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    // --- MODULE 1: DASHBOARD ---
    async function loadDashboard() {
        try {
            const res = await fetch('/api/dashboard');
            const data = await res.json();

            document.getElementById('dash-total-products').innerText = data.total_products;
            document.getElementById('dash-total-listings').innerText = data.total_vendor_listings;
            document.getElementById('dash-total-categories').innerText = data.total_categories;
            document.getElementById('dash-quality-score').innerText = `${data.average_quality_score}%`;

            document.getElementById('dash-missing-images').innerText = data.images_missing;
            document.getElementById('dash-broken-urls').innerText = data.broken_vendor_links;
            document.getElementById('dash-missing-specs').innerText = data.products_missing_specs;
            document.getElementById('dash-missing-ratings').innerText = data.products_missing_ratings;

            document.getElementById('dash-db-size').innerText = `${data.db_size_mb} MB`;
            document.getElementById('sidebar-db-size').innerText = `${data.db_size_mb} MB`;
            document.getElementById('dash-last-scrape').innerText = data.last_scrape_time;
            document.getElementById('dash-last-backup').innerText = data.last_backup_time;

            // Global Status Pill
            const pill = document.getElementById('global-scraper-pill');
            const text = document.getElementById('global-scraper-text');
            if (data.scraper_status === 'Running') {
                pill.classList.add('running');
                text.innerText = 'Scraper Running...';
            } else {
                pill.classList.remove('running');
                text.innerText = 'Scraper Idle';
            }
        } catch (err) {
            console.error('Failed to load dashboard metrics:', err);
        }
    }

    document.getElementById('dash-refresh-btn')?.addEventListener('click', loadDashboard);

    // --- MODULE 2: PRODUCTS MANAGEMENT ---
    async function loadProducts() {
        const tbody = document.getElementById('products-tbody');
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem;">Loading catalog products...</td></tr>`;

        try {
            const params = new URLSearchParams({
                page: state.currentPage,
                limit: state.limit,
                search: state.searchQuery,
                category: state.categoryFilter,
                brand: state.brandFilter,
                sort: state.sortBy
            });

            const res = await fetch(`/api/products?${params}`);
            const data = await res.json();

            state.totalItems = data.total;
            state.totalPages = data.pages;

            document.getElementById('pagination-info').innerText = `Showing ${(state.currentPage - 1) * state.limit + 1}-${Math.min(state.currentPage * state.limit, data.total)} of ${data.total} products`;
            document.getElementById('current-page-num').innerText = state.currentPage;
            document.getElementById('btn-prev-page').disabled = state.currentPage <= 1;
            document.getElementById('btn-next-page').disabled = state.currentPage >= state.pages;

            if (data.products.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--text-dim);">No products found matching filters.</td></tr>`;
                return;
            }

            tbody.innerHTML = data.products.map(p => `
                <tr>
                    <td><input type="checkbox" class="product-select-checkbox" data-id="${p.id}" ${state.selectedProductIds.has(p.id) ? 'checked' : ''}></td>
                    <td>
                        <div class="product-cell">
                            <img src="${p.base_image || 'https://via.placeholder.com/50'}" class="product-img" alt="${p.title}">
                            <div>
                                <div class="product-title-text">${p.title}</div>
                                <span style="font-size: 0.78rem; color: var(--text-dim);">ID #${p.id}</span>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div><strong>${p.category || 'Uncategorized'}</strong></div>
                        <span style="font-size: 0.8rem; color: var(--text-muted);">${p.brand || 'No Brand'}</span>
                    </td>
                    <td>
                        <strong>₹${p.min_price.toLocaleString()}</strong>
                        ${p.max_price > p.min_price ? `<br><span style="font-size: 0.78rem; color: var(--text-dim);">Max: ₹${p.max_price.toLocaleString()}</span>` : ''}
                    </td>
                    <td>
                        <span class="badge badge-warning">${p.vendor_count} Vendors</span>
                    </td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 0.4rem;">
                            <div class="progress-bar" style="width: 60px; height: 6px;">
                                <div class="progress-fill" style="width: ${p.quality_score}%"></div>
                            </div>
                            <strong style="font-size: 0.8rem;">${p.quality_score}%</strong>
                        </div>
                    </td>
                    <td>
                        <div style="display: flex; gap: 0.4rem;">
                            <button class="btn-icon btn-edit-product" data-id="${p.id}" title="Edit Product"><i class="fas fa-pen-to-square"></i></button>
                            <button class="btn-icon btn-delete-product" data-id="${p.id}" title="Delete Product" style="color: var(--danger);"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `).join('');

            attachTableEvents();
            populateFilterOptions();
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--danger);">Failed to load products.</td></tr>`;
        }
    }

    function attachTableEvents() {
        document.querySelectorAll('.product-select-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const id = parseInt(e.target.dataset.id);
                if (e.target.checked) state.selectedProductIds.add(id);
                else state.selectedProductIds.delete(id);
                updateBulkActionsUI();
            });
        });

        document.querySelectorAll('.btn-edit-product').forEach(btn => {
            btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.id)));
        });

        document.querySelectorAll('.btn-delete-product').forEach(btn => {
            btn.addEventListener('click', () => deleteSingleProduct(parseInt(btn.dataset.id)));
        });
    }

    function updateBulkActionsUI() {
        const count = state.selectedProductIds.size;
        document.getElementById('selected-count').innerText = `${count} selected`;
        document.getElementById('btn-bulk-delete').disabled = count === 0;
    }

    document.getElementById('select-all-products')?.addEventListener('change', (e) => {
        document.querySelectorAll('.product-select-checkbox').forEach(cb => {
            cb.checked = e.target.checked;
            const id = parseInt(cb.dataset.id);
            if (e.target.checked) state.selectedProductIds.add(id);
            else state.selectedProductIds.delete(id);
        });
        updateBulkActionsUI();
    });

    document.getElementById('btn-bulk-delete')?.addEventListener('click', async () => {
        if (!confirm(`Are you sure you want to delete ${state.selectedProductIds.size} selected products?`)) return;

        try {
            const res = await fetch('/api/products/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', ids: Array.from(state.selectedProductIds) })
            });
            const data = await res.json();
            if (data.status === 'success') {
                showToast(data.message, 'success');
                state.selectedProductIds.clear();
                updateBulkActionsUI();
                loadProducts();
            }
        } catch (err) {
            showToast('Bulk delete failed', 'danger');
        }
    });

    // Filter Listeners
    document.getElementById('product-search')?.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        state.currentPage = 1;
        loadProducts();
    });

    document.getElementById('product-cat-filter')?.addEventListener('change', (e) => {
        state.categoryFilter = e.target.value;
        state.currentPage = 1;
        loadProducts();
    });

    document.getElementById('product-brand-filter')?.addEventListener('change', (e) => {
        state.brandFilter = e.target.value;
        state.currentPage = 1;
        loadProducts();
    });

    document.getElementById('product-sort-select')?.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        loadProducts();
    });

    document.getElementById('btn-prev-page')?.addEventListener('click', () => {
        if (state.currentPage > 1) { state.currentPage--; loadProducts(); }
    });

    document.getElementById('btn-next-page')?.addEventListener('click', () => {
        if (state.currentPage < state.totalPages) { state.currentPage++; loadProducts(); }
    });

    // Exports
    document.getElementById('btn-export-csv')?.addEventListener('click', () => {
        window.location.href = '/api/products/export?format=csv';
    });

    document.getElementById('btn-export-json')?.addEventListener('click', () => {
        window.location.href = '/api/products/export?format=json';
    });

    async function populateFilterOptions() {
        try {
            const catRes = await fetch('/api/categories');
            const cats = await catRes.json();
            const catSelect = document.getElementById('product-cat-filter');
            if (catSelect && catSelect.children.length === 1) {
                cats.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.name;
                    opt.innerText = `${c.name} (${c.product_count})`;
                    catSelect.appendChild(opt);
                });
            }

            const brandRes = await fetch('/api/brands');
            const brands = await brandRes.json();
            const brandSelect = document.getElementById('product-brand-filter');
            if (brandSelect && brandSelect.children.length === 1) {
                brands.forEach(b => {
                    const opt = document.createElement('option');
                    opt.value = b.name;
                    opt.innerText = `${b.name} (${b.product_count})`;
                    brandSelect.appendChild(opt);
                });
            }
        } catch (err) {}
    }

    // --- PRODUCT EDIT MODAL ---
    const modal = document.getElementById('product-edit-modal');
    const closeModalBtn = document.getElementById('btn-close-modal');
    const cancelEditBtn = document.getElementById('btn-cancel-edit');
    const editForm = document.getElementById('edit-product-form');

    async function openEditModal(pid) {
        try {
            const res = await fetch(`/api/products/${pid}`);
            const data = await res.json();

            document.getElementById('edit-product-id').value = data.id;
            document.getElementById('edit-title').value = data.title;
            document.getElementById('edit-brand').value = data.brand || '';
            document.getElementById('edit-category').value = data.category || '';
            document.getElementById('edit-image').value = data.base_image || '';
            document.getElementById('edit-specs-json').value = JSON.stringify(data.specifications || {}, null, 2);

            modal.classList.add('active');
        } catch (err) {
            showToast('Failed to load product details', 'danger');
        }
    }

    function closeModal() { modal.classList.remove('active'); }
    closeModalBtn?.addEventListener('click', closeModal);
    cancelEditBtn?.addEventListener('click', closeModal);

    editForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pid = document.getElementById('edit-product-id').value;

        let specs = {};
        try {
            specs = JSON.parse(document.getElementById('edit-specs-json').value);
        } catch (err) {
            showToast('Invalid Specifications JSON format!', 'danger');
            return;
        }

        const payload = {
            title: document.getElementById('edit-title').value,
            brand: document.getElementById('edit-brand').value,
            category: document.getElementById('edit-category').value,
            base_image: document.getElementById('edit-image').value,
            specifications: specs
        };

        try {
            const res = await fetch(`/api/products/${pid}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.status === 'success') {
                showToast('Product updated successfully!', 'success');
                closeModal();
                loadProducts();
            }
        } catch (err) {
            showToast('Update failed', 'danger');
        }
    });

    async function deleteSingleProduct(pid) {
        if (!confirm(`Delete Product #${pid}?`)) return;
        try {
            const res = await fetch(`/api/products/${pid}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.status === 'success') {
                showToast(data.message, 'success');
                loadProducts();
            }
        } catch (err) {
            showToast('Delete failed', 'danger');
        }
    }

    // --- MODULE 3 & 4: CATEGORIES & BRANDS ---
    async function loadCategories() {
        const container = document.getElementById('categories-container');
        container.innerHTML = 'Loading categories...';
        try {
            const res = await fetch('/api/categories');
            const data = await res.json();

            container.innerHTML = data.map(c => `
                <div class="grid-item-card">
                    <div>
                        <h4 style="font-size: 1rem;">${c.name}</h4>
                        <span style="font-size: 0.8rem; color: var(--text-muted);">${c.product_count} Products</span>
                    </div>
                    <span class="badge badge-success">Active</span>
                </div>
            `).join('');
        } catch (err) {
            container.innerHTML = 'Failed to load categories.';
        }
    }

    async function loadBrands() {
        const container = document.getElementById('brands-container');
        container.innerHTML = 'Loading brands...';
        try {
            const res = await fetch('/api/brands');
            const data = await res.json();

            container.innerHTML = data.map(b => `
                <div class="grid-item-card">
                    <div>
                        <h4 style="font-size: 1rem;">${b.name}</h4>
                        <span style="font-size: 0.8rem; color: var(--text-muted);">${b.product_count} Products</span>
                    </div>
                    <span class="badge badge-warning">Brand</span>
                </div>
            `).join('');
        } catch (err) {
            container.innerHTML = 'Failed to load brands.';
        }
    }

    // --- MODULE 5 & 6: SCRAPER CENTER & PROGRESS ---
    document.getElementById('btn-trigger-scrape')?.addEventListener('click', async () => {
        const query = document.getElementById('scraper-query').value.trim();
        const vendors = Array.from(document.querySelectorAll('.vendor-checkbox-grid input:checked')).map(cb => cb.value);

        if (!query) { showToast('Please enter a query', 'warning'); return; }

        try {
            const res = await fetch('/api/scraper/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'scrape_query', query, vendors })
            });
            const data = await res.json();
            showToast(data.message, 'success');
        } catch (err) {
            showToast('Scraper trigger failed', 'danger');
        }
    });

    document.getElementById('btn-stop-scrape')?.addEventListener('click', async () => {
        const res = await fetch('/api/scraper/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'stop' })
        });
        const data = await res.json();
        showToast(data.message, 'info');
    });

    document.getElementById('btn-normalize-catalog')?.addEventListener('click', async () => {
        const res = await fetch('/api/scraper/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'normalize' })
        });
        const data = await res.json();
        showToast(data.message, 'success');
    });

    document.getElementById('btn-rebuild-catalog')?.addEventListener('click', async () => {
        const res = await fetch('/api/scraper/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'rebuild_catalog' })
        });
        const data = await res.json();
        showToast(data.message, 'success');
    });

    document.getElementById('btn-backup-db')?.addEventListener('click', async () => {
        const res = await fetch('/api/scraper/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'backup_db' })
        });
        const data = await res.json();
        showToast(data.message, 'success');
    });

    document.getElementById('btn-clear-db')?.addEventListener('click', async () => {
        if (!confirm('WIPE ALL PRODUCTS FROM DATABASE?')) return;
        const res = await fetch('/api/scraper/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'clear_db' })
        });
        const data = await res.json();
        showToast(data.message, 'danger');
        loadDashboard();
    });

    // Terminal log streaming
    async function fetchLogs() {
        try {
            const res = await fetch('/api/logs');
            const data = await res.json();

            const terminal = document.getElementById('live-terminal-container');
            if (terminal && data.logs) {
                terminal.innerHTML = data.logs.map(l => {
                    let cls = '';
                    if (l.includes('ERROR')) cls = 'error';
                    else if (l.includes('ADMIN') || l.includes('SYSTEM')) cls = 'system';
                    return `<div class="log-entry ${cls}">${l.trim()}</div>`;
                }).join('');
                terminal.scrollTop = terminal.scrollHeight;
            }
        } catch (err) {}
    }

    document.getElementById('btn-clear-terminal')?.addEventListener('click', () => {
        const terminal = document.getElementById('live-terminal-container');
        if (terminal) terminal.innerHTML = '<div class="log-entry system">[SYSTEM] Terminal logs cleared.</div>';
    });

    // --- MODULE 7, 8, 9: VALIDATION MODULES ---
    async function loadImageValidation() {
        const res = await fetch('/api/validation/images');
        const data = await res.json();
        document.getElementById('image-audit-results').innerHTML = `
            <div style="display: flex; gap: 2rem; margin-bottom: 1.5rem;">
                <div>Total Images: <strong>${data.total_images}</strong></div>
                <div class="text-success">Healthy CDN URLs: <strong>${data.healthy_images}</strong></div>
                <div class="text-danger">Missing Images: <strong>${data.missing_images}</strong></div>
                <div class="text-warning">Placeholder Images: <strong>${data.placeholder_images}</strong></div>
            </div>
        `;
    }

    // --- MODULE: VENDOR COVERAGE ENGINE ---
    async function loadVendorCoverage() {
        try {
            const res = await fetch('/api/vendor-coverage');
            const data = await res.json();

            const metricsContainer = document.getElementById('coverage-summary-metrics');
            if (metricsContainer) {
                metricsContainer.innerHTML = `
                    <div style="background: rgba(0,0,0,0.2); padding: 0.9rem; border-radius: 12px;">
                        <span style="font-size: 0.75rem; color: var(--text-dim);">MASTER PRODUCTS</span>
                        <h4>${data.total_master_products}</h4>
                    </div>
                    <div style="background: rgba(0,0,0,0.2); padding: 0.9rem; border-radius: 12px;">
                        <span style="font-size: 0.75rem; color: var(--text-dim);">TOTAL VENDOR OFFERS</span>
                        <h4 style="color: #38bdf8;">${data.total_vendor_offers}</h4>
                    </div>
                    <div style="background: rgba(0,0,0,0.2); padding: 0.9rem; border-radius: 12px;">
                        <span style="font-size: 0.75rem; color: var(--text-dim);">OVERALL COVERAGE</span>
                        <h4 style="color: #22c55e;">${data.overall_coverage_percent}%</h4>
                    </div>
                    <div style="background: rgba(0,0,0,0.2); padding: 0.9rem; border-radius: 12px;">
                        <span style="font-size: 0.75rem; color: var(--text-dim);">AVG VENDORS / ITEM</span>
                        <h4 style="color: #a855f7;">${data.average_vendors_per_product} / 5</h4>
                    </div>
                `;
            }

            const tbody = document.getElementById('vendor-coverage-tbody');
            if (tbody) {
                const vendorsList = ["Amazon", "Flipkart", "Croma", "JioMart", "Vijay Sales"];
                tbody.innerHTML = (data.products || []).map(p => `
                    <tr>
                        <td>
                            <div style="display: flex; align-items: center; gap: 0.8rem;">
                                <img src="${escapeHtml(p.base_image || 'https://via.placeholder.com/40')}" style="width: 36px; h-36px; object-fit: contain; border-radius: 6px; background: #fff;" />
                                <div>
                                    <strong style="font-size: 0.88rem;">${escapeHtml(p.title)}</strong>
                                    <div style="font-size: 0.75rem; color: var(--text-dim);">${escapeHtml(p.brand)} | ${escapeHtml(p.category)}</div>
                                </div>
                            </div>
                        </td>
                        ${vendorsList.map(v => {
                            const info = p.vendor_matrix[v] || { status: 'Not Found' };
                            if (info.status === 'Found') {
                                return `<td><span class="badge badge-success"><i class="fas fa-check"></i> ₹${Number(info.price).toLocaleString('en-IN')}</span></td>`;
                            } else {
                                return `<td><span class="badge badge-danger"><i class="fas fa-times"></i> Missing</span></td>`;
                            }
                        }).join('')}
                        <td>
                            <span class="badge ${p.coverage_percent >= 80 ? 'badge-success' : (p.coverage_percent >= 50 ? 'badge-warning' : 'badge-danger')}">
                                ${p.coverage_percent}% (${p.found_count}/5)
                            </span>
                        </td>
                        <td style="font-size: 0.8rem; color: var(--text-dim);">
                            ${escapeHtml(p.rejection_reason)}
                        </td>
                    </tr>
                `).join('');
            }
        } catch (err) {}
    }

    document.getElementById('btn-refresh-coverage')?.addEventListener('click', () => {
        loadVendorCoverage();
        showToast("Vendor coverage audit refreshed", "info");
    });

    document.getElementById('btn-run-image-audit')?.addEventListener('click', async () => {
        const res = await fetch('/api/scraper/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'validate_images' })
        });
        const data = await res.json();
        showToast(data.message, 'success');
    });

    async function loadUrlValidation() {
        const res = await fetch('/api/validation/urls');
        const data = await res.json();
        document.getElementById('url-audit-results').innerHTML = `
            <p>Audited Listings: <strong>${data.total_audited}</strong> | 200 OK: <strong class="text-success">${data.status_summary["200"]}</strong> | Broken URLs: <strong class="text-danger">${data.status_summary["broken"]}</strong></p>
        `;
    }

    async function loadSpecQuality() {
        const res = await fetch('/api/validation/specs');
        const data = await res.json();
        document.getElementById('spec-audit-results').innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem;">
                ${Object.entries(data).map(([k, v]) => `
                    <div style="background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 12px;">
                        <span style="text-transform: capitalize;">${k}</span>
                        <h3 class="${v > 0 ? 'text-warning' : 'text-success'}">${v} Missing</h3>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // --- MODULE 10: ANALYTICS ---
    async function loadAnalytics() {
        try {
            const res = await fetch('/api/analytics');
            const data = await res.json();

            const ctxCat = document.getElementById('chart-categories')?.getContext('2d');
            if (ctxCat) {
                if (state.chartCategories) state.chartCategories.destroy();
                state.chartCategories = new Chart(ctxCat, {
                    type: 'bar',
                    data: {
                        labels: data.categories.map(c => c.category),
                        datasets: [{
                            label: 'Products Count',
                            data: data.categories.map(c => c.cnt),
                            backgroundColor: '#6366f1'
                        }]
                    },
                    options: { responsive: true, plugins: { legend: { display: false } } }
                });
            }

            const ctxBrand = document.getElementById('chart-brands')?.getContext('2d');
            if (ctxBrand) {
                if (state.chartBrands) state.chartBrands.destroy();
                state.chartBrands = new Chart(ctxBrand, {
                    type: 'doughnut',
                    data: {
                        labels: data.brands.map(b => b.brand),
                        datasets: [{
                            data: data.brands.map(b => b.cnt),
                            backgroundColor: ['#6366f1', '#38bdf8', '#22c55e', '#f59e0b', '#a855f7']
                        }]
                    },
                    options: { responsive: true }
                });
            }
        } catch (err) {}
    }

    // --- MODULE 11: LOGS & SETTINGS ---
    async function loadFullLogs() {
        const res = await fetch('/api/logs');
        const data = await res.json();
        document.getElementById('full-logs-container').innerText = data.logs.join('');
    }

    async function loadSettings() {
        const res = await fetch('/api/settings');
        const data = await res.json();
        document.getElementById('setting-delay').value = data.scraper_delay || 2.0;
        document.getElementById('setting-concurrency').value = data.concurrency || 3;
        document.getElementById('setting-retry').value = data.retry_count || 3;
    }

    document.getElementById('settings-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            scraper_delay: parseFloat(document.getElementById('setting-delay').value),
            concurrency: parseInt(document.getElementById('setting-concurrency').value),
            retry_count: parseInt(document.getElementById('setting-retry').value)
        };
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        showToast(data.message, 'success');
    });

    // --- MODULE 12: SYSTEM HEALTH ---
    async function loadSystemHealth() {
        const res = await fetch('/api/health');
        const data = await res.json();
        document.getElementById('system-health-container').innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem;">
                <div>Database Status: <strong>${data.database_status}</strong></div>
                <div>WAL File Size: <strong>${data.sqlite_wal_size_mb} MB</strong></div>
                <div>CPU Usage: <strong>${data.cpu_usage_percent}%</strong></div>
                <div>Memory Usage: <strong>${data.memory_usage_percent}%</strong></div>
            </div>
        `;
    }

    // --- SCRAPER STATUS POLLING ENGINE ---
    async function pollScraperStatus() {
        try {
            const res = await fetch('/api/status');
            const data = await res.json();
            const s = data.state || {};
            const lr = s.last_run || {};

            const pill = document.getElementById('global-scraper-pill');
            const text = document.getElementById('global-scraper-text');
            const jobType = document.getElementById('scraper-job-type');
            const stageText = document.getElementById('scraper-stage-text');
            const stageBadge = document.getElementById('scraper-stage-badge');
            const progressBar = document.getElementById('scraper-progress-bar');
            const eta = document.getElementById('scraper-eta');

            const procPid = document.getElementById('proc-pid');
            const procExitStatus = document.getElementById('proc-exit-status');
            const procMem = document.getElementById('proc-mem');
            const procTiming = document.getElementById('proc-timing');
            const procRuntime = document.getElementById('proc-runtime');
            const procFound = document.getElementById('proc-found');
            
            const procImported = document.getElementById('proc-imported');
            const procUpdated = document.getElementById('proc-updated');
            const procRejected = document.getElementById('proc-rejected');
            const procDuplicates = document.getElementById('proc-duplicates');
            const procImages = document.getElementById('proc-images');

            const summaryCard = document.getElementById('scraper-summary-card');
            const summaryGrid = document.getElementById('summary-metrics-grid');
            const errorCard = document.getElementById('scraper-error-card');
            const errorTraceback = document.getElementById('scraper-error-traceback');

            // Topbar pill & status label
            if (pill) {
                if (data.running || (s.status && s.status !== 'Idle' && s.status !== 'Completed' && s.status !== 'Failed')) {
                    pill.classList.add('running');
                    text.innerText = s.status || 'Scraper Running...';
                } else {
                    pill.classList.remove('running');
                    text.innerText = s.status || 'Scraper Idle';
                }
            }

            if (jobType) jobType.innerText = `Job: ${s.job_type || lr.job_type || 'Idle'}`;
            if (stageText) stageText.innerText = `Stage: ${s.stage || 'Ready'}`;
            if (stageBadge) {
                stageBadge.innerText = s.status || 'Ready';
                if (s.status === 'Failed') stageBadge.className = 'badge badge-danger';
                else if (s.status === 'Completed') stageBadge.className = 'badge badge-success';
                else stageBadge.className = 'badge badge-warning';
            }

            if (progressBar) progressBar.style.width = `${s.progress || (data.running ? 65 : (s.status === 'Completed' ? 100 : 0))}%`;
            if (eta) eta.innerText = `ETA: ${s.eta || (data.running ? '~1-2 mins' : 'Ready')}`;

            // Process Metrics
            if (procPid) procPid.innerText = s.pid ? `#${s.pid}` : (lr.pid !== 'N/A' ? `#${lr.pid}` : 'N/A');
            if (procExitStatus) procExitStatus.innerText = s.exit_status || (s.exit_code !== null ? `Exit Code ${s.exit_code}` : 'N/A');
            if (procMem) procMem.innerText = s.memory_mb ? `${s.memory_mb} MB` : '0.0 MB';
            if (procTiming) procTiming.innerText = s.started_at && s.started_at !== 'N/A' ? `${s.started_at} → ${s.completed_at || 'Running'}` : 'N/A';
            if (procRuntime) procRuntime.innerText = s.runtime_formatted || `${s.runtime_sec || 0}s`;
            if (procFound) procFound.innerText = s.products_found || lr.products_found || 0;

            if (procImported) procImported.innerText = s.imported_products || lr.imported_products || 0;
            if (procUpdated) procUpdated.innerText = s.products_updated || lr.updated_products || 0;
            if (procRejected) procRejected.innerText = s.rejected_products || lr.rejected_products || 0;
            if (procDuplicates) procDuplicates.innerText = s.duplicate_products || lr.duplicate_products || 0;
            if (procImages) procImages.innerText = s.image_downloaded || lr.images_downloaded || 0;

            // Execution Summary Card Rendering
            if (summaryCard && summaryGrid) {
                if (s.status === 'Completed') {
                    summaryCard.style.display = 'block';
                    summaryGrid.innerHTML = `
                        <div>Total Found: <strong>${s.products_found || 0}</strong></div>
                        <div>Imported Products: <strong style="color: #22c55e;">${s.imported_products || 0}</strong></div>
                        <div>Updated Offers: <strong style="color: #0284c7;">${s.products_updated || 0}</strong></div>
                        <div>Rejected Products: <strong style="color: #ef4444;">${s.rejected_products || 0}</strong></div>
                        <div>Duplicates Merged: <strong style="color: #f59e0b;">${s.duplicate_products || 0}</strong></div>
                        <div>Images Validated: <strong style="color: #a855f7;">${s.image_downloaded || 0}</strong></div>
                        <div>Broken Images: <strong>${s.image_failed || 0}</strong></div>
                        <div>Total Runtime: <strong>${s.runtime_formatted || '0s'}</strong></div>
                        <div>Active Vendors: <strong>${s.vendor_count || 5}</strong></div>
                        <div>DB Rows Added: <strong>${s.db_rows_added || 0}</strong></div>
                        <div>Exit Code: <strong style="color: #22c55e;">0 (Clean Success)</strong></div>
                        <div>Execution Status: <strong style="color: #22c55e;">SUCCESS</strong></div>
                    `;
                } else {
                    summaryCard.style.display = 'none';
                }
            }

            // Last Run Info Card Rendering
            const lrStatus = document.getElementById('lr-status');
            const lrProducts = document.getElementById('lr-products');
            const lrRuntime = document.getElementById('lr-runtime');
            const lrCompleted = document.getElementById('lr-completed');
            const lrPid = document.getElementById('lr-pid');
            const lrBadge = document.getElementById('last-run-status-badge');

            if (lrStatus) lrStatus.innerText = lr.status || 'Never Executed';
            if (lrProducts) lrProducts.innerText = `${lr.imported_products || 0} New / ${lr.products_found || 0} Found`;
            if (lrRuntime) lrRuntime.innerText = lr.runtime_formatted || '0s';
            if (lrCompleted) lrCompleted.innerText = lr.completed_at || 'N/A';
            if (lrPid) lrPid.innerText = lr.pid ? `#${lr.pid}` : 'N/A';
            if (lrBadge) {
                lrBadge.innerText = lr.status || 'Idle';
                if (lr.status === 'Completed') lrBadge.className = 'badge badge-success';
                else if (lr.status === 'Failed') lrBadge.className = 'badge badge-danger';
                else lrBadge.className = 'badge badge-info';
            }

            // Crash Error Recovery Traceback Card
            if (errorCard && errorTraceback) {
                if (s.status === 'Failed' && s.error_message) {
                    errorCard.style.display = 'block';
                    errorTraceback.innerText = `Exit Code: ${s.exit_code}\nFailed Vendor: ${s.failed_vendor || 'Unknown'}\nTraceback:\n${s.error_message}`;
                } else {
                    errorCard.style.display = 'none';
                }
            }
        } catch (err) {}
    }

    // --- LOG STREAMING & EXPORT ENGINE ---
    function escapeHtml(text) {
        if (!text) return '';
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    let latestFullLogText = "";

    async function fetchLogs() {
        try {
            const res = await fetch('/api/logs');
            const data = await res.json();
            
            latestFullLogText = data.complete_text || (data.raw_logs || []).join('\n');

            const logLines = (state.logViewMode === 'client') ? (data.logs || []) : (data.raw_logs || []);
            const formattedHTML = logLines.length > 0
                ? logLines.map(l => `<div class="log-entry" style="padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-family: var(--font-mono); font-size: 0.85rem; color: #e2e8f0;">${escapeHtml(l)}</div>`).join('')
                : `<div class="log-entry system" style="color: var(--text-dim);">[SYSTEM] No activity logged yet. Launch a scrape to view live progress.</div>`;

            const liveTerminal = document.getElementById('live-terminal-container');
            if (liveTerminal) {
                liveTerminal.innerHTML = formattedHTML;
                liveTerminal.scrollTop = liveTerminal.scrollHeight;
            }

            const fullTerminal = document.getElementById('full-logs-container');
            if (fullTerminal) {
                fullTerminal.innerHTML = formattedHTML;
                fullTerminal.scrollTop = fullTerminal.scrollHeight;
            }
        } catch (err) {}
    }

    function toggleLogViewMode() {
        state.logViewMode = (state.logViewMode === 'client') ? 'raw' : 'client';
        const label = (state.logViewMode === 'client') ? '<i class="fas fa-eye"></i> Mode: Client View' : '<i class="fas fa-code"></i> Mode: Technical Raw';
        
        const btn1 = document.getElementById('btn-toggle-log-view');
        if (btn1) btn1.innerHTML = label;
        const btn2 = document.getElementById('btn-toggle-full-log-view');
        if (btn2) btn2.innerHTML = label;
        
        fetchLogs();
    }

    document.getElementById('btn-toggle-log-view')?.addEventListener('click', toggleLogViewMode);
    document.getElementById('btn-toggle-full-log-view')?.addEventListener('click', toggleLogViewMode);

    // Copy Logs Button Handler (TASK 6)
    document.getElementById('btn-copy-logs')?.addEventListener('click', async () => {
        try {
            if (navigator.clipboard && latestFullLogText) {
                await navigator.clipboard.writeText(latestFullLogText);
                showToast("Logs copied successfully", "success");
            } else {
                showToast("No log content available to copy", "warning");
            }
        } catch (err) {
            showToast("Failed to copy logs to clipboard", "danger");
        }
    });

    // Download Logs Button Handler (TASK 7)
    document.getElementById('btn-download-logs')?.addEventListener('click', () => {
        window.location.href = '/api/logs/download';
        showToast("Downloading scraper.log...", "info");
    });

    // Clear Terminal Button Handler (TASK 9)
    document.getElementById('btn-clear-terminal')?.addEventListener('click', () => {
        const liveTerminal = document.getElementById('live-terminal-container');
        if (liveTerminal) liveTerminal.innerHTML = '<div class="log-entry system">[SYSTEM] Terminal cleared by admin.</div>';
    });

    // --- POLLING ENGINE ---
    pollScraperStatus();
    fetchLogs();
    setInterval(pollScraperStatus, 1000);
    setInterval(loadDashboard, 10000);
    setInterval(fetchLogs, 1500);
});
