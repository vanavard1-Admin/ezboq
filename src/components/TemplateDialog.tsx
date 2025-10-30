import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { TemplateSelector } from "./TemplateSelector";
import { TemplateMetadata } from "../types/template";

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: TemplateMetadata) => void;
}

export function TemplateDialog({ open, onOpenChange, onSelectTemplate }: TemplateDialogProps) {
  const handleSelect = (template: TemplateMetadata) => {
    onSelectTemplate(template);
    // Don't close dialog - user can add more templates
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full sm:max-w-[90vw] lg:max-w-[1200px] xl:max-w-[1400px] h-[90vh] max-h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>เลือก Template BOQ</DialogTitle>
          <DialogDescription>
            เลือก Template สำเร็จรูปสำหรับสร้าง BOQ หรือคำนวณจากงบประมาณและพื้นที่
          </DialogDescription>
        </DialogHeader>
        <TemplateSelector 
          onSelectTemplate={handleSelect} 
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
