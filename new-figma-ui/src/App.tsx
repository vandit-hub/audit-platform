import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppSidebar } from './components/AppSidebar';
import { AppHeader } from './components/AppHeader';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Plants } from './pages/Plants';
import { Audits } from './pages/Audits';
import { AuditDetails } from './pages/AuditDetails';
import { Observations } from './pages/Observations';
import { ObservationDetails } from './pages/ObservationDetails';
import { Checklists } from './pages/Checklists';
import { Reports } from './pages/Reports';
import { Admin } from './pages/Admin';
import { AIAssistant } from './pages/AIAssistant';
import { ImportSpec } from './pages/ImportSpec';
import { Toaster } from './components/ui/sonner';
import { SidebarProvider, SidebarInset } from './components/ui/sidebar';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [selectedObservationId, setSelectedObservationId] = useState<string | null>(null);

  if (!isAuthenticated) {
    return <Login />;
  }

  const handleNavigateToAudit = (auditId: string) => {
    setSelectedAuditId(auditId);
    setCurrentPage('audit-details');
  };

  const handleBackToAudits = () => {
    setSelectedAuditId(null);
    setCurrentPage('audits');
  };

  const handleNavigateToObservation = (observationId: string) => {
    setSelectedObservationId(observationId);
    setCurrentPage('observation-details');
  };

  const handleBackToObservations = () => {
    setSelectedObservationId(null);
    setCurrentPage('observations');
  };

  const getPageTitle = () => {
    switch (currentPage) {
      case 'dashboard':
        return 'Dashboard';
      case 'plants':
        return 'Plants';
      case 'audits':
        return 'Audits';
      case 'audit-details':
        return 'Audit Details';
      case 'observations':
        return 'Observations';
      case 'observation-details':
        return 'Observation Details';
      case 'checklists':
        return 'Checklists';
      case 'reports':
        return 'Reports';
      case 'admin':
        return 'Settings';
      case 'ai-assistant':
        return 'AI Assistant';
      case 'import-spec':
        return 'Import Spec';
      default:
        return 'Dashboard';
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'plants':
        return <Plants />;
      case 'audits':
        return <Audits onOpenAudit={handleNavigateToAudit} />;
      case 'audit-details':
        return selectedAuditId ? (
          <AuditDetails auditId={selectedAuditId} onBack={handleBackToAudits} />
        ) : (
          <Audits onOpenAudit={handleNavigateToAudit} />
        );
      case 'observations':
        return <Observations onViewObservation={handleNavigateToObservation} />;
      case 'observation-details':
        return selectedObservationId ? (
          <ObservationDetails observationId={selectedObservationId} onBack={handleBackToObservations} />
        ) : (
          <Observations onViewObservation={handleNavigateToObservation} />
        );
      case 'checklists':
        return <Checklists />;
      case 'reports':
        return <Reports />;
      case 'admin':
        return <Admin onNavigate={setCurrentPage} />;
      case 'ai-assistant':
        return <AIAssistant />;
      case 'import-spec':
        return <ImportSpec onNavigate={setCurrentPage} />;
      default:
        return <Dashboard />;
    }
  };

  const sidebarActivePage = 
    currentPage === 'audit-details' ? 'audits' : 
    currentPage === 'observation-details' ? 'observations' : 
    currentPage === 'import-spec' ? 'admin' :
    currentPage;

  return (
    <SidebarProvider>
      <AppSidebar currentPage={sidebarActivePage} onNavigate={setCurrentPage} />
      <SidebarInset className="min-w-0">
        <AppHeader title={getPageTitle()} />
        <div className="flex flex-1 flex-col min-w-0" style={{ background: 'var(--c-bacPri)' }}>
          {renderPage()}
        </div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
