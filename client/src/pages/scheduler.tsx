import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Clock, Plus, Edit, Trash2, Send } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSubscriptionTracker } from "@/hooks/useSubscriptionTracker";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import type { ScheduledPost, ChannelPair } from "@shared/schema";

export default function Scheduler() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const subscriptionTracker = useSubscriptionTracker();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedChannelPair, setSelectedChannelPair] = useState<string>("");
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [publishDate, setPublishDate] = useState("");
  const [publishTime, setPublishTime] = useState("");
  
  // Moscow timezone
  const MOSCOW_TIMEZONE = 'Europe/Moscow';

  // Fetch scheduled posts
  const { data: scheduledPosts = [], isLoading: postsLoading } = useQuery<ScheduledPost[]>({
    queryKey: ['/api/scheduled-posts'],
  });

  // Fetch channel pairs
  const { data: channelPairs = [] } = useQuery<ChannelPair[]>({
    queryKey: ['/api/channel-pairs'],
  });

  // Create scheduled post mutation
  const createPostMutation = useMutation({
    mutationFn: (data: any) => fetch('/api/scheduled-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scheduled-posts'] });
      toast({ title: "Пост запланирован", description: "Пост успешно добавлен в расписание" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось запланировать пост", variant: "destructive" });
    },
  });

  // Delete scheduled post mutation
  const deletePostMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/scheduled-posts/${id}`, {
      method: 'DELETE',
    }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scheduled-posts'] });
      toast({ title: "Пост удален", description: "Запланированный пост удален" });
    },
  });

  const resetForm = () => {
    setSelectedChannelPair("");
    setPostTitle("");
    setPostContent("");
    setPublishDate("");
    setPublishTime("");
  };

  const handleCreatePost = () => {
    if (!selectedChannelPair || !postTitle || !postContent || !publishDate || !publishTime) {
      toast({ title: "Ошибка", description: "Заполните все обязательные поля", variant: "destructive" });
      return;
    }

    // Convert Moscow time to UTC for storage
    // Create date in Moscow timezone by specifying the timezone in the constructor
    const utcDateTime = new Date(`${publishDate}T${publishTime}:00+03:00`);
    
    createPostMutation.mutate({
      channelPairId: selectedChannelPair,
      title: postTitle,
      content: postContent,
      publishAt: utcDateTime.toISOString(),
      status: 'scheduled'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-800">Запланирован</Badge>;
      case 'published':
        return <Badge className="bg-green-100 text-green-800">Опубликован</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Ошибка</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDateTime = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    // Convert to Moscow time for display using Intl.DateTimeFormat
    const moscowTime = new Date(date.toLocaleString("en-US", {timeZone: MOSCOW_TIMEZONE}));
    return format(moscowTime, "dd MMMM yyyy, HH:mm", { locale: ru }) + ' (МСК)';
  };
  
  const getCurrentMoscowTime = () => {
    const now = new Date();
    // Get current time in Moscow timezone
    const moscowTime = new Date(now.toLocaleString("en-US", {timeZone: MOSCOW_TIMEZONE}));
    return {
      date: format(moscowTime, 'yyyy-MM-dd'),
      time: format(moscowTime, 'HH:mm')
    };
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Планировщик постов</h1>
              <p className="text-muted-foreground">
                Создавайте и управляйте запланированными постами
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="flex items-center gap-2" 
                  disabled={subscriptionTracker.isSubscriptionRequired}
                  data-testid="button-create-post"
                >
                  <Plus className="h-4 w-4" />
                  Создать пост
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Запланировать новый пост</DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    🕰️ Время указывается по московскому времени (МСК, UTC+3)
                  </p>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="channel">Канал</Label>
                    <Select value={selectedChannelPair} onValueChange={setSelectedChannelPair}>
                      <SelectTrigger data-testid="select-channel">
                        <SelectValue placeholder="Выберите канал" />
                      </SelectTrigger>
                      <SelectContent>
                        {channelPairs.map((pair) => (
                          <SelectItem key={pair.id} value={pair.id}>
                            {pair.targetName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="title">Заголовок</Label>
                    <Input
                      id="title"
                      value={postTitle}
                      onChange={(e) => setPostTitle(e.target.value)}
                      placeholder="Введите заголовок поста"
                      data-testid="input-title"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="content">Содержание</Label>
                    <Textarea
                      id="content"
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      placeholder="Введите текст поста"
                      className="min-h-[120px]"
                      data-testid="textarea-content"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="date">Дата публикации (МСК)</Label>
                      <Input
                        id="date"
                        type="date"
                        value={publishDate}
                        onChange={(e) => setPublishDate(e.target.value)}
                        data-testid="input-date"
                        min={getCurrentMoscowTime().date}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="time">Время публикации (МСК)</Label>
                      <Input
                        id="time"
                        type="time"
                        value={publishTime}
                        onChange={(e) => setPublishTime(e.target.value)}
                        data-testid="input-time"
                      />
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    🕰️ Текущее московское время: {getCurrentMoscowTime().date} {getCurrentMoscowTime().time}
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="h-auto p-1 text-xs"
                      onClick={() => {
                        const current = getCurrentMoscowTime();
                        setPublishDate(current.date);
                        setPublishTime(current.time);
                      }}
                    >
                      Использовать
                    </Button>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Отмена
                  </Button>
                  <Button onClick={handleCreatePost} disabled={createPostMutation.isPending || subscriptionTracker.isSubscriptionRequired} data-testid="button-schedule">
                    {createPostMutation.isPending ? "Планирование..." : "Запланировать"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="grid gap-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Всего постов</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-posts">{scheduledPosts.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Запланировано</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-scheduled-posts">
                    {scheduledPosts.filter(p => p.status === 'scheduled').length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Опубликовано</CardTitle>
                  <Send className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-published-posts">
                    {scheduledPosts.filter(p => p.status === 'published').length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Scheduled Posts List */}
            <Card>
              <CardHeader>
                <CardTitle>Запланированные посты</CardTitle>
              </CardHeader>
              <CardContent>
                {postsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
                ) : scheduledPosts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Нет запланированных постов</p>
                    <p className="text-sm">Создайте первый пост, нажав кнопку "Создать пост"</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {scheduledPosts.map((post) => {
                      const channelPair = channelPairs.find(cp => cp.id === post.channelPairId);
                      return (
                        <div key={post.id} className="border rounded-lg p-4 space-y-3" data-testid={`post-${post.id}`}>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-semibold" data-testid={`text-title-${post.id}`}>{post.title}</h3>
                              <p className="text-sm text-muted-foreground" data-testid={`text-channel-${post.id}`}>
                                Канал: {channelPair?.targetName || 'Неизвестный канал'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(post.status)}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deletePostMutation.mutate(post.id)}
                                disabled={deletePostMutation.isPending || subscriptionTracker.isSubscriptionRequired}
                                data-testid={`button-delete-${post.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm" data-testid={`text-content-${post.id}`}>
                            {post.content.length > 150 ? `${post.content.substring(0, 150)}...` : post.content}
                          </p>
                          <div className="flex justify-between items-center text-sm text-muted-foreground">
                            <span data-testid={`text-publish-time-${post.id}`}>
                              📅 {formatDateTime(post.publishAt)}
                            </span>
                            {post.publishedAt && (
                              <span data-testid={`text-published-time-${post.id}`}>
                                ✅ Опубликован: {formatDateTime(post.publishedAt)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
