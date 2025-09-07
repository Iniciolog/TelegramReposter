import { useState } from "react";
import { Plus, Globe, ExternalLink, Settings, Trash2, Play } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertWebSourceSchema, type WebSource, type InsertWebSource } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ParseStatusDisplay } from "@/components/ParseStatusDisplay";

interface CreateWebSourceFormData extends InsertWebSource {}

export default function WebSources() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingWebSource, setEditingWebSource] = useState<WebSource | null>(null);

  // Fetch web sources
  const { data: webSources, isLoading } = useQuery<WebSource[]>({
    queryKey: ['/api/web-sources'],
  });

  // Create web source mutation
  const createWebSourceMutation = useMutation({
    mutationFn: (data: CreateWebSourceFormData) =>
      apiRequest('POST', '/api/web-sources', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/web-sources'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Web source created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create web source",
        variant: "destructive",
      });
    },
  });

  // Update web source mutation
  const updateWebSourceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertWebSource> }) =>
      apiRequest('PATCH', `/api/web-sources/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/web-sources'] });
      setEditingWebSource(null);
      toast({
        title: "Success",
        description: "Web source updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update web source",
        variant: "destructive",
      });
    },
  });

  // Delete web source mutation
  const deleteWebSourceMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest('DELETE', `/api/web-sources/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/web-sources'] });
      toast({
        title: "Success",
        description: "Web source deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to delete web source",
        variant: "destructive",
      });
    },
  });

  // Parse web source mutation
  const parseWebSourceMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest('POST', `/api/web-sources/${id}/parse`),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Web source parsing triggered successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to parse web source",
        variant: "destructive",
      });
    },
  });

  // Forms
  const createForm = useForm<CreateWebSourceFormData>({
    resolver: zodResolver(insertWebSourceSchema),
    defaultValues: {
      name: '',
      url: '',
      type: 'rss',
      selector: '',
      isActive: true,
      parseInterval: 60,
    },
  });

  const editForm = useForm<Partial<InsertWebSource>>({
    resolver: zodResolver(insertWebSourceSchema.partial()),
  });

  const onCreateSubmit = (data: CreateWebSourceFormData) => {
    createWebSourceMutation.mutate(data);
  };

  const onEditSubmit = (data: Partial<InsertWebSource>) => {
    if (!editingWebSource) return;
    updateWebSourceMutation.mutate({ id: editingWebSource.id, data });
  };

  const handleEdit = (webSource: WebSource) => {
    setEditingWebSource(webSource);
    editForm.reset({
      name: webSource.name,
      url: webSource.url,
      type: webSource.type,
      selector: webSource.selector || '',
      isActive: webSource.isActive,
      parseInterval: webSource.parseInterval,
    });
  };

  const handleDelete = (id: string) => {
    deleteWebSourceMutation.mutate(id);
  };

  const handleParse = (id: string) => {
    parseWebSourceMutation.mutate(id);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold">Web Sources</h1>
                  <p className="text-muted-foreground">
                    Manage RSS feeds and HTML parsing sources for content automation
                  </p>
                </div>
                <ParseStatusDisplay compact className="mr-4" />
              </div>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-web-source">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Web Source
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Web Source</DialogTitle>
                </DialogHeader>
                
                <Form {...createForm}>
                  <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                    <FormField
                      control={createForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input data-testid="input-web-source-name" placeholder="News Website" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={createForm.control}
                      name="url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL</FormLabel>
                          <FormControl>
                            <Input data-testid="input-web-source-url" placeholder="https://example.com/rss" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={createForm.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-web-source-type">
                                <SelectValue placeholder="Select source type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="rss">RSS Feed</SelectItem>
                              <SelectItem value="html">HTML Page</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {createForm.watch('type') === 'html' && (
                      <FormField
                        control={createForm.control}
                        name="selector"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CSS Selector</FormLabel>
                            <FormControl>
                              <Input 
                                data-testid="input-web-source-selector"
                                placeholder="article, .post, .news-item" 
                                {...field} 
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    <FormField
                      control={createForm.control}
                      name="parseInterval"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parse Interval (minutes)</FormLabel>
                          <FormControl>
                            <Input 
                              data-testid="input-web-source-interval"
                              type="number" 
                              placeholder="60" 
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={createForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Active</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Enable automatic parsing for this source
                            </div>
                          </div>
                          <FormControl>
                            <Switch 
                              data-testid="switch-web-source-active"
                              checked={field.value || false}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsCreateDialogOpen(false)}
                        data-testid="button-cancel-web-source"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createWebSourceMutation.isPending}
                        data-testid="button-save-web-source"
                      >
                        {createWebSourceMutation.isPending ? 'Creating...' : 'Create Web Source'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !webSources?.length ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Globe className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Web Sources</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Get started by adding your first RSS feed or HTML parsing source
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-web-source">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Web Source
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {webSources.map((webSource) => (
                <Card key={webSource.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Globe className="h-5 w-5 text-muted-foreground" />
                          <span className="truncate" data-testid={`text-web-source-name-${webSource.id}`}>
                            {webSource.name}
                          </span>
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={webSource.isActive ? "default" : "secondary"}>
                            {webSource.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline" data-testid={`badge-web-source-type-${webSource.id}`}>
                            {webSource.type.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex gap-1 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleParse(webSource.id)}
                          disabled={parseWebSourceMutation.isPending}
                          data-testid={`button-parse-web-source-${webSource.id}`}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(webSource)}
                          data-testid={`button-edit-web-source-${webSource.id}`}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              data-testid={`button-delete-web-source-${webSource.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Web Source</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{webSource.name}"? This action cannot be undone and will also delete all related draft posts.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(webSource.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      <a 
                        href={webSource.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:underline truncate"
                        data-testid={`link-web-source-url-${webSource.id}`}
                      >
                        {webSource.url}
                      </a>
                    </div>
                    
                    {webSource.type === 'html' && webSource.selector && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Selector:</span> {webSource.selector}
                      </div>
                    )}
                    
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Interval:</span> {webSource.parseInterval} minutes
                    </div>
                    
                    {webSource.lastParsed && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Last parsed:</span>{' '}
                        {format(new Date(webSource.lastParsed), 'MMM d, HH:mm')}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          {/* Edit Dialog */}
          <Dialog open={!!editingWebSource} onOpenChange={() => setEditingWebSource(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Web Source</DialogTitle>
              </DialogHeader>
              
              {editingWebSource && (
                <Form {...editForm}>
                  <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                    <FormField
                      control={editForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input data-testid="input-edit-web-source-name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editForm.control}
                      name="url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL</FormLabel>
                          <FormControl>
                            <Input data-testid="input-edit-web-source-url" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editForm.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-edit-web-source-type">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="rss">RSS Feed</SelectItem>
                              <SelectItem value="html">HTML Page</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {editForm.watch('type') === 'html' && (
                      <FormField
                        control={editForm.control}
                        name="selector"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CSS Selector</FormLabel>
                            <FormControl>
                              <Input 
                                data-testid="input-edit-web-source-selector"
                                {...field} 
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    <FormField
                      control={editForm.control}
                      name="parseInterval"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parse Interval (minutes)</FormLabel>
                          <FormControl>
                            <Input 
                              data-testid="input-edit-web-source-interval"
                              type="number" 
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Active</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Enable automatic parsing for this source
                            </div>
                          </div>
                          <FormControl>
                            <Switch 
                              data-testid="switch-edit-web-source-active"
                              checked={field.value || false}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setEditingWebSource(null)}
                        data-testid="button-cancel-edit-web-source"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={updateWebSourceMutation.isPending}
                        data-testid="button-save-edit-web-source"
                      >
                        {updateWebSourceMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}