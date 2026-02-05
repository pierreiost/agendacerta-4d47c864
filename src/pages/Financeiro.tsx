import { useState } from "react";
import { useTabPersist } from "@/hooks/useTabPersist";
import { Plus, DollarSign } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FinancialSummary } from "@/components/financeiro/FinancialSummary";
import { CashFlowChart } from "@/components/financeiro/CashFlowChart";
import { ExpenseList } from "@/components/financeiro/ExpenseList";
import { RevenueList } from "@/components/financeiro/RevenueList";
import { ExpenseFormDialog } from "@/components/financeiro/ExpenseFormDialog";
import { useExpenses, EXPENSE_CATEGORIES, type ExpenseCategory } from "@/hooks/useExpenses";
import { useFinancialMetrics } from "@/hooks/useFinancialMetrics";
import { usePermissions } from "@/hooks/usePermissions";

export default function Financeiro() {
  const [period, setPeriod] = useState<"month" | "year">("month");
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending">("all");
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  
  const { activeTab, onTabChange } = useTabPersist({ key: 'financeiro', defaultValue: 'overview' });

  const { canCreate } = usePermissions("financeiro");

  const expenseFilters = {
    ...(categoryFilter !== "all" && { category: categoryFilter }),
    ...(statusFilter === "paid" && { isPaid: true }),
    ...(statusFilter === "pending" && { isPaid: false }),
  };

  const { expenses, isLoading: expensesLoading } = useExpenses(expenseFilters);
  const { data: metrics, isLoading: metricsLoading } = useFinancialMetrics(period);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie receitas, despesas e fluxo de caixa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={(v) => setPeriod(v as "month" | "year")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="year">Este ano</SelectItem>
              </SelectContent>
            </Select>

            {canCreate && (
              <Button onClick={() => setShowExpenseDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Despesa
              </Button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <FinancialSummary
          totalRevenue={metrics?.totalRevenue || 0}
          totalExpenses={metrics?.totalExpenses || 0}
          balance={metrics?.balance || 0}
          revenueChange={metrics?.revenueChange || 0}
          expenseChange={metrics?.expenseChange || 0}
          pendingExpenses={metrics?.pendingExpenses || 0}
          isLoading={metricsLoading}
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Resumo</TabsTrigger>
            <TabsTrigger value="revenue">Receitas</TabsTrigger>
            <TabsTrigger value="expenses">Despesas</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <CashFlowChart data={metrics?.monthlyData || []} isLoading={metricsLoading} />
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue">
            <RevenueList period={period} />
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <Select
                value={categoryFilter}
                onValueChange={(v) => setCategoryFilter(v as ExpenseCategory | "all")}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as "all" | "paid" | "pending")}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="paid">Pagos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ExpenseList expenses={expenses} isLoading={expensesLoading} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Expense Form Dialog */}
      <ExpenseFormDialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog} />
    </AppLayout>
  );
}
