import { NavLink } from "@/components/NavLink";
import { LayoutDashboard, Users, FileText, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Agent", href: "/agent", icon: Users },
  { name: "Invoices", href: "/invoices", icon: FileText },
];

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [open, setOpen] = useState(false);

  const NavContent = () => (
    <>
      <div className="p-6 border-b border-[#2b2c3b]">
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className="flex items-center gap-3 px-4 py-3 text-gray-300 rounded-lg transition-colors hover:bg-[#2b2c3b]"
            activeClassName="bg-[#2b2c3b] text-[#7c4dff] font-medium"
            onClick={() => setOpen(false)}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );

  return (
    <div className="flex h-screen bg-[#171821]">
      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      {/* Mobile Navigation Drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 bg-[#21222D] p-0 border-r border-[#2b2c3b]">
          <NavContent />
        </SheetContent>
      </Sheet>
    </div>
  );
}
