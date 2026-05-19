import React from 'react';
import ScheduleTimelineView from '../components/ScheduleTimelineView';
import TreatmentHeatmapView from '../components/TreatmentHeatmapView';
import TreatmentPlanPdfView from '../components/TreatmentPlanPdfView';
import SchedulingRulesEditor from '../components/SchedulingRulesEditor';

function CustomViewsPage() {
  return (
    <div data-testid="custom-views-page" style={{ padding: 24, background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, color: '#1e3a8a' }}>🦷 Practice Views</h1>
        <p style={{ margin: '6px 0 0 0', color: '#6b7280' }}>
          Visualisations and operational tools tailored for dental practice workflows.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 0 }}>
        <ScheduleTimelineView />
        <TreatmentHeatmapView />
        <TreatmentPlanPdfView />
        <SchedulingRulesEditor />
      </div>
    </div>
  );
}

export default CustomViewsPage;
