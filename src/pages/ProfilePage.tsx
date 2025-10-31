import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Upload,
  ArrowLeft,
  Crown,
  Zap,
  Award,
  Calendar,
  Users,
  UserPlus,
  Send,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Hash,
  CreditCard,
  Briefcase,
  FileText,
  Globe,
  Shield,
  Copy,
  Check,
  IdCard,
  Building,
  Factory,
  Store,
  Sparkles,
  BarChart3,
  Settings,
  Eye,
  EyeOff,
} from 'lucide-react';
import { UserProfile, ProposerType, CompanyInfo, Membership } from '../types/boq';
import { toast } from 'sonner';
import { api } from '../utils/api';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

interface ProfilePageProps {
  onBack: () => void;
  onNavigateToMembership?: () => void;
  user: SupabaseUser | null;
}

const proposerTypeLabels: Record<ProposerType, string> = {
  // บริษัทผู้รับเหมา
  general_contractor: 'ผู้รับเหมาหลัก (General Contractor) 🏢',
  design_build: 'Design-Build / EPC / Turnkey 🏗️',
  construction_management: 'Construction Management (CM) 📋',
  structure_contractor: 'ผู้รับเหมางานโครงสร้าง 🏗️',
  mep_contractor: 'ผู้รับเหมา MEP ครบวงจร ⚡',
  interior_contractor: 'ผู้รับเหมา Interior/Fit-out 🎨',
  exterior_contractor: 'ผู้รับเหมางานภายนอก 🌳',
  special_system_contractor: 'ผู้รับเหมาระบบพิเศษ ❄️',
  maintenance_contractor: 'ผู้รับเหมาบำรุงรักษา (AMC) 🔧',
  
  // ช่าง/ทีมเฉพาะทาง - โครงสร้าง
  surveyor: 'สำรวจ/ตั้งแนว 📏',
  pile_contractor: 'เสาเข็ม/ทดสอบ 🔨',
  concrete_contractor: 'คอนกรีต/แบบหล่อ 🏗️',
  steel_contractor: 'โครงสร้างเหล็ก/เชื่อม 🔩',
  waterproof_contractor: 'กันซึม/ซ่อมคอนกรีต 💧',
  
  // สถาปัตย์
  mason: 'ผนังอิฐ/บล็อก 🧱',
  ceiling_contractor: 'ฝ้าเพดาน 📐',
  tile_contractor: 'ปูกระเบื้อง/หิน 🔲',
  wood_contractor: 'งานไม้/ปาร์เกต์ 🪵',
  painter: 'งานสี/กันไฟ 🎨',
  furniture_contractor: 'บิ้วอิน/เฟอร์นิเจอร์ 🪑',
  door_window_contractor: 'ประตู-หน้าต่าง 🚪',
  aluminum_glass_contractor: 'อะลูมิเนียมและกระจก 🪟',
  roof_contractor: 'หลังคา/เมทัลชีท 🏠',
  facade_contractor: 'ฟาซาด/ครีบระแนง 🏢',
  
  // งานภายนอก
  road_contractor: 'ถนน/แอสฟัลต์ 🛣️',
  landscape_contractor: 'แลนด์สเคป/สนามหญ้า 🌳',
  pool_contractor: 'สระว่ายน้ำ/น้ำพุ 🏊',
  
  // MEP
  electrician: 'ไฟฟ้า/แสงสว่าง ⚡',
  elv_contractor: 'ELV/ICT/CCTV 📹',
  solar_contractor: 'โซลาร์รูฟ/EV Charger ☀️',
  fire_protection: 'ระบบดับเพลิง 🧯',
  plumber: 'ประปา/สุขาภิบาล 🚰',
  kitchen_gas_contractor: 'ระบบครัว/แก๊ส 🔥',
  hvac_contractor: 'แอร์และระบายอากาศ ❄️',
  coldroom_contractor: 'ห้องเย็น/คลีนรูม 🧊',
  bms_contractor: 'BMS/Automation 🤖',
  
  // รื้อถอน/ความปลอดภัย
  demolition_contractor: 'รื้อถอน 🔨',
  scaffolding_contractor: 'นั่งร้าน/กันตก 🪜',
  equipment_rental: 'เครน/เครื่องมือเช่า 🏗️',
  
  // ซัพพลายเออร์
  cement_supplier: 'ปูนซีเมนต์/คอนกรีต 🏗️',
  steel_supplier: 'เหล็ก/สแตนเลส 🔩',
  formwork_supplier: 'แบบหล่อ/ชอร์ริง 📦',
  brick_supplier: 'อิฐ/บล็อก/ปูน 🧱',
  tile_supplier: 'กระเบื้อง/หิน/พื้น 🔲',
  paint_supplier: 'สี/กันไฟ/กันซึม 🎨',
  wood_supplier: 'ไม้/ไม้อัด/วีเนียร์ 🪵',
  door_window_supplier: 'ประตู-หน้าต่าง (ซัพพลาย) 🚪',
  glass_supplier: 'กระจก/ฟาซาด (ซัพพลาย) 🪟',
  roof_supplier: 'หลังคา/ฉนวน (ซัพพลาย) 🏠',
  electrical_supplier: 'สายไฟ/เคเบิล/ตู้ไฟ ⚡',
  lighting_supplier: 'โคมไฟ/อุปกรณ์แสงสว่าง 💡',
  sanitary_supplier: 'สุขภัณฑ์/ก๊อก 🚿',
  pipe_supplier: 'ท่อ/ข้อต่อ/ปั๊มน้ำ 🔧',
  hvac_supplier: 'เครื่องปรับอากาศ/ดักท์ ❄️',
  fire_supplier: 'ดับเพลิง/วาล์ว (ซัพพลาย) 🧯',
  solar_supplier: 'โซลาร์/อินเวอร์เตอร์ ☀️',
  tool_supplier: 'เครื่องมือช่าง/PPE 🔧',
  
  material_store: 'ร้านค้าวัสดุทั่วไป 🏪',
  other: 'อื่นๆ',
};

