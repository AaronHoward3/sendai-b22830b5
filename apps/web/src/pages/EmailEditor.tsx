
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GradientButton } from '@/components/ui/gradient-button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Save, ArrowLeft, Type, Image, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmailElement {
  id: string;
  type: 'text' | 'image' | 'button';
  content: string;
  styles: {
    fontSize?: string;
    color?: string;
    backgroundColor?: string;
    padding?: string;
    textAlign?: string;
    width?: string;
    height?: string;
  };
}

interface SavedEmail {
  id: number;
  subject: string;
  mjml: string;
  domain: string;
  emailType: string;
  createdAt: string;
  elements?: EmailElement[];
}

const EmailEditor = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const emailId = searchParams.get('id');
  
  const [email, setEmail] = useState<SavedEmail | null>(null);
  const [selectedElement, setSelectedElement] = useState<EmailElement | null>(null);
  const [elements, setElements] = useState<EmailElement[]>([]);

  useEffect(() => {
    if (emailId) {
      const savedEmails = JSON.parse(localStorage.getItem('savedEmails') || '[]');
      const foundEmail = savedEmails.find((e: SavedEmail) => e.id === parseInt(emailId));
      if (foundEmail) {
        setEmail(foundEmail);
        // Initialize elements from MJML or create default ones
        setElements(foundEmail.elements || [
          {
            id: '1',
            type: 'text',
            content: 'Email Subject',
            styles: { fontSize: '24px', color: '#333333', textAlign: 'center', padding: '20px' }
          },
          {
            id: '2',
            type: 'text',
            content: 'Your email content goes here...',
            styles: { fontSize: '16px', color: '#666666', padding: '20px' }
          },
          {
            id: '3',
            type: 'button',
            content: 'Call to Action',
            styles: { 
              backgroundColor: '#007bff', 
              color: '#ffffff', 
              padding: '12px 24px',
              textAlign: 'center'
            }
          }
        ]);
      }
    }
  }, [emailId]);

  const updateElement = (elementId: string, updates: Partial<EmailElement>) => {
    setElements(prev => prev.map(el => 
      el.id === elementId ? { ...el, ...updates } : el
    ));
  };

  const addElement = (type: 'text' | 'image' | 'button') => {
    const newElement: EmailElement = {
      id: Date.now().toString(),
      type,
      content: type === 'text' ? 'New text element' : 
               type === 'button' ? 'New Button' : 
               'https://via.placeholder.com/300x200',
      styles: {
        padding: '10px',
        ...(type === 'button' && { backgroundColor: '#007bff', color: '#ffffff' })
      }
    };
    setElements(prev => [...prev, newElement]);
  };

  const saveEmail = () => {
    if (!email) return;

    const savedEmails = JSON.parse(localStorage.getItem('savedEmails') || '[]');
    const updatedEmails = savedEmails.map((e: SavedEmail) => 
      e.id === email.id ? { ...e, elements } : e
    );
    
    localStorage.setItem('savedEmails', JSON.stringify(updatedEmails));
    toast({
      title: "Email Saved",
      description: "Your email template has been updated successfully.",
    });
  };

  if (!email) {
    return (
      <>
        <Navigation />
        <div className="pt-16 min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Email not found</h1>
            <Button onClick={() => navigate('/my-emails')}>
              Back to My Emails
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="pt-16 min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Toolbar */}
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Email Editor
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate('/my-emails')}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Email Subject</Label>
                    <Input 
                      value={email.subject} 
                      onChange={(e) => setEmail(prev => prev ? { ...prev, subject: e.target.value } : null)}
                    />
                  </div>
                  
                  <div>
                    <Label className="mb-2 block">Add Elements</Label>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => addElement('text')}
                      >
                        <Type className="h-4 w-4 mr-1" />
                        Text
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => addElement('image')}
                      >
                        <Image className="h-4 w-4 mr-1" />
                        Image
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => addElement('button')}
                      >
                        <Square className="h-4 w-4 mr-1" />
                        Button
                      </Button>
                    </div>
                  </div>

                  {selectedElement && (
                    <div className="space-y-3 border-t pt-4">
                      <Label className="text-sm font-semibold">Edit Selected Element</Label>
                      
                      <div>
                        <Label>Content</Label>
                        {selectedElement.type === 'text' || selectedElement.type === 'button' ? (
                          <Textarea
                            value={selectedElement.content}
                            onChange={(e) => {
                              updateElement(selectedElement.id, { content: e.target.value });
                              setSelectedElement(prev => prev ? { ...prev, content: e.target.value } : null);
                            }}
                          />
                        ) : (
                          <Input
                            value={selectedElement.content}
                            onChange={(e) => {
                              updateElement(selectedElement.id, { content: e.target.value });
                              setSelectedElement(prev => prev ? { ...prev, content: e.target.value } : null);
                            }}
                            placeholder="Image URL"
                          />
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Font Size</Label>
                          <Input
                            value={selectedElement.styles.fontSize || '16px'}
                            onChange={(e) => {
                              const newStyles = { ...selectedElement.styles, fontSize: e.target.value };
                              updateElement(selectedElement.id, { styles: newStyles });
                              setSelectedElement(prev => prev ? { ...prev, styles: newStyles } : null);
                            }}
                          />
                        </div>
                        <div>
                          <Label>Color</Label>
                          <Input
                            type="color"
                            value={selectedElement.styles.color || '#000000'}
                            onChange={(e) => {
                              const newStyles = { ...selectedElement.styles, color: e.target.value };
                              updateElement(selectedElement.id, { styles: newStyles });
                              setSelectedElement(prev => prev ? { ...prev, styles: newStyles } : null);
                            }}
                          />
                        </div>
                      </div>

                      {selectedElement.type === 'button' && (
                        <div>
                          <Label>Background Color</Label>
                          <Input
                            type="color"
                            value={selectedElement.styles.backgroundColor || '#007bff'}
                            onChange={(e) => {
                              const newStyles = { ...selectedElement.styles, backgroundColor: e.target.value };
                              updateElement(selectedElement.id, { styles: newStyles });
                              setSelectedElement(prev => prev ? { ...prev, styles: newStyles } : null);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <GradientButton 
                    onClick={saveEmail}
                    className="w-full flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save Changes
                  </GradientButton>
                </CardContent>
              </Card>
            </div>

            {/* Email Preview */}
            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Email Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-white border rounded-lg p-6 min-h-[600px] space-y-4">
                    {elements.map((element) => (
                      <div
                        key={element.id}
                        className={`cursor-pointer transition-all duration-200 ${
                          selectedElement?.id === element.id ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-gray-300'
                        }`}
                        onClick={() => setSelectedElement(element)}
                        style={{
                          padding: element.styles.padding,
                          textAlign: element.styles.textAlign as any,
                        }}
                      >
                        {element.type === 'text' && (
                          <div
                            style={{
                              fontSize: element.styles.fontSize,
                              color: element.styles.color,
                            }}
                          >
                            {element.content}
                          </div>
                        )}
                        
                        {element.type === 'image' && (
                          <img
                            src={element.content}
                            alt="Email content"
                            style={{
                              width: element.styles.width || 'auto',
                              height: element.styles.height || 'auto',
                              maxWidth: '100%',
                            }}
                          />
                        )}
                        
                        {element.type === 'button' && (
                          <div
                            style={{
                              display: 'inline-block',
                              padding: element.styles.padding,
                              backgroundColor: element.styles.backgroundColor,
                              color: element.styles.color,
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            {element.content}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {elements.length === 0 && (
                      <div className="text-center text-gray-500 py-20">
                        <p>No elements added yet.</p>
                        <p className="text-sm">Use the toolbar to add text, images, or buttons.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default EmailEditor;
