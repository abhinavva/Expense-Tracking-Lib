import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { FinanceInsightsResponse, FyMonthlyRow, FinanceService } from '../../core/services/finance.service';
import { SettingsService } from '../../core/services/settings.service';

interface BreakdownRow {
  label: string;
  value: number;
}

@Component({
  selector: 'app-finance-insights',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './finance-insights.component.html',
  styleUrl: './finance-insights.component.scss'
})
export class FinanceInsightsComponent {
  readonly loading = signal(false);
  readonly error = signal('');

  readonly activeView = signal<'monthly' | 'yearly'>('monthly');
  readonly selectedMonth = signal(this.defaultMonth());
  readonly selectedFyStart = signal<number | null>(null);

  readonly fyOptions = signal<number[]>([]);
  readonly payload = signal<FinanceInsightsResponse | null>(null);

  readonly incomeRows = computed(() => {
    const source = this.activeView() === 'monthly'
      ? this.payload()?.monthly_income ?? {}
      : this.payload()?.fy_income ?? {};
    return this.mapToRows(source);
  });

  readonly expenseRows = computed(() => {
    const source = this.activeView() === 'monthly'
      ? this.payload()?.monthly_expense ?? {}
      : this.payload()?.fy_expense ?? {};
    return this.mapToRows(source);
  });

  readonly totalIncome = computed(() => this.sumRows(this.incomeRows()));
  readonly totalExpense = computed(() => this.sumRows(this.expenseRows()));
  readonly netBalance = computed(() => this.totalIncome() - this.totalExpense());

  readonly savingsRate = computed(() => {
    const income = this.totalIncome();
    if (income <= 0) {
      return null;
    }
    return (this.netBalance() / income) * 100;
  });

  readonly expenseIncomeRatio = computed(() => {
    const income = this.totalIncome();
    if (income <= 0) {
      return null;
    }
    return (this.totalExpense() / income) * 100;
  });

  readonly avgExpensePerHead = computed(() => {
    const rows = this.expenseRows();
    if (rows.length === 0) {
      return 0;
    }
    return this.totalExpense() / rows.length;
  });

  readonly barSeries = computed(() => {
    const rows = [...this.incomeRows(), ...this.expenseRows()]
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const maxValue = rows.reduce((max, row) => Math.max(max, row.value), 0) || 1;

    return rows.map((row, index) => ({
      ...row,
      heightPct: Math.max(18, Math.round((row.value / maxValue) * 100)),
      tone: index % 4 === 0 ? 'primary' : index % 2 === 0 ? 'secondary' : 'neutral'
    }));
  });

  readonly topIncomeShare = computed(() => {
    const rows = this.incomeRows();
    const total = this.totalIncome();
    if (rows.length === 0 || total <= 0) {
      return 0;
    }

    return Math.round((rows[0].value / total) * 100);
  });

  readonly ringAngle = computed(() => {
    const share = this.topIncomeShare();
    return Math.max(8, Math.min(98, share));
  });

  readonly categoryRows = computed(() => {
    return this.expenseRows().map((row) => ({
      category: row.label,
      volume: Math.round(row.value / 100),
      efficiency: Math.max(15, Math.min(95, Math.round(100 - row.value / 100))),
      allocation: row.value
    }));
  });

  /** Month-wise bar chart for yearly view */
  readonly fyMonthlySeries = computed(() => {
    const rows = this.payload()?.fy_monthly ?? [];
    const maxVal = rows.reduce((m, r) => Math.max(m, r.income, r.expense), 0) || 1;
    return rows.map((r) => ({
      month: r.month,
      monthLabel: this.formatMonthLabel(r.month),
      income: r.income,
      expense: r.expense,
      incomePct: Math.max(4, Math.round((r.income / maxVal) * 100)),
      expensePct: Math.max(4, Math.round((r.expense / maxVal) * 100))
    }));
  });

  /** Item-wise (account head) bar chart for yearly view */
  readonly fyItemSeries = computed(() => {
    const incomeMap = this.payload()?.fy_income ?? {};
    const expenseMap = this.payload()?.fy_expense ?? {};

    const items: { label: string; type: 'income' | 'expense'; value: number }[] = [];
    for (const [label, value] of Object.entries(incomeMap)) {
      items.push({ label, type: 'income', value: Number(value || 0) });
    }
    for (const [label, value] of Object.entries(expenseMap)) {
      items.push({ label, type: 'expense', value: Number(value || 0) });
    }

    items.sort((a, b) => b.value - a.value);
    const top = items.slice(0, 12);
    const maxVal = top.reduce((m, r) => Math.max(m, r.value), 0) || 1;

    return top.map((r) => ({
      ...r,
      heightPct: Math.max(8, Math.round((r.value / maxVal) * 100))
    }));
  });

  constructor(
    private readonly financeService: FinanceService,
    private readonly settingsService: SettingsService
  ) {
    this.loadInsights();
  }

  switchView(view: 'monthly' | 'yearly'): void {
    this.activeView.set(view);
  }

  onMonthChange(monthValue: string): void {
    this.selectedMonth.set(monthValue);
    this.loadInsights();
  }

  onFyChange(value: number): void {
    this.selectedFyStart.set(value);
    this.loadInsights();
  }

  loadInsights(): void {
    this.loading.set(true);
    this.error.set('');

    this.financeService
      .getInsights(this.selectedMonth(), this.selectedFyStart() ?? undefined)
      .subscribe({
        next: (payload) => {
          this.loading.set(false);
          if (payload.status !== 'success') {
            this.error.set(payload.message || 'Failed to load insights.');
            return;
          }

          this.payload.set(payload);
          this.fyOptions.set(payload.fy_options ?? []);
          this.selectedFyStart.set(payload.selected_fy_start || null);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err.message || 'Failed to load insights.');
        }
      });
  }

  formatCurrency(value: number): string {
    return this.settingsService.formatCurrency(value);
  }

  formatPercent(value: number | null): string {
    if (value === null || !Number.isFinite(value)) {
      return 'N/A';
    }
    return `${value.toFixed(1)}%`;
  }

  allocationPercent(value: number): string {
    const total = this.totalIncome();
    if (total <= 0) {
      return '0%';
    }

    return `${Math.round((value / total) * 100)}%`;
  }

  private defaultMonth(): string {
    return new Date().toISOString().slice(0, 7);
  }

  formatMonthLabel(yyyyMm: string): string {
    const [y, m] = yyyyMm.split('-');
    const date = new Date(+y, +m - 1);
    return date.toLocaleString('default', { month: 'short' });
  }

  private mapToRows(map: Record<string, number>): BreakdownRow[] {
    return Object.entries(map)
      .map(([label, value]) => ({ label, value: Number(value || 0) }))
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value);
  }

  private sumRows(rows: BreakdownRow[]): number {
    return rows.reduce((sum, row) => sum + row.value, 0);
  }
}
