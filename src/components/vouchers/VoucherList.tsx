import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface VoucherListProps {
  type: "sales" | "purchase" | "receipt" | "payment";
  companyId: string;
}

const VoucherList = ({ type, companyId }: VoucherListProps) => {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (companyId) {
      loadVouchers();
      
    }
  }, [type, companyId]);

  const loadVouchers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vouchers")
      .select(`
        *,
        parties (name),
        voucher_items (
          *,
          items (name)
        )
      `)
      .eq("company_id", companyId)
      .eq("type", type)
      .order("date", { ascending: false });

    setVouchers(data || []);
    setLoading(false);
  };

  const handlePrint = async (voucher: any) => {
    const { data: companyData, error: companyError } = await supabase
      .from("companies")
      .select("name, mobile_number")
      .eq("id", companyId)
      .single();

    if (companyError) {
      console.error("Error fetching company details:", companyError);
      // Handle error, maybe show a toast message
      return;
    }

    let itemsTable = "";
    if ((type === "sales" || type === "purchase") && voucher.voucher_items.length > 0) {
      const itemsRows = voucher.voucher_items
        .map(
          (item: any) => `
        <tr>
          <td>${item.items.name}</td>
          <td style="text-align: right;">${item.quantity}</td>
          <td style="text-align: right;">${Number(item.rate).toFixed(2)}</td>
          <td style="text-align: right;">${Number(item.amount).toFixed(2)}</td>
        </tr>
      `
        )
        .join("");

      itemsTable = `
        <h2>Items</h2>
        <table>
          <thead>
            <tr>
              <th>Item Name</th>
              <th style="text-align: right;">Quantity</th>
              <th style="text-align: right;">Rate</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
            <tr>
              <td colspan="3" style="text-align: right; font-weight: bold;">Grand Total</td>
              <td style="text-align: right; font-weight: bold;">${Number(voucher.amount).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      `;
    }

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Voucher ${voucher.voucher_number}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #333; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <div style="text-align: center; margin-bottom: 20px;">
              <h2>${companyData.name}</h2>
              <p>${companyData.mobile_number}</p>
            </div>
            <h3>${type.charAt(0).toUpperCase() + type.slice(1)} Voucher</h3>
            <p><strong>Voucher Number:</strong> ${voucher.voucher_number}</p>
            <p><strong>Date:</strong> ${new Date(voucher.date).toLocaleDateString()}</p>
            <p><strong>Party:</strong> ${voucher.parties.name}</p>
            <p><strong>Amount:</strong> ₹${voucher.amount}</p>
            ${itemsTable}
            <p><strong>Narration:</strong> ${voucher.narration || "-"}</p>

          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (vouchers.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No {type} vouchers found. Create your first voucher to get started.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Voucher No.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Party</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Narration</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vouchers.map((voucher) => (
              <TableRow key={voucher.id}>
                <TableCell className="font-medium">{voucher.voucher_number}</TableCell>
                <TableCell>{new Date(voucher.date).toLocaleDateString()}</TableCell>
                <TableCell>{voucher.parties.name}</TableCell>
                <TableCell>₹{Number(voucher.amount).toFixed(2)}</TableCell>
                <TableCell className="max-w-xs truncate">{voucher.narration || "-"}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePrint(voucher)}
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default VoucherList;