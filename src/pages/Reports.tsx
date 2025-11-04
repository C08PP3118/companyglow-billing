import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { TrendingUp, DollarSign } from "lucide-react";

type TimeFrame = "daily" | "weekly" | "monthly" | "yearly";

interface VoucherData {
  date: string;
  sales: number;
  purchases: number;
  receipts: number;
  payments: number;
}

const COLORS = {
  sales: "hsl(var(--chart-1))",
  purchases: "hsl(var(--chart-2))",
  receipts: "hsl(var(--chart-3))",
  payments: "hsl(var(--chart-4))",
};

const Reports = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("monthly");
  const [chartData, setChartData] = useState<VoucherData[]>([]);
  const [pieData, setPieData] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadChartData();
    }
  }, [timeFrame, loading]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setLoading(false);
  };

  const getDateFormat = (date: Date, frame: TimeFrame) => {
    switch (frame) {
      case "daily":
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case "weekly":
        return `Week ${Math.ceil(date.getDate() / 7)}`;
      case "monthly":
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      case "yearly":
        return date.getFullYear().toString();
    }
  };

  const getDateRange = (frame: TimeFrame) => {
    const now = new Date();
    let startDate = new Date();
    
    switch (frame) {
      case "daily":
        startDate.setDate(now.getDate() - 30);
        break;
      case "weekly":
        startDate.setDate(now.getDate() - 84);
        break;
      case "monthly":
        startDate.setMonth(now.getMonth() - 12);
        break;
      case "yearly":
        startDate.setFullYear(now.getFullYear() - 5);
        break;
    }
    
    return startDate.toISOString().split('T')[0];
  };

  const loadChartData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const startDate = getDateRange(timeFrame);
    
    const { data: vouchers, error } = await supabase
      .from("vouchers")
      .select("*")
      .eq("user_id", session.user.id)
      .gte("date", startDate)
      .order("date", { ascending: true });

    if (error) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Aggregate data by time frame
    const aggregated = new Map<string, VoucherData>();
    
    vouchers?.forEach((voucher) => {
      const date = new Date(voucher.date);
      const key = getDateFormat(date, timeFrame);
      
      if (!aggregated.has(key)) {
        aggregated.set(key, {
          date: key,
          sales: 0,
          purchases: 0,
          receipts: 0,
          payments: 0,
        });
      }
      
      const data = aggregated.get(key)!;
      const amount = Number(voucher.amount);
      
      switch (voucher.type) {
        case "sales":
          data.sales += amount;
          break;
        case "purchase":
          data.purchases += amount;
          break;
        case "receipt":
          data.receipts += amount;
          break;
        case "payment":
          data.payments += amount;
          break;
      }
    });

    const chartArray = Array.from(aggregated.values());
    setChartData(chartArray);

    // Calculate totals for pie chart
    const totals = chartArray.reduce(
      (acc, curr) => ({
        sales: acc.sales + curr.sales,
        purchases: acc.purchases + curr.purchases,
        receipts: acc.receipts + curr.receipts,
        payments: acc.payments + curr.payments,
      }),
      { sales: 0, purchases: 0, receipts: 0, payments: 0 }
    );

    setPieData([
      { name: "Sales", value: totals.sales },
      { name: "Purchases", value: totals.purchases },
      { name: "Receipts", value: totals.receipts },
      { name: "Payments", value: totals.payments },
    ]);
  };

  const chartConfig = {
    sales: {
      label: "Sales",
      color: COLORS.sales,
    },
    purchases: {
      label: "Purchases",
      color: COLORS.purchases,
    },
    receipts: {
      label: "Receipts",
      color: COLORS.receipts,
    },
    payments: {
      label: "Payments",
      color: COLORS.payments,
    },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Visualize your business performance</p>
        </div>

        <Tabs value={timeFrame} onValueChange={(v) => setTimeFrame(v as TimeFrame)}>
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
          </TabsList>

          <div className="mt-6 space-y-6">
            {/* Bar Chart - Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Transaction Overview
                </CardTitle>
                <CardDescription>
                  Comparison of all transaction types over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Bar dataKey="sales" fill={COLORS.sales} name="Sales" />
                      <Bar dataKey="purchases" fill={COLORS.purchases} name="Purchases" />
                      <Bar dataKey="receipts" fill={COLORS.receipts} name="Receipts" />
                      <Bar dataKey="payments" fill={COLORS.payments} name="Payments" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Line Chart - Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Sales vs Purchases Trend</CardTitle>
                  <CardDescription>Track your revenue and expenses</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis className="text-xs" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="sales"
                          stroke={COLORS.sales}
                          strokeWidth={2}
                          name="Sales"
                        />
                        <Line
                          type="monotone"
                          dataKey="purchases"
                          stroke={COLORS.purchases}
                          strokeWidth={2}
                          name="Purchases"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Pie Chart - Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Transaction Distribution
                  </CardTitle>
                  <CardDescription>Total breakdown by transaction type</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS]}
                            />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
