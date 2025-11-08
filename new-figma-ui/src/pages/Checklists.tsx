import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { CheckSquare } from 'lucide-react';
import { PageContainer } from '../components/PageContainer';

export function Checklists() {
  return (
    <PageContainer className="space-y-6">
      <Card style={{ border: '1px solid var(--c-borPri)', borderRadius: 'var(--border-radius-700)' }}>
        <CardHeader>
          <CardTitle>Checklists</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <CheckSquare className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-gray-900 mb-2">Module Not Available</h3>
            <p className="text-gray-500">
              The Checklists module is currently under development and will be available soon.
            </p>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
