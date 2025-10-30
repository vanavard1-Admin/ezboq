import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "./ui/sheet";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { CatalogItem, BOQItem } from "../types/boq";
import { Plus, Search, Package, X, ChevronRight, Sparkles, TrendingUp, Home, Edit3, Layers } from "lucide-react";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { RoomTemplateDialog } from "./RoomTemplateDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface AddItemDialogEnhancedProps {
  catalog: CatalogItem[];
  onAdd: (
    name: string,
    category: string,
    subcategory: string,
    unit: string,
    material: number,
    labor: number,
    quantity: number,
    notes?: string
  ) => void;
  onAddMultiple?: (items: Omit<BOQItem, "id">[]) => void;
}

// จัดกลุ่มหมวดหมู่ตามประเภทงาน - ใหม่! ออกแบบใหม่ทั้งหมด
const CATEGORY_GROUPS = [
  {
    title: "งานหลักก่อสร้าง",
    icon: "🏗️",
    categories: [
      { id: "งานเตรียมพื้นที่", name: "🏗️ เตรียมพื้นที่", isRoom: false },
      { id: "งานดิน", name: "⛏️ งานดิน", isRoom: false },
      { id: "โครงสร้าง", name: "🏛️ โครงสร้าง", isRoom: false },
      { id: "สถาปัตยกรรมภายนอก", name: "🏢 สถาปัตย์ภายนอก", isRoom: false },
      { id: "สถาปัตยกรรมภายใน", name: "🏠 สถาปัตย์ภายใน", isRoom: false },
      { id: "ระบบ MEP", name: "⚙️ ระบบ MEP", isRoom: false },
      { id: "งานภายนอก/ภูมิทัศน์", name: "🌳 ภูมิทัศน์", isRoom: false },
      { id: "room:ห้องนอน", name: "🛏️ ห้องนอน", isRoom: true },
      { id: "room:ห้องน้ำ", name: "🚿 ห้องน้ำ", isRoom: true },
      { id: "room:ห้องครัว", name: "🍳 ห้องครัว", isRoom: true },
      { id: "room:ห้องนั่งเล่น", name: "🛋️ ห้องนั่งเล่น", isRoom: true },
      { id: "room:ห้องทานข้าว", name: "🍽️ ห้องทานข้าว", isRoom: true },
      { id: "room:ห้องแต่งตัว", name: "👔 ห้องแต่งตัว", isRoom: true },
      { id: "room:ห้องซักล้าง", name: "🧺 ห้องซักล้าง", isRoom: true },
    ]
  },
  {
    title: "ร้านอาหาร/คาเฟ่",
    icon: "🍽️",
    categories: [
      { id: "งานครัว - ระบบดูดควัน", name: "🍳 ระบบดูดควันครัว" },
      { id: "ระบบแก๊สหุงต้ม", name: "🔥 ระบบแก๊สครัว" },
      { id: "ครัวเปียก/ซิงค์/สุขาภิบาลครัว", name: "💧 ซิงค์/สุขาภิบาล" },
      { id: "เครื่องครัวเชิงพาณิชย์", name: "🍽️ เครื่องครัว" },
      { id: "ทำความเย็น/ห้องเย็น", name: "❄️ ห้องเย็น" },
      { id: "ผิวสำเร็จครัวเฉพาะ", name: "🧼 ผิวพื้น-ครัว" },
      { id: "เฟอร์นิเจอร์/ฟิตเอาต์ ร้านอาหาร", name: "🪑 เฟอร์นิเจอร์ร้าน" },
      { id: "ป้ายและไฟป้าย", name: "🪧 ป้าย-ไฟป้าย" },
    ]
  },
  {
    title: "คลินิก/โรงพยาบาล",
    icon: "🏥",
    categories: [
      { id: "ผิวสำเร็จคลินิก/สุขอนามัย", name: "🏥 ผิวพื้น-คลินิก" },
      { id: "ระบบแก๊สการแพทย์", name: "⚕️ แก๊สการแพทย์" },
      { id: "ห้องเอกซเรย์/กันรังสี", name: "☢️ กันรังสี X-Ray" },
      { id: "อุปกรณ์คลินิก/ทันตกรรม", name: "🦷 อุปกรณ์คลินิก" },
      { id: "HVAC ห้องสะอาด/ความดัน", name: "🌬️ HVAC สะอาด" },
    ]
  },
  {
    title: "โรงแรม",
    icon: "🛏️",
    categories: [
      { id: "ห้องพักโรงแรม (FF&E)", name: "🛏️ FF&E ห้องพัก" },
      { id: "ห้องน้ำโรงแรม", name: "🚿 ห้องน้ำโรงแรม" },
      { id: "โถงทางเดิน/ชั้นพัก", name: "🚪 โถงทางเดิน" },
      { id: "ซักรีด/ครัวหลัง (BOH)", name: "🧺 BOH ซักรีด" },
    ]
  },
  {
    title: "รีเทล/ออฟฟิศ",
    icon: "🏬",
    categories: [
      { id: "หน้าร้าน/ฟาซาดรีเทล", name: "🏬 หน้าร้านรีเทล" },
      { id: "ชั้นวาง/แคชเชียร์", name: "🛒 ชั้นวาง-แคช" },
      { id: "งานออฟฟิศ/กั้นห้อง/พื้นยก", name: "🏢 ออฟฟิศ" },
    ]
  },
  {
    title: "อุตสาหกรรม/คลัง",
    icon: "📦",
    categories: [
      { id: "ห้องแลบ/ระบบพิเศษ", name: "🧪 ห้องแลบ" },
      { id: "คลังสินค้า/กึ่งอุตสาหกรรมเบา", name: "📦 คลังสินค้า" },
    ]
  },
  {
    title: "Wellness & Beauty",
    icon: "💆",
    categories: [
      { id: "ฟิตเนส/ยิม", name: "💪 ฟิตเนส" },
      { id: "สปา/ซาลอน", name: "💆 สปา-ซาลอน" },
    ]
  },
  {
    title: "ระบบพิเศษ",
    icon: "⚡",
    categories: [
      { id: "ระบบกล้อง/เครือข่าย", name: "📹 กล้อง-เครือข่าย" },
      { id: "ระบบป้องกันอัคคีภัย", name: "🚨 ป้องกันอัคคีภัย" },
      { id: "ไฟฟ้าอัปเกรดโหลดสูง", name: "⚡ ไฟฟ้าโหลดสูง" },
      { id: "สิ่งอำนวยความสะดวกคนพิการ/ผู้สูงอายุ", name: "♿ Accessibility" },
      { id: "ระบบฟาซาด/กันแดด", name: "🏗️ ฟาซาด" },
      { id: "การจัดการของเสีย/ขยะ", name: "🗑️ จัดการขยะ" },
    ]
  },
  {
    title: "อื่นๆ",
    icon: "📋",
    categories: [
      { id: "อื่นๆ", name: "📋 อื่นๆ" },
    ]
  },
];

