// Module-level current user ID for scoping localStorage keys per user.
// Must be set via setCurrentUserId() before any storage operations.

let _currentUserId: string | null = null;

export function setCurrentUserId(userId: string): void {
  _currentUserId = userId;
}

export function getCurrentUserId(): string | null {
  return _currentUserId;
}

/**
 * Returns a user-scoped localStorage key.
 * e.g. scopedKey('ezboq_projects') → 'ezboq_projects__u_abc123'
 */
export function scopedKey(baseKey: string): string {
  if (!_currentUserId) return baseKey;
  return `${baseKey}__u_${_currentUserId}`;
}
