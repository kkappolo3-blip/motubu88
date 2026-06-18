import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListProducts, getListProductsQueryKey } from "@workspace/api-client-react";
import type { Product } from "@workspace/api-client-react";
import { formatRupiah } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ImageOff, Plus, Minus, Trash2, ShoppingCart, CreditCard, CheckCircle2, User, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CartItem {
  product: Product;
  qty: number;
  custom_price: number;
}

export default function KasirPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: products, isLoading } = useListProducts({ query: { queryKey: getListProductsQueryKey() } });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [bayarModalOpen, setBayarModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"lunas" | "cicilan">("lunas");
  const [customerName, setCustomerName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ method: string; total: number } | null>(null);

  const filtered = products?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.variant ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (p.supplier_name ?? "").toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  function addToCart(p: Product) {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === p.id);
      if (existing) {
        return prev.map(c => c.product.id === p.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { product: p, qty: 1, custom_price: Number(p.selling_price) }];
    });
  }

  function updateQty(productId: number, delta: number) {
    setCart(prev => {
      return prev.map(c => {
        if (c.product.id !== productId) return c;
        const newQty = c.qty + delta;
        return newQty <= 0 ? null as unknown as CartItem : { ...c, qty: newQty };
      }).filter(Boolean);
    });
  }

  function updatePrice(productId: number, price: number) {
    setCart(prev => prev.map(c => c.product.id === productId ? { ...c, custom_price: price } : c));
  }

  function removeFromCart(productId: number) {
    setCart(prev => prev.filter(c => c.product.id !== productId));
  }

  const cartTotal = cart.reduce((s, c) => s + c.qty * c.custom_price, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  async function handleCheckout() {
    if (cart.length === 0) return;
    if (paymentMethod === "cicilan" && !customerName.trim()) return;

    setIsProcessing(true);
    try {
      const body = {
        items: cart.map(c => ({
          product_id: c.product.id,
          product_name: c.product.name,
          variant: c.product.variant ?? null,
          qty: c.qty,
          custom_price: c.custom_price,
        })),
        payment_method: paymentMethod,
        customer_name: paymentMethod === "cicilan" ? customerName.trim() : null,
      };

      const res = await fetch("/api/kasir/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Checkout gagal");
      }

      const result = await res.json();
      qc.invalidateQueries({ queryKey: getListProductsQueryKey() });
      setCart([]);
      setBayarModalOpen(false);
      setCustomerName("");
      setPaymentMethod("lunas");
      setSuccessInfo({ method: paymentMethod, total: result.total_amount });
    } catch (e: unknown) {
      toast({
        title: "Checkout gagal",
        description: e instanceof Error ? e.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="flex gap-0 h-[calc(100vh-120px)] -mx-4 -mt-6">
      {/* LEFT: Product Grid (70%) */}
      <div className="flex-[7] flex flex-col border-r border-border overflow-hidden">
        {/* Search */}
        <div className="px-4 py-3 border-b border-border bg-card shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari produk..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-kasir-search"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {[...Array(10)].map((_, i) => <div key={i} className="bg-muted rounded-xl aspect-[3/4] animate-pulse" />)}
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Tidak ada produk ditemukan</p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.map(p => {
              const inCart = cart.find(c => c.product.id === p.id);
              const outOfStock = p.stock_qty === 0;
              return (
                <button
                  key={p.id}
                  data-testid={`btn-product-${p.id}`}
                  disabled={outOfStock}
                  onClick={() => addToCart(p)}
                  className={`relative bg-card border rounded-xl overflow-hidden text-left transition-all hover:shadow-md active:scale-95 ${
                    outOfStock ? "opacity-50 cursor-not-allowed" : "border-card-border hover:border-primary/40 cursor-pointer"
                  } ${inCart ? "ring-2 ring-primary/60" : ""}`}
                >
                  <div className="aspect-square bg-muted relative">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                        <ImageOff className="w-8 h-8" />
                      </div>
                    )}
                    {inCart && (
                      <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow">
                        {inCart.qty}
                      </div>
                    )}
                    {outOfStock && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white text-xs font-bold bg-black/60 px-2 py-0.5 rounded">Habis</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-semibold leading-tight truncate">{p.name}</p>
                    {p.variant && <p className="text-xs text-muted-foreground truncate">{p.variant}</p>}
                    <p className="text-sm font-bold text-primary mt-1">{formatRupiah(Number(p.selling_price))}</p>
                    <p className="text-xs text-muted-foreground">Stok: {p.stock_qty}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT: Cart Panel (30%) */}
      <div className="flex-[3] flex flex-col bg-card overflow-hidden min-w-[260px] max-w-xs">
        {/* Cart Header */}
        <div className="px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Keranjang
            </h3>
            {cart.length > 0 && (
              <Badge variant="secondary">{cartCount} item</Badge>
            )}
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm p-4 text-center">
              <ShoppingCart className="w-10 h-10 mb-2 opacity-30" />
              <p>Keranjang kosong</p>
              <p className="text-xs">Klik produk untuk menambahkan</p>
            </div>
          ) : (
            <div className="p-3 space-y-3">
              {cart.map(item => (
                <div
                  key={item.product.id}
                  data-testid={`cart-item-${item.product.id}`}
                  className="bg-background border border-border rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-tight truncate">{item.product.name}</p>
                      {item.product.variant && <p className="text-xs text-muted-foreground">{item.product.variant}</p>}
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Editable price */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Harga jual (Rp)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={item.custom_price}
                      onChange={e => updatePrice(item.product.id, Number(e.target.value))}
                      className="h-7 text-sm"
                      data-testid={`input-price-${item.product.id}`}
                    />
                  </div>

                  {/* Qty adjuster */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.product.id, -1)}
                        className="w-6 h-6 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-bold w-6 text-center">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.product.id, 1)}
                        disabled={item.qty >= item.product.stock_qty}
                        className="w-6 h-6 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center disabled:opacity-40"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-sm font-bold text-primary">{formatRupiah(item.qty * item.custom_price)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Total & Pay Button */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-border bg-card shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-xl font-black text-primary">{formatRupiah(cartTotal)}</span>
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={() => setBayarModalOpen(true)}
              data-testid="button-bayar"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Bayar
            </Button>
          </div>
        )}
      </div>

      {/* Bayar Modal */}
      <Dialog open={bayarModalOpen} onOpenChange={setBayarModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Proses Pembayaran</DialogTitle>
            <DialogDescription>
              Total: <span className="font-bold text-primary">{formatRupiah(cartTotal)}</span> · {cartCount} item
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Metode Pembayaran</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod("lunas")}
                  className={`border-2 rounded-xl p-4 text-center transition-all ${
                    paymentMethod === "lunas" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  }`}
                  data-testid="btn-method-lunas"
                >
                  <CheckCircle2 className={`w-6 h-6 mx-auto mb-1.5 ${paymentMethod === "lunas" ? "text-primary" : "text-muted-foreground"}`} />
                  <p className={`text-sm font-bold ${paymentMethod === "lunas" ? "text-primary" : "text-foreground"}`}>Bayar Lunas</p>
                  <p className="text-xs text-muted-foreground">Tunai / Transfer</p>
                </button>
                <button
                  onClick={() => setPaymentMethod("cicilan")}
                  className={`border-2 rounded-xl p-4 text-center transition-all ${
                    paymentMethod === "cicilan" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  }`}
                  data-testid="btn-method-cicilan"
                >
                  <User className={`w-6 h-6 mx-auto mb-1.5 ${paymentMethod === "cicilan" ? "text-primary" : "text-muted-foreground"}`} />
                  <p className={`text-sm font-bold ${paymentMethod === "cicilan" ? "text-primary" : "text-foreground"}`}>Cicil</p>
                  <p className="text-xs text-muted-foreground">Bayar bertahap</p>
                </button>
              </div>
            </div>

            {paymentMethod === "cicilan" && (
              <div className="space-y-2">
                <Label htmlFor="customer-name">
                  Nama Pelanggan <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="customer-name"
                  data-testid="input-customer-name"
                  placeholder="cth: Budi Santoso"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="font-semibold text-foreground">{cartCount} item</p>
              {cart.map(c => (
                <div key={c.product.id} className="flex justify-between text-muted-foreground text-xs mt-1">
                  <span>{c.product.name}{c.product.variant ? ` · ${c.product.variant}` : ""} ×{c.qty}</span>
                  <span>{formatRupiah(c.qty * c.custom_price)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-foreground border-t border-border mt-2 pt-2">
                <span>Total</span>
                <span className="text-primary">{formatRupiah(cartTotal)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBayarModalOpen(false)}>Batal</Button>
            <Button
              onClick={handleCheckout}
              disabled={isProcessing || (paymentMethod === "cicilan" && !customerName.trim())}
              data-testid="button-konfirmasi-bayar"
            >
              {isProcessing ? "Memproses..." : paymentMethod === "cicilan" ? "Buat Cicilan" : "Konfirmasi Bayar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={!!successInfo} onOpenChange={() => setSuccessInfo(null)}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-9 h-9 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle>Transaksi Berhasil!</DialogTitle>
            <DialogDescription>
              {successInfo?.method === "cicilan"
                ? "Cicilan telah dicatat. Pantau pembayaran di menu Cicilan."
                : "Pembayaran lunas berhasil dicatat."}
            </DialogDescription>
          </DialogHeader>
          <p className="text-2xl font-black text-primary">{formatRupiah(successInfo?.total ?? 0)}</p>
          <Button className="w-full mt-2" onClick={() => setSuccessInfo(null)} data-testid="button-ok-sukses">
            Selesai
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
