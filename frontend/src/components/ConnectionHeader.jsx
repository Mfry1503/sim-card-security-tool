import { Usb, RefreshCw, Signal, SignalZero } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ConnectionHeader({ readers, activeReader, onRefresh }) {
  const connectedReader = activeReader || readers.find(r => r.status === "connected");

  return (
    <header className="glass-panel px-4 py-3 flex items-center justify-between" data-testid="connection-header">
      <div className="flex items-center gap-4">
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
            <div>
              <p className="text-sm font-medium">{connectedReader.name}</p>
              <p className="text-xs text-muted-foreground font-mono">
                ATR: {connectedReader.atr?.substring(0, 20)}...
              </p>
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
