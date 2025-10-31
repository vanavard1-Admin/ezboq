import { motion } from "motion/react";
import { useMemo } from "react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { FileText, FileCheck, Receipt, FileSpreadsheet, ArrowRight, Sparkles } from "lucide-react";

type DocumentType = "boq" | "quotation" | "invoice" | "receipt";

interface DocumentSelectorPageProps {
  onSelect: (type: DocumentType) => void;
}

export function DocumentSelectorPage({ onSelect }: DocumentSelectorPageProps) {
  // 📱 Memoize documents data
  const documents = useMemo(() => [
    {
      type: "boq" as DocumentType,
      title: "BOQ",
      subtitle: "Bill of Quantities",
      description: "รายการวัสดุและค่าใช้จ่าย",
      icon: FileText,
      gradient: "from-blue-500 to-indigo-600",
      bgGradient: "from-blue-50 to-indigo-50",
      hoverGradient: "from-blue-600 to-indigo-700",
    },
    {
      type: "quotation" as DocumentType,
      title: "ใบเสนอราคา",
      subtitle: "Quotation",
      description: "เสนอราคาพร้อมส่วนลด",
      icon: FileCheck,
      gradient: "from-green-500 to-emerald-600",
      bgGradient: "from-green-50 to-emerald-50",
      hoverGradient: "from-green-600 to-emerald-700",
    },
    {
      type: "invoice" as DocumentType,
      title: "ใบวางบิล",
      subtitle: "Invoice",
      description: "แบ่งงวดชำระและข้อมูลธนาคาร",
      icon: Receipt,
      gradient: "from-orange-500 to-red-600",
      bgGradient: "from-orange-50 to-red-50",
      hoverGradient: "from-orange-600 to-red-700",
    },
    {
      type: "receipt" as DocumentType,
      title: "ใบเสร็จ/ใบกำกับภาษี",
      subtitle: "Tax Invoice / Receipt",
      description: "ออกใบเสร็จและใบกำกับภาษี",
      icon: FileSpreadsheet,
      gradient: "from-purple-500 to-pink-600",
      bgGradient: "from-purple-50 to-pink-50",
      hoverGradient: "from-purple-600 to-pink-700",
    },
  ], []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-hidden">
      {/* 📱 Optimized Background Blobs - GPU Accelerated */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl"
          style={{ willChange: 'transform' }}
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
          style={{ willChange: 'transform' }}
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

      <div className="relative z-10 container mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        {/* Header */}
        <motion.div
          className="text-center mb-8 sm:mb-12 md:mb-16"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg mb-4 sm:mb-6"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
            <span className="text-xs sm:text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ระบบจัดทำเอกสารครบวงจร
            </span>
          </motion.div>

          <motion.h1
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-3 sm:mb-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent px-4"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            เลือกประเภทเอกสาร
          </motion.h1>
          
          <motion.p
            className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            เลือกเอกสารที่ต้องการสร้าง แล้วระบบจะนำคุณไปยังหน้ากรอกข้อมูล
          </motion.p>
        </motion.div>

        {/* Document Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-7xl mx-auto">
          {documents.map((doc, index) => {
            const Icon = doc.icon;
            return (
              <motion.div
                key={doc.type}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index, duration: 0.5 }}
                whileHover={{ y: -8 }}
                whileTap={{ scale: 0.98 }}
                style={{ willChange: 'transform' }}
              >
                <Card 
                  className={`relative overflow-hidden bg-gradient-to-br ${doc.bgGradient} border-2 border-white/50 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer h-full`}
                  onClick={() => onSelect(doc.type)}
                  style={{ 
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                >
                  {/* 📱 Simplified Gradient Overlay - No whileHover */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${doc.hoverGradient} opacity-0 hover:opacity-10 transition-opacity duration-300 pointer-events-none`}
                  />

                  <div className="relative p-6 sm:p-8 flex flex-col items-center text-center h-full">
                    {/* 📱 Optimized Icon - Simpler animation */}
                    <motion.div
                      className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-br ${doc.gradient} shadow-lg mb-4 sm:mb-6`}
                      whileHover={{ scale: 1.15, rotate: 12 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      style={{ willChange: 'transform' }}
                    >
                      <Icon className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-white" />
                    </motion.div>

                    {/* Title */}
                    <h3 className={`text-lg sm:text-xl md:text-2xl mb-2 bg-gradient-to-r ${doc.gradient} bg-clip-text text-transparent`}>
                      {doc.title}
                    </h3>

                    {/* Subtitle */}
                    <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                      {doc.subtitle}
                    </p>

                    {/* Description */}
                    <p className="text-xs sm:text-sm text-muted-foreground mb-6 sm:mb-8 flex-grow">
                      {doc.description}
                    </p>

                    {/* 📱 Optimized Button - Single arrow animation per card */}
                    <Button
                      className={`w-full bg-gradient-to-r ${doc.gradient} hover:${doc.hoverGradient} text-white shadow-lg group min-h-[44px]`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(doc.type);
                      }}
                      style={{ touchAction: 'manipulation' }}
                    >
                      <span className="text-sm sm:text-base">เลือกเอกสารนี้</span>
                      <motion.span
                        className="inline-block ml-2"
                        animate={{ x: [0, 4, 0] }}
                        transition={{ 
                          duration: 1.5, 
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        style={{ willChange: 'transform' }}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </motion.span>
                    </Button>
                  </div>

                  {/* 📱 Static Corner Decorations - No animation */}
                  <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${doc.gradient} opacity-10 blur-2xl pointer-events-none`} />
                  <div className={`absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tl ${doc.gradient} opacity-10 blur-2xl pointer-events-none`} />
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Footer Info */}
        <motion.div
          className="mt-12 sm:mt-16 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <Card className="inline-block px-6 sm:px-8 py-4 sm:py-5 bg-white/80 backdrop-blur-sm border-2 border-blue-100 shadow-lg max-w-2xl mx-4">
            <p className="text-xs sm:text-sm text-muted-foreground">
              💡 <strong>คำแนะนำ:</strong> แนะนำให้สร้างเอกสารตามลำดับ BOQ → ใบเสนอราคา → ใบวางบิล → ใบเสร็จ
              <br className="hidden sm:block" />
              เพื่อความสมบูรณ์ของข้อมูล
            </p>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}