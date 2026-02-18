import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Save,
  Upload,
  X,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ContactManager() {
  const { activeReader } = useOutletContext();
  const [contacts, setContacts] = useState([]);
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    number: "",
    group: "",
    email: ""
  });
  const [saving, setSaving] = useState(false);
  const [writingToCard, setWritingToCard] = useState(false);

  useEffect(() => {
    fetchCards();
  }, []);

  useEffect(() => {
    if (selectedCard) {
      fetchContacts();
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

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/contacts?card_id=${selectedCard}`);
      setContacts(response.data);
    } catch (error) {
      toast.error("Failed to fetch contacts");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.number) {
      toast.error("Name and number are required");
      return;
    }
    setSaving(true);
    try {
      if (editingContact) {
        await axios.put(`${API}/contacts/${editingContact.id}`, formData);
        toast.success("Contact updated");
      } else {
        await axios.post(`${API}/contacts`, {
          card_id: selectedCard,
          ...formData
        });
        toast.success("Contact created");
      }
      setDialogOpen(false);
      resetForm();
      fetchContacts();
    } catch (error) {
      toast.error(editingContact ? "Failed to update contact" : "Failed to create contact");
    }
    setSaving(false);
  };

  const handleDelete = async (contactId) => {
    try {
      await axios.delete(`${API}/contacts/${contactId}`);
      setContacts(prev => prev.filter(c => c.id !== contactId));
      toast.success("Contact deleted");
    } catch (error) {
      toast.error("Failed to delete contact");
    }
  };

  const handleEdit = (contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      number: contact.number,
      group: contact.group || "",
      email: contact.email || ""
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingContact(null);
    setFormData({ name: "", number: "", group: "", email: "" });
  };

  const writeToCard = async () => {
    if (!activeReader) {
      toast.error("No reader connected");
      return;
    }
    setWritingToCard(true);
    try {
      const response = await axios.post(`${API}/contacts/write/${selectedCard}`);
      toast.success(`${response.data.contacts_written} contacts written to card`);
    } catch (error) {
      toast.error("Failed to write contacts to card");
    }
    setWritingToCard(false);
  };

  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.number.includes(searchQuery)
  );

  const selectedCardData = cards.find(c => c.id === selectedCard);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="contact-manager-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight uppercase">Contacts</h1>
          <p className="text-muted-foreground mt-1">
            Manage SIM card phonebook entries
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={writeToCard}
            disabled={!activeReader || !selectedCard || writingToCard}
            data-testid="write-to-card-btn"
          >
            {writingToCard ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <Upload size={16} className="mr-2" />
            )}
            Write to Card
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={resetForm}
                disabled={!selectedCard}
                className="glow-primary"
                data-testid="add-contact-btn"
              >
                <Plus size={16} className="mr-2" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" data-testid="contact-dialog">
              <DialogHeader>
                <DialogTitle className="uppercase tracking-wide">
                  {editingContact ? "Edit Contact" : "New Contact"}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {editingContact ? "Update contact information" : "Add a new contact to the SIM card phonebook"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contact name"
                    data-testid="contact-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number">Phone Number *</Label>
                  <Input
                    id="number"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    placeholder="+1234567890"
                    data-testid="contact-number-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="group">Group</Label>
                  <Input
                    id="group"
                    value={formData.group}
                    onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                    placeholder="Family, Work, etc."
                    data-testid="contact-group-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                    data-testid="contact-email-input"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving} data-testid="save-contact-btn">
                  {saving ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    <Save size={16} className="mr-2" />
                  )}
                  {editingContact ? "Update" : "Save"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Card Selector & Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={selectedCard} onValueChange={setSelectedCard}>
          <SelectTrigger className="w-full sm:w-64" data-testid="card-selector">
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
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="search-contacts-input"
          />
        </div>
      </div>

      {/* Contacts Table */}
      <Card className="bg-card" data-testid="contacts-table-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg uppercase tracking-wide flex items-center gap-2">
            <Users size={18} className="text-green-400" />
            Phonebook
            {selectedCardData && (
              <Badge variant="outline" className="ml-2">
                {selectedCardData.spn}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cards.length === 0 ? (
            <div className="empty-state py-12">
              <Users size={48} className="mx-auto mb-4 text-muted-foreground" />
              <p>No cards available</p>
              <p className="text-sm text-muted-foreground mt-1">
                Scan a card first to manage contacts
              </p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-primary" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="empty-state py-12">
              <Users size={48} className="mx-auto mb-4 text-muted-foreground" />
              <p>{searchQuery ? "No contacts found" : "No contacts on this card"}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery ? "Try a different search" : "Add contacts to get started"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="data-table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Number</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((contact) => (
                    <TableRow key={contact.id} data-testid={`contact-row-${contact.id}`}>
                      <TableCell className="font-mono text-muted-foreground">
                        {contact.index}
                      </TableCell>
                      <TableCell className="font-medium">{contact.name}</TableCell>
                      <TableCell className="font-mono">{contact.number}</TableCell>
                      <TableCell>
                        {contact.group && (
                          <Badge variant="outline">{contact.group}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {contact.email || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEdit(contact)}
                            data-testid={`edit-contact-${contact.id}`}
                          >
                            <Edit2 size={14} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(contact.id)}
                            data-testid={`delete-contact-${contact.id}`}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {filteredContacts.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>Showing {filteredContacts.length} of {contacts.length} contacts</p>
          <p className="font-mono">Card: {selectedCardData?.iccid?.slice(-8)}</p>
        </div>
      )}
    </div>
  );
}
