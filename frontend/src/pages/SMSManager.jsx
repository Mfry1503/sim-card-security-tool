import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Trash2, 
  Send,
  Inbox,
  FileText,
  Loader2,
  Mail,
  MailOpen
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SMSManager() {
  const { activeReader } = useOutletContext();
  const [messages, setMessages] = useState([]);
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [formData, setFormData] = useState({
    sender: "",
    recipient: "",
    message: "",
    status: "draft"
  });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchCards();
  }, []);

  useEffect(() => {
    if (selectedCard) {
      fetchMessages();
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
    setLoading(false);
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/sms?card_id=${selectedCard}`);
      setMessages(response.data);
    } catch (error) {
      toast.error("Failed to fetch messages");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.recipient || !formData.message) {
      toast.error("Recipient and message are required");
      return;
    }
    setSaving(true);
    try {
      await axios.post(`${API}/sms`, {
        card_id: selectedCard,
        sender: formData.sender || "ME",
        recipient: formData.recipient,
        message: formData.message,
        status: formData.status
      });
      toast.success("Message saved");
      setDialogOpen(false);
      setFormData({ sender: "", recipient: "", message: "", status: "draft" });
      fetchMessages();
    } catch (error) {
      toast.error("Failed to save message");
    }
    setSaving(false);
  };

  const handleDelete = async (smsId) => {
    try {
      await axios.delete(`${API}/sms/${smsId}`);
      setMessages(prev => prev.filter(m => m.id !== smsId));
      if (selectedMessage?.id === smsId) setSelectedMessage(null);
      toast.success("Message deleted");
    } catch (error) {
      toast.error("Failed to delete message");
    }
  };

  const filteredMessages = messages.filter(msg => {
    const matchesSearch = 
      msg.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTab = 
      activeTab === "all" ||
      (activeTab === "inbox" && msg.status === "read") ||
      (activeTab === "sent" && msg.status === "sent") ||
      (activeTab === "draft" && msg.status === "draft");
    
    return matchesSearch && matchesTab;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case "read": return <MailOpen size={14} className="text-green-400" />;
      case "unread": return <Mail size={14} className="text-yellow-400" />;
      case "sent": return <Send size={14} className="text-blue-400" />;
      case "draft": return <FileText size={14} className="text-muted-foreground" />;
      default: return null;
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const selectedCardData = cards.find(c => c.id === selectedCard);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="sms-manager-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight uppercase">SMS Messages</h1>
          <p className="text-muted-foreground mt-1">
            View and manage SIM card text messages
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              disabled={!selectedCard}
              className="glow-primary"
              data-testid="compose-sms-btn"
            >
              <Plus size={16} className="mr-2" />
              Compose
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md" data-testid="sms-dialog">
            <DialogHeader>
              <DialogTitle className="uppercase tracking-wide">
                New Message
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="recipient">To *</Label>
                <Input
                  id="recipient"
                  value={formData.recipient}
                  onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                  placeholder="+1234567890"
                  data-testid="sms-recipient-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Type your message..."
                  rows={4}
                  data-testid="sms-message-input"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {formData.message.length}/160 characters
                </p>
              </div>
              <div className="space-y-2">
                <Label>Save As</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger data-testid="sms-status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} data-testid="save-sms-btn">
                {saving ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : (
                  <Send size={16} className="mr-2" />
                )}
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Card Selector & Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={selectedCard} onValueChange={setSelectedCard}>
          <SelectTrigger className="w-full sm:w-64" data-testid="sms-card-selector">
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

        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="search-sms-input"
          />
        </div>
      </div>

      {/* Messages Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Message List */}
        <Card className="bg-card lg:col-span-2" data-testid="sms-list-card">
          <CardHeader className="pb-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start">
                <TabsTrigger value="all" data-testid="tab-all">
                  <MessageSquare size={14} className="mr-1" />
                  All
                </TabsTrigger>
                <TabsTrigger value="inbox" data-testid="tab-inbox">
                  <Inbox size={14} className="mr-1" />
                  Inbox
                </TabsTrigger>
                <TabsTrigger value="sent" data-testid="tab-sent">
                  <Send size={14} className="mr-1" />
                  Sent
                </TabsTrigger>
                <TabsTrigger value="draft" data-testid="tab-draft">
                  <FileText size={14} className="mr-1" />
                  Drafts
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="pt-4">
            {cards.length === 0 ? (
              <div className="empty-state py-12">
                <MessageSquare size={48} className="mx-auto mb-4 text-muted-foreground" />
                <p>No cards available</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Scan a card first to view messages
                </p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={32} className="animate-spin text-primary" />
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="empty-state py-12">
                <MessageSquare size={48} className="mx-auto mb-4 text-muted-foreground" />
                <p>{searchQuery ? "No messages found" : "No messages"}</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2 pr-4">
                  {filteredMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-4 rounded border cursor-pointer transition-all ${
                        selectedMessage?.id === msg.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedMessage(msg)}
                      data-testid={`sms-item-${msg.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {getStatusIcon(msg.status)}
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">
                              {msg.status === 'sent' || msg.status === 'draft' 
                                ? `To: ${msg.recipient}` 
                                : `From: ${msg.sender}`}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {msg.message}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(msg.timestamp)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(msg.id);
                            }}
                            data-testid={`delete-sms-${msg.id}`}
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Message Detail */}
        <Card className="bg-card" data-testid="sms-detail-card">
          <CardHeader>
            <CardTitle className="text-lg uppercase tracking-wide">
              Message Detail
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedMessage ? (
              <div className="empty-state py-8">
                <MessageSquare size={40} className="mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm">Select a message to view details</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {getStatusIcon(selectedMessage.status)}
                  <Badge variant="outline" className="capitalize">
                    {selectedMessage.status}
                  </Badge>
                </div>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">From</p>
                    <p className="font-mono">{selectedMessage.sender}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">To</p>
                    <p className="font-mono">{selectedMessage.recipient}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date</p>
                    <p>{new Date(selectedMessage.timestamp).toLocaleString()}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-muted-foreground text-sm mb-2">Message</p>
                  <p className="bg-muted/50 p-3 rounded text-sm leading-relaxed">
                    {selectedMessage.message}
                  </p>
                </div>

                <div className="pt-4">
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDelete(selectedMessage.id)}
                    data-testid="delete-selected-sms-btn"
                  >
                    <Trash2 size={14} className="mr-2" />
                    Delete Message
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      {messages.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            {filteredMessages.length} message{filteredMessages.length !== 1 ? 's' : ''} 
            {activeTab !== 'all' && ` in ${activeTab}`}
          </p>
          <p className="font-mono">Card: {selectedCardData?.iccid?.slice(-8)}</p>
        </div>
      )}
    </div>
  );
}
