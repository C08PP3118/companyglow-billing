import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

const Ledger = () => {
  const navigate = useNavigate();
  const [companyId, setCompanyId] = useState<string>("");
  const [parties, setParties] = useState<any[]>([]);
  const [selectedParty, setSelectedParty] = useState<string>("");
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (companyId) {
      loadParties();
    }
  }, [companyId]);

  useEffect(() => {
    if (selectedParty) {
      loadLedger();
    }
  }, [selectedParty]);

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

  const loadParties = async () => {
    const { data } = await supabase
      .from("parties")
      .select("*")
      .eq("company_id", companyId)
      .order("name");
    
    setParties(data || []);
  };

  const loadLedger = async () => {
    if (!selectedParty) return;
    
    setLoading(true);
    
    const { data: partyData, error: partyError } = await supabase
      .from("parties")
      .select("opening_balance, type")
      .eq("id", selectedParty)
      .single();
    
    if (partyError || !partyData) {
      setLoading(false);
      return;
    }

    setOpeningBalance(partyData?.opening_balance || 0);

    const { data: vouchers } = await supabase
      .from("vouchers")
      .select("*")
      .eq("party_id", selectedParty)
      .order("date", { ascending: true })
      .order("created_at", { ascending: true });
    
    const ledger = [];
    let runningBalance = partyData?.opening_balance || 0;
    
    for (const voucher of vouchers || []) {
      const openingForVoucher = runningBalance;
      let debit = 0;
      let credit = 0;
      
      if (partyData.type === 'customer') {
        if (voucher.type === "sales") { // Amount receivable increases
          debit = voucher.amount;
          runningBalance += voucher.amount;
        } else if (voucher.type === "receipt") { // Amount received, so balance decreases
          credit = voucher.amount;
          runningBalance -= voucher.amount;
        }
      } else if (partyData.type === 'supplier') {
        if (voucher.type === "purchase") { // Amount payable increases
          credit = voucher.amount;
          runningBalance += voucher.amount;
        } else if (voucher.type === "payment") { // Amount paid, so balance decreases
          debit = voucher.amount;
          runningBalance -= voucher.amount;
        }
      }
      
      ledger.push({
        date: voucher.date,
        voucher_number: voucher.voucher_number,
        type: voucher.type,
        narration: voucher.narration,
        debit,
        credit,
        openingBalance: openingForVoucher,
        balance: runningBalance
      });
    }

    // Set the opening balance for the summary card. If there are transactions,
    // it should be the opening balance of the first one. Otherwise, it's the party's initial balance.
    if (ledger.length > 0) {
      setOpeningBalance(ledger[0].openingBalance);
    } else {
      setOpeningBalance(partyData.opening_balance || 0);
    }
    setLedgerData(ledger);
    setLoading(false);
  };

  const calculateClosingBalance = () => {
    if (ledgerData.length === 0) return openingBalance;
    return ledgerData[ledgerData.length - 1].balance;
  };

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
            <CardTitle>Select Party</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Party</Label>
              <Select value={selectedParty} onValueChange={setSelectedParty}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a party" />
                </SelectTrigger>
                <SelectContent>
                  {parties.map((party) => (
                    <SelectItem key={party.id} value={party.id}>
                      {party.name} ({party.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {selectedParty && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center text-muted-foreground">Loading...</p>
                ) : ledgerData.length === 0 ? (
                  <p className="text-center text-muted-foreground">No transactions found</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Opening Balance</TableHead>
                        <TableHead>Voucher No.</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Narration</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledgerData.map((entry, index) => (
                        <TableRow key={index}>
                          <TableCell>{format(new Date(entry.date), "dd/MM/yyyy")}</TableCell>
                          <TableCell className="text-right">
                            ₹{entry.openingBalance.toFixed(2)}
                          </TableCell>
                          <TableCell>{entry.voucher_number}</TableCell>
                          <TableCell className="capitalize">{entry.type}</TableCell>
                          <TableCell>{entry.narration || "-"}</TableCell>
                          <TableCell className="text-right">
                            {entry.debit > 0 ? `₹${entry.debit.toFixed(2)}` : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {entry.credit > 0 ? `₹${entry.credit.toFixed(2)}` : "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ₹{entry.balance.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            <Card>
                <div className="flex justify-end space-y-6">
              <CardHeader>
                <CardTitle>Closing Balance: </CardTitle>
              </CardHeader>
              <CardContent>
                    <p className="text-2xl font-bold">₹{calculateClosingBalance().toFixed(2)}</p>
              </CardContent>
                </div>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Ledger;