/**
 * API Connection Test Utility
 * 
 * Use this in browser console to diagnose API connection issues
 */

import { projectId, publicAnonKey } from './supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3`;

/**
 * Run comprehensive API diagnostics
 */
export async function runApiDiagnostics() {
  console.log('🔬 Starting API Diagnostics...');
  console.log('='.repeat(60));
  console.log('');
  
  // 1. Configuration Check
  console.log('📋 Configuration Check');
  console.log('  Project ID:', projectId);
  console.log('  API Base:', API_BASE);
  console.log('  Anon Key length:', publicAnonKey?.length, 'chars');
  console.log('  Origin:', window.location.origin);
  console.log('');
  
  // 2. Test Health Endpoint (no auth)
  console.log('🏥 Testing Health Endpoint (no auth required)...');
  try {
    const healthResponse = await fetch(`${API_BASE}/health`);
    console.log('  ✅ Health endpoint:', healthResponse.status, healthResponse.statusText);
    const healthData = await healthResponse.json();
    console.log('  Response:', healthData);
  } catch (err: any) {
    console.log('  ❌ Health endpoint failed:', err.message);
  }
  console.log('');
  
  // 3. Test Version Endpoint (no auth)
  console.log('📦 Testing Version Endpoint (no auth required)...');
  try {
    const versionResponse = await fetch(`${API_BASE}/version`);
    console.log('  ✅ Version endpoint:', versionResponse.status, versionResponse.statusText);
    const versionData = await versionResponse.json();
    console.log('  Response:', versionData);
  } catch (err: any) {
    console.log('  ❌ Version endpoint failed:', err.message);
  }
  console.log('');
  
  // 4. Test OPTIONS (CORS preflight)
  console.log('🔀 Testing CORS Preflight (OPTIONS)...');
  try {
    const optionsResponse = await fetch(`${API_BASE}/customers`, {
      method: 'OPTIONS',
      headers: {
        'Origin': window.location.origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type,Authorization,apikey'
      }
    });
    console.log('  ✅ OPTIONS request:', optionsResponse.status, optionsResponse.statusText);
    console.log('  CORS Headers:');
    console.log('    Allow-Origin:', optionsResponse.headers.get('Access-Control-Allow-Origin'));
    console.log('    Allow-Methods:', optionsResponse.headers.get('Access-Control-Allow-Methods'));
    console.log('    Allow-Headers:', optionsResponse.headers.get('Access-Control-Allow-Headers'));
  } catch (err: any) {
    console.log('  ❌ OPTIONS request failed:', err.message);
  }
  console.log('');
  
  // 5. Test Authenticated Endpoint
  console.log('🔐 Testing Authenticated Endpoint (GET /customers)...');
  try {
    const customersResponse = await fetch(`${API_BASE}/customers`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'apikey': publicAnonKey,
        'Content-Type': 'application/json'
      }
    });
    console.log('  ✅ Customers endpoint:', customersResponse.status, customersResponse.statusText);
    
    if (customersResponse.ok) {
      const customersData = await customersResponse.json();
      console.log('  Response:', customersData);
    } else {
      const errorText = await customersResponse.text();
      console.log('  Error:', errorText);
    }
  } catch (err: any) {
    console.log('  ❌ Customers endpoint failed:', err.message);
    console.log('  This usually means:');
    console.log('    - CORS is blocking the request');
    console.log('    - Edge Function is not deployed');
    console.log('    - Network connectivity issue');
  }
  console.log('');
  
  // 6. Summary
  console.log('='.repeat(60));
  console.log('📊 Diagnostic Summary');
  console.log('');
  console.log('If all tests passed (✅), your API is working correctly.');
  console.log('');
  console.log('If tests failed (❌):');
  console.log('  1. Check Supabase Dashboard → Edge Functions');
  console.log('  2. Verify "make-server-6e95bca3" is deployed');
  console.log('  3. Check function logs for errors');
  console.log('  4. Review CORS settings in middleware.ts');
  console.log('');
  console.log('For more help, see:');
  console.log('  - ERROR_FIX_SUMMARY.md');
  console.log('  - DEBUG_API.md');
  console.log('='.repeat(60));
}

/**
 * Quick connection test
 */
export async function quickTest(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Test specific endpoint
 */
export async function testEndpoint(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  console.log('🧪 Testing:', url);
  console.log('Method:', options.method || 'GET');
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'apikey': publicAnonKey,
        ...(options.headers || {})
      }
    });
    
    console.log('✅ Response:', response.status, response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      try {
        const data = await response.json();
        console.log('Data:', data);
        return { success: true, data, response };
      } catch {
        const text = await response.text();
        console.log('Text:', text);
        return { success: true, data: text, response };
      }
    } else {
      const error = await response.text();
      console.log('❌ Error:', error);
      return { success: false, error, response };
    }
  } catch (err: any) {
    console.error('❌ Request failed:', err.message);
    return { success: false, error: err.message };
  }
}

// Export for browser console
if (typeof window !== 'undefined') {
  (window as any).apiTest = {
    runDiagnostics: runApiDiagnostics,
    quickTest: quickTest,
    testEndpoint: testEndpoint,
  };
  
  console.log('💡 API Test utilities loaded!');
  console.log('   Run: apiTest.runDiagnostics()');
  console.log('   Or:  apiTest.testEndpoint("/customers")');
}
