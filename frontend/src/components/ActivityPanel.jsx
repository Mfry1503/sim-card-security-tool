import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, RefreshCw } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ActivityPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await axios.get(`${API}/activity?limit=30`);
      setLogs(response.data);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    }
  };

  const clearLogs = async () => {
    setLoading(true);
    try {
      await axios.delete(`${API}/activity/clear`);
      setLogs([]);
      toast.success("Activity log cleared");
    } catch (error) {
      toast.error("Failed to clear logs");
    }
    setLoading(false);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "success": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "error": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "warning": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      <div className="p-2 border-b border-border flex gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={fetchLogs}
          data-testid="refresh-logs-btn"
        >
          <RefreshCw size={14} className="mr-1" />
          Refresh
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={clearLogs}
          disabled={loading}
          data-testid="clear-logs-btn"
        >
          <Trash2 size={14} className="mr-1" />
          Clear
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {logs.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              No activity yet
            </p>
          ) : (
            logs.map((log) => (
              <div 
                key={log.id} 
                className="activity-item animate-fade-in"
                data-testid={`activity-item-${log.id}`}
              >
                <Badge 
                  variant="outline" 
                  className={`text-[10px] shrink-0 ${getStatusColor(log.status)}`}
                >
                  {log.action}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{log.details}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {formatTime(log.timestamp)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
