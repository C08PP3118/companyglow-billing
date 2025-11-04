import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface PartyFormProps {
  type: "customer" | "supplier";
  companyId: string;
  party?: any;
  onClose: () => void;
}

const PartyForm = ({ type, companyId, party, onClose }: PartyFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    mobile_number: "",
    address: "",
    opening_balance: "0",
  });

  useEffect(() => {
    if (party) {
      setFormData({
        name: party.name,
        mobile_number: party.mobile_number || "",
        address: party.address || "",
        opening_balance: party.opening_balance.toString(),
      });
    }
  }, [party]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const partyData = {
        user_id: session.user.id,
        company_id: companyId,
        type: type,
        name: formData.name,
        mobile_number: formData.mobile_number || null,
        address: formData.address || null,
        opening_balance: parseFloat(formData.opening_balance),
      };

      let error;
      if (party) {
        ({ error } = await supabase
          .from("parties")
          .update(partyData)
          .eq("id", party.id));
      } else {
        ({ error } = await supabase
          .from("parties")
          .insert([partyData]));
      }

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `${type.charAt(0).toUpperCase() + type.slice(1)} ${party ? "updated" : "created"} successfully!`,
        });
        onClose();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${party ? "update" : "create"} ${type}`,
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
          <DialogTitle>
            {party ? "Edit" : "Add"} {type.charAt(0).toUpperCase() + type.slice(1)}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile Number</Label>
            <Input
              id="mobile"
              type="tel"
              value={formData.mobile_number}
              onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
              placeholder="Enter mobile number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Enter address"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="opening-balance">Opening Balance</Label>
            <Input
              id="opening-balance"
              type="number"
              step="0.01"
              value={formData.opening_balance}
              onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
              placeholder="0.00"
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
                  {party ? "Updating..." : "Creating..."}
                </>
              ) : (
                party ? "Update" : "Create"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PartyForm;
