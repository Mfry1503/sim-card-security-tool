import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Usb, 
  Users, 
  MessageSquare, 
  Copy, 
  ShieldCheck, 
  QrCode, 
  Download,
  Activity,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import ConnectionHeader from "@/components/ConnectionHeader";
import ActivityPanel from "@/components/ActivityPanel";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/reader", icon: Usb, label: "Card Reader" },
  { path: "/contacts", icon: Users, label: "Contacts" },
  { path: "/sms", icon: MessageSquare, label: "SMS" },
  { path: "/clone", icon: Copy, label: "Clone Tool" },
  { path: "/security", icon: ShieldCheck, label: "Security" },
  { path: "/esim", icon: QrCode, label: "eSIM Convert" },
  { path: "/export", icon: Download, label: "Export/Import" },
];

export default function Layout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [readers, setReaders] = useState([]);
  const [activeReader, setActiveReader] = useState(null);

  useEffect(() => {
    fetchReaders();
  }, []);

  const fetchReaders = async () => {
    try {
      const response = await axios.get(`${API}/readers`);
      setReaders(response.data);
      const connected = response.data.find(r => r.status === "connected");
      if (connected) setActiveReader(connected);
    } catch (error) {
      console.error("Failed to fetch readers:", error);
    }
  };

  const NavContent = () => (
    <nav className="flex flex-col gap-1 p-3">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            `sidebar-nav-item ${isActive ? "active" : ""}`
          }
          data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <item.icon size={18} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="app-container tech-grid">
      {/* Connection Header */}
      <ConnectionHeader 
        readers={readers} 
        activeReader={activeReader}
        onRefresh={fetchReaders}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="sidebar hidden md:flex" data-testid="desktop-sidebar">
          <div className="p-4 border-b border-border">
            <h1 className="text-xl font-bold tracking-tight text-primary uppercase">
              SimGuard Pro
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              SIM Security Tool
            </p>
          </div>
          <ScrollArea className="flex-1">
            <NavContent />
          </ScrollArea>
        </aside>

        {/* Mobile Sidebar */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden fixed bottom-4 left-4 z-50 bg-card"
              data-testid="mobile-menu-trigger"
            >
              <Menu size={24} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-card">
            <div className="p-4 border-b border-border">
              <h1 className="text-xl font-bold tracking-tight text-primary uppercase">
                SimGuard Pro
              </h1>
            </div>
            <ScrollArea className="h-[calc(100vh-80px)]">
              <NavContent />
            </ScrollArea>
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <main className="main-content flex-1 overflow-y-auto" data-testid="main-content">
          <Outlet context={{ readers, activeReader, setActiveReader, fetchReaders }} />
        </main>

        {/* Activity Panel Toggle */}
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-4 right-4 z-40 bg-card"
          onClick={() => setShowActivity(!showActivity)}
          data-testid="activity-panel-toggle"
        >
          <Activity size={20} />
        </Button>

        {/* Activity Panel */}
        {showActivity && (
          <aside className="w-80 bg-card border-l border-border animate-slide-in hidden lg:block" data-testid="activity-panel">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold uppercase tracking-wide text-sm">Activity Log</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowActivity(false)}>
                <X size={16} />
              </Button>
            </div>
            <ActivityPanel />
          </aside>
        )}
      </div>
    </div>
  );
}
