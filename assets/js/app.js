document.addEventListener("DOMContentLoaded", () => {
    const entryForm = document.getElementById("entryForm");
    const entryCard = document.getElementById("entryCard");
    const addEntryBtn = document.getElementById("addEntryBtn");
    const clearEntryBtn = document.getElementById("clearEntryBtn");
    const homeBtn = document.getElementById("homeBtn");
    const analyticsBtn = document.getElementById("analyticsBtn");
    const backupBtn = document.getElementById("backupBtn");
    const headerUserBtn = document.getElementById("headerUserBtn");
    const headerAboutBtn = document.getElementById("headerAboutBtn");
    const dataPanel = document.getElementById("dataPanel");
    const analyticsPanel = document.getElementById("analyticsPanel");
    const analyticsMonthlyTabBtn = document.getElementById("analyticsMonthlyTabBtn");
    const analyticsFyTabBtn = document.getElementById("analyticsFyTabBtn");
    const analyticsMonthlyView = document.getElementById("analyticsMonthlyView");
    const analyticsFyView = document.getElementById("analyticsFyView");
    const analyticsMonthInput = document.getElementById("analyticsMonth");
    const analyticsFinancialYearSelect = document.getElementById("analyticsFinancialYear");
    const tableBody = document.querySelector("#entriesTable tbody");
    const usersTableBody = document.querySelector("#usersTable tbody");
    const createUserBtn = document.getElementById("createUserBtn");
    const umSearch = document.getElementById("umSearch");
    const umRoleFilter = document.getElementById("umRoleFilter");
    const umStatusFilter = document.getElementById("umStatusFilter");
    const umClearFilters = document.getElementById("umClearFilters");
    const umTotalUsers = document.getElementById("umTotalUsers");
    const umActiveUsers = document.getElementById("umActiveUsers");
    const umStaffUsers = document.getElementById("umStaffUsers");
    const umAdminUsers = document.getElementById("umAdminUsers");
    const usersPagination = document.getElementById("usersPagination");
    const usersPerPageSelect = document.getElementById("usersPerPageSelect");
    const userManagementPanel = document.getElementById("userManagementPanel");
    const backupPanel = document.getElementById("backupPanel");
    const backupOnlyBtn = document.getElementById("backupOnlyBtn");
    const exportTallyBtn = document.getElementById("exportTallyBtn");
    const backupAndDeleteBtn = document.getElementById("backupAndDeleteBtn");
    const backupRootPath = document.getElementById("backupRootPath");
    const saveBackupPathBtn = document.getElementById("saveBackupPathBtn");
    const backupPathStatus = document.getElementById("backupPathStatus");
    const backupSelectAll = document.getElementById("backupSelectAll");
    const backupFromDate = document.getElementById("backupFromDate");
    const backupToDate = document.getElementById("backupToDate");
    const backupFileInput = document.getElementById("backupFileInput");
    const importBackupBtn = document.getElementById("importBackupBtn");
    const backupSelectedFile = document.getElementById("backupSelectedFile");
    const backupStatusText = document.getElementById("backupStatusText");
    const appShell = document.querySelector(".app-shell");
    const appSidebar = document.getElementById("appSidebar");
    const sidebarToggleBtn = document.getElementById("sidebarToggleBtn");
    const openUserManagementBtn = document.getElementById("openUserManagementBtn");
    const typeSelect = document.getElementById("type");
    const numberLabel = document.getElementById("numberLabel");
    const numberInput = document.getElementById("number");
    const accountHeadSelect = document.getElementById("accountHead");
    const newHeadContainer = document.getElementById("newHeadContainer");
    const newAccountHeadInput = document.getElementById("newAccountHead");
    const entriesPagination = document.getElementById("entriesPagination");
    const entriesPerPageSelect = document.getElementById("entriesPerPageSelect");
    const etSearch = document.getElementById("etSearch");
    const etTypeFilter = document.getElementById("etTypeFilter");
    const etHeadFilter = document.getElementById("etHeadFilter");
    const etFromDate = document.getElementById("etFromDate");
    const etToDate = document.getElementById("etToDate");
    const etClearFilters = document.getElementById("etClearFilters");
    const etTotalEntries = document.getElementById("etTotalEntries");
    const etTotalIncome = document.getElementById("etTotalIncome");
    const etTotalExpense = document.getElementById("etTotalExpense");
    const etNetBalance = document.getElementById("etNetBalance");
    const currentUserName = document.getElementById("currentUserName");
    const currentUserRole = document.getElementById("currentUserRole");

    const APP_VERSION = "1.0.0";
    let loggedInUser = null;
    let entriesCache = null;
    let currentEntriesPage = 1;
    let entriesPerPage = Number(entriesPerPageSelect.value) || 15;
    const financeInsights = new window.FinanceInsightsComponent({
        panel: analyticsPanel,
        monthlyTabBtn: analyticsMonthlyTabBtn,
        fyTabBtn: analyticsFyTabBtn,
        monthlyView: analyticsMonthlyView,
        fyView: analyticsFyView,
        monthInput: analyticsMonthInput,
        financialYearSelect: analyticsFinancialYearSelect
    });
    const userManagement = new window.UserManagementComponent({
        usersTableBody,
        createUserBtn,
        apiFetch,
        normalizeRole,
        searchInput: umSearch,
        roleFilter: umRoleFilter,
        statusFilter: umStatusFilter,
        clearFiltersBtn: umClearFilters,
        totalUsersEl: umTotalUsers,
        activeUsersEl: umActiveUsers,
        staffUsersEl: umStaffUsers,
        adminUsersEl: umAdminUsers,
        usersPagination,
        usersPerPageSelect
    });

    function normalizeRole(role) {
        if (role === "admin") {
            return "administrator";
        }
        return role;
    }

    function isAdministrator() {
        return loggedInUser && normalizeRole(loggedInUser.role) === "administrator";
    }

    function setActiveSidebarItem(item) {
        [homeBtn, analyticsBtn, openUserManagementBtn, backupBtn].forEach((navItem) => {
            if (navItem) {
                navItem.classList.remove("active");
            }
        });
        if (item) {
            item.classList.add("active");
        }
    }

    async function apiFetch(url, options = {}) {
        const response = await fetch(url, {
            credentials: "same-origin",
            ...options
        });

        if (response.status === 401) {
            window.location.href = "login.html";
            throw new Error("Unauthorized");
        }

        return response;
    }

    async function ensureAuthenticated() {
        const response = await apiFetch("api/auth/me.php");
        const data = await response.json();
        if (!response.ok || data.status !== "success") {
            window.location.href = "login.html";
            return null;
        }

        loggedInUser = data.user;
        loggedInUser.role = normalizeRole(loggedInUser.role);
        currentUserName.textContent = loggedInUser.full_name;
        currentUserRole.textContent = loggedInUser.role;
        return loggedInUser;
    }

    function applyRoleRestrictions() {
        appSidebar.classList.remove("hidden");

        if (!isAdministrator()) {
            entryCard.classList.add("hidden");
            userManagementPanel.classList.add("hidden");
            backupPanel.classList.add("hidden");
            financeInsights.hide();
            homeBtn.classList.remove("hidden");
            openUserManagementBtn.classList.add("hidden");
            backupBtn.classList.add("hidden");
            dataPanel.classList.remove("hidden");
            setActiveSidebarItem(homeBtn);
            setLayoutMode("center");
            loadEntriesFromDB();
            return;
        }

        financeInsights.hide();
        dataPanel.classList.remove("hidden");
        entryCard.classList.remove("hidden");
        userManagementPanel.classList.add("hidden");
        backupPanel.classList.add("hidden");
        homeBtn.classList.remove("hidden");
        openUserManagementBtn.classList.remove("hidden");
        backupBtn.classList.remove("hidden");
        setActiveSidebarItem(homeBtn);
        setLayoutMode("center");
        loadEntriesFromDB();
    }

    function toggleSidebar() {
        document.body.classList.toggle("sidebar-collapsed");
        const isExpanded = !document.body.classList.contains("sidebar-collapsed");
        sidebarToggleBtn.setAttribute("aria-expanded", String(isExpanded));
    }

    function setLayoutMode(mode) {
        appShell.classList.toggle("app-shell-top", mode === "top");
    }

    async function showUserManagementSection() {
        if (!isAdministrator()) {
            return;
        }

        financeInsights.hide();
        dataPanel.classList.add("hidden");
        entryCard.classList.add("hidden");
        backupPanel.classList.add("hidden");
        userManagementPanel.classList.remove("hidden");
        setActiveSidebarItem(openUserManagementBtn);
        setLayoutMode("top");
        await userManagement.loadUsers();
    }

    function showHomeSection() {
        if (!isAdministrator()) {
            financeInsights.hide();
            userManagementPanel.classList.add("hidden");
            backupPanel.classList.add("hidden");
            entryCard.classList.add("hidden");
            dataPanel.classList.remove("hidden");
            setActiveSidebarItem(homeBtn);
            setLayoutMode("center");
            loadEntriesFromDB();
            return;
        }

        financeInsights.hide();
        dataPanel.classList.remove("hidden");
        userManagementPanel.classList.add("hidden");
        backupPanel.classList.add("hidden");
        entryCard.classList.remove("hidden");
        setActiveSidebarItem(homeBtn);
        setLayoutMode("center");
        loadEntriesFromDB();
    }

    async function showAnalyticsSection() {
        if (isAdministrator()) {
            entryCard.classList.add("hidden");
            userManagementPanel.classList.add("hidden");
            backupPanel.classList.add("hidden");
        }
        dataPanel.classList.add("hidden");
        financeInsights.show();
        setActiveSidebarItem(analyticsBtn);
        setLayoutMode("top");
        await loadAnalyticsData();
    }

    function showBackupSection() {
        if (!isAdministrator()) {
            return;
        }

        financeInsights.hide();
        dataPanel.classList.add("hidden");
        entryCard.classList.add("hidden");
        userManagementPanel.classList.add("hidden");
        backupPanel.classList.remove("hidden");
        setActiveSidebarItem(backupBtn);
        setLayoutMode("top");
    }

    function toggleBackupDateInputs() {
        const selectAll = backupSelectAll.checked;
        backupFromDate.disabled = selectAll;
        backupToDate.disabled = selectAll;

        if (selectAll) {
            backupFromDate.value = "";
            backupToDate.value = "";
        }
    }

    async function loadBackupPathSettings() {
        try {
            const response = await apiFetch("api/backup_settings.php");
            const payload = await response.json();
            if (payload.status !== "success") {
                throw new Error(payload.message || "Failed to load backup path.");
            }

            backupRootPath.value = String(payload.backup_root || "");
            backupPathStatus.textContent = payload.accessible
                ? `Saved path is accessible: ${payload.backup_root}`
                : `Saved path issue: ${payload.message}`;
            backupPathStatus.classList.toggle("backup-path-error", !payload.accessible);
        } catch (error) {
            console.error(error);
            backupPathStatus.textContent = "Could not load backup path settings.";
            backupPathStatus.classList.add("backup-path-error");
        }
    }

    async function saveBackupPath() {
        const path = backupRootPath.value.trim();

        try {
            const response = await apiFetch("api/backup_settings.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ backup_root: path })
            });
            const payload = await response.json();
            if (payload.status !== "success") {
                throw new Error(payload.message || "Failed to save backup path.");
            }

            backupRootPath.value = String(payload.backup_root || path || "C:/fin_backup");
            backupPathStatus.textContent = `Saved path is accessible: ${payload.backup_root}`;
            backupPathStatus.classList.remove("backup-path-error");
            Swal.fire("Saved", "Backup path updated successfully.", "success");
        } catch (error) {
            console.error(error);
            backupPathStatus.textContent = error.message || "Could not save backup path.";
            backupPathStatus.classList.add("backup-path-error");
            Swal.fire("Invalid path", error.message || "Could not save backup path.", "error");
        }
    }

    function setTodayDate() {
        document.getElementById("date").value = new Date().toISOString().split("T")[0];
    }

    function updateVoucherLabel() {
        if (typeSelect.value === "Income") {
            numberLabel.textContent = "Receipt Number";
            numberInput.placeholder = "e.g., REC-001";
            return;
        }

        if (typeSelect.value === "Expenditure") {
            numberLabel.textContent = "Voucher Number";
            numberInput.placeholder = "e.g., VOU-001";
            return;
        }

        numberLabel.textContent = "Receipt/Voucher Number";
        numberInput.placeholder = "e.g., REC-001 or VOU-001";
    }

    function toggleNewHeadInput() {
        if (accountHeadSelect.value === "Add New") {
            newHeadContainer.classList.remove("hidden");
            return;
        }
        newHeadContainer.classList.add("hidden");
    }

    function clearEntryForm() {
        entryForm.reset();
        setTodayDate();
        updateVoucherLabel();
        toggleNewHeadInput();
    }

    function createActionButton(label, className, onClick) {
        const button = document.createElement("button");
        button.type = "button";
        const iconPath = className === "action-btn-edit"
            ? "assets/icons/pencil.png"
            : className === "action-btn-delete"
                ? "assets/icons/bin.png"
                : "";
        if (iconPath) {
            const icon = document.createElement("img");
            icon.src = iconPath;
            icon.alt = "";
            icon.className = "action-btn-icon";
            icon.loading = "lazy";
            button.appendChild(icon);
        }
        const labelSpan = document.createElement("span");
        labelSpan.textContent = label;
        button.appendChild(labelSpan);
        button.className = `action-btn ${className}`;
        button.addEventListener("click", onClick);
        return button;
    }

    function appendCell(row, value, label) {
        const cell = row.insertCell();
        cell.textContent = value;
        cell.setAttribute("data-label", label);
        return cell;
    }

    function formatMoney(value) {
        return Number(value || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function updateEntriesStats(summary) {
        const totalEntries = Number(summary.total_entries || 0);
        const totalIncome = Number(summary.total_income || 0);
        const totalExpense = Number(summary.total_expenditure || 0);
        const netBalance = Number(summary.net_balance || 0);

        etTotalEntries.textContent = String(totalEntries);
        etTotalIncome.textContent = formatMoney(totalIncome);
        etTotalExpense.textContent = formatMoney(totalExpense);
        etNetBalance.textContent = formatMoney(netBalance);
        etNetBalance.classList.toggle("metric-negative", netBalance < 0);
        etNetBalance.classList.toggle("metric-positive", netBalance >= 0);
    }

    function buildEntriesTableParams() {
        const params = new URLSearchParams();
        params.set("mode", "table");
        params.set("page", String(currentEntriesPage));
        params.set("limit", String(entriesPerPage));
        params.set("search", etSearch.value.trim());
        params.set("type", etTypeFilter.value.trim());
        params.set("account_head", etHeadFilter.value.trim());
        params.set("from_date", etFromDate.value.trim());
        params.set("to_date", etToDate.value.trim());
        return params;
    }

    function clearEntriesFilters() {
        etSearch.value = "";
        etTypeFilter.value = "all";
        etHeadFilter.value = "";
        etFromDate.value = "";
        etToDate.value = "";
        currentEntriesPage = 1;
        loadEntriesFromDB();
    }

    function renderEntriesPagination(totalItems) {
        const totalPages = Math.max(1, Math.ceil(totalItems / entriesPerPage));
        currentEntriesPage = Math.min(currentEntriesPage, totalPages);

        if (totalItems <= entriesPerPage) {
            entriesPagination.innerHTML = "";
            return;
        }

        const pageNumbers = [];
        for (let page = 1; page <= totalPages; page += 1) {
            if (
                page === 1 ||
                page === totalPages ||
                Math.abs(page - currentEntriesPage) <= 1
            ) {
                pageNumbers.push(page);
            }
        }

        const compactPageTokens = [];
        pageNumbers.forEach((page, index) => {
            if (index > 0 && pageNumbers[index - 1] !== page - 1) {
                compactPageTokens.push("ellipsis");
            }
            compactPageTokens.push(page);
        });

        const pageButtonsHtml = compactPageTokens.map((token) => {
            if (token === "ellipsis") {
                return `<span class="pagination-ellipsis">...</span>`;
            }

            const page = Number(token);
            return `
                <button
                    type="button"
                    class="btn btn-secondary pagination-btn pagination-page-btn ${page === currentEntriesPage ? "active" : ""}"
                    data-page="${page}"
                >
                    ${page}
                </button>
            `;
        }).join("");

        entriesPagination.innerHTML = `
            <button id="entriesPrevPage" class="btn btn-secondary pagination-btn" type="button" ${currentEntriesPage <= 1 ? "disabled" : ""}>Previous</button>
            <div class="pagination-pages">${pageButtonsHtml}</div>
            <span class="pagination-info">Page ${currentEntriesPage} of ${totalPages}</span>
            <button id="entriesNextPage" class="btn btn-secondary pagination-btn" type="button" ${currentEntriesPage >= totalPages ? "disabled" : ""}>Next</button>
        `;

        const prevBtn = document.getElementById("entriesPrevPage");
        const nextBtn = document.getElementById("entriesNextPage");
        const pageButtons = entriesPagination.querySelectorAll(".pagination-page-btn");
        prevBtn.addEventListener("click", () => {
            if (currentEntriesPage > 1) {
                currentEntriesPage -= 1;
                loadEntriesFromDB();
            }
        });
        nextBtn.addEventListener("click", () => {
            if (currentEntriesPage < totalPages) {
                currentEntriesPage += 1;
                loadEntriesFromDB();
            }
        });
        pageButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const nextPage = Number(button.getAttribute("data-page"));
                if (Number.isFinite(nextPage) && nextPage !== currentEntriesPage) {
                    currentEntriesPage = nextPage;
                    loadEntriesFromDB();
                }
            });
        });
    }

    async function getEntriesFromDB(forceRefresh = false) {
        if (!forceRefresh && Array.isArray(entriesCache)) {
            return entriesCache;
        }

        const response = await apiFetch("api/fetch_entries.php");
        const entries = await response.json();
        entriesCache = Array.isArray(entries) ? entries : [];
        return entriesCache;
    }

    async function loadAnalyticsData() {
        try {
            const monthValue = analyticsMonthInput.value || new Date().toISOString().slice(0, 7);
            if (!analyticsMonthInput.value) {
                analyticsMonthInput.value = monthValue;
            }

            const params = new URLSearchParams();
            params.set("month", monthValue);
            if (analyticsFinancialYearSelect.value) {
                params.set("fy_start", analyticsFinancialYearSelect.value);
            }

            const response = await apiFetch(`api/finance_insights.php?${params.toString()}`);
            const payload = await response.json();
            if (payload.status !== "success") {
                throw new Error(payload.message || "Failed to load finance insights.");
            }

            financeInsights.renderFromPayload(payload);
        } catch (error) {
            if (error.message !== "Unauthorized") {
                console.error(error);
                Swal.fire("Error", "Failed to load finance insights.", "error");
            }
        }
    }

    async function getEntriesTableFromDB() {
        const params = buildEntriesTableParams();
        const response = await apiFetch(`api/fetch_entries.php?${params.toString()}`);
        const payload = await response.json();
        if (payload.status !== "success") {
            throw new Error(payload.message || "Failed to fetch entries.");
        }
        return payload;
    }

    async function loadEntriesFromDB(forceRefresh = false) {
        try {
            if (forceRefresh) {
                entriesCache = null;
            }

            const payload = await getEntriesTableFromDB();
            const entries = Array.isArray(payload.items) ? payload.items : [];
            const totalItems = Number(payload.total_items || 0);
            const page = Number(payload.page || currentEntriesPage);
            tableBody.innerHTML = "";
            currentEntriesPage = page;
            const start = (currentEntriesPage - 1) * entriesPerPage;

            entries.forEach((entry, index) => {
                const row = tableBody.insertRow();
                appendCell(row, String(start + index + 1), "No.");
                appendCell(row, entry.type, "Type");
                appendCell(row, entry.date, "Date");
                appendCell(row, entry.voucher_number, "Receipt/Voucher Number");
                appendCell(row, entry.account_head, "Account Head");
                appendCell(row, entry.description, "Description");
                appendCell(row, entry.amount, "Amount (INR)");

                const actionsCell = row.insertCell();
                actionsCell.setAttribute("data-label", "Actions");
                if (isAdministrator()) {
                    actionsCell.appendChild(
                        createActionButton("Edit", "action-btn-edit", () => editEntry(entry))
                    );
                    actionsCell.appendChild(
                        createActionButton("Delete", "action-btn-delete", () => deleteEntry(entry.voucher_number))
                    );
                } else {
                    actionsCell.textContent = "-";
                }
            });

            updateEntriesStats(payload.summary || {});
            renderEntriesPagination(totalItems);
        } catch (error) {
            if (error.message !== "Unauthorized") {
                console.error("Error fetching entries:", error);
                Swal.fire("Error", "Failed to load entries.", "error");
            }
        }
    }

    async function addEntry() {
        if (!isAdministrator()) {
            Swal.fire("Not allowed", "Only administrators can add entries.", "warning");
            return;
        }

        const type = document.getElementById("type").value;
        const date = document.getElementById("date").value;
        const number = document.getElementById("number").value;
        let accountHead = document.getElementById("accountHead").value;
        const description = document.getElementById("description").value;
        const amount = document.getElementById("amount").value;

        if (accountHead === "Add New") {
            const newHead = newAccountHeadInput.value.trim();
            if (!newHead) {
                Swal.fire("Missing value", "Please enter a new account head.", "warning");
                return;
            }

            accountHead = newHead;
            const newOption = document.createElement("option");
            newOption.value = newHead;
            newOption.textContent = newHead;
            accountHeadSelect.insertBefore(newOption, accountHeadSelect.lastElementChild);
        }

        if (!type || !date || !number || !accountHead || !description || !amount) {
            Swal.fire("Missing value", "Please fill all fields.", "warning");
            return;
        }

        const formData = new FormData();
        formData.append("type", type);
        formData.append("date", date);
        formData.append("voucher_number", number);
        formData.append("account_head", accountHead);
        formData.append("description", description);
        formData.append("amount", amount);

        try {
            const response = await apiFetch("api/insert.php", {
                method: "POST",
                body: formData
            });
            const result = await response.json();

            if (result.status !== "success") {
                Swal.fire("Error", result.message || "Failed to save entry.", "error");
                return;
            }

            entriesCache = null;
            currentEntriesPage = 1;
            entryForm.reset();
            setTodayDate();
            newHeadContainer.classList.add("hidden");
            updateVoucherLabel();
            Swal.fire("Saved", "Entry added successfully.", "success");

            if (!dataPanel.classList.contains("hidden")) {
                await loadEntriesFromDB(true);
            }
            if (financeInsights.isVisible()) {
                await loadAnalyticsData();
            }
        } catch (error) {
            if (error.message !== "Unauthorized") {
                console.error(error);
                Swal.fire("Error", "Failed to save entry to database.", "error");
            }
        }
    }

    async function deleteEntry(voucherNumber) {
        const result = await Swal.fire({
            title: "Are you sure?",
            text: "This entry will be deleted permanently.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, delete it"
        });

        if (!result.isConfirmed) {
            return;
        }

        try {
            const formData = new FormData();
            formData.append("voucher_number", voucherNumber);

            const response = await apiFetch("api/delete_entry.php", {
                method: "POST",
                body: formData
            });
            const res = await response.json();

            if (res.status === "success") {
                entriesCache = null;
                Swal.fire("Deleted", res.message, "success");
                await loadEntriesFromDB(true);
                if (financeInsights.isVisible()) {
                    await loadAnalyticsData();
                }
                return;
            }

            Swal.fire("Error", res.message || "Failed to delete entry.", "error");
        } catch (error) {
            if (error.message !== "Unauthorized") {
                console.error(error);
                Swal.fire("Error", "Failed to delete entry.", "error");
            }
        }
    }

    async function editEntry(entry) {
        const result = await Swal.fire({
            title: "Edit Entry",
            html: `
                <div class="swal-entry-form">
                    <div class="swal-entry-grid">
                        <div class="swal-entry-field">
                            <label for="swalType">Type</label>
                            <select id="swalType">
                                <option value="Income" ${entry.type === "Income" ? "selected" : ""}>Income</option>
                                <option value="Expenditure" ${entry.type === "Expenditure" ? "selected" : ""}>Expenditure</option>
                            </select>
                        </div>
                        <div class="swal-entry-field">
                            <label for="swalDate">Date</label>
                            <input id="swalDate" type="date" value="${entry.date}">
                        </div>
                    </div>
                    <div class="swal-entry-field">
                        <label for="swalNumber">Voucher/Receipt Number</label>
                        <input id="swalNumber" type="text" value="${entry.voucher_number}">
                    </div>
                    <div class="swal-entry-field">
                        <label for="swalAccountHead">Account Head</label>
                        <input id="swalAccountHead" type="text" value="${entry.account_head}">
                    </div>
                    <div class="swal-entry-field">
                        <label for="swalDescription">Description</label>
                        <input id="swalDescription" type="text" value="${entry.description}">
                    </div>
                    <div class="swal-entry-field">
                        <label for="swalAmount">Amount (INR)</label>
                        <input id="swalAmount" type="number" step="0.01" value="${entry.amount}">
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: "Save",
            cancelButtonText: "Cancel",
            focusConfirm: false,
            customClass: {
                popup: "swal-popup-minimal",
                confirmButton: "swal-btn-confirm",
                cancelButton: "swal-btn-cancel"
            },
            preConfirm: () => {
                return {
                    type: document.getElementById("swalType").value,
                    date: document.getElementById("swalDate").value,
                    voucher_number: document.getElementById("swalNumber").value,
                    account_head: document.getElementById("swalAccountHead").value,
                    description: document.getElementById("swalDescription").value,
                    amount: document.getElementById("swalAmount").value
                };
            }
        });

        if (!result.isConfirmed) {
            return;
        }

        const updated = result.value;
        try {
            const formData = new FormData();
            formData.append("original_voucher_number", entry.voucher_number);
            formData.append("type", updated.type);
            formData.append("date", updated.date);
            formData.append("voucher_number", updated.voucher_number);
            formData.append("account_head", updated.account_head);
            formData.append("description", updated.description);
            formData.append("amount", updated.amount);

            const response = await apiFetch("api/edit_entry.php", {
                method: "POST",
                body: formData
            });
            const res = await response.json();

            if (res.status === "success") {
                entriesCache = null;
                Swal.fire("Updated", res.message, "success");
                await loadEntriesFromDB(true);
                if (financeInsights.isVisible()) {
                    await loadAnalyticsData();
                }
                return;
            }

            Swal.fire("Error", res.message || "Failed to update entry.", "error");
        } catch (error) {
            if (error.message !== "Unauthorized") {
                console.error(error);
                Swal.fire("Error", "Failed to update entry.", "error");
            }
        }
    }

    function isMobile() {
        return window.matchMedia("(max-width: 768px)").matches ||
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    function isPathRelatedError(msg) {
        const s = String(msg || "").toLowerCase();
        return /path|writable|accessible|directory|could not create/i.test(s);
    }

    async function downloadBackup(deleteAfterBackup, hasDateRange, fromDate, toDate) {
        const response = await apiFetch("api/download_backup.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                delete_after_backup: deleteAfterBackup,
                from_date: hasDateRange ? fromDate : "",
                to_date: hasDateRange ? toDate : ""
            })
        });
        const contentType = response.headers.get("Content-Type") || "";
        if (!response.ok || contentType.includes("application/json")) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload.message || "Download failed.");
        }
        const blob = await response.blob();
        const contentDisp = response.headers.get("Content-Disposition");
        let filename = "backup_" + (hasDateRange ? `${fromDate}_to_${toDate}_` : "all_") + new Date().toISOString().slice(0, 10) + ".zip";
        if (contentDisp) {
            const m = contentDisp.match(/filename="?([^";\n]+)"?/);
            if (m) filename = m[1].trim();
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async function downloadTallyExport(hasDateRange, fromDate, toDate) {
        const response = await apiFetch("api/export_tally.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                from_date: hasDateRange ? fromDate : "",
                to_date: hasDateRange ? toDate : ""
            })
        });

        const contentType = response.headers.get("Content-Type") || "";
        if (!response.ok || contentType.includes("application/json")) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload.message || "Tally export failed.");
        }

        const blob = await response.blob();
        const contentDisp = response.headers.get("Content-Disposition");
        let filename = "tally_export_" + (hasDateRange ? `${fromDate}_to_${toDate}_` : "all_dates_") + new Date().toISOString().slice(0, 10) + ".xml";
        if (contentDisp) {
            const match = contentDisp.match(/filename="?([^";\n]+)"?/);
            if (match) {
                filename = match[1].trim();
            }
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    async function exportTallyData() {
        if (!isAdministrator()) {
            Swal.fire("Not allowed", "Only administrators can export Tally XML.", "warning");
            return;
        }

        const selectAll = backupSelectAll.checked;
        const fromDate = backupFromDate.value.trim();
        const toDate = backupToDate.value.trim();

        if (!selectAll && (!fromDate || !toDate)) {
            Swal.fire("Date range required", "Please select both From and To dates, or enable 'Select all data'.", "warning");
            return;
        }

        if (!selectAll && fromDate > toDate) {
            Swal.fire("Invalid range", "From date cannot be later than To date.", "warning");
            return;
        }

        const hasDateRange = !selectAll;
        const period = hasDateRange ? `${fromDate} to ${toDate}` : "All dates";

        try {
            await downloadTallyExport(hasDateRange, fromDate, toDate);
            backupStatusText.textContent = `Latest Tally export: downloaded (${period})`;
            await Swal.fire("Tally export ready", `Tally XML downloaded (${period}). You can import it in Tally.`, "success");
        } catch (error) {
            console.error(error);
            Swal.fire("Export failed", error.message || "Could not export Tally XML.", "error");
        }
    }
    async function createBackup(deleteAfterBackup) {
        if (!isAdministrator()) {
            Swal.fire("Not allowed", "Only administrators can run backup.", "warning");
            return;
        }

        const selectAll = backupSelectAll.checked;
        const fromDate = backupFromDate.value.trim();
        const toDate = backupToDate.value.trim();
        if (!selectAll && (!fromDate || !toDate)) {
            Swal.fire("Date range required", "Please select both From and To dates, or enable 'Select all data'.", "warning");
            return;
        }
        if (!selectAll && fromDate > toDate) {
            Swal.fire("Invalid range", "From date cannot be later than To date.", "warning");
            return;
        }

        const hasDateRange = !selectAll;
        const rangeText = hasDateRange ? `from ${fromDate} to ${toDate}` : "for all dates";

        if (deleteAfterBackup) {
            const confirmResult = await Swal.fire({
                title: "Backup and delete data?",
                text: `This will create backup ${rangeText} and then delete the same backed-up entries from the database.`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Yes, continue"
            });
            if (!confirmResult.isConfirmed) {
                return;
            }
        }

        const useDownload = isMobile();
        const period = hasDateRange ? `${fromDate} to ${toDate}` : "All dates";

        if (useDownload) {
            try {
                await downloadBackup(deleteAfterBackup, hasDateRange, fromDate, toDate);
                backupStatusText.textContent = `Latest backup: downloaded to device (${period})`;
                if (deleteAfterBackup) {
                    entriesCache = null;
                    currentEntriesPage = 1;
                    await loadEntriesFromDB(true);
                    if (financeInsights.isVisible()) {
                        await loadAnalyticsData();
                    }
                    await Swal.fire("Backup completed", `Backup downloaded to your device. Deleted backed-up entries (${period}).`, "success");
                } else {
                    await Swal.fire("Backup completed", `Backup downloaded to your device (${period}).`, "success");
                }
            } catch (error) {
                console.error(error);
                Swal.fire("Backup failed", error.message || "Could not download backup.", "error");
            }
            return;
        }

        try {
            const response = await apiFetch("api/create_backup.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    delete_after_backup: deleteAfterBackup,
                    select_all: selectAll,
                    from_date: hasDateRange ? fromDate : "",
                    to_date: hasDateRange ? toDate : ""
                })
            });
            const payload = await response.json();
            if (payload.status !== "success") {
                throw new Error(payload.message || "Backup failed.");
            }

            const backupPath = String(payload.backup_path || "");
            const deletedEntries = Number(payload.deleted_entries || 0);
            backupStatusText.textContent = `Latest backup: ${backupPath} (${period})`;

            if (deleteAfterBackup) {
                entriesCache = null;
                currentEntriesPage = 1;
                await loadEntriesFromDB(true);
                if (financeInsights.isVisible()) {
                    await loadAnalyticsData();
                }
                await Swal.fire("Backup completed", `Backup created at ${backupPath}. Deleted ${deletedEntries} backed-up entries (${period}).`, "success");
                return;
            }

            await Swal.fire("Backup completed", `Backup created at ${backupPath} (${period}).`, "success");
        } catch (error) {
            if (isPathRelatedError(error.message)) {
                try {
                    await downloadBackup(deleteAfterBackup, hasDateRange, fromDate, toDate);
                    backupStatusText.textContent = `Latest backup: downloaded to device (${period})`;
                    if (deleteAfterBackup) {
                        entriesCache = null;
                        currentEntriesPage = 1;
                        await loadEntriesFromDB(true);
                        if (financeInsights.isVisible()) {
                            await loadAnalyticsData();
                        }
                        await Swal.fire("Backup completed", `Backup path unavailable. Backup downloaded to your device (${period}).`, "success");
                    } else {
                        await Swal.fire("Backup completed", `Backup path unavailable. Backup downloaded to your device (${period}).`, "success");
                    }
                    return;
                } catch (downloadErr) {
                    console.error(downloadErr);
                    Swal.fire("Backup failed", downloadErr.message || "Could not download backup.", "error");
                    return;
                }
            }
            console.error(error);
            Swal.fire("Backup failed", error.message || "Could not create backup.", "error");
        }
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    async function showUserDetailsPopup() {
        if (!loggedInUser) {
            return;
        }

        const nameRaw = String(loggedInUser.full_name || "").trim();
        const nameText = escapeHtml(nameRaw || "-");
        const emailText = escapeHtml(loggedInUser.email || "-");
        const roleRaw = normalizeRole(loggedInUser.role || "user");
        const roleText = escapeHtml(String(roleRaw).replace(/[_-]+/g, " ").replace(/\b\w/g, (match) => match.toUpperCase()));
        const initials = escapeHtml(
            (nameRaw || "User")
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0].toUpperCase())
                .join("") || "U"
        );

        await Swal.fire({
            title: "",
            html: `
                <section class="user-profile-card" aria-label="User details">
                    <header class="user-profile-head">
                        <div class="user-profile-head-main">
                            <div class="user-profile-avatar" aria-hidden="true">${initials}</div>
                            <div class="user-profile-meta">
                                <h3 class="user-profile-title">${nameText}</h3>
                                <p class="user-profile-subtitle">Account Overview</p>
                                <span class="user-profile-role">${roleText}</span>
                            </div>
                        </div>
                        <button type="button" class="user-profile-logout-icon-btn" aria-label="Logout" title="Logout">
                            <img class="user-profile-logout-icon" src="assets/icons/logout.png" alt="" loading="lazy">
                        </button>
                    </header>
                    <div class="user-profile-grid">
                        <div class="user-profile-row">
                            <span class="user-profile-label">Name</span>
                            <span class="user-profile-value">${nameText}</span>
                        </div>
                        <div class="user-profile-row">
                            <span class="user-profile-label">Email</span>
                            <span class="user-profile-value user-profile-email">${emailText}</span>
                        </div>
                        <div class="user-profile-row">
                            <span class="user-profile-label">Role</span>
                            <span class="user-profile-value">${roleText}</span>
                        </div>
                    </div>
                </section>
            `,
            showConfirmButton: false,
            showDenyButton: false,
            showCancelButton: false,
            showCloseButton: true,
            customClass: {
                popup: "swal-user-profile-popup",
                htmlContainer: "swal-user-profile-html",
                closeButton: "swal-user-profile-top-close"
            },
            didOpen: (popup) => {
                const logoutIconBtn = popup.querySelector(".user-profile-logout-icon-btn");
                if (logoutIconBtn) {
                    logoutIconBtn.addEventListener("click", async () => {
                        Swal.close();
                        await logout();
                    });
                }
            }
        });
    }

    async function showAboutPopup() {
        await Swal.fire({
            title: "About Expenditure Tracker",
            icon: "info",
            confirmButtonText: "Close",
            html: `
                <div style="text-align:left; line-height:1.55;">
                    <p><strong>Application:</strong> Library Expenditure Tracker</p>
                    <p><strong>Version:</strong> v${APP_VERSION}</p>
                    <p>Manage income, expenditure, insights, backup, import/export, and Tally XML from one workspace.</p>
                </div>
            `
        });
    }
    async function logout() {
        try {
            await apiFetch("api/auth/logout.php", { method: "POST" });
        } catch (error) {
            console.error(error);
        } finally {
            window.location.href = "login.html";
        }
    }

    function normalizeHeader(header) {
        return String(header || "")
            .trim()
            .toLowerCase()
            .replace(/[\s\-\/().]+/g, "_")
            .replace(/^_+|_+$/g, "");
    }

    function mapBackupRow(rawRow) {
        const mapped = {};
        Object.entries(rawRow || {}).forEach(([key, value]) => {
            mapped[normalizeHeader(key)] = value;
        });

        return {
            type: String(mapped.type || mapped.entry_type || "").trim(),
            date: String(mapped.date || mapped.entry_date || "").trim(),
            voucher_number: String(mapped.voucher_number || mapped.receipt_voucher_number || mapped.receipt_number || mapped.voucher_number_no || mapped.number || "").trim(),
            account_head: String(mapped.account_head || mapped.account || mapped.head || "").trim(),
            description: String(mapped.description || mapped.remarks || mapped.note || "").trim(),
            amount: String(mapped.amount || mapped.value || "").trim()
        };
    }

    async function readBackupRowsFromFile(file) {
        if (typeof XLSX === "undefined") {
            throw new Error("Spreadsheet parser is not available.");
        }

        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
            return [];
        }
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, {
            defval: "",
            raw: false,
            dateNF: "yyyy-mm-dd"
        });
        return rows.map(mapBackupRow).filter((row) => {
            return row.type || row.date || row.voucher_number || row.account_head || row.description || row.amount;
        });
    }

    async function importBackupData() {
        if (!isAdministrator()) {
            Swal.fire("Not allowed", "Only administrators can import backup data.", "warning");
            return;
        }

        const file = backupFileInput.files && backupFileInput.files[0];
        if (!file) {
            Swal.fire("No file selected", "Please choose a CSV or Excel file to import.", "warning");
            return;
        }

        try {
            const rows = await readBackupRowsFromFile(file);
            if (rows.length === 0) {
                Swal.fire("No data found", "The selected file does not contain any importable rows.", "warning");
                return;
            }

            const confirmResult = await Swal.fire({
                title: "Import backup data?",
                text: `Found ${rows.length} rows in "${file.name}". Do you want to import now?`,
                icon: "question",
                showCancelButton: true,
                confirmButtonText: "Import"
            });
            if (!confirmResult.isConfirmed) {
                return;
            }

            const response = await apiFetch("api/import_entries.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ entries: rows })
            });
            const payload = await response.json();
            if (payload.status !== "success") {
                throw new Error(payload.message || "Import failed.");
            }

            entriesCache = null;
            await loadEntriesFromDB(true);
            if (financeInsights.isVisible()) {
                await loadAnalyticsData();
            }

            const stats = payload.stats || {};
            const errors = Array.isArray(payload.errors) ? payload.errors : [];
            const errorPreview = errors.slice(0, 5).map((error) => `Row ${error.row}: ${error.message}`).join("<br>");
            await Swal.fire({
                title: "Import completed",
                icon: "success",
                html: `
                    <div style="text-align:left;">
                        <p><strong>Inserted:</strong> ${Number(stats.inserted || 0)}</p>
                        <p><strong>Skipped duplicates:</strong> ${Number(stats.duplicates || 0)}</p>
                        <p><strong>Invalid rows:</strong> ${Number(stats.invalid || 0)}</p>
                        <p><strong>Errors:</strong> ${Number(stats.errors || 0)}</p>
                        ${errorPreview ? `<p style="margin-top:10px;"><strong>Sample issues:</strong><br>${errorPreview}</p>` : ""}
                    </div>
                `
            });
        } catch (error) {
            console.error(error);
            Swal.fire("Import failed", error.message || "Could not import backup file.", "error");
        }
    }

    addEntryBtn.addEventListener("click", addEntry);
    clearEntryBtn.addEventListener("click", clearEntryForm);
    homeBtn.addEventListener("click", (event) => {
        event.preventDefault();
        showHomeSection();
    });
    analyticsBtn.addEventListener("click", async (event) => {
        event.preventDefault();
        await showAnalyticsSection();
    });
    if (headerUserBtn) {
        headerUserBtn.addEventListener("click", showUserDetailsPopup);
    }
    if (headerAboutBtn) {
        headerAboutBtn.addEventListener("click", showAboutPopup);
    }
    openUserManagementBtn.addEventListener("click", (event) => {
        event.preventDefault();
        showUserManagementSection();
    });
    backupBtn.addEventListener("click", (event) => {
        event.preventDefault();
        showBackupSection();
        loadBackupPathSettings();
    });
    sidebarToggleBtn.addEventListener("click", toggleSidebar);
    typeSelect.addEventListener("change", updateVoucherLabel);
    accountHeadSelect.addEventListener("change", toggleNewHeadInput);
    etSearch.addEventListener("input", () => {
        currentEntriesPage = 1;
        loadEntriesFromDB();
    });
    etTypeFilter.addEventListener("change", () => {
        currentEntriesPage = 1;
        loadEntriesFromDB();
    });
    etHeadFilter.addEventListener("input", () => {
        currentEntriesPage = 1;
        loadEntriesFromDB();
    });
    etFromDate.addEventListener("change", () => {
        currentEntriesPage = 1;
        loadEntriesFromDB();
    });
    etToDate.addEventListener("change", () => {
        currentEntriesPage = 1;
        loadEntriesFromDB();
    });
    etClearFilters.addEventListener("click", clearEntriesFilters);
    entriesPerPageSelect.addEventListener("change", () => {
        entriesPerPage = Number(entriesPerPageSelect.value) || 15;
        currentEntriesPage = 1;
        loadEntriesFromDB();
    });
    backupFileInput.addEventListener("change", () => {
        const file = backupFileInput.files && backupFileInput.files[0];
        backupSelectedFile.textContent = file ? `Selected file: ${file.name}` : "No file selected.";
    });
    backupSelectAll.addEventListener("change", toggleBackupDateInputs);
    saveBackupPathBtn.addEventListener("click", saveBackupPath);
    backupOnlyBtn.addEventListener("click", () => createBackup(false));
    exportTallyBtn.addEventListener("click", exportTallyData);
    backupAndDeleteBtn.addEventListener("click", () => createBackup(true));
    importBackupBtn.addEventListener("click", importBackupData);
    financeInsights.init(async () => {
        if (!financeInsights.isVisible()) {
            return;
        }
        await loadAnalyticsData();
    });
    userManagement.init();

    setTodayDate();
    updateVoucherLabel();
    toggleNewHeadInput();
    toggleBackupDateInputs();
    loadBackupPathSettings();
    ensureAuthenticated()
        .then(() => {
            applyRoleRestrictions();
        })
        .catch(() => {
            window.location.href = "login.html";
        });
});


