(() => {
    function renderCommonHeader(hostElement) {
        hostElement.innerHTML = `
            <header class="app-header common-app-header">
                <h1 class="app-title-local">കാട്ടൂർ ഗ്രാമീണ വായനശാല</h1>
                <h2 class="app-title">Library Income & Expenditure Tracker</h2>
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
