import React from 'react';
import { ExternalDataSourcesModal } from './ExternalDataSourcesModal';

export interface AnalyticsSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeMetricKey?: 'traffic' | 'impressions' | 'visibility' | 'demographics' | 'roi_cpm';
}

export const AnalyticsSourceModal: React.FC<AnalyticsSourceModalProps> = ({
  isOpen,
  onClose,
  activeMetricKey
}) => {
  const mapMetricToCategory = (key?: string) => {
    switch (key) {
      case 'traffic':
        return 'traffic';
      case 'impressions':
        return 'standards';
      case 'visibility':
        return 'survey_logs';
      case 'demographics':
        return 'demographics';
      case 'roi_cpm':
        return 'pricing';
      default:
        return 'all';
    }
  };

  const mapMetricToSourceId = (key?: string) => {
    switch (key) {
      case 'traffic':
        return 'traffic-api-dishub';
      case 'impressions':
        return 'global-woo-esomar';
      case 'visibility':
        return 'internal-survey-logs';
      case 'demographics':
        return 'bps-demographics';
      case 'roi_cpm':
        return 'amri-p3i-pricing';
      default:
        return undefined;
    }
  };

  return (
    <ExternalDataSourcesModal
      isOpen={isOpen}
      onClose={onClose}
      initialCategory={mapMetricToCategory(activeMetricKey)}
      initialSourceId={mapMetricToSourceId(activeMetricKey)}
    />
  );
};
