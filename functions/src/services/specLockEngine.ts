/**
 * Spec Lock Engine - Ollama + Gemma 2b Integration
 * 
 * Logic for locking BOQ material specifications and suggesting brands/prices.
 */

import axios from 'axios';

export type Tier = 'Value' | 'Standard' | 'Premium';

export interface BoqItem {
  description: string;
  qty: number;
  unit: string;
  originalUnitPrice?: number;
}

export interface SpecLockResult {
  itemId: string;
  description: string;
  suggestedBrand: string;
  suggestedUnitPrice: number;
  tier: Tier;
  confidence: number;
  reasoning: string;
}

export class SpecLockEngine {
  private ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  private model = 'gemma:2b';

  /**
   * Suggest specifications based on BOQ item and Tier
   */
  async suggestSpecs(item: BoqItem, tier: Tier): Promise<SpecLockResult> {
    const prompt = `
    You are an expert interior design quantity surveyor.
    Task: Suggest a specific material brand and unit price (THB) for the following BOQ item based on the selected Tier.
    
    Item: "${item.description}"
    Selected Tier: ${tier} (Value = Economy, Standard = Mid-range, Premium = Luxury/High-end)
    
    Rules:
    1. Only suggest brands commonly available in Thailand (e.g., TOA, Cotto, Hafele, SCG).
    2. Provide a realistic unit price in THB for that tier.
    3. Return valid JSON only.
    
    JSON Format:
    {
      "suggestedBrand": "Brand Name",
      "suggestedUnitPrice": number,
      "confidence": number (0-1),
      "reasoning": "Short explanation in Thai"
    }
    `;

    try {
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: this.model,
        prompt: prompt,
        stream: false,
        format: 'json'
      });

      const result = JSON.parse(response.data.response);

      return {
        itemId: Math.random().toString(36).substring(7),
        description: item.description,
        suggestedBrand: result.suggestedBrand || 'Generic',
        suggestedUnitPrice: result.suggestedUnitPrice || item.originalUnitPrice || 0,
        tier: tier,
        confidence: result.confidence || 0.5,
        reasoning: result.reasoning || 'Suggested based on common industry standards.'
      };
    } catch (error) {
      console.error('SpecLockEngine Error:', error);
      // Fallback logic
      return this.getFallbackSpec(item, tier);
    }
  }

  private getFallbackSpec(item: BoqItem, tier: Tier): SpecLockResult {
    const multipliers = { Value: 0.8, Standard: 1.0, Premium: 1.5 };
    const basePrice = item.originalUnitPrice || 1000;
    
    return {
      itemId: 'fb-' + Math.random().toString(36).substring(7),
      description: item.description,
      suggestedBrand: tier === 'Premium' ? 'Hafele/Luxury' : tier === 'Standard' ? 'Standard/SCG' : 'Value/Local',
      suggestedUnitPrice: basePrice * (multipliers[tier] || 1.0),
      tier: tier,
      confidence: 0.3,
      reasoning: 'Fallback suggestion due to engine timeout.'
    };
  }
}
