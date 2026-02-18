import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { 
  Usb, 
  RefreshCw, 
  CreditCard, 
  Check, 
  X,
  Loader2,
  Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import SimCardVisual from "@/components/SimCardVisual";
import HexViewer from "@/components/HexViewer";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CardReader() {
  const { readers, activeReader, setActiveReader, fetchReaders } = useOutletContext();
  const [selectedCard, setSelectedCard] = useState(null);
  const [cards, setCards] = useState([]);
  const [reading, setReading] = useState(false);
  const [connecting, setConnecting] = useState(null);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const response = await axios.get(`${API}/cards`);
      setCards(response.data);
      if (response.data.length > 0 && !selectedCard) {
        setSelectedCard(response.data[0]);
      }
    } catch (error) {
      console.error("Failed to fetch cards:", error);
    }
  };

  const connectReader = async (reader) => {
    setConnecting(reader.id);
    try {
      await axios.post(`${API}/readers/${reader.id}/connect`);
      setActiveReader({ ...reader, status: "connected" });
      toast.success(`Connected to ${reader.name}`);
    } catch (error) {
      toast.error("Failed to connect to reader");
    }
    setConnecting(null);
  };

  const readCard = async () => {
    if (!activeReader) {
      toast.error("No reader connected");
      return;
    }
    setReading(true);
    try {
      const response = await axios.post(`${API}/cards/read?reader_id=${activeReader.id}`);
      setSelectedCard(response.data);
      setCards(prev => [response.data, ...prev]);
      toast.success("Card read successfully");
    } catch (error) {
      toast.error("Failed to read card");
    }
    setReading(false);
  };

  const deleteCard = async (cardId) => {
    try {
      await axios.delete(`${API}/cards/${cardId}`);
      setCards(prev => prev.filter(c => c.id !== cardId));
      if (selectedCard?.id === cardId) {
        setSelectedCard(cards.find(c => c.id !== cardId) || null);
      }
      toast.success("Card deleted");
    } catch (error) {
      toast.error("Failed to delete card");
    }
  };

  const DataField = ({ label, value, tooltip }) => (
    <div className="flex justify-between items-start py-2 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info size={12} className="text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <span className="font-mono text-sm text-right">{value || "N/A"}</span>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in" data-testid="card-reader-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight uppercase">Card Reader</h1>
          <p className="text-muted-foreground mt-1">
            Connect to PC/SC readers and read SIM card data
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={fetchReaders}
            data-testid="scan-readers-btn"
          >
            <RefreshCw size={16} className="mr-2" />
            Scan Readers
          </Button>
          <Button 
            onClick={readCard} 
            disabled={!activeReader || reading}
            className="glow-primary"
            data-testid="read-card-btn"
          >
            {reading ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <CreditCard size={16} className="mr-2" />
            )}
            Read Card
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Readers Panel */}
        <Card className="bg-card" data-testid="readers-panel">
          <CardHeader>
            <CardTitle className="text-lg uppercase tracking-wide flex items-center gap-2">
              <Usb size={18} className="text-secondary" />
              Available Readers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {readers.length === 0 ? (
              <div className="empty-state py-8">
                <Usb size={40} className="mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm">No readers detected</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Connect a PC/SC reader and click Scan
                </p>
              </div>
            ) : (
              readers.map((reader) => (
                <div 
                  key={reader.id}
                  className={`p-4 rounded border transition-colors ${
                    activeReader?.id === reader.id 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  data-testid={`reader-card-${reader.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`status-dot mt-1.5 ${
                        reader.status === 'connected' ? 'status-connected' : 
                        reader.status === 'busy' ? 'status-busy' : 'status-disconnected'
                      }`} />
                      <div>
                        <p className="font-medium text-sm">{reader.name}</p>
                        <p className="text-xs text-muted-foreground">{reader.type}</p>
                        {reader.status === 'connected' && reader.atr && (
                          <p className="text-xs font-mono text-muted-foreground mt-1 truncate max-w-[180px]">
                            ATR: {reader.atr}
                          </p>
                        )}
                      </div>
                    </div>
                    {reader.status !== 'connected' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => connectReader(reader)}
                        disabled={connecting === reader.id}
                        data-testid={`connect-reader-${reader.id}`}
                      >
                        {connecting === reader.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          "Connect"
                        )}
                      </Button>
                    )}
                    {reader.status === 'connected' && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        <Check size={12} className="mr-1" />
                        Active
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Card Info Panel */}
        <Card className="bg-card lg:col-span-2" data-testid="card-info-panel">
          <CardHeader>
            <CardTitle className="text-lg uppercase tracking-wide flex items-center gap-2">
              <CreditCard size={18} />
              Card Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedCard ? (
              <div className="empty-state py-12">
                <CreditCard size={48} className="mx-auto mb-4 text-muted-foreground" />
                <p>No card selected</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Read a card or select from history
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Visual & Basic Info */}
                <div className="space-y-4">
                  <SimCardVisual card={selectedCard} size="lg" className="mx-auto" />
                  
                  <div className="space-y-1">
                    <DataField 
                      label="Card ID (ICCID)" 
                      value={selectedCard.iccid}
                      tooltip="Integrated Circuit Card Identifier - Unique 19-20 digit serial number"
                    />
                    <DataField 
                      label="Subscriber ID (IMSI)" 
                      value={selectedCard.imsi}
                      tooltip="International Mobile Subscriber Identity - Used to identify the user"
                    />
                    <DataField 
                      label="Phone Number (MSISDN)" 
                      value={selectedCard.msisdn}
                      tooltip="Mobile Subscriber Integrated Services Digital Network Number"
                    />
                    <DataField 
                      label="Service Provider" 
                      value={selectedCard.spn}
                      tooltip="Service Provider Name stored on the SIM"
                    />
                  </div>
                </div>

                {/* Technical Details */}
                <div className="space-y-4">
                  <div className="bg-muted/50 p-4 rounded space-y-1">
                    <h4 className="text-sm font-semibold uppercase tracking-wide mb-3">
                      Network Codes
                    </h4>
                    <DataField 
                      label="Country Code (MCC)" 
                      value={selectedCard.mcc}
                      tooltip="Mobile Country Code - 3 digit country identifier"
                    />
                    <DataField 
                      label="Network Code (MNC)" 
                      value={selectedCard.mnc}
                      tooltip="Mobile Network Code - Identifies the carrier"
                    />
                    <DataField 
                      label="Card Type" 
                      value={selectedCard.card_type?.toUpperCase()}
                    />
                  </div>

                  {/* Security Keys (if available) */}
                  <div className="bg-muted/50 p-4 rounded space-y-1">
                    <h4 className="text-sm font-semibold uppercase tracking-wide mb-3 flex items-center gap-2">
                      Security Keys
                      <Badge variant="outline" className="text-xs">Sensitive</Badge>
                    </h4>
                    <DataField 
                      label="Ki" 
                      value={selectedCard.ki ? "****" : "Not Extracted"}
                      tooltip="Authentication Key - Used for authentication with the network"
                    />
                    <DataField 
                      label="OPc" 
                      value={selectedCard.opc ? "****" : "Not Extracted"}
                      tooltip="Operator Variant Algorithm Configuration Field"
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Card History */}
      {cards.length > 0 && (
        <Card className="bg-card" data-testid="card-history">
          <CardHeader>
            <CardTitle className="text-lg uppercase tracking-wide">
              Scanned Cards History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {cards.map((card) => (
                <div 
                  key={card.id}
                  className={`p-4 rounded border cursor-pointer transition-all ${
                    selectedCard?.id === card.id 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedCard(card)}
                  data-testid={`history-card-${card.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <SimCardVisual card={card} size="sm" />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCard(card.id);
                      }}
                      data-testid={`delete-card-${card.id}`}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                  <p className="text-sm font-medium truncate">{card.spn}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    ...{card.iccid?.slice(-8)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hex View */}
      {selectedCard && (
        <HexViewer 
          data={selectedCard.iccid + selectedCard.imsi} 
          title="Raw Card Data (Hex View)"
        />
      )}
    </div>
  );
}
