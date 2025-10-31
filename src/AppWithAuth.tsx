import { useState, useEffect, useRef } from "react";
import { supabase } from "./utils/supabase/client";
import { LoginPage } from "./components/LoginPage";
import { Dashboard } from "./components/Dashboard";
import { CustomersPage } from "./pages/CustomersPage";
import { HistoryPage } from "./pages/HistoryPage";
import { ReportsPageEnhanced as ReportsPage } from "./pages/ReportsPageEnhanced";
import { PartnersPage } from "./pages/PartnersPage";
import { ProfilePage } from "./pages/ProfilePage";
import { MembershipPage } from "./pages/MembershipPage";
import { TaxManagementPage } from "./pages/TaxManagementPage";
import { ContactPage } from "./pages/ContactPage";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage";
import { TermsOfServicePage } from "./pages/TermsOfServicePage";
import { UserGuidePage } from "./pages/UserGuidePage";
import { NavigationMenu } from "./components/NavigationMenu";
import AppWorkflow from "./AppWorkflow";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner@2.0.3";
import { cleanupOldDemoSessions } from "./utils/demoStorage";
import { 
  setApiUserId, 
  clearUserLocalStorage,
  getUserLocalStorage,
  setUserLocalStorage,
  removeUserLocalStorage,
  api // 🔥 Import api directly instead of dynamic import
} from "./utils/api"; // 🔒 Import user-specific localStorage helpers
import type { User } from "@supabase/supabase-js";
import { log } from "./utils/logger";

// 🔒 GUARD: Track warmed users to prevent duplicate warmup (one per user globally)
const warmedUsers = new Set<string>();

type View = 
  | 'login' 
  | 'dashboard' 
  | 'customers' 
  | 'history' 
  | 'reports' 
  | 'partners'
  | 'tax-management'
  | 'profile'
  | 'membership'
  | 'boq'
  | 'contact'
  | 'privacy'
  | 'terms'
  | 'guide';

