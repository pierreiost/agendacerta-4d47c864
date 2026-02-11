import { describe, it, expect } from "vitest";

/**
 * Tests for the handler logic used in OrdemServicoForm for item quantity/price changes.
 * These are pure function tests extracted from the form's handleQuantityChange and handlePriceChange.
 */

interface FormItem {
  description: string;
  service_code?: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

// Mirrors handleQuantityChange from OrdemServicoForm
function applyQuantityChange(items: FormItem[], index: number, qty: number): FormItem[] {
  const updated = [...items];
  updated[index] = {
    ...updated[index],
    quantity: qty,
    subtotal: qty * updated[index].unit_price,
  };
  return updated;
}

// Mirrors handlePriceChange from OrdemServicoForm
function applyPriceChange(items: FormItem[], index: number, price: number): FormItem[] {
  const updated = [...items];
  updated[index] = {
    ...updated[index],
    unit_price: price,
    subtotal: updated[index].quantity * price,
  };
  return updated;
}

// Mirrors handleRemoveItem from OrdemServicoForm
function applyRemoveItem(items: FormItem[], index: number): FormItem[] {
  return items.filter((_, i) => i !== index);
}

// Mirrors totals calculation from OrdemServicoForm
function calculateTotals(
  items: FormItem[],
  orderType: "simple" | "complete",
  taxRate: number,
  discount: number
) {
  const subtotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const taxAmount = orderType === "complete" ? subtotal * (taxRate / 100) : 0;
  const total = subtotal - discount + taxAmount;
  return { subtotal, taxAmount, total };
}

// Mirrors parseCurrencyInput from OSItemRow
function parseCurrencyInput(raw: string): number | null {
  const cleaned = raw.replace(/[^\d,.-]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  if (isNaN(num) || num < 0) return null;
  return Math.round(num * 100) / 100;
}

const sampleItems: FormItem[] = [
  { description: "Instalação Split", quantity: 2, unit_price: 150, subtotal: 300 },
  { description: "Manutenção preventiva", quantity: 1, unit_price: 80, subtotal: 80 },
  { description: "Peça - Filtro", service_code: "PCA-001", quantity: 3, unit_price: 25, subtotal: 75 },
];

describe("Quantity change handler", () => {
  it("updates quantity and recalculates subtotal", () => {
    const result = applyQuantityChange(sampleItems, 0, 5);
    expect(result[0].quantity).toBe(5);
    expect(result[0].subtotal).toBe(750); // 5 * 150
  });

  it("does not mutate original array", () => {
    const original = [...sampleItems];
    applyQuantityChange(sampleItems, 0, 5);
    expect(sampleItems[0].quantity).toBe(original[0].quantity);
  });

  it("handles quantity of 1", () => {
    const result = applyQuantityChange(sampleItems, 1, 1);
    expect(result[1].subtotal).toBe(80);
  });

  it("handles large quantities", () => {
    const result = applyQuantityChange(sampleItems, 2, 100);
    expect(result[2].subtotal).toBe(2500); // 100 * 25
  });

  it("preserves other items unchanged", () => {
    const result = applyQuantityChange(sampleItems, 0, 10);
    expect(result[1]).toEqual(sampleItems[1]);
    expect(result[2]).toEqual(sampleItems[2]);
  });
});

describe("Price change handler", () => {
  it("updates price and recalculates subtotal", () => {
    const result = applyPriceChange(sampleItems, 0, 200);
    expect(result[0].unit_price).toBe(200);
    expect(result[0].subtotal).toBe(400); // 2 * 200
  });

  it("does not mutate original array", () => {
    const original = [...sampleItems];
    applyPriceChange(sampleItems, 0, 999);
    expect(sampleItems[0].unit_price).toBe(original[0].unit_price);
  });

  it("handles decimal prices", () => {
    const result = applyPriceChange(sampleItems, 1, 99.99);
    expect(result[1].subtotal).toBe(99.99); // 1 * 99.99
  });

  it("handles very small prices", () => {
    const result = applyPriceChange(sampleItems, 0, 0.01);
    expect(result[0].subtotal).toBe(0.02); // 2 * 0.01
  });

  it("preserves other items unchanged", () => {
    const result = applyPriceChange(sampleItems, 1, 500);
    expect(result[0]).toEqual(sampleItems[0]);
    expect(result[2]).toEqual(sampleItems[2]);
  });
});

describe("Remove item handler", () => {
  it("removes item at given index", () => {
    const result = applyRemoveItem(sampleItems, 1);
    expect(result).toHaveLength(2);
    expect(result[0].description).toBe("Instalação Split");
    expect(result[1].description).toBe("Peça - Filtro");
  });

  it("removes first item", () => {
    const result = applyRemoveItem(sampleItems, 0);
    expect(result).toHaveLength(2);
    expect(result[0].description).toBe("Manutenção preventiva");
  });

  it("removes last item", () => {
    const result = applyRemoveItem(sampleItems, 2);
    expect(result).toHaveLength(2);
    expect(result[1].description).toBe("Manutenção preventiva");
  });

  it("returns empty array when removing single item", () => {
    const single = [sampleItems[0]];
    const result = applyRemoveItem(single, 0);
    expect(result).toHaveLength(0);
  });

  it("does not mutate original array", () => {
    const len = sampleItems.length;
    applyRemoveItem(sampleItems, 0);
    expect(sampleItems).toHaveLength(len);
  });
});

describe("Totals calculation", () => {
  it("calculates subtotal as sum of all item subtotals", () => {
    const { subtotal } = calculateTotals(sampleItems, "simple", 0, 0);
    expect(subtotal).toBe(455); // 300 + 80 + 75
  });

  it("applies discount", () => {
    const { total } = calculateTotals(sampleItems, "simple", 0, 50);
    expect(total).toBe(405); // 455 - 50
  });

  it("applies tax for complete orders", () => {
    const { taxAmount, total } = calculateTotals(sampleItems, "complete", 5, 0);
    expect(taxAmount).toBeCloseTo(22.75); // 455 * 0.05
    expect(total).toBeCloseTo(477.75); // 455 + 22.75
  });

  it("does not apply tax for simple orders", () => {
    const { taxAmount } = calculateTotals(sampleItems, "simple", 5, 0);
    expect(taxAmount).toBe(0);
  });

  it("applies both discount and tax correctly", () => {
    const { total } = calculateTotals(sampleItems, "complete", 10, 100);
    // subtotal: 455, tax: 45.5, total: 455 - 100 + 45.5 = 400.5
    expect(total).toBeCloseTo(400.5);
  });

  it("handles empty items array", () => {
    const { subtotal, total } = calculateTotals([], "complete", 5, 0);
    expect(subtotal).toBe(0);
    expect(total).toBe(0);
  });

  it("handles zero tax rate", () => {
    const { taxAmount } = calculateTotals(sampleItems, "complete", 0, 0);
    expect(taxAmount).toBe(0);
  });
});

describe("parseCurrencyInput", () => {
  it("parses simple integer", () => {
    expect(parseCurrencyInput("100")).toBe(100);
  });

  it("parses comma decimal (Brazilian format)", () => {
    expect(parseCurrencyInput("150,50")).toBe(150.5);
  });

  it("parses dot decimal", () => {
    expect(parseCurrencyInput("150.50")).toBe(150.5);
  });

  it("strips currency symbols", () => {
    expect(parseCurrencyInput("R$ 200,00")).toBe(200);
  });

  it("returns null for empty string", () => {
    expect(parseCurrencyInput("")).toBeNull();
  });

  it("returns null for negative values", () => {
    expect(parseCurrencyInput("-50")).toBeNull();
  });

  it("returns null for non-numeric", () => {
    expect(parseCurrencyInput("abc")).toBeNull();
  });

  it("rounds to 2 decimal places", () => {
    expect(parseCurrencyInput("10,999")).toBe(11);
  });

  it("handles value with dot as decimal", () => {
    expect(parseCurrencyInput("1.50")).toBe(1.5);
  });
});
