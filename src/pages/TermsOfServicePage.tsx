import { motion } from "motion/react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Scale,
  UserCheck,
  CreditCard,
  RefreshCw,
  Ban,
  Shield,
  ArrowLeft,
  Mail,
} from "lucide-react";

interface TermsOfServicePageProps {
  onBack: () => void;
}

export function TermsOfServicePage({ onBack }: TermsOfServicePageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-600 text-white">
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
              <Scale className="w-12 h-12" />
              <h1 className="text-4xl font-bold">ข้อกำหนดและเงื่อนไข</h1>
            </div>
            <p className="text-xl text-white/90 mb-2">
              กฎระเบียบการใช้บริการ EZ BOQ
            </p>
            <Badge className="bg-white/20 text-white border-0">
              มีผลบังคับใช้: มกราคม 2025
            </Badge>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-12 max-w-4xl">
        {/* Introduction */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6 text-purple-600" />
              คำนำ
            </h2>
            <p className="text-gray-700 leading-relaxed">
              ยินดีต้อนรับสู่ <strong>EZ BOQ</strong> ระบบจัดการ Bill of Quantities สำหรับธุรกิจก่อสร้าง 
              โปรดอ่านข้อกำหนดและเงื่อนไขนี้อย่างละเอียดก่อนใช้บริการ การใช้บริการของเราถือว่าคุณยอมรับและตกลงตามข้อกำหนดทั้งหมด
            </p>
          </Card>
        </motion.div>

        {/* Sections */}
        {[
          {
            icon: UserCheck,
            title: "1. การยอมรับข้อกำหนด",
            content: (
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  เมื่อคุณเข้าใช้บริการ EZ BOQ คุณตกลงที่จะ:
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold">ยอมรับข้อกำหนดทั้งหมด</h4>
                      <p className="text-sm text-gray-600">รวมถึงการอัพเดทในอนาคต</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold">ปฏิบัติตามกฎหมายไทย</h4>
                      <p className="text-sm text-gray-600">และกฎระเบียบที่เกี่ยวข้อง</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold">ให้ข้อมูลที่ถูกต้อง</h4>
                      <p className="text-sm text-gray-600">และรับผิดชอบในการใช้งาน</p>
                    </div>
                  </div>
                </div>
              </div>
            ),
          },
          {
            icon: FileText,
            title: "2. การสมัครและบัญชีผู้ใช้",
            content: (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Card className="p-4 bg-blue-50">
                    <h4 className="font-semibold mb-2">การสร้างบัญชี</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• ต้องมีอายุ 18 ปีขึ้นไป</li>
                      <li>• ให้ข้อมูลที่ถูกต้องและครบถ้วน</li>
                      <li>• ใช้อีเมลที่ใช้งานได้จริง</li>
                      <li>• หนึ่งบุคคลสามารถมีบัญชีได้เพียงหนึ่งบัญชี</li>
                    </ul>
                  </Card>
                  <Card className="p-4 bg-purple-50">
                    <h4 className="font-semibold mb-2">ความรับผิดชอบของคุณ</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• รักษาความลับของรหัสผ่าน</li>
                      <li>• แจ้งทันทีหากพบการใช้งานที่ผิดปกติ</li>
                      <li>• รับผิดชอบการกระทำทั้งหมดในบัญชี</li>
                      <li>• ไม่แชร์บัญชีให้ผู้อื่นใช้</li>
                    </ul>
                  </Card>
                </div>
              </div>
            ),
          },
          {
            icon: CreditCard,
            title: "3. ค่าบริการและการชำระเงิน",
            content: (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="p-4 bg-green-50">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      แพ็คเกจฟรี
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• ใช้งานได้ตลอดชีพ</li>
                      <li>• ฟีเจอร์พื้นฐาน</li>
                      <li>• จำกัด 1 BOQ/เดือน</li>
                    </ul>
                  </Card>
                  <Card className="p-4 bg-purple-50">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-purple-600" />
                      แพ็คเกจ VIP
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• ชำระรายเดือน/รายปี</li>
                      <li>• ฟีเจอร์ครบถ้วน</li>
                      <li>• BOQ ไม่จำกัด</li>
                    </ul>
                  </Card>
                </div>
                <Card className="p-4 bg-yellow-50 border-yellow-200">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    เงื่อนไขการชำระเงิน
                  </h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• ราคาแสดงเป็นบาทไทย รวม VAT 7%</li>
                    <li>• ชำระผ่าน Omise (บัตรเครดิต/PromptPay)</li>
                    <li>• ต่ออายุอัตโนมัติ (ยกเลิกได้ทุกเมื่อ)</li>
                    <li>• ไม่คืนเงินสำหรับบริการที่ใช้ไปแล้ว</li>
                  </ul>
                </Card>
              </div>
            ),
          },
          {
            icon: RefreshCw,
            title: "4. การยกเลิกและคืนเงิน",
            content: (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Card className="p-4 bg-green-50">
                    <h4 className="font-semibold mb-2">นโยบายการยกเลิก</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>✅ ยกเลิกได้ทุกเมื่อโดยไม่มีค่าปรับ</li>
                      <li>✅ ใช้งานได้จนครบรอบชำระเงิน</li>
                      <li>✅ ข้อมูลจะถูกเก็บไว้ 30 วัน</li>
                      <li>✅ สามารถดาวน์โหลดข้อมูลก่อนยกเลิก</li>
                    </ul>
                  </Card>
                  <Card className="p-4 bg-red-50 border-red-200">
                    <h4 className="font-semibold mb-2">นโยบายคืนเงิน</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• ไม่คืนเงินสำหรับบริการที่ใช้ไปแล้ว</li>
                      <li>• กรณีมีปัญหาทางเทคนิค: พิจารณาเป็นรายกรณี</li>
                      <li>• ระยะเวลาคืนเงิน: 7-14 วันทำการ</li>
                    </ul>
                  </Card>
                </div>
              </div>
            ),
          },
          {
            icon: Shield,
            title: "5. การใช้บริการที่เหมาะสม",
            content: (
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  คุณตกลงที่จะ <strong>ไม่</strong> ทำสิ่งต่อไปนี้:
                </p>
                <div className="space-y-2">
                  {[
                    "ใช้บริการเพื่อการผิดกฎหมาย",
                    "แชร์หรือเผยแพร่ข้อมูลส่วนตัวของผู้อื่น",
                    "ทำลาย แฮก หรือรบกวนระบบ",
                    "ใช้ bot หรือ automation ที่ไม่ได้รับอนุญาต",
                    "คัดลอกหรือทำซ้ำระบบเพื่อการค้า",
                    "ใช้งานเกินกว่าที่แพ็คเกจกำหนด",
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ),
          },
          {
            icon: Ban,
            title: "6. การระงับและยุติบริการ",
            content: (
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  เราขอสงวนสิทธิ์ในการระงับหรือยุติบัญชีของคุณหาก:
                </p>
                <div className="space-y-2">
                  {[
                    "ละเมิดข้อกำหนดนี้",
                    "ค้างชำระค่าบริการ",
                    "ใช้งานในทางที่ผิด",
                    "ทำให้เกิดความเสียหายต่อระบบ",
                  ].map((reason, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{reason}</span>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-600">
                  เราจะแจ้งให้คุณทราบล่วงหน้าและให้โอกาสในการแก้ไข เว้นแต่กรณีร้ายแรง
                </p>
              </div>
            ),
          },
          {
            icon: Scale,
            title: "7. ข้อจำกัดความรับผิดชอบ",
            content: (
              <div className="space-y-4">
                <Card className="p-4 bg-yellow-50 border-yellow-200">
                  <h4 className="font-semibold mb-2">บริการ "ตามสภาพ"</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    เราพยายามให้บริการที่ดีที่สุด แต่ไม่สามารถรับประกันว่าบริการจะไม่มีข้อผิดพลาดหรือหยุดชะงักชั่วคราว
                  </p>
                </Card>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">เราไม่รับผิดชอบต่อ:</p>
                  <ul className="text-sm text-gray-600 space-y-1 pl-4">
                    <li>• ความสูญเสียทางธุรกิจหรือกำไร</li>
                    <li>• ข้อมูลที่สูญหาย (แนะนำให้ backup เอง)</li>
                    <li>• ความเสียหายจากการใช้งานผิดวิธี</li>
                    <li>• ข้อผิดพลาดในการคำนวณ (ควรตรวจสอบก่อนใช้งานจริง)</li>
                  </ul>
                </div>
              </div>
            ),
          },
          {
            icon: FileText,
            title: "8. ทรัพย์สินทางปัญญา",
            content: (
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  เนื้อหา โค้ด ดีไซน์ และทรัพย์สินทางปัญญาทั้งหมดของ EZ BOQ เป็นของเรา
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="p-4 bg-green-50">
                    <h4 className="font-semibold mb-2">สิ่งที่คุณทำได้</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>✅ ใช้บริการตามแพ็คเกจ</li>
                      <li>✅ สร้างเอกสารของคุณเอง</li>
                      <li>✅ Export ไฟล์ของคุณ</li>
                    </ul>
                  </Card>
                  <Card className="p-4 bg-red-50">
                    <h4 className="font-semibold mb-2">สิ่งที่คุณไม่สามารถทำ</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>❌ คัดลอกระบบ</li>
                      <li>❌ Reverse engineer</li>
                      <li>❌ ขายต่อบริการ</li>
                    </ul>
                  </Card>
                </div>
              </div>
            ),
          },
          {
            icon: RefreshCw,
            title: "9. การเปลี่ยนแปลงข้อกำหนด",
            content: (
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  เราอาจปรับปรุงข้อกำหนดนี้เป็นครั้งคราว เราจะแจ้งให้คุณทราบผ่าน:
                </p>
                <div className="grid md:grid-cols-3 gap-3">
                  <Card className="p-4 text-center">
                    <Mail className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                    <p className="text-sm font-semibold">อีเมล</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                    <p className="text-sm font-semibold">แจ้งเตือนในระบบ</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                    <p className="text-sm font-semibold">หน้านี้</p>
                  </Card>
                </div>
                <p className="text-sm text-gray-600">
                  การใช้บริการต่อไปหลังจากมีการเปลี่ยนแปลง ถือว่าคุณยอมรับข้อกำหนดใหม่
                </p>
              </div>
            ),
          },
          {
            icon: Mail,
            title: "10. การติดต่อ",
            content: (
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  หากมีข้อสงสัยเกี่ยวกับข้อกำหนดนี้ ติดต่อเราได้ที่:
                </p>
                <Card className="p-4 bg-purple-50">
                  <div className="space-y-2">
                    <p className="text-sm">
                      <strong>อีเมล:</strong>{" "}
                      <a href="mailto:Admin@EzBOQ.com" className="text-purple-600 hover:underline">
                        Admin@EzBOQ.com
                      </a>
                    </p>
                    <p className="text-sm">
                      <strong>เวลาตอบกลับ:</strong> ภายใน 24-48 ชั่วโมง
                    </p>
                  </div>
                </Card>
              </div>
            ),
          },
        ].map((section, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.05 }}
            className="mb-8"
          >
            <Card className="p-6 hover:shadow-lg transition-all">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                  <section.icon className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold pt-2">{section.title}</h2>
              </div>
              {section.content}
            </Card>
          </motion.div>
        ))}

        {/* Final Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <Card className="p-8 bg-gradient-to-br from-purple-600 to-indigo-600 text-white text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">ขอบคุณที่ใช้บริการ EZ BOQ</h2>
            <p className="text-white/90 mb-6">
              เราพร้อมให้บริการและสนับสนุนคุณในทุกขั้นตอน
            </p>
            <Button
              onClick={() => window.open('mailto:Admin@EzBOQ.com', '_blank')}
              className="bg-white text-purple-600 hover:bg-gray-100"
            >
              <Mail className="w-4 h-4 mr-2" />
              ติดต่อเรา
            </Button>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
