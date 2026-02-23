class UserManagementComponent {
    constructor(options) {
        this.usersTableBody = options.usersTableBody;
        this.createUserBtn = options.createUserBtn;
        this.apiFetch = options.apiFetch;
        this.normalizeRole = options.normalizeRole;
        this.searchInput = options.searchInput;
        this.roleFilter = options.roleFilter;
        this.statusFilter = options.statusFilter;
        this.clearFiltersBtn = options.clearFiltersBtn;
        this.totalUsersEl = options.totalUsersEl;
        this.activeUsersEl = options.activeUsersEl;
        this.staffUsersEl = options.staffUsersEl;
        this.adminUsersEl = options.adminUsersEl;
        this.usersPagination = options.usersPagination;
        this.usersPerPageSelect = options.usersPerPageSelect;

        this.currentPage = 1;
        this.usersPerPage = Number(this.usersPerPageSelect?.value) || 15;
    }

    init() {
        this.createUserBtn.addEventListener("click", () => this.openCreateUserDialog());
        this.searchInput.addEventListener("input", () => this.applyFilters());
        this.roleFilter.addEventListener("change", () => this.applyFilters());
        this.statusFilter.addEventListener("change", () => this.applyFilters());
        this.clearFiltersBtn.addEventListener("click", () => this.clearFilters());
        this.usersPerPageSelect.addEventListener("change", () => {
            this.usersPerPage = Number(this.usersPerPageSelect.value) || 15;
            this.loadUsers(1);
        });
    }

    createActionButton(label, className, onClick) {
        const button = document.createElement("button");
        button.type = "button";
        const iconPath = className === "action-btn-edit" ? "assets/icons/pencil.png" : "";
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

    appendCell(row, value, label) {
        const cell = row.insertCell();
        cell.textContent = value;
        cell.setAttribute("data-label", label);
        return cell;
    }

    updateStats(summary) {
        this.totalUsersEl.textContent = String(Number(summary.total_users || 0));
        this.activeUsersEl.textContent = String(Number(summary.active_users || 0));
        this.staffUsersEl.textContent = String(Number(summary.staff_users || 0));
        this.adminUsersEl.textContent = String(Number(summary.admin_users || 0));
    }

    clearFilters() {
        this.searchInput.value = "";
        this.roleFilter.value = "all";
        this.statusFilter.value = "all";
        this.loadUsers(1);
    }

    applyFilters() {
        this.loadUsers(1);
    }

    renderUsersTable(users) {
        this.usersTableBody.innerHTML = "";
        users.forEach((user) => {
            const row = this.usersTableBody.insertRow();
            this.appendCell(row, user.full_name, "Name");
            this.appendCell(row, user.email, "Email");
            this.appendCell(row, this.normalizeRole(user.role), "Role");
            this.appendCell(row, String(Number(user.is_active) === 1 ? "Active" : "Inactive"), "Status");

            const actionsCell = row.insertCell();
            actionsCell.setAttribute("data-label", "Actions");
            actionsCell.appendChild(
                this.createActionButton("Edit User", "action-btn-edit", () => this.openEditUserDialog(user))
            );
        });
    }

    renderUsersPagination(totalItems) {
        const totalPages = Math.max(1, Math.ceil(totalItems / this.usersPerPage));
        this.currentPage = Math.min(this.currentPage, totalPages);

        if (totalItems <= this.usersPerPage) {
            this.usersPagination.innerHTML = "";
            return;
        }

        const pageNumbers = [];
        for (let page = 1; page <= totalPages; page += 1) {
            if (page === 1 || page === totalPages || Math.abs(page - this.currentPage) <= 1) {
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
                    class="btn btn-secondary pagination-btn pagination-page-btn ${page === this.currentPage ? "active" : ""}"
                    data-user-page="${page}"
                >
                    ${page}
                </button>
            `;
        }).join("");

        this.usersPagination.innerHTML = `
            <button id="usersPrevPage" class="btn btn-secondary pagination-btn" type="button" ${this.currentPage <= 1 ? "disabled" : ""}>Previous</button>
            <div class="pagination-pages">${pageButtonsHtml}</div>
            <span class="pagination-info">Page ${this.currentPage} of ${totalPages}</span>
            <button id="usersNextPage" class="btn btn-secondary pagination-btn" type="button" ${this.currentPage >= totalPages ? "disabled" : ""}>Next</button>
        `;

        const prevBtn = document.getElementById("usersPrevPage");
        const nextBtn = document.getElementById("usersNextPage");
        const pageButtons = this.usersPagination.querySelectorAll("[data-user-page]");
        prevBtn.addEventListener("click", () => {
            if (this.currentPage > 1) {
                this.loadUsers(this.currentPage - 1);
            }
        });
        nextBtn.addEventListener("click", () => {
            if (this.currentPage < totalPages) {
                this.loadUsers(this.currentPage + 1);
            }
        });
        pageButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const nextPage = Number(button.getAttribute("data-user-page"));
                if (Number.isFinite(nextPage) && nextPage !== this.currentPage) {
                    this.loadUsers(nextPage);
                }
            });
        });
    }

    async loadUsers(page = this.currentPage) {
        try {
            this.currentPage = Math.max(1, Number(page) || 1);
            const params = new URLSearchParams();
            params.set("mode", "table");
            params.set("page", String(this.currentPage));
            params.set("limit", String(this.usersPerPage));
            params.set("search", this.searchInput.value.trim());
            params.set("role", this.roleFilter.value);
            params.set("status", this.statusFilter.value);

            const response = await this.apiFetch(`api/auth/list_users.php?${params.toString()}`);
            const payload = await response.json();
            if (payload.status !== "success") {
                throw new Error(payload.message || "Failed to load users.");
            }

            this.currentPage = Number(payload.page || this.currentPage);
            this.renderUsersTable(payload.users || []);
            this.updateStats(payload.summary || {});
            this.renderUsersPagination(Number(payload.total_items || 0));
        } catch (error) {
            console.error(error);
            Swal.fire("Error", "Failed to load users.", "error");
        }
    }

    async openCreateUserDialog() {
        const result = await Swal.fire({
            title: "Create User",
            html: `
                <div class="swal-user-form">
                    <div class="swal-user-field">
                        <label for="userFullName">Full Name</label>
                        <input id="userFullName" type="text" autocomplete="off" placeholder="Enter full name">
                    </div>
                    <div class="swal-user-field">
                        <label for="userEmail">Email</label>
                        <input id="userEmail" type="email" autocomplete="off" placeholder="name@example.com">
                    </div>
                    <div class="swal-user-field">
                        <label for="userPassword">Password</label>
                        <input id="userPassword" type="password" autocomplete="new-password" placeholder="Minimum 8 characters">
                    </div>
                    <p class="swal-form-note">New users are created as <strong>staff</strong>.</p>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: "Create",
            customClass: {
                popup: "swal-popup-minimal",
                confirmButton: "swal-btn-confirm",
                cancelButton: "swal-btn-cancel"
            },
            didOpen: () => {
                const fullNameInput = document.getElementById("userFullName");
                const emailInput = document.getElementById("userEmail");
                const passwordInput = document.getElementById("userPassword");
                fullNameInput.value = "";
                emailInput.value = "";
                passwordInput.value = "";
            },
            preConfirm: () => {
                return {
                    full_name: document.getElementById("userFullName").value.trim(),
                    email: document.getElementById("userEmail").value.trim(),
                    password: document.getElementById("userPassword").value,
                    role: "staff"
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

        const response = await this.apiFetch("api/auth/signup.php", { method: "POST", body: formData });
        const payload = await response.json();
        if (payload.status !== "success") {
            Swal.fire("Error", payload.message || "Failed to create user.", "error");
            return;
        }

        Swal.fire("Created", "User account created successfully.", "success");
        await this.loadUsers();
    }

    async openEditUserDialog(user) {
        const result = await Swal.fire({
            title: "Edit User",
            html: `
                <div class="swal-user-form">
                    <div class="swal-user-field">
                        <label for="editUserFullName">Full Name</label>
                        <input id="editUserFullName" type="text" value="${user.full_name}">
                    </div>
                    <div class="swal-user-field">
                        <label for="editUserEmail">Email</label>
                        <input id="editUserEmail" type="email" value="${user.email}">
                    </div>
                    <div class="swal-user-field">
                        <label for="editUserRole">Role</label>
                        <select id="editUserRole">
                            <option value="staff" ${this.normalizeRole(user.role) === "staff" ? "selected" : ""}>staff</option>
                            <option value="administrator" ${this.normalizeRole(user.role) === "administrator" ? "selected" : ""}>administrator</option>
                        </select>
                    </div>
                    <div class="swal-user-field">
                        <label for="editUserStatus">Status</label>
                        <select id="editUserStatus">
                            <option value="1" ${Number(user.is_active) === 1 ? "selected" : ""}>Active</option>
                            <option value="0" ${Number(user.is_active) !== 1 ? "selected" : ""}>Inactive</option>
                        </select>
                    </div>
                    <div class="swal-user-field">
                        <label for="editUserPassword">New Password (optional)</label>
                        <input id="editUserPassword" type="password" autocomplete="new-password" placeholder="Leave blank to keep unchanged">
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: "Save",
            focusConfirm: false,
            customClass: {
                popup: "swal-popup-minimal",
                confirmButton: "swal-btn-confirm",
                cancelButton: "swal-btn-cancel"
            },
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

        const response = await this.apiFetch("api/auth/update_user.php", {
            method: "POST",
            body: formData
        });
        const payload = await response.json();
        if (payload.status !== "success") {
            Swal.fire("Error", payload.message || "Failed to update user.", "error");
            return;
        }

        Swal.fire("Updated", "User details updated successfully.", "success");
        await this.loadUsers();
    }
}

window.UserManagementComponent = UserManagementComponent;
