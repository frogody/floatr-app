'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

interface EmergencyContactsFormProps {
  contacts: EmergencyContact[];
  profileId: string;
}

export function EmergencyContactsForm({ contacts, profileId }: EmergencyContactsFormProps) {
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(contacts);
  const [isAdding, setIsAdding] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    relationship: '',
  });

  const addContact = async () => {
    if (!newContact.name || !newContact.phone || !newContact.relationship) {
      return;
    }

    try {
      const response = await fetch('/api/profile/emergency-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profileId,
          ...newContact,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setEmergencyContacts([...emergencyContacts, data.data]);
        setNewContact({ name: '', phone: '', relationship: '' });
        setIsAdding(false);
      }
    } catch (error) {
      console.error('Error adding emergency contact:', error);
    }
  };

  const removeContact = async (contactId: string) => {
    try {
      const response = await fetch(`/api/profile/emergency-contacts/${contactId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setEmergencyContacts(emergencyContacts.filter(c => c.id !== contactId));
      }
    } catch (error) {
      console.error('Error removing emergency contact:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Existing Contacts */}
      {emergencyContacts.length > 0 && (
        <div className="grid gap-3">
          {emergencyContacts.map((contact) => (
            <Card key={contact.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{contact.name}</h4>
                    <p className="text-sm text-muted-foreground">{contact.phone}</p>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {contact.relationship}
                    </Badge>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => removeContact(contact.id)}
                  >
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add New Contact */}
      {!isAdding ? (
        <Button 
          variant="outline" 
          onClick={() => setIsAdding(true)}
          className="w-full"
        >
          + Add Emergency Contact
        </Button>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="contact-name">Name</Label>
              <Input
                id="contact-name"
                placeholder="Full name"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="contact-phone">Phone Number</Label>
              <Input
                id="contact-phone"
                placeholder="+1 (555) 123-4567"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="contact-relationship">Relationship</Label>
              <Input
                id="contact-relationship"
                placeholder="e.g., Spouse, Parent, Friend"
                value={newContact.relationship}
                onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={addContact}
                disabled={!newContact.name || !newContact.phone || !newContact.relationship}
              >
                Add Contact
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsAdding(false);
                  setNewContact({ name: '', phone: '', relationship: '' });
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {emergencyContacts.length === 0 && !isAdding && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No emergency contacts added yet.</p>
          <p className="text-sm mt-1">Add contacts for safety while on the water.</p>
        </div>
      )}
    </div>
  );
} 