import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import PartyForm from "@/components/parties/PartyForm";
import PartyList from "@/components/parties/PartyList";

const Parties = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("customer");
  const [showForm, setShowForm] = useState(false);
  const [editingParty, setEditingParty] = useState<any>(null);
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

  const handleEdit = (party: any) => {
    setEditingParty(party);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingParty(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Parties</h1>
            <p className="text-muted-foreground">
              Manage your customers and suppliers
            </p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Party
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="customer">Customers</TabsTrigger>
            <TabsTrigger value="supplier">Suppliers</TabsTrigger>
          </TabsList>
          
          <TabsContent value="customer" className="space-y-4">
            <PartyList type="customer" companyId={companyId} onEdit={handleEdit} />
          </TabsContent>
          
          <TabsContent value="supplier" className="space-y-4">
            <PartyList type="supplier" companyId={companyId} onEdit={handleEdit} />
          </TabsContent>
        </Tabs>

        {showForm && (
          <PartyForm
            type={activeTab as "customer" | "supplier"}
            companyId={companyId}
            party={editingParty}
            onClose={handleCloseForm}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Parties;
