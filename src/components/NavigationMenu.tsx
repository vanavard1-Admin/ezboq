import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  FileText,
  Users,
  History,
  BarChart3,
  LogOut,
  Plus,
  User as UserIcon,
  Crown,
  Settings,
  Handshake,
  ChevronDown,
  Calculator,
  Mail,
  Shield,
  BookOpen,
  FileCheck,
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { UserProfile, Membership } from '../types/boq';
import { api } from '../utils/api';

interface NavigationMenuProps {
  user: User | null;
  currentView: 'dashboard' | 'customers' | 'history' | 'reports' | 'partners' | 'tax-management';
  onNavigate: (view: 'dashboard' | 'customers' | 'history' | 'reports' | 'partners' | 'tax-management' | 'contact' | 'privacy' | 'terms' | 'guide') => void;
  onStartBOQ: () => void;
  onOpenProfile: () => void;
  onOpenMembership: () => void;
  onLogout: () => void;
}

export function NavigationMenu({
  user,
  currentView,
  onNavigate,
  onStartBOQ,
  onOpenProfile,
  onOpenMembership,
  onLogout,
}: NavigationMenuProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);

  useEffect(() => {
    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      const response = await api.get(`/profile/${user.id}`);

      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        setMembership(data.membership);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const navItems = [
    { id: 'dashboard' as const, label: 'แดชบอร์ด', icon: FileText },
    { id: 'customers' as const, label: 'ลูกค้า', icon: Users },
    { id: 'partners' as const, label: 'พาร์ทเนอร์', icon: Handshake },
    { id: 'tax-management' as const, label: 'ภาษี/การเงิน', icon: Calculator },
    { id: 'history' as const, label: 'ประวัติเอกสาร', icon: History },
    { id: 'reports' as const, label: 'รายงาน', icon: BarChart3 },
  ];

  return (
    <header className="border-b bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo & Navigation */}
          <div className="flex items-center gap-6">
            <div 
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => onNavigate('dashboard')}
            >
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-lg">
                <FileText className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  BOQ Management
                </h1>
                <p className="text-xs text-muted-foreground">
                  ระบบจัดการถอดวัสดุก่อสร้าง
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden lg:flex gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? 'default' : 'ghost'}
                    className={`gap-2 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600'
                        : ''
                    }`}
                    onClick={() => onNavigate(item.id)}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                );
              })}
            </nav>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              onClick={onStartBOQ}
              className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">สร้าง BOQ ใหม่</span>
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar className="w-8 h-8 border-2 border-blue-200">
                    <AvatarImage src={profile?.avatarUrl} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-sm">
                      {profile?.name ? getInitials(profile.name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <p className="text-sm leading-tight">
                      {profile?.name || 'ผู้ใช้'}
                    </p>
                    <p className="text-xs text-muted-foreground leading-tight">
                      {membership?.tier === 'vip' ? 'VIP Member' : 'Free'}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex items-center gap-2">
                    <span>บัญชีของฉัน</span>
                    {membership?.tier === 'vip' && (
                      <Badge className="gap-1 bg-gradient-to-r from-yellow-500 to-orange-500">
                        <Crown className="w-3 h-3" />
                        VIP
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {user?.email}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onOpenProfile} className="gap-2">
                  <UserIcon className="w-4 h-4" />
                  โปรไฟล์
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenMembership} className="gap-2">
                  <Crown className="w-4 h-4" />
                  สมาชิก VIP
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onNavigate('guide' as any)} className="gap-2">
                  <BookOpen className="w-4 h-4" />
                  คู่มือการใช้งาน
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onNavigate('contact' as any)} className="gap-2">
                  <Mail className="w-4 h-4" />
                  ติดต่อเรา
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onNavigate('privacy' as any)} className="gap-2">
                  <Shield className="w-4 h-4" />
                  นโยบายความเป็นส่วนตัว
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onNavigate('terms' as any)} className="gap-2">
                  <FileCheck className="w-4 h-4" />
                  ข้อกำหนดการใช้งาน
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="gap-2 text-red-600">
                  <LogOut className="w-4 h-4" />
                  ออกจากระบบ
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="lg:hidden flex gap-2 mt-4 overflow-x-auto pb-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <Button
                key={item.id}
                variant={isActive ? 'default' : 'ghost'}
                size="sm"
                className={`gap-2 flex-shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600'
                    : ''
                }`}
                onClick={() => onNavigate(item.id)}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
