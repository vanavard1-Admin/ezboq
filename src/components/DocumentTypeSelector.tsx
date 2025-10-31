import { DocumentType } from "../types/boq";
import { Card } from "./ui/card";
import { FileText, FileCheck, Receipt } from "lucide-react";

interface DocumentTypeSelectorProps {
  selected: DocumentType;
  onChange: (type: DocumentType) => void;
}

export function DocumentTypeSelector({ selected, onChange }: DocumentTypeSelectorProps) {
  const types: { value: DocumentType; label: string; description: string; icon: any }[] = [
    {
      value: "boq",
      label: "BOQ - รายการถอดวัสดุ",
      description: "Bill of Quantities สำหรับประมาณการวัสดุและต้นทุน",
      icon: FileText,
    },
    {
      value: "quotation",
      label: "ใบเสนอราคา",
      description: "Quotation เสนอราคาให้ลูกค้า พร้อมส่วนลด",
      icon: FileCheck,
    },
    {
      value: "invoice",
      label: "ใบวางบิล/ใบแจ้งหนี้",
      description: "Invoice แจ้งชำระเงิน พร้อมแบ่งงวด",
      icon: Receipt,
    },
  ];

  return (
    <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-lg border-purple-100">
      <h3 className="mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
        เลือกประเภทเอกสาร
      </h3>
      <div className="grid md:grid-cols-3 gap-4">
        {types.map((type) => {
          const Icon = type.icon;
          const isSelected = selected === type.value;
          return (
            <button
              key={type.value}
              onClick={() => onChange(type.value)}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                isSelected
                  ? "border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 shadow-md"
                  : "border-gray-200 hover:border-purple-300 hover:bg-purple-50/50"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-2 rounded-lg ${
                  isSelected 
                    ? "bg-gradient-to-br from-purple-500 to-pink-500" 
                    : "bg-gradient-to-br from-gray-100 to-gray-200"
                }`}>
                  <Icon className={`h-5 w-5 ${isSelected ? "text-white" : "text-gray-600"}`} />
                </div>
                <span className={isSelected ? "font-semibold text-purple-700" : "font-medium"}>
                  {type.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {type.description}
              </p>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
