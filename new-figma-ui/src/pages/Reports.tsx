import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { mockObservations, mockActionPlans, mockPlants, mockAudits } from '../data/mockData';
import { Download, FileText, AlertCircle } from 'lucide-react';
import { PageContainer } from '../components/PageContainer';
import { PageTitle } from '../components/PageTitle';

export function Reports() {
  const [filters, setFilters] = useState({
    plant: '',
    audit: '',
    dateRange: 'all'
  });

  const totalObservations = mockObservations.length;
  const publishedObs = mockObservations.filter(o => o.isPublished).length;
  const criticalObs = mockObservations.filter(o => o.riskLevel === 'critical').length;
  const highObs = mockObservations.filter(o => o.riskLevel === 'high').length;

  const overdueActions = mockActionPlans.filter(a => a.status === 'overdue');
  const dueSoonActions = mockActionPlans.filter(a => {
    const dueDate = new Date(a.dueDate);
    const today = new Date();
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 7 && a.status === 'pending';
  });

  return (
    <PageContainer className="space-y-6">
      <PageTitle 
        title="Reports" 
        description="Generate and export audit reports"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              Export PDF
            </Button>
            <Button className="gap-2">
              <Download className="h-4 w-4" />
              Export Excel
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
          <CardDescription>Customize report parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Plant</Label>
              <Select value={filters.plant} onValueChange={(value) => setFilters({ ...filters, plant: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Plants" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plants</SelectItem>
                  {mockPlants.map(plant => (
                    <SelectItem key={plant.id} value={plant.id}>{plant.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Audit</Label>
              <Select value={filters.audit} onValueChange={(value) => setFilters({ ...filters, audit: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Audits" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Audits</SelectItem>
                  {mockAudits.map(audit => (
                    <SelectItem key={audit.id} value={audit.id}>{audit.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={filters.dateRange} onValueChange={(value) => setFilters({ ...filters, dateRange: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="90days">Last 90 Days</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>Overview</CardDescription>
            <CardTitle className="text-3xl">{totalObservations}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Total Observations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Approvals</CardDescription>
            <CardTitle className="text-3xl">{publishedObs}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Published Observations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Publication Rate</CardDescription>
            <CardTitle className="text-3xl">{Math.round((publishedObs / totalObservations) * 100)}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Observations Published</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>High Priority</CardDescription>
            <CardTitle className="text-3xl text-red-600">{criticalObs + highObs}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Critical & High Risk</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Risk Breakdown</CardTitle>
          <CardDescription>Distribution of observations by risk level</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {['critical', 'high', 'medium', 'low'].map(risk => {
              const count = mockObservations.filter(o => o.riskLevel === risk).length;
              const percentage = (count / totalObservations) * 100;
              const colors: Record<string, string> = {
                critical: 'bg-red-600',
                high: 'bg-orange-500',
                medium: 'bg-yellow-500',
                low: 'bg-green-500'
              };
              return (
                <div key={risk} className="flex items-center gap-4">
                  <div className="w-24">
                    <span className="capitalize">{risk}</span>
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div 
                      className={`${colors[risk]} h-3 rounded-full`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-16 text-right">
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Overdue Action Plans</CardTitle>
                <CardDescription>{overdueActions.length} action plans past due date</CardDescription>
              </div>
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            {overdueActions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueActions.map(action => (
                    <TableRow key={action.id}>
                      <TableCell className="max-w-xs">
                        <p className="truncate">{action.description}</p>
                      </TableCell>
                      <TableCell>{action.assignedTo}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{action.dueDate}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No overdue action plans</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Due Soon Action Plans</CardTitle>
                <CardDescription>{dueSoonActions.length} action plans due within 7 days</CardDescription>
              </div>
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            {dueSoonActions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dueSoonActions.map(action => (
                    <TableRow key={action.id}>
                      <TableCell className="max-w-xs">
                        <p className="truncate">{action.description}</p>
                      </TableCell>
                      <TableCell>{action.assignedTo}</TableCell>
                      <TableCell>
                        <Badge className="bg-yellow-500">{action.dueDate}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No action plans due soon</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
