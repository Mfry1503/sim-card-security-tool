import { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  AlertTriangle, 
  Check, 
  X,
  Loader2,
  Shield,
  Lock,
  Unlock,
  Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import SimCardVisual from "@/components/SimCardVisual";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SecurityAnalyzer() {
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [history, setHistory] = useState([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetchCards();
  }, []);

  useEffect(() => {
    if (selectedCard) {
      fetchHistory();
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

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API}/analyze/${selectedCard}/history`);
      setHistory(response.data);
      if (response.data.length > 0) {
        setAnalysis(response.data[0]);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  };

  const runAnalysis = async () => {
    if (!selectedCard) {
      toast.error("Please select a card first");
      return;
    }
    
    setAnalyzing(true);
    setProgress(0);
    setAnalysis(null);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 15;
      });
    }, 400);

    try {
      const response = await axios.post(`${API}/analyze/${selectedCard}`);
      clearInterval(progressInterval);
      setProgress(100);
      setAnalysis(response.data);
      setHistory(prev => [response.data, ...prev]);
      toast.success("Security analysis completed");
    } catch (error) {
      clearInterval(progressInterval);
      toast.error("Analysis failed");
    }
    setAnalyzing(false);
  };

  const getRiskColor = (level) => {
    switch (level) {
      case "low": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "high": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "critical": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getRiskProgress = (level) => {
    switch (level) {
      case "low": return 25;
      case "medium": return 50;
      case "high": return 75;
      case "critical": return 100;
      default: return 0;
    }
  };

  const selectedCardData = cards.find(c => c.id === selectedCard);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="security-analyzer-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight uppercase">Security Analyzer</h1>
          <p className="text-muted-foreground mt-1">
            Analyze SIM card authentication and encryption security
          </p>
        </div>
        <Button 
          onClick={runAnalysis}
          disabled={!selectedCard || analyzing}
          className="glow-primary"
          data-testid="run-analysis-btn"
        >
          {analyzing ? (
            <Loader2 size={16} className="mr-2 animate-spin" />
          ) : (
            <ShieldCheck size={16} className="mr-2" />
          )}
          {analyzing ? "Analyzing..." : "Run Analysis"}
        </Button>
      </div>

      {/* Card Selection */}
      <div className="flex gap-4">
        <Select value={selectedCard} onValueChange={setSelectedCard}>
          <SelectTrigger className="w-64" data-testid="security-card-selector">
            <SelectValue placeholder="Select a card" />
          </SelectTrigger>
          <SelectContent>
            {cards.map((card) => (
              <SelectItem key={card.id} value={card.id}>
                {card.spn} - ...{card.iccid?.slice(-6)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Analysis Progress */}
      {analyzing && (
        <Card className="bg-card" data-testid="analysis-progress">
          <CardContent className="py-8 text-center space-y-4">
            <Shield size={40} className="mx-auto text-primary animate-pulse" />
            <p className="text-muted-foreground">Analyzing card security...</p>
            <Progress value={progress} className="w-full max-w-md mx-auto" />
            <p className="text-sm font-mono">{progress}%</p>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {!analyzing && analysis && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Results */}
          <Card className="bg-card lg:col-span-2" data-testid="analysis-results">
            <CardHeader>
              <CardTitle className="text-lg uppercase tracking-wide flex items-center gap-2">
                <ShieldCheck size={18} />
                Analysis Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Risk Level */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getRiskColor(analysis.risk_level)}`}>
                    {analysis.risk_level === "low" ? (
                      <Check size={24} />
                    ) : analysis.risk_level === "critical" ? (
                      <X size={24} />
                    ) : (
                      <AlertTriangle size={24} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Risk Level</p>
                    <p className={`text-xl font-bold uppercase ${getRiskColor(analysis.risk_level).split(' ')[1]}`}>
                      {analysis.risk_level}
                    </p>
                  </div>
                </div>
                <div className="w-32">
                  <Progress 
                    value={getRiskProgress(analysis.risk_level)} 
                    className={`h-2 ${
                      analysis.risk_level === "critical" ? "[&>div]:bg-red-500" :
                      analysis.risk_level === "high" ? "[&>div]:bg-orange-500" :
                      analysis.risk_level === "medium" ? "[&>div]:bg-yellow-500" :
                      "[&>div]:bg-green-500"
                    }`}
                  />
                </div>
              </div>

              {/* Technical Details */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock size={16} className="text-secondary" />
                    <p className="text-sm text-muted-foreground">Auth Algorithm</p>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info size={12} className="text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs max-w-xs">
                            The authentication algorithm used by the SIM to verify with the network
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className="font-mono text-lg">{analysis.auth_algorithm}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <Unlock size={16} className="text-secondary" />
                    <p className="text-sm text-muted-foreground">Encryption</p>
                  </div>
                  <p className="font-mono text-lg">{analysis.encryption_type}</p>
                </div>
              </div>

              {/* Vulnerabilities */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="vulnerabilities">
                  <AccordionTrigger className="text-sm uppercase tracking-wide">
                    <span className="flex items-center gap-2">
                      <AlertTriangle size={16} className="text-yellow-400" />
                      Vulnerabilities Detected ({analysis.vulnerabilities.length})
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-2">
                      {analysis.vulnerabilities.map((vuln, idx) => (
                        <div 
                          key={idx}
                          className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded"
                        >
                          <AlertTriangle size={14} className="text-yellow-400 shrink-0 mt-0.5" />
                          <p className="text-sm">{vuln}</p>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="recommendations">
                  <AccordionTrigger className="text-sm uppercase tracking-wide">
                    <span className="flex items-center gap-2">
                      <Check size={16} className="text-green-400" />
                      Recommendations ({analysis.recommendations.length})
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-2">
                      {analysis.recommendations.map((rec, idx) => (
                        <div 
                          key={idx}
                          className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded"
                        >
                          <Check size={14} className="text-green-400 shrink-0 mt-0.5" />
                          <p className="text-sm">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Card Info & History */}
          <div className="space-y-6">
            {/* Card Info */}
            <Card className="bg-card" data-testid="analyzed-card-info">
              <CardHeader>
                <CardTitle className="text-lg uppercase tracking-wide">
                  Analyzed Card
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedCardData ? (
                  <div className="space-y-4">
                    <SimCardVisual card={selectedCardData} size="md" className="mx-auto" />
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Provider</span>
                        <span>{selectedCardData.spn}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type</span>
                        <Badge variant="outline">{selectedCardData.card_type}</Badge>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No card selected
                  </p>
                )}
              </CardContent>
            </Card>

            {/* History */}
            <Card className="bg-card" data-testid="analysis-history">
              <CardHeader>
                <CardTitle className="text-lg uppercase tracking-wide">
                  Analysis History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4 text-sm">
                    No previous analyses
                  </p>
                ) : (
                  <div className="space-y-2">
                    {history.slice(0, 5).map((item, idx) => (
                      <div 
                        key={item.id || idx}
                        className={`p-3 rounded border cursor-pointer transition-colors ${
                          analysis?.id === item.id 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setAnalysis(item)}
                      >
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className={getRiskColor(item.risk_level)}>
                            {item.risk_level}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!analyzing && !analysis && (
        <Card className="bg-card" data-testid="no-analysis">
          <CardContent className="py-16 text-center">
            <ShieldCheck size={64} className="mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold uppercase tracking-wide">
              No Analysis Yet
            </h3>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              Select a card and run a security analysis to check for vulnerabilities 
              and get recommendations for improving your SIM card security.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
