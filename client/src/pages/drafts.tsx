import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Edit, Trash2, Send, Eye, Filter, FileText, Check, CheckSquare, Square } from "lucide-react";
import type { DraftPost, ChannelPair } from "@shared/schema";
import { useParsingStatus } from "@/hooks/useParsingStatus";

export default function DraftsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedChannelPair, setSelectedChannelPair] = useState<string>("all");
  const [editingDraft, setEditingDraft] = useState<DraftPost | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [selectedDrafts, setSelectedDrafts] = useState<Set<string>>(new Set());
  
  // Listen for parsing status updates
  const { statuses } = useParsingStatus();
  
  // Auto-refresh drafts when new drafts are created
  useEffect(() => {
    const draftCreatedStatuses = statuses.filter(status => status.type === 'draft_created');
    if (draftCreatedStatuses.length > 0) {
      // Invalidate queries to refresh the draft list
      queryClient.invalidateQueries({ queryKey: ["/api/draft-posts"] });
    }
  }, [statuses, queryClient]);

  // Fetch channel pairs for filtering
  const { data: channelPairs = [] } = useQuery<ChannelPair[]>({
    queryKey: ["/api/channel-pairs"],
  });

  // Fetch draft posts
  const { data: drafts = [], isLoading } = useQuery<DraftPost[]>({
    queryKey: ["/api/draft-posts", selectedChannelPair === "all" ? undefined : selectedChannelPair],
    queryFn: async () => {
      const url = selectedChannelPair === "all" 
        ? "/api/draft-posts" 
        : `/api/draft-posts?channelPairId=${selectedChannelPair}`;
      const response = await apiRequest("GET", url);
      return response.json();
    },
  });

  // Update draft mutation
  const updateDraftMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DraftPost> }) => {
      const response = await apiRequest("PUT", `/api/draft-posts/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/draft-posts"] });
      toast({
        title: "Черновик обновлен",
        description: "Изменения успешно сохранены",
      });
      setEditingDraft(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Ошибка обновления",
        description: error.message || "Не удалось обновить черновик",
      });
    },
  });

  // Delete draft mutation
  const deleteDraftMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/draft-posts/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/draft-posts"] });
      toast({
        title: "Черновик удален",
        description: "Черновик успешно удален",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Ошибка удаления",
        description: error.message || "Не удалось удалить черновик",
      });
    },
  });

  // Bulk delete drafts mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await apiRequest("DELETE", "/api/draft-posts", { ids });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/draft-posts"] });
      setSelectedDrafts(new Set());
      toast({
        title: "Черновики удалены",
        description: `Удалено ${data.deletedCount} из ${data.totalRequested} черновиков`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Ошибка удаления",
        description: error.message || "Не удалось удалить черновики",
      });
    },
  });

  // Publish draft mutation
  const publishDraftMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/draft-posts/${id}/publish`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/draft-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-posts"] });
      toast({
        title: "Черновик опубликован",
        description: "Пост отправлен в очередь публикации",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Ошибка публикации",
        description: error.message || "Не удалось опубликовать черновик",
      });
    },
  });

  const handleEdit = (draft: DraftPost) => {
    setEditingDraft(draft);
    setEditedContent(draft.content || "");
  };

  const handleSave = () => {
    if (!editingDraft) return;
    
    updateDraftMutation.mutate({
      id: editingDraft.id,
      updates: { content: editedContent }
    });
  };

  const getChannelPairName = (channelPairId: string) => {
    const pair = channelPairs.find(p => p.id === channelPairId);
    return pair ? `${pair.sourceName} → ${pair.targetName}` : "Неизвестный канал";
  };

  const handleSelectDraft = (draftId: string, checked: boolean) => {
    const newSelected = new Set(selectedDrafts);
    if (checked) {
      newSelected.add(draftId);
    } else {
      newSelected.delete(draftId);
    }
    setSelectedDrafts(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDrafts(new Set(drafts.map(d => d.id)));
    } else {
      setSelectedDrafts(new Set());
    }
  };

  const handleBulkDelete = () => {
    if (selectedDrafts.size === 0) return;
    bulkDeleteMutation.mutate(Array.from(selectedDrafts));
  };

  const isAllSelected = drafts.length > 0 && selectedDrafts.size === drafts.length;
  const isPartialSelected = selectedDrafts.size > 0 && selectedDrafts.size < drafts.length;

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Черновики</h1>
          <p className="text-muted-foreground">
            Управляйте черновиками постов перед публикацией
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <Select value={selectedChannelPair} onValueChange={setSelectedChannelPair}>
              <SelectTrigger className="w-64" data-testid="filter-channel-pairs">
                <SelectValue placeholder="Фильтр по каналам" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все каналы</SelectItem>
                {channelPairs.map((pair) => (
                  <SelectItem key={pair.id} value={pair.id}>
                    {pair.sourceName} → {pair.targetName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Badge variant="secondary" className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {drafts.length} черновиков
          </Badge>
        </div>
      </div>

      {drafts.length > 0 && (
        <div className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={isAllSelected}
                ref={(ref) => {
                  if (ref) {
                    ref.indeterminate = isPartialSelected;
                  }
                }}
                onCheckedChange={handleSelectAll}
                data-testid="checkbox-select-all"
              />
              <span className="text-sm font-medium">
                {selectedDrafts.size === 0 
                  ? "Выбрать все" 
                  : `Выбрано: ${selectedDrafts.size} из ${drafts.length}`
                }
              </span>
            </div>
          </div>
          
          {selectedDrafts.size > 0 && (
            <div className="flex items-center gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    disabled={bulkDeleteMutation.isPending}
                    data-testid="button-bulk-delete"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Удалить выбранные ({selectedDrafts.size})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Удалить выбранные черновики?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Это действие нельзя отменить. Будет удалено {selectedDrafts.size} черновиков.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleBulkDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Удалить
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedDrafts(new Set())}
                data-testid="button-clear-selection"
              >
                Очистить выбор
              </Button>
            </div>
          )}
        </div>
      )}

      {drafts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Нет черновиков</h3>
            <p className="text-muted-foreground">
              {selectedChannelPair === "all" 
                ? "У вас пока нет черновиков. Настройте режим 'Только черновики' или 'Автопубликация + черновики' в настройках канальных пар."
                : "Нет черновиков для выбранной канальной пары."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {drafts.map((draft) => (
            <Card key={draft.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedDrafts.has(draft.id)}
                      onCheckedChange={(checked) => handleSelectDraft(draft.id, !!checked)}
                      data-testid={`checkbox-draft-${draft.id}`}
                    />
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        {getChannelPairName(draft.channelPairId || '')}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>ID поста: {draft.originalPostId}</span>
                        <Separator orientation="vertical" className="h-4" />
                        <span>
                          {draft.createdAt ? formatDistanceToNow(new Date(draft.createdAt), { 
                            addSuffix: true, 
                            locale: ru 
                          }) : 'Неизвестно'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={draft.status === "draft" ? "secondary" : "default"}>
                    {draft.status === "draft" ? "Черновик" : draft.status}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Содержимое поста:</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md text-sm max-h-32 overflow-y-auto">
                    {draft.content || "Пустой контент"}
                  </div>
                </div>

                {draft.originalContent && draft.originalContent !== draft.content && (
                  <div>
                    <Label className="text-sm font-medium">Оригинальный текст:</Label>
                    <div className="mt-1 p-3 bg-muted/50 rounded-md text-sm max-h-24 overflow-y-auto">
                      {draft.originalContent}
                    </div>
                  </div>
                )}

                {Array.isArray(draft.mediaUrls) && draft.mediaUrls.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Медиафайлы:</Label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {draft.mediaUrls.map((url: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          Файл {index + 1}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(draft)} data-testid={`button-edit-${draft.id}`}>
                        <Edit className="h-4 w-4 mr-1" />
                        Редактировать
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Редактирование черновика</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="content">Содержимое поста</Label>
                          <Textarea
                            id="content"
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="min-h-[200px]"
                            placeholder="Введите текст поста..."
                            data-testid="textarea-edit-content"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setEditingDraft(null)}>
                            Отмена
                          </Button>
                          <Button 
                            onClick={handleSave} 
                            disabled={updateDraftMutation.isPending}
                            data-testid="button-save-draft"
                          >
                            {updateDraftMutation.isPending ? "Сохранение..." : "Сохранить"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button 
                    onClick={() => publishDraftMutation.mutate(draft.id)}
                    disabled={publishDraftMutation.isPending}
                    size="sm"
                    data-testid={`button-publish-${draft.id}`}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Опубликовать
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" data-testid={`button-delete-${draft.id}`}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Удалить
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Удалить черновик?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Это действие нельзя отменить. Черновик будет удален навсегда.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => deleteDraftMutation.mutate(draft.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Удалить
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}