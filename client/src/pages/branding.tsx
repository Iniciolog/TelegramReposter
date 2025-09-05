import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Branding() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-card border-b border-border px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold">Branding</h1>
            <p className="text-muted-foreground">
              Customize branding and visual elements for your posts
            </p>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>Branding customization interface will be implemented here.</p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
