import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  FolderSync, 
  BarChart3, 
  Settings, 
  Filter, 
  Palette, 
  Clock, 
  Activity,
  User,
  LogOut,
  Wifi,
  FileText,
  Globe,
  Menu,
  X,
  Download
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "./language-switcher";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

const navigation = [
  {
    name: "nav.dashboard",
    href: "/",
    icon: BarChart3,
  },
  {
    name: "nav.channels",
    href: "/channels",
    icon: Wifi,
  },
  {
    name: "nav.content-filters",
    href: "/content-filters",
    icon: Filter,
  },
  {
    name: "nav.branding",
    href: "/branding",
    icon: Palette,
  },
  {
    name: "nav.scheduler",
    href: "/scheduler",
    icon: Clock,
  },
  {
    name: "nav.drafts",
    href: "/drafts",
    icon: FileText,
  },
  {
    name: "nav.web-sources",
    href: "/web-sources",
    icon: Globe,
  },
  {
    name: "nav.analytics",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    name: "nav.activity-logs",
    href: "/activity-logs",
    icon: Activity,
  },
  {
    name: "nav.settings",
    href: "/settings",
    icon: Settings,
  },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps = {}) {
  const [location] = useLocation();
  const { t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.mobile-sidebar') && !target.closest('.mobile-menu-button')) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isMobileMenuOpen]);

  const handleDownload = async () => {
    if (!password) {
      toast({
        title: "Ошибка",
        description: "Введите пароль",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);
    try {
      const response = await fetch("/api/download/deployment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Ошибка скачивания");
      }

      // Create download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "telegram-autoposter-deployment.zip";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Успех",
        description: "Архив скачан успешно",
      });

      setIsDownloadDialogOpen(false);
      setPassword("");
    } catch (error) {
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Неизвестная ошибка",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const SidebarContent = () => (
    <div className={cn("w-64 bg-card border-r border-border flex flex-col h-screen", className)}>
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <FolderSync className="text-primary-foreground h-4 w-4" />
          </div>
          <h1 className="text-xl font-bold">{t('app.name')}</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-md transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{t(item.name)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Protected Download Section */}
      <div className="p-4 border-t border-border">
        <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full flex items-center justify-center gap-2"
              data-testid="button-protected-download"
            >
              <Download className="h-4 w-4" />
              Скачать архив
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Скачать развертывание</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Пароль доступа</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Введите пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleDownload()}
                  data-testid="input-download-password"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsDownloadDialogOpen(false);
                    setPassword("");
                  }}
                  data-testid="button-cancel-download"
                >
                  Отмена
                </Button>
                <Button 
                  onClick={handleDownload}
                  disabled={isDownloading}
                  data-testid="button-confirm-download"
                >
                  {isDownloading ? "Скачивание..." : "Скачать"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Language Switcher */}
      <div className="p-4 border-t border-border">
        <LanguageSwitcher />
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <User className="text-muted-foreground h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{t('app.user')}</p>
            <p className="text-xs text-muted-foreground">{t('app.plan')}</p>
          </div>
          <button 
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-4 left-4 z-50 mobile-menu-button bg-card border border-border"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        data-testid="mobile-menu-toggle"
      >
        {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <div className={cn(
        "lg:hidden fixed top-0 left-0 z-50 transform transition-transform duration-300 ease-in-out mobile-sidebar",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <SidebarContent />
      </div>
    </>
  );
}
