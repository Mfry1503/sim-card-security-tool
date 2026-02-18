import { useState, useEffect } from "react";
import { Usb, RefreshCw, Signal, SignalZero, Cpu, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ConnectionHeader({ readers, activeReader, onRefresh }) {
  const [hardwareStatus, setHardwareStatus] = useState(null);
  const connectedReader = activeReader || readers.find(r => r.status === "connected");

  useEffect(() => {
    fetchHardwareStatus();
  }, []);

  const fetchHardwareStatus = async () => {
    try {
      const response = await axios.get(`${API}/hardware/status`);
      setHardwareStatus(response.data);
    } catch (error) {
      console.error("Failed to fetch hardware status:", error);
    }
  };

  return (
    <header className="glass-panel px-4 py-3 flex items-center justify-between" data-testid="connection-header">
      <div className="flex items-center gap-4">
        {/* Hardware Mode Indicator */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <Cpu size={14} className={hardwareStatus?.hardware_mode ? "text-green-400" : "text-yellow-400"} />
                <Badge 
                  variant="outline" 
                  className={`text-[10px] ${
                    hardwareStatus?.hardware_mode 
                      ? "text-green-400 border-green-500/30" 
                      : "text-yellow-400 border-yellow-500/30"
                  }`}
                >
                  {hardwareStatus?.hardware_mode ? "HARDWARE" : "DEMO"}
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                {hardwareStatus?.hardware_mode 
                  ? "Real hardware mode - pyscard installed" 
                  : "Demo mode - Install pyscard for real hardware"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* LED Indicator */}
        <div className="flex items-center gap-2">
          <div 
            className={`led-indicator ${connectedReader ? 'led-on' : 'led-off'}`}
            data-testid="connection-led"
          />
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {connectedReader ? "Reader Connected" : "No Reader"}
          </span>
        </div>

        {/* Reader Info */}
        {connectedReader && (
          <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-border">
            <Usb size={16} className="text-secondary" />
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{connectedReader.name}</p>
              {connectedReader.is_real && (
                <Badge className="text-[9px] bg-green-500/20 text-green-400 border-green-500/30">
                  REAL
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Reader Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2" data-testid="reader-selector">
              {connectedReader ? (
                <Signal size={14} className="text-green-500" />
              ) : (
                <SignalZero size={14} className="text-muted-foreground" />
              )}
              <span className="hidden sm:inline">
                {readers.length} Reader{readers.length !== 1 ? "s" : ""}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            {readers.length === 0 ? (
              <DropdownMenuItem disabled>No readers detected</DropdownMenuItem>
            ) : (
              readers.map((reader) => (
                <DropdownMenuItem 
                  key={reader.id} 
                  className="flex items-center gap-2"
                  data-testid={`reader-item-${reader.id}`}
                >
                  <div className={`status-dot ${reader.status === 'connected' ? 'status-connected' : 'status-disconnected'}`} />
                  <div className="flex-1">
                    <p className="text-sm">{reader.name}</p>
                    <p className="text-xs text-muted-foreground">{reader.type}</p>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Refresh Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onRefresh}
          data-testid="refresh-readers-btn"
        >
          <RefreshCw size={16} />
        </Button>
      </div>
    </header>
  );
}
