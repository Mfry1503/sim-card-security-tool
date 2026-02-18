import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { 
  Copy, 
  CreditCard, 
  Users, 
  MessageSquare, 
  Settings,
  Check,
  AlertTriangle,
  Loader2,
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import SimCardVisual from "@/components/SimCardVisual";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CloneTool() {
  const { activeReader } = useOutletContext();
  const [cards, setCards] = useState([]);
  const [sourceCard, setSourceCard] = useState("");
  const [cloneOptions, setCloneOptions] = useState({
    clone_contacts: true,
    clone_sms: true,
    clone_settings: true
  });
  const [cloning, setCloning] = useState(false);
  const [cloneResult, setCloneResult] = useState(null);
  const [step, setStep] = useState(1);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const response = await axios.get(`${API}/cards`);
      setCards(response.data);
    } catch (error) {
      console.error("Failed to fetch cards:", error);
    }
  };

  const startClone = async () => {
    if (!sourceCard) {
      toast.error("Please select a source card");
      return;
    }
    if (!activeReader) {
      toast.error("No reader connected. Please connect a reader first.");
      return;
    }

    setCloning(true);
    setStep(2);
    setProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 300);

    try {
      const response = await axios.post(`${API}/clone`, {
        source_card_id: sourceCard,
        ...cloneOptions
      });
      
      clearInterval(progressInterval);
      setProgress(100);
      setCloneResult(response.data);
      setStep(3);
      toast.success("Clone operation completed successfully");
    } catch (error) {
      clearInterval(progressInterval);
      toast.error("Clone operation failed");
      setStep(1);
    }
    setCloning(false);
  };

  const resetWizard = () => {
    setStep(1);
    setSourceCard("");
    setCloneResult(null);
    setProgress(0);
    setCloneOptions({
      clone_contacts: true,
      clone_sms: true,
      clone_settings: true
    });
  };

  const sourceCardData = cards.find(c => c.id === sourceCard);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="clone-tool-page">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight uppercase">Clone Tool</h1>
        <p className="text-muted-foreground mt-1">
          Duplicate SIM card data to a new card
        </p>
      </div>

      {/* Warning */}
      <Alert className="border-yellow-500/50 bg-yellow-500/10">
        <AlertTriangle className="h-4 w-4 text-yellow-500" />
        <AlertTitle className="text-yellow-500">Important Notice</AlertTitle>
        <AlertDescription className="text-yellow-200/80">
          Cloning SIM cards may be regulated in your jurisdiction. Ensure you have proper 
          authorization and are only cloning cards you own for legitimate purposes such as 
          backup or research.
        </AlertDescription>
      </Alert>

      {/* Wizard Steps */}
      <div className="flex items-center gap-4 py-4">
        {[1, 2, 3].map((s) => (
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
              {s === 1 ? 'Configure' : s === 2 ? 'Clone' : 'Complete'}
            </span>
            {s < 3 && <ArrowRight size={16} className="text-muted-foreground ml-2" />}
          </div>
        ))}
      </div>

      {/* Step 1: Configuration */}
      {step === 1 && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-card" data-testid="source-card-selection">
            <CardHeader>
              <CardTitle className="text-lg uppercase tracking-wide flex items-center gap-2">
                <CreditCard size={18} />
                Source Card
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={sourceCard} onValueChange={setSourceCard}>
                <SelectTrigger data-testid="source-card-selector">
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

              {sourceCardData && (
                <div className="pt-4 space-y-4">
                  <SimCardVisual card={sourceCardData} size="md" className="mx-auto" />
                  <div className="bg-muted/50 p-4 rounded space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ICCID</span>
                      <span className="font-mono">{sourceCardData.iccid}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IMSI</span>
                      <span className="font-mono">{sourceCardData.imsi}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Provider</span>
                      <span>{sourceCardData.spn}</span>
                    </div>
                  </div>
                </div>
              )}

              {cards.length === 0 && (
                <div className="empty-state py-8">
                  <CreditCard size={40} className="mx-auto mb-3 text-muted-foreground" />
                  <p>No cards available</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Scan a card first to use clone tool
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card" data-testid="clone-options">
            <CardHeader>
              <CardTitle className="text-lg uppercase tracking-wide flex items-center gap-2">
                <Settings size={18} />
                Clone Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Checkbox 
                    id="clone_contacts" 
                    checked={cloneOptions.clone_contacts}
                    onCheckedChange={(checked) => 
                      setCloneOptions(prev => ({ ...prev, clone_contacts: checked }))
                    }
                    data-testid="clone-contacts-checkbox"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="clone_contacts" className="flex items-center gap-2 cursor-pointer">
                      <Users size={14} className="text-green-400" />
                      Clone Contacts
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Copy all phonebook entries to the new card
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox 
                    id="clone_sms" 
                    checked={cloneOptions.clone_sms}
                    onCheckedChange={(checked) => 
                      setCloneOptions(prev => ({ ...prev, clone_sms: checked }))
                    }
                    data-testid="clone-sms-checkbox"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="clone_sms" className="flex items-center gap-2 cursor-pointer">
                      <MessageSquare size={14} className="text-yellow-400" />
                      Clone SMS Messages
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Copy all text messages stored on the card
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox 
                    id="clone_settings" 
                    checked={cloneOptions.clone_settings}
                    onCheckedChange={(checked) => 
                      setCloneOptions(prev => ({ ...prev, clone_settings: checked }))
                    }
                    data-testid="clone-settings-checkbox"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="clone_settings" className="flex items-center gap-2 cursor-pointer">
                      <Settings size={14} className="text-blue-400" />
                      Clone Settings
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Copy card configuration and preferences
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <Button 
                  onClick={startClone}
                  disabled={!sourceCard || !activeReader}
                  className="w-full glow-primary"
                  data-testid="start-clone-btn"
                >
                  <Copy size={16} className="mr-2" />
                  Start Clone Process
                </Button>
                {!activeReader && (
                  <p className="text-xs text-yellow-400 mt-2 text-center">
                    Connect a reader to enable cloning
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Cloning */}
      {step === 2 && (
        <Card className="bg-card max-w-lg mx-auto" data-testid="cloning-progress">
          <CardContent className="py-12 text-center space-y-6">
            <Loader2 size={48} className="animate-spin text-primary mx-auto" />
            <div>
              <h3 className="text-xl font-semibold uppercase tracking-wide">
                Cloning in Progress
              </h3>
              <p className="text-muted-foreground mt-1">
                Please wait while data is being copied...
              </p>
            </div>
            <Progress value={progress} className="w-full" />
            <p className="text-sm font-mono text-muted-foreground">
              {progress}% complete
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Complete */}
      {step === 3 && cloneResult && (
        <Card className="bg-card max-w-lg mx-auto card-success" data-testid="clone-complete">
          <CardContent className="py-12 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <Check size={32} className="text-green-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold uppercase tracking-wide text-green-400">
                Clone Complete
              </h3>
              <p className="text-muted-foreground mt-1">
                Card data has been successfully duplicated
              </p>
            </div>

            <div className="bg-muted/50 p-4 rounded text-left space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">New Card ID</span>
                <span className="font-mono">{cloneResult.cloned_card_id?.slice(0, 12)}...</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Contacts Cloned</span>
                <Badge variant="outline" className="text-green-400">
                  {cloneResult.contacts_cloned}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">SMS Cloned</span>
                <Badge variant="outline" className="text-green-400">
                  {cloneResult.sms_cloned}
                </Badge>
              </div>
            </div>

            <Button onClick={resetWizard} className="w-full" data-testid="clone-again-btn">
              Clone Another Card
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
