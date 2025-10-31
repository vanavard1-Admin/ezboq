import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { cleanupOldDemoSessions } from "./utils/demoStorage";
import type { User } from "@supabase/supabase-js";

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

  // Persist view state
  useEffect(() => {
    if (view !== 'login' && user) {
      localStorage.setItem('last-view', view);
    }
  }, [view, user]);

  useEffect(() => {
    console.log('🚀 AppWithAuth useEffect starting...');
    
    // Clean up old demo sessions (older than 7 days)
    cleanupOldDemoSessions();
    
    // 🔥 Start aggressive cache warmup in background (instant, no delay!)
    import('./utils/api').then(({ api }) => {
      // Start warmup immediately (bypass 1s delay)
      console.log('🚀 Starting aggressive cache warmup...');
      api.cache.warmup();
    });

    // Check for Demo Mode first
    const isDemoMode = localStorage.getItem('demo-mode') === 'true';
    const demoUserStr = localStorage.getItem('demo-user');
    const demoSessionId = localStorage.getItem('demo-session-id');
    
    console.log('🔍 Demo Mode Check:', {
      isDemoMode,
      hasDemoUser: !!demoUserStr,
      hasSessionId: !!demoSessionId
    });
    
    if (isDemoMode && demoUserStr && demoSessionId) {
      try {
        const demoUser = JSON.parse(demoUserStr);
        console.log('✅ Demo Mode Active - Session:', demoSessionId);
        console.log('👤 Demo User:', demoUser);
        
        setUser(demoUser as any);
        
        // Restore last view or default to dashboard
        const lastView = localStorage.getItem('last-view') as View;
        const restoredView = (lastView && lastView !== 'login') ? lastView : 'dashboard';
        setView(restoredView);
        setLoading(false);
        
        console.log('✅ Demo Mode initialized successfully!');
        console.log('📍 State updated:', { user: 'set', view: restoredView, loading: false });
        return; // Skip Supabase auth
      } catch (error) {
        console.error('❌ Demo mode error:', error);
        localStorage.removeItem('demo-mode');
        localStorage.removeItem('demo-user');
        localStorage.removeItem('demo-session-id');
      }
    } else {
      console.log('ℹ️ Not in Demo Mode, checking Supabase auth...');
    }

    // Use singleton supabase instance

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Restore last view or default to dashboard
        const lastView = localStorage.getItem('last-view') as View;
        const restoredView = (lastView && lastView !== 'login') ? lastView : 'dashboard';
        setView(restoredView);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Restore last view or default to dashboard
        const lastView = localStorage.getItem('last-view') as View;
        const restoredView = (lastView && lastView !== 'login') ? lastView : 'dashboard';
        setView(restoredView);
      } else {
        setView('login');
      }
    });

    return () => subscription.unsubscribe();
  }, []); // Empty deps array is correct here - only run on mount

  const handleLogout = async () => {
    // Check if in demo mode
    const isDemoMode = localStorage.getItem('demo-mode') === 'true';
    
    if (isDemoMode) {
      console.log('🚪 Logging out of Demo Mode...');
      
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
        console.log(`🧹 Cleaned up ${keysToRemove.length} demo data item(s)`);
      }
      
      // Clear demo mode flags
      localStorage.removeItem('demo-mode');
      localStorage.removeItem('demo-user');
      localStorage.removeItem('demo-session-id');
      localStorage.removeItem('last-view');
      
      console.log('✅ Demo Mode cleared successfully');
      
      // Reset state and redirect to login WITHOUT reload
      setUser(null);
      setView('login');
      setEditingDocument(null);
      
      console.log('✅ Redirected to login page');
    } else {
      // Normal Supabase logout
      console.log('🚪 Logging out of Supabase...');
      await supabase.auth.signOut();
      localStorage.removeItem('last-view');
      setUser(null);
      setView('login');
      setEditingDocument(null);
      console.log('✅ Logged out successfully');
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
    console.log('🎯 Demo Login Handler called from LoginPage');
    
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
      
      // Save to localStorage
      localStorage.setItem('demo-mode', 'true');
      localStorage.setItem('demo-session-id', sessionId);
      localStorage.setItem('demo-user', JSON.stringify(demoUser));
      
      console.log('✅ Demo Mode data saved:', { sessionId, demoUser });
      
      // Update state directly - NO RELOAD!
      setUser(demoUser as any);
      setView('dashboard');
      setLoading(false);
      
      console.log('✅ State updated - Demo Mode active!');
      console.log('📍 Current state:', {
        user: demoUser.email,
        view: 'dashboard',
        loading: false
      });
    } catch (error) {
      console.error('❌ Error in handleDemoLogin:', error);
      toast.error('เกิดข้อผิดพลาดในการเข้าสู่ระบบ Demo', {
        description: 'กรุณาลองใหม่อีกครั้ง'
      });
    }
  };

  // Debug logging
  console.log('🖥️ AppWithAuth render:', { view, hasUser: !!user, loading });

  return (
    <>
      <Toaster position="top-right" />
      {view === 'login' && <LoginPage onDemoLogin={handleDemoLogin} />}
      
      {/* Main App Views with Navigation */}
      {(view === 'dashboard' || view === 'customers' || view === 'history' || view === 'reports' || view === 'partners' || view === 'tax-management') && (
        <div>
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