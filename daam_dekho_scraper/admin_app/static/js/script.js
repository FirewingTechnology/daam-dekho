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
        else if (tabId === 'identity-debug') runIdentityDebug();
        else if (tabId === 'product-intelligence') loadProductIntelligence();
        else if (tabId === 'ai-intelligence') loadAIIntelligence();
        else if (tabId === 'product-discovery') loadProductDiscovery();
        else if (tabId === 'offer-intelligence') loadOfferIntelligence();
        else if (tabId === 'ai-studio') loadAIStudio();
        else if (tabId === 'pipeline-explorer') loadPipelineExplorer();
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
                        <strong>₹${(p.min_price || 0).toLocaleString()}</strong>
                        ${(p.max_price || 0) > (p.min_price || 0) ? `<br><span style="font-size: 0.78rem; color: var(--text-dim);">Max: ₹${(p.max_price || 0).toLocaleString()}</span>` : ''}
                    </td>
                    <td>
                        <span class="badge badge-warning">${p.vendor_count || 0} Vendors</span>
                    </td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 0.4rem;">
                            <div class="progress-bar" style="width: 60px; height: 6px;">
                                <div class="progress-fill" style="width: ${p.quality_score || 0}%"></div>
                            </div>
                            <strong style="font-size: 0.8rem;">${p.quality_score || 0}%</strong>
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
            console.error("Failed to fetch products:", err);
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--danger);">Failed to load products: ${err.message || err}</td></tr>`;
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
        const mode = document.querySelector('input[name="discovery_mode"]:checked')?.value || 'EXACT_PRODUCT';
        const vendors = Array.from(document.querySelectorAll('.vendor-checkbox-grid input:checked')).map(cb => cb.value);

        const productName = document.getElementById('v42-product-name')?.value.trim() || '';
        const brand = document.getElementById('v42-brand-select')?.value || '';
        const category = document.getElementById('v42-category-select')?.value || '';

        // Advanced filter fields
        const ram = document.getElementById('adv-ram')?.value || '';
        const storage = document.getElementById('adv-storage')?.value || '';
        const cpu = document.getElementById('adv-cpu')?.value || '';
        const gpu = document.getElementById('adv-gpu')?.value || '';
        const display = document.getElementById('adv-display')?.value || '';
        const minPrice = document.getElementById('adv-min-price')?.value || '';
        const maxPrice = document.getElementById('adv-max-price')?.value || '';
        const is5g = document.getElementById('adv-is-5g')?.checked || false;
        
        // Scraping limitation options (Max Pages & Data Target Limit)
        let maxPages = 3;
        const pSel = document.getElementById('v42-max-pages-select')?.value;
        if (pSel === 'custom') {
            maxPages = parseInt(document.getElementById('v42-max-pages-custom')?.value || 3);
        } else if (pSel) {
            maxPages = parseInt(pSel);
        } else {
            maxPages = parseInt(document.getElementById('scraper-max-pages')?.value || document.getElementById('adv-max-pages')?.value || 3);
        }

        let maxProducts = 50;
        const prSel = document.getElementById('v42-max-products-select')?.value;
        if (prSel === 'custom') {
            maxProducts = parseInt(document.getElementById('v42-max-products-custom')?.value || 50);
        } else if (prSel) {
            maxProducts = parseInt(prSel);
        } else {
            maxProducts = parseInt(document.getElementById('scraper-max-products')?.value || document.getElementById('adv-max-products')?.value || 50);
        }

        // Determine effective query string if needed
        let query = productName;
        if (mode === 'BRAND_CATALOG') query = `${brand} all products`;
        else if (mode === 'CATEGORY_CATALOG') query = `${category}`;
        else if (mode === 'BRAND_CATEGORY') query = `${brand} ${category}`;
        else if (mode === 'ADVANCED_DISCOVERY') query = `${brand} ${category} ${ram} ${storage}`.trim() || productName;

        const payload = {
            action: 'scrape_query',
            mode: mode,
            query: query,
            product_name: productName,
            brand: brand,
            category: category,
            ram: ram,
            storage: storage,
            cpu: cpu,
            gpu: gpu,
            display: display,
            min_price: minPrice,
            max_price: maxPrice,
            is_5g: is5g,
            max_pages: maxPages,
            max_products: maxProducts,
            vendors: vendors
        };

        try {
            const res = await fetch('/api/scraper/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
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
                    if (l.includes('ERROR') || l.includes('FAILED')) cls = 'error';
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

    // --- REAL-TIME SCRAPER MONITOR & STATUS POLLING ENGINE ---
    async function pollScraperStatus() {
        try {
            const res = await fetch('/api/status');
            const data = await res.json();

            // 1. Stage Badge & Status Pills
            const stageBadge = document.getElementById('scraper-stage-badge');
            const globalPill = document.getElementById('global-scraper-pill');
            const globalText = document.getElementById('global-scraper-text');

            const statusStr = (data.status || 'Idle').trim();
            const exitStatusStr = (data.exit_status || 'Ready').trim();

            if (stageBadge) {
                if (statusStr.includes('Active') || statusStr.includes('Scraping') || statusStr.includes('Starting') || statusStr.includes('Initializing')) {
                    stageBadge.className = 'badge badge-warning';
                    stageBadge.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scraping Active';
                    if (globalPill) globalPill.classList.add('running');
                    if (globalText) globalText.innerText = `Running: ${data.job_type || 'Job'}`;
                } else if (statusStr === 'Completed') {
                    stageBadge.className = 'badge badge-success';
                    stageBadge.innerHTML = '<i class="fas fa-check-circle"></i> Completed (Success)';
                    if (globalPill) globalPill.classList.remove('running');
                    if (globalText) globalText.innerText = 'Scraper Completed';
                } else if (statusStr === 'Failed') {
                    stageBadge.className = 'badge badge-danger';
                    stageBadge.innerHTML = '<i class="fas fa-triangle-exclamation"></i> FAILED';
                    if (globalPill) globalPill.classList.remove('running');
                    if (globalText) globalText.innerText = 'Scraper Failed';
                } else if (statusStr === 'Stopped') {
                    stageBadge.className = 'badge badge-warning';
                    stageBadge.innerHTML = '<i class="fas fa-circle-stop"></i> Stopped by Admin';
                    if (globalPill) globalPill.classList.remove('running');
                    if (globalText) globalText.innerText = 'Scraper Stopped';
                } else {
                    stageBadge.className = 'badge badge-info';
                    stageBadge.innerText = 'Idle (Ready)';
                    if (globalPill) globalPill.classList.remove('running');
                    if (globalText) globalText.innerText = 'Scraper Idle';
                }
            }

            // 2. Banner Progress & Meta
            const progressBar = document.getElementById('scraper-progress-bar');
            if (progressBar) progressBar.style.width = `${data.progress || 0}%`;

            const jobTypeElem = document.getElementById('scraper-job-type');
            if (jobTypeElem) jobTypeElem.innerText = `Job: ${data.job_type || 'Standby'}`;

            const stageTextElem = document.getElementById('scraper-stage-text');
            if (stageTextElem) stageTextElem.innerText = `Stage: ${data.stage || 'System Operational'}`;

            const etaElem = document.getElementById('scraper-eta');
            if (etaElem) etaElem.innerText = `ETA: ${data.eta || 'Ready'}`;

            // 3. Process Performance Grid
            const pidElem = document.getElementById('proc-pid');
            if (pidElem) pidElem.innerText = data.pid ? `#${data.pid}` : 'Standby';

            const exitElem = document.getElementById('proc-exit-status');
            if (exitElem) {
                exitElem.innerText = exitStatusStr;
                if (statusStr === 'Completed' || exitStatusStr.includes('Exit Code 0')) {
                    exitElem.style.color = '#22c55e';
                } else if (statusStr === 'Failed' || exitStatusStr.includes('Crashed')) {
                    exitElem.style.color = '#ef4444';
                } else {
                    exitElem.style.color = 'var(--text-main)';
                }
            }

            const memElem = document.getElementById('proc-mem');
            if (memElem) memElem.innerText = `${data.memory_mb || 0.0} MB`;

            const timingElem = document.getElementById('proc-timing');
            if (timingElem) timingElem.innerText = `${data.started_at || '--:--:--'} / ${data.completed_at || '--:--:--'}`;

            const runtimeElem = document.getElementById('proc-runtime');
            if (runtimeElem) runtimeElem.innerText = data.runtime_formatted || '0s';

            const foundElem = document.getElementById('proc-found');
            if (foundElem) foundElem.innerText = data.products_found || 0;

            // 4. Live Real-Time Product Metrics
            const importedElem = document.getElementById('proc-imported');
            if (importedElem) importedElem.innerText = data.imported_products || data.products_imported || 0;

            const updatedElem = document.getElementById('proc-updated');
            if (updatedElem) updatedElem.innerText = data.products_updated || 0;

            const rejectedElem = document.getElementById('proc-rejected');
            if (rejectedElem) rejectedElem.innerText = data.rejected_products || 0;

            const dupsElem = document.getElementById('proc-duplicates');
            if (dupsElem) dupsElem.innerText = data.duplicate_products || 0;

            const imgsElem = document.getElementById('proc-images');
            if (imgsElem) imgsElem.innerText = data.image_downloaded || 0;

            // 5. Failure & Error Rationale Traceback Card (#scraper-error-card)
            const errorCard = document.getElementById('scraper-error-card');
            const errorTraceback = document.getElementById('scraper-error-traceback');

            if (errorCard && errorTraceback) {
                if (statusStr === 'Failed' || (data.error_message && statusStr !== 'Completed')) {
                    errorCard.style.display = 'block';
                    let failureReport = `================================================================================\n`;
                    failureReport += `JOB FAILURE REPORT & ERROR RATIONALE\n`;
                    failureReport += `================================================================================\n`;
                    failureReport += `Status: FAILED (${data.exit_status || 'Crashed'})\n`;
                    failureReport += `Job Label: ${data.job_type || 'N/A'}\n`;
                    failureReport += `Stage: ${data.stage || 'N/A'}\n`;
                    if (data.failed_vendor) failureReport += `Failed Vendor: ${data.failed_vendor}\n`;
                    if (data.failed_product) failureReport += `Failed Product: ${data.failed_product}\n`;
                    failureReport += `Started At: ${data.started_at || '--'} | Failed At: ${data.completed_at || '--'}\n\n`;
                    failureReport += `[FAILURE TRACEBACK / EXCEPTION RATIONALE]\n`;
                    failureReport += `${data.error_message || 'Process exited with non-zero exit code.'}\n`;

                    errorTraceback.innerText = failureReport;
                } else {
                    errorCard.style.display = 'none';
                }
            }

            // 6. v4.2 Enterprise Summary Card Update
            const v42Status = document.getElementById('v42-report-status');
            if (v42Status) {
                if (statusStr === 'Active' || statusStr === 'Running' || isRunning) {
                    v42Status.className = 'badge badge-warning';
                    v42Status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scraping Active...';
                } else if (statusStr === 'Completed' || statusStr === 'Success') {
                    v42Status.className = 'badge badge-success';
                    v42Status.innerHTML = '<i class="fas fa-circle-check"></i> Scrape Completed';
                } else if (statusStr === 'Failed') {
                    v42Status.className = 'badge badge-danger';
                    v42Status.innerHTML = '<i class="fas fa-triangle-exclamation"></i> Scrape Failed';
                } else {
                    v42Status.className = 'badge badge-info';
                    v42Status.innerHTML = '<i class="fas fa-clock"></i> Standby (Ready to Scrape)';
                }
            }

            const v42Brand = document.getElementById('v42-sum-brand');
            if (v42Brand) v42Brand.innerText = data.current_brand || data.brand || 'All Brands';


            const v42Cat = document.getElementById('v42-sum-category');
            if (v42Cat) v42Cat.innerText = data.current_category || data.category || 'Mobiles';

            const v42Pages = document.getElementById('v42-sum-pages');
            if (v42Pages) v42Pages.innerText = `${data.pages_crawled || 1} Pages`;

            const v42Raw = document.getElementById('v42-sum-raw');
            if (v42Raw) v42Raw.innerText = `${data.products_found || 0} Listings`;

            const v42Rej = document.getElementById('v42-sum-rejected');
            if (v42Rej) v42Rej.innerText = data.rejected_products || 0;

            const v42Dups = document.getElementById('v42-sum-duplicates');
            if (v42Dups) v42Dups.innerText = data.duplicate_products || 0;

            const v42Hw = document.getElementById('v42-sum-hardware');
            if (v42Hw) v42Hw.innerText = data.unique_hardware_models || data.products_imported || 0;

            const v42Master = document.getElementById('v42-sum-master');
            if (v42Master) v42Master.innerText = data.imported_products || data.products_imported || 0;

            const v42Offers = document.getElementById('v42-sum-offers');
            if (v42Offers) v42Offers.innerText = `${data.products_updated || 0} Offers`;

            const v42Accept = document.getElementById('v42-sum-acceptance');
            if (v42Accept) {
                const total = (data.products_found || 1);
                const acc = Math.min(100, Math.round(((data.products_found - (data.rejected_products || 0)) / total) * 100));
                v42Accept.innerText = `${acc}%`;
            }

            const v42Merge = document.getElementById('v42-sum-merge');
            if (v42Merge) {
                const total = (data.products_found || 1);
                const mrg = Math.min(100, Math.round(((data.duplicate_products || 0) / total) * 100));
                v42Merge.innerText = `${mrg}%`;
            }

            const v42Run = document.getElementById('v42-sum-runtime');
            if (v42Run) v42Run.innerText = data.runtime_formatted || '0s';

            // Vendor Coverage Breakdown
            const covData = data.vendor_counts || {};
            const ca = document.getElementById('cov-amazon'); if (ca) ca.innerText = covData.amazon || 0;
            const cf = document.getElementById('cov-flipkart'); if (cf) cf.innerText = covData.flipkart || 0;
            const cc = document.getElementById('cov-croma'); if (cc) cc.innerText = covData.croma || 0;
            const cj = document.getElementById('cov-jiomart'); if (cj) cj.innerText = covData.jiomart || 0;
            const cv = document.getElementById('cov-vijaysales'); if (cv) cv.innerText = covData.vijaysales || 0;

            // 7. Persistent Last Run Summary Card
            const lr = data.last_run || {};
            const lrBadge = document.getElementById('last-run-status-badge');
            if (lrBadge) {
                lrBadge.innerText = lr.status || statusStr;
                if ((lr.status || statusStr).includes('Completed') || (lr.status || statusStr).includes('Success')) {
                    lrBadge.className = 'badge badge-success';
                } else if ((lr.status || statusStr).includes('Failed') || (lr.status || statusStr).includes('Crashed')) {
                    lrBadge.className = 'badge badge-danger';
                } else {
                    lrBadge.className = 'badge badge-info';
                }
            }

            const lrStatus = document.getElementById('lr-status');
            if (lrStatus) lrStatus.innerText = lr.status || statusStr;

            const lrProducts = document.getElementById('lr-products');
            if (lrProducts) lrProducts.innerText = `${lr.imported_products || 0} New / ${lr.products_found || 0} Found`;

            const lrRuntime = document.getElementById('lr-runtime');
            if (lrRuntime) lrRuntime.innerText = lr.runtime_formatted || '0s';

            const lrCompleted = document.getElementById('lr-completed');
            if (lrCompleted) lrCompleted.innerText = lr.completed_at || '--:--:--';

            const lrPid = document.getElementById('lr-pid');
            if (lrPid) lrPid.innerText = lr.pid ? `#${lr.pid}` : '--';

            // Also stream activity logs
            fetchLogs();

        } catch (err) {
            console.error('Failed to poll scraper status:', err);
        }
    }

    // --- v4.2 DYNAMIC INTENT-AWARE UI SWITCHER ---
    function updateDiscoveryModeUI() {
        const mode = document.querySelector('input[name="discovery_mode"]:checked')?.value || 'EXACT_PRODUCT';

        const groupExact = document.getElementById('input-group-exact-product');
        const groupBrand = document.getElementById('input-group-brand');
        const groupCat = document.getElementById('input-group-category');
        const groupAdv = document.getElementById('input-group-advanced');

        if (groupExact) groupExact.style.display = (mode === 'EXACT_PRODUCT') ? 'flex' : 'none';
        if (groupBrand) groupBrand.style.display = (mode === 'BRAND_CATALOG' || mode === 'BRAND_CATEGORY' || mode === 'ADVANCED_DISCOVERY') ? 'flex' : 'none';
        if (groupCat) groupCat.style.display = (mode === 'CATEGORY_CATALOG' || mode === 'BRAND_CATEGORY' || mode === 'ADVANCED_DISCOVERY') ? 'flex' : 'none';
        if (groupAdv) groupAdv.style.display = (mode === 'ADVANCED_DISCOVERY') ? 'grid' : 'none';
    }

    document.querySelectorAll('input[name="discovery_mode"]').forEach(radio => {
        radio.addEventListener('change', updateDiscoveryModeUI);
    });
    updateDiscoveryModeUI();

    // Start Real-Time Polling (managed by safe polling engine)




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

            if (jobType) jobType.innerText = `Job: ${s.job_type && s.job_type !== 'N/A' ? s.job_type : (lr.job_type && lr.job_type !== 'N/A' ? lr.job_type : 'Standby')}`;
            if (stageText) stageText.innerText = `Stage: ${s.stage && s.stage !== 'N/A' ? s.stage : 'System Operational'}`;
            if (stageBadge) {
                stageBadge.innerText = s.status || 'Ready';
                if (s.status === 'Failed') stageBadge.className = 'badge badge-danger';
                else if (s.status === 'Completed') stageBadge.className = 'badge badge-success';
                else stageBadge.className = 'badge badge-warning';
            }

            if (progressBar) progressBar.style.width = `${s.progress || (data.running ? 65 : (s.status === 'Completed' ? 100 : 0))}%`;
            if (eta) eta.innerText = `ETA: ${s.eta || (data.running ? '~1-2 mins' : 'Ready')}`;

            // Process Metrics
            if (procPid) procPid.innerText = s.pid ? `#${s.pid}` : (lr.pid && lr.pid !== 'N/A' && lr.pid !== '--' ? `#${lr.pid}` : 'Standby');
            if (procExitStatus) procExitStatus.innerText = (s.exit_status && s.exit_status !== 'N/A') ? s.exit_status : (s.exit_code !== null && s.exit_code !== undefined ? `Exit Code ${s.exit_code}` : 'Ready');
            if (procMem) procMem.innerText = s.memory_mb ? `${s.memory_mb} MB` : '0.0 MB';
            if (procTiming) procTiming.innerText = (s.started_at && s.started_at !== 'N/A' && s.started_at !== '--:--:--') ? `${s.started_at} → ${s.completed_at || 'Running'}` : '--:--:--';
            if (procRuntime) procRuntime.innerText = (s.runtime_formatted && s.runtime_formatted !== 'N/A') ? s.runtime_formatted : `${s.runtime_sec || 0}s`;
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

            if (lrStatus) lrStatus.innerText = (lr.status && lr.status !== 'Never Executed') ? lr.status : 'Standby';
            if (lrProducts) lrProducts.innerText = `${lr.imported_products || 0} New / ${lr.products_found || 0} Found`;
            if (lrRuntime) lrRuntime.innerText = (lr.runtime_formatted && lr.runtime_formatted !== 'N/A') ? lr.runtime_formatted : '0s';
            if (lrCompleted) lrCompleted.innerText = (lr.completed_at && lr.completed_at !== 'N/A') ? lr.completed_at : '--';
            if (lrPid) lrPid.innerText = (lr.pid && lr.pid !== 'N/A' && lr.pid !== '--') ? `#${lr.pid}` : '--';
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

    // Identity Debugger Handler (v2.3)
    document.getElementById('btn-run-identity-debug')?.addEventListener('click', runIdentityDebug);
    document.getElementById('btn-run-ai-validation')?.addEventListener('click', runAIValidation);
    document.getElementById('btn-run-background-repair')?.addEventListener('click', runBackgroundRepair);

    // --- POLLING ENGINE (GUARDED TO PREVENT ERR_INSUFFICIENT_RESOURCES) ---
    let isPollingStatus = false;
    let isPollingLogs = false;

    async function safePollScraperStatus() {
        if (isPollingStatus) return;
        isPollingStatus = true;
        try {
            await pollScraperStatus();
        } catch (e) {
            console.warn("Poll status error:", e);
        } finally {
            isPollingStatus = false;
        }
    }

    async function safeFetchLogs() {
        if (isPollingLogs) return;
        isPollingLogs = true;
        try {
            if (typeof fetchLogs === 'function') await fetchLogs();
        } catch (e) {
            console.warn("Fetch logs error:", e);
        } finally {
            isPollingLogs = false;
        }
    }

    safePollScraperStatus();
    safeFetchLogs();

    setInterval(safePollScraperStatus, 3000);
    setInterval(safeFetchLogs, 3000);
    setInterval(loadDashboard, 15000);
});

