import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase';
import type { DocumentPipelineData, Business, Customer, Invoice, ApiResponse } from '../types/index';

// Initialize Firebase Functions
const functions = getFunctions(app);

/**
 * Generic function caller for Firebase Functions
 */
export async function callFunction(functionName: string, data: any = {}): Promise<any> {
  try {
    const callable = httpsCallable(functions, functionName);
    const result = await callable(data);
    return result.data;
  } catch (error) {
    console.error(`Error calling function ${functionName}:`, error);
    throw error;
  }
}

/**
 * Business Profile APIs
 */
export async function getBusinessProfile(userId: string): Promise<ApiResponse<Business>> {
  try {
    return await callFunction('getBusinessProfile', { userId });
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get business profile' 
    };
  }
}

export async function updateBusinessProfile(userId: string, business: Partial<Business>): Promise<ApiResponse<Business>> {
  try {
    return await callFunction('updateBusinessProfile', { userId, business });
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update business profile' 
    };
  }
}

/**
 * Document Management APIs
 */
export async function getDocuments(userId: string, options?: {
  limit?: number;
  status?: string;
  businessId?: string;
}): Promise<ApiResponse<DocumentPipelineData[]>> {
  try {
    return await callFunction('getDocuments', { userId, ...options });
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get documents' 
    };
  }
}

export async function createDocument(userId: string, document: Partial<DocumentPipelineData>): Promise<ApiResponse<DocumentPipelineData>> {
  try {
    return await callFunction('createDocument', { userId, document });
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create document' 
    };
  }
}

export async function updateDocument(userId: string, documentId: string, updates: Partial<DocumentPipelineData>): Promise<ApiResponse<DocumentPipelineData>> {
  try {
    return await callFunction('updateDocument', { userId, documentId, updates });
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update document' 
    };
  }
}

/**
 * Document Delivery APIs (LINE integration)
 */
export async function sendDocumentViaLine(userId: string, documentId: string, options?: {
  recipientLineId?: string;
  message?: string;
  attachments?: string[];
}): Promise<ApiResponse<{ messageId: string; status: string }>> {
  try {
    return await callFunction('sendDocumentViaLine', { userId, documentId, ...options });
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send document via LINE' 
    };
  }
}

export async function getDeliveryStatus(userId: string, messageId: string): Promise<ApiResponse<{ 
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  errorMessage?: string;
}>> {
  try {
    return await callFunction('getDeliveryStatus', { userId, messageId });
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get delivery status' 
    };
  }
}

/**
 * Customer Management APIs
 */
export async function getCustomers(userId: string, businessId?: string): Promise<ApiResponse<Customer[]>> {
  try {
    return await callFunction('getCustomers', { userId, businessId });
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get customers' 
    };
  }
}

export async function createCustomer(userId: string, customer: Partial<Customer>): Promise<ApiResponse<Customer>> {
  try {
    return await callFunction('createCustomer', { userId, customer });
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create customer' 
    };
  }
}

/**
 * Invoice APIs
 */
export async function getInvoices(userId: string, options?: {
  businessId?: string;
  status?: string;
  limit?: number;
}): Promise<ApiResponse<Invoice[]>> {
  try {
    return await callFunction('getInvoices', { userId, ...options });
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get invoices' 
    };
  }
}

export async function createInvoice(userId: string, invoice: Partial<Invoice>): Promise<ApiResponse<Invoice>> {
  try {
    return await callFunction('createInvoice', { userId, invoice });
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create invoice' 
    };
  }
}

/**
 * Dashboard Analytics APIs
 */
export async function getDashboardStats(userId: string, businessId?: string): Promise<ApiResponse<{
  totalDocuments: number;
  totalCustomers: number;
  totalRevenue: number;
  recentDocuments: DocumentPipelineData[];
  pendingPayments: number;
  monthlyStats: {
    month: string;
    documents: number;
    revenue: number;
  }[];
}>> {
  try {
    return await callFunction('getDashboardStats', { userId, businessId });
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get dashboard stats' 
    };
  }
}
