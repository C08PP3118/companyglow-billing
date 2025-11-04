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
    if (type === "sales" || type === "purchase") {
      // Table for sales/purchase vouchers
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
        <table>
          <thead>
            <tr>
              <th>Item Name</th>
              <th style="text-align: right;">Quantity</th>
              <th style="text-align: right;">Rate</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
            <tr>
              <td colspan="3" style="text-align: right; font-weight: bold;">Grand Total</td>
              <td style="text-align: right; font-weight: bold;">₹${Number(voucher.amount).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      `;
    } else {
      // Table for receipt/payment vouchers
      itemsTable = `
        <table>
          <thead>
            <tr>
              <th>Particulars</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${type.charAt(0).toUpperCase() + type.slice(1)} from ${voucher.parties.name}</td>
              <td style="text-align: right;">₹${Number(voucher.amount).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="text-align: right; font-weight: bold;">Total</td>
              <td style="text-align: right; font-weight: bold;">₹${Number(voucher.amount).toFixed(2)}</td>
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
              body { 
                font-family: Arial, sans-serif; 
                padding: 20px;
                max-width: 800px;
                margin: 0 auto;
              }
              .header { 
                text-align: center;
                margin-bottom: 20px;
                padding: 10px;
                border-bottom: 2px solid #333;
              }
              .voucher-number {
                text-align: left;
                margin: 10px 0;
                font-size: 14px;
              }
              .info-box {
                border: 1px solid #ddd;
                padding: 10px;
                margin: 10px 0;
                border-radius: 4px;
              }
              .info-container {
                display: flex;
                justify-content: space-between;
                margin: 20px 0;
              }
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 20px 0; 
              }
              th, td { 
                border: 1px solid #ddd; 
                padding: 8px; 
              }
              th { 
                background-color: #f2f2f2; 
              }
              .narration-box {
                margin-top: 20px;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>${type.charAt(0).toUpperCase() + type.slice(1)} Voucher</h2>
            </div>
            
            <div class="voucher-number">
              <strong>Voucher No: </strong>${voucher.voucher_number}
              <span style="float: right;">
                <strong>Date: </strong>${new Date(voucher.date).toLocaleDateString()}
              </span>
            </div>

            <div class="info-container">
              <div class="info-box" style="width: 45%;">
                <h4 style="margin: 0 0 10px 0;">Company Details</h4>
                <p style="margin: 5px 0;"><strong>${companyData.name}</strong></p>
                <p style="margin: 5px 0;">Contact: ${companyData.mobile_number}</p>
              </div>
              
              <div class="info-box" style="width: 45%;">
                <h4 style="margin: 0 0 10px 0;">Party Details</h4>
                <p style="margin: 5px 0;"><strong>${voucher.parties.name}</strong></p>
              </div>
            </div>

            ${itemsTable}

            <div class="narration-box">
              <strong>Narration:</strong> ${voucher.narration || "-"}
            </div>
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