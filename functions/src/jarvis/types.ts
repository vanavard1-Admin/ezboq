/**
 * Jarvis AI Assistant — Type Definitions
 */

// ============ Skill System ============

export interface JarvisSkill {
  name: string;
  description: string;           // ให้ AI เข้าใจว่า skill ทำอะไร (ใช้เป็น tool description)
  parameters: Record<string, SkillParam>;
  execute(params: Record<string, unknown>, ctx: JarvisContext): Promise<JarvisResponse>;
}

export interface SkillParam {
  type: "string" | "number" | "boolean";
  description: string;
  required?: boolean;
  enum?: string[];
}

// ============ Context ============

export interface JarvisContext {
  userId: string;          // Firebase UID
  lineUserId: string;      // LINE user ID
  traceId: string;
  /** User's saved preferences and addresses */
  userProfile?: JarvisUserProfile;
  /** Conversation history for multi-turn */
  conversationHistory: ConversationMessage[];
}

export interface JarvisUserProfile {
  displayName?: string;
  savedAddresses?: SavedAddress[];
  preferences?: {
    clothingSize?: string;
    favoriteCategories?: string[];
    budgetRange?: { min: number; max: number };
  };
}

export interface SavedAddress {
  label: string;           // "บ้าน", "ที่ทำงาน"
  address: string;
  lat?: number;
  lng?: number;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

// ============ AI Response ============

export type JarvisResponse =
  | JarvisTextResponse
  | JarvisProductResponse
  | JarvisRideResponse
  | JarvisConfirmResponse;

export interface JarvisTextResponse {
  type: "text";
  text: string;
  quickReplies?: string[];
}

export interface JarvisProductResponse {
  type: "products";
  title: string;
  products: ProductItem[];
  query: string;            // original search query
}

export interface ProductItem {
  name: string;
  price: number;
  imageUrl: string;
  productUrl: string;       // affiliate link
  rating?: number;
  soldCount?: number;
  platform: "shopee";
}

export interface JarvisRideResponse {
  type: "ride";
  pickup: { name: string; lat: number; lng: number };
  destination: { name: string; lat: number; lng: number };
  options: RideOption[];
}

export interface RideOption {
  provider: "grab" | "bolt" | "indrive";
  deeplink: string;
  estimatedPrice?: string;
}

export interface JarvisConfirmResponse {
  type: "confirm";
  text: string;
  confirmAction: string;    // action ID to execute on confirm
  cancelAction?: string;
}

// ============ Intent from AI ============

export interface JarvisIntent {
  action: "search_products" | "book_ride" | "order_food" | "general_chat" | "unknown";
  confidence: number;
  params: Record<string, unknown>;
  reasoning?: string;
}
