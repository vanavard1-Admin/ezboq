import { motion } from "motion/react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  MessageSquare,
  HeadphonesIcon,
  Zap,
  Shield,
  Award,
  ArrowLeft,
} from "lucide-react";

interface ContactPageProps {
  onBack: () => void;
}

export function ContactPage({ onBack }: ContactPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600 text-white">
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
            <h1 className="text-4xl font-bold mb-4">ติดต่อเรา</h1>
            <p className="text-xl text-white/90">
              ยินดีให้บริการและตอบข้อสงสัยทุกเรื่อง
            </p>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-12">
        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          {/* Contact Cards */}
          {[
            {
              icon: Mail,
              title: "อีเมล",
              value: "Admin@EzBOQ.com",
              description: "ตอบภายใน 24 ชั่วโมง",
              gradient: "from-blue-500 to-cyan-500",
              link: "mailto:Admin@EzBOQ.com",
            },
            {
              icon: Phone,
              title: "โทรศัพท์",
              value: "02-XXX-XXXX",
              description: "จันทร์-ศุกร์ 9:00-18:00",
              gradient: "from-green-500 to-emerald-500",
              link: "tel:02XXXXXXX",
            },
            {
              icon: MessageSquare,
              title: "Line Official",
              value: "@EzBOQ",
              description: "แชทสดตอบไว",
              gradient: "from-purple-500 to-pink-500",
              link: "https://line.me/",
            },
          ].map((contact, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -4 }}
            >
              <Card className="p-6 hover:shadow-xl transition-all border-2 hover:border-purple-200 h-full">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${contact.gradient} flex items-center justify-center mb-4 mx-auto`}>
                  <contact.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-center font-semibold mb-2">{contact.title}</h3>
                <p className="text-center text-lg font-bold text-purple-600 mb-2">
                  {contact.value}
                </p>
                <p className="text-center text-sm text-muted-foreground mb-4">
                  {contact.description}
                </p>
                <Button
                  onClick={() => window.open(contact.link, '_blank')}
                  className={`w-full bg-gradient-to-r ${contact.gradient} hover:opacity-90`}
                >
                  <Send className="w-4 h-4 mr-2" />
                  ติดต่อเลย
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Office Hours */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-12"
        >
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">เวลาทำการ</h2>
                <p className="text-sm text-muted-foreground">เราพร้อมให้บริการ</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <span className="font-medium">จันทร์ - ศุกร์</span>
                  <Badge className="bg-green-100 text-green-700 border-0">
                    09:00 - 18:00 น.
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <span className="font-medium">เสาร์</span>
                  <Badge className="bg-blue-100 text-blue-700 border-0">
                    09:00 - 15:00 น.
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <span className="font-medium">อาทิตย์ และวันหยุดนักขัตฤกษ์</span>
                  <Badge className="bg-red-100 text-red-700 border-0">
                    ปิดทำการ
                  </Badge>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border-2 border-purple-200">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <HeadphonesIcon className="w-5 h-5 text-purple-600" />
                  การสนับสนุนนอกเวลา
                </h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-purple-600 mt-0.5" />
                    <span>สมาชิก VIP: สนับสนุนตลอด 24/7</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Mail className="w-4 h-4 text-purple-600 mt-0.5" />
                    <span>Email: ตอบภายใน 24 ชั่วโมง</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-purple-600 mt-0.5" />
                    <span>Line: ตอบไวในเวลาทำการ</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Location */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-12"
        >
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">ที่อยู่บริษัท</h2>
                <p className="text-sm text-muted-foreground">มาเยือนเราได้</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-gray-700 mb-4 leading-relaxed">
                  <strong>บริษัท EZ BOQ จำกัด</strong><br />
                  เลขที่ XXX ถนนXXXXXX<br />
                  แขวง/ตำบล XXXXX เขต/อำเภอ XXXXX<br />
                  กรุงเทพมหานคร 10XXX<br />
                  ประเทศไทย
                </p>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    โทร: 02-XXX-XXXX
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    อีเมล: Admin@EzBOQ.com
                  </p>
                </div>
              </div>

              <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MapPin className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-sm">แผนที่</p>
                  <p className="text-xs">(สามารถเพิ่ม Google Maps ได้)</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* FAQ Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="p-8 bg-gradient-to-br from-purple-600 to-pink-600 text-white">
            <h2 className="text-2xl font-bold mb-6 text-center">คำถามที่พบบ่อย</h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: Shield,
                  title: "ความปลอดภัย",
                  description: "ข้อมูลของคุณปลอดภัยแค่ไหน?",
                },
                {
                  icon: Award,
                  title: "แพ็คเกจ VIP",
                  description: "ความแตกต่างของแต่ละแพ็คเกจ",
                },
                {
                  icon: Zap,
                  title: "วิธีใช้งาน",
                  description: "เริ่มต้นใช้งานอย่างไร?",
                },
              ].map((faq, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
                    <faq.icon className="w-8 h-8" />
                  </div>
                  <h3 className="font-semibold mb-2">{faq.title}</h3>
                  <p className="text-sm text-white/80">{faq.description}</p>
                </div>
              ))}
            </div>

            <div className="text-center mt-8">
              <p className="text-white/90 mb-4">ยังมีคำถามอื่นๆ?</p>
              <Button
                onClick={() => window.open('mailto:Admin@EzBOQ.com', '_blank')}
                className="bg-white text-purple-600 hover:bg-gray-100"
              >
                <Mail className="w-4 h-4 mr-2" />
                ส่งอีเมลถามเรา
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
