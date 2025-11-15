import { Badge } from "./ui/v2/badge";

// Type definitions
type ObservationStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

interface StatusBadgeProps {
  status: ObservationStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusStyle = (status: ObservationStatus) => {
    const styles = {
      open: {
        background: 'var(--cl-palYel100)',
        color: 'var(--cd-palYel500)'
      },
      in_progress: {
        background: 'var(--ca-palUiBlu100)',
        color: 'var(--c-palUiBlu700)'
      },
      resolved: {
        background: 'var(--c-palUiGre100)',
        color: 'var(--c-palUiGre600)'
      },
      closed: {
        background: 'var(--c-palUiGre100)',
        color: 'var(--c-palUiGre600)'
      }
    };
    return styles[status] || styles.open;
  };

  const getStatusLabel = (status: ObservationStatus) => {
    const labels = {
      open: 'Pending Review',
      in_progress: 'In Progress',
      resolved: 'Completed',
      closed: 'Completed'
    };
    return labels[status] || status;
  };

  return (
    <Badge 
      style={{
        ...getStatusStyle(status),
        padding: '2px 8px',
        borderRadius: 'var(--border-radius-300)',
        fontSize: '12px',
        fontWeight: 500,
        border: 'none'
      }}
    >
      {getStatusLabel(status)}
    </Badge>
  );
}

interface RiskBadgeProps {
  level: RiskLevel;
}

export function RiskBadge({ level }: RiskBadgeProps) {
  const getRiskStyle = (level: RiskLevel) => {
    const styles = {
      critical: {
        background: 'var(--c-palUiRed100)',
        color: 'var(--c-palUiRed600)'
      },
      high: {
        background: 'var(--c-palUiRed100)',
        color: 'var(--c-palUiRed600)'
      },
      medium: {
        background: 'var(--cl-palYel100)',
        color: 'var(--cd-palYel500)'
      },
      low: {
        background: 'var(--c-palUiGre100)',
        color: 'var(--c-palUiGre600)'
      }
    };
    return styles[level];
  };

  const getRiskLabel = (level: RiskLevel) => {
    const labels = {
      critical: 'Critical',
      high: 'High',
      medium: 'Medium',
      low: 'Low'
    };
    return labels[level];
  };

  return (
    <Badge 
      style={{
        ...getRiskStyle(level),
        padding: '2px 8px',
        borderRadius: 'var(--border-radius-300)',
        fontSize: '12px',
        fontWeight: 500,
        border: 'none'
      }}
    >
      {getRiskLabel(level)}
    </Badge>
  );
}
