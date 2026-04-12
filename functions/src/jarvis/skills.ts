/**
 * Jarvis Skills — แต่ละ skill = 1 ความสามารถ
 *
 * Phase 0: Core skills (shopping, ride, food, utilities)
 * Phase 1+: Real API integrations (Shopee, Weather API, etc.)
 */
import type {
  JarvisResponse,
  JarvisSkill,
} from "./types";

// ============ Skill: Search Products ============

export const searchProductsSkill: JarvisSkill = {
  name: "search_products",
  description:
    "ค้นหาสินค้าจาก Shopee ตาม keyword, งบประมาณ, หมวดหมู่ เช่น 'หาชุดเที่ยวทะเล งบ 500 หล่อๆ', 'หาหูฟัง bluetooth ราคาไม่เกิน 1000'",
  parameters: {
    keyword: {
      type: "string",
      description: "คำค้นหาสินค้า เช่น 'ชุดเที่ยวทะเลผู้ชาย', 'หูฟัง bluetooth'",
      required: true,
    },
    max_price: {
      type: "number",
      description: "งบประมาณสูงสุด (บาท)",
    },
    min_price: {
      type: "number",
      description: "ราคาต่ำสุด (บาท)",
    },
    category: {
      type: "string",
      description: "หมวดหมู่สินค้า",
      enum: ["fashion", "electronics", "home", "beauty", "sports", "food", "other"],
    },
    sort_by: {
      type: "string",
      description: "เรียงตาม",
      enum: ["relevance", "price_low", "price_high", "rating", "sales"],
    },
  },
  execute: async (params): Promise<JarvisResponse> => {
    const keyword = params.keyword as string;
    const maxPrice = params.max_price as number | undefined;

    console.log(`[JARVIS:SKILL:search_products] keyword="${keyword}" maxPrice=${maxPrice}`);

    return {
      type: "text",
      text: `🔍 กำลังหา "${keyword}"${maxPrice ? ` งบไม่เกิน ฿${maxPrice.toLocaleString()}` : ""}\n\n` +
        `ลองดูได้เลยครับ:\n` +
        `🟠 Shopee: https://shopee.co.th/search?keyword=${encodeURIComponent(keyword)}${maxPrice ? `&maxPrice=${maxPrice * 100000}` : ""}\n\n` +
        `💡 เร็วๆ นี้จะค้นหาและเปรียบเทียบราคาให้อัตโนมัติ!`,
      quickReplies: ["ค้นหาเพิ่ม", "เมนูหลัก"],
    };
  },
};

// ============ Skill: Book Ride ============

export const bookRideSkill: JarvisSkill = {
  name: "book_ride",
  description:
    "เรียกรถ/แท็กซี่ไปยังจุดหมาย สร้าง deeplink เปิดแอพ Grab/Bolt เช่น 'เรียกรถกลับบ้าน', 'หารถไปสยาม', 'เมาแล้ว มารับหน่อย'",
  parameters: {
    destination: {
      type: "string",
      description: "จุดหมายปลายทาง เช่น 'บ้าน', 'สยามพารากอน', 'สุขุมวิท 39'",
      required: true,
    },
    pickup: {
      type: "string",
      description: "จุดรับ (ถ้าไม่ระบุจะใช้ตำแหน่งปัจจุบัน)",
    },
    ride_type: {
      type: "string",
      description: "ประเภทรถ",
      enum: ["car", "bike", "premium"],
    },
  },
  execute: async (params, _ctx): Promise<JarvisResponse> => {
    const destination = params.destination as string;
    const pickup = params.pickup as string | undefined;

    console.log(`[JARVIS:SKILL:book_ride] dest="${destination}" pickup="${pickup || "current"}"`);

    const savedAddr = _ctx.userProfile?.savedAddresses?.find(
      (a: { label: string; address: string }) => a.label === destination || a.address.includes(destination),
    );

    const grabDeeplink = savedAddr?.lat
      ? `grab://open?screenType=BOOKING&destLat=${savedAddr.lat}&destLng=${savedAddr.lng}`
      : `grab://open?screenType=BOOKING`;

    const boltDeeplink = savedAddr?.lat
      ? `bolt://ride?dest_lat=${savedAddr.lat}&dest_lng=${savedAddr.lng}`
      : `bolt://`;

    return {
      type: "text",
      text: `🚗 เรียกรถไป "${destination}"\n\n` +
        `กดเลือกแอพได้เลย:\n\n` +
        `🟢 Grab: ${grabDeeplink}\n` +
        `🔵 Bolt: ${boltDeeplink}\n\n` +
        (savedAddr
          ? `📍 ใช้ที่อยู่ที่บันทึกไว้: ${savedAddr.address}`
          : `💡 พิมพ์ "บันทึกที่อยู่ ${destination} [ที่อยู่]" ครั้งหน้าจะเปิดแอพพร้อมปลายทางเลย`),
      quickReplies: ["บันทึกที่อยู่", "เมนูหลัก"],
    };
  },
};

