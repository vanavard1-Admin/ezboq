import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ChevronLeft, ChevronRight, ExternalLink, Star, Sparkles, TrendingUp, Award, CheckCircle } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

// Sponsors Data - Using ImageWithFallback for flexibility
const SPONSORS = [
  {
    id: 1,
    name: "Henry & Co.",
    category: "เฟอร์นิเจอร์หรู",
    tagline: "Danish Modern Design Excellence",
    description: "เฟอร์นิเจอร์ออกแบบพิเศษ สไตล์ Danish Modern ที่ผสมผสานความงามและหน้าที่ใช้งาน เหมาะสำหรับโครงการที่ต้องการความโดดเด่น",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop", // Placeholder
    link: "https://henryandco.com",
    gradient: "from-amber-500 to-orange-500",
    bgGradient: "from-amber-50 via-orange-50 to-amber-50",
    rating: 5.0,
    tags: ["Premium Furniture", "Danish Design", "Custom Made"],
    features: ["ออกแบบพิเศษ", "คุณภาพพรีเมียม", "จัดส่งฟรี"]
  },
  {
    id: 2,
    name: "SCG",
    category: "วัสดุก่อสร้าง",
    tagline: "มาตรฐานสูง มั่นใจ เอสซีจี",
    description: "วัสดุก่อสร้างคุณภาพสูง ตราช้าง เอสซีจี ผลิตภัณฑ์ครบวงจร เหมาะสำหรับทุกโครงการ พร้อมสร้างแรงบันดาลใจให้กับทุกชีวิต",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop", // Placeholder
    link: "https://www.scg.com",
    gradient: "from-red-500 to-pink-500",
    bgGradient: "from-red-50 via-pink-50 to-red-50",
    rating: 4.9,
    tags: ["ซีเมนต์", "กระเบื้อง", "สี", "ท่อ PVC"],
    features: ["มาตรฐานสากล", "ครบทุกผลิตภัณฑ์", "รับประกันคุณภาพ"]
  },
  {
    id: 3,
    name: "ทีฮาร์ดแวร์",
    category: "อุปกรณ์ก่อสร้าง",
    tagline: "T.Hardware - ครบครันทุกความต้องการ",
    description: "ศูนย์รวมอุปกรณ์ก่อสร้างครบวงจร เครื่องมือช่าง สีและอุปกรณ์ตกแต่ง ราคาประหยัด คุณภาพดี บริการเป็นกันเอง",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop", // Placeholder
    link: "#",
    gradient: "from-red-600 to-red-700",
    bgGradient: "from-red-50 via-orange-50 to-red-50",
    rating: 4.8,
    tags: ["เครื่องมือช่าง", "อุปกรณ์ไฟฟ้า", "สีและตกแต่ง"],
    features: ["ราคาถูก", "สินค้าครบ", "บริการดี"]
  },
];