// สร้าง flat list สำหรับการค้นหา
const ALL_CATEGORIES = CATEGORY_GROUPS.flatMap(group => group.categories);

// หมวดหมู่หลักสำหรับฟอร์มเพิ่มเอง
const MAIN_CATEGORIES = [
  "โครงสร้าง",
  "สถาปัตยกรรมภายนอก",
  "สถาปัตยกรรมภายใน",
  "ระบบ MEP",
  "งานภายนอก/ภูมิทัศน์",
  "งานเตรียมพื้นที่",
  "งานดิน",
  "เฟอร์นิเจอร์/ฟิตเอาต์ ร้านอาหาร",
  "งานครัว - ระบบดูดควัน",
  "ระบบแก๊สหุงต้ม",
  "ครัวเปียก/ซิงค์/สุขาภิบาลครัว",
  "ป้ายและไฟป้าย",
  "ระบบกล้อง/เครือข่าย",
  "ระบบป้องกันอัคคีภัย",
  "อื่นๆ",
];

// หน่วยนับที่ใช้บ่อย
const COMMON_UNITS = [
  { value: "m2", label: "ตารางเมตร (m²)" },
  { value: "m", label: "เมตร (m)" },
  { value: "m3", label: "ลูกบาศก์เมตร (m³)" },
  { value: "pcs", label: "ชิ้น (pcs)" },
  { value: "set", label: "ชุด (set)" },
  { value: "kg", label: "กิโลกรัม (kg)" },
  { value: "point", label: "จุด (point)" },
  { value: "job", label: "งาน (job)" },
  { value: "ton", label: "ตัน (ton)" },
  { value: "bag", label: "ถุง (bag)" },
  { value: "can", label: "กระป๋อง (can)" },
  { value: "liter", label: "ลิตร (L)" },
  { value: "roll", label: "ม้วน (roll)" },
  { value: "sheet", label: "แผ่น (sheet)" },
];

