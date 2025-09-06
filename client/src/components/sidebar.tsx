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
  Wifi
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "./language-switcher";

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

export function Sidebar() {
  const [location] = useLocation();
  const { t } = useLanguage();

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col h-screen">
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
}
