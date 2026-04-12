/**
 * Cloud Tasks Integration
 * Queue PDF generation jobs with retry and dead-letter handling
 */

import { CloudTasksClient } from '@google-cloud/tasks';
import { GoogleAuth } from 'google-auth-library';
import { PdfJobPayload } from '../shared/types';
import {
    getProjectId,
    getPdfServiceUrl,
    getPdfServiceAudience,
    getCloudTasksQueue,
    getCloudTasksLocation,
    getPdfServiceAccount,
} from '../shared/config';

let tasksClient: CloudTasksClient | null = null;

/**
 * Get or create Cloud Tasks client
 */
function getTasksClient(): CloudTasksClient {
    if (!tasksClient) {
        tasksClient = new CloudTasksClient();
    }
    return tasksClient;
}

/**
 * Enqueue a PDF generation job to Cloud Tasks
 * This is the production-ready way to trigger PDF generation
 */
export async function enqueuePdfJobWithTasks(
    payload: PdfJobPayload,
    taskId?: string
): Promise<string> {
    const pdfServiceUrl = getPdfServiceUrl();
    const pdfServiceAccount = getPdfServiceAccount();
    const projectId = getProjectId();
    const client = getTasksClient();

    const queuePath = client.queuePath(
        projectId,
        getCloudTasksLocation(),
        getCloudTasksQueue()
    );

    const task = {
        httpRequest: {
            httpMethod: 'POST' as const,
            url: pdfServiceUrl,
            headers: {
                'Content-Type': 'application/json',
            },
            body: Buffer.from(JSON.stringify(payload)).toString('base64'),
            // OIDC authentication for secure Cloud Run invocation
            oidcToken: {
                serviceAccountEmail: pdfServiceAccount,
                audience: getPdfServiceAudience() || pdfServiceUrl,
            },
        },
        // Retry configuration
        dispatchDeadline: {
            seconds: 1800, // 30 minutes max
        },
        name: undefined as string | undefined, // Allow name assignment
    };

    if (taskId) {
        task.name = `${queuePath}/tasks/${taskId}`;
    }

    const [response] = await client.createTask({
        parent: queuePath,
        task,
    });

    console.log(`Created PDF task: ${response.name}`);
    return response.name || '';
}

/**
 * Direct call to PDF service (MVP/development fallback)
 * Use this only when Cloud Tasks is not available
 */
export async function enqueuePdfJobDirect(
    payload: PdfJobPayload
): Promise<void> {
    const ok = await callPdfServiceWithAuth(payload);
    if (!ok) {
        throw new Error('PDF service call failed');
    }
}

/**
 * Get OIDC token for Cloud Run authentication
 * Use this when calling Cloud Run directly without Cloud Tasks
 */
export async function getOidcToken(audience: string): Promise<string> {
    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(audience);
    const headers = await client.getRequestHeaders();
    const token = headers['Authorization']?.replace('Bearer ', '');
    return token || '';
}

/**
 * Call PDF service with OIDC authentication
 * Production-ready direct call (when Cloud Tasks queue is full or for retry)
 */
export async function callPdfServiceWithAuth(
    payload: PdfJobPayload
): Promise<boolean> {
    try {
        const pdfServiceUrl = getPdfServiceUrl();
        const audience = getPdfServiceAudience() || pdfServiceUrl;
        const token = await getOidcToken(audience);

        const response = await fetch(pdfServiceUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('PDF service error:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('PDF service call failed:', error);
        return false;
    }
}
