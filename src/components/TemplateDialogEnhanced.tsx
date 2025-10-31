import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "./ui/sheet";
import { TemplateSelectorEnhanced } from "./TemplateSelectorEnhanced";
import { TemplateMetadata } from "../types/template";
import { BOQItem } from "../types/boq";

interface TemplateDialogEnhancedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: TemplateMetadata) => void;
  currentBOQItems?: BOQItem[]; // Pass current BOQ items for creating custom templates
}

export function TemplateDialogEnhanced({ 
  open, 
  onOpenChange, 
  onSelectTemplate,
  currentBOQItems = []
}: TemplateDialogEnhancedProps) {
  const handleSelect = (template: TemplateMetadata) => {
    onSelectTemplate(template);
    // Don't close dialog - user can add more templates
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-[95vw] lg:max-w-[90vw] xl:max-w-[85vw] p-0 flex flex-col overflow-hidden"
      >
        {/* Hidden but accessible headers for screen readers */}
        <div className="sr-only">
          <SheetTitle>เลือก Template BOQ</SheetTitle>
          <SheetDescription>เลือก Template สำเร็จรูปหรือสร้าง Template ของคุณเอง</SheetDescription>
        </div>
        
        <TemplateSelectorEnhanced 
          onSelectTemplate={handleSelect} 
          onClose={() => onOpenChange(false)}
          currentBOQItems={currentBOQItems}
        />
      </SheetContent>
    </Sheet>
  );
}
