(() => {
    function renderCommonHeader(hostElement) {
        hostElement.innerHTML = `
            <header class="app-header common-app-header">
                <div class="common-header-inner">
                    <div class="common-brand">
                        <h1 class="common-title-main">Expenditure Tracker</h1>
                    </div>
                </div>
            </header>
        `;
    }

    function initCommonHeaders() {
        const hosts = document.querySelectorAll("[data-common-header]");
        hosts.forEach((host) => renderCommonHeader(host));
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initCommonHeaders);
    } else {
        initCommonHeaders();
    }
})();
