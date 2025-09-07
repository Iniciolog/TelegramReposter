import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Channels from "@/pages/channels";
import ContentFilters from "@/pages/content-filters";
import Branding from "@/pages/branding";
import Scheduler from "@/pages/scheduler";
import Drafts from "@/pages/drafts";
import WebSources from "@/pages/web-sources";
import Analytics from "@/pages/analytics";
import ActivityLogs from "@/pages/activity-logs";
import Settings from "@/pages/settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/channels" component={Channels} />
      <Route path="/content-filters" component={ContentFilters} />
      <Route path="/branding" component={Branding} />
      <Route path="/scheduler" component={Scheduler} />
      <Route path="/drafts" component={Drafts} />
      <Route path="/web-sources" component={WebSources} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/activity-logs" component={ActivityLogs} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
