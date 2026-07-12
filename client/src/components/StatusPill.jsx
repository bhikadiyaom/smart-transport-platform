const dotPulseStatuses = ['on_trip', 'dispatched'];

export default function StatusPill({ status }) {
  const className = `status-${status?.replace(/ /g, '_')}` || 'badge bg-slate-700 text-slate-400';
  const labels = {
    available:  'Available',
    on_trip:    'On Trip',
    in_shop:    'In Shop',
    retired:    'Retired',
    suspended:  'Suspended',
    off_duty:   'Off Duty',
    draft:      'Draft',
    dispatched: 'Dispatched',
    completed:  'Completed',
    cancelled:  'Cancelled',
  };
  const shouldPulse = dotPulseStatuses.includes(status);
  return (
    <span className={className}>
      <span className={`status-dot ${shouldPulse ? 'status-dot-pulse' : ''}`} />
      {labels[status] || status}
    </span>
  );
}
