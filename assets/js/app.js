document.addEventListener("DOMContentLoaded", () => {
    const entryForm = document.getElementById("entryForm");
    const entryCard = document.getElementById("entryCard");
    const addEntryBtn = document.getElementById("addEntryBtn");
    const viewBtn = document.getElementById("viewBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const dataPanel = document.getElementById("dataPanel");
    const tableBody = document.querySelector("#entriesTable tbody");
    const usersTableBody = document.querySelector("#usersTable tbody");
    const createUserBtn = document.getElementById("createUserBtn");
    const userManagementPanel = document.getElementById("userManagementPanel");
    const typeSelect = document.getElementById("type");
    const numberLabel = document.getElementById("numberLabel");
    const numberInput = document.getElementById("number");
    const accountHeadSelect = document.getElementById("accountHead");
    const newHeadContainer = document.getElementById("newHeadContainer");
    const newAccountHeadInput = document.getElementById("newAccountHead");
    const exportDateBtn = document.getElementById("exportDateBtn");
    const exportFrom = document.getElementById("exportFrom");
    const exportTo = document.getElementById("exportTo");
    const currentUserName = document.getElementById("currentUserName");
    const currentUserRole = document.getElementById("currentUserRole");

    let loggedInUser = null;

    function normalizeRole(role) {
        if (role === "admin") {
            return "administrator";
        }
        return role;
    }

    function isAdministrator() {
        return loggedInUser && normalizeRole(loggedInUser.role) === "administrator";
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
        if (!isAdministrator()) {
            entryCard.classList.add("hidden");
            userManagementPanel.classList.add("hidden");
            return;
        }

        entryCard.classList.remove("hidden");
        userManagementPanel.classList.remove("hidden");
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

    async function loadEntriesFromDB() {
        try {
            const response = await apiFetch("api/fetch_entries.php");
            const entries = await response.json();
            tableBody.innerHTML = "";

            entries.forEach((entry) => {
                const row = tableBody.insertRow();
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

            entryForm.reset();
            setTodayDate();
            newHeadContainer.classList.add("hidden");
            updateVoucherLabel();
            Swal.fire("Saved", "Entry added successfully.", "success");

            if (!dataPanel.classList.contains("hidden")) {
                await loadEntriesFromDB();
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
                Swal.fire("Deleted", res.message, "success");
                await loadEntriesFromDB();
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
                <div class="swal-form">
                    <label>Type</label>
                    <select id="swalType">
                        <option value="Income" ${entry.type === "Income" ? "selected" : ""}>Income</option>
                        <option value="Expenditure" ${entry.type === "Expenditure" ? "selected" : ""}>Expenditure</option>
                    </select>
                    <label>Date</label>
                    <input id="swalDate" type="date" value="${entry.date}">
                    <label>Voucher/Receipt Number</label>
                    <input id="swalNumber" type="text" value="${entry.voucher_number}">
                    <label>Account Head</label>
                    <input id="swalAccountHead" type="text" value="${entry.account_head}">
                    <label>Description</label>
                    <input id="swalDescription" type="text" value="${entry.description}">
                    <label>Amount (INR)</label>
                    <input id="swalAmount" type="number" step="0.01" value="${entry.amount}">
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
                Swal.fire("Updated", res.message, "success");
                await loadEntriesFromDB();
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

    async function loadUsers() {
        if (!isAdministrator()) {
            return;
        }

        try {
            const response = await apiFetch("api/auth/list_users.php");
            const payload = await response.json();
            usersTableBody.innerHTML = "";

            (payload.users || []).forEach((user) => {
                const row = usersTableBody.insertRow();
                appendCell(row, user.full_name, "Name");
                appendCell(row, user.email, "Email");
                appendCell(row, normalizeRole(user.role), "Role");
                appendCell(row, String(Number(user.is_active) === 1 ? "Active" : "Inactive"), "Status");

                const actionsCell = row.insertCell();
                actionsCell.setAttribute("data-label", "Actions");
                actionsCell.appendChild(
                    createActionButton("Edit User", "action-btn-edit", () => openEditUserDialog(user))
                );
            });
        } catch (error) {
            console.error(error);
            Swal.fire("Error", "Failed to load users.", "error");
        }
    }

    async function openCreateUserDialog() {
        const result = await Swal.fire({
            title: "Create User",
            html: `
                <label>Full Name</label>
                <input id="userFullName" type="text">
                <label>Email</label>
                <input id="userEmail" type="email">
                <label>Password</label>
                <input id="userPassword" type="password">
                <label>Role</label>
                <select id="userRole">
                    <option value="staff">staff</option>
                    <option value="administrator">administrator</option>
                </select>
            `,
            showCancelButton: true,
            confirmButtonText: "Create",
            preConfirm: () => {
                return {
                    full_name: document.getElementById("userFullName").value.trim(),
                    email: document.getElementById("userEmail").value.trim(),
                    password: document.getElementById("userPassword").value,
                    role: document.getElementById("userRole").value
                };
            }
        });

        if (!result.isConfirmed) {
            return;
        }

        const data = result.value;
        if (!data.full_name || !data.email || !data.password) {
            Swal.fire("Missing fields", "All fields are required.", "warning");
            return;
        }

        const formData = new FormData();
        formData.append("full_name", data.full_name);
        formData.append("email", data.email);
        formData.append("password", data.password);
        formData.append("role", data.role);

        const response = await apiFetch("api/auth/signup.php", { method: "POST", body: formData });
        const payload = await response.json();
        if (payload.status !== "success") {
            Swal.fire("Error", payload.message || "Failed to create user.", "error");
            return;
        }

        Swal.fire("Created", "User account created successfully.", "success");
        await loadUsers();
    }

    async function openEditUserDialog(user) {
        const result = await Swal.fire({
            title: "Edit User",
            html: `
                <label>Full Name</label>
                <input id="editUserFullName" type="text" value="${user.full_name}">
                <label>Email</label>
                <input id="editUserEmail" type="email" value="${user.email}">
                <label>Role</label>
                <select id="editUserRole">
                    <option value="staff" ${normalizeRole(user.role) === "staff" ? "selected" : ""}>staff</option>
                    <option value="administrator" ${normalizeRole(user.role) === "administrator" ? "selected" : ""}>administrator</option>
                </select>
                <label>Status</label>
                <select id="editUserStatus">
                    <option value="1" ${Number(user.is_active) === 1 ? "selected" : ""}>Active</option>
                    <option value="0" ${Number(user.is_active) !== 1 ? "selected" : ""}>Inactive</option>
                </select>
                <label>New Password (optional)</label>
                <input id="editUserPassword" type="password" placeholder="Leave blank to keep unchanged">
            `,
            showCancelButton: true,
            confirmButtonText: "Save",
            preConfirm: () => {
                return {
                    user_id: user.id,
                    full_name: document.getElementById("editUserFullName").value.trim(),
                    email: document.getElementById("editUserEmail").value.trim(),
                    role: document.getElementById("editUserRole").value,
                    is_active: document.getElementById("editUserStatus").value,
                    password: document.getElementById("editUserPassword").value
                };
            }
        });

        if (!result.isConfirmed) {
            return;
        }

        const data = result.value;
        if (!data.full_name || !data.email) {
            Swal.fire("Missing fields", "Name and email are required.", "warning");
            return;
        }

        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => formData.append(key, value));

        const response = await apiFetch("api/auth/update_user.php", {
            method: "POST",
            body: formData
        });
        const payload = await response.json();
        if (payload.status !== "success") {
            Swal.fire("Error", payload.message || "Failed to update user.", "error");
            return;
        }

        Swal.fire("Updated", "User details updated successfully.", "success");
        await loadUsers();
    }

    function toggleDataPanel() {
        const isHidden = dataPanel.classList.contains("hidden");
        if (isHidden) {
            dataPanel.classList.remove("hidden");
            viewBtn.textContent = "Hide Entries";
            loadEntriesFromDB();
            return;
        }

        dataPanel.classList.add("hidden");
        viewBtn.textContent = "View Entries";
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
    viewBtn.addEventListener("click", toggleDataPanel);
    exportDateBtn.addEventListener("click", exportEntriesByDate);
    logoutBtn.addEventListener("click", logout);
    createUserBtn.addEventListener("click", openCreateUserDialog);
    typeSelect.addEventListener("change", updateVoucherLabel);
    accountHeadSelect.addEventListener("change", toggleNewHeadInput);

    setTodayDate();
    updateVoucherLabel();
    toggleNewHeadInput();
    ensureAuthenticated()
        .then(() => {
            applyRoleRestrictions();
            if (isAdministrator()) {
                loadUsers();
            }
        })
        .catch(() => {
            window.location.href = "login.html";
        });
});