// Room-based filtering - แมพห้องกับรายการที่เกี่ยวข้อง
const ROOM_KEYWORDS: Record<string, string[]> = {
  "room:ห้องนอน": [
    "ห้องนอน", "bedroom", "เตียง", "bed", "ตู้เสื้อผ้า", "wardrobe", 
    "ตู้บิ้วอิน", "ตู้บิลท์อิน", "built-in", "built in", "walk-in", "closet",
    "ประตูห้องนอน", "หน้าต่างห้องนอน", "ผนังห้องนอน", "พื้นห้องนอน",
    "แอร์", "ท่อแอร์", "เครื่องปรับอากาศ", "air", "split", "ดาวน์ไลท์", "โคมไฟ",
    "พื้นไม้", "ลามิเนต", "laminate", "กระเบื้อง 60x60", "บัวพื้น", "molding",
    "ทาสี", "สี", "paint", "ฉาบปูน", "ผนัง", "wall", "soft-close", "บานพับ", "hinge",
    "ประตูภายใน", "hdf", "door", "ปลั๊ก", "สวิตช์", "ไฟฟ้า", "โคมดาวน์ไลท์",
    "ลิ้นชัก", "drawer", "ตู้", "cabinet", "ชั้นวาง", "shelf", "shelving",
    "ราวแขวน", "hanging rod", "rail", "โต๊ะหัวเตียง", "bedside table", "nightstand",
    "ตู้ทีวี", "tv cabinet", "ตู้หนังสือ", "bookshelf"
  ],
  "room:ห้องน้ำ": [
    "ห้องน้ำ", "bathroom", "สุขภัณฑ์", "sanitary", "ชักโครก", "ส้วม", "โถส้วม", "toilet", "wc",
    "อ่างล้างหน้า", "ซิงค์", "lavatory", "basin", "washbasin", "กระจกเงา", "mirror",
    "ชาวเวอร์", "shower", "ฝักบัว", "ก๊อกน้ำ", "ก๊อก", "faucet", "tap", "mixer", "เรนชาวเวอร์", "rain shower",
    "กระเบื้องห้องน้ำ", "กระเบื้องพื้น", "กระเบื้องผนัง", "กันลื่น", "tile", "floor tile", "wall tile",
    "กันซึม", "waterproof", "ท่อน้ำทิ้ง", "ท่อประปา", "drain", "pipe", "ตะแกรง", "สะดือ", "floor drain",
    "ฉากกระจก", "ฉากกั้นอาบน้ำ", "shower screen", "อาบน้ำ", "อ่างอาบน้ำ", "bathtub",
    "ประตูห้องน้ำ", "pvc", "กันชื้น", "waterproof", 
    "ชั้นวาง", "shelf", "shelving", "ราวแขวน", "towel bar", "towel rack",
    "ตู้บิ้วอิน", "ตู้บิลท์อิน", "built-in", "ตู้เก็บของ", "storage cabinet", "ตู้ใต้อ่าง", "vanity",
    "เครื่องทำน้ำอุ่น", "น้ำอุ่น", "heater", "water heater", "ท่อ ppr", "ppr pipe",
    "พัดลมระบาย", "ระบายอากาศ", "exhaust", "ventilation", "fan",
    "ติดตั้งอ่างล้างหน้า", "ติดตั้งชุดก๊อก", "s-trap", "p-trap", "วาล์ว", "valve"
  ],
  "room:ห้องครัว": [
    "ห้องครัว", "ครัว", "kitchen", "ตู้ครัว", "ตู้บน", "ตู้ล่าง", "upper cabinet", "lower cabinet",
    "ตู้บิ้วอิน", "ตู้บิลท์อิน", "built-in", "built in",
    "เคาน์เตอร์", "counter", "countertop", "top", "ท็อป", "หินแกรนิต", "granite", "ควอตซ์", "quartz",
    "ซิงค์", "sink", "ล้างจาน", "wash basin", "ก๊อกครัว", "ก๊อกผสม", "kitchen faucet", "mixer",
    "ฮูด", "hood", "ดูดควัน", "exhaust", "ระบายอากาศ", "ventilation",
    "เตาแก๊ส", "เตาไฟฟ้า", "เตาอบ", "stove", "gas stove", "oven",
    "กระเบื้องครัว", "กระเบื้องผนังครัว", "backsplash", "wall tile", "kitchen tile",
    "บ่อดักไขมัน", "ดักไขมัน", "grease trap", "ท่อน้ำทิ้ง", "drain",
    "ตู้เก็บของ", "cabinet", "storage", "ลิ้นชัก", "drawer", "บานเลื่อน", "sliding door", 
    "ชั้นวาง", "shelf", "shelving", "ราวแขวน", "hanging rod",
    "ไฟใต้ตู้", "ไฟเส้น", "led", "under cabinet light", "ปลั๊ก", "plug",
    "แผ่นวางเตา", "แท่นวางเตา", "stove platform", "โครงไม้อัด", "melamine", "เมลามีน",
    "hmr", "ครัวเปียก", "ครัวแห้ง", "wet kitchen", "dry kitchen",
    "ตู้สูง", "tall cabinet", "pantry", "ตู้ชาเครื่องดื่ม", "beverage cabinet"
  ],
  "room:ห้องนั่งเล่น": [
    "ห้องนั่งเล่น", "ห้องรับแขก", "living", "living room", "โซฟา", "sofa",
    "ฝ้า", "ฝ้าเพดาน", "เพดาน", "ceiling", "ยิปซั่ม", "ยิปซัม", "gypsum", "drywall",
    "ทาสี", "สี", "paint", "painting", "ผนัง", "wall", "acrylic",
    "พื้น", "floor", "กระเบื้อง", "tile", "ไม้ลามิเนต", "laminate", "flooring",
    "บัว", "บัวฝ้า", "บัวพื้น", "molding", "cornice", "skirting",
    "โคมไ���", "ดาวน์ไลท์", "downlight", "โคมแผง", "panel light", "spotlight", "light",
    "ไฟซ่อน", "ไฟเส้น", "led", "led strip", "cove light", "bulkhead",
    "แอร์", "air", "เครื่องปรับอากาศ", "air conditioner", "ท่อแอร์", "split",
    "ปลั๊ก", "plug", "outlet", "สวิตช์", "switch", "ไฟฟ้า", "electrical",
    "ผนังตกแต่ง", "feature wall", "ไม้จริง", "real wood", "finger-joint", "wood panel",
    "โคมดาวน์ไลท์", "โคมไฟภายใน",
    // บิ้วอิน
    "ตู้บิ้วอิน", "ตู้บิลท์อิน", "built-in", "ตู้ทีวี", "tv cabinet", "ชั้นวาง", "shelf",
    "ตู้หนังสือ", "bookshelf"
  ],
  
  "room:ห้องทานข้าว": [
    "ห้องทานข้าว", "ห้องอาหาร", "dining", "dining room", "โต๊ะอาหาร", "dining table",
    "เก้าอ้ี", "chair", "ที่นั่ง", "seating",
    "ฝ้า", "ฝ้าเพดาน", "ceiling", "ยิปซัม", "gypsum",
    "ทาสี", "สี", "paint", "ผนัง", "wall",
    "พื้น", "floor", "กระเบื้อง", "tile", "ไม้ลามิเนต", "laminate",
    "บัว", "บัวฝ้า", "บัวพื้น", "molding", "skirting",
    "โคมไฟ", "ดาวน์ไลท์", "downlight", "โคมระย้า", "chandelier", "pendant light",
    "ไฟซ่อน", "ไฟเส้น", "led", "cove light",
    "แอร์", "air conditioner", "ท่อแอร์",
    "ปลั๊ก", "plug", "สวิตช์", "switch", "ไฟฟ้า",
    "ผนังตกแต่ง", "feature wall", "ไม้จริง", "wood panel",
    // บิ้วอิน
    "ตู้บิ้วอิน", "built-in", "ตู้โชว์", "display cabinet", "ตู้เก็บของ", "storage",
    "ชั้นวาง", "shelf", "ตู้กับข้าว", "sideboard", "buffet"
  ],
  
  "room:ห้องแต่งตัว": [
    "ห้องแต่งตัว", "ห้อง walk-in", "walk-in closet", "dressing room", "wardrobe room",
    "ตู้เสื้อผ้า", "wardrobe", "ตู้บิ้วอิน", "built-in", "ตู้บิลท์อิน", "closet",
    "walk-in", "ชั้นวาง", "shelf", "shelving", "ราวแขวน", "hanging rod", "rail",
    "ลิ้นชัก", "drawer", "กระจกเงา", "mirror", "กระจกบานใหญ่", "full length mirror",
    "โต๊ะเครื่องแป้ง", "dressing table", "vanity", "makeup table",
    "พื้น", "floor", "ไม้ลามิเนต", "laminate", "กระเบื้อง", "tile",
    "ทาสี", "paint", "ผนัง", "wall", "ฉาบปูน",
    "โคมไฟ", "ดาวน์ไลท์", "downlight", "ไฟเส้น", "led", "led strip",
    "ปลั๊ก", "plug", "สวิตช์", "switch",
    // ฮาร์ดแวร์
    "soft-close", "บานพับ", "hinge", "ราง", "track", "บานเลื่อน", "sliding door",
    "มือจับ", "handle", "knob", "ลูกบิด"
  ],
  
  "room:ห้องซักล้าง": [
    "ห้องซักล้าง", "ห้องซักรีด", "laundry", "laundry room", "utility room",
    "เครื่องซักผ้า", "washing machine", "เครื่องอบผ้า", "dryer",
    "ซิงค์", "sink", "อ่างล้าง", "wash basin", "ก๊อกน้ำ", "faucet", "tap",
    "ท่อน้ำทิ้ง", "drain", "ท่อประปา", "water pipe", "ท่อ pvc",
    "กระเบื้องพื้น", "floor tile", "กระเบื้องผนัง", "wall tile", "กันซึม", "waterproof",
    "ทาสี", "paint", "ผนัง", "wall", "ฉาบปูน",
    "พัดลมระบาย", "exhaust fan", "ระบายอากาศ", "ventilation",
    "โคมไฟ", "ดาวน์ไลท์", "downlight", "light",
    "ปลั๊ก", "plug", "outlet", "สวิตช์", "switch",
    "ราวตากผ้า", "drying rack", "ราวแขวน", "hanging rod",
    // บิ้วอิน
    "ตู้บิ้วอิน", "built-in", "ตู้เก็บของ", "storage cabinet", "ชั้นวาง", "shelf",
    "ตู้ซักรีด", "laundry cabinet", "เคาน์เตอร์", "counter", "countertop"
  ]
};