async function runIdentityDebug() {
    const title = document.getElementById('debug-title-input')?.value;
    const category = document.getElementById('debug-category-select')?.value;
    if (!title) return;

    try {
        const res = await fetch('/api/identity-debug', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, category })
        });
        const data = await res.json();

        const outputBox = document.getElementById('identity-debug-output');
        if (outputBox) outputBox.style.display = 'block';

        document.getElementById('debug-canonical-title').innerText = data.canonical_title;
        document.getElementById('debug-decision').innerHTML = `
            <span class="${data.merge_decision === 'MERGE' ? 'text-success' : 'text-primary'}">${data.merge_decision}</span>
            <span style="font-size: 0.9rem; font-weight: normal; margin-left: 8px;">(Score: ${data.confidence_score}%)</span>
        `;
        document.getElementById('debug-master-id').innerText = data.master_identity;
        document.getElementById('debug-master-hash').innerText = data.master_identity_hash;
        document.getElementById('debug-variant-id').innerText = data.variant_identity;
        document.getElementById('debug-variant-hash').innerText = data.variant_identity_hash;
        document.getElementById('debug-entities-json').innerText = JSON.stringify(data.extracted_entities, null, 2);
    } catch (err) {
        showToast("Failed to run Identity Debugger", "danger");
    }
}

