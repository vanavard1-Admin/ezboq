import { supabase } from '../utils/supabase/client';
import { log } from '../utils/logger';
import { useState } from "react";
import { motion } from "motion/react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { FileText, Mail, Lock, User, LogIn, UserPlus, Eye, EyeOff, Sparkles, Zap, Package } from "lucide-react";
import { api } from "../utils/api";
import { toast } from "sonner";
import { SocialLogo } from "./SocialLogo";

interface LoginPageProps {
  onDemoLogin?: () => void;
}

export function LoginPage({ onDemoLogin }: LoginPageProps = {}) {
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
      const response = await api.post('/signup', {
        email,
        password,
        name: name || email.split('@')[0],
      });

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

      toast.success('🎉 สมัครสมาชิกสำเร็จ!', {
        description: 'เข้าสู่ระบบเรียบร้อยแล้ว (Free Plan)'
      });
    } catch (error: any) {
      log.error('Signup error:', error);
      const errorMsg = error.message || 'ไม่สามารถสมัครสมาชิกได้';
      toast.error('ไม่สามารถสมัครสมาชิก', {
        description: errorMsg.includes('already registered') ? 'อีเมลนี้มีในระบบแล้ว กรุณาเข้าสู่ระบบ' : 'กรุณาลองใหม่อีกครั้ง'
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
        log.error('Login error:', error);
        
        // Better error messages
        const isInvalidCredentials = error.message.includes('Invalid') || error.message.includes('credentials');
        
        toast.error('ไม่สามารถเข้าสู่ระบบได้', {
          description: isInvalidCredentials ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' : 'กรุณาลองใหม่อีกครั้ง'
        });
        // Check if error is "Email not confirmed"
        if (error.message.includes('Email not confirmed') || 
            error.message.includes('email_not_confirmed')) {
          
          log.info('Email not confirmed - attempting auto-fix via signup');
          
          // Auto-fix: Call signup endpoint to recreate with confirmed email
          try {
            const signupResponse = await api.post('/signup', {
              email,
              password,
              name: email.split('@')[0],
            });

            if (signupResponse && !signupResponse.error) {
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
            log.error('Auto-fix failed:', fixError);
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
        toast.success('🎉 เข้าสู่ระบบสำเร็จ!');
        // Page will auto-refresh/redirect via AppWithAuth
      }
    } catch (error: any) {
      log.error('Login error:', error);
      toast.error('เข้าสู่ระบบไม่สำเร็จ', {
        description: 'กรุณาตรวจสอบอีเมลและรหัสผ่าน'
      });
    } finally {
      setLoading(false);
    }
  };

  // Google Sign In
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      
      // Sign in with Google OAuth
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      });

      if (error) {
        log.error('Google sign in error:', error);
        
        // Check if provider is not enabled
        if (error.message.includes('provider is not enabled') || 
            error.message.includes('Unsupported provider')) {
          toast.error('🔧 Google Login ยังไม่พร้อมใช้งาน', {
            description: '⚙️ ต้องตั้งค่า Google Provider ใน Supabase ก่อน',
            duration: 6000
          });
        } else {
          toast.error('ไม่สามารถเข้าสู่ระบบด้วย Google ได้', {
            description: error.message || 'กรุณาตรวจสอบการตั้งค่า'
          });
        }
        return;
      }

      toast.info('กำลังเปลี่ยนเส้นทางไปยัง Google...', {
        description: 'กรุณารอสักครู่'
      });
    } catch (error: any) {
      log.error('Google sign in error:', error);
      toast.error('เกิดข้อผิดพลาด', {
        description: error.message || 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้'
      });
    } finally {
      setLoading(false);
    }
  };

  // Facebook Sign In
  const handleFacebookSignIn = async () => {
    try {
      setLoading(true);
      
      // Sign in with Facebook OAuth
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: window.location.origin,
        }
      });

      if (error) {
        log.error('Facebook sign in error:', error);
        
        // Check if provider is not enabled
        if (error.message.includes('provider is not enabled') || 
            error.message.includes('Unsupported provider')) {
          toast.error('🔧 Facebook Login ยังไม่พร้อมใช้งาน', {
            description: '⚙️ ต้องตั้งค่า Facebook Provider ใน Supabase ก่อน',
            duration: 6000
          });
        } else {
          toast.error('ไม่สามารถเข้าสู่ระบบด้วย Facebook ได้', {
            description: error.message || 'กรุณาตรวจสอบการตั้งค่า'
          });
        }
        return;
      }

      toast.info('กำลังเปลี่ยนเส้นทางไปยัง Facebook...', {
        description: 'กรุณารอสักครู่'
      });
    } catch (error: any) {
      log.error('Facebook sign in error:', error);
      toast.error('เกิดข้อผิดพลาด', {
        description: error.message || 'ไม่สามารถเข้าสู่ระบบด้วย Facebook ได้'
      });
    } finally {
      setLoading(false);
    }
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
        <Card className="p-6 sm:p-8 bg-white/90 backdrop-blur-md shadow-2xl border border-white/50">
          {/* Header */}
          <motion.div 
            className="text-center mb-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <motion.div
              className="inline-flex p-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-xl mb-4"
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
            >
              <FileText className="h-12 w-12 text-white" />
            </motion.div>
            
            <h1 className="text-3xl mb-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              BOQ Pro
            </h1>
            <p className="text-muted-foreground">
              ระบบจัดทำรายการถอดวัสดุมืออาชีพ
            </p>
          </motion.div>

          {/* Social Login Buttons - PROMINENT */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3 mb-6"
          >
            {/* Google Sign In */}
            <Button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              variant="outline"
              className="w-full h-13 bg-white border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-700 shadow-md hover:shadow-lg transition-all group"
            >
              <SocialLogo brand="google" className="h-5 w-5 mr-3 group-hover:scale-110 transition-transform" />
              <span className="font-semibold">เข้าสู่ระบบด้วย Google</span>
            </Button>

            {/* Facebook Sign In */}
            <Button
              type="button"
              onClick={handleFacebookSignIn}
              disabled={loading}
              className="w-full h-13 bg-[#1877F2] hover:bg-[#0C63D4] text-white shadow-md hover:shadow-lg transition-all group border-0"
            >
              <SocialLogo brand="facebook" className="h-5 w-5 mr-3 group-hover:scale-110 transition-transform" />
              <span className="font-semibold">เข้าสู่ระบบด้วย Facebook</span>
            </Button>
          </motion.div>

          {/* Divider */}
          <div className="relative my-6">
            <Separator />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4">
              <span className="text-sm text-muted-foreground">หรือ</span>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex gap-2 mb-6 p-1 bg-gradient-to-r from-gray-100 to-gray-50 rounded-lg">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-3 px-4 rounded-md transition-all ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LogIn className="h-4 w-4 inline mr-2" />
              เข้าสู่ระบบ
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-3 px-4 rounded-md transition-all ${
                mode === 'signup'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
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
                <Label htmlFor="name">ชื่อ-นามสกุล (ไม��บังคับ)</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="กรอกชื่อ-นามสกุล"
                    className="pl-11 h-12"
                  />
                </div>
              </motion.div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">อีเมล</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="pl-11 h-12"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-11 pr-11 h-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {mode === 'signup' && (
                <p className="text-xs text-muted-foreground">รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <motion.div
                    className="h-5 w-5 border-2 border-white border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  กำลังดำเนินการ...
                </span>
              ) : mode === 'login' ? (
                <>
                  <LogIn className="h-5 w-5 mr-2" />
                  เข้าสู่ระบบ
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5 mr-2" />
                  สมัครสมาชิก (ฟรี)
                </>
              )}
            </Button>
          </form>

          {/* Free Plan Badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg"
          >
            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-green-900 mb-2">
                  <strong>✨ สมัครฟรี! ใช้งานได้ทันที</strong>
                </p>
                <ul className="text-xs text-green-800 space-y-1">
                  <li>• ฟรี 900+ รายการวัสดุพร้อมใช้</li>
                  <li>• สร้าง BOQ, Quotation, Invoice</li>
                  <li>• Export PDF ได้เต็มรูปแบบ</li>
                  <li>• อัพเกรด VIP สำหรับฟีเจอร์เพิ่มเติม</li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-xs text-muted-foreground">
              การเข้าสู่ระบบ คุณยอมรับ{" "}
              <a href="#" className="text-primary hover:underline">เงื่อนไขการใช้งาน</a>
              {" และ "}
              <a href="#" className="text-primary hover:underline">นโยบายความเป็นส่วนตัว</a>
            </p>
          </div>
        </Card>

        {/* Bottom Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-muted-foreground">System Online • Free Plan Available</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}