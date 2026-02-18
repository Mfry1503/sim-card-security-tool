import { useState, useEffect } from "react";
import { 
  QrCode, 
  Smartphone, 
  Check, 
  Copy,
  Loader2,
  Download,
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SimCardVisual from "@/components/SimCardVisual";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function EsimConverter() {
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState("");
  const [profiles, setProfiles] = useState([]);
  const [converting, setConverting] = useState(false);
  const [formData, setFormData] = useState({
    profile_name: "",
    carrier: ""
  });
  const [newProfile, setNewProfile] = useState(null);
  const [step, setStep] = useState(1);

  useEffect(() => {
    fetchCards();
  }, []);

  useEffect(() => {
    if (selectedCard) {
      fetchProfiles();
    }
  }, [selectedCard]);

  const fetchCards = async () => {
    try {
      const response = await axios.get(`${API}/cards`);
      setCards(response.data);
      if (response.data.length > 0) {
        setSelectedCard(response.data[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch cards:", error);
    }
  };

  const fetchProfiles = async () => {
    try {
      const response = await axios.get(`${API}/esim/${selectedCard}`);
      setProfiles(response.data);
    } catch (error) {
      console.error("Failed to fetch profiles:", error);
    }
  };

  const generateEsim = async () => {
    if (!formData.profile_name || !formData.carrier) {
      toast.error("Please fill in all fields");
      return;
    }

    setConverting(true);
    try {
      const response = await axios.post(`${API}/esim/convert`, {
        card_id: selectedCard,
        profile_name: formData.profile_name,
        carrier: formData.carrier
      });
      setNewProfile(response.data);
      setProfiles(prev => [response.data, ...prev]);
      setStep(2);
      toast.success("eSIM profile generated successfully");
    } catch (error) {
      toast.error("Failed to generate eSIM profile");
    }
    setConverting(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const resetForm = () => {
    setStep(1);
    setNewProfile(null);
    setFormData({ profile_name: "", carrier: "" });
  };

  const selectedCardData = cards.find(c => c.id === selectedCard);

  // Simple QR Code SVG component (placeholder for actual QR)
  const QRCodeDisplay = ({ data }) => (
    <div className="qr-container mx-auto" data-testid="qr-code-display">
      <div className="w-48 h-48 bg-white flex items-center justify-center relative">
        {/* Simple QR-like pattern */}
        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
          <rect x="0" y="0" width="100" height="100" fill="white"/>
          <g fill="black">
            {/* Corner patterns */}
            <rect x="5" y="5" width="25" height="25"/>
            <rect x="8" y="8" width="19" height="19" fill="white"/>
            <rect x="11" y="11" width="13" height="13"/>
            
            <rect x="70" y="5" width="25" height="25"/>
            <rect x="73" y="8" width="19" height="19" fill="white"/>
            <rect x="76" y="11" width="13" height="13"/>
            
            <rect x="5" y="70" width="25" height="25"/>
            <rect x="8" y="73" width="19" height="19" fill="white"/>
            <rect x="11" y="76" width="13" height="13"/>
            
            {/* Data pattern (simplified) */}
            {[...Array(8)].map((_, i) => (
              [...Array(8)].map((_, j) => (
                (i + j) % 2 === 0 && i > 1 && j > 1 && (i < 6 || j < 6) && (
                  <rect key={`${i}-${j}`} x={35 + i*4} y={35 + j*4} width="3" height="3"/>
                )
              ))
            ))}
          </g>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Smartphone size={24} className="text-primary" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in" data-testid="esim-converter-page">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight uppercase">eSIM Converter</h1>
        <p className="text-muted-foreground mt-1">
          Convert physical SIM profile to eSIM format
        </p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-4 py-4">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`wizard-step-number ${
              step > s ? 'bg-green-500' : 
              step === s ? 'bg-primary' : 'bg-muted'
            }`}>
              {step > s ? <Check size={16} /> : s}
            </div>
            <span className={`text-sm font-medium ${
              step >= s ? 'text-foreground' : 'text-muted-foreground'
            }`}>
              {s === 1 ? 'Configure' : 'Download'}
            </span>
            {s < 2 && <ArrowRight size={16} className="text-muted-foreground ml-2" />}
          </div>
        ))}
      </div>

      {/* Step 1: Configuration */}
      {step === 1 && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-card" data-testid="esim-source-card">
            <CardHeader>
              <CardTitle className="text-lg uppercase tracking-wide flex items-center gap-2">
                <Smartphone size={18} />
                Source Card
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedCard} onValueChange={setSelectedCard}>
                <SelectTrigger data-testid="esim-card-selector">
                  <SelectValue placeholder="Select source card" />
                </SelectTrigger>
                <SelectContent>
                  {cards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.spn} - ...{card.iccid?.slice(-6)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedCardData && (
                <div className="pt-4 space-y-4">
                  <SimCardVisual card={selectedCardData} size="md" className="mx-auto" />
                  <div className="bg-muted/50 p-4 rounded space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ICCID</span>
                      <span className="font-mono text-xs">{selectedCardData.iccid}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IMSI</span>
                      <span className="font-mono text-xs">{selectedCardData.imsi}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card" data-testid="esim-profile-form">
            <CardHeader>
              <CardTitle className="text-lg uppercase tracking-wide flex items-center gap-2">
                <QrCode size={18} />
                eSIM Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile_name">Profile Name</Label>
                <Input
                  id="profile_name"
                  value={formData.profile_name}
                  onChange={(e) => setFormData({ ...formData, profile_name: e.target.value })}
                  placeholder="My eSIM Profile"
                  data-testid="esim-profile-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="carrier">Carrier</Label>
                <Select 
                  value={formData.carrier} 
                  onValueChange={(v) => setFormData({ ...formData, carrier: v })}
                >
                  <SelectTrigger data-testid="esim-carrier-selector">
                    <SelectValue placeholder="Select carrier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="verizon">Verizon</SelectItem>
                    <SelectItem value="att">AT&T</SelectItem>
                    <SelectItem value="tmobile">T-Mobile</SelectItem>
                    <SelectItem value="sprint">Sprint</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={generateEsim}
                  disabled={!selectedCard || converting}
                  className="w-full glow-primary"
                  data-testid="generate-esim-btn"
                >
                  {converting ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    <QrCode size={16} className="mr-2" />
                  )}
                  Generate eSIM Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Download */}
      {step === 2 && newProfile && (
        <Card className="bg-card max-w-lg mx-auto" data-testid="esim-result">
          <CardContent className="py-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <Check size={32} className="text-green-500" />
            </div>
            
            <div>
              <h3 className="text-xl font-semibold uppercase tracking-wide">
                eSIM Profile Ready
              </h3>
              <p className="text-muted-foreground mt-1">
                Scan the QR code with your device to install
              </p>
            </div>

            <QRCodeDisplay data={newProfile.qr_data} />

            <div className="bg-muted/50 p-4 rounded text-left space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Profile Name</span>
                <span className="font-medium">{newProfile.profile_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Carrier</span>
                <Badge variant="outline" className="capitalize">{newProfile.carrier}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Status</span>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  {newProfile.status}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <div className="p-3 bg-muted rounded">
                <p className="text-xs text-muted-foreground mb-1">Activation Code</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono flex-1 truncate">
                    {newProfile.activation_code}
                  </code>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => copyToClipboard(newProfile.activation_code)}
                    data-testid="copy-activation-code-btn"
                  >
                    <Copy size={14} />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={resetForm} className="flex-1">
                Create Another
              </Button>
              <Button className="flex-1" data-testid="download-qr-btn">
                <Download size={16} className="mr-2" />
                Download QR
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Previous Profiles */}
      {profiles.length > 0 && (
        <Card className="bg-card" data-testid="esim-profiles-list">
          <CardHeader>
            <CardTitle className="text-lg uppercase tracking-wide">
              Generated Profiles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {profiles.map((profile) => (
                <div 
                  key={profile.id}
                  className="p-4 border border-border rounded hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <QrCode size={24} className="text-secondary" />
                    <Badge 
                      variant="outline" 
                      className={profile.status === 'ready' 
                        ? 'text-green-400 border-green-500/30' 
                        : 'text-yellow-400 border-yellow-500/30'
                      }
                    >
                      {profile.status}
                    </Badge>
                  </div>
                  <p className="font-medium">{profile.profile_name}</p>
                  <p className="text-sm text-muted-foreground capitalize">{profile.carrier}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(profile.timestamp).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
