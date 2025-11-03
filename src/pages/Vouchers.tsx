import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import VoucherForm from "@/components/vouchers/VoucherForm";
import VoucherList from "@/components/vouchers/VoucherList";

const Vouchers = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("sales");
  const [showForm, setShowForm] = useState(false);
  const [companyId, setCompanyId] = useState<string>("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: companies } = await supabase
      .from("companies")
      .select("id")
      .eq("user_id", session.user.id)
      .limit(1)
      .single();

    if (!companies) {
      navigate("/company-setup");
      return;
    }

    setCompanyId(companies.id);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Vouchers</h1>
            <p className="text-muted-foreground">
              Manage your sales, purchase, receipt and payment vouchers
            </p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Voucher
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="purchase">Purchase</TabsTrigger>
            <TabsTrigger value="receipt">Receipt</TabsTrigger>
            <TabsTrigger value="payment">Payment</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sales" className="space-y-4">
            <VoucherList type="sales" companyId={companyId} />
          </TabsContent>
          
          <TabsContent value="purchase" className="space-y-4">
            <VoucherList type="purchase" companyId={companyId} />
          </TabsContent>
          
          <TabsContent value="receipt" className="space-y-4">
            <VoucherList type="receipt" companyId={companyId} />
          </TabsContent>
          
          <TabsContent value="payment" className="space-y-4">
            <VoucherList type="payment" companyId={companyId} />
          </TabsContent>
        </Tabs>

        {showForm && (
          <VoucherForm
            type={activeTab as "sales" | "purchase" | "receipt" | "payment"}
            companyId={companyId}
            onClose={() => setShowForm(false)}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Vouchers;