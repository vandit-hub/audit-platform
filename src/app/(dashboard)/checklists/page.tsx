import { Card } from "@/components/ui/v2/card";

export default function ChecklistsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-neutral-900">Checklists</h1>
        <p className="text-base text-neutral-600 mt-2">Manage audit checklists and templates</p>
      </div>

      <Card >
        <div className="text-center py-16 px-6">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-neutral-100 rounded-full">
              <svg className="h-12 w-12 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">Module Not Available</h3>
          <p className="text-sm text-neutral-600 max-w-md mx-auto leading-relaxed">
            The checklist module has been removed for this release. Check back in future updates for checklist management functionality.
          </p>
        </div>
      </Card>
    </div>
  );
}