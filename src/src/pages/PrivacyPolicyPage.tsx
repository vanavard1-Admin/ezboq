import { motion } from "motion/react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Shield,
  Lock,
  Eye,
  Database,
  UserCheck,
  FileText,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Download,
  Mail,
} from "lucide-react";

interface PrivacyPolicyPageProps {
  onBack: () => void;
}

export function PrivacyPolicyPage({ onBack }: PrivacyPolicyPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 text-white">
        <div className="container mx-auto px-4 sm:px-6 py-8">
          <Button
            onClick={onBack}
            variant="ghost"
            className="mb-4 text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            กลับ
          </Button>
          
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Shield className="w-12 h-12" />
              <h1 className="text-4xl font-bold">นโยบายความเป็นส่วนตัว</h1>
            </div>
            <p className="text-xl text-white/90 mb-2">
              เราให้ความสำคัญกับข้อมูลส่วนบุคคลของคุณ
            </p>
            <Badge className="bg-white/20 text-white border-0">
              อัพเดทล่าสุด: มกราคม 2025
            </Badge>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-12 max-w-4xl">
        {/* Quick Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-blue-600" />
              สรุปสั้นๆ
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { icon: Lock, text: "เข้ารหัสข้อมูลทั้งหมด SSL/TLS" },
                { icon: Database, text: "จัดเก็บบน Supabase ปลอดภัย" },
                { icon: Eye, text: "ไม่แชร์ข้อมูลให้บุคคลที่สาม" },
                { icon: UserCheck, text: "คุณควบคุมข้อมูลของคุณเอง" },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm">{item.text}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Sections */}
        {[
          {
            icon: Database,
            title: "1. ข้อมูลที่เราเก็บรวบรวม",
            content: (
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  เราเก็บรวบรวมข้อมูลที่จำเป็นเพื่อให้บริการแก่คุณ:
                </p>
                <div className="space-y-3">
                  <div className="pl-4 border-l-4 border-blue-500">
                    <h4 className="font-semibold mb-1">ข้อมูลส่วนบุคคล</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• ชื่อ-นามสกุล</li>
                      <li>• อีเมล</li>
                      <li>• เบอร์โทรศัพท์</li>
                      <li>• ที่อยู่บริษัท</li>
                    </ul>
                  </div>
                  <div className="pl-4 border-l-4 border-cyan-500">
                    <h4 className="font-semibold mb-1">ข้อมูลธุรกิจ</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• ข้อมูลโครงการ BOQ</li>
                      <li>• รายการวัสดุก่อสร้าง</li>
                      <li>• เอกสารใบเสนอราคา/ใบแจ้งหนี้</li>
                      <li>• ข้อมูลลูกค้าและพาร์ทเนอร์</li>
                    </ul>
                  </div>
                  <div className="pl-4 border-l-4 border-purple-500">
                    <h4 className="font-semibold mb-1">ข้อมูลการใช้งาน</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Log การเข้าใช้งาน</li>
                      <li>• IP Address</li>
                      <li>• Browser และ Device</li>
                      <li>• เวลาการใช้งาน</li>
                    </ul>
                  </div>
                </div>
              </div>
            ),
          },
          {
            icon: Lock,
            title: "2. วิธีการรักษาความปลอดภัย",
            content: (
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  เราใช้มาตรการรักษาความปลอดภัยระดับสูงสุด:
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="p-4 bg-green-50 border-green-200">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      การเข้ารหัส
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• SSL/TLS 256-bit</li>
                      <li>• Encryption at rest</li>
                      <li>• Secure authentication</li>
                    </ul>
                  </Card>
                  <Card className="p-4 bg-blue-50 border-blue-200">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                      โครงสร้างพื้นฐาน
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Supabase Cloud</li>
                      <li>• Auto backup</li>
                      <li>• 99.9% uptime</li>
                    </ul>
                  </Card>
                  <Card className="p-4 bg-purple-50 border-purple-200">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-purple-600" />
                      การควบคุมการเข้าถึง
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Row Level Security</li>
                      <li>• User authentication</li>
                      <li>• API rate limiting</li>
                    </ul>
                  </Card>
                  <Card className="p-4 bg-orange-50 border-orange-200">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-orange-600" />
                      การตรวจสอบ
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Audit logging</li>
                      <li>• Security monitoring</li>
                      <li>• Regular updates</li>
                    </ul>
                  </Card>
                </div>
              </div>
            ),
          },
          {
            icon: Eye,
            title: "3. การใช้ข้อมูลของคุณ",
            content: (
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  เราใช้ข้อมูลของคุณเพื่อ:
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold">ให้บริการระบบ BOQ</h4>
                      <p className="text-sm text-gray-600">สร้าง บันทึก และจัดการเอกสารของคุณ</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold">ปรับปรุงบริการ</h4>
                      <p className="text-sm text-gray-600">วิเคราะห์การใช้งานเพื่อพัฒนาฟีเจอร์ใหม่</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold">การสนับสนุนลูกค้า</h4>
                      <p className="text-sm text-gray-600">ตอบคำถามและแก้ไขปัญหา</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold">แจ้งข่าวสาร</h4>
                      <p className="text-sm text-gray-600">อัพเดทฟีเจอร์ใหม่และข้อมูลสำคัญ</p>
                    </div>
                  </div>
                </div>
                <Card className="p-4 bg-red-50 border-red-200">
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    สิ่งที่เราไม่ทำ
                  </h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>❌ ไม่ขายข้อมูลของคุณให้ใคร</li>
                    <li>❌ ไม่แชร์ข้อมูลกับบุคคลที่สาม</li>
                    <li>❌ ไม่ส่งสปามหรือโฆษณาที่ไม่เกี่ยวข้อง</li>
                    <li>❌ ไม่เข้าถึงข้อมูลของคุณโดยไม่ได้รับอนุญาต</li>
                  </ul>
                </Card>
              </div>
            ),
          },
          {
            icon: UserCheck,
            title: "4. สิทธิ์ของคุณ",
            content: (
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  คุณมีสิทธิ์เต็มที่ในการจัดการข้อมูลของคุณ:
                </p>
                <div className="grid md:grid-cols-2 gap-3">
                  {[
                    { icon: Eye, title: "เข้าถึงข้อมูล", desc: "ดูข้อมูลทั้งหมดที่เราเก็บ" },
                    { icon: FileText, title: "แก้ไขข้อมูล", desc: "เปลี่ยนแปลงข้อมูลส่วนตัว" },
                    { icon: Download, title: "ส่งออกข้อมูล", desc: "ดาวน์โหลดข้อมูลทั้งหมด" },
                    { icon: AlertCircle, title: "ลบข้อมูล", desc: "ลบบัญชีและข้อมูลถาวร" },
                  ].map((right, index) => (
                    <Card key={index} className="p-4 hover:shadow-lg transition-all">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <right.icon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold mb-1">{right.title}</h4>
                          <p className="text-xs text-gray-600">{right.desc}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                <p className="text-sm text-gray-600">
                  หากต้องการใช้สิทธิ์เหล่านี้ กรุณาติดต่อ{" "}
                  <a href="mailto:Admin@EzBOQ.com" className="text-blue-600 hover:underline">
                    Admin@EzBOQ.com
                  </a>
                </p>
              </div>
            ),
          },
          {
            icon: FileText,
            title: "5. คุกกี้และเทคโนโลยีติดตาม",
            content: (
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  เราใช้คุกกี้เพื่อปรับปรุงประสบการณ์การใช้งาน:
                </p>
                <div className="space-y-3">
                  <Card className="p-4 bg-blue-50">
                    <h4 className="font-semibold mb-2">คุกกี้ที่จำเป็น</h4>
                    <p className="text-sm text-gray-600">
                      สำหรับการทำงานพื้นฐานของระบบ เช่น การเข้าสู่ระบบ การจดจำ session
                    </p>
                  </Card>
                  <Card className="p-4 bg-green-50">
                    <h4 className="font-semibold mb-2">คุกกี้การวิเคราะห์</h4>
                    <p className="text-sm text-gray-600">
                      เพื่อวิเคราะห์การใช้งานและปรับปรุงบริการ (คุณสามาร��ปิดได้)
                    </p>
                  </Card>
                </div>
              </div>
            ),
          },
          {
            icon: Shield,
            title: "6. การเปลี่ยนแปลงนโยบาย",
            content: (
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  เราอาจปรับปรุงนโยบายนี้เป็นครั้งคราว เราจะแจ้งให้คุณทราบผ่าน:
                </p>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                    <span>อีเมลแจ้งเตือน</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <span>การแจ้งเตือนในระบบ</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                    <span>อัพเดทหน้านโยบายนี้</span>
                  </li>
                </ul>
              </div>
            ),
          },
        ].map((section, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className="mb-8"
          >
            <Card className="p-6 hover:shadow-lg transition-all">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                  <section.icon className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold pt-2">{section.title}</h2>
              </div>
              {section.content}
            </Card>
          </motion.div>
        ))}

        {/* Contact Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="p-8 bg-gradient-to-br from-blue-600 to-cyan-600 text-white text-center">
            <Mail className="w-12 h-12 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">มีคำถามเกี่ยวกับความเป็นส่วนตัว?</h2>
            <p className="text-white/90 mb-6">
              ติดต่อเราได้ตลอดเวลา เรายินดีตอบทุกข้อสงสัย
            </p>
            <Button
              onClick={() => window.open('mailto:Admin@EzBOQ.com', '_blank')}
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              <Mail className="w-4 h-4 mr-2" />
              ส่งอีเมลถามเรา
            </Button>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