// ============ Skill: Order Food ============

export const orderFoodSkill: JarvisSkill = {
  name: "order_food",
  description:
    "สั่งอาหาร/เดลิเวอรี่ เช่น 'หิวมาก สั่งข้าวมันไก่', 'อยากกินพิซซ่า', 'สั่ง Grab Food'",
  parameters: {
    food_query: {
      type: "string",
      description: "อาหารที่อยากกิน เช่น 'ข้าวมันไก่', 'พิซซ่า', 'ส้มตำ'",
      required: true,
    },
    cuisine: {
      type: "string",
      description: "ประเภทอาหาร",
      enum: ["thai", "japanese", "korean", "western", "chinese", "fastfood", "dessert", "any"],
    },
    max_price: {
      type: "number",
      description: "งบสูงสุดต่อมื้อ (บาท)",
    },
  },
  execute: async (params): Promise<JarvisResponse> => {
    const food = params.food_query as string;

    console.log(`[JARVIS:SKILL:order_food] food="${food}"`);

    return {
      type: "text",
      text: `🍔 หา "${food}" ให้เลยครับ\n\n` +
        `กดเลือกแอพสั่งอาหาร:\n\n` +
        `🟢 Grab Food: grab://open?screenType=FOOD\n` +
        `🟡 LINE MAN: https://lineman.line.me/\n` +
        `🔴 Robinhood: https://robinhood.in.th/\n\n` +
        `💡 เร็วๆ นี้ Jarvis จะค้นร้านและแนะนำให้อัตโนมัติ!`,
      quickReplies: ["ค้นอาหารอื่น", "เมนูหลัก"],
    };
  },
};

// ============ Skill: Save Address ============

export const saveAddressSkill: JarvisSkill = {
  name: "save_address",
  description:
    "บันทึกที่อยู่ของ user เช่น 'บันทึกที่อยู่บ้าน สุขุมวิท 39', 'ที่ทำงานอยู่สีลม'",
  parameters: {
    label: {
      type: "string",
      description: "ชื่อเรียกที่อยู่ เช่น 'บ้าน', 'ที่ทำงาน', 'คอนโด'",
      required: true,
    },
    address: {
      type: "string",
      description: "ที่อยู่เต็ม",
      required: true,
    },
  },
  execute: async (params): Promise<JarvisResponse> => {
    const label = params.label as string;
    const address = params.address as string;

    console.log(`[JARVIS:SKILL:save_address] label="${label}" address="${address}"`);

    return {
      type: "text",
      text: `✅ บันทึกที่อยู่ "${label}" เรียบร้อย!\n📍 ${address}\n\nครั้งหน้าพิมพ์แค่ "ไป${label}" จะเปิดแอพพร้อมปลายทางให้เลยครับ`,
    };
  },
};

// ============ Skill: Check Weather ============

