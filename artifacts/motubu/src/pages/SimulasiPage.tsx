import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSimulations,
  getListSimulationsQueryKey,
  useCreateSimulation,
  useDeleteSimulation,
  useCommitSimulation,
} from "@workspace/api-client-react";
import type { Simulation } from "@workspace/api-client-react";
import { formatRupiah, formatDateShort } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, FileText, CheckCircle2, PlusCircle, MinusCircle } from "lucide-react";

interface SimItem { product_name: string; variant: string; quantity: number; unit_price: number; }
interface SimAdj { label: string; amount: number; }

export default function SimulasiPage() {
  const qc = useQueryClient();
  const { data: simulations, isLoading } = useListSimulations({ query: { queryKey: getListSimulationsQueryKey() } });
  const createSimulation = useCreateSimulation();
  const deleteSimulation = useDeleteSimulation();
  const commitSimulation = useCommitSimulation();

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Simulation | null>(null);
  const [commitTarget, setCommitTarget] = useState<Simulation | null>(null);

  const [supplierName, setSupplierName] = useState("");
  const [items, setItems] = useState<SimItem[]>([{ product_name: "", variant: "", quantity: 1, unit_price: 0 }]);
  const [adjustments, setAdjustments] = useState<SimAdj[]>([{ label: "Ongkos Kirim", amount: 0 }]);

  const itemsTotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const adjTotal = adjustments.reduce((s, a) => s + a.amount, 0);
  const grandTotal = itemsTotal + adjTotal;

  function openNew() {
    setSupplierName("");
    setItems([{ product_name: "", variant: "", quantity: 1, unit_price: 0 }]);
    setAdjustments([{ label: "Ongkos Kirim", amount: 0 }]);
    setModalOpen(true);
  }

  function addItem() { setItems([...items, { product_name: "", variant: "", quantity: 1, unit_price: 0 }]); }
  function removeItem(i: number) { setItems(items.filter((_, idx) => idx !== i)); }
  function updateItem(i: number, field: keyof SimItem, value: string | number) {
    setItems(items.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  }

  function addAdj() { setAdjustments([...adjustments, { label: "", amount: 0 }]); }
  function removeAdj(i: number) { setAdjustments(adjustments.filter((_, idx) => idx !== i)); }
  function updateAdj(i: number, field: keyof SimAdj, value: string | number) {
    setAdjustments(adjustments.map((a, idx) => idx === i ? { ...a, [field]: value } : a));
  }

  async function handleCreate() {
    if (!supplierName.trim()) return;
    const payload = {
      supplier_name: supplierName,
      items: items.filter(i => i.product_name).map(i => ({
        product_name: i.product_name,
        variant: i.variant || null,
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
      })),
      adjustments: adjustments.filter(a => a.label).map(a => ({ label: a.label, amount: Number(a.amount) })),
    };
    await createSimulation.mutateAsync({ data: payload });
    qc.invalidateQueries({ queryKey: getListSimulationsQueryKey() });
    setModalOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteSimulation.mutateAsync({ id: deleteTarget.id });
    qc.invalidateQueries({ queryKey: getListSimulationsQueryKey() });
    setDeleteTarget(null);
  }

  async function handleCommit() {
    if (!commitTarget) return;
    await commitSimulation.mutateAsync({ id: commitTarget.id });
    qc.invalidateQueries({ queryKey: getListSimulationsQueryKey() });
    setCommitTarget(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Simulasi Order</h2>
        <Button onClick={openNew} data-testid="button-simulasi-baru">
          <Plus className="w-4 h-4 mr-2" />
          Simulasi Baru
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card border border-card-border rounded-xl p-5 animate-pulse h-24" />
          ))}
        </div>
      )}

      {!isLoading && (!simulations || simulations.length === 0) && (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Belum ada simulasi order</p>
          <p className="text-sm">Buat simulasi untuk merencanakan pembelian dari supplier.</p>
        </div>
      )}

      <div className="space-y-4">
        {simulations?.map((sim) => (
          <div key={sim.id} data-testid={`card-simulasi-${sim.id}`} className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">{sim.supplier_name}</h3>
                  <Badge variant={sim.status === "committed" ? "default" : "secondary"} className={sim.status === "committed" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : ""}>
                    {sim.status === "committed" ? "Tersimpan ke Stok" : "Draft"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{formatDateShort(sim.created_at)}</p>
              </div>
              <p className="text-lg font-bold text-primary">{formatRupiah(sim.total_cost)}</p>
            </div>

            <div className="text-sm text-muted-foreground mb-4">
              {sim.items.length} item produk
              {sim.adjustments.length > 0 && ` · ${sim.adjustments.length} biaya tambahan`}
            </div>

            <div className="flex gap-2">
              {sim.status === "draft" && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => setCommitTarget(sim)}
                  data-testid={`button-commit-${sim.id}`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Simpan ke Stok
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                onClick={() => setDeleteTarget(sim)}
                data-testid={`button-delete-simulasi-${sim.id}`}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Hapus
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* New Simulation Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Simulasi Order Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="supplier">Nama Supplier <span className="text-destructive">*</span></Label>
              <Input id="supplier" data-testid="input-supplier-name" placeholder="cth: CV Sandang Jaya" value={supplierName} onChange={e => setSupplierName(e.target.value)} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Daftar Produk</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addItem} className="h-7 text-xs">
                  <PlusCircle className="w-3.5 h-3.5 mr-1" />
                  Tambah Baris
                </Button>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
                  <span className="col-span-4">Nama Produk</span>
                  <span className="col-span-2">Varian</span>
                  <span className="col-span-2">Qty</span>
                  <span className="col-span-3">Harga/unit</span>
                  <span className="col-span-1" />
                </div>
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <Input className="col-span-4 h-8 text-sm" placeholder="Nama produk" value={item.product_name} onChange={e => updateItem(i, "product_name", e.target.value)} data-testid={`input-item-name-${i}`} />
                    <Input className="col-span-2 h-8 text-sm" placeholder="Varian" value={item.variant} onChange={e => updateItem(i, "variant", e.target.value)} />
                    <Input className="col-span-2 h-8 text-sm" type="number" min={1} value={item.quantity} onChange={e => updateItem(i, "quantity", Number(e.target.value))} />
                    <Input className="col-span-3 h-8 text-sm" type="number" min={0} value={item.unit_price} onChange={e => updateItem(i, "unit_price", Number(e.target.value))} />
                    <button className="col-span-1 text-muted-foreground hover:text-destructive flex justify-center" onClick={() => removeItem(i)} disabled={items.length === 1}>
                      <MinusCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Biaya Tambahan</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addAdj} className="h-7 text-xs">
                  <PlusCircle className="w-3.5 h-3.5 mr-1" />
                  Tambah
                </Button>
              </div>
              {adjustments.map((adj, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input className="flex-1 h-8 text-sm" placeholder="Keterangan (cth: Ongkir)" value={adj.label} onChange={e => updateAdj(i, "label", e.target.value)} />
                  <Input className="w-36 h-8 text-sm" type="number" min={0} value={adj.amount} onChange={e => updateAdj(i, "amount", Number(e.target.value))} />
                  <button className="text-muted-foreground hover:text-destructive" onClick={() => removeAdj(i)}>
                    <MinusCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal produk</span>
                <span>{formatRupiah(itemsTotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Biaya tambahan</span>
                <span>{formatRupiah(adjTotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-foreground border-t border-border pt-2 mt-2">
                <span>Total Estimasi</span>
                <span className="text-primary">{formatRupiah(grandTotal)}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button onClick={handleCreate} disabled={!supplierName.trim() || createSimulation.isPending} data-testid="button-save-simulasi">
              Simpan Simulasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Commit Confirm */}
      <AlertDialog open={!!commitTarget} onOpenChange={(o) => { if (!o) setCommitTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Simpan ke Stok?</AlertDialogTitle>
            <AlertDialogDescription>
              Produk dari simulasi <strong>{commitTarget?.supplier_name}</strong> akan ditambahkan ke stok. Simulasi akan ditandai sebagai selesai.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleCommit} disabled={commitSimulation.isPending} data-testid="button-confirm-commit">
              Ya, Simpan ke Stok
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Simulasi?</AlertDialogTitle>
            <AlertDialogDescription>
              Simulasi dari <strong>{deleteTarget?.supplier_name}</strong> akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="button-confirm-delete-simulasi">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