function AppWithAuth() {
  const [view, setView] = useState<View>('login');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingDocument, setEditingDocument] = useState<any>(null);
  
  // 🔒 Warmup control refs
  const inProgressRef = useRef(false);

  // 🔒 FIX: Persist view state with user-specific key
  useEffect(() => {
    if (view !== 'login' && user) {
      setUserLocalStorage('last-view', view);
    }
  }, [view, user]);

  // 🔒 NEW: Storage event listener for cross-tab sync
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // 🔒 SECURITY: Handle cross-tab logout synchronization
      if (e.key === 'logout-signal' && e.newValue) {
        log.debug('🔄 Logout detected in another tab - syncing...');
        // Force reload to login page
        window.location.assign(window.location.origin);
      }
      
      // Handle demo mode logout
      if (e.key === 'demo-mode' && e.oldValue === 'true' && e.newValue === null) {
        log.debug('🔄 Demo mode ended in another tab - syncing...');
        window.location.assign(window.location.origin);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    log.debug('🚀 AppWithAuth initializing...');
    
    // Clean up old demo sessions (older than 7 days)
    cleanupOldDemoSessions();
    
    // 🔒 SECURITY FIX: Check for Demo Mode with user-specific keys
    // Demo mode uses global keys for session management (before user exists)
    const isDemoMode = localStorage.getItem('demo-mode') === 'true';
    const demoUserStr = localStorage.getItem('demo-user');
    const demoSessionId = localStorage.getItem('demo-session-id');
    
    log.debug('🔍 Demo Mode Check:', {
      isDemoMode,
      hasDemoUser: !!demoUserStr,
      hasDemoSession: !!demoSessionId,
    });
    
    if (isDemoMode && demoUserStr) {
      try {
        const demoUser = JSON.parse(demoUserStr);
        log.debug('✅ Demo Mode Active');
        log.debug('👤 Demo User loaded');
        
        setUser(demoUser as any);
        
        // 🔒 CRITICAL: Set user ID for cache isolation FIRST!
        setApiUserId(demoUser.id);
        
        // 🔥 THEN start aggressive cache warmup (now with userId set)
        // ✅ Guard: Only warmup once per user
        if (!warmedUsers.has(demoUser.id) && !inProgressRef.current) {
          inProgressRef.current = true;
          api.cache.warmup().finally(() => {
            inProgressRef.current = false;
            warmedUsers.add(demoUser.id);
          });
        }
        
        // 🔒 FIX: Restore last view with user-specific key
        const lastView = getUserLocalStorage('last-view') as View;
        const restoredView = (lastView && lastView !== 'login') ? lastView : 'dashboard';
        setView(restoredView);
        setLoading(false);
        
        log.debug('✅ Demo Mode initialized successfully!');
        log.debug('📍 State updated:', { user: 'set', view: restoredView, loading: false });
        return; // Skip Supabase auth
      } catch (error) {
        log.error('❌ Demo mode error:', error);
        // 🔒 Clear global demo keys on error
        localStorage.removeItem('demo-mode');
        localStorage.removeItem('demo-user');
        localStorage.removeItem('demo-session-id');
      }
    } else {
      log.debug('ℹ️ Not in Demo Mode, checking Supabase auth...');
    }

    // Use singleton supabase instance

    // Check active session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        log.error('❌ Error getting session:', error);
        setUser(null);
        setApiUserId(null);
        setLoading(false);
        return;
      }
      
      if (session?.access_token) {
        // Validate JWT structure
        const jwtParts = session.access_token.split('.');
        if (jwtParts.length !== 3) {
          log.error('🚨 Invalid JWT structure in session!');
          setUser(null);
          setApiUserId(null);
          setLoading(false);
          return;
        }
        
        // Log token info for debugging
        log.debug('📝 Session token info:', {
          hasUser: !!session.user,
          userId: session.user?.id,
          tokenLength: session.access_token.length,
          jwtParts: jwtParts.length
        });
      }
      
      setUser(session?.user ?? null);
      
      // 🔒 CRITICAL: Set user ID for cache isolation!
      if (session?.user) {
        setApiUserId(session.user.id);
        
        // 🔥 Start aggressive cache warmup (now with userId set)
        // ✅ Guard: Only warmup once per user
        if (!warmedUsers.has(session.user.id) && !inProgressRef.current) {
          inProgressRef.current = true;
          setTimeout(() => {
            api.cache.warmup().finally(() => {
              inProgressRef.current = false;
              warmedUsers.add(session.user.id);
            });
          }, 100);
        }
        
        // 🔒 FIX: Restore last view with user-specific key
        const lastView = getUserLocalStorage('last-view') as View;
        const restoredView = (lastView && lastView !== 'login') ? lastView : 'dashboard';
        setView(restoredView);
      } else {
        setApiUserId(null); // Clear cache on no session
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      log.debug('🔐 Auth state changed:', event);
      
      // Handle token refresh
      if (event === 'TOKEN_REFRESHED') {
        log.debug('🔄 Token refreshed successfully');
      }
      
      // Handle signed out
      if (event === 'SIGNED_OUT') {
        log.debug('🚪 User signed out');
        clearUserLocalStorage();
        setUser(null);
        setApiUserId(null);
        setView('login');
        return;
      }
      
      if (session?.access_token) {
        // Validate JWT structure
        const jwtParts = session.access_token.split('.');
        if (jwtParts.length !== 3) {
          log.error('🚨 Invalid JWT structure in auth change!');
          setUser(null);
          setApiUserId(null);
          return;
        }
        
        log.debug('📝 New session token info:', {
          event,
          hasUser: !!session.user,
          userId: session.user?.id,
          tokenLength: session.access_token.length
        });
      }
      
      setUser(session?.user ?? null);
      
      // 🔒 CRITICAL: Set user ID for cache isolation!
      if (session?.user) {
        setApiUserId(session.user.id);
        
        // 🔥 Start aggressive cache warmup (now with userId set)
        // ✅ Guard: Only warmup once per user
        if (!warmedUsers.has(session.user.id) && !inProgressRef.current) {
          inProgressRef.current = true;
          setTimeout(() => {
            api.cache.warmup().finally(() => {
              inProgressRef.current = false;
              warmedUsers.add(session.user.id);
            });
          }, 100);
        }
        
        // 🔒 FIX: Restore last view with user-specific key
        const lastView = getUserLocalStorage('last-view') as View;
        const restoredView = (lastView && lastView !== 'login') ? lastView : 'dashboard'
        setView(restoredView);
      } else {
        setApiUserId(null); // Clear cache on logout
        setView('login');
      }
    });

    return () => subscription.unsubscribe();
  }, []); // Empty deps array is correct here - only run on mount

  const handleLogout = async () => {
    // 🔒 CRITICAL: Store userId before clearing
    const userId = user?.id;
    
    // 🔒 SECURITY: Signal logout to ALL tabs immediately
    localStorage.setItem('logout-signal', Date.now().toString());
    setTimeout(() => localStorage.removeItem('logout-signal'), 1000);
    
    // 🔒 CRITICAL: Clear cache for outgoing user!
    setApiUserId(null);
    clearUserLocalStorage(); // 🔒 Clear ALL localStorage for this user!
    
    // Check if in demo mode
    const isDemoMode = localStorage.getItem('demo-mode') === 'true';
    
    if (isDemoMode) {
      log.debug('🚪 Logging out of Demo Mode...');
      
      // Clear demo mode and session data
      const sessionId = localStorage.getItem('demo-session-id');
      
      // Remove all demo session data
      if (sessionId) {
        const prefix = `demo-${sessionId}-`;
        const keysToRemove: string[] = [];
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(prefix)) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        log.debug(`🧹 Cleaned up ${keysToRemove.length} demo data item(s)`);
      }
      
      // 🔒 Clear global demo mode flags (these are intentionally global)
      localStorage.removeItem('demo-mode');
      localStorage.removeItem('demo-user');
      localStorage.removeItem('demo-session-id');
      
      log.debug('✅ Demo Mode cleared successfully');
      
      // Reset state and redirect to login WITHOUT reload
      setUser(null);
      setView('login');
      setEditingDocument(null);
      
      log.debug('✅ Redirected to login page');
    } else {
      // Normal Supabase logout
      log.debug('🚪 Logging out of Supabase...');
      
      // 🔒 Clear all cached data before logout
      clearUserLocalStorage();
      log.debug('🗑️ Cleared all user-specific cache');
      
      await supabase.auth.signOut();
      setUser(null);
      setView('login');
      setEditingDocument(null);
      log.debug('✅ Logged out successfully');
    }
  };

  const handleStartBOQ = () => {
    setEditingDocument(null);
    setView('boq');
  };

  const handleStartBOQForPartner = (partnerId: string, partnerName: string) => {
    // Create a special document for partner
    setEditingDocument({
      isPartnerBOQ: true,
      partnerId,
      partnerName,
    });
    setView('boq');
  };

  const handleEditDocument = (document: any) => {
    setEditingDocument(document);
    setView('boq');
  };

  const handleBackToDashboard = () => {
    setEditingDocument(null);
    setView('dashboard');
  };

  const handleNavigate = (newView: View) => {
    setView(newView);
  };

  const handleOpenProfile = () => {
    setView('profile');
  };

  const handleOpenMembership = () => {
    setView('membership');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-muted-foreground">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  // Handle Demo Mode Login
  const handleDemoLogin = () => {
    log.debug('🎯 Demo Login Handler called from LoginPage');
    
    try {
      // Generate unique session ID
      const sessionId = `demo-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      // Create demo user
      const demoUser = {
        id: sessionId,
        email: 'demo@ezboq.com',
        user_metadata: {
          name: 'ผู้ใช้ทดลอง'
        }
      };
      
      // 🔒 SECURITY: Save to global localStorage (demo mode only)
      // These are intentionally global since they exist before user is authenticated
      localStorage.setItem('demo-mode', 'true');
      localStorage.setItem('demo-session-id', sessionId);
      localStorage.setItem('demo-user', JSON.stringify(demoUser));
      
      log.debug('✅ Demo Mode data saved:', { sessionId, demoUser });
      
      // 🔒 CRITICAL: Set user ID for cache isolation!
      setApiUserId(sessionId);
      
      // Update state directly - NO RELOAD!
      setUser(demoUser as any);
      setView('dashboard');
      setLoading(false);
      
      // 🔥 Start cache warmup AFTER userId is set
      setTimeout(() => {
        api.cache.warmup();
      }, 100);
      
      // Show success message
      toast.success('เข้าสู่ระบบ Demo สำเร็จ', {
        description: 'คุณสามารถเริ่มต้นใช้งานได้ทันที'
      });
      
      log.debug('✅ State updated - Demo Mode active!');
      log.debug('📍 Current state:', {
        user: demoUser.email,
        view: 'dashboard',
        loading: false
      });
    } catch (error) {
      log.error('❌ Error in handleDemoLogin:', error);
      toast.error('เกิดข้อผิดพลาดในการเข้าสู่ระบบ Demo', {
        description: 'กรุณาลองใหม่อีกครั้ง'
      });
    }
  };

  // Debug logging
  log.debug('🖥️ AppWithAuth render:', { view, hasUser: !!user, loading });

  return (
    <>
      <Toaster position="top-right" />
      {view === 'login' && <LoginPage onDemoLogin={handleDemoLogin} />}
      
      {/* Main App Views with Navigation */}
      {(view === 'dashboard' || view === 'customers' || view === 'history' || view === 'reports' || view === 'partners' || view === 'tax-management') && (
        <div key={`${user?.id || 'anon'}-${view}`}>
          <NavigationMenu
            user={user}
            currentView={view}
            onNavigate={handleNavigate}
            onStartBOQ={handleStartBOQ}
            onOpenProfile={handleOpenProfile}
            onOpenMembership={handleOpenMembership}
            onLogout={handleLogout}
          />
          {view === 'dashboard' && user && (
            <Dashboard 
              onLogout={handleLogout} 
              onStartBOQ={handleStartBOQ}
              onOpenProfile={handleOpenProfile}
              onOpenCustomers={() => setView('customers')}
              onOpenPartners={() => setView('partners')}
              onOpenHistory={() => setView('history')}
              user={user}
            />
          )}
          {view === 'dashboard' && !user && (
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <p className="text-red-600 mb-4">⚠️ Session หมดอายุ</p>
                <button 
                  onClick={handleLogout}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  กลับไปหน้า Login
                </button>
              </div>
            </div>
          )}
          {view === 'customers' && (
            <CustomersPage onBack={() => setView('dashboard')} />
          )}
          {view === 'partners' && (
            <PartnersPage 
              onBack={() => setView('dashboard')} 
              onCreateBOQForPartner={handleStartBOQForPartner}
            />
          )}
          {view === 'history' && (
            <HistoryPage 
              onBack={() => setView('dashboard')} 
              onEditDocument={handleEditDocument}
            />
          )}
          {view === 'reports' && (
            <ReportsPage onBack={() => setView('dashboard')} />
          )}
          {view === 'tax-management' && (
            <TaxManagementPage onBack={() => setView('dashboard')} />
          )}
        </div>
      )}

      {/* Profile Page */}
      {view === 'profile' && (
        <ProfilePage 
          onBack={handleBackToDashboard} 
          onNavigateToMembership={handleOpenMembership}
          user={user} 
        />
      )}

      {/* Membership Page */}
      {view === 'membership' && (
        <MembershipPage onBack={handleBackToDashboard} user={user} />
      )}

      {/* Contact Page */}
      {view === 'contact' && (
        <ContactPage onBack={handleBackToDashboard} />
      )}

      {/* Privacy Policy Page */}
      {view === 'privacy' && (
        <PrivacyPolicyPage onBack={handleBackToDashboard} />
      )}

      {/* Terms of Service Page */}
      {view === 'terms' && (
        <TermsOfServicePage onBack={handleBackToDashboard} />
      )}

      {/* User Guide Page */}
      {view === 'guide' && (
        <UserGuidePage onBack={handleBackToDashboard} />
      )}

      {/* BOQ Workflow */}
      {view === 'boq' && (
        <div>
          <div className="print:hidden">
            <div className="bg-white border-b px-6 py-3 flex justify-between items-center">
              <button 
                onClick={handleBackToDashboard}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                ← กลับไป Dashboard{editingDocument && ' (กำลังแก้ไข)'}
              </button>
              <button 
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground text-sm font-medium"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
          <AppWorkflow 
            user={user} 
            editingDocument={editingDocument}
            onNavigate={(newView) => {
              setView(newView as View);
              setEditingDocument(null);
            }}
          />
        </div>
      )}
    </>
  );
}

export default AppWithAuth;