export const checkWeatherSkill: JarvisSkill = {
  name: "check_weather",
  description:
    "เช็คสภาพอากาศ พยากรณ์อากาศ เช่น 'วันนี้ฝนตกมั้ย', 'อากาศพรุ่งนี้เป็นไง', 'อากาศเชียงใหม่'",
  parameters: {
    location: {
      type: "string",
      description: "สถานที่ที่อยากเช็คอากาศ เช่น 'กรุงเทพ', 'เชียงใหม่', 'ภูเก็ต' (default: กรุงเทพ)",
    },
    when: {
      type: "string",
      description: "ช่วงเวลา",
      enum: ["today", "tomorrow", "this_week"],
    },
  },
  execute: async (params): Promise<JarvisResponse> => {
    const location = (params.location as string) || "กรุงเทพ";
    const when = (params.when as string) || "today";

    console.log(`[JARVIS:SKILL:check_weather] location="${location}" when=${when}`);

    // wttr.in — free weather API, no key needed
    try {
      const wttrLocation = encodeURIComponent(location);
      const format = when === "this_week" ? "j1" : "j1";
      const url = `https://wttr.in/${wttrLocation}?format=${format}&lang=th`;
      const res = await fetch(url, {
        headers: { "User-Agent": "EzBOQ-Jarvis/1.0" },
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        type WttrCurrent = { temp_C: string; weatherDesc: Array<{ value: string }>; humidity: string; windspeedKmph: string };
        type WttrDay = { date: string; maxtempC: string; mintempC: string; hourly: Array<{ weatherDesc: Array<{ value: string }> }> };
        type WttrData = { current_condition: WttrCurrent[]; weather: WttrDay[] };
        const data = await res.json() as WttrData;
        const cur = data.current_condition?.[0];
        const dayIndex = when === "tomorrow" ? 1 : 0;
        const day = data.weather?.[dayIndex];

        if (cur && day) {
          const desc = cur.weatherDesc?.[0]?.value || "ไม่ทราบ";
          const temp = cur.temp_C;
          const maxT = day.maxtempC;
          const minT = day.mintempC;
          const humidity = cur.humidity;
          const wind = cur.windspeedKmph;

          return {
            type: "text",
            text: `🌤️ สภาพอากาศ "${location}" ${when === "tomorrow" ? "(พรุ่งนี้)" : "(วันนี้)"}\n\n` +
              `🌡️ อุณหภูมิปัจจุบัน: ${temp}°C\n` +
              `📊 สูงสุด/ต่ำสุด: ${maxT}°C / ${minT}°C\n` +
              `💧 ความชื้น: ${humidity}%\n` +
              `💨 ลม: ${wind} กม./ชม.\n` +
              `🌥️ สภาพ: ${desc}`,
            quickReplies: ["อากาศพรุ่งนี้", "อากาศสัปดาห์นี้", "เมนูหลัก"],
          };
        }
      }
    } catch (err) {
      console.warn("[JARVIS:SKILL:check_weather] wttr.in error:", err);
    }

    // Fallback
    return {
      type: "text",
      text: `🌤️ ไม่สามารถดึงข้อมูลอากาศได้ตอนนี้ครับ\n\nเช็คได้ที่:\n🌦️ https://weather.com/th-TH/weather/today/l/${encodeURIComponent(location)}`,
      quickReplies: ["ลองใหม่", "เมนูหลัก"],
    };
  },
};

// ============ Skill: Currency Exchange ============

export const currencyExchangeSkill: JarvisSkill = {
  name: "currency_exchange",
  description:
    "เช็คอัตราแลกเปลี่ยน แปลงค่าเงิน เช่น 'วันนี้ดอลลาร์เท่าไหร่', 'แปลง 100 USD เป็นบาท', '1000 เยนเท่ากับกี่บาท'",
  parameters: {
    amount: {
      type: "number",
      description: "จำนวนเงินที่ต้องการแปลง",
      required: true,
    },
    from_currency: {
      type: "string",
      description: "สกุลเงินต้นทาง เช่น 'USD', 'JPY', 'EUR', 'CNY', 'KRW', 'GBP'",
      required: true,
    },
    to_currency: {
      type: "string",
      description: "สกุลเงินปลายทาง (default: THB)",
    },
  },
  execute: async (params): Promise<JarvisResponse> => {
    const amount = params.amount as number;
    const from = (params.from_currency as string).toUpperCase();
    const to = ((params.to_currency as string) || "THB").toUpperCase();

    console.log(`[JARVIS:SKILL:currency_exchange] ${amount} ${from} → ${to}`);

    // Frankfurter.app — free ECB exchange rate API, no key needed
    try {
      // Normalize THB queries
      const base = from === "THB" ? to : from;
      const target = from === "THB" ? from : to;
      const url = `https://api.frankfurter.app/latest?from=${base}&to=${target}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });

      if (res.ok) {
        type FrankfurterData = { base: string; rates: Record<string, number>; date: string };
        const data = await res.json() as FrankfurterData;
        const rateRaw = data.rates[target];
        if (rateRaw) {
          const rate = from === "THB" ? 1 / rateRaw : rateRaw;
          const result = amount * rate;
          return {
            type: "text",
            text: `💱 อัตราแลกเปลี่ยน\n\n` +
              `${amount.toLocaleString()} ${from} = ${result.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${to}\n` +
              `📊 Rate: 1 ${from} = ${rate.toFixed(4)} ${to}\n` +
              `📅 อ้างอิง ECB วันที่ ${data.date}\n\n` +
              `💹 เช็คอัตราอื่น: https://www.xe.com/`,
            quickReplies: ["เช็ค USD", "เช็ค JPY", "เช็ค EUR", "เมนูหลัก"],
          };
        }
      }
    } catch (err) {
      console.warn("[JARVIS:SKILL:currency_exchange] frankfurter error:", err);
    }

    // Fallback with static rates
    const fallbackRates: Record<string, number> = {
      USD: 34.5, EUR: 37.8, GBP: 43.5, JPY: 0.23,
      CNY: 4.75, KRW: 0.026, AUD: 22.5, SGD: 25.8,
    };
    const fallbackRate = from === "THB" ? 1 / (fallbackRates[to] || 1) : fallbackRates[from];
    if (fallbackRate) {
      const result = amount * fallbackRate;
      return {
        type: "text",
        text: `💱 อัตราแลกเปลี่ยน (โดยประมาณ)\n\n` +
          `${amount.toLocaleString()} ${from} ≈ ${result.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${to}\n` +
          `📊 Rate: 1 ${from} ≈ ${fallbackRate.toFixed(2)} ${to}\n\n` +
          `⚠️ ข้อมูล real-time ไม่พร้อม — อัตราโดยประมาณ`,
        quickReplies: ["เช็คสกุลอื่น", "เมนูหลัก"],
      };
    }

    return {
      type: "text",
      text: `💱 ไม่พบอัตราแลกเปลี่ยน ${from} → ${to}\n\nลองเช็คที่ https://www.xe.com/`,
    };
  },
};

