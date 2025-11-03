import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Ledger = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ledger</h1>
          <p className="text-muted-foreground">
            View party-wise ledger with opening/closing balances
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Party Ledger</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Ledger functionality coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Ledger;