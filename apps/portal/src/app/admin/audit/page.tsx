'use client';

import { useCallback, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface AuditLog {
  id: string;
  event: 'link' | 'relink' | 'unlink';
  lineUserId: string;
  uid: string;
  timestamp: { _seconds: number; _nanoseconds: number };
  traceId?: string;
  metadata?: {
    linkMethod?: string;
    unlinkMethod?: string;
    isRelink?: boolean;
  };
}

interface Pagination {
  total: number;
  page: number;
  perPage: number;
  hasNext: boolean;
}

export default function AdminAuditPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    event: '',
    uid: '',
    lineUserId: '',
  });
  const [isAuthed, setIsAuthed] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const user = auth.currentUser;
      if (!user) {
        setError('Not signed in');
        return;
      }

      const token = await user.getIdToken();
      const functionsUrl = process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL || '';

      // Build query params
      const params = new URLSearchParams({
        page: page.toString(),
        perPage: '20',
      });

      if (filters.event) params.append('event', filters.event);
      if (filters.uid) params.append('uid', filters.uid);
      if (filters.lineUserId) params.append('lineUserId', filters.lineUserId);

      const res = await fetch(`${functionsUrl}/adminAuditLogs?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 403) {
          setLogs([]);
          setPagination(null);
          throw new Error('บัญชีนี้ไม่มีสิทธิ์ admin');
        }
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setLogs(data.logs || []);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthed(true);
      } else {
        setIsAuthed(false);
        setLoading(false);
        setError('Please sign in to view audit logs');
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isAuthed) {
      fetchLogs();
    }
  }, [isAuthed, fetchLogs]);

  const formatTimestamp = (timestamp: { _seconds: number; _nanoseconds: number }) => {
    const date = new Date(timestamp._seconds * 1000);
    return date.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getEventColor = (event: string) => {
    switch (event) {
      case 'link':
        return 'bg-green-100 text-green-800';
      case 'relink':
        return 'bg-blue-100 text-blue-800';
      case 'unlink':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const exportCSV = () => {
    const headers = ['Event', 'LINE User ID', 'Firebase UID', 'Timestamp', 'Trace ID', 'Method'];
    const rows = logs.map(log => [
      log.event,
      log.lineUserId,
      log.uid,
      formatTimestamp(log.timestamp),
      log.traceId || '',
      log.metadata?.linkMethod || log.metadata?.unlinkMethod || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${Date.now()}.csv`;
    a.click();
  };

  if (!auth.currentUser && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Admin - Audit Logs
          </h1>
          <p className="text-gray-600 mb-6">
            Please sign in with your admin account to view audit logs
          </p>
          <button
            onClick={() => window.location.href = 'https://doc.ezboq.com/liff/link'}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900">
                📋 Audit Logs - LINE Account Linking
              </h1>
              <button
                onClick={exportCSV}
                disabled={logs.length === 0}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                📥 Export CSV
              </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Type
                </label>
                <select
                  value={filters.event}
                  onChange={(e) => {
                    setFilters({ ...filters, event: e.target.value });
                    setPage(1);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">All Events</option>
                  <option value="link">Link</option>
                  <option value="relink">Relink</option>
                  <option value="unlink">Unlink</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Firebase UID
                </label>
                <input
                  type="text"
                  value={filters.uid}
                  onChange={(e) => {
                    setFilters({ ...filters, uid: e.target.value });
                    setPage(1);
                  }}
                  placeholder="Filter by UID..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  LINE User ID
                </label>
                <input
                  type="text"
                  value={filters.lineUserId}
                  onChange={(e) => {
                    setFilters({ ...filters, lineUserId: e.target.value });
                    setPage(1);
                  }}
                  placeholder="Filter by LINE User ID..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="p-6 bg-red-50 border-l-4 border-red-500">
              <p className="text-red-800">❌ {error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading audit logs...</p>
            </div>
          )}

          {/* Logs Table */}
          {!loading && !error && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Event
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        LINE User ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Firebase UID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Method
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trace ID
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                          No audit logs found
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEventColor(log.event)}`}>
                              {log.event.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                            {log.lineUserId.substring(0, 15)}...
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                            {log.uid.substring(0, 12)}...
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatTimestamp(log.timestamp)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {log.metadata?.linkMethod || log.metadata?.unlinkMethod || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                            {log.traceId ? `${log.traceId.substring(0, 8)}...` : 'N/A'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.total > 0 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing page <strong>{pagination.page}</strong> of{' '}
                    <strong>{Math.ceil(pagination.total / pagination.perPage)}</strong>
                    {' '}(<strong>{pagination.total}</strong> total logs)
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={!pagination.hasNext}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
