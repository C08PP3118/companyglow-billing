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
                <CardTitle>Balance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Opening Balance</p>
                    <p className="text-2xl font-bold">₹{openingBalance.toFixed(2)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Closing Balance</p>
                    <p className="text-2xl font-bold">₹{calculateClosingBalance().toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

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
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Ledger;