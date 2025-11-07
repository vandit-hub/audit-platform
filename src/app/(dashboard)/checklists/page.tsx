import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function ChecklistsPage() {
  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-gray-900 sm:text-4xl">Checklists</h1>
        <p className="text-sm text-text-light">
          Checklist templates are currently disabled while we redesign the experience.
        </p>
      </div>

      <Card variant="feature" className="py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-400 bg-notion-bacSec">
          <svg className="h-8 w-8 text-text-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5h6m-6 4h6m-6 4h3m5 4H7a2 2 0 01-2-2V7a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="mx-auto mt-6 space-y-3 max-w-md">
          <h2 className="text-xl font-semibold text-gray-900">Module unavailable</h2>
          <p className="text-sm text-text-light leading-relaxed">
            Checklist management is paused while we migrate existing templates. We’ll re-enable the module once the
            Notion-style experience is ready.
          </p>
          <div className="pt-2">
            <Button variant="secondary" asChild>
              <a href="mailto:support@ezaudit.example">Contact support</a>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}