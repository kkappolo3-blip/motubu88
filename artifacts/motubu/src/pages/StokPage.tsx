import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListProducts,
  getListProductsQueryKey,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from "@workspace/api-client-react";
import type { Product } from "@workspace/api-client-react";
import { formatRupiah } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Package, AlertTriangle, ImageOff } from "lucide-react";

const productSchema = z.object({
  name: z.string().min(1, "Nama produk wajib diisi"),
  variant: z.string().optional(),
  supplier_name: z.string().optional(),
  image_url: z.string().optional(),
  cost_price: z.coerce.number().min(0, "Harga modal harus >= 0"),
  selling_price: z.coerce.number().min(0, "Harga jual harus >= 0"),
  stock_qty: z.coerce.number().int().min(0, "Stok harus >= 0"),
});
type ProductFormValues = z.infer<typeof productSchema>;

export default function StokPage() {
  const qc = useQueryClient();
  const { data: products, isLoading } = useListProducts({ query: { queryKey: getListProductsQueryKey() } });
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: "", variant: "", supplier_name: "", image_url: "", cost_price: 0, selling_price: 0, stock_qty: 0 },
  });

  function openAdd() {
    setEditProduct(null);
    form.reset({ name: "", variant: "", supplier_name: "", image_url: "", cost_price: 0, selling_price: 0, stock_qty: 0 });
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    setEditProduct(p);
    form.reset({
      name: p.name,
      variant: p.variant ?? "",
      supplier_name: p.supplier_name ?? "",
      image_url: p.image_url ?? "",
      cost_price: p.cost_price,
      selling_price: p.selling_price,
      stock_qty: p.stock_qty,
    });
    setModalOpen(true);
  }

  async function onSubmit(values: ProductFormValues) {
    const payload = {
      name: values.name,
      variant: values.variant || null,
      supplier_name: values.supplier_name || null,
      image_url: values.image_url || null,
      cost_price: values.cost_price,
      selling_price: values.selling_price,
      stock_qty: values.stock_qty,
    };

    if (editProduct) {
      await updateProduct.mutateAsync({ id: editProduct.id, data: payload });
    } else {
      await createProduct.mutateAsync({ data: payload });
    }
    qc.invalidateQueries({ queryKey: getListProductsQueryKey() });
    setModalOpen(false);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await deleteProduct.mutateAsync({ id: deleteTarget.id });
    qc.invalidateQueries({ queryKey: getListProductsQueryKey() });
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Manajemen Stok</h2>
        <Button onClick={openAdd} data-testid="button-tambah-stok">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Stok
        </Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-card border border-card-border rounded-xl overflow-hidden animate-pulse">
              <div className="aspect-square bg-muted" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && products?.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Belum ada produk</p>
          <p className="text-sm">Klik "Tambah Stok" untuk menambah produk pertama.</p>
        </div>
      )}

      {!isLoading && products && products.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {products.map((p) => (
            <div
              key={p.id}
              data-testid={`card-product-${p.id}`}
              className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all group"
            >
              {/* Image */}
              <div className="aspect-square bg-muted relative overflow-hidden">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/40">
                    <ImageOff className="w-8 h-8 mb-1" />
                    <span className="text-xs">Tidak ada foto</span>
                  </div>
                )}
                {p.stock_qty <= 5 && (
                  <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                    Stok rendah
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="font-semibold text-sm text-foreground leading-tight truncate" data-testid={`text-product-name-${p.id}`}>{p.name}</p>
                {p.variant && <p className="text-xs text-muted-foreground truncate">{p.variant}</p>}
                <p className="text-primary font-bold text-sm mt-1" data-testid={`text-price-${p.id}`}>{formatRupiah(p.selling_price)}</p>
                <p className="text-xs text-muted-foreground">Stok: <span className="font-semibold">{p.stock_qty}</span></p>

                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-7 text-xs"
                    onClick={() => openEdit(p)}
                    data-testid={`button-edit-${p.id}`}
                  >
                    <Pencil className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                    onClick={() => setDeleteTarget(p)}
                    data-testid={`button-delete-${p.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editProduct ? "Edit Produk" : "Tambah Produk Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Produk <span className="text-destructive">*</span></Label>
              <Input id="name" data-testid="input-product-name" placeholder="cth: Kaos Polos" {...form.register("name")} />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="variant">Varian</Label>
                <Input id="variant" data-testid="input-variant" placeholder="cth: Merah XL" {...form.register("variant")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier_name">Nama Supplier</Label>
                <Input id="supplier_name" data-testid="input-supplier" placeholder="cth: CV Jaya" {...form.register("supplier_name")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_url">URL Foto</Label>
              <Input id="image_url" data-testid="input-image-url" placeholder="https://..." {...form.register("image_url")} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cost_price">Harga Modal (Rp)</Label>
                <Input id="cost_price" type="number" min={0} data-testid="input-cost-price" {...form.register("cost_price")} />
                {form.formState.errors.cost_price && <p className="text-xs text-destructive">{form.formState.errors.cost_price.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="selling_price">Harga Jual (Rp)</Label>
                <Input id="selling_price" type="number" min={0} data-testid="input-selling-price" {...form.register("selling_price")} />
                {form.formState.errors.selling_price && <p className="text-xs text-destructive">{form.formState.errors.selling_price.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock_qty">Jumlah Stok</Label>
                <Input id="stock_qty" type="number" min={0} data-testid="input-stock-qty" {...form.register("stock_qty")} />
                {form.formState.errors.stock_qty && <p className="text-xs text-destructive">{form.formState.errors.stock_qty.message}</p>}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
              <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending} data-testid="button-save-product">
                {editProduct ? "Simpan Perubahan" : "Tambah Produk"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Produk?</AlertDialogTitle>
            <AlertDialogDescription>
              Produk <strong>{deleteTarget?.name}</strong> akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="button-confirm-delete">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
