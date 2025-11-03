import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface PartyListProps {
  type: "customer" | "supplier";
  companyId: string;
  onEdit: (party: any) => void;
}

const PartyList = ({ type, companyId, onEdit }: PartyListProps) => {
  const { toast } = useToast();
  const [parties, setParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteParty, setDeleteParty] = useState<any>(null);

  useEffect(() => {
    loadParties();
  }, [type, companyId]);

  const loadParties = async () => {
    if (!companyId) return;
    
    setLoading(true);
    const { data } = await supabase
      .from("parties")
      .select("*")
      .eq("company_id", companyId)
      .eq("type", type)
      .order("created_at", { ascending: false });
    
    setParties(data || []);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteParty) return;

    const { error } = await supabase
      .from("parties")
      .delete()
      .eq("id", deleteParty.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully!`,
      });
      loadParties();
    }
    setDeleteParty(null);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (parties.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            No {type}s found. Create one to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{type === "customer" ? "Customers" : "Suppliers"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Opening Balance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parties.map((party) => (
                <TableRow key={party.id}>
                  <TableCell className="font-medium">{party.name}</TableCell>
                  <TableCell>{party.mobile_number || "-"}</TableCell>
                  <TableCell>{party.address || "-"}</TableCell>
                  <TableCell className="text-right">₹{parseFloat(party.opening_balance).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(party)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteParty(party)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteParty} onOpenChange={() => setDeleteParty(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleteParty?.name}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PartyList;
