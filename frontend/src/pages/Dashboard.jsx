import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { 
  Usb, 
  Users, 
  MessageSquare, 
  Copy, 
  ShieldCheck, 
  QrCode,
  CreditCard,
  Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SimCardVisual from "@/components/SimCardVisual";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Dashboard() {
  const navigate = useNavigate();
  const { readers, activeReader } = useOutletContext();
  const [cards, setCards] = useState([]);
  const [stats, setStats] = useState({ contacts: 0, sms: 0, analyses: 0 });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cardsRes, contactsRes, smsRes, activityRes] = await Promise.all([
        axios.get(`${API}/cards`),
        axios.get(`${API}/contacts`),
        axios.get(`${API}/sms`),
        axios.get(`${API}/activity?limit=5`)
      ]);
      setCards(cardsRes.data);
      setStats({
        contacts: contactsRes.data.length,
        sms: smsRes.data.length,
        analyses: 0
      });
      setRecentActivity(activityRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
    setLoading(false);
  };

  const quickActions = [
    { icon: Usb, label: "Read Card", path: "/reader", color: "text-secondary" },
    { icon: Users, label: "Manage Contacts", path: "/contacts", color: "text-green-400" },
    { icon: MessageSquare, label: "View SMS", path: "/sms", color: "text-yellow-400" },
    { icon: Copy, label: "Clone Card", path: "/clone", color: "text-purple-400" },
    { icon: ShieldCheck, label: "Security Scan", path: "/security", color: "text-red-400" },
    { icon: QrCode, label: "Convert to eSIM", path: "/esim", color: "text-cyan-400" },
  ];

  return (
    <div className="space-y-6 animate-fade-in" data-testid="dashboard">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight uppercase">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          SIM Card Security & Management Console
        </p>
      </div>

      {/* Connection Status Card */}
      <Card className="card-info" data-testid="connection-status-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 uppercase tracking-wide">
            <Usb size={18} className="text-secondary" />
            Reader Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`status-dot ${activeReader ? 'status-connected' : 'status-disconnected'}`} />
              <div>
                <p className="font-medium">
                  {activeReader ? activeReader.name : "No Reader Connected"}
                </p>
                {activeReader && (
                  <p className="text-sm text-muted-foreground font-mono">
                    Protocol: {activeReader.protocol || "N/A"}
                  </p>
                )}
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => navigate("/reader")}
              data-testid="go-to-reader-btn"
            >
              Configure Reader
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card" data-testid="stat-cards">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{cards.length}</p>
                <p className="text-sm text-muted-foreground">Cards Scanned</p>
              </div>
              <CreditCard className="text-primary" size={24} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.contacts}</p>
                <p className="text-sm text-muted-foreground">Contacts</p>
              </div>
              <Users className="text-green-400" size={24} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.sms}</p>
                <p className="text-sm text-muted-foreground">SMS Messages</p>
              </div>
              <MessageSquare className="text-yellow-400" size={24} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{readers.length}</p>
                <p className="text-sm text-muted-foreground">Readers</p>
              </div>
              <Usb className="text-secondary" size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold uppercase tracking-wide mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {quickActions.map((action) => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="quick-action-card flex flex-col items-center gap-3 text-center"
              data-testid={`quick-action-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <action.icon size={28} className={action.color} />
              <span className="text-sm font-medium uppercase tracking-wide">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Cards & Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Cards */}
        <Card className="bg-card" data-testid="recent-cards">
          <CardHeader>
            <CardTitle className="text-lg uppercase tracking-wide flex items-center gap-2">
              <CreditCard size={18} />
              Recent Cards
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cards.length === 0 ? (
              <div className="empty-state">
                <CreditCard size={40} className="mx-auto mb-3 text-muted-foreground" />
                <p>No cards scanned yet</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => navigate("/reader")}
                >
                  Scan First Card
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {cards.slice(0, 3).map((card) => (
                  <div 
                    key={card.id} 
                    className="flex items-center gap-4 p-3 bg-muted/50 rounded"
                  >
                    <SimCardVisual card={card} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{card.spn}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        ICCID: {card.iccid?.slice(-8)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {card.card_type}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-card" data-testid="recent-activity">
          <CardHeader>
            <CardTitle className="text-lg uppercase tracking-wide flex items-center gap-2">
              <Activity size={18} />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="empty-state">
                <Activity size={40} className="mx-auto mb-3 text-muted-foreground" />
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((log) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <Badge 
                      variant="outline" 
                      className={`text-[10px] shrink-0 ${
                        log.status === 'success' ? 'text-green-400 border-green-500/30' : 
                        log.status === 'error' ? 'text-red-400 border-red-500/30' : 
                        'text-yellow-400 border-yellow-500/30'
                      }`}
                    >
                      {log.action}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{log.details}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
