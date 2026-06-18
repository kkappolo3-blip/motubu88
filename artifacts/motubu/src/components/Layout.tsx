import { useState } from "react";
import { Link, useLocation } from "wouter";
import { logout } from "@/lib/auth";
import { Search, LogOut, User, Store, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const navItems = [
  { label: "Dashboard", path: "/" },
  { label: "Simulasi", path: "/simulasi" },
  { label: "Stok", path: "/stok" },
  { label: "Kasir", path: "/kasir" },
  { label: "Backorder", path: "/backorder" },
  { label: "Share Produk", path: "/share-produk" },
  { label: "Hutang Bank", path: "/hutang-bank" },
  { label: "Pengeluaran", path: "/pengeluaran" },
  { label: "Arus Kas", path: "/arus-kas" },
  { label: "Riwayat", path: "/riwayat" },
  { label: "Reseller", path: "/reseller" },
  { label: "Pengaturan", path: "/pengaturan" },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    setLocation("/login");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Row */}
      <div className="bg-primary text-primary-foreground shadow-md">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Store className="w-6 h-6" />
            <span className="text-xl font-black tracking-wide">MOTUBU</span>
          </Link>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari produk, transaksi, supplier..."
              className="pl-10 bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/50 focus-visible:ring-white/30 focus-visible:bg-white/15"
              data-testid="input-search"
            />
          </div>

          {/* User Status */}
          <div className="flex items-center gap-3 shrink-0 ml-auto">
            <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
              <User className="w-4 h-4" />
              <span className="text-sm font-semibold">Admin</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Keluar</span>
            </Button>
            <button
              className="sm:hidden p-1"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row - Sticky Nav */}
      <div className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
        <div className="max-w-[1600px] mx-auto">
          <nav className="hidden sm:flex items-center overflow-x-auto no-scrollbar" data-testid="nav-menu">
            {navItems.map((item) => {
              const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? "border-primary text-primary bg-primary/5"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                  data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile Nav */}
          {mobileMenuOpen && (
            <nav className="sm:hidden flex flex-col py-2">
              {navItems.map((item) => {
                const isActive = location === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`px-4 py-2.5 text-sm font-medium ${
                      isActive ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
