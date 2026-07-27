import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotesPage() {
  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        Notes
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Phase 4 test page</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">
            This page exists to prove that any route under /dashboard is
            protected by the global middleware without needing per-page
            auth checks.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
