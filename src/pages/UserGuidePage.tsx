import { motion } from "motion/react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  BookOpen,
  Play,
  FileText,
  Users,
  Handshake,
  Receipt,
  BarChart3,
  Settings,
  HelpCircle,
  ArrowRight,
  CheckCircle,
  Zap,
  Target,
  Sparkles,
  ArrowLeft,
  Youtube,
  Mail,
  Download,
} from "lucide-react";

interface UserGuidePageProps {
  onBack: () => void;
}

export function UserGuidePage({ onBack }: UserGuidePageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white">
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
              <BookOpen className="w-12 h-12" />
              <h1 className="text-4xl font-bold">คู่มือการใช้งาน</h1>
            </div>
            <p className="text-xl text-white/90 mb-2">
              เริ่มต้นใช้งาน EZ BOQ อย่างมืออาชีพ
            </p>
            <Badge className="bg-white/20 text-white border-0">
              ง่าย • รวดเร็ว • ครบครัน
            </Badge>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-12 max-w-6xl">
        {/* Quick Start */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <Card className="p-8 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">เริ่มต้นใช้งานใน 3 ขั้นตอน</h2>
                <p className="text-sm text-muted-foreground">ภายใน 5 นาที!</p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  step: "1",
                  icon: Settings,
                  title: "ตั้งค่าโปรไฟล์",
                  description: "กรอกข้อมูลบริษัท เลขผู้เสียภาษี และบัญชีธนาคาร",
                  color: "from-blue-500 to-cyan-500",
                },
                {
                  step: "2",
                  icon: FileText,
                  title: "สร้าง BOQ แรก",
                  description: "เลือกเทมเพลตหรือสร้างใหม่ เพิ่มรายการวัสดุ",
                  color: "from-purple-500 to-pink-500",
                },
                {
                  step: "3",
                  icon: Download,
                  title: "Export เอกสาร",
                  description: "ส่งออกเป็น PDF พร้อมใช้งานทันที",
                  color: "from-green-500 to-emerald-500",
                },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  whileHover={{ y: -4 }}
                >
                  <Card className="p-6 h-full hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center`}>
                        <span className="text-xl font-bold text-white">{item.step}</span>
                      </div>
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.color} opacity-20 flex items-center justify-center`}>
                        <item.icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <h3 className="font-bold mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Workflow Guide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-12"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">ขั้นตอนการทำงาน 4 ขั้น</h2>
            <p className="text-muted-foreground">จากการถอดราคาไปจนถึงเอกสารภาษี ครบวงจร</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "Step 1",
                icon: FileText,
                title: "BOQ",
                subtitle: "Bill of Quantities",
                description: "ถอดปริมาณงานและวัสดุ",
                features: [
                  "Catalog 900+ รายการ",
                  "SmartBOQ AI",
                  "คำนวณอัตโนมัติ",
                ],
                gradient: "from-blue-500 to-cyan-500",
              },
              {
                step: "Step 2",
                icon: Receipt,
                title: "Quotation",
                subtitle: "ใบเสนอราคา",
                description: "สร้างใบเสนอราคามืออาชีพ",
                features: [
                  "เพิ่มส่วนลด",
                  "แบ่งงวดชำระ",
                  "QR Code PromptPay",
                ],
                gradient: "from-purple-500 to-pink-500",
              },
              {
                step: "Step 3",
                icon: FileText,
                title: "Invoice",
                subtitle: "ใบแจ้งหนี้",
                description: "ออกใบแจ้งหนี้",
                features: [
                  "ตรวจสอบงวดชำระ",
                  "คำนวณ VAT",
                  "ติดตามหนี้",
                ],
                gradient: "from-green-500 to-emerald-500",
              },
              {
                step: "Step 4",
                icon: Receipt,
                title: "Tax Invoice",
                subtitle: "ใบกำกับภาษี/ใบเสร็จ",
                description: "เอกสารภาษีถูกต้องตามกฎหมาย",
                features: [
                  "ใบกำกับภาษี",
                  "หัก ณ ที่จ่าย",
                  "พร้อมใช้จริง",
                ],
                gradient: "from-orange-500 to-red-500",
              },
            ].map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <Card className="p-6 h-full hover:shadow-xl transition-all border-2 hover:border-purple-200">
                  <div className={`w-full h-3 rounded-full bg-gradient-to-r ${step.gradient} mb-4`} />
                  <Badge className="mb-3">{step.step}</Badge>
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center mb-4`}>
                    <step.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{step.subtitle}</p>
                  <p className="text-sm text-gray-700 mb-4">{step.description}</p>
                  <div className="space-y-2">
                    {step.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-xs text-gray-600">{feature}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Feature Guides */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mb-12"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">คำแนะนำการใช้งานฟีเจอร์</h2>
            <p className="text-muted-foreground">ทำความเข้าใจแต่ละฟีเจอร์</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: Users,
                title: "จัดการลูกค้า",
                description: "เพิ่ม แก้ไข และจัดเก็บข้อมูลลูกค้า สามารถเชื่อมโยงกับเอกสารได้",
                tips: [
                  "เก็บข้อมูลติดต่อครบถ้วน",
                  "ระบุประเภทลูกค้า (บุคคล/นิติบุคคล)",
                  "เพิ่มเลขผู้เสียภาษีเพื่อออกใบกำกับภาษี",
                ],
                color: "from-blue-500 to-cyan-500",
              },
              {
                icon: Handshake,
                title: "จัดการพาร์ทเนอร์",
                description: "บันทึกข้อมูลผู้รับเหมาช่วงและผู้ให้บริการ คำนวณต้นทุนและกำไร",
                tips: [
                  "แยกประเภทพาร์ทเนอร์ชัดเจน",
                  "บันทึกข้อมูลราคาและเงื่อนไข",
                  "เชื่อมโยงกับโครงการ",
                ],
                color: "from-purple-500 to-pink-500",
              },
              {
                icon: BarChart3,
                title: "รายงานและสถิติ",
                description: "วิเคราะห์ข้อมูลธุรกิจ ดูสถิติรายได้ กำไร และประสิทธิภาพ",
                tips: [
                  "เปรียบเทียบรายเดือน",
                  "ติดตามกำไรสุทธิ",
                  "วิเคราะห์ประเภทโครงการ",
                ],
                color: "from-green-500 to-emerald-500",
              },
              {
                icon: Sparkles,
                title: "SmartBOQ AI",
                description: "สร้าง BOQ อัตโนมัติด้วย AI จาก 8 ประเภทโครงการ ประหยัดเวลา",
                tips: [
                  "เลือกประเภทโครงการที่ต้องการ",
                  "ระบุขนาดพื้นที่",
                  "ปรับแต่งรายการตามต้องการ",
                ],
                color: "from-orange-500 to-red-500",
              },
              {
                icon: Settings,
                title: "ตั้งค่า Profile",
                description: "กำหนดค่าต่างๆ เช่น % กำไร, % ค่าดำเนินการ, ข้อมูลธนาคาร",
                tips: [
                  "ตั้งค่า % ให้เหมาะกับธุรกิจ",
                  "เพิ่มบัญชีธนาคารหลายบัญชี",
                  "อัพโหลด QR PromptPay",
                ],
                color: "from-indigo-500 to-purple-500",
              },
              {
                icon: Receipt,
                title: "ภาษีและหัก ณ ที่จ่าย",
                description: "จัดการภาษีมูลค่าเพิ่ม (VAT) และภาษีหัก ณ ที่จ่ายอัตโนมัติ",
                tips: [
                  "ระบบคำนวณ VAT 7% อัตโนมัติ",
                  "เลือกอัตราหัก ณ ที่จ่าย (1%, 3%, 5%)",
                  "ออกใบกำกับภาษีถูกต้อง",
                ],
                color: "from-pink-500 to-rose-500",
              },
            ].map((guide, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 + index * 0.1 }}
                whileHover={{ y: -4 }}
              >
                <Card className="p-6 hover:shadow-xl transition-all h-full">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${guide.color} flex items-center justify-center flex-shrink-0`}>
                      <guide.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold mb-1">{guide.title}</h3>
                      <p className="text-sm text-gray-600">{guide.description}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-700 mb-2">💡 เคล็ดลับ:</p>
                    {guide.tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-2 pl-2">
                        <ArrowRight className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-gray-600">{tip}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Tips & Tricks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="mb-12"
        >
          <Card className="p-8 bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">เคล็ดลับใช้งานอย่างมืออาชีพ</h2>
                <p className="text-sm text-muted-foreground">Pro Tips จากผู้เชี่ยวชาญ</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {[
                {
                  icon: Sparkles,
                  tip: "ใช้เทมเพลต",
                  detail: "บันทึกโครงการที่ทำบ่อยเป็นเทมเพลต ประหยัดเวลาครั้งต่อไป",
                },
                {
                  icon: CheckCircle,
                  tip: "ตรวจสอบก่อน Export",
                  detail: "ดู Preview PDF ก่อนส่งลูกค้า เช็คความถูกต้องทุกครั้ง",
                },
                {
                  icon: Download,
                  tip: "Backup ข้อมูล",
                  detail: "Export ข้อมูลสำคัญเป็นไฟล์สำรองเป็นประจำ",
                },
                {
                  icon: BarChart3,
                  tip: "ติดตามสถิติ",
                  detail: "เช็ครายงานเป็นประจำ เพื่อวิเคราะห์ธุรกิจและวางแผน",
                },
                {
                  icon: Users,
                  tip: "บันทึกข้อมูลลูกค้า",
                  detail: "เก็บข้อมูลลูกค้าไว้ครบ จะได้ไม่ต้องกรอกซ้ำ",
                },
                {
                  icon: Settings,
                  tip: "ตั้งค่า % ให้เหมาะสม",
                  detail: "ปรับ % กำไรให้เหมาะกับแต่ละประเภทงาน",
                },
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-3 p-4 bg-white rounded-lg">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">{item.tip}</h4>
                    <p className="text-xs text-gray-600">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.7 }}
          className="mb-12"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">คำถามที่พบบ่อย (FAQ)</h2>
            <p className="text-muted-foreground">คำตอบสำหรับคำถามยอดฮิต</p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "ต้องเสียค่าใช้จ่ายไหม?",
                a: "มีแพ็คเกจฟรีให้ทดลองใช้ (จำกัด 1 BOQ/เดือน) และแพ็คเกจ VIP สำหรับใช้งานเต็มรูปแบบ",
              },
              {
                q: "ข้อมูลปลอดภัยไหม?",
                a: "ปลอดภัย 100% เข้ารหัสด้วย SSL/TLS จัดเก็บบน Supabase มีระบบสำรองข้อมูลอัตโนมัติ",
              },
              {
                q: "ใช้ยากไหม?",
                a: "ไม่ยากเลย! ออกแบบให้ใช้งานง่าย ภายใน 5 นาทีก็เริ่มสร้าง BOQ ได้แล้ว",
              },
              {
                q: "มี Catalog วัสดุครบไหม?",
                a: "ครบมาก! มีมากกว่า 900 รายการใน 40 หมวดหมู่ ครอบคลุมงานก่อสร้างทุกประเภท",
              },
              {
                q: "Export ไฟล์ได้หรือไม่?",
                a: "ได้ครับ Export เป็น PDF คุณภาพสูง พร้อมใช้งานทันที",
              },
              {
                q: "ทีมงานสนับสนุนตอบเร็วไหม?",
                a: "ตอบภายใน 24 ชั่วโมง สมาชิก VIP ได้รับการสนับสนุนเร็วกว่า",
              },
            ].map((faq, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <HelpCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold mb-2">{faq.q}</h4>
                    <p className="text-sm text-gray-600">{faq.a}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Video Tutorials */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.9 }}
          className="mb-12"
        >
          <Card className="p-8 bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200">
            <div className="text-center">
              <Youtube className="w-16 h-16 mx-auto mb-4 text-red-600" />
              <h2 className="text-2xl font-bold mb-2">วิดีโอสอนการใช้งาน</h2>
              <p className="text-muted-foreground mb-6">
                (เร็วๆ นี้!) วิดีโอแนะนำและเคล็ดลับการใช้งาน
              </p>
              <Badge className="bg-red-100 text-red-700 border-0">
                กำลังจัดทำ
              </Badge>
            </div>
          </Card>
        </motion.div>

        {/* Contact Support */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2 }}
        >
          <Card className="p-8 bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-center">
            <Mail className="w-12 h-12 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">ยังมีคำถามอื่นๆ?</h2>
            <p className="text-white/90 mb-6">
              ทีมงานของเรายินดีให้คำปรึกษาและช่วยเหลือตลอดเวลา
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => window.open('mailto:Admin@EzBOQ.com', '_blank')}
                className="bg-white text-indigo-600 hover:bg-gray-100"
              >
                <Mail className="w-4 h-4 mr-2" />
                ส่งอีเมล
              </Button>
              <Button
                onClick={onBack}
                variant="outline"
                className="border-white text-white hover:bg-white/10"
              >
                กลับหน้าหลัก
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
