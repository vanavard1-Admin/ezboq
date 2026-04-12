/**
 * Monitoring Report Scheduled Function
 * 
 * Runs every 2 hours to collect and report system metrics.
 */

import { pubsub as pubsubV1 } from 'firebase-functions/v1';
import { collectMonitoringMetrics, formatMetricsReport, storeMetrics } from '../services/monitoringService';

/**
 * Monitoring report scheduled function
 * Runs every 2 hours
 */
export const monitoringReportScheduled = pubsubV1
  .schedule('every 2 hours')
  .timeZone('Asia/Bangkok')
  .onRun(async () => {
    try {
      console.log('[monitoringReport] Starting metrics collection...');
      
      const metrics = await collectMonitoringMetrics();
      
      // Store metrics for historical tracking
      await storeMetrics(metrics);
      
      // Format report
      const report = formatMetricsReport(metrics);
      
      // Log report (can be sent to Slack/Email later)
      console.log('[monitoringReport] Metrics collected:');
      console.log(report);
      
      // TODO: Send to CEO via LINE/Slack/Email
      // For now, just log - can be extended later
      
      return { success: true, metrics };
    } catch (error) {
      console.error('[monitoringReport] Error:', error);
      throw error;
    }
  });






