import { ReactNode, useEffect, useState } from "react";
import { useNavigate, NavLink, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  FileText, 
  BookOpen, 
  Package, 
  LogOut,
  Building2,
  Users,
} from "lucide-react";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Parties", url: "/parties", icon: Users },
  { title: "Vouchers", url: "/vouchers", icon: FileText },
  { title: "Ledger", url: "/ledger", icon: BookOpen },
  { title: "Inventory", url: "/inventory", icon: Package },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  
  const collapsed = state === "collapsed";

  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: companies } = await supabase
        .from("companies")
        .select("name")
        .eq("user_id", session.user.id)
        .limit(1)
        .single();
      
      if (companies) {
        setCompanyName(companies.name);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"}>
      <SidebarContent>
        <div className="p-4 border-b border-sidebar-border">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-sm truncate">{companyName || "Billing System"}</h2>
                <p className="text-xs text-muted-foreground">Management</p>
              </div>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-3">Logout</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 bg-background">
          <header className="h-14 border-b border-border flex items-center px-4">
            <SidebarTrigger />
          </header>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;