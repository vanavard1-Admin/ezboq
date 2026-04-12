/**
 * Unit Tests for Forgiving Parser
 * 
 * Test cases cover:
 * - Special commands
 * - Multiline parsing
 * - Phone detection
 * - Item detection
 * - Customer name detection
 * - Price-only numbers
 */

import { parseForgivingInput, ParsedActionType, type ParsingContext } from '../forgivingParser';

describe('Forgiving Parser', () => {
  const defaultContext: ParsingContext = {
    hasActiveDraft: true,
    hasCustomer: false,
    hasItems: false,
  };

  describe('Special Commands', () => {
    it('should detect CONFIRM command', () => {
      const actions = parseForgivingInput('ออกเอกสาร', defaultContext);
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe(ParsedActionType.CONFIRM);
      expect(actions[0].confidence).toBe(1.0);
    });

    it('should detect RESET command', () => {
      const actions = parseForgivingInput('เริ่มใหม่', defaultContext);
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe(ParsedActionType.RESET);
    });

    it('should detect UNDO_LAST command', () => {
      const actions = parseForgivingInput('ลบ', defaultContext);
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe(ParsedActionType.UNDO_LAST);
    });
  });

  describe('Item Detection', () => {
    it('should parse simple item: "name price"', () => {
      const actions = parseForgivingInput('อาหารแมว 3000', defaultContext);
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe(ParsedActionType.ADD_ITEM);
      expect(actions[0].payload?.item?.name).toBe('อาหารแมว');
      expect(actions[0].payload?.item?.price).toBe(3000);
      expect(actions[0].payload?.item?.qty).toBe(1);
    });

    it('should parse item with quantity: "name qty x price"', () => {
      const actions = parseForgivingInput('ทรายแมว 2 x 150', defaultContext);
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe(ParsedActionType.ADD_ITEM);
      expect(actions[0].payload?.item?.name).toBe('ทรายแมว');
      expect(actions[0].payload?.item?.qty).toBe(2);
      expect(actions[0].payload?.item?.price).toBe(150);
    });

    it('should handle price with commas', () => {
      const actions = parseForgivingInput('บริการ 1,500', defaultContext);
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe(ParsedActionType.ADD_ITEM);
      expect(actions[0].payload?.item?.price).toBe(1500);
    });
  });

  describe('Customer Name Detection', () => {
    it('should detect short text as customer name', () => {
      const actions = parseForgivingInput('บริษัท ABC', defaultContext);
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe(ParsedActionType.SET_CUSTOMER_NAME);
      expect(actions[0].payload?.customerName).toBe('บริษัท ABC');
    });

    it('should not detect commands as customer name', () => {
      const actions = parseForgivingInput('เพิ่มรายการ', defaultContext);
      expect(actions[0].type).not.toBe(ParsedActionType.SET_CUSTOMER_NAME);
    });
  });

  describe('Phone Detection', () => {
    it('should detect phone number', () => {
      const actions = parseForgivingInput('0933299990', defaultContext);
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe(ParsedActionType.SET_PHONE);
      expect(actions[0].payload?.phone).toBe('0933299990');
    });

    it('should detect phone with prefix', () => {
      const actions = parseForgivingInput('โทร 093-329-9990', defaultContext);
      expect(actions[0].type).toBe(ParsedActionType.SET_PHONE);
    });
  });

  describe('Multiline Parsing', () => {
    it('should parse multiline input line by line', () => {
      const input = 'แมวเป้า\n0933299990\nอาหารแมว 3000';
      const actions = parseForgivingInput(input, defaultContext);
      
      // Should have multiple actions
      expect(actions.length).toBeGreaterThan(1);
      
      // Should contain customer name
      const customerAction = actions.find(a => a.type === ParsedActionType.SET_CUSTOMER_NAME);
      expect(customerAction).toBeDefined();
      
      // Should contain item
      const itemAction = actions.find(a => a.type === ParsedActionType.ADD_ITEM);
      expect(itemAction).toBeDefined();
    });
  });

  describe('Price-Only Numbers', () => {
    it('should detect price-only number with context', () => {
      const contextWithLastItem: ParsingContext = {
        ...defaultContext,
        lastItemName: 'อาหารแมว',
      };
      
      const actions = parseForgivingInput('3000', contextWithLastItem);
      expect(actions[0].type).toBe(ParsedActionType.SET_PENDING_PRICE);
      expect(actions[0].payload?.item?.name).toBe('อาหารแมว');
      expect(actions[0].payload?.item?.price).toBe(3000);
    });

    it('should have lower confidence without context', () => {
      const actions = parseForgivingInput('3000', defaultContext);
      expect(actions[0].type).toBe(ParsedActionType.SET_PENDING_PRICE);
      expect(actions[0].confidence).toBeLessThan(0.5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input', () => {
      const actions = parseForgivingInput('', defaultContext);
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe(ParsedActionType.UNKNOWN);
    });

    it('should handle whitespace-only input', () => {
      const actions = parseForgivingInput('   ', defaultContext);
      expect(actions[0].type).toBe(ParsedActionType.UNKNOWN);
    });
  });
});