// ============ Skill: Calculate / Split Bill ============

export const calculateSkill: JarvisSkill = {
  name: "calculate",
  description:
    "คำนวณเลข หารบิล ทิป ส่วนลด ภาษี เช่น 'ค่าอาหาร 1500 หาร 5 คน', 'คิดภาษี 7% จาก 5000', 'ทิป 10% ของ 800', '15% ของ 3000 เท่าไหร่'",
  parameters: {
    expression: {
      type: "string",
      description: "สิ่งที่ต้องการคำนวณ อธิบายเป็นภาษาธรรมชาติ",
      required: true,
    },
    total_amount: {
      type: "number",
      description: "จำนวนเงินรวม (ถ้ามี)",
    },
    num_people: {
      type: "number",
      description: "จำนวนคน (ถ้าหารบิล)",
    },
    percentage: {
      type: "number",
      description: "เปอร์เซ็นต์ (ถ้าคิดทิป/ส่วนลด/ภาษี)",
    },
  },
  execute: async (params): Promise<JarvisResponse> => {
    const expression = params.expression as string;
    const total = params.total_amount as number | undefined;
    const people = params.num_people as number | undefined;
    const pct = params.percentage as number | undefined;

    console.log(`[JARVIS:SKILL:calculate] expr="${expression}" total=${total} people=${people} pct=${pct}`);

    let result = "";

    if (total && people) {
      // Split bill
      const perPerson = total / people;
      const tipAmounts = [10, 15, 20].map((tip) => ({
        pct: tip,
        total: total * (1 + tip / 100),
        perPerson: (total * (1 + tip / 100)) / people,
      }));

      result = `💰 หารบิล\n\n` +
        `ยอดรวม: ฿${total.toLocaleString()}\n` +
        `จำนวน: ${people} คน\n` +
        `คนละ: ฿${perPerson.toLocaleString(undefined, { maximumFractionDigits: 0 })}\n\n` +
        `💡 ถ้ารวมทิป:\n` +
        tipAmounts.map((t) => `  ${t.pct}%: คนละ ฿${t.perPerson.toLocaleString(undefined, { maximumFractionDigits: 0 })} (รวม ฿${t.total.toLocaleString(undefined, { maximumFractionDigits: 0 })})`).join("\n");
    } else if (total && pct) {
      // Percentage calculation
      const amount = total * (pct / 100);
      result = `💰 คำนวณ ${pct}% ของ ฿${total.toLocaleString()}\n\n` +
        `= ฿${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}\n` +
        `รวม: ฿${(total + amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    } else {
      result = `🔢 "${expression}"\n\nกรุณาบอกตัวเลขเพิ่มเติม เช่น:\n• "1500 หาร 3 คน"\n• "ภาษี 7% ของ 5000"\n• "ทิป 15% ของ 800"`;
    }

    return {
      type: "text",
      text: result,
      quickReplies: ["คำนวณเพิ่ม", "เมนูหลัก"],
    };
  },
};

// ============ Skill: Translate ============

export const translateSkill: JarvisSkill = {
  name: "translate",
  description:
    "แปลภาษา เช่น 'แปลเป็นอังกฤษ: ห้องน้ำอยู่ไหน', 'ภาษาญี่ปุ่นของ ขอบคุณ คือ', 'how do you say hello in Korean'",
  parameters: {
    text: {
      type: "string",
      description: "ข้อความที่ต้องการแปล",
      required: true,
    },
    target_language: {
      type: "string",
      description: "ภาษาเป้าหมาย",
      enum: ["english", "thai", "japanese", "korean", "chinese", "french", "spanish", "german"],
      required: true,
    },
    context: {
      type: "string",
      description: "บริบท เช่น 'ทางการ', 'สบายๆ', 'ธุรกิจ'",
    },
  },
  execute: async (params): Promise<JarvisResponse> => {
    // Claude จะแปลให้เองผ่าน AI Brain (tool_use result จะถูกส่งกลับไป Claude อีกรอบ)
    // แต่เราก็ return ข้อมูลพื้นฐานเพื่อ fallback
    const text = params.text as string;
    const target = params.target_language as string;

    console.log(`[JARVIS:SKILL:translate] "${text}" → ${target}`);

    // AI Brain จะจัดการแปลเอง — skill นี้เป็น signal ว่า user ต้องการแปล
    // Claude จะตอบกลับเป็นข้อความแปลโดยตรง
    return {
      type: "text",
      text: `🌐 กำลังแปลเป็น${target === "english" ? "ภาษาอังกฤษ" : target === "japanese" ? "ภาษาญี่ปุ่น" : target === "korean" ? "ภาษาเกาหลี" : target === "chinese" ? "ภาษาจีน" : target}...\n\n"${text}"\n\n⏳ กำลังแปล...`,
    };
  },
};

// ============ Skill: Write Text ============

export const writeTextSkill: JarvisSkill = {
  name: "write_text",
  description:
    "เขียนข้อความ อีเมล แคปชั่น ข้อความลา เช่น 'เขียนข้อความลาป่วย', 'แคปชั่น IG ไปทะเล', 'เขียนอีเมลสมัครงาน', 'เขียนรีวิวร้านอาหาร'",
  parameters: {
    type: {
      type: "string",
      description: "ประเภทข้อความ",
      enum: ["leave_request", "email", "caption", "review", "message", "letter", "announcement", "other"],
      required: true,
    },
    topic: {
      type: "string",
      description: "หัวข้อ/เนื้อหาที่ต้องการ",
      required: true,
    },
    tone: {
      type: "string",
      description: "โทนข้อความ",
      enum: ["formal", "casual", "funny", "professional", "romantic"],
    },
    language: {
      type: "string",
      description: "ภาษา (default: thai)",
      enum: ["thai", "english"],
    },
  },
  execute: async (params): Promise<JarvisResponse> => {
    const contentType = params.type as string;
    const topic = params.topic as string;
    const tone = (params.tone as string) || "casual";

    console.log(`[JARVIS:SKILL:write_text] type="${contentType}" topic="${topic}" tone=${tone}`);

    // Claude AI Brain จะเขียนให้เอง — skill นี้เป็น signal
    return {
      type: "text",
      text: `✍️ กำลังเขียน${contentType === "leave_request" ? "ข้อความลา" : contentType === "caption" ? "แคปชั่น" : contentType === "email" ? "อีเมล" : "ข้อความ"}ให้...\n\nหัวข้อ: ${topic}\nโทน: ${tone}\n\n⏳ กำลังเขียน...`,
    };
  },
};

// ============ Skill: Plan Trip ============

export const planTripSkill: JarvisSkill = {
  name: "plan_trip",
  description:
    "วางแผนเที่ยว แนะนำที่เที่ยว จัดทริป เช่น 'ไปเชียงใหม่ 3 วัน', 'ที่เที่ยวภูเก็ต', 'แพลนไปญี่ปุ่น สัปดาห์หน้า งบ 50000'",
  parameters: {
    destination: {
      type: "string",
      description: "จุดหมาย เช่น 'เชียงใหม่', 'ภูเก็ต', 'โตเกียว'",
      required: true,
    },
    duration: {
      type: "string",
      description: "ระยะเวลา เช่น '3 วัน 2 คืน', 'สัปดาห์หน้า', 'วันเสาร์-อาทิตย์'",
    },
    budget: {
      type: "number",
      description: "งบประมาณรวม (บาท)",
    },
    interests: {
      type: "string",
      description: "ความสนใจ เช่น 'ธรรมชาติ', 'วัด', 'คาเฟ่', 'กินเที่ยว', 'ถ่ายรูป'",
    },
    travel_style: {
      type: "string",
      description: "สไตล์การเที่ยว",
      enum: ["budget", "comfort", "luxury", "adventure", "relax"],
    },
  },
  execute: async (params): Promise<JarvisResponse> => {
    const dest = params.destination as string;
    const duration = params.duration as string | undefined;
    const budget = params.budget as number | undefined;

    console.log(`[JARVIS:SKILL:plan_trip] dest="${dest}" duration="${duration}" budget=${budget}`);

    // Claude AI Brain จะวางแผนให้
    return {
      type: "text",
      text: `✈️ วางแผนเที่ยว "${dest}"\n` +
        (duration ? `📅 ${duration}\n` : "") +
        (budget ? `💰 งบ ฿${budget.toLocaleString()}\n` : "") +
        `\n⏳ กำลังวางแผนให้...`,
    };
  },
};

// ============ Skill: Recommend ============

export const recommendSkill: JarvisSkill = {
  name: "recommend",
  description:
    "แนะนำสิ่งต่างๆ เช่น 'หนังน่าดูช่วงนี้', 'เพลงเกาหลีมาแรง', 'ร้านอาหารย่านสีลม', 'Netflix อะไรดี', 'หนังสือแนะนำ', 'เกมมือถือสนุกๆ'",
  parameters: {
    category: {
      type: "string",
      description: "หมวดหมู่",
      enum: ["movie", "music", "restaurant", "book", "game", "series", "cafe", "activity", "other"],
      required: true,
    },
    query: {
      type: "string",
      description: "รายละเอียดเพิ่มเติม เช่น 'แนวสยองขวัญ', 'ย่านทองหล่อ', 'K-pop'",
      required: true,
    },
    mood: {
      type: "string",
      description: "อารมณ์ที่ต้องการ เช่น 'สนุก', 'ซึ้ง', 'ตื่นเต้น', 'ผ่อนคลาย'",
    },
  },
  execute: async (params): Promise<JarvisResponse> => {
    const category = params.category as string;
    const query = params.query as string;

    console.log(`[JARVIS:SKILL:recommend] category="${category}" query="${query}"`);

    // Claude AI Brain จะแนะนำเอง
    return {
      type: "text",
      text: `🎯 กำลังหาคำแนะนำ "${query}" ให้...\n\n⏳ กำลังค้นหา...`,
    };
  },
};

// ============ Skill: Set Reminder ============

export const setReminderSkill: JarvisSkill = {
  name: "set_reminder",
  description:
    "ตั้งเตือนความจำ นัดหมาย เช่น 'เตือนตอน 5 โมง ประชุม', 'พรุ่งนี้บ่าย 2 นัดหมอ', 'เตือนกินยาทุก 8 ชั่วโมง'",
  parameters: {
    message: {
      type: "string",
      description: "ข้อความเตือน เช่น 'ประชุมทีม', 'กินยา', 'นัดหมอ'",
      required: true,
    },
    time: {
      type: "string",
      description: "เวลาที่ต้องการเตือน เช่น '17:00', '5 โมง', 'บ่าย 2'",
      required: true,
    },
    date: {
      type: "string",
      description: "วันที่ เช่น 'วันนี้', 'พรุ่งนี้', 'วันจันทร์', '15 มี.ค.'",
    },
    repeat: {
      type: "string",
      description: "ความถี่ในการเตือนซ้ำ",
      enum: ["once", "daily", "weekly", "monthly"],
    },
  },
  execute: async (params, ctx): Promise<JarvisResponse> => {
    const message = params.message as string;
    const time = params.time as string;
    const date = (params.date as string) || "วันนี้";
    const repeat = (params.repeat as string) || "once";

    console.log(`[JARVIS:SKILL:set_reminder] msg="${message}" time="${time}" date="${date}" repeat=${repeat}`);

    // Save reminder to Firestore
    const lineUserId = ctx?.lineUserId || null;
    if (lineUserId) {
      try {
        const { getFirestore } = await import("firebase-admin/firestore");
        const db = getFirestore();
        const reminderId = db.collection("jarvis_reminders").doc().id;
        await db.collection("jarvis_reminders").doc(reminderId).set({
          lineUserId,
          message,
          time,
          date: date || "วันนี้",
          repeat: repeat || "once",
          status: "pending",
          createdAt: new Date().toISOString(),
        });
        console.log(`[JARVIS:SKILL:set_reminder] saved id=${reminderId}`);
      } catch (err) {
        console.warn("[JARVIS:SKILL:set_reminder] Firestore save failed:", err);
      }
    }

    const repeatLabel = repeat === "daily" ? "ทุกวัน" : repeat === "weekly" ? "ทุกสัปดาห์" : repeat === "monthly" ? "ทุกเดือน" : "";
    return {
      type: "text",
      text: `⏰ บันทึกการเตือนแล้วครับ!\n\n` +
        `📝 ${message}\n` +
        `🕐 ${date || "วันนี้"} เวลา ${time}\n` +
        (repeatLabel ? `🔄 เตือนซ้ำ: ${repeatLabel}\n` : "") +
        `\n✅ บันทึกไว้แล้ว — Jarvis จะแจ้งเตือนผ่าน LINE ครับ`,
      quickReplies: ["ตั้งเตือนเพิ่ม", "ดูรายการเตือน", "เมนูหลัก"],
    };
  },
};

// ============ Skill: Daily Briefing ============

export const dailyBriefingSkill: JarvisSkill = {
  name: "daily_briefing",
  description:
    "สรุปข้อมูลประจำวัน เช่น 'สรุปเช้านี้', 'วันนี้มีอะไร', 'บรีฟวันนี้', 'daily briefing'",
  parameters: {
    include: {
      type: "string",
      description: "ข้อมูลที่ต้องการ (default: all)",
      enum: ["all", "weather", "news", "reminders", "exchange_rate"],
    },
  },
  execute: async (): Promise<JarvisResponse> => {
    console.log(`[JARVIS:SKILL:daily_briefing]`);

    const now = new Date();
    const dateStr = now.toLocaleDateString("th-TH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const hour = now.getHours();
    const greeting = hour < 12 ? "อรุณสวัสดิ์" : hour < 17 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น";

    // Fetch real weather + exchange rate in parallel
    const [weatherResult, fxResult] = await Promise.allSettled([
      fetch("https://wttr.in/Bangkok?format=j1&lang=th", {
        headers: { "User-Agent": "EzBOQ-Jarvis/1.0" },
        signal: AbortSignal.timeout(4000),
      }).then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch("https://api.frankfurter.app/latest?from=THB&to=USD,EUR,JPY", {
        signal: AbortSignal.timeout(4000),
      }).then((r) => r.ok ? r.json() : null).catch(() => null),
    ]);

    type WttrData = { current_condition: Array<{ temp_C: string; weatherDesc: Array<{ value: string }>; humidity: string }> };
    type FxData = { rates: Record<string, number>; date: string };
    const weather = weatherResult.status === "fulfilled" ? weatherResult.value as WttrData | null : null;
    const fx = fxResult.status === "fulfilled" ? fxResult.value as FxData | null : null;

    const weatherLine = weather?.current_condition?.[0]
      ? `${weather.current_condition[0].weatherDesc?.[0]?.value || "ไม่ทราบ"} ${weather.current_condition[0].temp_C}°C ☁️${weather.current_condition[0].humidity}%`
      : "ไม่สามารถดึงข้อมูลได้";

    const usdThb = fx?.rates?.USD ? (1 / fx.rates.USD).toFixed(2) : "34.50";
    const eurThb = fx?.rates?.EUR ? (1 / fx.rates.EUR).toFixed(2) : "37.80";
    const jpyThb = fx?.rates?.JPY ? (1 / fx.rates.JPY).toFixed(2) : "0.23";
    const fxDate = fx?.date || "";

    return {
      type: "text",
      text: `${greeting}ครับ! ☀️\n` +
        `📅 ${dateStr}\n\n` +
        `━━━━━━━━━━━━━━━━━\n\n` +
        `🌤️ อากาศกรุงเทพ: ${weatherLine}\n\n` +
        `💱 อัตราแลกเปลี่ยน${fxDate ? ` (${fxDate})` : ""}:\n` +
        `  1 USD = ${usdThb} THB\n` +
        `  1 EUR = ${eurThb} THB\n` +
        `  1 JPY = ${jpyThb} THB\n\n` +
        `━━━━━━━━━━━━━━━━━\n\n` +
        `มีอะไรให้ช่วยวันนี้ครับ?`,
      quickReplies: ["เช็คอากาศ", "หาของ", "เรียกรถ", "สั่งอาหาร"],
    };
  },
};

// ============ Skill: Knowledge / Explain ============

export const explainSkill: JarvisSkill = {
  name: "explain",
  description:
    "อธิบายความรู้ ตอบคำถาม สอนสิ่งต่างๆ เช่น 'blockchain คืออะไร', 'สอนทำผัดกะเพรา', 'อธิบาย AI ให้เด็ก 10 ขวบ', 'วิธีออม เงิน', 'ประวัติศาสตร์ไทย'",
  parameters: {
    topic: {
      type: "string",
      description: "หัวข้อที่ต้องการรู้",
      required: true,
    },
    depth: {
      type: "string",
      description: "ระดับความลึก",
      enum: ["simple", "medium", "detailed"],
    },
    format: {
      type: "string",
      description: "รูปแบบคำตอบ",
      enum: ["explain", "steps", "pros_cons", "comparison", "recipe"],
    },
  },
  execute: async (params): Promise<JarvisResponse> => {
    const topic = params.topic as string;
    const depth = (params.depth as string) || "medium";

    console.log(`[JARVIS:SKILL:explain] topic="${topic}" depth=${depth}`);

    // Claude AI Brain จะอธิบายเอง
    return {
      type: "text",
      text: `📚 "${topic}"\n\n⏳ กำลังหาคำตอบ...`,
    };
  },
};

// ============ Skill: Search Flights ============

export const searchFlightsSkill: JarvisSkill = {
  name: "search_flights",
  description:
    "หาเที่ยวบิน ตั๋วเครื่องบิน เช่น 'ตั๋วไปเชียงใหม่ สัปดาห์หน้า', 'เที่ยวบิน กรุงเทพ-ภูเก็ต', 'หาตั๋วถูกไปโตเกียว'",
  parameters: {
    origin: {
      type: "string",
      description: "ต้นทาง เช่น 'กรุงเทพ', 'BKK' (default: กรุงเทพ)",
    },
    destination: {
      type: "string",
      description: "ปลายทาง เช่น 'เชียงใหม่', 'CNX', 'โตเกียว'",
      required: true,
    },
    date: {
      type: "string",
      description: "วันเดินทาง เช่น 'สัปดาห์หน้า', '15 มี.ค.', 'เสาร์นี้'",
    },
    passengers: {
      type: "number",
      description: "จำนวนผู้โดยสาร (default: 1)",
    },
  },
  execute: async (params): Promise<JarvisResponse> => {
    const origin = (params.origin as string) || "กรุงเทพ";
    const dest = params.destination as string;
    const date = params.date as string | undefined;

    console.log(`[JARVIS:SKILL:search_flights] ${origin} → ${dest} date="${date}"`);

    // City code mapping for search URLs
    const cityMap: Record<string, string> = {
      กรุงเทพ: "BKK", เชียงใหม่: "CNX", ภูเก็ต: "HKT", หาดใหญ่: "HDY",
      เชียงราย: "CEI", กระบี่: "KBV", สมุย: "USM", อุดร: "UTH",
      โตเกียว: "TYO", โอซาก้า: "OSA", โซล: "ICN", ฮ่องกง: "HKG",
      สิงคโปร์: "SIN", ไทเป: "TPE", ลอนดอน: "LON", ปารีส: "PAR",
    };

    const originCode = cityMap[origin] || origin.toUpperCase();
    const destCode = cityMap[dest] || dest.toUpperCase();

    return {
      type: "text",
      text: `✈️ หาเที่ยวบิน ${origin} → ${dest}\n` +
        (date ? `📅 ${date}\n` : "") +
        `\nค้นหาและเปรียบเทียบราคาได้ที่:\n\n` +
        `🔵 Skyscanner: https://www.skyscanner.co.th/transport/flights/${originCode.toLowerCase()}/${destCode.toLowerCase()}/\n` +
        `🟢 Google Flights: https://www.google.com/travel/flights?q=flights+from+${encodeURIComponent(origin)}+to+${encodeURIComponent(dest)}\n` +
        `🟠 Traveloka: https://www.traveloka.com/th-th/flight/fullsearch?ap=${originCode}.${destCode}\n\n` +
        `💡 Tip: จองล่วงหน้า 2-3 สัปดาห์ มักได้ราคาดีที่สุด!`,
      quickReplies: ["หาที่พัก", "วางแผนเที่ยว", "เมนูหลัก"],
    };
  },
};

