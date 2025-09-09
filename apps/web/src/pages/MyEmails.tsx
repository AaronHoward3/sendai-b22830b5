import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GradientButton } from '@/components/ui/gradient-button';
import { Badge } from '@/components/ui/badge';
import { Eye, Copy, Trash2, X, ChevronDown, Plus, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

type Row = {
  id: string;
  subject: string | null;
  html: string | null;
  mjml: string | null;
  brand_domain: string | null;
  style_meta: Record<string, unknown> | null;
  created_at: string;
};

const MyEmails: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useSupabaseAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [copyDropdownOpenId, setCopyDropdownOpenId] = useState<string | null>(null);
  const [downloadDropdownOpenId, setDownloadDropdownOpenId] = useState<string | null>(null);

  const currentEmail = rows.find(r => r.id === expandedEmailId);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast({ title: 'Error loading emails', description: error.message, variant: 'destructive' });
      } else {
        setRows((data || []) as Row[]);
      }
    })();
  }, [user, toast]);

  const handleCreateNew = () => navigate('/');

  const handleCopy = async (text: string | null | undefined, label: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    toast({ title: `Copied ${label}` });
  };

  const handleDownload = async (content: string | null | undefined, filename: string, label: string) => {
    if (!content) return;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({ title: `Downloaded ${label}` });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('emails').delete().eq('id', id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    setRows(prev => prev.filter(r => r.id !== id));
    toast({ title: 'Deleted' });
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch { return iso; }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navigation />
        <div className="pt-16 container mx-auto px-4 py-10">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navigation />
        <div className="pt-16 container mx-auto px-4 py-10 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sign in required</CardTitle>
              <CardDescription>Sign in on the Settings page to view your saved emails.</CardDescription>
            </CardHeader>
            <CardContent>
              <GradientButton onClick={() => navigate('/settings')} className="!bg-primary !text-primary-foreground">
                Go to Settings
              </GradientButton>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <div className="pt-16 container mx-auto px-4 py-8 space-y-6 max-w-4xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Emails</h1>
            <p className="text-muted-foreground mt-2">View and manage your saved email templates.</p>
          </div>
          <GradientButton
            onClick={handleCreateNew}
            variant="solid"
            className="flex items-center gap-2 transition-transform duration-200 hover:scale-105 !bg-primary !text-primary-foreground hover:!bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create New
          </GradientButton>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between flex-wrap gap-2">
              Saved Email Templates
              <Badge variant="secondary">{rows.length} Templates</Badge>
            </CardTitle>
            <CardDescription>Your saved email templates and campaigns.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {rows.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No saved emails yet.</p>
                <p className="text-sm text-muted-foreground mt-1">Generate and save an email to see it here.</p>
              </div>
            ) : (
              rows.map((row) => (
                <div key={row.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-2xl bg-muted/40">
                  <div className="space-y-1 min-w-0">
                    <h3 className="font-semibold text-base text-foreground truncate">{row.subject || '(No Subject)'}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {row.brand_domain || 'Unknown domain'} • {(row.style_meta as Record<string, string>)?.emailType || 'Unknown'} • {formatDate(row.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end relative">
                    <Button
                      variant="outline" size="sm"
                      onClick={() => setExpandedEmailId(row.id)}
                      className="!bg-background !text-foreground !border !border-border hover:!bg-muted"
                    >
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>

                    <div
                      className="relative inline-block"
                      onMouseEnter={() => setCopyDropdownOpenId(row.id)}
                      onMouseLeave={() => setCopyDropdownOpenId(null)}
                    >
                      <Button variant="outline" size="sm"
                        className="!bg-background !text-foreground !border !border-border hover:!bg-muted">
                        <Copy className="h-4 w-4 mr-1" /> Copy <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                      {copyDropdownOpenId === row.id && (
                        <div className="absolute top-[100%] right-0 bg-popover border rounded-md shadow-md z-50 overflow-hidden">
                          <button onClick={() => handleCopy(row.mjml, 'MJML')}
                            className="block w-full text-left px-4 py-2 text-sm hover:bg-accent">Copy MJML</button>
                          <button onClick={() => handleCopy(row.html, 'HTML')}
                            className="block w-full text-left px-4 py-2 text-sm hover:bg-accent">Copy HTML</button>
                        </div>
                      )}
                    </div>

                    <div
                      className="relative inline-block"
                      onMouseEnter={() => setDownloadDropdownOpenId(row.id)}
                      onMouseLeave={() => setDownloadDropdownOpenId(null)}
                    >
                      <Button variant="outline" size="sm"
                        className="!bg-background !text-foreground !border !border-border hover:!bg-muted">
                        <Download className="h-4 w-4 mr-1" /> Download <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                      {downloadDropdownOpenId === row.id && (
                        <div className="absolute top-[100%] right-0 bg-popover border rounded-md shadow-md z-50 overflow-hidden">
                          <button onClick={() => handleDownload(row.mjml, `${row.subject || 'email'}.mjml`, 'MJML')}
                            className="block w-full text-left px-4 py-2 text-sm hover:bg-accent">Download MJML</button>
                          <button onClick={() => handleDownload(row.html, `${row.subject || 'email'}.html`, 'HTML')}
                            className="block w-full text-left px-4 py-2 text-sm hover:bg-accent">Download HTML</button>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline" size="sm"
                      onClick={() => handleDelete(row.id)}
                      className="!bg-background !text-foreground !border !border-border hover:!bg-muted"
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal preview */}
      {expandedEmailId && currentEmail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="relative">
            <div className="absolute -top-4 -right-4 z-10">
              <button
                onClick={() => setExpandedEmailId(null)}
                className="transition bg-gradient-to-br from-green-300 to-emerald-500 text-white p-2 rounded-full shadow hover:brightness-110"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-background rounded-lg w-full max-w-[90rem] h-[90vh] overflow-hidden shadow-lg flex flex-col lg:flex-row">
              <div className="w-full lg:w-1/2 h-[50vh] lg:h-full p-6">
                <div className="bg-muted rounded-lg h-full flex flex-col shadow border border-border">
                  <div className="p-4 border-b border-border font-semibold text-foreground">Subject Line: {currentEmail.subject || '(No Subject)'}</div>
                  <div className="flex-1 min-h-0 overflow-auto bg-background rounded-b-lg">
                    <iframe srcDoc={currentEmail.html ?? ''} sandbox="" className="w-full h-full border-0" style={{ backgroundColor: 'white' }} />
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-1/2 h-[50vh] lg:h-full p-6 flex flex-col space-y-4">
                <div className="flex-1 min-h-0 bg-muted rounded-lg border border-border flex flex-col shadow overflow-hidden">
                  <div className="p-4 border-b border-border flex justify-between items-center">
                    <h3 className="font-semibold text-foreground">MJML Code</h3>
                    <div className="flex gap-2">
                      <GradientButton size="sm" variant="white-outline"
                        onClick={() => handleCopy(currentEmail.mjml, 'MJML')}
                        className="hover:scale-105 !bg-background !text-foreground !border !border-border hover:!bg-muted">
                        <Copy className="w-4 h-4 mr-2" /> Copy MJML
                      </GradientButton>
                      <GradientButton size="sm" variant="white-outline"
                        onClick={() => handleDownload(currentEmail.mjml, `${currentEmail.subject || 'email'}.mjml`, 'MJML')}
                        className="hover:scale-105 !bg-background !text-foreground !border !border-border hover:!bg-muted">
                        <Download className="w-4 h-4 mr-2" /> Download MJML
                      </GradientButton>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 overflow-auto p-4 bg-background text-sm text-muted-foreground">
                    <pre className="whitespace-pre-wrap break-words">{currentEmail.mjml}</pre>
                  </div>
                </div>

                <div className="flex-1 min-h-0 bg-muted rounded-lg border border-border flex flex-col shadow overflow-hidden">
                  <div className="p-4 border-b border-border flex justify-between items-center">
                    <h3 className="font-semibold text-foreground">HTML Code</h3>
                    <div className="flex gap-2">
                      <GradientButton size="sm" variant="white-outline"
                        onClick={() => handleCopy(currentEmail.html, 'HTML')}
                        className="hover:scale-105 !bg-background !text-foreground !border !border-border hover:!bg-muted">
                        <Copy className="w-4 h-4 mr-2" /> Copy HTML
                      </GradientButton>
                      <GradientButton size="sm" variant="white-outline"
                        onClick={() => handleDownload(currentEmail.html, `${currentEmail.subject || 'email'}.html`, 'HTML')}
                        className="hover:scale-105 !bg-background !text-foreground !border !border-border hover:!bg-muted">
                        <Download className="w-4 h-4 mr-2" /> Download HTML
                      </GradientButton>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 overflow-auto p-4 bg-background text-sm text-muted-foreground">
                    <pre className="whitespace-pre-wrap break-words">{currentEmail.html}</pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyEmails;
