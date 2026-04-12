import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  ChevronRight,
  LayoutGrid,
  MessageSquareQuote,
  RefreshCcw,
  ReceiptText,
  ShoppingCart,
} from 'lucide-react';
import { toast } from 'sonner';
import { Cart, type CartItem } from './Cart';
import { Checkout } from './Checkout';
import { ProductDetail } from './ProductDetail';
import { ProductList } from './ProductList';
import { RfqInbox } from './RfqInbox';
import { ShopHome } from './ShopHome';
import { VendorQuotePortal } from './VendorQuotePortal';
import type { AuthSession } from '../../utils/authSession';
import {
  buildPurchaseListFromProject,
  buildVendorQuoteLines,
  buildVendorQuoteOptions,
  buildPoDraftFromProject,
} from '../../utils/rfqMarketplace';
import { shopCategories, shopProducts, shopVendors, type ShopProduct } from '../../utils/shopCatalog';
import { loadProjects, loadWorkspaceUiState, saveWorkspaceUiState } from '../../utils/storageUtils';
import type { ProjectData } from '../../utils/projectData';
import { matchBoqItemsToCatalog } from '../../utils/boqShopIntegration';
import {
  createShopRfqDraft,
  ensureWorkspaceShopSeed,
  loadLocalShopRfqs,
  loadWorkspaceShopCatalog,
  saveLocalShopRfqs,
  saveWorkspaceRfq,
  subscribeWorkspaceRfqs,
  updateVendorQuoteRecord,
  type ShopCatalogSource,
  type ShopCatalogSnapshot,
  type ShopRfqRecord,
  type VendorQuoteUpdateInput,
} from '../../utils/shopCloud';
import { buildShopRoute, buildVendorPortalRoute, parseShopRoute, type ShopView } from '../../utils/shopRoutes';

const fallbackCatalog: ShopCatalogSnapshot = {
  categories: shopCategories,
  products: shopProducts,
  vendors: shopVendors,
  source: 'seed',
};

function loadSelectedProject(): { projects: ProjectData[]; selectedProjectId: string | null } {
  const projects = loadProjects();
  const { selectedProjectId } = loadWorkspaceUiState(projects);
  return {
    projects,
    selectedProjectId,
  };
}

