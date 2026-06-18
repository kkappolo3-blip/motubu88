import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListBankDebts,
  getListBankDebtsQueryKey,
  useCreateBankDebt,
  useUpdateBankDebt,
  useDeleteBankDebt,
} from "@workspace/api-client-react";
import type { BankDebt } from "@workspace/api-client-react";
import { formatRupiah, formatDateShort } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Landmark } from "lucide-react";

const debtSchema = z.object({
  bank_name: z.string().min(1, "Nama bank wajib diisi"),
  principal_amount: z.coerce.number().min(1, "Jumlah pinjaman > 0"),
  interest_amount: z.coerce.number().min(0),
  paid_amount: z.coerce.number().min(0),
  status: z.string().optional(),
});
type DebtForm = z.infer<typeof debtSchema>;

export default function HutangBankPage() {
  const qc = useQueryClient();
  const { data: debts, isLoading } = useListBankDebts({ query: { queryKey: getListBankDebtsQueryKey() } });
  const createDebt = useCreateBankDebt();
  const updateDebt = useUpdateBankDebt();
  const deleteDebt = useDeleteBankDebt();

  const [modalOpen, setModalOpen] = useState(false);
  const [editDebt, setEditDebt] = useState<BankDebt | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BankDebt | null>(null);

  const form = useForm<DebtForm>({
    resolver: zodResolver(debtSchema),
    defaultValues: { bank_name: "", principal_amount: 0, interest_amount: 0, paid_amount: 0, status: "active" },
  });

  function openAdd() {
    setEditDebt(null);
    form.reset({ bank_name: "", principal_amount: 0, interest_amount: 0, paid_amount: 0, status: "active" });
    setModalOpen(true);
  }
  function openEdit(d: BankDebt) {
    setEditDebt(d);
    form.reset({ bank_name: d.bank_name, principal_amount: d.principal_amount, interest_amount: d.interest_amount, paid_amount: d.paid_amount, status: d.status });
    setModalOpen(true);
  }

  async function onSubmit(values: DebtForm) {
    if (editDebt) {
      await updateDebt.mutateAsync({ id: editDebt.id, data: values });
    } else {
      await createDebt.mutateAsync({ data: values });
    }
    qc.invalidateQueries({ queryKey: getListBankDebtsQueryKey() });
    setModalOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteDebt.mutateAsync({ id: deleteTarget.id });
    qc.invalidateQueries({ queryKey: getListBankDebtsQueryKey() });
    setDeleteTarget(null);
  }

  const totalDebt = debts?.reduce((s, d) => s + (d.principal_amount + d.interest_amount - d.paid_amount), 0) ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Hutang Bank</h2>
          {debts && debts.length > 0 && (
            <p className="text-sm text-muted-foreground">Total sisa: <span className="font-semibold text-destructive">{formatRupiah(totalDebt)}</span></p>
          )}
        </div>
        <Button onClick={openAdd} data-testid="button-tambah-hutang">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Hutang
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => <div key={i} className="bg-card border border-card-border rounded-xl p-5 animate-pulse h-28" />)}
        </div>
      )}

      {!isLoading && (!debts || debts.length === 0) && (
        <div className="text-center py-16 text-muted-foreground">
          <Landmark className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Tidak ada catatan hutang bank</p>
        </div>
      )}

      <div className="space-y-3">
        {debts?.map((d) => {
          const remaining = d.principal_amount + d.interest_amount - d.paid_amount;
          const pct = Math.min(100, (d.paid_amount / (d.principal_amount + d.interest_amount)) * 100);
          return (
            <div key={d.id} data-testid={`card-debt-${d.id}`} className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{d.bank_name}</h3>
                    <Badge variant={d.status === "lunas" ? "default" : "secondary"} className={d.status === "lunas" ? "bg-green-100 text-green-700" : ""}>
                      {d.status === "lunas" ? "Lunas" : "Aktif"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Sejak {formatDateShort(d.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Sisa Hutang</p>
                  <p className="font-bold text-destructive">{formatRupiah(remaining)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                <div><p className="text-muted-foreground text-xs">Pokok</p><p className="font-semibold">{formatRupiah(d.principal_amount)}</p></div>
                <div><p className="text-muted-foreground text-xs">Bunga</p><p className="font-semibold">{formatRupiah(d.interest_amount)}</p></div>
                <div><p className="text-muted-foreground text-xs">Terbayar</p><p className="font-semibold text-green-600">{formatRupiah(d.paid_amount)}</p></div>
              </div>

              <div className="mb-3">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{pct.toFixed(0)}% terbayar</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(d)} data-testid={`button-edit-debt-${d.id}`}>
                  <Pencil className="w-3.5 h-3.5 mr-1" />Edit
                </Button>
                <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 border-destructive/30" onClick={() => setDeleteTarget(d)} data-testid={`button-delete-debt-${d.id}`}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" />Hapus
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editDebt ? "Edit Hutang Bank" : "Tambah Hutang Bank"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Bank <span className="text-destructive">*</span></Label>
              <Input data-testid="input-bank-name" placeholder="cth: BRI, BCA, Mandiri" {...form.register("bank_name")} />
              {form.formState.errors.bank_name && <p className="text-xs text-destructive">{form.formState.errors.bank_name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Jumlah Pinjaman (Rp)</Label>
                <Input type="number" min={0} data-testid="input-principal" {...form.register("principal_amount")} />
              </div>
              <div className="space-y-2">
                <Label>Bunga Total (Rp)</Label>
                <Input type="number" min={0} data-testid="input-interest" {...form.register("interest_amount")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sudah Dibayar (Rp)</Label>
              <Input type="number" min={0} data-testid="input-paid" {...form.register("paid_amount")} />
            </div>
            {editDebt && (
              <div className="space-y-2">
                <Label>Status</Label>
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" {...form.register("status")}>
                  <option value="active">Aktif</option>
                  <option value="lunas">Lunas</option>
                </select>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
              <Button type="submit" disabled={createDebt.isPending || updateDebt.isPending} data-testid="button-save-debt">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Hutang?</AlertDialogTitle>
            <AlertDialogDescription>Data hutang <strong>{deleteTarget?.bank_name}</strong> akan dihapus permanen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
