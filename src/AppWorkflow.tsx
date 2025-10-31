import { useEffect, useState, useRef, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import type { Document } from "./types/boq";
import { projectId } from "./utils/supabase/info";
import { supabase } from "./utils/supabase/client";
import { api } from "./utils/api";
import { toast } from "sonner@2.0.3";
import { analyzePayloadSize, saveMonitor } from "./utils/saveOptimizer";

type Page = "selector" | "boq" | "quotation" | "invoice" | "receipt";

interface AppWorkflowProps {
  user: User | null;
  editingDocument?: Document | null;
  onNavigate?: (view: string) => void;
}

import type { BOQItem, Profile, CompanyInfo, CustomerInfo, Discount, PaymentTerms, BankInfo, TaxInvoice, ProjectSettings, Signature } from "./types/boq";
import { calculateBOQSummary } from "./utils/calculations";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "./components/ui/button";
import { Toaster } from "./components/ui/sonner";
import { DocumentSelectorPage } from "./pages/DocumentSelectorPage";
import { BOQPage } from "./pages/BOQPage";
import { QuotationPage } from "./pages/QuotationPage";
import { InvoicePage } from "./pages/InvoicePage";
import { ReceiptPageEnhanced } from "./pages/ReceiptPageEnhanced";
import { PDFExportWrapper } from "./components/PDFExportWrapper";
import { CompletionSummaryDialog } from "./components/CompletionSummaryDialog";
import { SettingsDialog } from "./components/SettingsDialog";

function AppWorkflow({ user, editingDocument, onNavigate }: AppWorkflowProps) {
  const [currentPage, setCurrentPage] = useState<Page>("selector");
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [projectId_internal, setProjectIdInternal] = useState<string>(`project-${Date.now()}`);
  
  // Completion dialog state
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [completedDocumentType, setCompletedDocumentType] = useState<"quotation" | "invoice" | "receipt">("quotation");
  const [completedDocumentNumber, setCompletedDocumentNumber] = useState("");
  
  // Project data
  const [projectTitle, setProjectTitle] = useState("โครงการใหม่");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectLocation, setProjectLocation] = useState("");
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  
  // Financial data
  const [discount, setDiscount] = useState<Discount | null>(null);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms | null>(null);
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
  const [taxInvoice, setTaxInvoice] = useState<TaxInvoice>({
    invoiceNumber: `INV-${new Date().getFullYear()}-0001`,
    issueDate: new Date().toISOString().split('T')[0],
    paymentMethod: "transfer",
    receiptNumber: `REC-${new Date().getFullYear()}-0001`,
  });
  
  // Document notes and terms
  const [quotationNotes, setQuotationNotes] = useState("ใบเสนอราคานี้มีผลบังคับใช้ 30 วัน นับจากวันที่ออกเอกสาร\nราคาดังกล่าวยังไม่รวมค่าขนส่ง (ถ้ามี)\nการเปลี่ยนแปลงรายละเอียดอาจมีผลต่อราคาที่เสนอ");
  const [paymentConditions, setPaymentConditions] = useState("ชำระเต็มจำนวนภายใน 7 วัน หลังจากได้รับใบเสนอราคา");
  
  // Settings
  const [profile, setProfile] = useState<Profile>({
    wastePct: 3,
    opexPct: 5,
    errorPct: 2,
    markupPct: 10,
    vatPct: 7,
  });

  const [company, setCompany] = useState<CompanyInfo>({
    name: "บริษัท ก่อสร้างและตกแต่ง จำกัด",
    address: "123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110",
    taxId: "0-1055-00000-00-0",
    phone: "02-123-4567",
    email: "info@construction.com",
    website: "www.construction.com",
  });

  const [customer, setCustomer] = useState<CustomerInfo>({
    type: "individual",
    name: "คุณสมชาย ใจดี",
    address: "456 ถนนพระราม 4 แขวงปทุมวัน เขตปทุมวัน กรุงเทพมหานคร 10330",
    phone: "081-234-5678",
    email: "somchai@email.com",
  });

  const [settings, setSettings] = useState<ProjectSettings>({
    paperSize: "A4",
    orientation: "portrait",
    showLogo: true,
    showTaxId: true,
  });

  const [signatures, setSignatures] = useState<Signature[]>([
    { type: "proposer", name: "", position: "" },
    { type: "customer", name: "", position: "" },
    { type: "witness", name: "", position: "" },
  ]);

  // Partner & Withholding Tax Support
  const [recipientType, setRecipientType] = useState<'customer' | 'partner'>('customer');
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [mainProjectTag, setMainProjectTag] = useState('');
  const [withholdingTaxRate, setWithholdingTaxRate] = useState(0);
  const [withholdingTaxType, setWithholdingTaxType] = useState('');
  
  // Selected installment for PDF export
  const [selectedInstallmentForExport, setSelectedInstallmentForExport] = useState<number | null>(null);

  const goToPage = (page: Page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDocumentSelect = (type: "boq" | "quotation" | "invoice" | "receipt") => {
    // Generate new project ID for new document
    setProjectIdInternal(`project-${Date.now()}`);
    setCurrentDocumentId(null);
    goToPage(type);
  };

  const backToSelector = () => {
    goToPage("selector");
  };

  /**
   * Save document to backend and show completion dialog
   */
  const saveDocument = async (type: 'boq' | 'quotation' | 'invoice' | 'receipt', showDialog = false) => {
    const saveStartTime = performance.now();
    
    try {
      console.log(`💾 Starting save for ${type}...`);
      const summary = calculateBOQSummary(boqItems, profile, discount);
      
      // 📊 Analyze payload size before sending
      const itemCount = boqItems.length;
      console.log(`📦 Document contains ${itemCount} items`);
      
      const documentData: Document = {
        id: currentDocumentId || `${type}-${Date.now()}`,
        projectId: projectId_internal,
        type,
        documentNumber: undefined, // Server will auto-generate
        status: 'draft',
        projectTitle,
        projectDescription,
        projectLocation,
        boqItems,
        profile,
        company,
        customer,
        discount,
        paymentTerms,
        bankInfo,
        taxInvoice,
        quotationNotes,
        paymentConditions,
        signatures,
        recipientType,
        partnerId: selectedPartner?.id,
        partner: selectedPartner,
        partnerName: selectedPartner?.name,
        mainProjectTag,
        withholdingTaxRate,
        withholdingTaxType,
        totalAmount: summary.grandTotal,
        createdAt: currentDocumentId ? undefined : Date.now(),
        updatedAt: Date.now(),
      };
      
      console.log(`📊 Document data prepared (${boqItems.length} items)`);<br/>
      
      // 📊 Analyze and log payload size
      const payloadSize = analyzePayloadSize(documentData, `${type} document`);
      
      // ⚠️ Warn about very large payloads
      if (payloadSize > 1024 * 1024) {
        console.warn(`⚠️ Very large document (${Math.round(payloadSize / 1024 / 1024)}MB)`);
        console.warn(`💡 Consider reducing number of items or splitting into multiple documents`);
      }
      
      // ✅ api.put and api.post return data directly, not Response objects
      let result;
      if (currentDocumentId) {
        // Update existing document
        console.log(`📝 Updating document ${currentDocumentId}...`);
        result = await api.put(`/documents/${currentDocumentId}`, documentData);
      } else {
        // Create new document
        console.log(`📝 Creating new ${type} document...`);
        result = await api.post('/documents', documentData);
      }

      // ✅ Check if result has document (success) or error field
      if (result && result.document) {
        if (result.document.id) {
          setCurrentDocumentId(result.document.id);
        }
        
        const elapsed = Math.round(performance.now() - saveStartTime);
        console.log(`✅ ${type.toUpperCase()} saved successfully in ${elapsed}ms:`, result.document.id);
        
        // 📊 Record performance metrics
        const payloadSize = analyzePayloadSize(documentData, `${type} document`);
        saveMonitor.record(elapsed, payloadSize);
        
        // Performance monitoring with adjusted thresholds
        if (elapsed > 10000) {
          console.error(`❌ CRITICAL: Save operation took ${elapsed}ms - urgent optimization needed`);
          console.log('💡 Performance hint: Check server logs for detailed breakdown');
          console.log(`📊 Payload size: ${Math.round(payloadSize / 1024)}KB, Items: ${boqItems.length}`);
          
          // Check for QR Code
          if (bankInfo?.qrCodeUrl) {
            const qrSize = Math.round(bankInfo.qrCodeUrl.length * 0.75 / 1024);
            console.log(`  - QR Code size: ${qrSize}KB`);
            if (qrSize > 200) {
              console.log(`  - ⚠️ Large QR Code detected. Consider using smaller image.`);
            }
          }
        } else if (elapsed > 5000) {
          console.warn(`⚠️ SLOW: Save operation took ${elapsed}ms - optimization recommended`);
          console.log('💡 Recommendations:');
          console.log(`  - Payload size: ${Math.round(payloadSize / 1024)}KB`);
          console.log(`  - Items count: ${boqItems.length}`);
          if (boqItems.length > 100) {
            console.log(`  - Consider splitting into smaller batches (currently ${boqItems.length} items)`);
          }
          if (payloadSize > 500 * 1024) {
            console.log(`  - Large payload detected. Server may need more processing time.`);
          }
          
          // Check for QR Code contribution
          if (bankInfo?.qrCodeUrl) {
            const qrSize = Math.round(bankInfo.qrCodeUrl.length * 0.75 / 1024);
            console.log(`  - QR Code size: ${qrSize}KB`);
            if (qrSize > 150) {
              console.log(`  - 💡 QR Code is ${qrSize}KB (recommended < 150KB). This may slow down saves.`);
            }
          }
          
          // Show performance stats
          const stats = saveMonitor.getStats();
          if (stats) {
            console.log(`📊 Recent performance (last ${stats.count} saves):`);
            console.log(`  - Average: ${stats.avgDuration}ms`);
            console.log(`  - Range: ${stats.minDuration}ms - ${stats.maxDuration}ms`);
            console.log(`  - Avg size: ${stats.avgSize}KB`);
          }
        } else if (elapsed > 2000) {
          console.log(`ℹ️ Save completed in ${elapsed}ms (acceptable for large documents)`);
        } else if (elapsed < 500) {
          console.log(`⚡ Lightning fast save in ${elapsed}ms!`);
        }
        
        if (showDialog) {
          setCompletedDocumentType(type);
          setCompletedDocumentNumber(result.document.documentNumber || '');
          setShowCompletionDialog(true);
        }
        
        return true;
      } else {
        // Error response
        const errorMsg = result?.error || result?.message || 'Unknown error';
        console.error(`❌ Failed to save ${type}:`, errorMsg);
        toast.error(`ไม่สามารถบันทึก ${type} ได้: ${errorMsg}`);
        return false;
      }
    } catch (error: any) {
      const elapsed = Math.round(performance.now() - saveStartTime);
      console.error(`❌ Error saving ${type} (after ${elapsed}ms):`, error);
      
      // Show more specific error message
      if (error.message?.includes('timeout')) {
        toast.error(`การบันทึกใช้เวลานานเกินไป กรุณาลองอีกครั้ง`);
      } else {
        toast.error(`เกิดข้อผิดพลาดในการบันทึก: ${error.message || 'Unknown error'}`);
      }
      return false;
    }
  };

  // Load user profile on component mount
  const loadUserProfile = async () => {
    if (!user) return;

    try {
      console.log('🔄 Loading user profile to sync with company info...');
      
      // ✅ Use new /profile endpoint with api.get (includes access_token automatically)
      const data = await api.get(`/profile`);
      
      // 🔒 Check if data is valid and has profile (not an error response)
      if (!data || data.error || !data.profile) {
        console.log('⚠️ No profile data available:', data?.error || 'No profile found');
        return; // Silent fail - keep default company info
      }
      
      console.log('✅ User profile loaded:', data.profile);
      
      // Update profile percentages if available
      if (data.profile.wastePct !== undefined) {
        setProfile(prev => ({
          ...prev,
          wastePct: data.profile.wastePct ?? prev.wastePct,
          opexPct: data.profile.opexPct ?? prev.opexPct,
          errorPct: data.profile.errorPct ?? prev.errorPct,
          markupPct: data.profile.markupPct ?? prev.markupPct,
          vatPct: data.profile.vatPct ?? prev.vatPct,
        }));
      }
      
      // ✅ Update company info from user profile ONLY if data exists
      // Don't overwrite defaults with empty values
      const profileCompany = data.profile.company || {};
      const hasCompanyData = 
        data.profile.companyName || 
        profileCompany.name || 
        data.profile.address || 
        profileCompany.address ||
        data.profile.taxId || 
        profileCompany.taxId;
      
      if (hasCompanyData) {
        setCompany(prev => ({
          name: profileCompany.name || data.profile.companyName || prev.name,
          address: profileCompany.address || data.profile.address || prev.address,
          taxId: profileCompany.taxId || data.profile.taxId || prev.taxId,
          phone: profileCompany.phone || data.profile.phone || prev.phone,
          email: profileCompany.email || data.profile.email || prev.email,
          website: profileCompany.website || data.profile.website || prev.website,
          logoUrl: profileCompany.logoUrl || data.profile.logoUrl || prev.logoUrl,
        }));
        console.log('✅ Company info synced from user profile');
      } else {
        console.log('ℹ️ User profile has no company data, keeping defaults');
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      // Silent fail - keep default company info
    }
  };

  // ✅ Load user profile on mount and when user changes
  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  // Load editing document data
  useEffect(() => {
    if (editingDocument) {
      // Load document ID and project ID for editing
      if (editingDocument.id) setCurrentDocumentId(editingDocument.id);
      if (editingDocument.projectId) setProjectIdInternal(editingDocument.projectId);
      
      // Load document data into state
      if (editingDocument.projectTitle) setProjectTitle(editingDocument.projectTitle);
      if (editingDocument.projectDescription) setProjectDescription(editingDocument.projectDescription);
      if (editingDocument.projectLocation) setProjectLocation(editingDocument.projectLocation);
      if (editingDocument.boqItems) setBoqItems(editingDocument.boqItems);
      if (editingDocument.profile) setProfile(editingDocument.profile);
      if (editingDocument.company) setCompany(editingDocument.company);
      if (editingDocument.customer) setCustomer(editingDocument.customer);
      if (editingDocument.discount !== undefined) setDiscount(editingDocument.discount);
      if (editingDocument.paymentTerms !== undefined) setPaymentTerms(editingDocument.paymentTerms);
      if (editingDocument.bankInfo !== undefined) setBankInfo(editingDocument.bankInfo);
      if (editingDocument.taxInvoice) setTaxInvoice(editingDocument.taxInvoice);
      
      // Load partner and withholding tax data
      if (editingDocument.recipientType) setRecipientType(editingDocument.recipientType);
      if (editingDocument.partnerId || editingDocument.partner) {
        // Load partner data if exists
        const partner = editingDocument.partner || {
          id: editingDocument.partnerId,
          name: editingDocument.partnerName || '',
          phone: editingDocument.partner?.phone || '',
          address: editingDocument.partner?.address || '',
        };
        setSelectedPartner(partner);
      }
      if (editingDocument.mainProjectTag) setMainProjectTag(editingDocument.mainProjectTag);
      
      // Load withholding tax from document
      if (editingDocument.withholdingTaxRate !== undefined) {
        setWithholdingTaxRate(editingDocument.withholdingTaxRate);
      }
      if (editingDocument.withholdingTaxType) {
        setWithholdingTaxType(editingDocument.withholdingTaxType);
      }
      
      // Load notes and conditions
      if (editingDocument.quotationNotes) setQuotationNotes(editingDocument.quotationNotes);
      if (editingDocument.paymentConditions) setPaymentConditions(editingDocument.paymentConditions);
      if (editingDocument.signatures) setSignatures(editingDocument.signatures);
      
      // Navigate to BOQ page to start editing
      goToPage("boq");
    }
  }, [editingDocument]);

  return (
    <>
      <Toaster position="top-right" />
      
      {/* Fixed Header - Not on selector or receipt pages */}
      {currentPage !== "selector" && currentPage !== "receipt" && (
        <motion.header 
          className="fixed top-0 left-0 right-0 z-50 border-b bg-white/95 backdrop-blur-sm shadow-sm"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="container mx-auto px-4 sm:px-6 py-2 sm:py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={backToSelector}
                  className="gap-1 sm:gap-2 flex-shrink-0"
                >
                  <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline text-xs sm:text-sm">กลับ</span>
                </Button>
                <div className="p-1.5 sm:p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-lg flex-shrink-0">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xs sm:text-sm md:text-base bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent truncate">
                    ระบบจัดทำเอกสาร BOQ
                  </h1>
                  <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Professional BOQ System</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground hidden xs:block">
                  {currentPage === "boq" && "1/4"}
                  {currentPage === "quotation" && "2/4"}
                  {currentPage === "invoice" && "3/4"}
                </div>
                <SettingsDialog
                  company={company}
                  customer={customer}
                  settings={settings}
                  profile={profile}
                  onUpdateCompany={setCompany}
                  onUpdateCustomer={setCustomer}
                  onUpdateSettings={setSettings}
                  onUpdateProfile={setProfile}
                />
              </div>
            </div>
          </div>
        </motion.header>
      )}

      {/* Add padding to account for fixed header */}
      <div className={currentPage !== "selector" && currentPage !== "receipt" ? "pt-14 sm:pt-16 md:pt-20" : ""}>
        <AnimatePresence mode="wait">
          {currentPage === "selector" && (
            <motion.div
              key="selector"
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ duration: 0.3 }}
            >
              <DocumentSelectorPage onSelect={handleDocumentSelect} />
            </motion.div>
          )}

          {currentPage === "boq" && (
            <motion.div
              key="boq"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3 }}
            >
              <BOQPage
                boqItems={boqItems}
                setBoqItems={setBoqItems}
                profile={profile}
                setProfile={setProfile}
                projectTitle={projectTitle}
                setProjectTitle={setProjectTitle}
                projectDescription={projectDescription}
                setProjectDescription={setProjectDescription}
                projectLocation={projectLocation}
                setProjectLocation={setProjectLocation}
                company={company}
                customer={customer}
                setCustomer={setCustomer}
                settings={settings}
                onNext={async () => {
                  console.log('🚀 BOQ onNext called - starting save process...');
                  const saved = await saveDocument('boq');
                  if (saved) {
                    console.log('✅ BOQ saved, navigating to quotation page...');
                    goToPage("quotation");
                  } else {
                    console.error('❌ BOQ save failed, staying on current page');
                  }
                }}
                userId={user?.id}
                recipientType={recipientType}
                setRecipientType={setRecipientType}
                selectedPartner={selectedPartner}
                setSelectedPartner={setSelectedPartner}
                mainProjectTag={mainProjectTag}
                setMainProjectTag={setMainProjectTag}
              />
            </motion.div>
          )}

          {currentPage === "quotation" && (
            <motion.div
              key="quotation"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3 }}
            >
              <QuotationPage
                boqItems={boqItems}
                setBoqItems={setBoqItems}
                profile={profile}
                projectTitle={projectTitle}
                company={company}
                customer={customer}
                discount={discount}
                setDiscount={setDiscount}
                quotationNotes={quotationNotes}
                setQuotationNotes={setQuotationNotes}
                paymentConditions={paymentConditions}
                setPaymentConditions={setPaymentConditions}
                onNext={async () => {
                  const saved = await saveDocument('quotation');
                  if (saved) {
                    goToPage("invoice");
                  }
                }}
                onBack={() => goToPage("boq")}
                recipientType={recipientType}
                selectedPartner={selectedPartner}
                mainProjectTag={mainProjectTag}
              />
            </motion.div>
          )}

          {currentPage === "invoice" && (
            <motion.div
              key="invoice"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3 }}
            >
              <InvoicePage
                boqItems={boqItems}
                profile={profile}
                projectTitle={projectTitle}
                company={company}
                customer={customer}
                discount={discount}
                bankInfo={bankInfo}
                setBankInfo={setBankInfo}
                paymentTerms={paymentTerms}
                setPaymentTerms={setPaymentTerms}
                onNext={async () => {
                  const saved = await saveDocument('invoice');
                  if (saved) {
                    goToPage("receipt");
                  }
                }}
                onBack={() => goToPage("quotation")}
                recipientType={recipientType}
                selectedPartner={selectedPartner}
                mainProjectTag={mainProjectTag}
                withholdingTaxRate={withholdingTaxRate}
                setWithholdingTaxRate={setWithholdingTaxRate}
                withholdingTaxType={withholdingTaxType}
                setWithholdingTaxType={setWithholdingTaxType}
              />
            </motion.div>
          )}

          {currentPage === "receipt" && (
            <motion.div
              key="receipt"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3 }}
            >
              <ReceiptPageEnhanced
                boqItems={boqItems}
                profile={profile}
                projectTitle={projectTitle}
                projectDescription={projectDescription}
                projectLocation={projectLocation}
                company={company}
                customer={customer}
                discount={discount}
                bankInfo={bankInfo}
                paymentTerms={paymentTerms}
                setPaymentTerms={setPaymentTerms}
                taxInvoice={taxInvoice}
                setTaxInvoice={setTaxInvoice}
                onBack={() => goToPage("invoice")}
                onSave={async () => await saveDocument('receipt', true)}
                recipientType={recipientType}
                selectedPartner={selectedPartner}
                mainProjectTag={mainProjectTag}
                withholdingTaxRate={withholdingTaxRate}
                withholdingTaxType={withholdingTaxType}
                setSelectedInstallmentForExport={setSelectedInstallmentForExport}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* PDF Export Wrapper - Always rendered for PDF generation */}
      <PDFExportWrapper
        projectTitle={projectTitle}
        projectDescription={projectDescription}
        projectLocation={projectLocation}
        company={company}
        customer={customer}
        profile={profile}
        boqItems={boqItems}
        discount={discount}
        bankInfo={bankInfo}
        paymentTerms={paymentTerms}
        taxInvoice={taxInvoice}
        recipientType={recipientType}
        selectedPartner={selectedPartner}
        mainProjectTag={mainProjectTag}
        withholdingTaxRate={withholdingTaxRate}
        withholdingTaxType={withholdingTaxType}
        selectedInstallmentForExport={selectedInstallmentForExport}
      />

      {/* Completion Summary Dialog */}
      <CompletionSummaryDialog
        open={showCompletionDialog}
        onOpenChange={setShowCompletionDialog}
        documentType={completedDocumentType}
        documentNumber={completedDocumentNumber}
        onNavigate={(destination) => {
          if (onNavigate) {
            const viewMap = {
              history: 'history',
              tax: 'tax-management',
              reports: 'reports',
              dashboard: 'dashboard'
            };
            onNavigate(viewMap[destination]);
          }
        }}
      />
    </>
  );
}

export default AppWorkflow;