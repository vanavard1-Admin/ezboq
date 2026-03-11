import { generateSmartBOQ } from '../utils/smartBOQ';
import { BOQItem, Profile } from '../types/boq';
import { log } from '../utils/logger';
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Sparkles, ArrowRight, Info, Calculator } from "lucide-react";
import { getProjectTypeInfo, SmartBOQInputs } from "../utils/smartBOQ";
import { toast } from "sonner";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";

interface SmartBOQDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (items: BOQItem[]) => void;
}

export function SmartBOQDialog({ open, onOpenChange, onGenerate }: SmartBOQDialogProps) {
  const [step, setStep] = useState<'type' | 'details'>('type');
  const [projectType, setProjectType] = useState<'house' | 'building' | 'cafe' | 'restaurant' | 'retail' | 'office' | 'clinic' | 'hotel' | 'gym' | 'spa'>('house');
  
  // Form inputs - start empty
  const [usableArea, setUsableArea] = useState("");
  const [floors, setFloors] = useState("1");
  const [perimeter, setPerimeter] = useState("");
  const [floorHeight, setFloorHeight] = useState("");
  const [seatCount, setSeatCount] = useState("");
  const [facadeFront, setFacadeFront] = useState("");
  const [signageWidth, setSignageWidth] = useState("");
  const [kitchenType, setKitchenType] = useState<'light' | 'heavy'>('light');
  const [finishLevel, setFinishLevel] = useState<'basic' | 'standard' | 'premium'>('standard');
  
  // Additional inputs for other project types
  const [roomCount, setRoomCount] = useState("");
  const [xrayRoom, setXrayRoom] = useState(false);
  const [guestRoomCount, setGuestRoomCount] = useState("");
  const [shopfrontWidth, setShopfrontWidth] = useState("");

  // Auto-calculate derived values based on inputs
  useEffect(() => {
    const area = parseFloat(usableArea) || 0;
    
    if (area > 0) {
      // Auto-calculate perimeter if not manually set (assume square-ish shape)
      if (!perimeter) {
        const estimatedPerimeter = Math.ceil(Math.sqrt(area) * 4);
        setPerimeter(String(estimatedPerimeter));
      }
      
      // Auto-calculate seat count (1.5-2 sqm per seat depending on type)
      if (!seatCount && (projectType === 'cafe' || projectType === 'restaurant')) {
        const sqmPerSeat = projectType === 'cafe' ? 1.8 : 2.0;
        const kitchenRatio = projectType === 'cafe' ? 0.25 : 0.35;
        const seatingArea = area * (1 - kitchenRatio);
        const estimatedSeats = Math.ceil(seatingArea / sqmPerSeat);
        setSeatCount(String(estimatedSeats));
      }
      
      // Auto-calculate facade (assume 1/4 of perimeter)
      if (!facadeFront && perimeter) {
        const perimeterNum = parseFloat(perimeter) || 0;
        if (perimeterNum > 0) {
          const estimatedFacade = Math.ceil(perimeterNum / 4);
          setFacadeFront(String(estimatedFacade));
        }
      }
      
      // Auto-calculate signage (assume 75% of facade width)
      if (!signageWidth && facadeFront) {
        const facadeNum = parseFloat(facadeFront) || 0;
        if (facadeNum > 0) {
          const estimatedSignage = Math.ceil(facadeNum * 0.75);
          setSignageWidth(String(estimatedSignage));
        }
      }
    }
  }, [usableArea, projectType, perimeter, facadeFront, seatCount, signageWidth]);

  const handleSelectType = (type: 'house' | 'building' | 'cafe' | 'restaurant' | 'retail' | 'office' | 'clinic' | 'hotel' | 'gym' | 'spa') => {
    setProjectType(type);
    const info = getProjectTypeInfo(type);
    
    // Set defaults only for floor height and preferences
    setFloorHeight(String(info.defaultInputs.floorHeight_m));
    if (info.defaultInputs.kitchenType) {
      setKitchenType(info.defaultInputs.kitchenType);
    }
    if (info.defaultInputs.finishLevel) {
      setFinishLevel(info.defaultInputs.finishLevel);
    }
    
    setStep('details');
  };

  const handleGenerate = () => {
    try {
      const inputs: SmartBOQInputs = {
        projectType,
        usableArea_m2: parseFloat(usableArea) || 0,
        floors: parseInt(floors) || 1,
        perimeterPerFloor_m: parseFloat(perimeter) || 0,
        floorHeight_m: parseFloat(floorHeight) || 3.0,
        seatCount: parseInt(seatCount) || 0,
        facadeFront_m: parseFloat(facadeFront) || 0,
        signageWidth_m: parseFloat(signageWidth) || 0,
        kitchenType,
        finishLevel,
        roomCount: parseInt(roomCount) || 0,
        xrayRoom,
        guestRoomCount: parseInt(guestRoomCount) || 0,
        shopfrontWidth_m: parseFloat(shopfrontWidth) || 0,
      };

      // Validate
      if (inputs.usableArea_m2 <= 0) {
        toast.error("กรุณาระบุพื้นที่ใช้สอยที่ถูกต้อง");
        return;
      }
      if (inputs.perimeterPerFloor_m <= 0) {
        toast.error("กรุณาระบุความยาวรอบเส้นรอบพื้นที่");
        return;
      }

      const items = generateSmartBOQ(inputs);
      
      if (items.length === 0) {
        toast.error("��ม่สามารถสร้างรายการได้ กรุณาตรวจสอบข้อมูล");
        return;
      }

      onGenerate(items);
      toast.success(`สร้าง SmartBOQ สำเร็จ!`, {
        description: `สร้างรายการ ${items.length} รายการ`,
      });
      onOpenChange(false);
      
      // Reset
      setStep('type');
    } catch (error) {
      log.error("SmartBOQ generation failed:", error);
      toast.error("เกิดข้อผิดพลาดในการสร้าง BOQ");
    }
  };

  const projectTypes = [
    { id: 'house', ...getProjectTypeInfo('house') },
    { id: 'building', ...getProjectTypeInfo('building') },
    { id: 'cafe', ...getProjectTypeInfo('cafe') },
    { id: 'restaurant', ...getProjectTypeInfo('restaurant') },
    { id: 'retail', ...getProjectTypeInfo('retail') },
    { id: 'office', ...getProjectTypeInfo('office') },
    { id: 'clinic', ...getProjectTypeInfo('clinic') },
    { id: 'hotel', ...getProjectTypeInfo('hotel') },
    { id: 'gym', ...getProjectTypeInfo('gym') },
    { id: 'spa', ...getProjectTypeInfo('spa') },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl">SmartBOQ - สร้าง BOQ อัตโนมัติ</DialogTitle>
              <DialogDescription>
                ระบุข้อมูลพื้นฐาน ระบบจะสร้างรายการวัสดุให้อัตโนมัติ
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {step === 'type' && (
          <div className="space-y-4 py-4">
            <div>
              <h3 className="mb-3">เลือกประเภทโครงการ:</h3>
              <div className="grid grid-cols-2 gap-3">
                {projectTypes.map((type) => (
                  <Card 
                    key={type.id}
                    className="cursor-pointer hover:border-purple-500 hover:shadow-lg transition-all"
                    onClick={() => handleSelectType(type.id as any)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-3xl">{type.icon}</span>
                        <div className="flex-1">
                          <CardTitle className="text-base">{type.name}</CardTitle>
                          {(type as any).category && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              {(type as any).category}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-xs">
                        {type.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-xs text-blue-800">
                  <div className="font-medium mb-1">💡 SmartBOQ คืออะไร?</div>
                  <div>ระบบจะคำนวณรายการวัสดุ-แรง-ค่าใช้จ่ายให้อัตโนมัติ ตามมาตรฐานงานก่อสร้าง และข้อมูลที่คุณระบุ</div>
                </div>
              </div>
              
              <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                <Calculator className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <div className="text-xs text-green-800">
                  <div className="font-medium mb-1">🎯 ระบบคำนวณอัตโนมัติ</div>
                  <div>กรอกแค่ "พื้นที่" ระบบจะคำนวณค่าอื่นๆ ให้อัตโนมัติ (จำนวนที่นั่ง, รอบเส้น, หน้าร้าน, ป้าย) สามารถแก้ไขได้ทุกค่า</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'details' && (
          <div className="space-y-4 py-4">
            {/* Project Type Badge */}
            <div className="flex items-center gap-2">
              <span className="text-2xl">{projectTypes.find(t => t.id === projectType)?.icon}</span>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary">
                    {projectTypes.find(t => t.id === projectType)?.name}
                  </Badge>
                  {(projectTypes.find(t => t.id === projectType) as any)?.category && (
                    <Badge variant="outline" className="text-xs">
                      {(projectTypes.find(t => t.id === projectType) as any)?.category}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {projectTypes.find(t => t.id === projectType)?.description}
                </div>
              </div>
            </div>

            <Separator />

            {/* Basic Info */}
            <div>
              <h3 className="mb-3 flex items-center gap-2">
                ข้อมูลพื้นฐาน
                <Badge variant="outline">จำเป็น</Badge>
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="area" className="flex items-center gap-1">
                    พื้นที่ใช้สอย (ตร.ม.)
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="area"
                    type="number"
                    value={usableArea}
                    onChange={(e) => setUsableArea(e.target.value)}
                    placeholder="เช่น 80"
                    className="border-blue-300 focus:border-blue-500"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    <Calculator className="h-3 w-3 inline mr-1" />
                    ค่าอื่นๆ จะคำนวณอัตโนมัติ
                  </div>
                </div>
                <div>
                  <Label htmlFor="floors">จำนวนชั้น</Label>
                  <Input
                    id="floors"
                    type="number"
                    value={floors}
                    onChange={(e) => setFloors(e.target.value)}
                    placeholder="1"
                  />
                </div>
                <div>
                  <Label htmlFor="perimeter" className="flex items-center gap-1">
                    ความยาวรอบเส้น/ชั้น (ม.)
                    {perimeter && !usableArea && <span className="text-xs text-muted-foreground">(คำนวณอัตโนมัติ)</span>}
                  </Label>
                  <Input
                    id="perimeter"
                    type="number"
                    value={perimeter}
                    onChange={(e) => setPerimeter(e.target.value)}
                    placeholder="คำนวณจากพื้นที่"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    เช่น ห้อง 10x10m = 40m
                  </div>
                </div>
                <div>
                  <Label htmlFor="height">ความสูงเพดาน (ม.)</Label>
                  <Input
                    id="height"
                    type="number"
                    step="0.1"
                    value={floorHeight}
                    onChange={(e) => setFloorHeight(e.target.value)}
                    placeholder="3.5"
                  />
                  <div className="text-xs text-green-600 mt-1">
                    ✓ ค่า default: {floorHeight || "3.0"} ม.
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Cafe-specific */}
            {(projectType === 'cafe' || projectType === 'restaurant') && (
              <div>
                <h3 className="mb-3 flex items-center gap-2">
                  ข้อมูลร้านอาหาร/คาเฟ่
                  <Badge variant="secondary" className="text-xs">
                    <Calculator className="h-3 w-3 mr-1" />
                    คำนวณอัตโนมัติ
                  </Badge>
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="seats">จำนวนที่นั่ง</Label>
                    <Input
                      id="seats"
                      type="number"
                      value={seatCount}
                      onChange={(e) => setSeatCount(e.target.value)}
                      placeholder="คำนวณจากพื้นที่"
                    />
                    {seatCount && (
                      <div className="text-xs text-green-600 mt-1">
                        ✓ ประมาณ {seatCount} ที่นั่ง ({projectType === 'cafe' ? '1.8' : '2.0'} ตรม/ที่)
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="kitchen">ประเภทครัว</Label>
                    <Select value={kitchenType} onValueChange={(v: any) => setKitchenType(v)}>
                      <SelectTrigger id="kitchen">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">ครัวเบา (เครื่องดื่ม, ขนม)</SelectItem>
                        <SelectItem value="heavy">ครัวหนัก (ปรุงอาหาร)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="facade">ความกว้างหน้าร้าน (ม.)</Label>
                    <Input
                      id="facade"
                      type="number"
                      value={facadeFront}
                      onChange={(e) => setFacadeFront(e.target.value)}
                      placeholder="คำนวณจากรอบเส้น"
                    />
                    {facadeFront && (
                      <div className="text-xs text-green-600 mt-1">
                        ✓ กระจกหน้าร้าน ≈ {Math.ceil(parseFloat(facadeFront) * (parseFloat(floorHeight) || 3.5) * 0.8)} ตรม
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="signage">ความกว้างป้าย (ม.)</Label>
                    <Input
                      id="signage"
                      type="number"
                      value={signageWidth}
                      onChange={(e) => setSignageWidth(e.target.value)}
                      placeholder="คำนวณจากหน้าร้าน"
                    />
                    {signageWidth && (
                      <div className="text-xs text-muted-foreground mt-1">
                        ≈ 75% ของความกว้างหน้าร้าน
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Clinic-specific */}
            {projectType === 'clinic' && (
              <div>
                <h3 className="mb-3">ข้อมูลคลินิก</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="roomCount">จำนวนห้องตรวจ/ทรีทเมนต์</Label>
                    <Input
                      id="roomCount"
                      type="number"
                      value={roomCount}
                      onChange={(e) => setRoomCount(e.target.value)}
                      placeholder="5"
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <input
                      type="checkbox"
                      id="xrayRoom"
                      checked={xrayRoom}
                      onChange={(e) => setXrayRoom(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="xrayRoom" className="cursor-pointer">
                      มีห้องเอกซเรย์ (X-Ray)
                    </Label>
                  </div>
                </div>
              </div>
            )}

            {/* Hotel-specific */}
            {projectType === 'hotel' && (
              <div>
                <h3 className="mb-3">ข้อมูลโรงแรม</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="guestRoomCount">จำนวนห้องพัก</Label>
                    <Input
                      id="guestRoomCount"
                      type="number"
                      value={guestRoomCount}
                      onChange={(e) => setGuestRoomCount(e.target.value)}
                      placeholder="10"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Retail-specific */}
            {projectType === 'retail' && (
              <div>
                <h3 className="mb-3">ข้อมูลร้านค้า</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="shopfrontWidth">ความกว้างหน้าร้าน (ม.)</Label>
                    <Input
                      id="shopfrontWidth"
                      type="number"
                      value={shopfrontWidth}
                      onChange={(e) => setShopfrontWidth(e.target.value)}
                      placeholder="6"
                    />
                  </div>
                </div>
              </div>
            )}

            {(projectType === 'clinic' || projectType === 'hotel' || projectType === 'retail') && <Separator />}

            {/* Finish Level */}
            <div>
              <Label htmlFor="finish">ระดับงานตกแต่ง</Label>
              <Select value={finishLevel} onValueChange={(v: any) => setFinishLevel(v)}>
                <SelectTrigger id="finish">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">เบสิก - ประหยัด</SelectItem>
                  <SelectItem value="standard">มาตรฐาน</SelectItem>
                  <SelectItem value="premium">พรีเมียม - หรูหรา</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setStep('type')}
                className="flex-1"
              >
                เปลี่ยนประเภท
              </Button>
              <Button
                onClick={handleGenerate}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                สร้าง BOQ อัตโนมัติ
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}