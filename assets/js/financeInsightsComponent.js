class FinanceInsightsComponent {
    constructor(options) {
        this.panel = options.panel;
        this.monthlyTabBtn = options.monthlyTabBtn;
        this.fyTabBtn = options.fyTabBtn;
        this.monthlyView = options.monthlyView;
        this.fyView = options.fyView;
        this.monthInput = options.monthInput;
        this.financialYearSelect = options.financialYearSelect;

        this.chartInstances = {};
        this.chartColors = [
            "#303f9f", "#1976d2", "#2e7d32", "#00838f", "#7b1fa2", "#ef6c00",
            "#6d4c41", "#546e7a", "#5e35b1", "#00897b", "#3949ab", "#c62828"
        ];
    }

    init(onFilterChange) {
        this.onFilterChange = onFilterChange;

        if (this.monthInput) {
            this.monthInput.addEventListener("change", onFilterChange);
        }
        if (this.financialYearSelect) {
            this.financialYearSelect.addEventListener("change", onFilterChange);
        }
        if (this.monthlyTabBtn) {
            this.monthlyTabBtn.addEventListener("click", () => this.switchView("monthly"));
        }
        if (this.fyTabBtn) {
            this.fyTabBtn.addEventListener("click", () => this.switchView("fy"));
        }
    }

    show() {
        this.panel.classList.remove("hidden");
    }

    hide() {
        this.panel.classList.add("hidden");
    }

    isVisible() {
        return !this.panel.classList.contains("hidden");
    }

    animateView(viewElement) {
        if (!viewElement) {
            return;
        }
        viewElement.classList.remove("analytics-view-animate");
        void viewElement.offsetWidth;
        viewElement.classList.add("analytics-view-animate");
    }

    switchView(viewType) {
        const showMonthly = viewType === "monthly";
        this.monthlyView.classList.toggle("hidden", !showMonthly);
        this.fyView.classList.toggle("hidden", showMonthly);
        this.monthlyTabBtn.classList.toggle("active", showMonthly);
        this.fyTabBtn.classList.toggle("active", !showMonthly);
        this.monthlyTabBtn.setAttribute("aria-selected", String(showMonthly));
        this.fyTabBtn.setAttribute("aria-selected", String(!showMonthly));
        this.animateView(showMonthly ? this.monthlyView : this.fyView);
    }

    render(entries) {
        this.setDefaultAnalyticsMonth();
        this.populateFinancialYearOptions(entries);

        const selectedMonth = this.monthInput.value;
        const selectedFyStart = Number(this.financialYearSelect.value);

        const monthFilter = (dateValue) =>
            typeof dateValue === "string" && dateValue.startsWith(`${selectedMonth}-`);
        const fyFilter = (dateValue) => this.getFinancialYearStart(dateValue) === selectedFyStart;

        const monthlyIncome = this.aggregateByAccountHead(entries, "Income", monthFilter);
        const monthlyExpense = this.aggregateByAccountHead(entries, "Expenditure", monthFilter);
        const fyIncome = this.aggregateByAccountHead(entries, "Income", fyFilter);
        const fyExpense = this.aggregateByAccountHead(entries, "Expenditure", fyFilter);

        this.renderPieChart("monthlyIncomeChart", "monthlyIncomeEmpty", "monthlyIncomeBreakdown", "monthlyIncomeTotal", monthlyIncome, "Income by Account Head", "Total Income");
        this.renderPieChart("monthlyExpenseChart", "monthlyExpenseEmpty", "monthlyExpenseBreakdown", "monthlyExpenseTotal", monthlyExpense, "Expenditure by Account Head", "Total Expenditure");
        this.renderPieChart("fyIncomeChart", "fyIncomeEmpty", "fyIncomeBreakdown", "fyIncomeTotal", fyIncome, "Income by Account Head", "Total Income");
        this.renderPieChart("fyExpenseChart", "fyExpenseEmpty", "fyExpenseBreakdown", "fyExpenseTotal", fyExpense, "Expenditure by Account Head", "Total Expenditure");

        this.renderFinancialMetrics("monthlyMetrics", monthlyIncome, monthlyExpense);
        this.renderFinancialMetrics("fyMetrics", fyIncome, fyExpense);
    }

    renderFromPayload(payload) {
        this.setDefaultAnalyticsMonth();
        if (payload && payload.selected_month) {
            this.monthInput.value = payload.selected_month;
        }

        this.setFinancialYearOptions(
            Array.isArray(payload?.fy_options) ? payload.fy_options : [],
            Number(payload?.selected_fy_start || 0)
        );

        const monthlyIncome = payload?.monthly_income || {};
        const monthlyExpense = payload?.monthly_expense || {};
        const fyIncome = payload?.fy_income || {};
        const fyExpense = payload?.fy_expense || {};

        this.renderPieChart("monthlyIncomeChart", "monthlyIncomeEmpty", "monthlyIncomeBreakdown", "monthlyIncomeTotal", monthlyIncome, "Income by Account Head", "Total Income");
        this.renderPieChart("monthlyExpenseChart", "monthlyExpenseEmpty", "monthlyExpenseBreakdown", "monthlyExpenseTotal", monthlyExpense, "Expenditure by Account Head", "Total Expenditure");
        this.renderPieChart("fyIncomeChart", "fyIncomeEmpty", "fyIncomeBreakdown", "fyIncomeTotal", fyIncome, "Income by Account Head", "Total Income");
        this.renderPieChart("fyExpenseChart", "fyExpenseEmpty", "fyExpenseBreakdown", "fyExpenseTotal", fyExpense, "Expenditure by Account Head", "Total Expenditure");

        this.renderFinancialMetrics("monthlyMetrics", monthlyIncome, monthlyExpense);
        this.renderFinancialMetrics("fyMetrics", fyIncome, fyExpense);
    }

    setDefaultAnalyticsMonth() {
        if (!this.monthInput.value) {
            this.monthInput.value = new Date().toISOString().slice(0, 7);
        }
    }

    getFinancialYearStart(dateValue) {
        const parsed = new Date(`${dateValue}T00:00:00`);
        if (Number.isNaN(parsed.getTime())) {
            return null;
        }
        const year = parsed.getFullYear();
        const month = parsed.getMonth();
        return month >= 3 ? year : year - 1;
    }

    getFinancialYearLabel(startYear) {
        const shortEnd = String((startYear + 1) % 100).padStart(2, "0");
        return `FY ${startYear}-${shortEnd}`;
    }

    aggregateByAccountHead(entries, entryType, dateFilterFn) {
        const totals = {};
        entries.forEach((entry) => {
            if (entry.type !== entryType) {
                return;
            }
            if (!dateFilterFn(entry.date)) {
                return;
            }
            const head = entry.account_head || "Other";
            const amount = Number.parseFloat(entry.amount);
            if (!Number.isFinite(amount)) {
                return;
            }
            totals[head] = (totals[head] || 0) + amount;
        });
        return totals;
    }

    setChartVisibility(chartId, emptyId, hasData) {
        const canvas = document.getElementById(chartId);
        const emptyState = document.getElementById(emptyId);
        if (!canvas || !emptyState) {
            return;
        }
        canvas.classList.toggle("hidden", !hasData);
        emptyState.classList.toggle("hidden", hasData);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        }).format(amount);
    }

    formatPercent(value) {
        if (!Number.isFinite(value)) {
            return "N/A";
        }
        return `${value.toFixed(2)}%`;
    }

    getTotal(totalsMap) {
        return Object.values(totalsMap).reduce((sum, value) => sum + Number(value || 0), 0);
    }

    renderFinancialMetrics(containerId, incomeMap, expenseMap) {
        const container = document.getElementById(containerId);
        if (!container) {
            return;
        }

        const incomeTotal = this.getTotal(incomeMap);
        const expenseTotal = this.getTotal(expenseMap);
        const netBalance = incomeTotal - expenseTotal;
        const savingsRate = incomeTotal > 0 ? (netBalance / incomeTotal) * 100 : NaN;
        const expenseIncomeRatio = incomeTotal > 0 ? (expenseTotal / incomeTotal) * 100 : NaN;
        const avgIncomeHead = Object.keys(incomeMap).length > 0 ? incomeTotal / Object.keys(incomeMap).length : 0;
        const avgExpenseHead = Object.keys(expenseMap).length > 0 ? expenseTotal / Object.keys(expenseMap).length : 0;
        const netClass = netBalance >= 0 ? "metric-positive" : "metric-negative";
        const netLabel = netBalance >= 0 ? "Net Surplus" : "Net Deficit";

        container.innerHTML = `
            <h5 class="analytics-metrics-title">Key Financial Metrics</h5>
            <div class="analytics-metrics-grid">
                <div class="analytics-metric-item">
                    <span>Total Income</span>
                    <strong>${this.formatCurrency(incomeTotal)}</strong>
                </div>
                <div class="analytics-metric-item">
                    <span>Total Expenditure</span>
                    <strong>${this.formatCurrency(expenseTotal)}</strong>
                </div>
                <div class="analytics-metric-item ${netClass}">
                    <span>${netLabel}</span>
                    <strong>${this.formatCurrency(Math.abs(netBalance))}</strong>
                </div>
                <div class="analytics-metric-item">
                    <span>Savings Rate</span>
                    <strong>${this.formatPercent(savingsRate)}</strong>
                </div>
                <div class="analytics-metric-item">
                    <span>Expense/Income Ratio</span>
                    <strong>${this.formatPercent(expenseIncomeRatio)}</strong>
                </div>
                <div class="analytics-metric-item">
                    <span>Avg Income / Head</span>
                    <strong>${this.formatCurrency(avgIncomeHead)}</strong>
                </div>
                <div class="analytics-metric-item">
                    <span>Avg Expense / Head</span>
                    <strong>${this.formatCurrency(avgExpenseHead)}</strong>
                </div>
            </div>
        `;
    }

    renderBreakdown(breakdownId, totalId, labels, values, totalLabel) {
        const breakdownList = document.getElementById(breakdownId);
        const totalElement = document.getElementById(totalId);
        if (!breakdownList || !totalElement) {
            return;
        }

        breakdownList.innerHTML = "";
        if (labels.length === 0) {
            totalElement.textContent = `${totalLabel}: ${this.formatCurrency(0)}`;
            return;
        }

        labels.forEach((label, index) => {
            const item = document.createElement("li");
            const value = values[index];
            item.innerHTML = `<span>${label}</span><strong>${this.formatCurrency(value)}</strong>`;
            breakdownList.appendChild(item);
        });

        const total = values.reduce((sum, value) => sum + value, 0);
        totalElement.textContent = `${totalLabel}: ${this.formatCurrency(total)}`;
    }

    renderPieChart(chartId, emptyId, breakdownId, totalId, totalsMap, heading, totalLabel) {
        const labels = Object.keys(totalsMap);
        const values = labels.map((label) => Number(totalsMap[label].toFixed(2)));
        const hasData = values.length > 0;
        const rootStyles = getComputedStyle(document.documentElement);
        const chartTextColor = rootStyles.getPropertyValue("--text").trim() || "#e5ebf8";
        this.setChartVisibility(chartId, emptyId, hasData);
        this.renderBreakdown(breakdownId, totalId, labels, values, totalLabel);

        if (this.chartInstances[chartId]) {
            this.chartInstances[chartId].destroy();
            this.chartInstances[chartId] = null;
        }

        if (!hasData || typeof Chart === "undefined") {
            return;
        }

        const canvas = document.getElementById(chartId);
        this.chartInstances[chartId] = new Chart(canvas, {
            type: "pie",
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: labels.map((_, index) => this.chartColors[index % this.chartColors.length])
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1,
                color: chartTextColor,
                layout: {
                    padding: 8
                },
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            color: chartTextColor,
                            font: {
                                size: 12
                            },
                            boxWidth: 14,
                            boxHeight: 14,
                            padding: 12
                        }
                    },
                    tooltip: {
                        backgroundColor: "#0f1728",
                        titleColor: "#f3f7ff",
                        bodyColor: "#dbe6ff",
                        borderColor: "#32496f",
                        borderWidth: 1,
                        callbacks: {
                            label: (context) => {
                                const value = Number(context.parsed || 0);
                                return `${context.label}: ${this.formatCurrency(value)}`;
                            }
                        },
                        titleFont: {
                            size: 13
                        },
                        bodyFont: {
                            size: 12
                        }
                    },
                    title: {
                        display: true,
                        text: heading,
                        color: chartTextColor,
                        font: {
                            size: 14,
                            weight: "600"
                        },
                        padding: {
                            bottom: 10
                        }
                    }
                }
            }
        });
    }

    populateFinancialYearOptions(entries) {
        const selected = this.financialYearSelect.value;
        const years = new Set();
        entries.forEach((entry) => {
            const fyStart = this.getFinancialYearStart(entry.date);
            if (fyStart !== null) {
                years.add(fyStart);
            }
        });

        const now = new Date();
        const currentFyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        years.add(currentFyStart);

        const sortedYears = Array.from(years).sort((a, b) => b - a);
        this.financialYearSelect.innerHTML = "";
        sortedYears.forEach((startYear) => {
            const option = document.createElement("option");
            option.value = String(startYear);
            option.textContent = this.getFinancialYearLabel(startYear);
            this.financialYearSelect.appendChild(option);
        });

        if (selected && sortedYears.includes(Number(selected))) {
            this.financialYearSelect.value = selected;
            return;
        }
        this.financialYearSelect.value = String(currentFyStart);
    }

    setFinancialYearOptions(years, selectedYear) {
        if (!this.financialYearSelect) {
            return;
        }

        const currentSelected = this.financialYearSelect.value;
        const parsedYears = years
            .map((year) => Number(year))
            .filter((year) => Number.isFinite(year) && year > 0)
            .sort((a, b) => b - a);
        const uniqueYears = [...new Set(parsedYears)];

        this.financialYearSelect.innerHTML = "";
        uniqueYears.forEach((startYear) => {
            const option = document.createElement("option");
            option.value = String(startYear);
            option.textContent = this.getFinancialYearLabel(startYear);
            this.financialYearSelect.appendChild(option);
        });

        if (selectedYear && uniqueYears.includes(selectedYear)) {
            this.financialYearSelect.value = String(selectedYear);
            return;
        }

        if (currentSelected && uniqueYears.includes(Number(currentSelected))) {
            this.financialYearSelect.value = currentSelected;
            return;
        }

        if (uniqueYears.length > 0) {
            this.financialYearSelect.value = String(uniqueYears[0]);
        }
    }
}

window.FinanceInsightsComponent = FinanceInsightsComponent;

