document.addEventListener("DOMContentLoaded", () => {
    const entryForm = document.getElementById("entryForm");
    const entryCard = document.getElementById("entryCard");
    const addEntryBtn = document.getElementById("addEntryBtn");
    const homeBtn = document.getElementById("homeBtn");
    const analyticsBtn = document.getElementById("analyticsBtn");
    const logoutBtn = document.getElementById("logoutBtn");
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
    const userManagementPanel = document.getElementById("userManagementPanel");
    const appSidebar = document.getElementById("appSidebar");
    const sidebarToggleBtn = document.getElementById("sidebarToggleBtn");
    const openUserManagementBtn = document.getElementById("openUserManagementBtn");
    const typeSelect = document.getElementById("type");
    const numberLabel = document.getElementById("numberLabel");
    const numberInput = document.getElementById("number");
    const accountHeadSelect = document.getElementById("accountHead");
    const newHeadContainer = document.getElementById("newHeadContainer");
    const newAccountHeadInput = document.getElementById("newAccountHead");
    const exportDateBtn = document.getElementById("exportDateBtn");
    const exportFrom = document.getElementById("exportFrom");
    const exportTo = document.getElementById("exportTo");
    const entriesPagination = document.getElementById("entriesPagination");
    const currentUserName = document.getElementById("currentUserName");
    const currentUserRole = document.getElementById("currentUserRole");

    let loggedInUser = null;
    let entriesCache = null;
    let currentEntriesPage = 1;
    const entriesPerPage = 10;
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
        normalizeRole
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
        [homeBtn, analyticsBtn, openUserManagementBtn].forEach((navItem) => {
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
            financeInsights.hide();
            homeBtn.classList.remove("hidden");
            openUserManagementBtn.classList.add("hidden");
            dataPanel.classList.remove("hidden");
            setActiveSidebarItem(homeBtn);
            loadEntriesFromDB();
            return;
        }

        financeInsights.hide();
        dataPanel.classList.remove("hidden");
        entryCard.classList.remove("hidden");
        userManagementPanel.classList.add("hidden");
        homeBtn.classList.remove("hidden");
        openUserManagementBtn.classList.remove("hidden");
        setActiveSidebarItem(homeBtn);
        loadEntriesFromDB();
    }

    function toggleSidebar() {
        document.body.classList.toggle("sidebar-collapsed");
        const isExpanded = !document.body.classList.contains("sidebar-collapsed");
        sidebarToggleBtn.setAttribute("aria-expanded", String(isExpanded));
    }

    async function showUserManagementSection() {
        if (!isAdministrator()) {
            return;
        }

        financeInsights.hide();
        dataPanel.classList.add("hidden");
        entryCard.classList.add("hidden");
        userManagementPanel.classList.remove("hidden");
        setActiveSidebarItem(openUserManagementBtn);
        await userManagement.loadUsers();
    }

    function showHomeSection() {
        if (!isAdministrator()) {
            financeInsights.hide();
            userManagementPanel.classList.add("hidden");
            entryCard.classList.add("hidden");
            dataPanel.classList.remove("hidden");
            setActiveSidebarItem(homeBtn);
            loadEntriesFromDB();
            return;
        }

        financeInsights.hide();
        dataPanel.classList.remove("hidden");
        userManagementPanel.classList.add("hidden");
        entryCard.classList.remove("hidden");
        setActiveSidebarItem(homeBtn);
        loadEntriesFromDB();
    }

    async function showAnalyticsSection() {
        if (isAdministrator()) {
            entryCard.classList.add("hidden");
            userManagementPanel.classList.add("hidden");
        }
        dataPanel.classList.add("hidden");
        financeInsights.show();
        setActiveSidebarItem(analyticsBtn);
        const entries = await getEntriesFromDB();
        financeInsights.render(entries);
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

    function createActionButton(label, className, onClick) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
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

    async function loadEntriesFromDB(forceRefresh = false) {
        try {
            const entries = await getEntriesFromDB(forceRefresh);
            tableBody.innerHTML = "";
            const totalItems = entries.length;
            const totalPages = Math.max(1, Math.ceil(totalItems / entriesPerPage));
            currentEntriesPage = Math.min(currentEntriesPage, totalPages);
            const start = (currentEntriesPage - 1) * entriesPerPage;
            const pageEntries = entries.slice(start, start + entriesPerPage);

            pageEntries.forEach((entry, index) => {
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
                const entries = await getEntriesFromDB(true);
                financeInsights.render(entries);
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
                    const entries = await getEntriesFromDB();
                    financeInsights.render(entries);
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
                    const entries = await getEntriesFromDB();
                    financeInsights.render(entries);
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

    async function exportEntriesByDate() {
        const fromDate = exportFrom.value;
        const toDate = exportTo.value;

        if (!fromDate || !toDate) {
            Swal.fire("Error", "Please select both From and To dates.", "warning");
            return;
        }

        try {
            const formData = new FormData();
            formData.append("from_date", fromDate);
            formData.append("to_date", toDate);

            const response = await apiFetch("api/export_entries.php", {
                method: "POST",
                body: formData
            });

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = `entries_${fromDate}_to_${toDate}.csv`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            if (error.message !== "Unauthorized") {
                console.error(error);
                Swal.fire("Error", "Failed to export data.", "error");
            }
        }
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

    addEntryBtn.addEventListener("click", addEntry);
    homeBtn.addEventListener("click", (event) => {
        event.preventDefault();
        showHomeSection();
    });
    analyticsBtn.addEventListener("click", async (event) => {
        event.preventDefault();
        await showAnalyticsSection();
    });
    exportDateBtn.addEventListener("click", exportEntriesByDate);
    logoutBtn.addEventListener("click", (event) => {
        event.preventDefault();
        logout();
    });
    openUserManagementBtn.addEventListener("click", (event) => {
        event.preventDefault();
        showUserManagementSection();
    });
    sidebarToggleBtn.addEventListener("click", toggleSidebar);
    typeSelect.addEventListener("change", updateVoucherLabel);
    accountHeadSelect.addEventListener("change", toggleNewHeadInput);
    financeInsights.init(async () => {
        if (!financeInsights.isVisible()) {
            return;
        }
        const entries = await getEntriesFromDB();
        financeInsights.render(entries);
    });
    userManagement.init();

    setTodayDate();
    updateVoucherLabel();
    toggleNewHeadInput();
    ensureAuthenticated()
        .then(() => {
            applyRoleRestrictions();
        })
        .catch(() => {
            window.location.href = "login.html";
        });
});
