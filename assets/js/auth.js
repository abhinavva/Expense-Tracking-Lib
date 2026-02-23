document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");

    async function checkExistingSession() {
        const response = await fetch("api/auth/me.php", { credentials: "same-origin" });
        if (!response.ok) {
            return;
        }

        const data = await response.json();
        if (data.status === "success") {
            window.location.href = "index.html";
        }
    }

    async function authRequest(url, formData) {
        const response = await fetch(url, {
            method: "POST",
            body: formData,
            credentials: "same-origin"
        });

        const data = await response.json();
        if (!response.ok || data.status !== "success") {
            throw new Error(data.message || "Authentication request failed");
        }

        return data;
    }

    if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const formData = new FormData();
            formData.append("email", document.getElementById("email").value.trim());
            formData.append("password", document.getElementById("password").value);

            try {
                await authRequest("api/auth/login.php", formData);
                window.location.href = "index.html";
            } catch (error) {
                Swal.fire("Login failed", error.message, "error");
            }
        });
    }

    if (signupForm) {
        signupForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const formData = new FormData();
            formData.append("full_name", document.getElementById("fullName").value.trim());
            formData.append("email", document.getElementById("email").value.trim());
            formData.append("password", document.getElementById("password").value);

            try {
                await authRequest("api/auth/signup.php", formData);
                window.location.href = "index.html";
            } catch (error) {
                Swal.fire("Signup failed", error.message, "error");
            }
        });
    }

    checkExistingSession().catch(() => {});
});
