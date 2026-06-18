import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isAuthenticated } from "@/lib/auth";
import Layout from "@/components/Layout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import StokPage from "@/pages/StokPage";
import SimulasiPage from "@/pages/SimulasiPage";
import HutangBankPage from "@/pages/HutangBankPage";
import KasirPage from "@/pages/KasirPage";
import CicilanPage from "@/pages/CicilanPage";
import PlaceholderPage from "@/pages/PlaceholderPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  if (!isAuthenticated()) {
    return <Redirect to="/login" />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />

      <Route path="/">
        {() => (
          <AuthGuard>
            <Layout><DashboardPage /></Layout>
          </AuthGuard>
        )}
      </Route>

      <Route path="/stok">
        {() => (
          <AuthGuard>
            <Layout><StokPage /></Layout>
          </AuthGuard>
        )}
      </Route>

      <Route path="/simulasi">
        {() => (
          <AuthGuard>
            <Layout><SimulasiPage /></Layout>
          </AuthGuard>
        )}
      </Route>

      <Route path="/hutang-bank">
        {() => (
          <AuthGuard>
            <Layout><HutangBankPage /></Layout>
          </AuthGuard>
        )}
      </Route>

      <Route path="/kasir">
        {() => (
          <AuthGuard>
            <Layout><KasirPage /></Layout>
          </AuthGuard>
        )}
      </Route>

      <Route path="/backorder">
        {() => (
          <AuthGuard>
            <Layout><PlaceholderPage title="Backorder" /></Layout>
          </AuthGuard>
        )}
      </Route>

      <Route path="/share-produk">
        {() => (
          <AuthGuard>
            <Layout><PlaceholderPage title="Share Produk" /></Layout>
          </AuthGuard>
        )}
      </Route>

      <Route path="/pengeluaran">
        {() => (
          <AuthGuard>
            <Layout><PlaceholderPage title="Pengeluaran" /></Layout>
          </AuthGuard>
        )}
      </Route>

      <Route path="/arus-kas">
        {() => (
          <AuthGuard>
            <Layout><PlaceholderPage title="Arus Kas" /></Layout>
          </AuthGuard>
        )}
      </Route>

      <Route path="/riwayat">
        {() => (
          <AuthGuard>
            <Layout><PlaceholderPage title="Riwayat" /></Layout>
          </AuthGuard>
        )}
      </Route>

      <Route path="/cicilan">
        {() => (
          <AuthGuard>
            <Layout><CicilanPage /></Layout>
          </AuthGuard>
        )}
      </Route>

      <Route path="/reseller">
        {() => (
          <AuthGuard>
            <Layout><PlaceholderPage title="Reseller" /></Layout>
          </AuthGuard>
        )}
      </Route>

      <Route path="/pengaturan">
        {() => (
          <AuthGuard>
            <Layout><PlaceholderPage title="Pengaturan" /></Layout>
          </AuthGuard>
        )}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRoutes />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
