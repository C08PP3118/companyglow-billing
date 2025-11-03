import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface VoucherFormProps {
  type: "sales" | "purchase" | "receipt" | "payment";
  companyId: string;
  onClose: () => void;
}

const VoucherForm = ({ type, companyId, onClose }: VoucherFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [parties, setParties] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    party_id: "",
    voucher_number: "",
    date: new Date().toISOString().split('T')[0],
    amount: "",
    narration: "",
  });

  useEffect(() => {
    loadParties();
    generateVoucherNumber();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("vouchers")
        .insert([{
          user_id: session.user.id,
          company_id: companyId,
          party_id: formData.party_id,
          voucher_number: formData.voucher_number,
          type: type,
          date: formData.date,
          amount: parseFloat(formData.amount),
          narration: formData.narration,
        }]);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Voucher created successfully!",
        });
        onClose();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create voucher",
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