import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  Receipt, 
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DashboardStats {
  sales: number;
  purchases: number;
  receipts: number;
  payments: number;
}

interface Company {
  name: string;
  email: string;
  mobile_number: string;
  address: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    sales: 0,
    purchases: 0,
    receipts: 0,
    payments: 0,
  });
  const [lowStockItems, setLowStockItems] = useState<number>(0);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    // Check if company exists
    const { data: companies } = await supabase
      .from("companies")
      .select("*")
      .eq("user_id", session.user.id)
      .limit(1);

    if (!companies || companies.length === 0) {
      navigate("/company-setup");
      return;
    }

    setCompany(companies[0]);
    await loadDashboardData(session.user.id, companies[0].id);
  };

  const loadDashboardData = async (userId: string, companyId: string) => {
    setLoading(true);
    
    const today = new Date().toISOString().split('T')[0];

    // Get today's vouchers
    const { data: vouchers } = await supabase
      .from("vouchers")
      .select("type, amount")
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .eq("date", today);

    // Calculate stats
    const newStats: DashboardStats = {
      sales: 0,
      purchases: 0,
      receipts: 0,
      payments: 0,
    };

    vouchers?.forEach((voucher) => {
      newStats[voucher.type] += Number(voucher.amount);
    });

    setStats(newStats);

    // Check for low stock items
    const { data: items } = await supabase
      .from("items")
      .select("id, current_stock, reorder_level")
      .eq("user_id", userId)
      .eq("company_id", companyId);

    const lowStock = items?.filter(item => item.current_stock <= item.reorder_level) || [];
    setLowStockItems(lowStock.length);
    setLoading(false);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of today's activity.
          </p>
        </div>

        {company && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Company Name</p>
                <p className="font-medium">{company.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{company.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mobile Number</p>
                <p className="font-medium">{company.mobile_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{company.address}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {lowStockItems > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have {lowStockItems} item(s) with low stock. Please reorder soon.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.sales.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Revenue generated today
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Purchases</CardTitle>
              <TrendingDown className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.purchases.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Expenses incurred today
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Receipts</CardTitle>
              <Receipt className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.receipts.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Money received today
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Payments</CardTitle>
              <CreditCard className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.payments.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Money paid today
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;