import { useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { formatRupiah } from "@/lib/format";
import { Package, TrendingUp, Landmark, Wallet, AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardPage() {
  const { data, isLoading, error } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-foreground">Dashboard</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-card-border rounded-xl p-5 animate-pulse">
              <div className="h-4 w-24 bg-muted rounded mb-3" />
              <div className="h-7 w-32 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 text-destructive bg-destructive/10 rounded-lg p-4">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <span className="text-sm font-medium">Gagal memuat data dashboard.</span>
      </div>
    );
  }

  const cards = [
    {
      label: "Nilai Stok",
      value: formatRupiah(data?.stock_value ?? 0),
      icon: Package,
      sub: `${data?.product_count ?? 0} produk · ${data?.low_stock_count ?? 0} stok rendah`,
      color: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
      iconBg: "bg-blue-100 dark:bg-blue-800",
    },
    {
      label: "Omzet",
      value: formatRupiah(data?.revenue ?? 0),
      icon: TrendingUp,
      sub: "Total pendapatan",
      color: "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400",
      iconBg: "bg-green-100 dark:bg-green-800",
    },
    {
      label: "Hutang Bank",
      value: formatRupiah(data?.total_bank_debt ?? 0),
      icon: Landmark,
      sub: "Sisa pokok + bunga",
      color: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400",
      iconBg: "bg-red-100 dark:bg-red-800",
    },
    {
      label: "Pengambilan Pribadi",
      value: formatRupiah(data?.total_owner_drawings ?? 0),
      icon: Wallet,
      sub: "Total penarikan pemilik",
      color: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
      iconBg: "bg-amber-100 dark:bg-amber-800",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Dashboard</h2>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <RefreshCw className="w-3.5 h-3.5" />
          Data real-time
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-card border border-card-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
              data-testid={`card-${card.label.toLowerCase().replace(/ /g, "-")}`}
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                <div className={`p-2 rounded-lg ${card.iconBg}`}>
                  <Icon className={`w-4 h-4 ${card.color.split(" ")[1]}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground tracking-tight">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {data && (data.low_stock_count ?? 0) > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Peringatan Stok Rendah</p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {data.low_stock_count} produk memiliki stok 5 unit atau kurang. Segera lakukan reorder.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
