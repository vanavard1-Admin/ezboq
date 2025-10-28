import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { DocumentSelectorPage } from "./pages/DocumentSelectorPage";
import { BOQPage } from "./pages/BOQPage";
import { QuotationPage } from "./pages/QuotationPage";
import { InvoicePage } from "./pages/InvoicePage";
import { ReceiptPageEnhanced } from "./pages/ReceiptPageEnhanced";
import { SettingsDialog } from "./components/SettingsDialog";
import { PDFExportWrapper } from "./components/PDFExportWrapper";
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

type Page = "selector" | "boq" | "quotation" | "invoice" | "receipt";

interface AppWorkflowProps {
  user: User | null;
  editingDocument?: Document | null;
}

function AppWorkflow({ user, editingDocument }: AppWorkflowProps) {
  const [currentPage, setCurrentPage] = useState<Page>("selector");
  
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
    goToPage(type);
  };

  const backToSelector = () => {
    goToPage("selector");
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
                onNext={() => goToPage("quotation")}
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
                onNext={() => goToPage("invoice")}
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
                onNext={() => goToPage("receipt")}
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
    </>
  );
}

export default AppWorkflow;
