import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Minus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface OSItemRowItem {
  description: string;
  service_code?: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface OSItemRowProps {
  item: { description?: string; service_code?: string | null; quantity?: number; unit_price?: number; subtotal?: number; [key: string]: any };
  index: number;
  showCode: boolean;
  readOnly: boolean;
  onQuantityChange: (index: number, qty: number) => void;
  onPriceChange: (index: number, price: number) => void;
  onRemove: (index: number) => void;
  maxQuantity?: number;
  isMobile?: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const parseCurrencyInput = (raw: string): number | null => {
  const cleaned = raw.replace(/[^\d,.-]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  if (isNaN(num) || num < 0) return null;
  return Math.round(num * 100) / 100;
};

export function OSItemRow({
  item,
  index,
  showCode,
  readOnly,
  onQuantityChange,
  onPriceChange,
  onRemove,
  maxQuantity,
  isMobile,
}: OSItemRowProps) {
  const desc = item.description || "";
  const qty = item.quantity || 1;
  const unitPrice = item.unit_price || 0;
  const subtotal = item.subtotal || 0;
  const serviceCode = item.service_code || "";

  const [editingQty, setEditingQty] = useState(false);
  const [qtyDraft, setQtyDraft] = useState(String(qty));
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceDraft, setPriceDraft] = useState("");
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [priceModified, setPriceModified] = useState(false);

  const qtyInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingQty) qtyInputRef.current?.select();
  }, [editingQty]);

  useEffect(() => {
    if (editingPrice) priceInputRef.current?.select();
  }, [editingPrice]);

  // -- Quantity handlers --
  const commitQty = (val: string) => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 1 && (maxQuantity == null || n <= maxQuantity)) {
      onQuantityChange(index, n);
    }
    setEditingQty(false);
  };

  const handleMinus = () => {
    if (qty <= 1) {
      setShowRemoveDialog(true);
    } else {
      onQuantityChange(index, qty - 1);
    }
  };

  const handlePlus = () => {
    if (maxQuantity == null || qty < maxQuantity) {
      onQuantityChange(index, qty + 1);
    }
  };

  // -- Price handlers --
  const openPriceEdit = () => {
    setPriceDraft(unitPrice.toFixed(2).replace(".", ","));
    setEditingPrice(true);
  };

  const commitPrice = (val: string) => {
    const parsed = parseCurrencyInput(val);
    if (parsed !== null && parsed > 0) {
      onPriceChange(index, parsed);
      setPriceModified(true);
    }
    setEditingPrice(false);
  };

  // -- Remove dialog --
  const removeDialog = (
    <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover Item</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja remover <strong>{desc}</strong> da ordem de serviço?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => onRemove(index)}>
            Sim, Remover
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // -- Quantity control --
  const qtyControl = readOnly ? (
    <span className="text-center">{qty}</span>
  ) : (
    <div className="inline-flex items-center gap-0.5">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn("h-8 w-8", isMobile && "h-11 w-11")}
        onClick={handleMinus}
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      {editingQty ? (
        <Input
          ref={qtyInputRef}
          type="number"
          min={1}
          max={maxQuantity}
          className={cn("w-14 h-8 text-center px-1", isMobile && "h-11")}
          value={qtyDraft}
          onChange={(e) => setQtyDraft(e.target.value)}
          onBlur={() => commitQty(qtyDraft)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commitQty(qtyDraft); }
            if (e.key === "Escape") setEditingQty(false);
          }}
        />
      ) : (
        <button
          type="button"
          className={cn(
            "w-10 h-8 text-center text-sm font-medium rounded-md hover:bg-accent transition-colors",
            isMobile && "h-11 w-12"
          )}
          onClick={() => { setQtyDraft(String(qty)); setEditingQty(true); }}
        >
          {qty}
        </button>
      )}
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn("h-8 w-8", isMobile && "h-11 w-11")}
        onClick={handlePlus}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  // -- Price display --
  const priceDisplay = readOnly ? (
    <span>{formatCurrency(unitPrice)}</span>
  ) : editingPrice ? (
    <Input
      ref={priceInputRef}
      inputMode="decimal"
      className={cn("w-28 h-8 text-right px-2", isMobile && "h-11")}
      value={priceDraft}
      onChange={(e) => setPriceDraft(e.target.value)}
      onBlur={() => commitPrice(priceDraft)}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); commitPrice(priceDraft); }
        if (e.key === "Escape") setEditingPrice(false);
      }}
    />
  ) : (
    <button
      type="button"
      className="text-right hover:text-primary transition-colors inline-flex items-center gap-1"
      onClick={openPriceEdit}
    >
      {formatCurrency(unitPrice)}
      {priceModified && (
        <Badge variant="secondary" className="text-[10px] px-1 py-0 leading-tight">
          editado
        </Badge>
      )}
    </button>
  );

  // -- Trash button --
  const trashButton = !readOnly && (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8 text-destructive hover:text-destructive", isMobile && "h-11 w-11")}
      onClick={() => setShowRemoveDialog(true)}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );

  // ===== MOBILE CARD =====
  if (isMobile) {
    return (
      <>
        {removeDialog}
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{desc}</p>
              {showCode && serviceCode && (
                <p className="text-xs text-muted-foreground">{serviceCode}</p>
              )}
            </div>
            {trashButton}
          </div>
          <div className="flex items-center justify-between gap-2">
            {qtyControl}
            <div className="text-right space-y-0.5">
              {priceDisplay}
              <p className="text-xs text-muted-foreground">
                Sub: {formatCurrency(subtotal)}
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ===== DESKTOP TABLE ROW =====
  return (
    <>
      {removeDialog}
      <tr className="border-b transition-colors hover:bg-muted/50">
        <td className="p-4 align-middle max-w-[150px] truncate">{desc}</td>
        {showCode && <td className="p-4 align-middle">{serviceCode || "-"}</td>}
        <td className="p-4 align-middle text-center">{qtyControl}</td>
        <td className="p-4 align-middle text-right">{priceDisplay}</td>
        <td className="p-4 align-middle text-right font-medium">{formatCurrency(subtotal)}</td>
        <td className="p-4 align-middle">{trashButton}</td>
      </tr>
    </>
  );
}
