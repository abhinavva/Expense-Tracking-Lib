(() => {
    const THEME_STORAGE_KEY = "expense_tracker_theme";
    const THEME_DARK = "dark";
    const THEME_LIGHT = "light";

    function getStoredTheme() {
        try {
            const stored = localStorage.getItem(THEME_STORAGE_KEY);
            if (stored === THEME_DARK || stored === THEME_LIGHT) {
                return stored;
            }
        } catch (error) {
            // Ignore storage access issues and fall back to dark theme.
        }
        return THEME_DARK;
    }

    function getNextTheme(theme) {
        return theme === THEME_LIGHT ? THEME_DARK : THEME_LIGHT;
    }

    function updateThemeToggleButtons(theme) {
        const nextTheme = getNextTheme(theme);
        const nextLabel = nextTheme === THEME_LIGHT ? "Light mode" : "Dark mode";
        const stateLabel = theme === THEME_LIGHT ? "Light" : "Dark";

        document.querySelectorAll(".theme-toggle-btn").forEach((button) => {
            const textNode = button.querySelector(".theme-toggle-text");
            if (textNode) {
                textNode.textContent = `${stateLabel} Theme`;
            }
            button.setAttribute("aria-label", `Switch to ${nextLabel}`);
            button.setAttribute("aria-pressed", String(theme === THEME_LIGHT));
            button.dataset.nextTheme = nextTheme;
        });
    }

    function applyTheme(theme, persist = true) {
        const normalizedTheme = theme === THEME_LIGHT ? THEME_LIGHT : THEME_DARK;
        document.documentElement.setAttribute("data-theme", normalizedTheme);
        document.documentElement.style.colorScheme = normalizedTheme;

        if (persist) {
            try {
                localStorage.setItem(THEME_STORAGE_KEY, normalizedTheme);
            } catch (error) {
                // Ignore storage write failures.
            }
        }

        updateThemeToggleButtons(normalizedTheme);
    }

    function renderCommonHeader(hostElement) {
        const isAuthPage = document.body.classList.contains("auth-page");
        const eyebrowText = isAuthPage ? "Secure Access Portal" : "Library Finance Workspace";

        hostElement.innerHTML = `
            <header class="app-header common-app-header">
                <div class="common-header-inner">
                    <div class="common-brand-seal" aria-hidden="true">
                        <span class="common-brand-aura"></span>
                        <img class="common-brand-icon" src="assets/icons/wallet.png" alt="" loading="lazy">
                    </div>
                    <div class="common-brand">
                        <p class="common-eyebrow">${eyebrowText}</p>
                        <h1 class="common-title-main">Expenditure Tracker</h1>
                    </div>
                    <div class="common-header-meta" aria-label="Theme controls">
                        <button class="theme-toggle-btn" type="button" aria-pressed="false">
                            <span class="theme-toggle-knob" aria-hidden="true"></span>
                            <span class="theme-toggle-text">Dark Theme</span>
                        </button>
                    </div>
                </div>
            </header>
        `;
    }

    function bindThemeToggles() {
        document.querySelectorAll(".theme-toggle-btn").forEach((button) => {
            button.addEventListener("click", () => {
                const requestedTheme = button.dataset.nextTheme || getNextTheme(getStoredTheme());
                applyTheme(requestedTheme);
            });
        });
    }

    function initCommonHeaders() {
        const hosts = document.querySelectorAll("[data-common-header]");
        hosts.forEach((host) => renderCommonHeader(host));
        bindThemeToggles();
        applyTheme(getStoredTheme(), false);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initCommonHeaders);
    } else {
        initCommonHeaders();
    }
})();