// ============ Skill: Search Hotels ============

export const searchHotelsSkill: JarvisSkill = {
  name: "search_hotels",
  description:
    "หาที่พัก โรงแรม เช่น 'หาที่พักหัวหิน ราคาไม่เกิน 2000', 'โรงแรม 5 ดาว ภูเก็ต', 'hostel เชียงใหม่'",
  parameters: {
    location: {
      type: "string",
      description: "สถานที่ เช่น 'หัวหิน', 'ภูเก็ต', 'โตเกียว'",
      required: true,
    },
    max_price: {
      type: "number",
      description: "ราคาสูงสุดต่อคืน (บาท)",
    },
    hotel_type: {
      type: "string",
      description: "ประเภทที่พัก",
      enum: ["hotel", "hostel", "resort", "villa", "airbnb", "any"],
    },
    rating: {
      type: "number",
      description: "ระดับดาว (1-5)",
    },
  },
  execute: async (params): Promise<JarvisResponse> => {
    const location = params.location as string;
    const maxPrice = params.max_price as number | undefined;
    const hotelType = (params.hotel_type as string) || "any";

    console.log(`[JARVIS:SKILL:search_hotels] location="${location}" maxPrice=${maxPrice} type=${hotelType}`);

    return {
      type: "text",
      text: `🏨 หาที่พักใน "${location}"` +
        (maxPrice ? ` ไม่เกิน ฿${maxPrice.toLocaleString()}/คืน` : "") + `\n\n` +
        `ค้นหาและจองได้ที่:\n\n` +
        `🔵 Agoda: https://www.agoda.com/th-th/search?city=${encodeURIComponent(location)}${maxPrice ? `&maxPrice=${maxPrice}` : ""}\n` +
        `🟢 Booking: https://www.booking.com/searchresults.th.html?ss=${encodeURIComponent(location)}\n` +
        `🟠 Traveloka: https://www.traveloka.com/th-th/hotel/search?q=${encodeURIComponent(location)}\n\n` +
        `💡 Tip: เช็ค Agoda กับ Booking เปรียบเทียบ มักได้ราคาต่างกัน!`,
      quickReplies: ["หาเที่ยวบิน", "วางแผนเที่ยว", "เมนูหลัก"],
    };
  },
};

// ============ All Skills ============

export const allSkills: JarvisSkill[] = [
  searchProductsSkill,
  bookRideSkill,
  orderFoodSkill,
  saveAddressSkill,
  checkWeatherSkill,
  currencyExchangeSkill,
  calculateSkill,
  translateSkill,
  writeTextSkill,
  planTripSkill,
  recommendSkill,
  setReminderSkill,
  dailyBriefingSkill,
  explainSkill,
  searchFlightsSkill,
  searchHotelsSkill,
];