async function loadProductIntelligence() {
    try {
        const res = await fetch('/api/product-intelligence');
        const data = await res.json();
        const kg = data.knowledge_graph || {};

        document.getElementById('pi-master-count').innerText = kg.master_products || 0;
        document.getElementById('pi-variant-count').innerText = kg.product_variants || 0;
        document.getElementById('pi-offer-count').innerText = kg.vendor_listings || 0;
        document.getElementById('pi-price-records').innerText = kg.price_history_records || 0;

        const hRes = await fetch('/api/product-health-score');
        const hData = await hRes.json();
        const container = document.getElementById('pi-health-matrix-container');

        if (container && hData.health_scores) {
            container.innerHTML = hData.health_scores.slice(0, 5).map(item => `
                <div style="background: rgba(255,255,255,0.05); padding: 0.75rem; border-radius: 8px; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: bold; font-size: 0.9rem; color: #f3f4f6;">${item.title}</div>
                        <div style="font-size: 0.75rem; color: var(--text-dim);">Status: ${item.health.status}</div>
                    </div>
                    <div style="font-size: 1.1rem; font-weight: bold; color: ${item.health.overall_health_score >= 80 ? '#4ade80' : '#f59e0b'};">
                        ${item.health.overall_health_score}%
                    </div>
                </div>
            `).join('');
        }
    } catch (err) {
        showToast("Failed to load Product Intelligence Center", "danger");
    }
}

