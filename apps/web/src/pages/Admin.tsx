// apps/web/src/pages/Admin.tsx
import React, { useEffect, useMemo, useState } from "react";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GradientButton } from "@/components/ui/gradient-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabaseClient";

const API_ROOT = '/api';

type FoundUser = {
  id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  display_name: string | null;
  is_admin: boolean;
  banned: boolean;
  brand_count: number;
  balance: {
    emails_remaining: number;
    images_remaining: number;
    revisions_remaining: number;
    brand_limit: number;
    updated_at: string | null;
  } | null;
};

type Snapshot = {
  user: { id: string; email: string | null; created_at: string | null; last_sign_in_at: string | null } | null;
  profile: any;
  balance: any;
  brands: { domain: string; created_at: string }[];
  images: { id: string; domain: string; public_url: string; created_at: string }[];
  emails: { id: string; subject: string | null; brand_domain: string | null; created_at: string }[];
};

function normalizeDomain(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
}

const PER_PAGE = 50;

const Admin: React.FC = () => {
  const { user } = useSupabaseAuth();
  const { toast } = useToast();

  // Search state (single bar)
  const [query, setQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<FoundUser[]>([]);

  // Default list state
  const [listLoading, setListLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [users, setUsers] = useState<FoundUser[]>([]);

  // Detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<FoundUser | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  const canSearch = useMemo(() => query.trim().length >= 1, [query]);

  async function fetchWithAuth(path: string, init?: RequestInit) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const normalized = path.replace(/^\/?api\//, '');
    const urlStr = `${API_ROOT}/${normalized}`.replace(/\/{2,}/g, '/');
    return fetch(urlStr, {
      ...(init || {}),
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers || {}),
      },
    });
}

  // Load default list
  const loadPage = async (p: number) => {
    setListLoading(true);
    try {
      const res = await fetchWithAuth(`/api/admin/users?page=${p}&perPage=${PER_PAGE}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load users");
      setUsers(json.users || []);
      setHasMore(!!json.hasMore);
    } catch (e: any) {
      toast({ title: "Load error", description: e.message, variant: "destructive" });
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    loadPage(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Heuristic: decide whether query is email, user id (uuid), or domain
  const buildSearchParams = (raw: string) => {
    const q = raw.trim();
    const params = new URLSearchParams();
    const uuidV4 =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (q.includes("@")) {
      params.set("email", q);
    } else if (uuidV4.test(q)) {
      params.set("id", q);
    } else {
      params.set("domain", normalizeDomain(q));
    }
    return params;
  };

  // Search
  const doSearch = async () => {
    if (!canSearch) return;
    setSearchLoading(true);
    setSearchResults([]);
    try {
      const params = buildSearchParams(query);
      const res = await fetchWithAuth(`/api/admin/users/search?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Search failed");
      setSearchResults(json.users || []);
    } catch (e: any) {
      toast({ title: "Search error", description: e.message, variant: "destructive" });
    } finally {
      setSearchLoading(false);
    }
  };

  // Snapshot (opens modal)
  const openDetail = async (u: FoundUser) => {
    setSelected(u);
    setSnapshot(null);
    setDetailOpen(true);
    try {
      const res = await fetchWithAuth(`/api/admin/users/${u.id}/snapshot`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load snapshot");
      setSnapshot(json);
    } catch (e: any) {
      toast({ title: "Snapshot error", description: e.message, variant: "destructive" });
      setDetailOpen(false);
    }
  };

  // Credits + account actions (used inside modal)
  const patchCredits = async (payload: any) => {
    if (!selected) return;
    const res = await fetchWithAuth(`/api/admin/users/${selected.id}/credits`, { method: "PATCH", body: JSON.stringify(payload) });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Patch credits failed");
    await openDetail({ ...selected });
    toast({ title: "Credits updated" });
  };

  const patchAccount = async (payload: any) => {
    if (!selected) return;
    const res = await fetchWithAuth(`/api/admin/users/${selected.id}/account`, { method: "PATCH", body: JSON.stringify(payload) });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Patch account failed");
    setSnapshot(json);
    toast({ title: "Account updated" });
  };

  const setBan = async (ban: boolean) => {
    if (!selected) return;
    const path = ban ? "ban" : "unban";
    const res = await fetchWithAuth(`/api/admin/users/${selected.id}/${path}`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Ban toggle failed");
    setSnapshot(json);
    toast({ title: ban ? "User banned" : "User unbanned" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <div className="pt-16 container mx-auto px-4 py-8 max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin</h1>
            <p className="text-muted-foreground">Browse all users. Use search to jump faster.</p>
          </div>
        </div>

        {/* Search (single bar) */}
        <Card>
          <CardHeader>
            <CardTitle>User Search</CardTitle>
            <CardDescription>Type an email, user ID, or brand domain.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-4">
              <Label>Search</Label>
              <Input
                placeholder="jane@acme.com • 8d1c...-.... • acme.com"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") doSearch(); }}
              />
            </div>
            <div className="md:col-span-1 flex items-end justify-end">
              <GradientButton variant="solid" disabled={!canSearch || searchLoading} onClick={doSearch}>
                {searchLoading ? "Searching..." : "Search"}
              </GradientButton>
            </div>
          </CardContent>
        </Card>

        {/* Search Results (optional) */}
        {searchResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Search Results</CardTitle>
              <CardDescription>{searchResults.length} match{searchResults.length > 1 ? "es" : ""}</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground">
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">User</th>
                    <th className="text-left py-2 pr-4">Flags</th>
                    <th className="text-left py-2 pr-4">Brands</th>
                    <th className="text-left py-2 pr-4">Credits</th>
                    <th className="text-left py-2 pr-4">Created</th>
                    <th className="text-left py-2 pr-4">Last sign-in</th>
                    <th className="text-right py-2 pl-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map((u) => (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <div className="font-medium">{u.email || "No email"}</div>
                        <div className="text-xs text-muted-foreground">{u.id}</div>
                        {u.display_name && <div className="text-xs">{u.display_name}</div>}
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex gap-1 flex-wrap">
                          <Badge variant={u.is_admin ? "default" : "secondary"}>{u.is_admin ? "Admin" : "User"}</Badge>
                          {u.banned && <Badge variant="destructive">Banned</Badge>}
                        </div>
                      </td>
                      <td className="py-2 pr-4">{u.brand_count}</td>
                      <td className="py-2 pr-4">
                        {u.balance ? (
                          <span className="text-xs">
                            E:{u.balance.emails_remaining ?? 0} / I:{u.balance.images_remaining ?? 0} / R:{u.balance.revisions_remaining ?? 0} / B:{u.balance.brand_limit ?? 0}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                      <td className="py-2 pr-4">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "—"}</td>
                      <td className="py-2 pl-4 text-right">
                        <Button variant="outline" size="sm" onClick={() => openDetail(u)}>Open</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* All Users (default view) */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>Page {page} • {listLoading ? "Loading…" : `${users.length} rows`}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground">
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">User</th>
                    <th className="text-left py-2 pr-4">Flags</th>
                    <th className="text-left py-2 pr-4">Brands</th>
                    <th className="text-left py-2 pr-4">Credits</th>
                    <th className="text-left py-2 pr-4">Created</th>
                    <th className="text-left py-2 pr-4">Last sign-in</th>
                    <th className="text-right py-2 pl-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <div className="font-medium">{u.email || "No email"}</div>
                        <div className="text-xs text-muted-foreground">{u.id}</div>
                        {u.display_name && <div className="text-xs">{u.display_name}</div>}
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex gap-1 flex-wrap">
                          <Badge variant={u.is_admin ? "default" : "secondary"}>{u.is_admin ? "Admin" : "User"}</Badge>
                          {u.banned && <Badge variant="destructive">Banned</Badge>}
                        </div>
                      </td>
                      <td className="py-2 pr-4">{u.brand_count}</td>
                      <td className="py-2 pr-4">
                        {u.balance ? (
                          <span className="text-xs">
                            E:{u.balance.emails_remaining ?? 0} / I:{u.balance.images_remaining ?? 0} / R:{u.balance.revisions_remaining ?? 0} / B:{u.balance.brand_limit ?? 0}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                      <td className="py-2 pr-4">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "—"}</td>
                      <td className="py-2 pl-4 text-right">
                        <Button variant="outline" size="sm" onClick={() => openDetail(u)}>Open</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" disabled={page <= 1 || listLoading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Previous
              </Button>
              <div className="text-xs text-muted-foreground">Page {page}</div>
              <Button variant="outline" disabled={!hasMore || listLoading} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Detail Modal */}
        {detailOpen && selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <Card className="w-full max-w-5xl max-h-[85vh] overflow-y-auto">
              <CardHeader className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>User: {selected.email || "No email"}</CardTitle>
                    <CardDescription className="break-all">{selected.id}</CardDescription>
                  </div>
                  <Button variant="ghost" onClick={() => setDetailOpen(false)}>Close</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {!snapshot ? (
                  <div>Loading…</div>
                ) : (
                  <>
                    {/* Account */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Account</CardTitle>
                        <CardDescription>Profile & permissions</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-sm">
                          <div><span className="text-muted-foreground">User ID:</span> {selected.id}</div>
                          <div><span className="text-muted-foreground">Email:</span> {snapshot.user?.email ?? "—"}</div>
                          <div><span className="text-muted-foreground">Name:</span> {snapshot.profile?.display_name ?? "—"}</div>
                        </div>

                        <div className="flex gap-2">
                          {snapshot.profile?.is_admin ? <Badge>Admin</Badge> : <Badge variant="secondary">User</Badge>}
                          {snapshot.profile?.banned && <Badge variant="destructive">Banned</Badge>}
                        </div>

                        <div className="grid grid-cols-1 gap-3 mt-2">
                          <Label>Change Email</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="new-email@example.com"
                              onKeyDown={async (e) => {
                                if (e.key === "Enter") {
                                  const val = (e.currentTarget as HTMLInputElement).value.trim();
                                  if (!val) return;
                                  try {
                                    await patchAccount({ email: val });
                                    (e.currentTarget as HTMLInputElement).value = "";
                                  } catch (err: any) {
                                    toast({ title: "Email update failed", description: err.message, variant: "destructive" });
                                  }
                                }
                              }}
                            />
                            <Button
                              onClick={async () => {
                                const el = document.activeElement as HTMLInputElement;
                                const val = el?.value?.trim();
                                if (!val) return;
                                try {
                                  await patchAccount({ email: val });
                                  el.value = "";
                                } catch (err: any) {
                                  toast({ title: "Email update failed", description: err.message, variant: "destructive" });
                                }
                              }}
                            >
                              Update
                            </Button>
                          </div>

                          <Label>Display Name</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="New name"
                              defaultValue={snapshot.profile?.display_name ?? ""}
                              onBlur={async (e) => {
                                const val = e.currentTarget.value.trim();
                                try {
                                  await patchAccount({ display_name: val });
                                } catch (err: any) {
                                  toast({ title: "Name update failed", description: err.message, variant: "destructive" });
                                }
                              }}
                            />
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button variant="outline" onClick={() => patchAccount({ is_admin: !snapshot.profile?.is_admin })}>
                              {snapshot.profile?.is_admin ? "Revoke Admin" : "Make Admin"}
                            </Button>
                            <Button
                              variant={snapshot.profile?.banned ? "default" : "destructive"}
                              onClick={() => setBan(!snapshot.profile?.banned)}
                            >
                              {snapshot.profile?.banned ? "Unban" : "Ban"}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Credits */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Credits</CardTitle>
                        <CardDescription>Replenish or set exact balances</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-sm">
                          <div>Emails: {snapshot.balance?.emails_remaining ?? 0}</div>
                          <div>Images: {snapshot.balance?.images_remaining ?? 0}</div>
                          <div>Revisions: {snapshot.balance?.revisions_remaining ?? 0}</div>
                          <div>Brand limit: {snapshot.balance?.brand_limit ?? 0}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="outline" onClick={() => patchCredits({ add: { emails_remaining: 10 } })}>+10 Emails</Button>
                          <Button variant="outline" onClick={() => patchCredits({ add: { images_remaining: 5 } })}>+5 Images</Button>
                          <Button variant="outline" onClick={() => patchCredits({ add: { revisions_remaining: 20 } })}>+20 Revisions</Button>
                          <Button variant="outline" onClick={() => patchCredits({ add: { brand_limit: 1 } })}>+1 Brand</Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="secondary" onClick={() => patchCredits({ set: { emails_remaining: 100 } })}>Set Emails=100</Button>
                          <Button variant="secondary" onClick={() => patchCredits({ set: { images_remaining: 50 } })}>Set Images=50</Button>
                          <Button variant="secondary" onClick={() => patchCredits({ set: { revisions_remaining: 200 } })}>Set Revisions=200</Button>
                          <Button variant="secondary" onClick={() => patchCredits({ set: { brand_limit: 5 } })}>Set Brands=5</Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Data */}
                    <Card>
                      <CardHeader>
                        <CardTitle>User Data</CardTitle>
                        <CardDescription>Brands, images, and emails</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="text-sm font-medium mb-1">Brands</div>
                          {snapshot.brands.length === 0 ? (
                            <div className="text-sm text-muted-foreground">None</div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {snapshot.brands.slice(0, 12).map((b) => (
                                <Badge key={b.domain} variant="secondary">{b.domain}</Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="text-sm font-medium mb-1">Images</div>
                          {snapshot.images.length === 0 ? (
                            <div className="text-sm text-muted-foreground">None</div>
                          ) : (
                            <div className="grid grid-cols-3 gap-2">
                              {snapshot.images.slice(0, 9).map((im) => (
                                <img key={im.id} src={im.public_url} className="rounded border object-cover h-20 w-full" />
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="text-sm font-medium mb-1">Recent Emails</div>
                          {snapshot.emails.length === 0 ? (
                            <div className="text-sm text-muted-foreground">None</div>
                          ) : (
                            <ul className="text-sm list-disc pl-4 space-y-1">
                              {snapshot.emails.slice(0, 8).map((em) => (
                                <li key={em.id}>{em.subject || "Untitled"} <span className="text-muted-foreground">({em.brand_domain || "—"})</span></li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