function upsertRfq(current: ShopRfqRecord[], nextRfq: ShopRfqRecord): ShopRfqRecord[] {
  const filtered = current.filter((rfq) => rfq.id !== nextRfq.id);
  return [nextRfq, ...filtered].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function categoryNameFor(catalog: ShopCatalogSnapshot, categoryId: string): string {
  return catalog.categories.find((category) => category.id === categoryId)?.name || categoryId;
}

interface ShopPageProps {
  session: AuthSession;
  route: `/shop${'' | `/${string}`}`;
  onNavigate: (path: string) => void;
}

export function ShopPage({ session, route, onNavigate }: ShopPageProps) {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [catalog, setCatalog] = useState<ShopCatalogSnapshot>(fallbackCatalog);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [seedSyncing, setSeedSyncing] = useState(false);
  const [rfqs, setRfqs] = useState<ShopRfqRecord[]>([]);
  const [rfqStorageMode, setRfqStorageMode] = useState<'cloud' | 'local'>('local');
  const [busyRfqId, setBusyRfqId] = useState<string | null>(null);
  const parsedRoute = useMemo(() => parseShopRoute(route), [route]);

  useEffect(() => {
    const next = loadSelectedProject();
    setProjects(next.projects);
    setSelectedProjectId(next.selectedProjectId);
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    saveWorkspaceUiState({ selectedProjectId });
  }, [selectedProjectId]);

  useEffect(() => {
    let active = true;
    let unsubscribeRfqs: (() => void) | undefined;

    const loadShop = async () => {
      if (session.workspaceMode !== 'cloud') {
        setCatalog(fallbackCatalog);
        setCatalogLoading(false);
        setRfqs(loadLocalShopRfqs());
        setRfqStorageMode('local');
        return;
      }

      try {
        setCatalogLoading(true);
        await ensureWorkspaceShopSeed(session.user);
        const nextCatalog = await loadWorkspaceShopCatalog(session.user);
        if (active) {
          setCatalog(nextCatalog);
        }
      } catch (error) {
        console.error('[Shop] Failed to load cloud catalog:', error);
        if (active) {
          setCatalog(fallbackCatalog);
        }
      } finally {
        if (active) {
          setCatalogLoading(false);
        }
      }

      unsubscribeRfqs = subscribeWorkspaceRfqs(
        session.user,
        (nextRfqs) => {
          if (!active) return;
          setRfqs(nextRfqs);
          setRfqStorageMode('cloud');
        },
        (error) => {
          console.error('[Shop] Failed to subscribe RFQs:', error);
          if (!active) return;
          setRfqs(loadLocalShopRfqs());
          setRfqStorageMode('local');
        },
      );
    };

    loadShop();

    return () => {
      active = false;
      unsubscribeRfqs?.();
    };
  }, [session.user, session.workspaceMode]);

  useEffect(() => {
    if (parsedRoute.view !== 'catalog') {
      setSelectedProduct(null);
    }
  }, [parsedRoute.view]);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || projects[0] || null,
    [projects, selectedProjectId],
  );

  const boqMatches = useMemo(
    () => activeProject
      ? matchBoqItemsToCatalog(
          activeProject.quotationData.filter((item) => item.no.includes('.') && item.quantity !== '' && Number(item.quantity) > 0),
        )
      : [],
    [activeProject],
  );

  const purchaseList = useMemo(
    () => activeProject ? buildPurchaseListFromProject(activeProject) : {
      lines: [],
      matchedLines: 0,
      reviewLines: 0,
      unmatchedLines: 0,
      estimatedSubtotal: 0,
    },
    [activeProject],
  );

  const quoteOptions = useMemo(
    () => buildVendorQuoteOptions(purchaseList, boqMatches),
    [boqMatches, purchaseList],
  );

  const preferredQuoteLines = useMemo(
    () => (quoteOptions[0] ? buildVendorQuoteLines(boqMatches, quoteOptions[0].vendorId) : []),
    [boqMatches, quoteOptions],
  );

  const poDraft = useMemo(
    () => (activeProject ? buildPoDraftFromProject(activeProject) : null),
    [activeProject],
  );

  const navigateToShopView = (view: Exclude<ShopView, 'vendor'>) => {
    onNavigate(buildShopRoute(view));
  };

  const openVendorPortal = (rfqId: string, vendorId: string) => {
    onNavigate(buildVendorPortalRoute(rfqId, vendorId));
  };

  const addToCart = (product: ShopProduct) => {
    setCartItems((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        return current.map((item) => (
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      }
      return [...current, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCartItems((current) => current.filter((item) => item.product.id !== productId));
  };

  const saveRfqLocally = (nextRfq: ShopRfqRecord) => {
    setRfqs((current) => {
      const next = upsertRfq(current, { ...nextRfq, source: 'local' });
      saveLocalShopRfqs(next);
      return next;
    });
    setRfqStorageMode('local');
  };

  const persistRfq = async (nextRfq: ShopRfqRecord, successMessage: string) => {
    setBusyRfqId(nextRfq.id);

    try {
      if (session.workspaceMode === 'cloud') {
        const saved = await saveWorkspaceRfq(session.user, nextRfq);
        setRfqs((current) => upsertRfq(current, saved));
        setRfqStorageMode('cloud');
        toast.success(successMessage);
      } else {
        saveRfqLocally(nextRfq);
        toast.success(`${successMessage} (บันทึกชั่วคราวในเครื่อง)`);
      }
    } catch (error) {
      console.error('[Shop] Failed to persist RFQ:', error);
      saveRfqLocally(nextRfq);
      toast.success(`${successMessage} (fallback เป็น local RFQ)`);
    } finally {
      setBusyRfqId(null);
    }
  };

  const handleCreateRfq = async () => {
    if (!activeProject) {
      toast.error('ยังไม่มีโครงการที่เลือกอยู่');
      return;
    }

    if (purchaseList.lines.length === 0) {
      toast.error('BOQ โครงการนี้ยังไม่มีรายการวัสดุพอสำหรับสร้าง RFQ');
      return;
    }

    const rfq = createShopRfqDraft(session.user, activeProject, purchaseList, quoteOptions);
    await persistRfq(rfq, 'สร้าง RFQ จาก BOQ เรียบร้อย');
    navigateToShopView('rfq');
  };

  const handleMarkQuoted = async (rfq: ShopRfqRecord) => {
    const respondedAt = new Date().toISOString();
    const nextRfq: ShopRfqRecord = {
      ...rfq,
      status: 'quoted',
      vendorQuotes: rfq.vendorQuotes.map((quote) => ({
        ...quote,
        status: quote.status === 'declined' ? quote.status : 'received',
        respondedAt,
      })),
      updatedAt: respondedAt,
    };

    await persistRfq(nextRfq, 'บันทึกราคากลับ baseline แล้ว');
  };

  const handleAwardVendor = async (rfq: ShopRfqRecord, vendorId: string) => {
    const updatedAt = new Date().toISOString();
    const nextRfq: ShopRfqRecord = {
      ...rfq,
      status: 'awarded',
      awardedVendorId: vendorId,
      recommendedVendorId: vendorId,
      updatedAt,
      vendorQuotes: rfq.vendorQuotes.map((quote) => ({
        ...quote,
        status: quote.vendorId === vendorId ? 'awarded' : quote.status === 'declined' ? 'declined' : 'received',
      })),
    };

    await persistRfq(nextRfq, 'เลือก vendor สำหรับออก PO แล้ว');
  };

  const handleSaveVendorQuote = async (
    rfq: ShopRfqRecord,
    vendorId: string,
    input: VendorQuoteUpdateInput,
  ) => {
    const nextRfq = updateVendorQuoteRecord(rfq, vendorId, input);
    const successLabel = input.status === 'declined'
      ? 'บันทึกสถานะร้านและข้อจำกัดเรียบร้อย'
      : 'บันทึกราคาจริงและจัดอันดับ landed cost ใหม่แล้ว';

    await persistRfq(nextRfq, successLabel);
  };

  const handleCloseRfq = async (rfq: ShopRfqRecord) => {
    const nextRfq: ShopRfqRecord = {
      ...rfq,
      status: 'closed',
      updatedAt: new Date().toISOString(),
    };

    await persistRfq(nextRfq, 'ปิดรอบ RFQ แล้ว');
  };

  const handleRefreshCatalogSeed = async () => {
    if (session.workspaceMode !== 'cloud') {
      setCatalog(fallbackCatalog);
      toast.message('โหมดนี้ใช้ seed catalog ในเครื่องอยู่แล้ว');
      return;
    }

    try {
      setSeedSyncing(true);
      setCatalogLoading(true);
      await ensureWorkspaceShopSeed(session.user, { force: true });
      const nextCatalog = await loadWorkspaceShopCatalog(session.user);
      setCatalog(nextCatalog);
      toast.success('อัปเดต catalog และ vendor seed ขึ้น Firestore แล้ว');
    } catch (error) {
      console.error('[Shop] Failed to refresh seed catalog:', error);
      toast.error('รีเฟรช seed catalog ไม่สำเร็จ');
    } finally {
      setSeedSyncing(false);
      setCatalogLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">EzBOQ Shop</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Construction Material Marketplace</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              เริ่มจาก catalog และ RFQ marketplace แบบ no-API สำหรับร้านวัสดุ local: แปลง BOQ เป็น purchase list, ยิงขอราคา, เทียบ landed cost, อนุมัติร้าน แล้วออก PO
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500">Catalog Source</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {catalogLoading ? 'กำลังโหลด...' : catalog.source === 'cloud' ? 'Cloud' : 'Seed'}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500">RFQ Storage</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{rfqStorageMode === 'cloud' ? 'Cloud' : 'Local'}</p>
            </div>
            <button
              onClick={() => void handleRefreshCatalogSeed()}
              disabled={seedSyncing || catalogLoading}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:bg-slate-50 disabled:opacity-60"
            >
              <p className="text-xs text-slate-500">Seed Sync</p>
              <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                {seedSyncing ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                รีเฟรช Firestore
              </p>
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Current Project Context</p>
            <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-slate-900">{activeProject?.name || 'ยังไม่มีโครงการที่เลือกอยู่'}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {activeProject
                    ? `${purchaseList.lines.length} purchase-list lines • ${poDraft?.lines.length || 0} PO draft lines • ${rfqs.length} RFQ rounds`
                    : 'ไปหน้า Workspace เพื่อเลือกโครงการ แล้วกลับมาที่ Shop เพื่อแปลง BOQ เป็น purchase list'}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Box className="h-4 w-4" />
                ใช้ข้อมูล BOQ ล่าสุดของ user คนนี้อัตโนมัติ
              </div>
            </div>
          </div>
          <div className="lg:w-[280px]">
            <select
              value={selectedProjectId || ''}
              onChange={(event) => setSelectedProjectId(event.target.value || null)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400"
            >
              {projects.length === 0 && <option value="">ยังไม่มีโครงการ</option>}
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {[
            { key: 'home', label: 'Overview', icon: LayoutGrid },
            { key: 'catalog', label: 'Catalog', icon: ShoppingCart },
            { key: 'checkout', label: 'RFQ / Checkout', icon: ReceiptText },
            { key: 'rfq', label: 'RFQ Inbox', icon: MessageSquareQuote },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = parsedRoute.view === tab.key || (tab.key === 'rfq' && parsedRoute.view === 'vendor');
            return (
              <button
                key={tab.key}
                onClick={() => navigateToShopView(tab.key as Exclude<ShopView, 'vendor'>)}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            {parsedRoute.view === 'home' && (
              <ShopHome
                projectName={activeProject?.name}
                categories={catalog.categories}
                vendors={catalog.vendors}
                purchaseList={purchaseList}
                quotes={quoteOptions}
                rfqCount={rfqs.length}
                onOpenCatalog={() => navigateToShopView('catalog')}
                onOpenCheckout={() => navigateToShopView('checkout')}
                onOpenRfqInbox={() => navigateToShopView('rfq')}
                onOpenProduct={(product) => {
                  setSelectedProduct(product);
                  navigateToShopView('catalog');
                }}
              />
            )}

            {parsedRoute.view === 'catalog' && (
              selectedProduct ? (
                <ProductDetail
                  product={selectedProduct}
                  vendors={catalog.vendors}
                  categoryName={categoryNameFor(catalog, selectedProduct.categoryId)}
                  onBack={() => setSelectedProduct(null)}
                  onAddToCart={addToCart}
                />
              ) : (
                <ProductList
                  categories={catalog.categories}
                  products={catalog.products}
                  vendors={catalog.vendors}
                  onSelectProduct={setSelectedProduct}
                  onAddToCart={addToCart}
                />
              )
            )}

            {parsedRoute.view === 'checkout' && (
              <Checkout
                projectName={activeProject?.name}
                items={cartItems}
                purchaseList={purchaseList}
                quotes={quoteOptions}
                preferredQuoteLines={preferredQuoteLines}
                onCreateRfq={handleCreateRfq}
                onOpenRfqInbox={() => navigateToShopView('rfq')}
                onBackToCatalog={() => navigateToShopView('catalog')}
              />
            )}

            {parsedRoute.view === 'rfq' && (
              <RfqInbox
                rfqs={rfqs}
                currentProjectName={activeProject?.name}
                busyRfqId={busyRfqId}
                isCloudMode={rfqStorageMode === 'cloud'}
                onCreateRfq={handleCreateRfq}
                onMarkQuoted={handleMarkQuoted}
                onSaveVendorQuote={handleSaveVendorQuote}
                onAwardVendor={handleAwardVendor}
                onCloseRfq={handleCloseRfq}
                onOpenVendorPortal={openVendorPortal}
              />
            )}

            {parsedRoute.view === 'vendor' && (
              <VendorQuotePortal
                rfqs={rfqs}
                vendors={catalog.vendors}
                currentRfqId={parsedRoute.rfqId}
                currentVendorId={parsedRoute.vendorId}
                busyRfqId={busyRfqId}
                isCloudMode={rfqStorageMode === 'cloud'}
                onOpenInbox={() => navigateToShopView('rfq')}
                onOpenVendorContext={openVendorPortal}
                onSaveVendorQuote={handleSaveVendorQuote}
              />
            )}
          </div>

          <div className="space-y-4">
            <Cart
              items={cartItems}
              onRemove={removeFromCart}
              onCheckout={() => navigateToShopView('checkout')}
            />

            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Auto PO Draft</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {poDraft?.lines.length || 0} lines ready
              </p>
              <p className="mt-2 text-sm text-slate-500">
                ระบบสรุปรายการวัสดุที่ match จาก BOQ เป็น draft PO ได้ทันที และคงรายการที่ยัง unmatched ไว้ให้แอดมินหรือร้านช่วยเคลียร์ต่อ
              </p>
              {poDraft && (
                <>
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                    รวม draft ล่าสุด ฿{poDraft.totalAmount.toLocaleString('th-TH')}
                  </div>
                  {poDraft.unmatched.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-amber-600">Need Review</p>
                      <div className="mt-2 space-y-2">
                        {poDraft.unmatched.slice(0, 4).map((line) => (
                          <div key={line} className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                            {line}
                          </div>
                        ))}
                        {poDraft.unmatched.length > 4 && (
                          <p className="text-xs text-slate-400">
                            และอีก {poDraft.unmatched.length - 4} รายการ
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">RFQ Status</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{rfqs.length} rounds tracked</p>
              <div className="mt-4 space-y-2">
                {rfqs.slice(0, 3).map((rfq) => (
                  <button
                    key={rfq.id}
                    onClick={() => navigateToShopView('rfq')}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:bg-white"
                  >
                    <p className="text-sm font-medium text-slate-900">{rfq.projectName}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {rfq.status} • {rfq.vendorQuotes.length} vendors • {rfq.updatedAt.slice(0, 10)}
                    </p>
                  </button>
                ))}
                {rfqs.length === 0 && (
                  <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    ยังไม่มี RFQ ที่ถูกสร้างใน workspace นี้
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">MVP Next Step</p>
              <ol className="mt-3 space-y-2 text-sm text-slate-600">
                <li className="flex gap-2"><ChevronRight className="mt-0.5 h-4 w-4 text-emerald-600" /> แปลง BOQ เป็น purchase list แบบมาตรฐาน</li>
                <li className="flex gap-2"><ChevronRight className="mt-0.5 h-4 w-4 text-emerald-600" /> ยิง RFQ ไป 3 ร้านในรัศมี 10–30 กม.</li>
                <li className="flex gap-2"><ChevronRight className="mt-0.5 h-4 w-4 text-emerald-600" /> รับ quote กลับผ่าน LINE / Form / โทรกลับ</li>
                <li className="flex gap-2"><ChevronRight className="mt-0.5 h-4 w-4 text-emerald-600" /> เทียบ landed cost ก่อน approve PO</li>
              </ol>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Catalog Health</p>
              <div className="mt-3 grid gap-2 text-sm text-slate-600">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  {catalog.categories.length} categories • {catalog.products.length} products • {catalog.vendors.length} vendors
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  Source: {catalogLoading ? 'กำลังโหลด' : (catalog.source as ShopCatalogSource)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
