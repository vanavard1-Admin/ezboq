// Helper functions for Express request parameter handling

/**
 * Safely extract string parameter from Express request
 * req.params returns string | string[] but we usually want just string
 */
export function getStringParam(param: string | string[] | undefined): string {
  if (typeof param === 'string') return param;
  if (Array.isArray(param) && param.length > 0) return param[0];
  return '';
}

/**
 * Safely extract string from query parameter
 */
export function getStringQuery(query: string | string[] | undefined): string {
  if (typeof query === 'string') return query;
  if (Array.isArray(query) && query.length > 0) return query[0];
  return '';
}

/**
 * Safely extract array from query parameter
 */
export function getArrayQuery(query: string | string[] | undefined): string[] {
  if (typeof query === 'string') return [query];
  if (Array.isArray(query)) return query;
  return [];
}
