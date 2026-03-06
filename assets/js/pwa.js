(() => {
    const INSTALL_EVENT_NAME = "expense-tracker-install-available";
    let deferredInstallPrompt = null;

    window.addEventListener("beforeinstallprompt", (event) => {
        event.preventDefault();
        deferredInstallPrompt = event;
        window.dispatchEvent(new CustomEvent(INSTALL_EVENT_NAME));
    });

    window.addEventListener("appinstalled", () => {
        deferredInstallPrompt = null;
    });

    window.promptExpenseTrackerInstall = async () => {
        if (!deferredInstallPrompt) {
            return false;
        }

        deferredInstallPrompt.prompt();
        const result = await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        return result && result.outcome === "accepted";
    };

    if (!("serviceWorker" in navigator)) {
        return;
    }

    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (!(window.isSecureContext || isLocalhost)) {
        return;
    }

    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").catch((error) => {
            console.error("Service worker registration failed:", error);
        });
    });
})();
