import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { DocumentSelectorPage } from "./pages/DocumentSelectorPage";
import { BOQPage } from "./pages/BOQPage";
import { QuotationPage } from "./pages/QuotationPage";
import { InvoicePage } from "./pages/InvoicePage";
import { ReceiptPageEnhanced } from "./pages/ReceiptPageEnhanced";
import { SettingsDialog } from "./components/SettingsDialog";
import { PDFExportWrapper } from "./components/PDFExportWrapper";
import { CompletionSummaryDialog } from "./components/CompletionSummaryDialog";
import { 
  BOQItem, 
  Profile, 
  CompanyInfo,
  CustomerInfo,
  ProjectSettings,
  Discount,
  PaymentTerms,
  BankInfo,
  TaxInvoice,
  Signature
} from "./types/boq";
import { Toaster } from "./components/ui/sonner";
import { FileText, ArrowLeft } from "lucide-react";
import { Button } from "./components/ui/button";
import { useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import type { Document } from "./types/boq";
import { projectId, publicAnonKey } from "./utils/supabase/info";
import { api } from "./utils/api";
import { toast } from "sonner";
import { calculateBOQSummary } from "./utils/calculations";

type Page = "selector" | "boq" | "quotation" | "invoice" | "receipt";

interface AppWorkflowProps {
  user: User | null;
  editingDocument?: Document | null;
  onNavigate?: (view: string) => void;
}

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
      
      console.log(`📊 Document data prepared (${boqItems.length} items)`);

      let response;
      if (currentDocumentId) {
        // Update existing document
        console.log(`📝 Updating document ${currentDocumentId}...`);
        response = await api.put(`/documents/${currentDocumentId}`, documentData);
      } else {
        // Create new document
        console.log(`📝 Creating new ${type} document...`);
        response = await api.post('/documents', documentData);
      }

      if (response.ok) {
        const result = await response.json();
        if (result.document?.id) {
          setCurrentDocumentId(result.document.id);
        }
        
        const elapsed = Math.round(performance.now() - saveStartTime);
        console.log(`✅ ${type.toUpperCase()} saved successfully in ${elapsed}ms:`, result.document?.id);
        
        // Only warn if extremely slow (>5s for production environment)
        if (elapsed > 5000) {
          console.warn(`⚠️ Save operation took ${elapsed}ms - consider optimization`);
        } else if (elapsed > 2000) {
          console.log(`ℹ️ Save operation completed in ${elapsed}ms (normal for large documents)`);
        }
        
        if (showDialog) {
          setCompletedDocumentType(type);
          setCompletedDocumentNumber(result.document?.documentNumber || '');
          setShowCompletionDialog(true);
        }
        
        return true;
      } else {
        const errorText = await response.text();
        console.error(`❌ Failed to save ${type}:`, errorText);
        toast.error(`ไม่สามารถบันทึก${type}ได้: ${response.status}`);
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

  // Load user profile data
  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/profile/${user.id}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.profile) {
          // Update company info from user profile
          if (data.profile.company) {
            setCompany(data.profile.company);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      // Silent fail - keep default company info
    }
  };

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