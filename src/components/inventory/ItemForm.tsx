import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface ItemFormProps {
  companyId: string;
  item?: any;
  onClose: () => void;
}

const ItemForm = ({ companyId, item, onClose }: ItemFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    unit: "",
    rate: "",
    opening_stock: "0",
    reorder_level: "0",
  });

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        description: item.description || "",
        unit: item.unit,
        rate: item.rate.toString(),
        opening_stock: item.opening_stock.toString(),
        reorder_level: item.reorder_level.toString(),
      });
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const itemData = {
        user_id: session.user.id,
        company_id: companyId,
        name: formData.name,
        description: formData.description || null,
        unit: formData.unit,
        rate: parseFloat(formData.rate),
        opening_stock: parseFloat(formData.opening_stock),
        current_stock: item ? undefined : parseFloat(formData.opening_stock),
        reorder_level: parseFloat(formData.reorder_level),
      };

      let error;
      if (item) {
        ({ error } = await supabase
          .from("items")
          .update(itemData)
          .eq("id", item.id));
      } else {
        ({ error } = await supabase
          .from("items")
          .insert([itemData]));
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
          description: `Item ${item ? "updated" : "created"} successfully!`,
        });
        onClose();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${item ? "update" : "create"} item`,
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
          <DialogTitle>{item ? "Edit" : "Add"} Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter item name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit *</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="e.g., Pcs, Kg, L"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter description"
              rows={3}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="rate">Rate *</Label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="opening-stock">Opening Stock</Label>
              <Input
                id="opening-stock"
                type="number"
                step="0.01"
                value={formData.opening_stock}
                onChange={(e) => setFormData({ ...formData, opening_stock: e.target.value })}
                placeholder="0"
                disabled={!!item}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorder-level">Reorder Level</Label>
              <Input
                id="reorder-level"
                type="number"
                step="0.01"
                value={formData.reorder_level}
                onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {item ? "Updating..." : "Creating..."}
                </>
              ) : (
                item ? "Update" : "Create"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ItemForm;
