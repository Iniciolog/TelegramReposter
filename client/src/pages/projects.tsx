import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Bot, Calendar, Clock, MessageSquare, Settings as SettingsIcon, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionTracker } from "@/hooks/useSubscriptionTracker";
import { SubscriptionModal } from "@/components/subscription-modal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Project, InsertProject } from "@shared/schema";

interface ProjectWithStats extends Project {
  totalPosts?: number;
  activePosts?: number;
  completedPosts?: number;
  nextPostAt?: string;
}

export default function Projects() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [newProject, setNewProject] = useState<Partial<InsertProject>>({
    name: "",
    description: "",
    status: "active",
    objectives: [],
    targetChannels: [],
    timeline: {},
    settings: {}
  });
  const { toast } = useToast();
  const subscriptionTracker = useSubscriptionTracker();

  const { data: projects = [], isLoading } = useQuery<ProjectWithStats[]>({
    queryKey: ["/api/projects"],
  });

  const createProjectMutation = useMutation({
    mutationFn: async (project: InsertProject) => {
      const response = await apiRequest("POST", "/api/projects", project);
      
      // Check if response is not ok and parse error
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        
        // Handle specific error codes
        if (response.status === 402 && (errorData.code === 'TRIAL_EXPIRED' || errorData.code === 'ACTIVATION_REQUIRED')) {
          throw new Error(`SUBSCRIPTION_REQUIRED:${errorData.message}`);
        }
        
        throw new Error(errorData.message || 'Failed to create project');
      }
      
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsCreateModalOpen(false);
      setNewProject({
        name: "",
        description: "",
        status: "active",
        objectives: [],
        targetChannels: [],
        timeline: {},
        settings: {}
      });
      toast({
        title: "Project Created",
        description: "Your long-term project has been created successfully.",
      });
    },
    onError: (error: Error) => {
      console.error("Failed to create project:", error);
      
      // Handle subscription required error
      if (error.message.startsWith('SUBSCRIPTION_REQUIRED:')) {
        setIsSubscriptionModalOpen(true);
        toast({
          title: "Активация требуется",
          description: "Пробный период истек. Активируйте подписку для создания проектов.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateProject = () => {
    // Check subscription status first
    if (subscriptionTracker.isSubscriptionRequired) {
      setIsSubscriptionModalOpen(true);
      toast({
        title: "Активация требуется",
        description: "Пробный период истек. Активируйте подписку для создания проектов.",
        variant: "destructive",
      });
      return;
    }

    if (!newProject.name?.trim()) {
      toast({
        title: "Validation Error",
        description: "Project name is required.",
        variant: "destructive",
      });
      return;
    }

    createProjectMutation.mutate({
      ...newProject,
      name: newProject.name!,
    } as InsertProject);
  };

  const handleSubscriptionActivated = () => {
    setIsSubscriptionModalOpen(false);
    // Refresh subscription data
    subscriptionTracker.resetSession();
    toast({
      title: "Подписка активирована",
      description: "Теперь вы можете создавать проекты.",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "paused":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "archived":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-6"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Long-Term Projects</h1>
          <p className="text-muted-foreground">
            Manage AI-powered content projects with automated posting and strategic planning
          </p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button 
              disabled={subscriptionTracker.isSubscriptionRequired}
              data-testid="button-create-project"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Set up a new long-term content project with AI agent management
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  placeholder="e.g., Tech News Content Strategy"
                  value={newProject.name || ""}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  data-testid="input-project-name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-description">Description</Label>
                <Textarea
                  id="project-description"
                  placeholder="Describe your project goals and strategy..."
                  value={newProject.description || ""}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  data-testid="input-project-description"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-status">Status</Label>
                <Select
                  value={newProject.status || "active"}
                  onValueChange={(value) => setNewProject({ ...newProject, status: value })}
                >
                  <SelectTrigger data-testid="select-project-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                data-testid="button-cancel-project"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateProject}
                disabled={createProjectMutation.isPending || subscriptionTracker.isSubscriptionRequired}
                data-testid="button-save-project"
              >
                {createProjectMutation.isPending ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Subscription status warning */}
      {subscriptionTracker.isSubscriptionRequired && (
        <Alert className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex justify-between items-center">
              <div>
                <strong>Пробный период истек.</strong> Активируйте подписку для создания новых проектов.
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsSubscriptionModalOpen(true)}
                data-testid="button-activate-subscription"
              >
                Активировать
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Projects Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first long-term project to get started with AI-powered content management
            </p>
            <Button 
              onClick={() => setIsCreateModalOpen(true)} 
              disabled={subscriptionTracker.isSubscriptionRequired}
              data-testid="button-create-first-project"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Project
            </Button>
            {subscriptionTracker.isSubscriptionRequired && (
              <p className="text-sm text-muted-foreground mt-2">
                Требуется активация подписки
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2" data-testid={`text-project-name-${project.id}`}>
                      {project.name}
                    </CardTitle>
                    <Badge className={getStatusColor(project.status)} data-testid={`badge-status-${project.id}`}>
                      {project.status}
                    </Badge>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    disabled={subscriptionTracker.isSubscriptionRequired}
                    data-testid={`button-settings-${project.id}`}
                  >
                    <SettingsIcon className="h-4 w-4" />
                  </Button>
                </div>
                {project.description && (
                  <CardDescription className="line-clamp-2" data-testid={`text-description-${project.id}`}>
                    {project.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Posts:</span>
                      <span className="font-medium" data-testid={`text-total-posts-${project.id}`}>
                        {project.totalPosts || 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Active:</span>
                      <span className="font-medium" data-testid={`text-active-posts-${project.id}`}>
                        {project.activePosts || 0}
                      </span>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={subscriptionTracker.isSubscriptionRequired}
                      data-testid={`button-chat-${project.id}`}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Chat with AI
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={subscriptionTracker.isSubscriptionRequired}
                      data-testid={`button-view-${project.id}`}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        onActivate={handleSubscriptionActivated}
        timeRemaining={subscriptionTracker.getFormattedTimeRemaining()}
      />
    </div>
  );
}