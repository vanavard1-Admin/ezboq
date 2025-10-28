import { useState } from "react";
import { motion } from "motion/react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { FileText, Mail, Lock, User, LogIn, UserPlus, Eye, EyeOff, Sparkles } from "lucide-react";
import { supabase } from "../utils/supabase/client";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { toast } from "sonner@2.0.3";

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    if (password.length < 6) {
      toast.error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    try {
      setLoading(true);
      
      // Call server signup endpoint (auto-confirms email)
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email,
            password,
            name: name || email.split('@')[0],
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Check if email already exists with confirmed account
        if (data.code === 'email_exists_confirmed') {
          toast.error('อีเมลนี้ถูกใช้งานแล้ว', {
            description: 'กรุณาเข้าสู่ระบบแทน'
          });
          // Auto switch to login mode
          setTimeout(() => setMode('login'), 1500);
          return;
        }
        throw new Error(data.error || 'Failed to sign up');
      }

      // Now sign in the user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      toast.success('สมัครสมาชิกสำเร็จ!', {
        description: 'เข้าสู่ระบบเรียบร้อย'
      });
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error('เกิดข้อผิดพลาด', {
        description: error.message || 'ไม่สามารถสมัครสมาชิกได้'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Check if error is "Email not confirmed"
        if (error.message.includes('Email not confirmed') || 
            error.message.includes('email_not_confirmed')) {
          
          console.log('Email not confirmed - attempting auto-fix via signup');
          
          // Auto-fix: Call signup endpoint to recreate with confirmed email
          try {
            const response = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/signup`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${publicAnonKey}`,
                },
                body: JSON.stringify({
                  email,
                  password,
                  name: email.split('@')[0],
                }),
              }
            );

            const signupData = await response.json();

            if (response.ok) {
              // Successfully recreated user - now login
              const { error: retryError } = await supabase.auth.signInWithPassword({
                email,
                password,
              });

              if (!retryError) {
                toast.success('เข้าสู่ระบบสำเร็จ!', {
                  description: 'บัญชีของคุณได้รับการแก้ไขอัตโนมัติ'
                });
                return;
              }
            }
          } catch (fixError) {
            console.error('Auto-fix failed:', fixError);
          }

          // If auto-fix failed, show helpful message
          toast.error('อีเมลยังไม่ได้รับการยืนยัน', {
            description: 'กรุณาสมัครสมาชิกใหม่อีกครั้ง'
          });
          setTimeout(() => setMode('signup'), 1500);
          return;
        }
        
        throw error;
      }

      if (data.session) {
        toast.success('เข้าสู่ระบบสำเร็จ!');
        // Page will auto-refresh/redirect via AppWithAuth
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error('เข้าสู่ระบบไม่สำเร็จ', {
        description: 'กรุณาตรวจสอบอีเมลและรหัสผ่าน'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    toast.info('💡 ระบบ Demo', {
      description: 'กรุณาสมัครสมาชิกใหม่ หรือเข้าสู่ระบบด้วยบัญชีของคุณ'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-200/30 to-pink-200/30 rounded-full blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="p-6 sm:p-8 bg-white/80 backdrop-blur-sm shadow-2xl border-2 border-white/50">
          {/* Header */}
          <motion.div 
            className="text-center mb-6 sm:mb-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <motion.div
              className="inline-flex p-3 sm:p-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg mb-4"
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
            >
              <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
            </motion.div>
            
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-full mb-3"
              whileHover={{ scale: 1.05 }}
            >
              <Sparkles className="h-4 w-4 text-yellow-500" />
              <span className="text-xs sm:text-sm text-blue-600">Professional BOQ System</span>
            </motion.div>

            <h1 className="text-2xl sm:text-3xl mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              BOQ Pro
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              ระบบจัดทำรายการถอดวัสดุมืออาชีพ
            </p>
          </motion.div>

          {/* Mode Tabs */}
          <div className="flex gap-2 mb-6 p-1 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 sm:py-3 px-4 rounded-md text-sm sm:text-base transition-all ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LogIn className="h-4 w-4 inline mr-2" />
              เข้าสู่ระบบ
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 sm:py-3 px-4 rounded-md text-sm sm:text-base transition-all ${
                mode === 'signup'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserPlus className="h-4 w-4 inline mr-2" />
              สมัครสมาชิก
            </button>
          </div>

          {/* Form */}
          <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-4">
            {mode === 'signup' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <Label htmlFor="name" className="text-sm">ชื่อ-นามสกุล (ไม่บังคับ)</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="กรอกชื่อ-นามสกุล"
                    className="pl-10 h-11 sm:h-12"
                  />
                </div>
              </motion.div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">อีเมล</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="pl-10 h-11 sm:h-12"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm">รหัสผ่าน</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-11 sm:h-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {mode === 'signup' && (
                <p className="text-xs text-muted-foreground">รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 sm:h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-sm sm:text-base shadow-lg"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <motion.div
                    className="h-4 w-4 border-2 border-white border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  กำลังดำเนินการ...
                </span>
              ) : mode === 'login' ? (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  เข้าสู่ระบบ
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  สมัครสมาชิก
                </>
              )}
            </Button>
          </form>

          {/* Quick Start Guide */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg"
          >
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-green-900 mb-2">
                  <strong>🚀 Quick Start:</strong>
                </p>
                <ol className="text-xs text-green-800 space-y-1 list-decimal list-inside">
                  <li>สมัครสมาชิกด้วยอีเมล (ไม่ต้องยืนยันอีเมล)</li>
                  <li>เข้าสู่ระบบอัตโนมัติ</li>
                  <li>เริ่มสร้างเอกสาร BOQ ได้เลย!</li>
                </ol>
              </div>
            </div>
          </motion.div>

          {/* Divider */}
          <div className="relative my-6">
            <Separator />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3">
              <span className="text-xs text-muted-foreground">Social Login (Coming Soon)</span>
            </div>
          </div>

          {/* Social Login (Disabled with notice) */}
          <div className="space-y-3 opacity-50 pointer-events-none">
            <Button
              type="button"
              disabled
              className="w-full h-11 sm:h-12 bg-white text-gray-700 border-2 border-gray-200 cursor-not-allowed"
            >
              <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-sm sm:text-base">Google (ยังไม่เปิดใช้งาน)</span>
            </Button>

            <Button
              type="button"
              disabled
              className="w-full h-11 sm:h-12 bg-[#1877F2] text-white cursor-not-allowed opacity-50"
            >
              <svg className="h-5 w-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span className="text-sm sm:text-base">Facebook (ยังไม่เปิดใช้งาน)</span>
            </Button>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-xs text-muted-foreground mb-2">
              การเข้าสู่ระบบ คุณยอมรับ{" "}
              <a href="#" className="text-primary hover:underline">เงื่อนไขการใช้งาน</a>
              {" และ "}
              <a href="#" className="text-primary hover:underline">นโยบายความเป็นส่วนตัว</a>
            </p>
          </div>

          {/* OAuth Setup Notice */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg"
          >
            <p className="text-xs text-blue-600 text-center">
              💡 <strong>Setup OAuth:</strong> ต้องการเข้าสู่ระบบด้วย Google/Facebook?
              <br />
              ดูวิธีตั้งค่าที่{" "}
              <a 
                href="https://supabase.com/docs/guides/auth/social-login" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:text-blue-800"
              >
                Supabase Docs
              </a>
            </p>
          </motion.div>
        </Card>

        {/* Bottom Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-6 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-muted-foreground">System Online • Email Login Ready</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
