import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface VoucherFormProps {
  type: "sales" | "purchase" | "receipt" | "payment";
  companyId: string;
  onClose: () => void;
}

interface VoucherItem {
  item_id: string;
  quantity: string;
  rate: string;
  amount: number;
}

const VoucherForm = ({ type, companyId, onClose }: VoucherFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [parties, setParties] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [voucherItems, setVoucherItems] = useState<VoucherItem[]>([]);
  const [formData, setFormData] = useState({
    party_id: "",
    voucher_number: "",
    date: new Date().toISOString().split('T')[0],
    amount: "",
    narration: "",
  });

  const showItems = type === "sales" || type === "purchase";

  useEffect(() => {
    loadParties();
    loadItems();
    generateVoucherNumber();
    setVoucherItems([]);
  }, [type]);

  const loadParties = async () => {
    const partyType = type === "sales" || type === "receipt" ? "customer" : "supplier";
    const { data } = await supabase
      .from("parties")
      .select("*")
      .eq("company_id", companyId)
      .eq("type", partyType);
    
    setParties(data || []);
  };

  const loadItems = async () => {
    const { data } = await supabase
      .from("items")
      .select("*")
      .eq("company_id", companyId);
    
    setItems(data || []);
  };

  const generateVoucherNumber = async () => {
    const prefix = type.substring(0, 3).toUpperCase();
    const { data } = await supabase
      .from("vouchers")
      .select("voucher_number")
      .eq("company_id", companyId)
      .eq("type", type)
      .order("created_at", { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (data && data.length > 0) {
      const lastNumber = parseInt(data[0].voucher_number.split("-")[1]);
      nextNumber = lastNumber + 1;
    }

    setFormData(prev => ({
      ...prev,
      voucher_number: `${prefix}-${nextNumber.toString().padStart(4, "0")}`
    }));
  };

  const addVoucherItem = () => {
    setVoucherItems([...voucherItems, { item_id: "", quantity: "", rate: "", amount: 0 }]);
  };

  const removeVoucherItem = (index: number) => {
    setVoucherItems(voucherItems.filter((_, i) => i !== index));
  };

  const updateVoucherItem = (index: number, field: keyof VoucherItem, value: string) => {
    const newItems = [...voucherItems];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === "quantity" || field === "rate") {
      const quantity = parseFloat(newItems[index].quantity) || 0;
      const rate = parseFloat(newItems[index].rate) || 0;
      newItems[index].amount = quantity * rate;
    }
    
    if (field === "item_id") {
      const selectedItem = items.find(item => item.id === value);
      if (selectedItem) {
        newItems[index].rate = selectedItem.rate.toString();
        const quantity = parseFloat(newItems[index].quantity) || 0;
        newItems[index].amount = quantity * selectedItem.rate;
      }
    }
    
    setVoucherItems(newItems);
  };

  const calculateTotal = () => {
    return voucherItems.reduce((sum, item) => sum + item.amount, 0);
  };

  useEffect(() => {
    if (showItems) {
      setFormData(prev => ({ ...prev, amount: calculateTotal().toString() }));
    }
  }, [voucherItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const totalAmount = showItems ? calculateTotal() : parseFloat(formData.amount);

      // Check if party is a supplier and validate balance
      if (type === "payment") {
        const { data: partyData } = await supabase
          .from("parties")
          .select("type, opening_balance")
          .eq("id", formData.party_id)
          .single();

        if (partyData?.type === "supplier") {
          // Get all vouchers for this supplier
          const { data: existingVouchers } = await supabase
            .from("vouchers")
            .select("type, amount")
            .eq("party_id", formData.party_id);

          // Calculate current balance
          let currentBalance = partyData.opening_balance || 0;
          existingVouchers?.forEach((v) => {
            if (v.type === "purchase" || v.type === "receipt") {
              currentBalance += v.amount;
            } else if (v.type === "payment") {
              currentBalance -= v.amount;
            }
          });

          // Check if payment would make balance negative
          if (currentBalance - totalAmount < 0) {
            toast({
              title: "Error",
              description: "Payment amount exceeds supplier balance. Supplier balance cannot be negative.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
        }
      }

      const { data: voucherData, error: voucherError } = await supabase
        .from("vouchers")
        .insert([{
          user_id: session.user.id,
          company_id: companyId,
          party_id: formData.party_id,
          voucher_number: formData.voucher_number,
          type: type,
          date: formData.date,
          amount: totalAmount,
          narration: formData.narration,
        }])
        .select()
        .single();

      if (voucherError) throw voucherError;

      if (showItems && voucherItems.length > 0) {
        const itemsToInsert = voucherItems.map(item => ({
          voucher_id: voucherData.id,
          item_id: item.item_id,
          quantity: parseFloat(item.quantity),
          rate: parseFloat(item.rate),
          amount: item.amount,
        }));

        const { error: itemsError } = await supabase
          .from("voucher_items")
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      toast({
        title: "Success",
        description: "Voucher created successfully!",
      });
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create voucher",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create {type.charAt(0).toUpperCase() + type.slice(1)} Voucher</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="voucher-number">Voucher Number</Label>
              <Input
                id="voucher-number"
                value={formData.voucher_number}
                onChange={(e) => setFormData({ ...formData, voucher_number: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="party">Party</Label>
            <Select
              value={formData.party_id}
              onValueChange={(value) => setFormData({ ...formData, party_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select party" />
              </SelectTrigger>
              <SelectContent>
                {parties.map((party) => (
                  <SelectItem key={party.id} value={party.id}>
                    {party.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showItems ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button type="button" size="sm" onClick={addVoucherItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
              
              {voucherItems.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {voucherItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Select
                            value={item.item_id}
                            onValueChange={(value) => updateVoucherItem(index, "item_id", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                            <SelectContent>
                              {items.map((i) => (
                                <SelectItem key={i.id} value={i.id}>
                                  {i.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0"
                            value={item.quantity}
                            onChange={(e) => updateVoucherItem(index, "quantity", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={item.rate}
                            onChange={(e) => updateVoucherItem(index, "rate", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>₹{item.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeVoucherItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-bold">Total</TableCell>
                      <TableCell className="font-bold">₹{calculateTotal().toFixed(2)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="narration">Narration</Label>
            <Textarea
              id="narration"
              placeholder="Enter narration (optional)"
              value={formData.narration}
              onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Voucher"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default VoucherForm;