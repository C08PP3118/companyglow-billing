import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Building2 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      const { data: companies } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", session.user.id)
        .limit(1);

      if (companies && companies.length > 0) {
        navigate("/dashboard");
      } else {
        navigate("/company-setup");
      }
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-lg flex items-center justify-center mb-4">
          <Building2 className="w-8 h-8 text-white" />
        </div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    </div>
  );
};

export default Index;
