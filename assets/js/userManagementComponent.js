class UserManagementComponent {
    constructor(options) {
        this.usersTableBody = options.usersTableBody;
        this.createUserBtn = options.createUserBtn;
        this.apiFetch = options.apiFetch;
        this.normalizeRole = options.normalizeRole;
    }

    init() {
        this.createUserBtn.addEventListener("click", () => this.openCreateUserDialog());
    }

    createActionButton(label, className, onClick) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
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

    async loadUsers() {
        try {
            const response = await this.apiFetch("api/auth/list_users.php");
            const payload = await response.json();
            this.usersTableBody.innerHTML = "";

            (payload.users || []).forEach((user) => {
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
