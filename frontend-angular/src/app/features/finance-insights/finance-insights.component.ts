import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { FinanceInsightsResponse, FinanceService } from '../../core/services/finance.service';

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

  constructor(private readonly financeService: FinanceService) {
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
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2
    }).format(value || 0);
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