export function AddItemDialogEnhanced({ catalog, onAdd, onAddMultiple }: AddItemDialogEnhancedProps) {
  const [open, setOpen] = useState(false);
  const [roomTemplateOpen, setRoomTemplateOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [itemName, setItemName] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  const [material, setMaterial] = useState<string>("0");
  const [labor, setLabor] = useState<string>("0");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ทั้งหมด");
  const [activeTab, setActiveTab] = useState<"catalog" | "custom">("catalog");
  
  // Custom item form states
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [customSubcategory, setCustomSubcategory] = useState("");
  const [customUnit, setCustomUnit] = useState("m2");
  const [customMaterial, setCustomMaterial] = useState("");
  const [customLabor, setCustomLabor] = useState("");
  const [customQuantity, setCustomQuantity] = useState("1");
  const [customNotes, setCustomNotes] = useState("");

  const handleSelectRoomTemplate = (items: Omit<BOQItem, "id">[]) => {
    if (onAddMultiple) {
      onAddMultiple(items);
    }
  };

  // Filtered catalog
  const filteredCatalog = useMemo(() => {
    let items = catalog;

    // Filter by category (including room-based filtering)
    if (selectedCategory !== "ทั้งหมด") {
      // Check if it's a room category
      if (selectedCategory.startsWith("room:")) {
        const keywords = ROOM_KEYWORDS[selectedCategory] || [];
        items = items.filter(item => {
          const searchText = `${item.name} ${item.category} ${item.subcategory}`.toLowerCase();
          return keywords.some(keyword => searchText.includes(keyword.toLowerCase()));
        });
      } else {
        // Regular category filter
        items = items.filter(item => item.category === selectedCategory);
      }
    }

    // Filter by search
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      items = items.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.subcategory.toLowerCase().includes(query)
      );
    }

    // If no search, show popular items (sorted by price)
    if (!searchTerm.trim() && selectedCategory === "ทั้งหมด") {
      return [...items]
        .sort((a, b) => (b.material + b.labor) - (a.material + a.labor))
        .slice(0, 30);
    }

    return items.slice(0, 50);
  }, [catalog, searchTerm, selectedCategory]);

  const handleSelectItem = (item: CatalogItem) => {
    setSelectedItem(item);
    setItemName(item.name);
    setMaterial(item.material.toString());
    setLabor(item.labor.toString());
  };

  const handleAdd = () => {
    if (selectedItem && itemName.trim() && parseFloat(quantity) > 0) {
      onAdd(
        itemName.trim(),
        selectedItem.category,
        selectedItem.subcategory,
        selectedItem.unit,
        parseFloat(material) || 0,
        parseFloat(labor) || 0,
        parseFloat(quantity)
      );
      handleReset();
      setOpen(false);
    }
  };

  const handleAddCustom = () => {
    if (customName.trim() && customCategory && customSubcategory && parseFloat(customQuantity) > 0) {
      onAdd(
        customName.trim(),
        customCategory,
        customSubcategory,
        customUnit,
        parseFloat(customMaterial) || 0,
        parseFloat(customLabor) || 0,
        parseFloat(customQuantity),
        customNotes.trim() || undefined
      );
      handleResetCustom();
      setOpen(false);
    }
  };

  const handleReset = () => {
    setSelectedItem(null);
    setItemName("");
    setQuantity("1");
    setMaterial("0");
    setLabor("0");
    setSearchTerm("");
    setSelectedCategory("ทั้งหมด");
  };

  const handleResetCustom = () => {
    setCustomName("");
    setCustomCategory("");
    setCustomSubcategory("");
    setCustomUnit("m2");
    setCustomMaterial("");
    setCustomLabor("");
    setCustomQuantity("1");
    setCustomNotes("");
  };

  const totalUnitPrice = (parseFloat(material) || 0) + (parseFloat(labor) || 0);
  const totalPrice = totalUnitPrice * (parseFloat(quantity) || 0);

  return (
    <Sheet open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) handleReset();
    }}>
      <SheetTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all">
          <Plus className="h-4 w-4" />
          เพิ่มรายการวัสดุ
        </Button>
      </SheetTrigger>

      <SheetContent 
        side="right" 
        className="w-full sm:max-w-2xl p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="flex-shrink-0 px-4 sm:px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <SheetTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                เพิ่มรายการวัสดุ
                <Badge variant="secondary">
                  {catalog.length.toLocaleString()} รายการ
                </Badge>
              </SheetTitle>
              <SheetDescription className="mt-1.5">
                ค้นหาและเลือกรายการวัสดุก่อสร้างจากแคตตาล็อก {catalog.length.toLocaleString()}+ รายการ<br/>
                <span className="text-green-600 font-medium">💡 เลือกหมวดห้อง (ห้องนอน/ห้องน้ำ/ห้องครัว/ห้องนั่งเล่น) เพื่อดูรายการที่เกี่ยวข้อง</span>
              </SheetDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="flex-shrink-0 gap-2 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:bg-green-100 text-green-700"
              onClick={() => setRoomTemplateOpen(true)}
            >
              <Home className="h-4 w-4" />
              Template ห้อง
            </Button>
          </div>
        </SheetHeader>

        {/* Room Template Dialog */}
        <RoomTemplateDialog
          open={roomTemplateOpen}
          onOpenChange={setRoomTemplateOpen}
          onSelectTemplate={handleSelectRoomTemplate}
        />

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "catalog" | "custom")} className="flex-1 flex flex-col">
            {/* Tabs Header */}
            <div className="flex-shrink-0 border-b bg-white dark:bg-gray-950">
              <TabsList className="w-full h-auto grid grid-cols-2 p-1">
                <TabsTrigger value="catalog" className="gap-2 py-3">
                  <Layers className="h-4 w-4" />
                  <span>จาก Catalog</span>
                  <Badge variant="secondary" className="text-xs">
                    {catalog.length.toLocaleString()}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="custom" className="gap-2 py-3">
                  <Edit3 className="h-4 w-4" />
                  <span>เพิ่มรายการเอง</span>
                  <Badge variant="outline" className="text-xs">ใหม่!</Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Catalog Tab */}
            <TabsContent value="catalog" className="flex-1 flex flex-col mt-0 overflow-hidden">
              {!selectedItem ? (
                /* Step 1: Browse & Select Item */
                <>
                  {/* Search Bar - Fixed */}
                  <div className="flex-shrink-0 p-4 bg-white dark:bg-gray-950 border-b space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    autoFocus
                    placeholder="ค้นหารายการ... (เช่น ปูน, อิฐ, สี, เหล็ก)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-10 h-11 border-2 focus:border-blue-500"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>

                {/* Search hint */}
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {searchTerm ? (
                    <>พบ <strong className="text-blue-600">{filteredCatalog.length}</strong> รายการ</>
                  ) : selectedCategory !== "ทั้งหมด" ? (
                    <>
                      {selectedCategory.startsWith("room:") ? (
                        <>แสดงรายการสำหรับ <strong className="text-green-600">{selectedCategory.replace("room:", "")}</strong> - {filteredCatalog.length} รายการ</>
                      ) : (
                        <>แสดงหมวด <strong className="text-blue-600">{selectedCategory}</strong> - {filteredCatalog.length} รายการ</>
                      )}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3" />
                      แสดงรายการยอดนิยม 30 อันดับ
                    </>
                  )}
                </p>
              </div>

              {/* Category Groups - NEW DESIGN! */}
              <div className="flex-shrink-0 border-b bg-gray-50/50 dark:bg-gray-900/50">
                <ScrollArea className="h-[280px]">
                  <div className="p-4 space-y-4">
                    {/* ปุ่ม ทั้งหมด */}
                    <div>
                      <Button
                        variant={selectedCategory === "ทั้งหมด" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory("ทั้งหมด")}
                        className="rounded-full"
                      >
                        ✨ ทั้งหมด
                      </Button>
                    </div>

                    {/* แต่ละกลุ่ม */}
                    {CATEGORY_GROUPS.map((group, groupIndex) => (
                      <div key={groupIndex} className="space-y-2">
                        {/* ชื่อกลุ่ม */}
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{group.icon}</span>
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {group.title}
                          </span>
                          <div className="flex-1 h-px bg-border" />
                        </div>

                        {/* ปุ่มในกลุ่ม */}
                        <div className="flex flex-wrap gap-2">
                          {group.categories.map((cat) => {
                            const isRoom = (cat as any).isRoom;
                            const isSelected = selectedCategory === cat.id;
                            return (
                              <Button
                                key={cat.id}
                                variant={isSelected ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`rounded-full whitespace-nowrap ${
                                  isRoom && !isSelected
                                    ? "border-green-200 bg-green-50 hover:bg-green-100 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-300"
                                    : ""
                                } ${
                                  isRoom && isSelected
                                    ? "bg-green-600 hover:bg-green-700"
                                    : ""
                                }`}
                              >
                                {cat.name}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Items List - Scrollable */}
              <div className="flex-1 border-b bg-white dark:bg-gray-950">
                <ScrollArea className="h-[400px]">
                  <div className="p-4 space-y-2">
                    {filteredCatalog.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>ไม่พบรายการที่ค้นหา</p>
                        <p className="text-sm mt-1">ลองใช้คำค้นหาอื่นหรือเปลี่ยนหมวดหมู่</p>
                      </div>
                    ) : (
                      filteredCatalog.map((item) => (
                        <ItemCardSimple
                          key={item.id}
                          item={item}
                          onClick={() => handleSelectItem(item)}
                          searchQuery={searchTerm}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </>
          ) : (
            /* Step 2: Edit & Confirm Item */
            <>
              {/* Back button */}
              <div className="flex-shrink-0 p-4 border-b bg-gray-50/50 dark:bg-gray-900/50">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedItem(null)}
                  className="gap-2 h-9"
                >
                  ← เลือกรายการอื่น
                </Button>
              </div>

              {/* Form - Scrollable */}
              <div className="flex-1 border-b bg-white dark:bg-gray-950">
                <ScrollArea className="h-[500px]">
                  <div className="p-4 space-y-4">
                  {/* Selected Item Preview */}
                  <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-2 border-blue-300">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <Package className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium mb-2">{selectedItem.name}</h4>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">{selectedItem.category}</Badge>
                          <Badge variant="secondary">{selectedItem.subcategory}</Badge>
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200">
                            {selectedItem.unit}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Separator className="my-3" />
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">ค่าวัสดุ</p>
                        <p className="font-semibold">฿{selectedItem.material.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">ค่าแรง</p>
                        <p className="font-semibold">฿{selectedItem.labor.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">รวม/หน่วย</p>
                        <p className="font-semibold text-blue-600">
                          ฿{(selectedItem.material + selectedItem.labor).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* Form Fields */}
                  <div className="space-y-4">
                    {/* Item Name */}
                    <div className="space-y-2">
                      <Label htmlFor="itemName">
                        ชื่อรายการ <span className="text-xs text-muted-foreground">(แก้ไขได้)</span>
                      </Label>
                      <Input
                        id="itemName"
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        placeholder="ชื่อรายการ..."
                        className="h-11"
                      />
                    </div>

                    {/* Quantity */}
                    <div className="space-y-2">
                      <Label htmlFor="quantity" className="flex items-center gap-2">
                        จำนวน
                        <Badge variant="outline" className="ml-auto">{selectedItem.unit}</Badge>
                      </Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="h-11"
                        placeholder="1.00"
                      />
                    </div>

                    {/* Material & Labor */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="material">ค่าวัสดุ</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">฿</span>
                          <Input
                            id="material"
                            type="number"
                            min="0"
                            step="0.01"
                            value={material}
                            onChange={(e) => setMaterial(e.target.value)}
                            className="h-11 pl-7"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="labor">ค่าแรง</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">฿</span>
                          <Input
                            id="labor"
                            type="number"
                            min="0"
                            step="0.01"
                            value={labor}
                            onChange={(e) => setLabor(e.target.value)}
                            className="h-11 pl-7"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Price Summary */}
                    <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-300">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">ราคา/หน่วย</span>
                        <span className="font-semibold">
                          ฿{totalUnitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-muted-foreground">จำนวน</span>
                        <span className="font-semibold">
                          {parseFloat(quantity) || 0} {selectedItem.unit}
                        </span>
                      </div>
                      <Separator className="my-3" />
                      <div className="flex items-center justify-between">
                        <span className="font-bold">รวมทั้งหมด</span>
                        <span className="text-2xl font-bold text-green-600">
                          ฿{totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </Card>
                  </div>
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
            </TabsContent>

            {/* Custom Tab - เพิ่มรายการเอง */}
            <TabsContent value="custom" className="flex-1 flex flex-col mt-0 overflow-hidden">
                <div className="flex-1 border-b bg-white dark:bg-gray-950">
                  <ScrollArea className="h-[600px]">
                    <div className="p-6 space-y-6">
                    {/* Header Info */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-2 border-purple-200 dark:border-purple-900 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Edit3 className="h-5 w-5 text-purple-600 mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                            เพิ่มรายการด้วยตัวเอง
                          </h3>
                          <p className="text-sm text-purple-700 dark:text-purple-300">
                            กรอกข้อมูลรายการวัสดุที่ต้องการเพิ่ม สามารถระบุราคา จำนวน และหมวดหมู่ได้เอง
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-5">
                      {/* ชื่อรายการ */}
                      <div className="space-y-2">
                        <Label htmlFor="customName" className="flex items-center gap-2">
                          ชื่อรายการ <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="customName"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          placeholder="เช่น กระเบื้องแกรนิตโต 80x80 ซม."
                          className="h-11"
                          autoFocus
                        />
                      </div>

                      {/* หมวดหมู่หลัก และหมวดหมู่ย่อย */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="customCategory" className="flex items-center gap-2">
                            หมวดหมู่หลัก <span className="text-red-500">*</span>
                          </Label>
                          <Select value={customCategory} onValueChange={setCustomCategory}>
                            <SelectTrigger id="customCategory" className="h-11">
                              <SelectValue placeholder="เลือกหมวด..." />
                            </SelectTrigger>
                            <SelectContent>
                              {MAIN_CATEGORIES.map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                  {cat}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="customSubcategory" className="flex items-center gap-2">
                            หมวดหมู่ย่อย <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="customSubcategory"
                            value={customSubcategory}
                            onChange={(e) => setCustomSubcategory(e.target.value)}
                            placeholder="เช่น พื้น, ผนัง, ฝ้า"
                            className="h-11"
                          />
                        </div>
                      </div>

                      {/* หน่วย และ จำนวน */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="customUnit">หน่วยนับ</Label>
                          <Select value={customUnit} onValueChange={setCustomUnit}>
                            <SelectTrigger id="customUnit" className="h-11">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {COMMON_UNITS.map((unit) => (
                                <SelectItem key={unit.value} value={unit.value}>
                                  {unit.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="customQuantity" className="flex items-center gap-2">
                            จำนวน <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="customQuantity"
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={customQuantity}
                            onChange={(e) => setCustomQuantity(e.target.value)}
                            className="h-11"
                            placeholder="1.00"
                          />
                        </div>
                      </div>

                      <Separator />

                      {/* ค่าวัสดุ และ ค่าแรง */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="customMaterial">ค่าวัสดุ (฿/หน่วย)</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">฿</span>
                            <Input
                              id="customMaterial"
                              type="number"
                              min="0"
                              step="0.01"
                              value={customMaterial}
                              onChange={(e) => setCustomMaterial(e.target.value)}
                              className="h-11 pl-7"
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="customLabor">ค่าแรง (฿/หน่วย)</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">฿</span>
                            <Input
                              id="customLabor"
                              type="number"
                              min="0"
                              step="0.01"
                              value={customLabor}
                              onChange={(e) => setCustomLabor(e.target.value)}
                              className="h-11 pl-7"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      </div>

                      {/* หมายเหตุ */}
                      <div className="space-y-2">
                        <Label htmlFor="customNotes">หมายเหตุ (ไม่จำเป็น)</Label>
                        <Input
                          id="customNotes"
                          value={customNotes}
                          onChange={(e) => setCustomNotes(e.target.value)}
                          placeholder="เช่น สี, ยี่ห้อ, หมายเหตุพิเศษ"
                          className="h-11"
                        />
                      </div>

                      {/* Price Summary */}
                      {(parseFloat(customMaterial) > 0 || parseFloat(customLabor) > 0) && parseFloat(customQuantity) > 0 && (
                        <Card className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-300">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">ราคา/หน่วย</span>
                              <span className="font-semibold">
                                ฿{((parseFloat(customMaterial) || 0) + (parseFloat(customLabor) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">จำนวน</span>
                              <span className="font-semibold">
                                {parseFloat(customQuantity) || 0} {customUnit}
                              </span>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                              <span className="font-bold">รวมทั้งหมด</span>
                              <span className="text-2xl font-bold text-green-600">
                                ฿{(((parseFloat(customMaterial) || 0) + (parseFloat(customLabor) || 0)) * (parseFloat(customQuantity) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </Card>
                      )}
                    </div>
                    </div>
                  </ScrollArea>
                </div>

                {/* Footer สำหรับ Custom Tab */}
                <div className="flex-shrink-0 p-4 border-t-4 border-purple-500 bg-gradient-to-b from-purple-50 to-white dark:from-purple-950/30 dark:to-gray-950 shadow-[0_-8px_20px_-4px_rgba(168,85,247,0.4)]">
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleResetCustom}
                      className="flex-1 h-12 border-2"
                    >
                      ล้างฟอร์ม
                    </Button>
                    <Button
                      onClick={handleAddCustom}
                      disabled={!customName.trim() || !customCategory || !customSubcategory || parseFloat(customQuantity) <= 0}
                      className="flex-[2] h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 gap-2 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="h-5 w-5" />
                      <span className="font-bold">เพิ่มรายการ</span>
                      {(parseFloat(customMaterial) > 0 || parseFloat(customLabor) > 0) && parseFloat(customQuantity) > 0 && (
                        <Badge variant="secondary" className="ml-2 bg-yellow-100 text-purple-800 font-bold">
                          ฿{(((parseFloat(customMaterial) || 0) + (parseFloat(customLabor) || 0)) * (parseFloat(customQuantity) || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </Badge>
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>
          </Tabs>
        </div>

        {/* Footer for Catalog Tab - when item selected */}
        {selectedItem && activeTab === "catalog" && (
          <div className="flex-shrink-0 p-4 border-t-4 border-green-500 bg-gradient-to-b from-green-50 to-white dark:from-green-950/30 dark:to-gray-950 shadow-[0_-8px_20px_-4px_rgba(34,197,94,0.4)]">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setSelectedItem(null)}
                className="flex-1 h-12 border-2"
              >
                ← ย้อนกลับ
              </Button>
              <Button
                onClick={handleAdd}
                disabled={!itemName.trim() || parseFloat(quantity) <= 0}
                className="flex-[2] h-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 gap-2 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-5 w-5" />
                <span className="font-bold">เพิ่มรายการ</span>
                {totalPrice > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-yellow-100 text-green-800 font-bold">
                    ฿{totalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// Simplified Item Card Component
function ItemCardSimple({
  item,
  onClick,
  searchQuery,
}: {
  item: CatalogItem;
  onClick: () => void;
  searchQuery: string;
}) {
  const totalPrice = item.material + item.labor;
  
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">{part}</mark> : part
    );
  };

  return (
    <button
      onClick={onClick}
      className="w-full p-3 rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all text-left group"
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-medium mb-1 line-clamp-2">
            {highlightMatch(item.name, searchQuery)}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>{item.category}</span>
            <span>•</span>
            <span>{item.subcategory}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className="text-xs">
              วัสดุ ฿{item.material.toLocaleString()}
            </Badge>
            <Badge variant="outline" className="text-xs">
              แรง ฿{item.labor.toLocaleString()}
            </Badge>
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="font-bold text-lg text-blue-600 dark:text-blue-400 mb-1">
            ฿{totalPrice.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">/{item.unit}</div>
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-blue-600 group-hover:translate-x-1 transition-all mt-1 ml-auto" />
        </div>
      </div>
    </button>
  );
}
