import { describe, it, expect, vi, beforeEach } from "vitest";
// @ts-expect-error - testing library types
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OSItemRow } from "./OSItemRow";

const baseItem = {
  description: "Instalação Split 12000 BTUs",
  service_code: "SRV-001",
  quantity: 2,
  unit_price: 150,
  subtotal: 300,
};

const defaultProps = {
  item: baseItem,
  index: 0,
  showCode: true,
  readOnly: false,
  onQuantityChange: vi.fn(),
  onPriceChange: vi.fn(),
  onRemove: vi.fn(),
};

const renderDesktop = (overrides = {}) =>
  render(
    <table>
      <tbody>
        <OSItemRow {...defaultProps} {...overrides} />
      </tbody>
    </table>
  );

const renderMobile = (overrides = {}) =>
  render(<OSItemRow {...defaultProps} isMobile {...overrides} />);

describe("OSItemRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===================== RENDERING =====================

  describe("Desktop rendering", () => {
    it("renders item description, code, quantity, price, and subtotal", () => {
      renderDesktop();
      expect(screen.getByText("Instalação Split 12000 BTUs")).toBeInTheDocument();
      expect(screen.getByText("SRV-001")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("R$ 150,00")).toBeInTheDocument();
      expect(screen.getByText("R$ 300,00")).toBeInTheDocument();
    });

    it("hides service code column when showCode is false", () => {
      renderDesktop({ showCode: false });
      expect(screen.queryByText("SRV-001")).not.toBeInTheDocument();
    });

    it("shows dash when showCode is true but code is empty", () => {
      renderDesktop({ item: { ...baseItem, service_code: null } });
      expect(screen.getByText("-")).toBeInTheDocument();
    });
  });

  describe("Mobile rendering", () => {
    it("renders as card layout with description and subtotal", () => {
      renderMobile();
      expect(screen.getByText("Instalação Split 12000 BTUs")).toBeInTheDocument();
      expect(screen.getByText(/Sub: R\$ 300,00/)).toBeInTheDocument();
    });

    it("shows service code on mobile when showCode is true", () => {
      renderMobile();
      expect(screen.getByText("SRV-001")).toBeInTheDocument();
    });
  });

  // ===================== READ ONLY =====================

  describe("Read-only mode", () => {
    it("does not render +/- buttons or trash in desktop readOnly", () => {
      renderDesktop({ readOnly: true });
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("does not render +/- buttons or trash in mobile readOnly", () => {
      renderMobile({ readOnly: true });
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("displays quantity as plain text when readOnly", () => {
      renderDesktop({ readOnly: true });
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("displays price as plain text when readOnly", () => {
      renderDesktop({ readOnly: true });
      expect(screen.getByText("R$ 150,00")).toBeInTheDocument();
    });
  });

  // ===================== QUANTITY CONTROLS =====================

  describe("Quantity controls", () => {
    it("calls onQuantityChange with incremented value on + click", async () => {
      const onQuantityChange = vi.fn();
      renderDesktop({ onQuantityChange });

      const buttons = screen.getAllByRole("button");
      // Plus button is the one after the quantity display
      const plusButton = buttons.find((btn) => btn.querySelector('[class*="lucide-plus"]') || btn.innerHTML.includes("plus"));
      // Find by icon - the second outline button
      const outlineButtons = buttons.filter((b) => b.className.includes("outline"));
      await userEvent.click(outlineButtons[1]); // + button

      expect(onQuantityChange).toHaveBeenCalledWith(0, 3);
    });

    it("calls onQuantityChange with decremented value on - click when qty > 1", async () => {
      const onQuantityChange = vi.fn();
      renderDesktop({ onQuantityChange });

      const outlineButtons = screen.getAllByRole("button").filter((b) => b.className.includes("outline"));
      await userEvent.click(outlineButtons[0]); // - button

      expect(onQuantityChange).toHaveBeenCalledWith(0, 1);
    });

    it("opens remove dialog when - is clicked and qty=1", async () => {
      renderDesktop({ item: { ...baseItem, quantity: 1, subtotal: 150 } });

      const outlineButtons = screen.getAllByRole("button").filter((b) => b.className.includes("outline"));
      await userEvent.click(outlineButtons[0]); // - button

      expect(screen.getByText("Remover Item")).toBeInTheDocument();
      expect(screen.getByText(/Tem certeza que deseja remover/)).toBeInTheDocument();
    });

    it("respects maxQuantity prop on + click", async () => {
      const onQuantityChange = vi.fn();
      renderDesktop({ onQuantityChange, maxQuantity: 2 });

      const outlineButtons = screen.getAllByRole("button").filter((b) => b.className.includes("outline"));
      await userEvent.click(outlineButtons[1]); // + button

      expect(onQuantityChange).not.toHaveBeenCalled();
    });

    it("allows inline quantity editing on click", async () => {
      const onQuantityChange = vi.fn();
      renderDesktop({ onQuantityChange });

      // Click the quantity display number to enter edit mode
      const qtyButton = screen.getByText("2");
      await userEvent.click(qtyButton);

      const input = screen.getByRole("spinbutton");
      expect(input).toBeInTheDocument();

      await userEvent.clear(input);
      await userEvent.type(input, "5");
      fireEvent.blur(input);

      expect(onQuantityChange).toHaveBeenCalledWith(0, 5);
    });

    it("cancels quantity editing on Escape", async () => {
      renderDesktop();

      await userEvent.click(screen.getByText("2"));
      const input = screen.getByRole("spinbutton");
      fireEvent.keyDown(input, { key: "Escape" });

      expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    });

    it("commits quantity on Enter", async () => {
      const onQuantityChange = vi.fn();
      renderDesktop({ onQuantityChange });

      await userEvent.click(screen.getByText("2"));
      const input = screen.getByRole("spinbutton");
      await userEvent.clear(input);
      await userEvent.type(input, "10");
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onQuantityChange).toHaveBeenCalledWith(0, 10);
    });

    it("does not commit invalid quantity", async () => {
      const onQuantityChange = vi.fn();
      renderDesktop({ onQuantityChange });

      await userEvent.click(screen.getByText("2"));
      const input = screen.getByRole("spinbutton");
      await userEvent.clear(input);
      await userEvent.type(input, "0");
      fireEvent.blur(input);

      expect(onQuantityChange).not.toHaveBeenCalled();
    });
  });

  // ===================== PRICE EDITING =====================

  describe("Price editing", () => {
    it("opens price input on click", async () => {
      renderDesktop();

      const priceButton = screen.getByText("R$ 150,00");
      await userEvent.click(priceButton);

      const input = screen.getByDisplayValue("150,00");
      expect(input).toBeInTheDocument();
    });

    it("commits valid price on blur", async () => {
      const onPriceChange = vi.fn();
      renderDesktop({ onPriceChange });

      await userEvent.click(screen.getByText("R$ 150,00"));
      const input = screen.getByDisplayValue("150,00");
      await userEvent.clear(input);
      await userEvent.type(input, "200,50");
      fireEvent.blur(input);

      expect(onPriceChange).toHaveBeenCalledWith(0, 200.5);
    });

    it("commits valid price on Enter", async () => {
      const onPriceChange = vi.fn();
      renderDesktop({ onPriceChange });

      await userEvent.click(screen.getByText("R$ 150,00"));
      const input = screen.getByDisplayValue("150,00");
      await userEvent.clear(input);
      await userEvent.type(input, "99,99");
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onPriceChange).toHaveBeenCalledWith(0, 99.99);
    });

    it("cancels price editing on Escape", async () => {
      renderDesktop();

      await userEvent.click(screen.getByText("R$ 150,00"));
      const input = screen.getByDisplayValue("150,00");
      fireEvent.keyDown(input, { key: "Escape" });

      expect(screen.queryByDisplayValue("150,00")).not.toBeInTheDocument();
    });

    it("does not commit zero price", async () => {
      const onPriceChange = vi.fn();
      renderDesktop({ onPriceChange });

      await userEvent.click(screen.getByText("R$ 150,00"));
      const input = screen.getByDisplayValue("150,00");
      await userEvent.clear(input);
      await userEvent.type(input, "0");
      fireEvent.blur(input);

      expect(onPriceChange).not.toHaveBeenCalled();
    });

    it("does not commit negative price", async () => {
      const onPriceChange = vi.fn();
      renderDesktop({ onPriceChange });

      await userEvent.click(screen.getByText("R$ 150,00"));
      const input = screen.getByDisplayValue("150,00");
      await userEvent.clear(input);
      await userEvent.type(input, "-10");
      fireEvent.blur(input);

      expect(onPriceChange).not.toHaveBeenCalled();
    });

    it("shows 'editado' badge after price change", async () => {
      const onPriceChange = vi.fn();
      renderDesktop({ onPriceChange });

      await userEvent.click(screen.getByText("R$ 150,00"));
      const input = screen.getByDisplayValue("150,00");
      await userEvent.clear(input);
      await userEvent.type(input, "180");
      fireEvent.blur(input);

      expect(screen.getByText("editado")).toBeInTheDocument();
    });
  });

  // ===================== REMOVE ITEM =====================

  describe("Remove item", () => {
    it("opens confirmation dialog on trash click", async () => {
      renderDesktop();

      const trashButton = screen.getAllByRole("button").find((b) => b.className.includes("destructive"));
      expect(trashButton).toBeTruthy();
      await userEvent.click(trashButton!);

      expect(screen.getByText("Remover Item")).toBeInTheDocument();
      expect(screen.getByText(/Instalação Split 12000 BTUs/)).toBeInTheDocument();
    });

    it("calls onRemove when confirmed", async () => {
      const onRemove = vi.fn();
      renderDesktop({ onRemove });

      const trashButton = screen.getAllByRole("button").find((b) => b.className.includes("destructive"));
      await userEvent.click(trashButton!);

      const confirmButton = screen.getByText("Sim, Remover");
      await userEvent.click(confirmButton);

      expect(onRemove).toHaveBeenCalledWith(0);
    });

    it("does not call onRemove when cancelled", async () => {
      const onRemove = vi.fn();
      renderDesktop({ onRemove });

      const trashButton = screen.getAllByRole("button").find((b) => b.className.includes("destructive"));
      await userEvent.click(trashButton!);

      const cancelButton = screen.getByText("Cancelar");
      await userEvent.click(cancelButton);

      expect(onRemove).not.toHaveBeenCalled();
    });

    it("calls onRemove via minus button when qty=1 and confirmed", async () => {
      const onRemove = vi.fn();
      renderDesktop({ onRemove, item: { ...baseItem, quantity: 1, subtotal: 150 } });

      const outlineButtons = screen.getAllByRole("button").filter((b) => b.className.includes("outline"));
      await userEvent.click(outlineButtons[0]);

      const confirmButton = screen.getByText("Sim, Remover");
      await userEvent.click(confirmButton);

      expect(onRemove).toHaveBeenCalledWith(0);
    });
  });

  // ===================== CURRENCY FORMATTING =====================

  describe("Currency formatting", () => {
    it("formats subtotal correctly", () => {
      renderDesktop({ item: { ...baseItem, subtotal: 1234.56 } });
      expect(screen.getByText("R$ 1.234,56")).toBeInTheDocument();
    });

    it("formats zero values", () => {
      renderDesktop({ item: { ...baseItem, unit_price: 0, subtotal: 0 } });
      expect(screen.getByText("R$ 0,00")).toBeInTheDocument();
    });
  });

  // ===================== EDGE CASES =====================

  describe("Edge cases", () => {
    it("handles missing optional fields gracefully", () => {
      renderDesktop({
        item: { description: "Test" },
        showCode: false,
      });
      expect(screen.getByText("Test")).toBeInTheDocument();
    });

    it("renders correctly with index > 0", () => {
      const onQuantityChange = vi.fn();
      renderDesktop({ index: 5, onQuantityChange });

      const outlineButtons = screen.getAllByRole("button").filter((b) => b.className.includes("outline"));
      userEvent.click(outlineButtons[1]);

      // Verify index is passed correctly
      waitFor(() => expect(onQuantityChange).toHaveBeenCalledWith(5, 3));
    });
  });
});
