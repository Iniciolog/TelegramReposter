import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Analytics() {
  const { t } = useLanguage();
  
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-card border-b border-border px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold">{t('pages.analytics.title')}</h1>
            <p className="text-muted-foreground">
              {t('pages.analytics.subtitle')}
            </p>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('cards.performance-analytics')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>{t('placeholder.analytics')}</p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