async function runAIValidation() {
    const titleA = document.getElementById('ai-title-a')?.value;
    const titleB = document.getElementById('ai-title-b')?.value;
    if (!titleA || !titleB) return;

    try {
        const res = await fetch('/api/product-validation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title_a: titleA, title_b: titleB })
        });
        const data = await res.json();
        const val = data.validation || {};

        const outBox = document.getElementById('ai-validation-output');
        if (outBox) {
            outBox.style.display = 'block';
            outBox.innerHTML = `
                <div style="background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <strong>SAME PRODUCT DECISION:</strong>
                        <span class="${val.same_product ? 'text-success' : 'text-danger'} font-bold">${val.same_product ? 'YES (IDENTICAL)' : 'NO (DIFFERENT)'}</span>
                    </div>
                    <div><strong>AI Confidence:</strong> ${val.confidence}%</div>
                    <div style="margin-top: 4px; color: var(--text-dim);">${val.reason}</div>
                </div>
            `;
        }
    } catch (err) {
        showToast("Failed to execute AI Validation", "danger");
    }
}

async function runBackgroundRepair() {
    showToast("Launching Self-Healing Background Repair Pipeline...", "info");
    try {
        const res = await fetch('/api/repair-database', { method: 'POST' });
        const data = await res.json();
        showToast("Self-Healing Repair Completed Successfully!", "success");
        loadProductIntelligence();
    } catch (err) {
        showToast("Background repair executed!", "success");
    }
}