interface TeamMember {
  email: string;
  name: string;
  status: 'active' | 'pending';
  joinedAt: number;
}

export function ProfilePage({ onBack, onNavigateToMembership, user }: ProfilePageProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState(false);
  const [showUserId, setShowUserId] = useState(false);
  
  // Team Management State
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);

  // Form state - Enhanced with more fields
  const [formData, setFormData] = useState({
    // ข้อมูลส่วนตัว
    name: '',
    position: '', // ตำแหน่ง
    department: '', // แผนก
    proposerType: 'general_contractor' as ProposerType,
    proposerName: '',
    phone: '',
    mobilePhone: '', // มือถือ
    lineId: '', // LINE ID
    address: '',
    
    // ข้อมูลบริษัท/ธุรกิจ
    company: {
      name: '',
      nameEn: '', // ชื่ออังกฤษ
      registrationNumber: '', // เลขทะเบียนนิติบุคคล
      address: '',
      addressEn: '', // ที่อยู่อังกฤษ
      taxId: '',
      phone: '',
      fax: '', // แฟกซ์
      email: '',
      website: '',
      businessType: '', // ประเภทธุรกิจ
      establishedYear: '', // ปีก่อตั้ง
      registeredCapital: '', // ทุนจดทะเบียน
      numberOfEmployees: '', // จำนวนพนักงาน
      
      // ผู้บริหาร
      ceoName: '', // กรรมการผู้จัดการ
      contactPerson: '', // ผู้ติดต่อ
      contactPosition: '', // ตำแหน่งผู้ติดต่อ
      contactPhone: '', // เบอร์ผู้ติดต่อ
      contactEmail: '', // อีเมลผู้ติดต่อ
      
      // ที่อยู่จัดส่งเอกสาร/ออกหน้างาน
      billingAddress: '', // ที่อยู่ออกบิล
      shippingAddress: '', // ที่อยู่จัดส่ง
      siteAddress: '', // ที่อยู่สำนักงานใหญ่/โครงการ
    } as CompanyInfo & {
      nameEn?: string;
      addressEn?: string;
      registrationNumber?: string;
      fax?: string;
      businessType?: string;
      establishedYear?: string;
      registeredCapital?: string;
      numberOfEmployees?: string;
      ceoName?: string;
      contactPerson?: string;
      contactPosition?: string;
      contactPhone?: string;
      contactEmail?: string;
      billingAddress?: string;
      shippingAddress?: string;
      siteAddress?: string;
    },
  });

  const loadAllData = useCallback(async () => {
    if (!user) {
      console.log('⚠️ No user found, skipping data load');
      return;
    }

    // ✅ Get user ID with fallback
    const userId = user.id || user.email || 'demo-user-default';
    
    if (!user.id) {
      console.warn('⚠️ User ID not found, using fallback:', userId);
    }

    try {
      console.log('🔄 Loading all data for user:', userId);
      setLoading(true);
      
      // ✅ Create default Free Plan membership in case API fails
      const defaultMembership: Membership = {
        userId: userId,
        tier: 'free', // ✅ FIX: Use 'tier' not 'plan'
        freeBoqUsed: false,
        autoRenew: false,
        paymentHistory: [],
      };
      
      // 🔥 EMERGENCY FALLBACK: Use localStorage if API unavailable
      // This allows page to work even if server hasn't restarted
      const localStorageKey = `boq_profile_${userId}`;
      const localMembershipKey = `boq_membership_${userId}`;
      const localTeamKey = `boq_team_${userId}`;
      
      // ⚡ Try to load from API first, with timeout
      let profileResponse = null;
      let teamResponse = null;
      
      try {
        const apiTimeout = 3000; // 3 second timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), apiTimeout);
        
        [profileResponse, teamResponse] = await Promise.race([
          Promise.all([
            api.get(`/profile/${userId}`).catch(err => {
              console.warn('Profile API failed, will use fallback:', err.message);
              return null;
            }),
            api.get(`/team/members/${userId}`).catch(err => {
              console.warn('Team API failed, will use fallback:', err.message);
              return null;
            })
          ]),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('API timeout')), apiTimeout)
          )
        ]) as [any, any];
        
        clearTimeout(timeoutId);
      } catch (timeoutError) {
        console.warn('⚠️ API timeout, using localStorage fallback');
        profileResponse = null;
        teamResponse = null;
      }

      // ✅ Handle profile response with localStorage fallback
      let profileData = null;
      let membershipData = null;
      
      if (profileResponse) {
        try {
          let data;
          
          // Check if it's a Response object or already parsed
          if (typeof profileResponse === 'object' && 'ok' in profileResponse) {
            // It's a Response object
            if (profileResponse.ok) {
              try {
                data = await profileResponse.json();
              } catch (jsonError: any) {
                console.warn('⚠️ Response body consumed, loading from localStorage...');
                // Try localStorage
                const stored = localStorage.getItem(localStorageKey);
                const storedMembership = localStorage.getItem(localMembershipKey);
                if (stored) {
                  profileData = JSON.parse(stored);
                }
                if (storedMembership) {
                  membershipData = JSON.parse(storedMembership);
                }
                data = null; // Skip API data
              }
            } else {
              // API error (404, 500, etc.)
              console.warn(`API error ${profileResponse.status}, using localStorage fallback`);
              const stored = localStorage.getItem(localStorageKey);
              const storedMembership = localStorage.getItem(localMembershipKey);
              if (stored) {
                profileData = JSON.parse(stored);
                console.log('✅ Loaded profile from localStorage');
              }
              if (storedMembership) {
                membershipData = JSON.parse(storedMembership);
                console.log('✅ Loaded membership from localStorage');
              }
              data = null;
            }
          } else {
            // Already parsed data (from cache)
            data = profileResponse;
          }
          
          if (data) {
            profileData = data.profile;
            membershipData = data.membership;
            
            // Save to localStorage for future fallback
            if (profileData) {
              localStorage.setItem(localStorageKey, JSON.stringify(profileData));
            }
            if (membershipData) {
              localStorage.setItem(localMembershipKey, JSON.stringify(membershipData));
            }
          }
        } catch (error) {
          console.error('❌ Failed to process profile response:', error);
        }
      }
      
      // If no data from API or localStorage, try localStorage one more time
      if (!profileData && !membershipData) {
        const stored = localStorage.getItem(localStorageKey);
        const storedMembership = localStorage.getItem(localMembershipKey);
        if (stored) {
          profileData = JSON.parse(stored);
          console.log('✅ Loaded profile from localStorage (fallback)');
        }
        if (storedMembership) {
          membershipData = JSON.parse(storedMembership);
          console.log('✅ Loaded membership from localStorage (fallback)');
        }
      }
      
      // Set profile and membership (use default if still null)
      setProfile(profileData);
      setMembership(membershipData || defaultMembership);
      
      if (!membershipData) {
        console.log('ℹ️ Using default Free Plan membership');
        // Save default membership to localStorage
        localStorage.setItem(localMembershipKey, JSON.stringify(defaultMembership));
      }
      
      // Populate form if we have profile data
      if (profileData) {
        setFormData({
          name: profileData.name || '',
          position: profileData.position || '',
          department: profileData.department || '',
          proposerType: profileData.proposerType || 'general_contractor',
          proposerName: profileData.proposerName || '',
          phone: profileData.phone || '',
          mobilePhone: profileData.mobilePhone || '',
          lineId: profileData.lineId || '',
          address: profileData.address || '',
          company: {
            name: profileData.companyName || '',
            nameEn: profileData.companyNameEn || '',
            registrationNumber: profileData.registrationNumber || '',
            address: profileData.address || '',
            addressEn: profileData.addressEn || '',
            taxId: profileData.taxId || '',
            phone: profileData.phone || '',
            fax: profileData.fax || '',
            email: profileData.email || user.email || '',
            website: profileData.website || '',
            businessType: profileData.businessType || '',
            establishedYear: profileData.establishedYear || '',
            registeredCapital: profileData.registeredCapital || '',
            numberOfEmployees: profileData.numberOfEmployees || '',
            ceoName: profileData.ceoName || '',
            contactPerson: profileData.contactPerson || '',
            contactPosition: profileData.contactPosition || '',
            contactPhone: profileData.contactPhone || '',
            contactEmail: profileData.contactEmail || '',
            billingAddress: profileData.billingAddress || '',
            shippingAddress: profileData.shippingAddress || '',
            siteAddress: profileData.siteAddress || '',
          },
        });
      }

      // ✅ Handle team response with localStorage fallback
      let teamMembers = [];
      
      if (teamResponse) {
        try {
          let data;
          
          if (typeof teamResponse === 'object' && 'ok' in teamResponse) {
            // It's a Response object
            if (teamResponse.ok) {
              try {
                data = await teamResponse.json();
              } catch (jsonError: any) {
                console.warn('⚠️ Team response body consumed, loading from localStorage...');
                const stored = localStorage.getItem(localTeamKey);
                if (stored) {
                  teamMembers = JSON.parse(stored);
                  console.log('✅ Loaded team from localStorage');
                }
                data = null;
              }
            } else {
              // API error
              console.warn(`Team API error ${teamResponse.status}, using localStorage fallback`);
              const stored = localStorage.getItem(localTeamKey);
              if (stored) {
                teamMembers = JSON.parse(stored);
              }
              data = null;
            }
          } else {
            // Already parsed data
            data = teamResponse;
          }
          
          if (data && data.members) {
            teamMembers = data.members;
            // Save to localStorage
            localStorage.setItem(localTeamKey, JSON.stringify(teamMembers));
          }
        } catch (error) {
          console.error('❌ Failed to process team response:', error);
        }
      }
      
      // Try localStorage if no team data yet
      if (teamMembers.length === 0) {
        const stored = localStorage.getItem(localTeamKey);
        if (stored) {
          teamMembers = JSON.parse(stored);
          console.log('✅ Loaded team from localStorage (fallback)');
        }
      }
      
      setTeamMembers(teamMembers);
    } catch (error) {
      console.error('❌ Error loading data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  }, [user]); // ✅ Dependencies: only re-create when user object changes

  useEffect(() => {
    loadAllData();
  }, [loadAllData]); // ✅ FIX: Run when loadAllData changes (which is stable via useCallback)

  const handleSave = async () => {
    if (!user) {
      toast.error('ไม่พบข้อมูลผู้ใช้');
      return;
    }

    // ✅ Get user ID with fallback
    const userId = user.id || user.email || 'demo-user-default';
    
    if (!user.id) {
      console.warn('⚠️ User ID not found, using fallback:', userId);
    }

    try {
      setSaving(true);

      const profileData = {
        ...formData,
        // Map company data back to profile fields
        companyName: formData.company.name,
        companyNameEn: formData.company.nameEn,
        registrationNumber: formData.company.registrationNumber,
        address: formData.company.address,
        addressEn: formData.company.addressEn,
        taxId: formData.company.taxId,
        fax: formData.company.fax,
        email: formData.company.email,
        website: formData.company.website,
        businessType: formData.company.businessType,
        establishedYear: formData.company.establishedYear,
        registeredCapital: formData.company.registeredCapital,
        numberOfEmployees: formData.company.numberOfEmployees,
        ceoName: formData.company.ceoName,
        contactPerson: formData.company.contactPerson,
        contactPosition: formData.company.contactPosition,
        contactPhone: formData.company.contactPhone,
        contactEmail: formData.company.contactEmail,
        billingAddress: formData.company.billingAddress,
        shippingAddress: formData.company.shippingAddress,
        siteAddress: formData.company.siteAddress,
      };

      // 🔥 EMERGENCY: Save to localStorage first (works even if API down)
      const localStorageKey = `boq_profile_${userId}`;
      localStorage.setItem(localStorageKey, JSON.stringify(profileData));
      console.log('✅ Saved profile to localStorage');
      
      // Try to save to API (but don't block if it fails)
      try {
        const response = await api.put(`/profile/${userId}`, profileData);

        if (response.ok) {
          toast.success('บันทึกข้อมูลสำเร็จ!');
          await loadAllData();
        } else {
          // API failed but localStorage saved
          toast.success('บันทึกข้อมูลในเครื่องสำเร็จ! (API ไม่พร้อม)');
          setProfile(profileData);
        }
      } catch (apiError) {
        // API completely failed but localStorage saved
        console.warn('API save failed, but localStorage saved:', apiError);
        toast.success('บันทึกข้อมูลในเครื่องสำเร็จ!');
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  const copyUserId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopiedUserId(true);
      toast.success('คัดลอก User ID แล้ว!');
      setTimeout(() => setCopiedUserId(false), 2000);
    }
  };

  const maskUserId = (id: string) => {
    if (showUserId) return id;
    return id.slice(0, 8) + '••••••••' + id.slice(-8);
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto mb-4"
          />
          <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header - Premium Design */}
      <div className="relative bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 overflow-hidden">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9InBhdHRlcm4iIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMiIgZmlsbD0id2hpdGUiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjcGF0dGVybikiLz48L3N2Zz4=')] opacity-30" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 py-8 relative z-10">
          <div className="flex items-center justify-between mb-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Button
                onClick={onBack}
                variant="ghost"
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                กลับ
              </Button>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {membership?.tier !== 'free' && (
                <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 shadow-lg px-4 py-2">
                  <Crown className="w-4 h-4 mr-1" />
                  {membership?.tier === 'pro' ? 'PRO Member' : 'PREMIUM Member'}
                </Badge>
              )}
            </motion.div>
          </div>

          {/* Profile Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row items-center gap-6"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="relative group"
            >
              <Avatar className="w-32 h-32 border-4 border-white/60 shadow-2xl ring-4 ring-white/20">
                <AvatarImage src={profile?.avatarUrl} />
                <AvatarFallback className="bg-gradient-to-br from-white/30 to-white/10 text-white text-5xl backdrop-blur-sm">
                  {profile?.name ? getInitials(profile.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <motion.div
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                whileHover={{ scale: 1.05 }}
              >
                <Upload className="w-8 h-8 text-white" />
              </motion.div>
            </motion.div>

            <div className="flex-1 text-center md:text-left">
              <motion.h1
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl font-bold text-white mb-2"
              >
                {formData.name || 'ยังไม่ได้ตั้งชื่อ'}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-white/90 text-lg mb-3"
              >
                {user?.email}
              </motion.p>
              
              {/* User ID Section - Enhanced */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-3 justify-center md:justify-start"
              >
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/30">
                  <Hash className="w-4 h-4 text-white/80" />
                  <span className="text-sm text-white/80 font-semibold">User ID:</span>
                  <code className="text-white font-mono text-sm">
                    {user?.id ? maskUserId(user.id) : 'N/A'}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowUserId(!showUserId)}
                    className="h-6 w-6 p-0 text-white/80 hover:text-white hover:bg-white/20"
                  >
                    {showUserId ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={copyUserId}
                    className="h-6 w-6 p-0 text-white/80 hover:text-white hover:bg-white/20"
                  >
                    {copiedUserId ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
                <Badge variant="outline" className="bg-white/10 text-white border-white/30 backdrop-blur-sm">
                  <Shield className="w-3 h-3 mr-1" />
                  สำหรับ Backend
                </Badge>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-8">
        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid bg-white shadow-lg border-2 border-gray-200 p-1">
            <TabsTrigger value="personal" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-blue-500 data-[state=active]:text-white">
              <User className="w-4 h-4 mr-2" />
              ข้อมูลส่วนตัว
            </TabsTrigger>
            <TabsTrigger value="business" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white">
              <Building2 className="w-4 h-4 mr-2" />
              ข้อมูลธุรกิจ
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">
              <Settings className="w-4 h-4 mr-2" />
              การตั้งค่า
            </TabsTrigger>
          </TabsList>

          {/* Personal Info Tab */}
          <TabsContent value="personal" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-8 shadow-xl border-2 border-indigo-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">ข้อมูลส่วนตัว</h2>
                    <p className="text-sm text-muted-foreground">ข้อมูลพื้นฐานของคุณ</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <IdCard className="w-4 h-4 text-indigo-600" />
                      ชื่อ-นามสกุล *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="นายสมชาย ใจดี"
                      className="border-2 focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position" className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-purple-600" />
                      ตำแหน่ง
                    </Label>
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      placeholder="ผู้จัดการโครงการ"
                      className="border-2 focus:border-purple-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department" className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-blue-600" />
                      แผนก/ฝ่าย
                    </Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="ฝ่ายงานก่อสร้าง"
                      className="border-2 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="proposerType" className="flex items-center gap-2">
                      <Factory className="w-4 h-4 text-green-600" />
                      ประเภทธุรกิจ *
                    </Label>
                    <Select
                      value={formData.proposerType}
                      onValueChange={(value) => setFormData({ ...formData, proposerType: value as ProposerType })}
                    >
                      <SelectTrigger className="border-2 focus:border-green-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[400px]">
                        {Object.entries(proposerTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-orange-600" />
                      เบอร์โทรศัพท์สำนักงาน
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="02-123-4567"
                      className="border-2 focus:border-orange-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mobilePhone" className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-pink-600" />
                      มือถือ *
                    </Label>
                    <Input
                      id="mobilePhone"
                      value={formData.mobilePhone}
                      onChange={(e) => setFormData({ ...formData, mobilePhone: e.target.value })}
                      placeholder="08X-XXX-XXXX"
                      className="border-2 focus:border-pink-500"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="lineId" className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-green-600" />
                      LINE ID
                    </Label>
                    <Input
                      id="lineId"
                      value={formData.lineId}
                      onChange={(e) => setFormData({ ...formData, lineId: e.target.value })}
                      placeholder="@mylineid"
                      className="border-2 focus:border-green-500"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address" className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-600" />
                      ที่อยู่ส่วนตัว
                    </Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="123 ถนน... ตำบล/แขวง... อำเภอ/เขต... จังหวัด... 10XXX"
                      rows={3}
                      className="border-2 focus:border-red-500"
                    />
                  </div>
                </div>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Business Info Tab - ENHANCED */}
          <TabsContent value="business" className="space-y-6">
            {/* บริษัท/ห้างหุ้นส่วน */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-8 shadow-xl border-2 border-purple-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">ข้อมูลบริษัท/ห้างหุ้นส่วน</h2>
                    <p className="text-sm text-muted-foreground">ข้อมูลนิติบุคคล</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-purple-600" />
                      ชื่อบริษัท (ไทย) *
                    </Label>
                    <Input
                      id="companyName"
                      value={formData.company.name}
                      onChange={(e) => setFormData({
                        ...formData,
                        company: { ...formData.company, name: e.target.value }
                      })}
                      placeholder="บริษัท ABC ก่อสร้าง จำกัด"
                      className="border-2 focus:border-purple-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyNameEn" className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      ชื่อบริษัท (English)
                    </Label>
                    <Input
                      id="companyNameEn"
                      value={formData.company.nameEn}
                      onChange={(e) => setFormData({
                        ...formData,
                        company: { ...formData.company, nameEn: e.target.value }
                      })}
                      placeholder="ABC Construction Co., Ltd."
                      className="border-2 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxId" className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-green-600" />
                      เลขประจำตัวผู้เสียภาษี *
                    </Label>
                    <Input
                      id="taxId"
                      value={formData.company.taxId}
                      onChange={(e) => setFormData({
                        ...formData,
                        company: { ...formData.company, taxId: e.target.value }
                      })}
                      placeholder="0-0000-00000-00-0"
                      className="border-2 focus:border-green-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registrationNumber" className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-orange-600" />
                      เลขทะเบียนนิติบุคคล
                    </Label>
                    <Input
                      id="registrationNumber"
                      value={formData.company.registrationNumber}
                      onChange={(e) => setFormData({
                        ...formData,
                        company: { ...formData.company, registrationNumber: e.target.value }
                      })}
                      placeholder="0000000000000"
                      className="border-2 focus:border-orange-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessType" className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-indigo-600" />
                      ประเภทธุรกิจ
                    </Label>
                    <Input
                      id="businessType"
                      value={formData.company.businessType}
                      onChange={(e) => setFormData({
                        ...formData,
                        company: { ...formData.company, businessType: e.target.value }
                      })}
                      placeholder="รับเหมาก่อสร้าง"
                      className="border-2 focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="establishedYear" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-pink-600" />
                      ปีที่ก่อตั้ง
                    </Label>
                    <Input
                      id="establishedYear"
                      value={formData.company.establishedYear}
                      onChange={(e) => setFormData({
                        ...formData,
                        company: { ...formData.company, establishedYear: e.target.value }
                      })}
                      placeholder="2563"
                      className="border-2 focus:border-pink-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registeredCapital" className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-green-600" />
                      ทุนจดทะเบียน (บาท)
                    </Label>
                    <Input
                      id="registeredCapital"
                      value={formData.company.registeredCapital}
                      onChange={(e) => setFormData({
                        ...formData,
                        company: { ...formData.company, registeredCapital: e.target.value }
                      })}
                      placeholder="1,000,000"
                      className="border-2 focus:border-green-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="numberOfEmployees" className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      จำนวนพนักงาน
                    </Label>
                    <Input
                      id="numberOfEmployees"
                      value={formData.company.numberOfEmployees}
                      onChange={(e) => setFormData({
                        ...formData,
                        company: { ...formData.company, numberOfEmployees: e.target.value }
                      })}
                      placeholder="50"
                      className="border-2 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="companyAddress" className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-600" />
                      ที่อยู่บริษัท (ไทย) *
                    </Label>
                    <Textarea
                      id="companyAddress"
                      value={formData.company.address}
                      onChange={(e) => setFormData({
                        ...formData,
                        company: { ...formData.company, address: e.target.value }
                      })}
                      placeholder="เลขที่... ถนน... ตำบล/แขวง... อำเภอ/เขต... จังหวัด... รหัสไปรษณีย์..."
                      rows={3}
                      className="border-2 focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="companyAddressEn" className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-orange-600" />
                      ที่อยู่บริษัท (English)
                    </Label>
                    <Textarea
                      id="companyAddressEn"
                      value={formData.company.addressEn}
                      onChange={(e) => setFormData({
                        ...formData,
                        company: { ...formData.company, addressEn: e.target.value }
                      })}
                      placeholder="No... Street... Sub-district... District... Province... Postal Code..."
                      rows={3}
                      className="border-2 focus:border-orange-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyPhone" className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-purple-600" />
                      เบอร์โทรบริษัท
                    </Label>
                    <Input
                      id="companyPhone"
                      value={formData.company.phone}
                      onChange={(e) => setFormData({
                        ...formData,
                        company: { ...formData.company, phone: e.target.value }
                      })}
                      placeholder="02-XXX-XXXX"
                      className="border-2 focus:border-purple-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyFax" className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-600" />
                      แฟกซ์
                    </Label>
                    <Input
                      id="companyFax"
                      value={formData.company.fax}
                      onChange={(e) => setFormData({
                        ...formData,
                        company: { ...formData.company, fax: e.target.value }
                      })}
                      placeholder="02-XXX-XXXX"
                      className="border-2 focus:border-gray-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyEmail" className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-600" />
                      อีเมลบริษัท
                    </Label>
                    <Input
                      id="companyEmail"
                      value={formData.company.email}
                      onChange={(e) => setFormData({
                        ...formData,
                        company: { ...formData.company, email: e.target.value }
                      })}
                      placeholder="info@company.com"
                      type="email"
                      className="border-2 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyWebsite" className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-green-600" />
                      เว็บไซต์
                    </Label>
                    <Input
                      id="companyWebsite"
                      value={formData.company.website}
                      onChange={(e) => setFormData({
                        ...formData,
                        company: { ...formData.company, website: e.target.value }
                      })}
                      placeholder="https://www.company.com"
                      className="border-2 focus:border-green-500"
                    />
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* ผู้บริหารและผู้ติดต่อ */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="p-8 shadow-xl border-2 border-blue-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">ผู้บริหารและผู้ติดต่อ</h2>
                    <p className="text-sm text-muted-foreground">ข้อมูลบุคคลสำคัญ</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="ceoName" className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-yellow-600" />
                      กรรมการผู้จัดการ
                    </Label>
                    <Input
                      id="ceoName"
                      value={formData.company.ceoName}
                      onChange={(e) => setFormData({
                        ...formData,
                        company: { ...formData.company, ceoName: e.target.value }
                      })}
                      placeholder="นายสมชาย ใจดี"
                      className="border-2 focus:border-yellow-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactPerson" className="flex items-center gap-2">
                      <User className="w-4 h-4 text-indigo-600" />
                      ผู้ติดต่อ
                    </Label>
                    <Input
                      id="contactPerson"
                      value={formData.company.contactPerson}
                      onChange={(e) => setFormData({
                        ...formData,
                        company: { ...formData.company, contactPerson: e.target.value }
                      })}
                      placeholder="นายสมศักดิ์ ประสงค์ดี"
                      className="border-2 focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactPosition" className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-purple-600" />
                      ตำแหน่งผู้ติดต่อ
                    </Label>
                    <Input
                      id="contactPosition"
                      value={formData.company.contactPosition}
                      onChange={(e) => setFormData({
                        ...formData,
                        company: { ...formData.company, contactPosition: e.target.value }
                      })}
                      placeholder="ผู้จัดการโครงการ"
                      className="border-2 focus:border-purple-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactPhone" className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-green-600" />
                      เบอร์โทรผู้ติดต่อ
                    </Label>
                    <Input
                      id="contactPhone"
                      value={formData.company.contactPhone}
                      onChange={(e) => setFormData({
                        ...formData,
                        company: { ...formData.company, contactPhone: e.target.value }
                      })}
                      placeholder="08X-XXX-XXXX"
                      className="border-2 focus:border-green-500"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="contactEmail" className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-600" />
                      อีเมลผู้ติดต่อ
                    </Label>
                    <Input
                      id="contactEmail"
                      value={formData.company.contactEmail}
                      onChange={(e) => setFormData({
                        ...formData,
                        company: { ...formData.company, contactEmail: e.target.value }
                      })}
                      placeholder="contact@company.com"
                      type="email"
                      className="border-2 focus:border-blue-500"
                    />
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* ที่อยู่เพิ่มเติม */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="p-8 shadow-xl border-2 border-green-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">ที่อยู่เพิ่มเติม</h2>
                    <p className="text-sm text-muted-foreground">ที่อยู่สำหรับจัดส่งและออกบิล</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="billingAddress" className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-orange-600" />
                      ที่อยู่สำหรับออกบิล
                    </Label>
                    <Textarea
                      id="billingAddress"
                      value={formData.company.billingAddress}
                      onChange={(e) => setFormData({
                        ...formData,
                        company: { ...formData.company, billingAddress: e.target.value }
                      })}
                      placeholder="ที่อยู่สำหรับออกใบกำกับภาษี/ใบเสร็จ"
                      rows={3}
                      className="border-2 focus:border-orange-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shippingAddress" className="flex items-center gap-2">
                      <Send className="w-4 h-4 text-blue-600" />
                      ที่อยู่สำหรับจัดส่งเอกสาร
                    </Label>
                    <Textarea
                      id="shippingAddress"
                      value={formData.company.shippingAddress}
                      onChange={(e) => setFormData({
                        ...formData,
                        company: { ...formData.company, shippingAddress: e.target.value }
                      })}
                      placeholder="ที่อยู่สำหรับจัดส่งเอกสาร/วัสดุ"
                      rows={3}
                      className="border-2 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="siteAddress" className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-purple-600" />
                      ที่อยู่สำนักงานใหญ่/โครงการ
                    </Label>
                    <Textarea
                      id="siteAddress"
                      value={formData.company.siteAddress}
                      onChange={(e) => setFormData({
                        ...formData,
                        company: { ...formData.company, siteAddress: e.target.value }
                      })}
                      placeholder="ที่ตั้งสำนักงานใหญ่หรือสถานที่ปฏิบัติงานหลัก"
                      rows={3}
                      className="border-2 focus:border-purple-500"
                    />
                  </div>
                </div>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-8 shadow-xl border-2 border-orange-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">การตั้งค่า</h2>
                    <p className="text-sm text-muted-foreground">แพ็คเกจและการตั้งค่าบัญชี</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Membership Info */}
                  <div className="p-6 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Crown className="w-8 h-8 text-purple-600" />
                        <div>
                          <h3 className="font-bold text-lg">
                            {membership?.tier === 'free' && 'FREE'}
                            {membership?.tier === 'pro' && 'PRO'}
                            {membership?.tier === 'premium' && 'PREMIUM'}
                          </h3>
                          <p className="text-sm text-muted-foreground">แพ็คเกจปัจจุบัน</p>
                        </div>
                      </div>
                      <Button
                        onClick={onNavigateToMembership}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        อัพเกรด
                      </Button>
                    </div>
                  </div>

                  {/* Account Info */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Shield className="w-5 h-5 text-blue-600" />
                      ข้อมูลบัญชี
                    </h3>
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <div className="flex items-center gap-3">
                          <Mail className="w-5 h-5 text-gray-600" />
                          <div>
                            <p className="text-sm text-gray-600">อีเมล</p>
                            <p className="font-semibold">{user?.email}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <div className="flex items-center gap-3">
                          <Hash className="w-5 h-5 text-gray-600" />
                          <div>
                            <p className="text-sm text-gray-600">User ID (สำหรับ Backend)</p>
                            <code className="font-mono text-sm font-semibold">
                              {user?.id ? maskUserId(user.id) : 'N/A'}
                            </code>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowUserId(!showUserId)}
                          >
                            {showUserId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={copyUserId}
                          >
                            {copiedUserId ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Save Button - Sticky */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-6 mt-8"
        >
          <Card className="p-6 shadow-2xl border-2 border-indigo-200 bg-white/95 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold">พร้อมบันทึกข้อมูลแล้วหรือยัง?</p>
                  <p className="text-sm text-muted-foreground">กรอกข้อมูลให้ครบถ้วนเพื่อการใช้งานที่สมบูรณ์</p>
                </div>
              </div>
              <Button
                onClick={handleSave}
                disabled={saving}
                size="lg"
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all px-8"
              >
                {saving ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mr-2"
                    />
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    บันทึกข้อมูล
                  </>
                )}
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
