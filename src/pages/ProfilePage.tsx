import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
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
} from 'lucide-react';
import { UserProfile, ProposerType, CompanyInfo, Membership } from '../types/boq';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
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
  
  // Team Management State
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    proposerType: 'general_contractor' as ProposerType,
    proposerName: '',
    phone: '',
    address: '',
    company: {
      name: '',
      address: '',
      taxId: '',
      phone: '',
      email: '',
      website: '',
    } as CompanyInfo,
  });

  useEffect(() => {
    loadProfile();
    loadTeamMembers();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/profile/${user.id}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.profile) {
          setProfile(data.profile);
          setFormData({
            name: data.profile.name || '',
            proposerType: data.profile.proposerType || 'contractor',
            proposerName: data.profile.proposerName || '',
            phone: data.profile.phone || '',
            address: data.profile.address || '',
            company: data.profile.company || {
              name: '',
              address: '',
              taxId: '',
              phone: '',
              email: '',
              website: '',
            },
          });
        }
        if (data.membership) {
          setMembership(data.membership);
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast.error('ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);

      const updatedProfile: UserProfile = {
        id: user.id,
        email: user.email || '',
        ...formData,
        avatarUrl: profile?.avatarUrl,
        createdAt: profile?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/profile`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(updatedProfile),
        }
      );

      if (response.ok) {
        setProfile(updatedProfile);
        toast.success('บันทึกข้อมูลสำเร็จ!');
      } else {
        throw new Error('Failed to save profile');
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('ขนาดไฟล์ต้องไม่เกิน 5MB');
      return;
    }

    try {
      setUploadingAvatar(true);

      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;

        // Upload to server
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/upload-avatar`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
              userId: user.id,
              imageData: base64String,
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          setProfile(prev => prev ? { ...prev, avatarUrl: data.avatarUrl } : null);
          toast.success('อัพโหลดรูปโปรไฟล์สำเร็จ!');
        } else {
          throw new Error('Upload failed');
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Avatar upload failed:', error);
      toast.error('ไม่สามารถอัพโหลดรูปได้');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const loadTeamMembers = async () => {
    if (!user) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/team/members/${user.id}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.members || []);
      }
    } catch (error) {
      console.error('Failed to load team members:', error);
    }
  };

  const handleInviteMember = () => {
    // Check if user has team plan
    const isTeamPlan = membership?.tier === 'team_month' || membership?.tier === 'team_year';
    
    if (!isTeamPlan) {
      // Redirect to membership page
      toast.info('อัพเกรดเป็นแผนทีมเพื่อเชิญสมาชิก', {
        description: 'แผนทีมรองรับได้สูงสุด 5 คน เพียง ฿499/เดือน'
      });
      if (onNavigateToMembership) {
        onNavigateToMembership();
      }
      return;
    }

    // Check team limit (5 members max for team plan)
    if (teamMembers.length >= 5) {
      toast.error('ทีมเต็มแล้ว', {
        description: 'แผนทีมรองรับสมาชิกได้สูงสุด 5 คน'
      });
      return;
    }

    setIsInviteDialogOpen(true);
  };

  const handleSendInvite = async () => {
    if (!inviteEmail || !inviteName || !user) return;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      toast.error('รูปแบบอีเมลไม่ถูกต้อง');
      return;
    }

    // Check if already invited
    if (teamMembers.some(m => m.email === inviteEmail)) {
      toast.error('อีเมลนี้ถูกเชิญแล้ว');
      return;
    }

    try {
      setIsSendingInvite(true);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/team/invite`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            ownerId: user.id,
            email: inviteEmail,
            name: inviteName,
          }),
        }
      );

      if (response.ok) {
        toast.success('ส่งคำเชิญสำเร็จ!', {
          description: `ส่งอีเมลเชิญไปที่ ${inviteEmail} แล้ว`
        });
        setInviteEmail('');
        setInviteName('');
        setIsInviteDialogOpen(false);
        loadTeamMembers();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send invite');
      }
    } catch (error) {
      console.error('Failed to send invite:', error);
      toast.error('ไม่สามารถส่งคำเชิญได้');
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (!user) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/team/remove`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            ownerId: user.id,
            email: member.email,
          }),
        }
      );

      if (response.ok) {
        toast.success('ลบสมาชิกออกจากทีมแล้ว');
        loadTeamMembers();
      } else {
        throw new Error('Failed to remove member');
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error('ไม่สามารถลบสมาชิกได้');
    } finally {
      setMemberToRemove(null);
    }
  };

  const isTeamPlan = membership?.tier === 'team_month' || membership?.tier === 'team_year';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-lg">กำลังโหลดข้อมูล...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl">โปรไฟล์และการตั้งค่า</h1>
                  <p className="text-muted-foreground">จัดการข้อมูลส่วนตัวและธุรกิจของคุณ</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Card */}
        <Card className="p-6 mb-6 bg-gradient-to-br from-blue-50 to-purple-50">
          <div className="flex items-start gap-6">
            <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
              <AvatarImage src={profile?.avatarUrl} />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                {formData.name ? getInitials(formData.name) : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl">{formData.name || 'ยังไม่ได้ตั้งชื่อ'}</h2>
                {membership?.tier === 'vip' && (
                  <Badge className="gap-1 bg-gradient-to-r from-yellow-500 to-orange-500">
                    <Crown className="w-3 h-3" />
                    VIP Member
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mb-3">{user?.email}</p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-500" />
                  <span>{proposerTypeLabels[formData.proposerType]}</span>
                </div>
                {formData.company.name && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-purple-500" />
                    <span>{formData.company.name}</span>
                  </div>
                )}
              </div>
            </div>
            <div>
              <input
                type="file"
                id="avatar-upload"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => document.getElementById('avatar-upload')?.click()}
              >
                <Upload className="w-4 h-4" />
                เปลี่ยนรูป
              </Button>
            </div>
          </div>
        </Card>

        {/* Membership Card */}
        {membership && (
          <Card className="p-6 mb-6 bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg mb-1">
                    {membership.tier === 'vip' ? 'VIP Member' : 'Free Member'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {membership.tier === 'vip'
                      ? `ใช้งานได้ถึง ${new Date(membership.subscriptionEnd || 0).toLocaleDateString('th-TH')}`
                      : membership.freeBoqUsed
                      ? 'คุณใช้ BOQ ฟรีหมดแล้ว'
                      : 'คุณสามารถสร้าง BOQ ฟรี 1 ครั้ง'}
                  </p>
                </div>
              </div>
              {membership.tier === 'free' && (
                <Button 
                  onClick={() => {
                    if (onNavigateToMembership) {
                      onNavigateToMembership();
                    } else {
                      toast.info('กำลังพัฒนาระบบชำระเงิน', {
                        description: 'ฟีเจอร์นี้จะเปิดให้ใช้งานเร็วๆ นี้'
                      });
                    }
                  }}
                  className="gap-2 bg-gradient-to-r from-yellow-500 to-orange-500"
                >
                  <Zap className="w-4 h-4" />
                  อัพเกรด VIP (฿129/เดือน)
                </Button>
              )}
              {membership.tier === 'vip' && (
                <Badge variant="outline" className="gap-1 px-4 py-2">
                  <Calendar className="w-4 h-4" />
                  ต่ออายุอัตโนมัติ
                </Badge>
              )}
            </div>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">ข้อมูลส่วนตัว</TabsTrigger>
            <TabsTrigger value="business">ข้อมูลธุรกิจ</TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <Users className="w-4 h-4" />
              ทีม
              {isTeamPlan && teamMembers.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {teamMembers.length}/5
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6 mt-6">
            <Card className="p-6">
              <h3 className="text-lg mb-4">ข้อมูลส่วนตัว</h3>
              <div className="space-y-4">
                <div>
                  <Label>ชื่อ-นามสกุล *</Label>
                  <Input
                    value={formData.name}
                    onChange={e =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="นายสมชาย ใจดี"
                  />
                </div>

                <div>
                  <Label>ประเภทผู้ประกอบการ *</Label>
                  <Select
                    value={formData.proposerType}
                    onValueChange={(v: ProposerType) =>
                      setFormData({ ...formData, proposerType: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[400px]">
                      {/* 1) บริษัทผู้รับเหมา */}
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                        1️⃣ บริษัทผู้รับเหมา (นิติบุคคล)
                      </div>
                      <SelectItem value="general_contractor">{proposerTypeLabels.general_contractor}</SelectItem>
                      <SelectItem value="design_build">{proposerTypeLabels.design_build}</SelectItem>
                      <SelectItem value="construction_management">{proposerTypeLabels.construction_management}</SelectItem>
                      <SelectItem value="structure_contractor">{proposerTypeLabels.structure_contractor}</SelectItem>
                      <SelectItem value="mep_contractor">{proposerTypeLabels.mep_contractor}</SelectItem>
                      <SelectItem value="interior_contractor">{proposerTypeLabels.interior_contractor}</SelectItem>
                      <SelectItem value="exterior_contractor">{proposerTypeLabels.exterior_contractor}</SelectItem>
                      <SelectItem value="special_system_contractor">{proposerTypeLabels.special_system_contractor}</SelectItem>
                      <SelectItem value="maintenance_contractor">{proposerTypeLabels.maintenance_contractor}</SelectItem>
                      
                      {/* 2) ช่าง/ทีมเฉพาะทาง */}
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 mt-2">
                        2️⃣ ช่าง/ทีมเฉพาะทาง (Subcontractors)
                      </div>
                      <div className="px-3 py-1 text-xs text-muted-foreground">โครงสร้าง/ดิน</div>
                      <SelectItem value="surveyor">{proposerTypeLabels.surveyor}</SelectItem>
                      <SelectItem value="pile_contractor">{proposerTypeLabels.pile_contractor}</SelectItem>
                      <SelectItem value="concrete_contractor">{proposerTypeLabels.concrete_contractor}</SelectItem>
                      <SelectItem value="steel_contractor">{proposerTypeLabels.steel_contractor}</SelectItem>
                      <SelectItem value="waterproof_contractor">{proposerTypeLabels.waterproof_contractor}</SelectItem>
                      
                      <div className="px-3 py-1 text-xs text-muted-foreground">สถาปัตย์</div>
                      <SelectItem value="mason">{proposerTypeLabels.mason}</SelectItem>
                      <SelectItem value="ceiling_contractor">{proposerTypeLabels.ceiling_contractor}</SelectItem>
                      <SelectItem value="tile_contractor">{proposerTypeLabels.tile_contractor}</SelectItem>
                      <SelectItem value="wood_contractor">{proposerTypeLabels.wood_contractor}</SelectItem>
                      <SelectItem value="painter">{proposerTypeLabels.painter}</SelectItem>
                      <SelectItem value="furniture_contractor">{proposerTypeLabels.furniture_contractor}</SelectItem>
                      <SelectItem value="door_window_contractor">{proposerTypeLabels.door_window_contractor}</SelectItem>
                      <SelectItem value="aluminum_glass_contractor">{proposerTypeLabels.aluminum_glass_contractor}</SelectItem>
                      <SelectItem value="roof_contractor">{proposerTypeLabels.roof_contractor}</SelectItem>
                      <SelectItem value="facade_contractor">{proposerTypeLabels.facade_contractor}</SelectItem>
                      
                      <div className="px-3 py-1 text-xs text-muted-foreground">งานภายนอก/ภูมิทัศน์</div>
                      <SelectItem value="road_contractor">{proposerTypeLabels.road_contractor}</SelectItem>
                      <SelectItem value="landscape_contractor">{proposerTypeLabels.landscape_contractor}</SelectItem>
                      <SelectItem value="pool_contractor">{proposerTypeLabels.pool_contractor}</SelectItem>
                      
                      <div className="px-3 py-1 text-xs text-muted-foreground">MEP (ไฟฟ้า-ประปา-เครื่องกล)</div>
                      <SelectItem value="electrician">{proposerTypeLabels.electrician}</SelectItem>
                      <SelectItem value="elv_contractor">{proposerTypeLabels.elv_contractor}</SelectItem>
                      <SelectItem value="solar_contractor">{proposerTypeLabels.solar_contractor}</SelectItem>
                      <SelectItem value="fire_protection">{proposerTypeLabels.fire_protection}</SelectItem>
                      <SelectItem value="plumber">{proposerTypeLabels.plumber}</SelectItem>
                      <SelectItem value="kitchen_gas_contractor">{proposerTypeLabels.kitchen_gas_contractor}</SelectItem>
                      <SelectItem value="hvac_contractor">{proposerTypeLabels.hvac_contractor}</SelectItem>
                      <SelectItem value="coldroom_contractor">{proposerTypeLabels.coldroom_contractor}</SelectItem>
                      <SelectItem value="bms_contractor">{proposerTypeLabels.bms_contractor}</SelectItem>
                      
                      <div className="px-3 py-1 text-xs text-muted-foreground">รื้อถอน/ความปลอดภัย/อุปกรณ์</div>
                      <SelectItem value="demolition_contractor">{proposerTypeLabels.demolition_contractor}</SelectItem>
                      <SelectItem value="scaffolding_contractor">{proposerTypeLabels.scaffolding_contractor}</SelectItem>
                      <SelectItem value="equipment_rental">{proposerTypeLabels.equipment_rental}</SelectItem>
                      
                      {/* 3) ร้านขายวัสดุ */}
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 mt-2">
                        3️⃣ ร้านขายวัสดุ/ซัพพลายเออร์
                      </div>
                      <div className="px-3 py-1 text-xs text-muted-foreground">โครงสร้าง</div>
                      <SelectItem value="cement_supplier">{proposerTypeLabels.cement_supplier}</SelectItem>
                      <SelectItem value="steel_supplier">{proposerTypeLabels.steel_supplier}</SelectItem>
                      <SelectItem value="formwork_supplier">{proposerTypeLabels.formwork_supplier}</SelectItem>
                      
                      <div className="px-3 py-1 text-xs text-muted-foreground">สถาปัตย์</div>
                      <SelectItem value="brick_supplier">{proposerTypeLabels.brick_supplier}</SelectItem>
                      <SelectItem value="tile_supplier">{proposerTypeLabels.tile_supplier}</SelectItem>
                      <SelectItem value="paint_supplier">{proposerTypeLabels.paint_supplier}</SelectItem>
                      <SelectItem value="wood_supplier">{proposerTypeLabels.wood_supplier}</SelectItem>
                      <SelectItem value="door_window_supplier">{proposerTypeLabels.door_window_supplier}</SelectItem>
                      <SelectItem value="glass_supplier">{proposerTypeLabels.glass_supplier}</SelectItem>
                      <SelectItem value="roof_supplier">{proposerTypeLabels.roof_supplier}</SelectItem>
                      
                      <div className="px-3 py-1 text-xs text-muted-foreground">MEP</div>
                      <SelectItem value="electrical_supplier">{proposerTypeLabels.electrical_supplier}</SelectItem>
                      <SelectItem value="lighting_supplier">{proposerTypeLabels.lighting_supplier}</SelectItem>
                      <SelectItem value="sanitary_supplier">{proposerTypeLabels.sanitary_supplier}</SelectItem>
                      <SelectItem value="pipe_supplier">{proposerTypeLabels.pipe_supplier}</SelectItem>
                      <SelectItem value="hvac_supplier">{proposerTypeLabels.hvac_supplier}</SelectItem>
                      <SelectItem value="fire_supplier">{proposerTypeLabels.fire_supplier}</SelectItem>
                      <SelectItem value="solar_supplier">{proposerTypeLabels.solar_supplier}</SelectItem>
                      
                      <div className="px-3 py-1 text-xs text-muted-foreground">เครื่องมือ/อุปกรณ์</div>
                      <SelectItem value="tool_supplier">{proposerTypeLabels.tool_supplier}</SelectItem>
                      
                      <div className="px-3 py-1 text-xs text-muted-foreground">อื่นๆ</div>
                      <SelectItem value="material_store">{proposerTypeLabels.material_store}</SelectItem>
                      <SelectItem value="other">{proposerTypeLabels.other}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>ชื่อผู้เสนอราคา (ใช้ในเอกสาร) *</Label>
                  <Input
                    value={formData.proposerName}
                    onChange={e =>
                      setFormData({ ...formData, proposerName: e.target.value })
                    }
                    placeholder="นายสมชาย ใจดี - ช่างรับเหมาก่อสร้าง"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    ชื่อนี้จะแสดงในเอกสาร BOQ, ใบเสนอราคา, และใบกำกับภาษี
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>เบอร์โทรศัพท์</Label>
                    <Input
                      value={formData.phone}
                      onChange={e =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="081-234-5678"
                    />
                  </div>
                  <div>
                    <Label>อีเมล</Label>
                    <Input value={user?.email || ''} disabled />
                  </div>
                </div>

                <div>
                  <Label>ที่อยู่</Label>
                  <Textarea
                    value={formData.address}
                    onChange={e =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    placeholder="123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110"
                    rows={3}
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="business" className="space-y-6 mt-6">
            <Card className="p-6">
              <h3 className="text-lg mb-4">ข้อมูลบริษัท/ห้างหุ้นส่วน</h3>
              <div className="space-y-4">
                <div>
                  <Label>ชื่อบริษัท</Label>
                  <Input
                    value={formData.company.name}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        company: { ...formData.company, name: e.target.value },
                      })
                    }
                    placeholder="บริษัท ABC จำกัด"
                  />
                </div>

                <div>
                  <Label>เลขประจำตัวผู้เสียภาษี</Label>
                  <Input
                    value={formData.company.taxId}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        company: { ...formData.company, taxId: e.target.value },
                      })
                    }
                    placeholder="0-1234-56789-01-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>โทรศัพท์บริษัท</Label>
                    <Input
                      value={formData.company.phone}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          company: { ...formData.company, phone: e.target.value },
                        })
                      }
                      placeholder="02-123-4567"
                    />
                  </div>
                  <div>
                    <Label>อีเมลบริษัท</Label>
                    <Input
                      value={formData.company.email}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          company: { ...formData.company, email: e.target.value },
                        })
                      }
                      placeholder="info@company.com"
                    />
                  </div>
                </div>

                <div>
                  <Label>เว็บไซต์</Label>
                  <Input
                    value={formData.company.website}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        company: { ...formData.company, website: e.target.value },
                      })
                    }
                    placeholder="https://www.company.com"
                  />
                </div>

                <div>
                  <Label>ที่อยู่บริษัท</Label>
                  <Textarea
                    value={formData.company.address}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        company: { ...formData.company, address: e.target.value },
                      })
                    }
                    placeholder="123 อาคารXYZ ชั้น 5 ถนนสีลม กรุงเทพฯ 10500"
                    rows={3}
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-6 mt-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg mb-1 flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-500" />
                    จัดการทีม
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isTeamPlan
                      ? `เชิญสมาชิกเข้าทีมของคุณ (สูงสุด 5 คน) ปัจจุบันมี ${teamMembers.length} คน`
                      : 'อัพเกรดเป็นแผนทีมเพื่อเชิญสมาชิก'}
                  </p>
                </div>
                <Button
                  onClick={handleInviteMember}
                  className={`gap-2 ${
                    !isTeamPlan
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                      : ''
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  {isTeamPlan ? 'เชิญสมาชิก' : 'อัพเกรดแผนทีม'}
                </Button>
              </div>

              {/* Team Members List */}
              {isTeamPlan && teamMembers.length > 0 ? (
                <div className="space-y-3">
                  {teamMembers.map((member, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                              {getInitials(member.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{member.name}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {member.status === 'active' ? (
                            <Badge className="gap-1 bg-green-100 text-green-700">
                              <CheckCircle className="w-3 h-3" />
                              ใช้งานอยู่
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <Clock className="w-3 h-3" />
                              รอการยืนยัน
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMemberToRemove(member)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : isTeamPlan ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">
                    ยังไม่มีสมาชิกในทีม
                  </p>
                  <Button onClick={handleInviteMember} variant="outline" className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    เชิญสมาชิกคนแรก
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-purple-300 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50">
                  <Crown className="w-12 h-12 mx-auto text-purple-500 mb-3" />
                  <h4 className="text-lg mb-2">ฟีเจอร์สำหรับแผนทีม</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    อัพเกรดเป็นแผนทีมเพื่อเชิญสมาชิกได้สูงสุด 5 คน<br />
                    แชร์เทมเพลต เอกสาร และทำงานร่วมกันได้อย่างมีประสิทธิภาพ
                  </p>
                  <Button
                    onClick={() => {
                      if (onNavigateToMembership) {
                        onNavigateToMembership();
                      }
                    }}
                    className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    <Zap className="w-4 h-4" />
                    ดูแผนทีม (฿499/เดือน)
                  </Button>
                </div>
              )}

              {/* Team Benefits */}
              {!isTeamPlan && (
                <Card className="p-4 mt-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-500" />
                    ประโยชน์ของแผนทีม
                  </h4>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>สมาชิกในทีมได้สูงสุด 5 คน</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>แชร์เทมเพลต BOQ ร่วมกัน</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>ดูรายงานและสถิติแบบทีม</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>พื้นที่เก็บข้อมูล 20 GB</span>
                    </div>
                  </div>
                </Card>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onBack}>
            ยกเลิก
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              <>บันทึกข้อมูล</>
            )}
          </Button>
        </div>
      </div>

      {/* Invite Member Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-purple-500" />
              เชิญสมาชิกเข้าทีม
            </DialogTitle>
            <DialogDescription>
              ส่งคำเชิญผ่านอีเมล สมาชิกจะได้รับลิงก์สำหรับเข้าร่วมทีม
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>ชื่อ-นามสกุล *</Label>
              <Input
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
                placeholder="นายสมชาย ใจดี"
              />
            </div>

            <div>
              <Label>อีเมล *</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="example@email.com"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                💡 สมาชิกที่ได้รับเชิญจะสามารถเข้าถึงเอกสาร BOQ, เทมเพลต 
                และฟีเจอร์ต่างๆ ของทีมได้
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsInviteDialogOpen(false);
                setInviteEmail('');
                setInviteName('');
              }}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleSendInvite}
              disabled={!inviteEmail || !inviteName || isSendingInvite}
              className="gap-2"
            >
              {isSendingInvite ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  กำลังส่ง...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  ส่งคำเชิญ
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <AlertDialog
        open={!!memberToRemove}
        onOpenChange={() => setMemberToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบสมาชิกออกจากทีม?</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบ <strong>{memberToRemove?.name}</strong> ({memberToRemove?.email}) 
              ออกจากทีมหรือไม่? 
              <br /><br />
              สมาชิกจะไม่สามารถเข้าถึงเอกสารและข้อมูลของทีมได้อีกต่อไป
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memberToRemove && handleRemoveMember(memberToRemove)}
              className="bg-red-500 hover:bg-red-600"
            >
              ลบออกจากทีม
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