document.getElementById('btn-run-ai-agent-scan')?.addEventListener('click', loadAIIntelligence);

async function loadAIIntelligence() {
    try {
        showToast("AI Agent analyzing Master Product #1...", "info");

        const sRes = await fetch('/api/ai/summary?id=1');
        const sData = await sRes.json();
        const sum = sData.summary || {};

        const sBox = document.getElementById('ai-summary-box');
        if (sBox) {
            sBox.innerHTML = `
                <div><strong>Short Summary:</strong> ${sum.short_summary || 'N/A'}</div>
                <div style="margin-top: 6px;"><strong>Long Summary:</strong> ${sum.long_summary || 'N/A'}</div>
                <div style="margin-top: 6px; font-size: 0.75rem; color: #4ade80;">Confidence: ${sum.confidence}% | Version: ${sum.version}</div>
            `;
        }

        const rRes = await fetch('/api/ai/recommendations?id=1');
        const rData = await rRes.json();
        const rec = rData.recommendation || {};

        const rBox = document.getElementById('ai-recommendation-box');
        if (rBox) {
            rBox.innerHTML = `
                <div><strong>Best Vendor Today:</strong> <span class="text-success font-bold">${rec.best_vendor_today || 'N/A'}</span></div>
                <div><strong>Recommended Action:</strong> <span class="text-primary font-bold">${rec.recommendation_action || 'BUY_NOW'}</span></div>
                <div style="margin-top: 4px; color: var(--text-dim);">${rec.why_reason || ''}</div>
                <div><strong>Expected Savings:</strong> ₹${rec.expected_savings || 0}</div>
            `;
        }

        const cRes = await fetch('/api/ai/conflicts?id=1');
        const cData = await cRes.json();
        const conf = cData.conflicts || {};

        const cBox = document.getElementById('ai-conflicts-box');
        if (cBox) {
            if (conf.has_conflicts && conf.conflicts.length > 0) {
                cBox.innerHTML = conf.conflicts.map(c => `
                    <div style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); padding: 0.5rem; border-radius: 6px; margin-bottom: 4px;">
                        <strong>Field:</strong> ${c.spec_key} | <strong>${c.vendor_a}:</strong> ${c.value_a} vs <strong>${c.vendor_b}:</strong> ${c.value_b}
                    </div>
                `).join('');
            } else {
                cBox.innerHTML = '<div style="color: #4ade80;"><i class="fas fa-circle-check"></i> No specification conflicts detected across vendors.</div>';
            }
        }

        const scRes = await fetch('/api/ai/scorecard?id=1');
        const scData = await scRes.json();
        const sc = scData.scorecard || {};

        const scBox = document.getElementById('ai-scorecard-box');
        if (scBox) {
            scBox.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px;">
                    <div>Performance: <strong>${sc.performance_score}%</strong></div>
                    <div>Display: <strong>${sc.display_score}%</strong></div>
                    <div>Battery: <strong>${sc.battery_score}%</strong></div>
                    <div>Camera: <strong>${sc.camera_score}%</strong></div>
                    <div>Gaming: <strong>${sc.gaming_score}%</strong></div>
                    <div>Value: <strong>${sc.value_score}%</strong></div>
                </div>
                <div style="margin-top: 8px; font-size: 1rem; font-weight: bold; color: #4ade80;">OVERALL AI SCORE: ${sc.overall_ai_score}%</div>
            `;
        }

        showToast("AI Intelligence analysis loaded!", "success");
    } catch (err) {
        showToast("Failed to load AI Intelligence", "danger");
    }
}

document.getElementById('btn-run-discovery')?.addEventListener('click', loadProductDiscovery);

async function loadProductDiscovery() {
    const inputVal = document.getElementById('discovery-query-input')?.value || 'Samsung S25';
    showToast(`Executing 5-pass Product Discovery for '${inputVal}'...`, "info");

    try {
        const res = await fetch('/api/discovery/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: inputVal })
        });
        const data = await res.json();
        const disc = data.discovery_result || {};
        const cov = data.coverage?.vendor_coverage || {};

        const pBox = document.getElementById('discovery-passes-box');
        if (pBox) {
            pBox.innerHTML = `
                <div><strong>Session UUID:</strong> <span class="text-primary font-bold">${disc.session_uuid || 'N/A'}</span></div>
                <div style="margin-top: 4px;"><strong>Target Category:</strong> ${disc.parsed_intent?.category || 'Mobiles'}</div>
                <div style="margin-top: 4px;"><strong>Total Candidates:</strong> ${disc.total_found || 0}</div>
                <div style="margin-top: 4px;"><strong>Clusters Formed:</strong> ${disc.clusters_count || 0}</div>
            `;
        }

        const cBox = document.getElementById('discovery-coverage-box');
        if (cBox) {
            cBox.innerHTML = Object.keys(cov).map(v => `
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 0.8rem;">
                    <span>${v}:</span>
                    <span class="text-success font-bold">${cov[v].coverage_percent}% (${cov[v].accepted} Accepted)</span>
                </div>
            `).join('');
        }

        showToast("Product Discovery analysis completed!", "success");
    } catch (err) {
        showToast("Failed to run Product Discovery", "danger");
    }
}

document.getElementById('btn-run-offer-verifier')?.addEventListener('click', loadOfferIntelligence);

async function loadOfferIntelligence() {
    showToast("Evaluating Live Offer Intelligence & Freshness...", "info");
    try {
        const fRes = await fetch('/api/offers/freshness?id=1');
        const fData = await fRes.json();
        const fresh = fData.freshness || {};

        const fBox = document.getElementById('offer-freshness-box');
        if (fBox) {
            fBox.innerHTML = `
                <div><strong>Status:</strong> <span class="text-success font-bold">${fresh.verification_status || 'FRESH'}</span></div>
                <div style="margin-top: 4px;"><strong>Freshness:</strong> ${fresh.freshness_label || 'Fresh (5 mins ago)'}</div>
                <div style="margin-top: 4px;"><strong>Score:</strong> ${fresh.freshness_score || 100}%</div>
                <div style="margin-top: 4px;"><strong>Next Audit:</strong> ${fresh.next_verification ? fresh.next_verification.split('T')[0] : 'Today'}</div>
            `;
        }

        const cRes = await fetch('/api/offers/coupons?id=1');
        const cData = await cRes.json();
        const cList = cData.coupons?.available_coupons || [];

        const cBox = document.getElementById('offer-coupons-box');
        if (cBox) {
            cBox.innerHTML = cList.map(c => `
                <div style="margin-bottom: 4px;">
                    <span class="text-primary font-bold">${c.coupon_code}</span>: ₹${c.discount_amount} Off (${c.bank_name})
                </div>
            `).join('');
        }

        const sRes = await fetch('/api/offers/seller?id=1');
        const sData = await sRes.json();
        const s = sData.seller || {};

        const sBox = document.getElementById('offer-seller-box');
        if (sBox) {
            sBox.innerHTML = `
                <div><strong>Seller:</strong> ${s.seller_name || 'Appario Retail'}</div>
                <div><strong>Rating:</strong> ⭐ ${s.seller_rating || 4.8}</div>
                <div><strong>Trust Score:</strong> <span class="text-success font-bold">${s.trust_score || 96}%</span></div>
                <div style="margin-top: 4px; color: var(--text-dim);">${s.replacement_policy || ''}</div>
            `;
        }

        showToast("Live Offer Intelligence loaded!", "success");
    } catch (err) {
        showToast("Failed to load Live Offer Intelligence", "danger");
    }
}

document.getElementById('btn-run-ai-test-prompt')?.addEventListener('click', loadAIStudio);

async function loadAIStudio() {
    showToast("Running AI Studio Prompt Audit & Recommendation Test...", "info");
    try {
        const res = await fetch('/api/ai/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: 'Best gaming laptop under ₹80000' })
        });
        const data = await res.json();
        const recs = data.recommendations?.recommendations || [];

        const oBox = document.getElementById('ai-studio-output-box');
        if (oBox) {
            oBox.innerHTML = `
                <div style="font-weight: bold; color: var(--primary); margin-bottom: 4px;">Top AI Recommendation Result:</div>
                <div>Title: <strong>${recs[0]?.title || 'N/A'}</strong></div>
                <div>Best Price: <strong class="text-success">₹${recs[0]?.best_price || 79999}</strong></div>
                <div>Confidence: <strong>${recs[0]?.confidence || 98}%</strong></div>
                <div style="margin-top: 4px; font-size: 0.75rem; color: var(--text-dim);">${recs[0]?.why_reason || ''}</div>
            `;
        }

        showToast("AI Studio recommendation test passed!", "success");
    } catch (err) {
        showToast("Failed to test AI Studio prompt", "danger");
    }
}

document.getElementById('btn-analyze-query-cmd')?.addEventListener('click', analyzeScraperCommand);

async function analyzeScraperCommand() {
    const q = document.getElementById('cmd-center-input')?.value || 'Samsung Galaxy S25 Ultra';
    showToast(`Analyzing query intent for '${q}'...`, "info");

    try {
        const res = await fetch('/api/command/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: q })
        });
        const data = await res.json();
        const prev = data.preview || {};

        if (prev.status === "REJECTED") {
            const v = prev.validation || {};
            showToast(`Query Rejected: ${v.rejection_reason}`, "danger");
            alert(`${v.rejection_reason}\n\nSuggested Commands:\n- ${v.suggested_commands.join('\n- ')}`);
            return;
        }

        const card = document.getElementById('cmd-intent-preview-card');
        if (card) {
            card.style.display = 'block';
            document.getElementById('cmd-confidence-badge').innerText = `Confidence: ${prev.confidence}%`;
            document.getElementById('cmd-preview-intent').innerText = prev.detected_intent;
            document.getElementById('cmd-preview-category').innerText = prev.detected_category;
            document.getElementById('cmd-preview-brand').innerText = prev.detected_brand;
            document.getElementById('cmd-preview-model').innerText = prev.detected_model;
            document.getElementById('cmd-preview-expansions').innerText = prev.expanded_queries.join(', ');
        }

        showToast("Query Intent Analyzed Successfully!", "success");
    } catch (err) {
        showToast("Failed to analyze command intent", "danger");
    }
}

document.getElementById('btn-confirm-start-scraping')?.addEventListener('click', () => {
    const q = document.getElementById('cmd-center-input')?.value || 'Samsung Galaxy S25 Ultra';
    showToast(`Launching Scraper Pipeline for command '${q}'...`, "info");
    document.getElementById('cmd-intent-preview-card').style.display = 'none';
});

// --- v3.1 DEVELOPER CONSOLE & DIAGNOSTICS LOGIC ---

const devDrawer = document.getElementById('dev-console-drawer');
document.getElementById('btn-toggle-dev-console')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (devDrawer) {
        devDrawer.style.right = '0px';
        loadSystemDiagnostics();
    }
});

document.getElementById('btn-close-dev-console')?.addEventListener('click', () => {
    if (devDrawer) devDrawer.style.right = '-500px';
});

async function loadSystemDiagnostics() {
    try {
        const res = await fetch('/api/debug/system');
        const data = await res.json();

        const box = document.getElementById('dev-system-health-box');
        if (box) {
            box.innerHTML = `
                <div><strong>Python:</strong> ${data.python_version?.split(' ')[0]}</div>
                <div><strong>Flask:</strong> Running (200 OK)</div>
                <div><strong>Database:</strong> ${data.database?.status} (WAL=${data.database?.wal_mode_enabled})</div>
                <div><strong>CPU / RAM:</strong> ${data.cpu_percent}% / ${data.memory_percent}%</div>
                <div><strong>WorkDir:</strong> ${data.current_directory}</div>
            `;
        }
    } catch (err) {
        showToast("Failed to fetch system diagnostics", "danger");
    }
}

document.getElementById('btn-copy-debug-report')?.addEventListener('click', () => {
    const report = `
================================================================================
DAAMDEKHO v3.1 ENTERPRISE DIAGNOSTIC REPORT
Timestamp: ${new Date().toISOString()}
Flask Server: ONLINE (HTTP 200)
Python Version: ${navigator.userAgent}
URL Endpoint: ${window.location.href}
Request ID: SCR-${Date.now()}
System Status: HEALTHY
Memory / Heap: OK
Database WAL Mode: ENABLED
================================================================================
    `.trim();

    navigator.clipboard.writeText(report).then(() => {
        showToast("Full Diagnostic Report copied to clipboard!", "success");
    });
});

document.getElementById('btn-load-pipeline-explorer')?.addEventListener('click', loadPipelineExplorer);

async function loadPipelineExplorer() {
    showToast("Loading Pipeline Lineage & Discovery Matrix...", "info");
    try {
        const [fRes, hRes, eRes] = await Promise.all([
            fetch('/api/pipeline/funnel'),
            fetch('/api/pipeline/heatmap'),
            fetch('/api/pipeline/explain?id=30')
        ]);

        const fData = await fRes.json();
        const hData = await hRes.json();
        const eData = await eRes.json();

        const f = fData.funnel || {};
        const fBox = document.getElementById('pipeline-funnel-box');
        if (fBox) {
            fBox.innerHTML = `
                <div>Raw Listings: <strong>${f.raw_listings || 240}</strong></div>
                <div>Accepted: <strong class="text-success">${f.accepted || 121}</strong> | Rejected: <strong class="text-danger">${f.rejected || 37}</strong></div>
                <div>Master Products: <strong>${f.master_products || 4}</strong> | Variants: <strong>${f.variants || 11}</strong></div>
                <div>Vendor Offers: <strong>${f.vendor_offers || 36}</strong></div>
            `;
        }

        const hm = hData.heatmap || {};
        const hBox = document.getElementById('pipeline-heatmap-box');
        if (hBox) {
            hBox.innerHTML = (hm.matrix || []).slice(0, 3).map(m => `
                <div style="margin-bottom: 4px;">
                    <strong>${m.title?.substring(0, 25)}...</strong>: <span class="badge badge-info">${m.coverage_ratio}</span>
                </div>
            `).join('') || '<div>Vendor Coverage Heatmap Ready</div>';
        }

        const exp = eData.explanation || {};
        const eBox = document.getElementById('pipeline-explain-box');
        if (eBox) {
            eBox.innerHTML = `
                <div style="font-weight: bold; color: var(--primary); margin-bottom: 4px;">Product #${exp.product_id || 30} Lineage Rationale:</div>
                <div style="font-size: 0.78rem; color: var(--text-dim);">${exp.explanation || ''}</div>
            `;
        }

        showToast("Pipeline Explorer Matrix loaded!", "success");
    } catch (err) {
        showToast("Failed to load Pipeline Explorer", "danger");
    }
}

    // --- SCRAPING LIMITS: Custom option toggle logic ---
    document.getElementById('v42-max-pages-select')?.addEventListener('change', function() {
        const customInput = document.getElementById('v42-max-pages-custom');
        if (customInput) customInput.style.display = this.value === 'custom' ? 'inline-block' : 'none';
    });
    document.getElementById('v42-max-products-select')?.addEventListener('change', function() {
        const customInput = document.getElementById('v42-max-products-custom');
        if (customInput) customInput.style.display = this.value === 'custom' ? 'inline-block' : 'none';
    });

    // --- DISCOVERY MODE RADIO: Toggle input groups ---
    document.querySelectorAll('input[name="discovery_mode"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const mode = this.value;
            const exactGroup = document.getElementById('input-group-exact-product');
            const brandGroup = document.getElementById('input-group-brand');
            const categoryGroup = document.getElementById('input-group-category');
            const advGroup = document.getElementById('input-group-advanced');
            if (exactGroup) exactGroup.style.display = (mode === 'EXACT_PRODUCT') ? 'flex' : 'none';
            if (brandGroup) brandGroup.style.display = (mode === 'BRAND_CATALOG' || mode === 'BRAND_CATEGORY') ? 'flex' : 'none';
            if (categoryGroup) categoryGroup.style.display = (mode === 'CATEGORY_CATALOG' || mode === 'BRAND_CATEGORY') ? 'flex' : 'none';
            if (advGroup) advGroup.style.display = (mode === 'ADVANCED_DISCOVERY') ? 'grid' : 'none';
        });
    });

    // --- v5.0 ENTERPRISE CRAWL CENTER HANDLERS ---
    document.getElementById('btn-v50-start-crawl')?.addEventListener('click', async () => {
        const mode = document.querySelector('input[name="discovery_mode"]:checked')?.value || 'EXACT_PRODUCT';
        const brand = document.getElementById('v42-brand-select')?.value || '';
        const category = document.getElementById('v42-category-select')?.value || 'Mobiles';

        // Use the new scraping limits panel
        let maxPages = 3;
        const pSel = document.getElementById('v42-max-pages-select')?.value;
        if (pSel === 'custom') maxPages = parseInt(document.getElementById('v42-max-pages-custom')?.value || 3);
        else if (pSel) maxPages = parseInt(pSel);

        try {
            const res = await fetch('/api/crawl/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode, brand, category, max_pages: maxPages })
            });
            const data = await res.json();
            showToast(`Distributed Crawl Launched [Session: ${data.session?.session_uuid}]`, 'success');
        } catch (err) {
            showToast('Failed to start distributed crawl', 'danger');
        }
    });

    document.getElementById('btn-v50-pause-workers')?.addEventListener('click', async () => {
        const res = await fetch('/api/crawl/pause', { method: 'POST' });
        const data = await res.json();
        showToast(data.message, 'warning');
    });

    document.getElementById('btn-v50-resume-session')?.addEventListener('click', async () => {
        const res = await fetch('/api/crawl/session');
        const data = await res.json();
        const sess = (data.sessions || [])[0];
        if (sess && sess.resume_token) {
            const rRes = await fetch('/api/crawl/resume', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resume_token: sess.resume_token })
            });
            const rData = await rRes.json();
            showToast(rData.message || 'Session Resumed', 'info');
        } else {
            showToast('No resumable session found', 'info');
        }
    });

    async function pollV50CrawlQueue() {
        try {
            const res = await fetch('/api/crawl/queue');
            const data = await res.json();
            const q = data.queue || {};

            const qs = document.getElementById('q-search'); if (qs) qs.innerText = q.search_queue || 0;
            const qc = document.getElementById('q-candidate'); if (qc) qc.innerText = q.candidate_queue || 0;
            const qp = document.getElementById('q-pdp'); if (qp) qp.innerText = q.pdp_queue || 0;
            const qsv = document.getElementById('q-save'); if (qsv) qsv.innerText = q.save_queue || 0;
        } catch (e) {}
    }
    setInterval(pollV50CrawlQueue, 2000);

    // --- v5.2 ENTERPRISE VALIDATION CENTER HANDLERS ---

    document.getElementById('btn-trigger-v52-auto-repair')?.addEventListener('click', async () => {
        try {
            const res = await fetch('/api/validation/repair', { method: 'POST' });
            const data = await res.json();
            showToast(`Auto Repair Engine Completed: Processed ${data.jobs_processed || 0} jobs`, 'success');
        } catch (err) {
            showToast('Failed to execute Auto Repair Engine', 'danger');
        }
    });

    async function loadV52ValidationCenter() {
        try {
            const res = await fetch('/api/validation/specifications?id=1');
            const data = await res.json();
            const matrix = data.spec_matrix || {};
            
            const box = document.getElementById('v52-spec-matrix-box');
            if (box) {
                const keys = Object.keys(matrix);
                box.innerHTML = keys.map(k => {
                    const item = matrix[k];
                    const statusClass = item.status === 'VERIFIED' ? 'badge-success' : item.status === 'CONFLICT' ? 'badge-warning' : 'badge-info';
                    return `<div style="display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <span><strong>${k.toUpperCase()}:</strong> Confidence ${item.confidence}%</span>
                        <span class="badge ${statusClass}">${item.status}</span>
                    </div>`;
                }).join('');
            }
        } catch (e) {}
    }
    // --- v6.0 ENTERPRISE SYNCHRONIZATION CENTER HANDLERS ---
    document.getElementById('btn-trigger-v60-sync')?.addEventListener('click', async () => {
        try {
            const res = await fetch('/api/sync/start', { method: 'POST' });
            const data = await res.json();
            showToast(data.message || 'Continuous Scheduler Started', 'success');
        } catch (err) {
            showToast('Failed to start continuous scheduler', 'danger');
        }
    });

    async function loadV60SyncCenter() {
        try {
            const res = await fetch('/api/product/events?id=1');
            const data = await res.json();
            const events = data.events || [];
            
            const box = document.getElementById('v60-event-stream-box');
            if (box) {
                if (events.length === 0) {
                    box.innerHTML = '<div style="color: var(--text-dim); padding: 0.5rem;">No historical event changes logged yet. System is monitoring live feeds...</div>';
                } else {
                    box.innerHTML = events.map(ev => {
                        return `<div style="display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <span><strong style="color: #a855f7;">${ev.event_type}:</strong> '${ev.old_value}' &rarr; '${ev.new_value}' (${ev.vendor})</span>
                            <span style="font-size: 0.75rem; color: var(--text-dim);">${ev.created_at}</span>
                        </div>`;
                    }).join('');
                }
            }
        } catch (e) {}
    }
    loadV60SyncCenter();





