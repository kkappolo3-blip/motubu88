import { useState } from "react";
import { formatRupiah, formatDateShort } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, CheckCircle2, Clock, ChevronRight, Banknote } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListInstallments,
  useGetInstallment,
  useAddInstallmentPayment,
  getListInstallmentsQueryKey,
  getGetInstallmentQueryKey,
} from "@workspace/api-client-react";
import type { Installment } from "@workspace/api-client-react";

function ProgressBar({ paid, total }: { paid: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-green-500" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatRupiah(paid)} terbayar</span>
        <span>{pct.toFixed(0)}%</span>
      </div>
    </div>
  );
}

function InstallmentDetailModal({ id, onClose }: { id: number; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: installment, isLoading } = useGetInstallment(id, { query: { queryKey: getGetInstallmentQueryKey(id) } });
  const addPayment = useAddInstallmentPayment();
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");

  async function handlePay() {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) return;

    try {
      await addPayment.mutateAsync({ id, data: { amount, note: payNote.trim() || null } });
      qc.invalidateQueries({ queryKey: getListInstallmentsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetInstallmentQueryKey(id) });
      setPayAmount("");
      setPayNote("");
      toast({ title: "Pembayaran berhasil dicatat" });
    } catch {
      toast({ title: "Gagal mencatat pembayaran", variant: "destructive" });
    }
  }

  if (isLoading || !installment) {
    return (
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Memuat...</DialogTitle></DialogHeader>
        <div className="space-y-3 animate-pulse">
          {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-muted rounded" />)}
        </div>
      </DialogContent>
    );
  }

  const paid = Number(installment.paid_amount);
  const total = Number(installment.total_amount);
  const remaining = total - paid;
  const isLunas = installment.status === "lunas";
  const payments = Array.isArray(installment.payments) ? installment.payments : [];
  const items = Array.isArray(installment.items) ? installment.items as Array<{ product_name: string; variant?: string | null; qty: number; custom_price: number }> : [];

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div>
            <DialogTitle className="text-lg">{installment.customer_name}</DialogTitle>
            <DialogDescription>
              Cicilan sejak {formatDateShort(installment.created_at)}
            </DialogDescription>
          </div>
          <Badge className={`ml-auto ${isLunas ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"}`}>
            {isLunas ? "✓ Lunas" : "Berjalan"}
          </Badge>
        </div>
      </DialogHeader>

      <div className="space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-muted-foreground text-xs">Total</p>
            <p className="font-bold">{formatRupiah(total)}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
            <p className="text-muted-foreground text-xs">Terbayar</p>
            <p className="font-bold text-green-600">{formatRupiah(paid)}</p>
          </div>
          <div className={`rounded-lg p-3 text-center ${isLunas ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
            <p className="text-muted-foreground text-xs">Sisa</p>
            <p className={`font-bold ${isLunas ? "text-green-600" : "text-destructive"}`}>{formatRupiah(remaining)}</p>
          </div>
        </div>

        <ProgressBar paid={paid} total={total} />

        {/* Items */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Daftar Barang</p>
          <div className="bg-muted/30 rounded-lg divide-y divide-border">
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{item.product_name}</span>
                  {item.variant && <span className="text-muted-foreground"> · {item.variant}</span>}
                  <span className="text-muted-foreground"> ×{item.qty}</span>
                </div>
                <span className="font-semibold">{formatRupiah(item.qty * item.custom_price)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Timeline */}
        {payments.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-foreground mb-3">Riwayat Pembayaran</p>
            <div className="relative">
              <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-4">
                {(payments as Array<{ date: string; amount: number; note?: string | null }>).map((p, i) => (
                  <div key={i} className="flex items-start gap-4 relative">
                    <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center z-10 shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1 pb-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">{formatRupiah(p.amount)}</p>
                        <p className="text-xs text-muted-foreground">{formatDateShort(p.date)}</p>
                      </div>
                      {p.note && <p className="text-xs text-muted-foreground mt-0.5">{p.note}</p>}
                    </div>
                  </div>
                ))}

                {!isLunas && (
                  <div className="flex items-start gap-4 opacity-40">
                    <div className="w-7 h-7 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center z-10 shrink-0">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 pb-1">
                      <p className="text-xs text-muted-foreground">Pembayaran berikutnya...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pay Now Form */}
        {!isLunas && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Banknote className="w-4 h-4 text-primary" />
              Bayar Cicilan Sekarang
            </p>
            <div className="space-y-2">
              <Label htmlFor="pay-amount" className="text-xs">
                Jumlah Bayar (Rp) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pay-amount"
                type="number"
                min={1}
                max={remaining}
                placeholder={`Maks: ${formatRupiah(remaining)}`}
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                data-testid="input-pay-amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-note" className="text-xs">Catatan (opsional)</Label>
              <Input
                id="pay-note"
                placeholder="cth: Transfer BCA"
                value={payNote}
                onChange={e => setPayNote(e.target.value)}
                data-testid="input-pay-note"
              />
            </div>
            <Button
              className="w-full"
              onClick={handlePay}
              disabled={!payAmount || Number(payAmount) <= 0 || addPayment.isPending}
              data-testid="button-simpan-bayar"
            >
              {addPayment.isPending ? "Menyimpan..." : "Simpan Pembayaran"}
            </Button>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Tutup</Button>
      </DialogFooter>
    </DialogContent>
  );
}

export default function CicilanPage() {
  const { data: installments, isLoading } = useListInstallments({ query: { queryKey: getListInstallmentsQueryKey() } });
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const active = installments?.filter(i => i.status === "active") ?? [];
  const lunas = installments?.filter(i => i.status === "lunas") ?? [];

  function Card({ i }: { i: Installment }) {
    const paid = Number(i.paid_amount);
    const total = Number(i.total_amount);
    const remaining = total - paid;
    const isLunas = i.status === "lunas";
    const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;

    return (
      <button
        data-testid={`card-cicilan-${i.id}`}
        onClick={() => setSelectedId(i.id)}
        className="w-full bg-card border border-card-border rounded-xl p-4 text-left shadow-sm hover:shadow-md transition-all hover:border-primary/40 group"
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">{i.customer_name.charAt(0).toUpperCase()}</span>
              </div>
              <p className="font-semibold text-foreground">{i.customer_name}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{formatDateShort(i.created_at)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={isLunas ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-amber-100 text-amber-700"}>
              {isLunas ? "Lunas" : "Berjalan"}
            </Badge>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-semibold">{formatRupiah(total)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Terbayar</p>
            <p className="font-semibold text-green-600">{formatRupiah(paid)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Sisa</p>
            <p className={`font-semibold ${isLunas ? "text-green-600" : "text-destructive"}`}>{formatRupiah(remaining)}</p>
          </div>
        </div>

        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${isLunas ? "bg-green-500" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">{pct.toFixed(0)}% terbayar</p>
      </button>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Manajemen Cicilan</h2>
          <p className="text-sm text-muted-foreground">
            {active.length} cicilan aktif · {lunas.length} lunas
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-card border border-card-border rounded-xl p-5 animate-pulse h-36" />)}
        </div>
      )}

      {!isLoading && (!installments || installments.length === 0) && (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Belum ada data cicilan</p>
          <p className="text-sm">Buat transaksi cicilan di menu Kasir untuk mulai mencatat.</p>
        </div>
      )}

      {active.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Cicilan Aktif</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map(i => <Card key={i.id} i={i} />)}
          </div>
        </div>
      )}

      {lunas.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Sudah Lunas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-70">
            {lunas.map(i => <Card key={i.id} i={i} />)}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={selectedId !== null} onOpenChange={o => { if (!o) setSelectedId(null); }}>
        {selectedId !== null && (
          <InstallmentDetailModal id={selectedId} onClose={() => setSelectedId(null)} />
        )}
      </Dialog>
    </div>
  );
}
