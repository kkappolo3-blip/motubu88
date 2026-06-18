import { useState } from "react";
import { useLocation } from "wouter";
import { login } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Store } from "lucide-react";

export default function LoginPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (login(code)) {
      setLocation("/");
    } else {
      setError("Kode akses salah. Coba lagi.");
      setCode("");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4 shadow-lg">
            <Store className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">MOTUBU</h1>
          <p className="text-muted-foreground mt-1 text-sm">Sistem Manajemen Bisnis</p>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code" className="text-sm font-medium">Kode Akses Admin</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="code"
                  data-testid="input-kode-akses"
                  type="password"
                  placeholder="Masukkan kode akses"
                  value={code}
                  onChange={(e) => { setCode(e.target.value); setError(""); }}
                  className="pl-10"
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <p data-testid="text-error" className="text-sm text-destructive font-medium">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              data-testid="button-login"
              disabled={!code}
            >
              Masuk
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          &copy; 2026 MOTUBU. Semua hak dilindungi.
        </p>
      </div>
    </div>
  );
}