export function SponsorCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  // Auto-rotate every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      handleNext();
    }, 5000);

    return () => clearInterval(timer);
  }, [currentIndex]);

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % SPONSORS.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + SPONSORS.length) % SPONSORS.length);
  };

  const currentSponsor = SPONSORS[currentIndex];

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  return (
    <div className="relative">
      {/* Main Card - Full Width Design */}
      <Card className="relative overflow-hidden border-0 shadow-xl">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
          >
            {/* Split Layout - Image Left, Content Right */}
            <div className={`relative bg-gradient-to-br ${currentSponsor.bgGradient} overflow-hidden`}>
              <div className="grid md:grid-cols-2 gap-0">
                {/* Left Side - Image with Overlay */}
                <div className="relative h-64 md:h-auto bg-gradient-to-br from-gray-900/5 to-gray-900/10">
                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                      backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
                      backgroundSize: '20px 20px'
                    }} />
                  </div>

                  {/* Image Container */}
                  <div className="relative h-full flex items-center justify-center p-8">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                      className="relative w-full max-w-xs"
                    >
                      {/* Glow Effect */}
                      <div className={`absolute -inset-8 bg-gradient-to-r ${currentSponsor.gradient} opacity-20 blur-3xl rounded-full`} />
                      
                      {/* Image Frame */}
                      <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden border-4 border-white/80 aspect-square">
                        <ImageWithFallback
                          src={currentSponsor.image}
                          alt={currentSponsor.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Floating Badge */}
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="absolute -bottom-4 left-1/2 -translate-x-1/2"
                      >
                        <Badge className={`bg-gradient-to-r ${currentSponsor.gradient} text-white border-0 shadow-xl px-4 py-2 text-sm`}>
                          <Award className="w-4 h-4 mr-2" />
                          Verified Partner
                        </Badge>
                      </motion.div>
                    </motion.div>
                  </div>
                </div>

                {/* Right Side - Content */}
                <div className="p-8 flex flex-col justify-center">
                  {/* Category Badge */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-3"
                  >
                    <Badge variant="outline" className={`bg-gradient-to-r ${currentSponsor.gradient} text-white border-0`}>
                      <Sparkles className="w-3 h-3 mr-1" />
                      {currentSponsor.category}
                    </Badge>
                  </motion.div>

                  {/* Title */}
                  <motion.h3
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-3xl font-bold mb-2 text-gray-900"
                  >
                    {currentSponsor.name}
                  </motion.h3>

                  {/* Tagline */}
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-base text-gray-600 mb-3"
                  >
                    {currentSponsor.tagline}
                  </motion.p>

                  {/* Rating */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex items-center gap-3 mb-4"
                  >
                    <div className="flex items-center gap-1 bg-gradient-to-r from-yellow-50 to-orange-50 px-3 py-1.5 rounded-lg border border-yellow-200">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.floor(currentSponsor.rating)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-bold text-gray-700 ml-1">
                        {currentSponsor.rating}
                      </span>
                    </div>
                    <Badge className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      ตรวจสอบแล้ว
                    </Badge>
                  </motion.div>

                  {/* Description */}
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-sm text-gray-700 mb-4 leading-relaxed line-clamp-2"
                  >
                    {currentSponsor.description}
                  </motion.p>

                  {/* Features Grid */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="grid grid-cols-3 gap-2 mb-5"
                  >
                    {currentSponsor.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${currentSponsor.gradient}`} />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </motion.div>

                  {/* Tags */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="flex flex-wrap gap-2 mb-5"
                  >
                    {currentSponsor.tags.map((tag, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="bg-white/80 border border-gray-200 text-gray-700 text-xs"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </motion.div>

                  {/* CTA Button */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    <Button
                      size="lg"
                      className={`w-full md:w-auto bg-gradient-to-r ${currentSponsor.gradient} hover:opacity-90 text-white shadow-lg group`}
                      onClick={() => {
                        if (currentSponsor.link !== '#') {
                          window.open(currentSponsor.link, '_blank');
                        }
                      }}
                    >
                      <span>เยี่ยมชมเว็บไซต์</span>
                      <ExternalLink className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 pointer-events-none">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrev}
            className="pointer-events-auto h-10 w-10 rounded-full bg-white/95 hover:bg-white shadow-lg border-2 border-white/80 backdrop-blur-sm"
          >
            <ChevronLeft className="h-5 w-5 text-gray-700" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            className="pointer-events-auto h-10 w-10 rounded-full bg-white/95 hover:bg-white shadow-lg border-2 border-white/80 backdrop-blur-sm"
          >
            <ChevronRight className="h-5 w-5 text-gray-700" />
          </Button>
        </div>
      </Card>

      {/* Dots Indicator with Preview */}
      <div className="mt-4">
        <div className="flex items-center justify-center gap-2">
          {SPONSORS.map((sponsor, index) => (
            <button
              key={index}
              onClick={() => {
                setDirection(index > currentIndex ? 1 : -1);
                setCurrentIndex(index);
              }}
              className="group relative"
            >
              {/* Active Indicator */}
              {index === currentIndex ? (
                <motion.div
                  layoutId="activeIndicator"
                  className={`h-2 w-12 rounded-full bg-gradient-to-r ${sponsor.gradient} shadow-md`}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              ) : (
                <div className="relative">
                  <div className="h-2 w-2 rounded-full bg-gray-300 group-hover:bg-gray-400 transition-colors" />
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      {sponsor.name}
                    </div>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}