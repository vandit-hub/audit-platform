import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { mockAudits, mockObservations, mockActionPlans } from '../data/mockData';
import { ClipboardList, Eye, AlertTriangle, Clock, User, Calendar, ArrowRight } from 'lucide-react';
import { PageContainer } from '../components/PageContainer';
import { PageTitle } from '../components/PageTitle';

export function Dashboard() {
  const totalAudits = mockAudits.length;
  const activeAudits = mockAudits.filter(a => !a.isLocked).length;
  const completedAudits = mockAudits.filter(a => a.isLocked).length;

  const totalObservations = mockObservations.length;
  const openObs = mockObservations.filter(o => o.status === 'open').length;
  const resolvedObs = mockObservations.filter(o => o.status === 'resolved').length;

  const criticalObs = mockObservations.filter(o => o.riskLevel === 'critical').length;
  const highObs = mockObservations.filter(o => o.riskLevel === 'high').length;
  const mediumObs = mockObservations.filter(o => o.riskLevel === 'medium').length;

  // Calculate overdue actions
  const overdueActions = mockActionPlans.filter(a => a.status === 'overdue').length;
  const criticalOverdue = mockObservations.filter(o => 
    o.riskLevel === 'critical' && o.status !== 'closed' && o.status !== 'resolved'
  ).length;
  const highOverdue = mockObservations.filter(o => 
    o.riskLevel === 'high' && o.status !== 'closed' && o.status !== 'resolved'
  ).length;

  // Calculate due soon (pending actions)
  const dueSoon = mockActionPlans.filter(a => a.status === 'pending' || a.status === 'in_progress').length;

  // Observation status breakdown
  const pendingMR = mockObservations.filter(o => o.status === 'open' && !o.auditeeResponse).length;
  const mrUnderReview = mockObservations.filter(o => o.status === 'in_progress' && o.auditeeResponse).length;
  const referredBack = 0; // Can be calculated based on your business logic
  const finalised = mockObservations.filter(o => o.status === 'resolved').length;
  const resolved = mockObservations.filter(o => o.status === 'closed').length;

  // Process areas (using the 'process' field from observations)
  const processAreas = mockObservations.reduce((acc, obs) => {
    const process = obs.process || 'Other';
    acc[process] = (acc[process] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const processAreasList = Object.entries(processAreas)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const maxProcessCount = Math.max(...processAreasList.map(([, count]) => count));

  return (
    <PageContainer className="space-y-6">
      <PageTitle 
        title="Dashboard" 
        description="Overview of audits and observations"
      />

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Audits */}
        <Card style={{ background: 'var(--c-bacSec)', border: 'none', borderRadius: 'var(--border-radius-700)' }}>
          <CardHeader>
            <CardDescription style={{ color: 'var(--c-texSec)', fontSize: '13px', marginBottom: '4px' }}>
              Total Audits
            </CardDescription>
            <CardTitle style={{ fontSize: '48px', fontWeight: 700, lineHeight: 1 }}>{totalAudits}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" style={{ color: 'var(--c-texSec)' }} />
              <span style={{ fontSize: '14px', color: 'var(--c-texSec)' }}>
                {activeAudits} active, {completedAudits} completed
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Total Observations */}
        <Card style={{ background: 'var(--c-bacSec)', border: 'none', borderRadius: 'var(--border-radius-700)' }}>
          <CardHeader>
            <CardDescription style={{ color: 'var(--c-texSec)', fontSize: '13px', marginBottom: '4px' }}>
              Total Observations
            </CardDescription>
            <CardTitle style={{ fontSize: '48px', fontWeight: 700, lineHeight: 1 }}>{totalObservations}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" style={{ color: 'var(--c-texSec)' }} />
              <span style={{ fontSize: '14px', color: 'var(--c-texSec)' }}>
                {openObs} open, {resolvedObs} resolved
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Overdue Actions */}
        <Card style={{ background: 'var(--c-bacSec)', border: 'none', borderRadius: 'var(--border-radius-700)' }}>
          <CardHeader>
            <CardDescription style={{ color: 'var(--c-texSec)', fontSize: '13px', marginBottom: '4px' }}>
              Overdue Actions
            </CardDescription>
            <CardTitle style={{ fontSize: '48px', fontWeight: 700, lineHeight: 1, color: 'var(--cd-palPin500)' }}>
              {overdueActions}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" style={{ color: 'var(--cd-palPin500)' }} />
              <span style={{ fontSize: '14px', color: 'var(--c-texSec)' }}>
                {criticalOverdue} critical, {highOverdue} high
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Due Soon */}
        <Card style={{ background: 'var(--c-bacSec)', border: 'none', borderRadius: 'var(--border-radius-700)' }}>
          <CardHeader>
            <CardDescription style={{ color: 'var(--c-texSec)', fontSize: '13px', marginBottom: '4px' }}>
              Due Soon
            </CardDescription>
            <CardTitle style={{ fontSize: '48px', fontWeight: 700, lineHeight: 1, color: 'var(--c-palUiBlu600)' }}>
              {dueSoon}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" style={{ color: 'var(--c-palUiBlu600)' }} />
              <span style={{ fontSize: '14px', color: 'var(--c-texSec)' }}>
                {Math.ceil(dueSoon * 0.5)} this week, {Math.floor(dueSoon * 0.5)} next week
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Row - Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Distribution */}
        <Card style={{ border: '1px solid var(--c-borPri)', borderRadius: 'var(--border-radius-700)' }}>
          <CardHeader>
            <CardTitle style={{ fontSize: '18px' }}>Risk Distribution</CardTitle>
            <CardDescription style={{ color: 'var(--c-texSec)', fontSize: '14px' }}>
              Observations by category
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--c-texPri)' }}>Category A (Critical)</span>
                <span className="text-sm" style={{ color: 'var(--c-texPri)' }}>{criticalObs}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-200">
                <div 
                  className="h-2 rounded-full bg-red-600" 
                  style={{ width: `${(criticalObs / totalObservations) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--c-texPri)' }}>Category B (High)</span>
                <span className="text-sm" style={{ color: 'var(--c-texPri)' }}>{highObs}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-200">
                <div 
                  className="h-2 rounded-full bg-orange-500" 
                  style={{ width: `${(highObs / totalObservations) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--c-texPri)' }}>Category C (Medium)</span>
                <span className="text-sm" style={{ color: 'var(--c-texPri)' }}>{mediumObs}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-200">
                <div 
                  className="h-2 rounded-full bg-yellow-500" 
                  style={{ width: `${(mediumObs / totalObservations) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Observation Status */}
        <Card style={{ border: '1px solid var(--c-borPri)', borderRadius: 'var(--border-radius-700)' }}>
          <CardHeader>
            <CardTitle style={{ fontSize: '18px' }}>Observation Status</CardTitle>
            <CardDescription style={{ color: 'var(--c-texSec)', fontSize: '14px' }}>
              Current workflow distribution
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm">Pending MR</span>
              </div>
              <span className="text-sm">{pendingMR}</span>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm">MR Under Review</span>
              </div>
              <span className="text-sm">{mrUnderReview}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-sm">Referred Back</span>
              </div>
              <span className="text-sm">{referredBack}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm">Finalised</span>
              </div>
              <span className="text-sm">{finalised}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-500" />
                <span className="text-sm">Resolved</span>
              </div>
              <span className="text-sm">{resolved}</span>
            </div>
          </CardContent>
        </Card>

        {/* Process Areas */}
        <Card style={{ border: '1px solid var(--c-borPri)', borderRadius: 'var(--border-radius-700)' }}>
          <CardHeader>
            <CardTitle style={{ fontSize: '18px' }}>Process Areas</CardTitle>
            <CardDescription style={{ color: 'var(--c-texSec)', fontSize: '14px' }}>
              Top areas with observations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {processAreasList.map(([area, count]) => (
              <div key={area} className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{area}</span>
                  <span className="text-sm">{count}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-200">
                  <div 
                    className="h-2 rounded-full bg-blue-600" 
                    style={{ width: `${(count / maxProcessCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row - Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Audits */}
        <Card style={{ border: '1px solid var(--c-borPri)', borderRadius: 'var(--border-radius-700)' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle style={{ fontSize: '18px' }}>Recent Audits</CardTitle>
              <Button variant="ghost" size="sm" className="gap-1 text-xs" style={{ color: 'var(--c-texSec)' }}>
                View All
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
            <CardDescription style={{ color: 'var(--c-texSec)', fontSize: '14px' }}>
              Latest audit activities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockAudits.slice(0, 3).map(audit => (
              <div key={audit.id} className="space-y-2 pb-4 border-b last:border-b-0" style={{ borderColor: 'var(--c-borPri)' }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm">{audit.title}</h4>
                      {audit.isLocked ? (
                        <Badge variant="secondary" className="text-xs">Completed</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">In Progress</Badge>
                      )}
                    </div>
                    <p className="text-xs mb-2" style={{ color: 'var(--c-texSec)' }}>
                      {audit.plantName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--c-texSec)' }}>
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{audit.auditHead}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{audit.startDate}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ClipboardList className="h-3 w-3" />
                    <span>{mockObservations.filter(o => o.auditId === audit.id).length} obs</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Action Items Requiring Attention */}
        <Card style={{ border: '1px solid var(--c-borPri)', borderRadius: 'var(--border-radius-700)' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle style={{ fontSize: '18px' }}>Action Items Requiring Attention</CardTitle>
              <Button variant="ghost" size="sm" className="gap-1 text-xs" style={{ color: 'var(--c-texSec)' }}>
                View All
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
            <CardDescription style={{ color: 'var(--c-texSec)', fontSize: '14px' }}>
              Critical and high priority items
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockObservations
              .filter(o => o.status === 'open' || o.status === 'in_progress')
              .slice(0, 3)
              .map(obs => (
                <div key={obs.id} className="space-y-2 pb-4 border-b last:border-b-0" style={{ borderColor: 'var(--c-borPri)' }}>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm flex-1">
                      {obs.observationText}
                    </h4>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--c-texSec)' }}>
                    {obs.auditTitle} • {obs.plantName}
                  </p>
                  <div className="flex items-center gap-2">
                    {obs.riskLevel === 'critical' && (
                      <Badge variant="destructive" className="text-xs">Critical</Badge>
                    )}
                    {obs.riskLevel === 'high' && (
                      <Badge className="text-xs bg-orange-500">High</Badge>
                    )}
                    {obs.status === 'open' && (
                      <Badge variant="outline" className="text-xs">Open</Badge>
                    )}
                    {obs.status === 'in_progress' && (
                      <Badge variant="secondary" className="text-xs">In Progress</Badge>
                    )}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
