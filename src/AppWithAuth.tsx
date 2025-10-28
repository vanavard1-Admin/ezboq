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
import { NavigationMenu } from "./components/NavigationMenu";
import AppWorkflow from "./AppWorkflow";
import { Toaster } from "./components/ui/sonner";
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
  | 'boq';

function AppWithAuth() {
  const [view, setView] = useState<View>('login');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingDocument, setEditingDocument] = useState<any>(null);

  useEffect(() => {
    // Use singleton supabase instance

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setView('dashboard');
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setView('dashboard');
      } else {
        setView('login');
      }
    });

    return () => subscription.unsubscribe();
  }, []); // Empty deps array is correct here - only run on mount

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setView('login');
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

  const handleNavigate = (newView: 'dashboard' | 'customers' | 'history' | 'reports' | 'partners' | 'tax-management') => {
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

  return (
    <>
      <Toaster position="top-right" />
      {view === 'login' && <LoginPage />}
      
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
          {view === 'dashboard' && (
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
          <AppWorkflow user={user} editingDocument={editingDocument} />
        </div>
      )}
    </>
  );
}

export default AppWithAuth;
