import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Signature } from "../types/boq";
import { Upload, X } from "lucide-react";

interface SignatureSectionProps {
  signatures: Signature[];
  onUpdate: (signatures: Signature[]) => void;
}

export function SignatureSection({ signatures, onUpdate }: SignatureSectionProps) {
  const handleFileUpload = (type: "proposer" | "customer" | "witness", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const updated = signatures.map(sig =>
          sig.type === type ? { ...sig, signatureUrl: reader.result as string } : sig
        );
        onUpdate(updated);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateField = (type: "proposer" | "customer" | "witness", field: keyof Signature, value: string) => {
    const updated = signatures.map(sig =>
      sig.type === type ? { ...sig, [field]: value } : sig
    );
    onUpdate(updated);
  };

  const clearSignature = (type: "proposer" | "customer" | "witness") => {
    const updated = signatures.map(sig =>
      sig.type === type ? { ...sig, signatureUrl: undefined } : sig
    );
    onUpdate(updated);
  };

  const getSignature = (type: "proposer" | "customer" | "witness") => {
    return signatures.find(sig => sig.type === type);
  };

  const renderSignatureCard = (type: "proposer" | "customer" | "witness", title: string) => {
    const signature = getSignature(type);
    
    return (
      <Card className="p-4">
        <h4 className="mb-3">{title}</h4>
        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label>ชื่อ-นามสกุล</Label>
            <Input
              value={signature?.name || ""}
              onChange={(e) => handleUpdateField(type, "name", e.target.value)}
              placeholder="ระบุชื่อ..."
            />
          </div>
          <div className="grid gap-2">
            <Label>ตำแหน่ง</Label>
            <Input
              value={signature?.position || ""}
              onChange={(e) => handleUpdateField(type, "position", e.target.value)}
              placeholder="ระบุตำแหน่ง..."
            />
          </div>
          <div className="grid gap-2">
            <Label>ลายเซ็นอิเล็กทรอนิกส์</Label>
            {signature?.signatureUrl ? (
              <div className="relative border rounded-lg p-2 bg-muted/20">
                <img 
                  src={signature.signatureUrl} 
                  alt="Signature" 
                  className="max-h-24 mx-auto"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute top-1 right-1"
                  onClick={() => clearSignature(type)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <input
                  type="file"
                  accept="image/*"
                  id={`signature-${type}`}
                  className="hidden"
                  onChange={(e) => handleFileUpload(type, e)}
                />
                <label htmlFor={`signature-${type}`} className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">คลิกเพื่ออัพโหลดลายเซ็น</p>
                </label>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="grid md:grid-cols-3 gap-4 print:grid-cols-3">
      {renderSignatureCard("proposer", "ผู้เสนอราคา")}
      {renderSignatureCard("customer", "ลูกค้า")}
      {renderSignatureCard("witness", "พยาน")}
    </div>
  );
}
