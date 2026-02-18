import { useState, useEffect } from "react";
import { 
  Download, 
  Upload, 
  FileJson, 
  FileSpreadsheet,
  Check,
  Loader2,
  FolderOpen
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ExportImport() {
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState("");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importData, setImportData] = useState("");
  const [importType, setImportType] = useState("all");

  useEffect(() => {
    fetchCards();
  }, []);

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

  const exportData = async (format) => {
    if (!selectedCard) {
      toast.error("Please select a card first");
      return;
    }
    
    setExporting(true);
    try {
      const response = await axios.get(
        `${API}/export/${selectedCard}?format=${format}`,
        { responseType: 'blob' }
      );
      
      const blob = new Blob([response.data], { 
        type: format === 'json' ? 'application/json' : 'text/csv' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `simguard_export_${selectedCard.slice(-8)}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error("Export failed");
    }
    setExporting(false);
  };

  const handleImport = async () => {
    if (!selectedCard) {
      toast.error("Please select a card first");
      return;
    }
    if (!importData.trim()) {
      toast.error("Please paste JSON data to import");
      return;
    }

    setImporting(true);
    try {
      const parsedData = JSON.parse(importData);
      const response = await axios.post(`${API}/import`, {
        card_id: selectedCard,
        data: parsedData,
        data_type: importType
      });
      
      toast.success(
        `Imported ${response.data.contacts_imported} contacts, ${response.data.sms_imported} SMS`
      );
      setImportData("");
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error("Invalid JSON format");
      } else {
        toast.error("Import failed");
      }
    }
    setImporting(false);
  };

  const selectedCardData = cards.find(c => c.id === selectedCard);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="export-import-page">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight uppercase">Export / Import</h1>
        <p className="text-muted-foreground mt-1">
          Backup and restore SIM card data
        </p>
      </div>

      {/* Card Selection */}
      <div className="flex gap-4 items-center">
        <Select value={selectedCard} onValueChange={setSelectedCard}>
          <SelectTrigger className="w-64" data-testid="export-card-selector">
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
        {selectedCardData && (
          <Badge variant="outline">
            {selectedCardData.card_type?.toUpperCase()} SIM
          </Badge>
        )}
      </div>

      <Tabs defaultValue="export" className="w-full">
        <TabsList>
          <TabsTrigger value="export" data-testid="export-tab">
            <Download size={14} className="mr-2" />
            Export
          </TabsTrigger>
          <TabsTrigger value="import" data-testid="import-tab">
            <Upload size={14} className="mr-2" />
            Import
          </TabsTrigger>
        </TabsList>

        {/* Export Tab */}
        <TabsContent value="export" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card 
              className="bg-card cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => !exporting && exportData('json')}
              data-testid="export-json-card"
            >
              <CardContent className="py-8 text-center">
                <FileJson size={48} className="mx-auto mb-4 text-secondary" />
                <h3 className="text-xl font-semibold uppercase tracking-wide">
                  Export as JSON
                </h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  Full data export including card info, contacts, and SMS in JSON format
                </p>
                <Button 
                  className="mt-4 glow-primary"
                  disabled={!selectedCard || exporting}
                  data-testid="export-json-btn"
                >
                  {exporting ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    <Download size={16} className="mr-2" />
                  )}
                  Download JSON
                </Button>
              </CardContent>
            </Card>

            <Card 
              className="bg-card cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => !exporting && exportData('csv')}
              data-testid="export-csv-card"
            >
              <CardContent className="py-8 text-center">
                <FileSpreadsheet size={48} className="mx-auto mb-4 text-green-400" />
                <h3 className="text-xl font-semibold uppercase tracking-wide">
                  Export as CSV
                </h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  Spreadsheet-compatible format for easy viewing and editing
                </p>
                <Button 
                  className="mt-4"
                  variant="outline"
                  disabled={!selectedCard || exporting}
                  data-testid="export-csv-btn"
                >
                  {exporting ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    <Download size={16} className="mr-2" />
                  )}
                  Download CSV
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Export Info */}
          <Card className="bg-card mt-6" data-testid="export-info">
            <CardHeader>
              <CardTitle className="text-lg uppercase tracking-wide">
                What's Included
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded">
                  <Check size={16} className="text-green-400" />
                  <span className="text-sm">Card Information (ICCID, IMSI, etc.)</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded">
                  <Check size={16} className="text-green-400" />
                  <span className="text-sm">All Contacts</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded">
                  <Check size={16} className="text-green-400" />
                  <span className="text-sm">SMS Messages</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import" className="mt-6">
          <Card className="bg-card" data-testid="import-section">
            <CardHeader>
              <CardTitle className="text-lg uppercase tracking-wide flex items-center gap-2">
                <Upload size={18} />
                Import Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Import Type</Label>
                <Select value={importType} onValueChange={setImportType}>
                  <SelectTrigger className="w-48" data-testid="import-type-selector">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Data</SelectItem>
                    <SelectItem value="contacts">Contacts Only</SelectItem>
                    <SelectItem value="sms">SMS Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="import-data">JSON Data</Label>
                <Textarea
                  id="import-data"
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  placeholder={`Paste your JSON data here...\n\nExample format:\n{\n  "contacts": [\n    { "name": "John", "number": "+1234567890" }\n  ],\n  "sms": [\n    { "sender": "+1234567890", "recipient": "ME", "message": "Hello" }\n  ]\n}`}
                  className="min-h-[200px] font-mono text-sm"
                  data-testid="import-data-textarea"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json';
                    input.onchange = (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => setImportData(e.target.result);
                        reader.readAsText(file);
                      }
                    };
                    input.click();
                  }}
                  data-testid="browse-file-btn"
                >
                  <FolderOpen size={16} className="mr-2" />
                  Browse File
                </Button>
                <Button 
                  onClick={handleImport}
                  disabled={!selectedCard || !importData.trim() || importing}
                  className="glow-primary"
                  data-testid="import-btn"
                >
                  {importing ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    <Upload size={16} className="mr-2" />
                  )}
                  Import Data
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Import Format Help */}
          <Card className="bg-card mt-6" data-testid="import-help">
            <CardHeader>
              <CardTitle className="text-lg uppercase tracking-wide">
                Import Format
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded text-xs font-mono overflow-x-auto">
{`{
  "contacts": [
    {
      "name": "Contact Name",
      "number": "+1234567890",
      "group": "Family",
      "email": "email@example.com"
    }
  ],
  "sms": [
    {
      "sender": "+1234567890",
      "recipient": "+0987654321",
      "message": "Message text",
      "status": "read"
    }
  ]
}`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
