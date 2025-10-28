import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-6e95bca3/health", (c) => {
  return c.json({ status: "ok" });
});

// ========== CUSTOMERS API ==========

// Get all customers
app.get("/make-server-6e95bca3/customers", async (c) => {
  try {
    const customers = await kv.getByPrefix("customer:");
    const validCustomers = Array.isArray(customers) ? customers : [];
    return c.json({ customers: validCustomers });
  } catch (error: any) {
    console.error("Get customers error:", error);
    return c.json({ customers: [], error: error?.message || 'Unknown error' }, { status: 200 });
  }
});

// Create customer
app.post("/make-server-6e95bca3/customers", async (c) => {
  try {
    const customer = await c.req.json();
    await kv.set(`customer:${customer.id}`, customer);
    return c.json({ success: true, customer });
  } catch (error: any) {
    console.error("Create customer error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Update customer
app.put("/make-server-6e95bca3/customers/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const customer = await c.req.json();
    await kv.set(`customer:${id}`, customer);
    return c.json({ success: true, customer });
  } catch (error: any) {
    console.error("Update customer error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Delete customer
app.delete("/make-server-6e95bca3/customers/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`customer:${id}`);
    return c.json({ success: true });
  } catch (error: any) {
    console.error("Delete customer error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// ========== DOCUMENTS API ==========

// Get all documents
app.get("/make-server-6e95bca3/documents", async (c) => {
  try {
    const recipientType = c.req.query("recipientType");
    const partnerId = c.req.query("partnerId");
    
    const documents = await kv.getByPrefix("document:");
    let validDocuments = Array.isArray(documents) ? documents : [];
    
    // Filter by recipientType
    if (recipientType) {
      validDocuments = validDocuments.filter((doc: any) => {
        if (recipientType === 'customer') {
          return !doc.recipientType || doc.recipientType === 'customer';
        } else if (recipientType === 'partner') {
          return doc.recipientType === 'partner';
        }
        return true;
      });
    }
    
    // Filter by partnerId
    if (partnerId) {
      validDocuments = validDocuments.filter((doc: any) => doc.partnerId === partnerId);
    }
    
    return c.json({ documents: validDocuments });
  } catch (error: any) {
    console.error("Get documents error:", error);
    return c.json({ documents: [], error: error?.message || 'Unknown error' }, { status: 200 });
  }
});

// Create document
app.post("/make-server-6e95bca3/documents", async (c) => {
  try {
    const document = await c.req.json();
    
    // Generate sequential document number if not provided
    if (!document.documentNumber || document.documentNumber.startsWith('DOC-')) {
      const docNumber = await generateDocumentNumber(document.type);
      document.documentNumber = docNumber;
    }
    
    await kv.set(`document:${document.id}`, document);
    
    // Update partner stats if this is a partner document
    if (document.partnerId && document.recipientType === 'partner') {
      await updatePartnerStats(document.partnerId);
    }
    
    return c.json({ success: true, document });
  } catch (error: any) {
    console.error("Create document error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Update document
app.put("/make-server-6e95bca3/documents/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const document = await c.req.json();
    document.updatedAt = Date.now();
    await kv.set(`document:${id}`, document);
    
    // Update partner stats if this is a partner document
    if (document.partnerId && document.recipientType === 'partner') {
      await updatePartnerStats(document.partnerId);
    }
    
    return c.json({ success: true, document });
  } catch (error: any) {
    console.error("Update document error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Get single document
app.get("/make-server-6e95bca3/documents/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const document = await kv.get(`document:${id}`);
    if (!document) {
      return c.json({ error: "Document not found" }, { status: 404 });
    }
    return c.json({ document });
  } catch (error: any) {
    console.error("Get document error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Delete document
app.delete("/make-server-6e95bca3/documents/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    // Get document before deleting to update partner stats
    const document: any = await kv.get(`document:${id}`);
    
    if (!document) {
      return c.json({ error: "Document not found" }, { status: 404 });
    }
    
    // Delete the document
    await kv.del(`document:${id}`);
    
    // Update partner stats if this was a partner document
    if (document.partnerId && document.recipientType === 'partner') {
      await updatePartnerStats(document.partnerId);
    }
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error("Delete document error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// ========== USER PROFILE API ==========

// Get user profile
app.get("/make-server-6e95bca3/profile/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const profile = await kv.get(`profile:${userId}`);
    const membership = await kv.get(`membership:${userId}`);
    
    return c.json({ 
      profile: profile || null,
      membership: membership || null
    });
  } catch (error: any) {
    console.error("Get profile error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Update user profile
app.post("/make-server-6e95bca3/profile", async (c) => {
  try {
    const profile = await c.req.json();
    await kv.set(`profile:${profile.id}`, profile);
    return c.json({ success: true, profile });
  } catch (error: any) {
    console.error("Update profile error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// ========== TEAM MANAGEMENT API ==========

// Get team members
app.get("/make-server-6e95bca3/team/members/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const members = await kv.get(`team:${userId}:members`) || [];
    return c.json({ members });
  } catch (error: any) {
    console.error("Get team members error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Send team invitation
app.post("/make-server-6e95bca3/team/invite", async (c) => {
  try {
    const { ownerId, email, name } = await c.req.json();
    
    // Get current members
    const members = await kv.get(`team:${ownerId}:members`) || [];
    
    // Check if email already exists
    if (members.some((m: any) => m.email === email)) {
      return c.json({ error: "Email already invited" }, { status: 400 });
    }
    
    // Add new member with pending status
    const newMember = {
      email,
      name,
      status: 'pending',
      joinedAt: Date.now(),
    };
    
    members.push(newMember);
    await kv.set(`team:${ownerId}:members`, members);
    
    // TODO: Send email invitation (future enhancement)
    // For now, just return success
    
    return c.json({ success: true, member: newMember });
  } catch (error: any) {
    console.error("Send team invite error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Remove team member
app.post("/make-server-6e95bca3/team/remove", async (c) => {
  try {
    const { ownerId, email } = await c.req.json();
    
    // Get current members
    const members = await kv.get(`team:${ownerId}:members`) || [];
    
    // Remove member
    const filteredMembers = members.filter((m: any) => m.email !== email);
    await kv.set(`team:${ownerId}:members`, filteredMembers);
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error("Remove team member error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Accept team invitation
app.post("/make-server-6e95bca3/team/accept", async (c) => {
  try {
    const { ownerId, email } = await c.req.json();
    
    // Get current members
    const members = await kv.get(`team:${ownerId}:members`) || [];
    
    // Update member status to active
    const updatedMembers = members.map((m: any) => {
      if (m.email === email) {
        return { ...m, status: 'active' };
      }
      return m;
    });
    
    await kv.set(`team:${ownerId}:members`, updatedMembers);
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error("Accept team invitation error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// ========== PARTNERS API ==========

// Get all partners
app.get("/make-server-6e95bca3/partners", async (c) => {
  try {
    const partners = await kv.getByPrefix("partner:");
    const validPartners = Array.isArray(partners) ? partners : [];
    return c.json({ partners: validPartners });
  } catch (error: any) {
    console.error("Get partners error:", error);
    return c.json({ partners: [], error: error?.message || 'Unknown error' }, { status: 200 });
  }
});

// Create partner
app.post("/make-server-6e95bca3/partners", async (c) => {
  try {
    const partner = await c.req.json();
    await kv.set(`partner:${partner.id}`, partner);
    return c.json({ success: true, partner });
  } catch (error: any) {
    console.error("Create partner error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Update partner
app.put("/make-server-6e95bca3/partners/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const partner = await c.req.json();
    await kv.set(`partner:${id}`, partner);
    return c.json({ success: true, partner });
  } catch (error: any) {
    console.error("Update partner error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Delete partner
app.delete("/make-server-6e95bca3/partners/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`partner:${id}`);
    return c.json({ success: true });
  } catch (error: any) {
    console.error("Delete partner error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// ========== MEMBERSHIP API ==========

// Get membership
app.get("/make-server-6e95bca3/membership/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const membership = await kv.get(`membership:${userId}`);
    
    // If no membership, create free tier
    if (!membership) {
      const newMembership = {
        userId,
        tier: "free",
        freeBoqUsed: false,
        autoRenew: false,
        paymentHistory: [],
        boqUsedThisMonth: 0
      };
      await kv.set(`membership:${userId}`, newMembership);
      return c.json({ membership: newMembership });
    }
    
    return c.json({ membership });
  } catch (error: any) {
    console.error("Get membership error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Update membership
app.post("/make-server-6e95bca3/membership", async (c) => {
  try {
    const membership = await c.req.json();
    await kv.set(`membership:${membership.userId}`, membership);
    return c.json({ success: true, membership });
  } catch (error: any) {
    console.error("Update membership error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Mark free BOQ as used
app.post("/make-server-6e95bca3/membership/:userId/use-free", async (c) => {
  try {
    const userId = c.req.param("userId");
    const membership = await kv.get(`membership:${userId}`);
    
    if (membership) {
      membership.freeBoqUsed = true;
      await kv.set(`membership:${userId}`, membership);
    }
    
    return c.json({ success: true, membership });
  } catch (error: any) {
    console.error("Use free BOQ error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// ========== QUICK ACTIONS API ==========

// Create new BOQ quickly
app.post("/make-server-6e95bca3/quick-actions/new-boq", async (c) => {
  try {
    const { userId, customerId } = await c.req.json();
    
    // Check membership
    const membership: any = await kv.get(`membership:${userId}`);
    if (!membership) {
      return c.json({ error: "Membership not found" }, { status: 404 });
    }
    
    // Check if user can create BOQ based on tier
    const canCreateBOQ = checkBOQPermission(membership);
    if (!canCreateBOQ.allowed) {
      return c.json({ 
        error: canCreateBOQ.message,
        requiresUpgrade: true 
      }, { status: 403 });
    }
    
    // Create new document
    const docId = `doc-${Date.now()}`;
    const document = {
      id: docId,
      userId,
      customerId,
      projectTitle: "โครงการใหม่",
      type: "boq",
      status: "draft",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    await kv.set(`document:${docId}`, document);
    
    // Update membership usage
    if (membership.tier === "free") {
      membership.freeBoqUsed = true;
      await kv.set(`membership:${userId}`, membership);
    } else {
      // Increment BOQ count for paid tiers
      membership.boqUsedThisMonth = (membership.boqUsedThisMonth || 0) + 1;
      await kv.set(`membership:${userId}`, membership);
    }
    
    return c.json({ success: true, document });
  } catch (error: any) {
    console.error("Quick new BOQ error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// ========== HELPER FUNCTIONS ==========

// Check if user can create BOQ based on membership tier
function checkBOQPermission(membership: any): { allowed: boolean; message?: string } {
  const tier = membership.tier;
  
  // Free tier - only 1 BOQ allowed
  if (tier === "free") {
    if (membership.freeBoqUsed) {
      return {
        allowed: false,
        message: "คุณใช้ BOQ ฟรีหมดแล้ว กรุณาอัพเกรดเป็น VIP เพื่อสร้าง BOQ ไม่จำกัด"
      };
    }
    return { allowed: true };
  }
  
  // All paid tiers have unlimited BOQ
  if (tier === "individual_month" || tier === "individual_year" || 
      tier === "team_month" || tier === "team_year") {
    
    // Check if subscription is still active
    if (membership.subscriptionEnd && membership.subscriptionEnd < Date.now()) {
      return {
        allowed: false,
        message: "สมาชิกของคุณหมดอายุแล้ว กรุณาต่ออายุสมาชิก"
      };
    }
    
    return { allowed: true };
  }
  
  // Unknown tier
  return {
    allowed: false,
    message: "ไม่พบข้อมูลสมาชิก กรุณาติดต่อผู้ดูแลระบบ"
  };
}

// Update partner statistics based on their documents
async function updatePartnerStats(partnerId: string) {
  try {
    const partner: any = await kv.get(`partner:${partnerId}`);
    if (!partner) {
      console.error(`Partner not found: ${partnerId}`);
      return;
    }
    
    // Get all documents for this partner
    const allDocuments = await kv.getByPrefix("document:");
    const partnerDocuments = Array.isArray(allDocuments) 
      ? allDocuments.filter((doc: any) => doc.partnerId === partnerId && doc.recipientType === 'partner')
      : [];
    
    // Calculate total revenue and projects
    let totalRevenue = 0;
    const projectIds = new Set();
    
    partnerDocuments.forEach((doc: any) => {
      // Count unique projects
      if (doc.id) {
        projectIds.add(doc.id);
      }
      
      // Sum up revenue from all document types
      if (typeof doc.totalAmount === 'number') {
        totalRevenue += doc.totalAmount;
      }
    });
    
    // Update partner stats
    partner.totalProjects = projectIds.size;
    partner.totalRevenue = totalRevenue;
    partner.updatedAt = Date.now();
    
    await kv.set(`partner:${partnerId}`, partner);
    console.log(`Updated partner ${partnerId} stats: ${projectIds.size} projects, ฿${totalRevenue}`);
  } catch (error) {
    console.error(`Error updating partner stats for ${partnerId}:`, error);
  }
}

// ========== DOCUMENT NUMBER GENERATOR ==========

async function generateDocumentNumber(type: string): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  
  // Prefix based on document type
  const prefixes: Record<string, string> = {
    'boq': 'BOQ',
    'quotation': 'QT',
    'invoice': 'INV',
    'receipt': 'RCP'
  };
  
  const prefix = prefixes[type] || 'DOC';
  const counterKey = `counter:${type}:${year}${month}`;
  
  // Get current counter
  let counter = await kv.get(counterKey) || 0;
  counter = typeof counter === 'number' ? counter + 1 : 1;
  
  // Save new counter
  await kv.set(counterKey, counter);
  
  // Format: BOQ-2024-10-0001
  const docNumber = `${prefix}-${year}-${month}-${String(counter).padStart(4, '0')}`;
  
  return docNumber;
}

// ========== ANALYTICS API ==========

// Get analytics data
app.get("/make-server-6e95bca3/analytics", async (c) => {
  try {
    const range = c.req.query("range") || "month";
    
    // Get all customers and documents with proper error handling
    let customers: any[] = [];
    let documents: any[] = [];
    
    try {
      customers = (await kv.getByPrefix("customer:")) || [];
    } catch (error) {
      console.error("Error fetching customers for analytics:", error);
      customers = [];
    }
    
    try {
      documents = (await kv.getByPrefix("document:")) || [];
    } catch (error) {
      console.error("Error fetching documents for analytics:", error);
      documents = [];
    }
    
    // Ensure arrays are valid
    if (!Array.isArray(customers)) customers = [];
    if (!Array.isArray(documents)) documents = [];
    
    // Separate customer and partner documents
    const customerDocs = documents.filter((doc: any) => !doc.recipientType || doc.recipientType === 'customer');
    const partnerDocs = documents.filter((doc: any) => doc.recipientType === 'partner');
    
    // Calculate total revenue (from customers = profit)
    const totalRevenue = customerDocs.reduce((sum: number, doc: any) => {
      const amount = typeof doc?.totalAmount === 'number' ? doc.totalAmount : 0;
      return sum + amount;
    }, 0);
    
    // Calculate total cost (from partners)
    const totalCost = partnerDocs.reduce((sum: number, doc: any) => {
      const amount = typeof doc?.totalAmount === 'number' ? doc.totalAmount : 0;
      return sum + amount;
    }, 0);
    
    // Calculate net income
    const netIncome = totalRevenue - totalCost;
    
    // Total projects (count customer documents)
    const totalProjects = customerDocs.length;
    
    // Total customers
    const totalCustomers = customers.length;
    
    // Average project value
    const averageProjectValue = totalProjects > 0 ? totalRevenue / totalProjects : 0;
    
    // Calculate real revenue, cost, and net income by month from documents
    const monthlyData = new Map<string, { revenue: number; cost: number; netIncome: number; projects: number }>();
    const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    
    // Process customer documents (revenue)
    customerDocs.forEach((doc: any) => {
      try {
        if (doc?.createdAt) {
          const date = new Date(doc.createdAt);
          if (!isNaN(date.getTime())) {
            const monthKey = thaiMonths[date.getMonth()];
            
            if (!monthlyData.has(monthKey)) {
              monthlyData.set(monthKey, { revenue: 0, cost: 0, netIncome: 0, projects: 0 });
            }
            
            const current = monthlyData.get(monthKey)!;
            current.revenue += typeof doc.totalAmount === 'number' ? doc.totalAmount : 0;
            current.projects += 1;
          }
        }
      } catch (error) {
        console.error("Error processing customer document for monthly revenue:", error);
      }
    });
    
    // Process partner documents (cost)
    partnerDocs.forEach((doc: any) => {
      try {
        if (doc?.createdAt) {
          const date = new Date(doc.createdAt);
          if (!isNaN(date.getTime())) {
            const monthKey = thaiMonths[date.getMonth()];
            
            if (!monthlyData.has(monthKey)) {
              monthlyData.set(monthKey, { revenue: 0, cost: 0, netIncome: 0, projects: 0 });
            }
            
            const current = monthlyData.get(monthKey)!;
            current.cost += typeof doc.totalAmount === 'number' ? doc.totalAmount : 0;
          }
        }
      } catch (error) {
        console.error("Error processing partner document for monthly cost:", error);
      }
    });
    
    // Calculate net income for each month
    monthlyData.forEach((data) => {
      data.netIncome = data.revenue - data.cost;
    });
    
    const revenueByMonth = thaiMonths.map(month => {
      const data = monthlyData.get(month);
      return {
        month,
        revenue: data?.revenue || 0,
        cost: data?.cost || 0,
        netIncome: data?.netIncome || 0,
        projects: data?.projects || 0,
      };
    }).filter(m => m.revenue > 0 || m.cost > 0);
    
    // Calculate revenue by category from BOQ items
    const categoryRevenue = new Map<string, number>();
    documents.forEach((doc: any) => {
      try {
        if (doc?.boqItems && Array.isArray(doc.boqItems)) {
          doc.boqItems.forEach((item: any) => {
            try {
              const category = item?.category || "อื่นๆ";
              const material = typeof item?.material === 'number' ? item.material : 0;
              const labor = typeof item?.labor === 'number' ? item.labor : 0;
              const quantity = typeof item?.quantity === 'number' ? item.quantity : 0;
              const itemTotal = (material + labor) * quantity;
              
              if (itemTotal > 0) {
                categoryRevenue.set(category, (categoryRevenue.get(category) || 0) + itemTotal);
              }
            } catch (error) {
              console.error("Error processing BOQ item:", error);
            }
          });
        }
      } catch (error) {
        console.error("Error processing document BOQ items:", error);
      }
    });
    
    const totalCategoryRevenue = Array.from(categoryRevenue.values()).reduce((sum, val) => sum + val, 0);
    const revenueByCategory = Array.from(categoryRevenue.entries()).map(([category, revenue]) => ({
      category,
      revenue,
      percentage: totalCategoryRevenue > 0 ? Math.round((revenue / totalCategoryRevenue) * 100) : 0,
    })).sort((a, b) => b.revenue - a.revenue);
    
    // Calculate top customers with real data
    const customerRevenue = new Map<string, { customer: any; revenue: number; projects: number }>();
    documents.forEach((doc: any) => {
      try {
        if (doc?.customerId) {
          if (!customerRevenue.has(doc.customerId)) {
            const customer = customers.find((c: any) => c?.id === doc.customerId);
            customerRevenue.set(doc.customerId, { customer, revenue: 0, projects: 0 });
          }
          const current = customerRevenue.get(doc.customerId)!;
          const amount = typeof doc.totalAmount === 'number' ? doc.totalAmount : 0;
          current.revenue += amount;
          current.projects += 1;
        }
      } catch (error) {
        console.error("Error processing customer revenue:", error);
      }
    });
    
    const topCustomers = Array.from(customerRevenue.values())
      .map(({ customer, revenue, projects }) => ({
        id: customer?.id || '',
        name: customer?.name || 'ไม่ระบุ',
        totalRevenue: revenue,
        totalProjects: projects,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);
    
    // Recent documents - sort safely
    const recentDocuments = documents
      .map((doc: any) => {
        try {
          return {
            ...doc,
            _sortDate: doc?.createdAt ? new Date(doc.createdAt).getTime() : 0
          };
        } catch {
          return { ...doc, _sortDate: 0 };
        }
      })
      .sort((a: any, b: any) => (b._sortDate || 0) - (a._sortDate || 0))
      .slice(0, 10)
      .map(({ _sortDate, ...doc }) => doc); // Remove temporary sort field
    
    const analytics = {
      totalRevenue,
      totalCost,
      netIncome,
      totalProjects,
      totalCustomers,
      averageProjectValue,
      revenueByMonth,
      revenueByCategory,
      topCustomers,
      recentDocuments,
    };
    
    return c.json(analytics);
  } catch (error: any) {
    console.error("Get analytics error:", error);
    // Return empty analytics instead of error to prevent UI breaks
    return c.json({
      totalRevenue: 0,
      totalCost: 0,
      netIncome: 0,
      totalProjects: 0,
      totalCustomers: 0,
      averageProjectValue: 0,
      revenueByMonth: [],
      revenueByCategory: [],
      topCustomers: [],
      recentDocuments: [],
      error: error?.message || 'Unknown error'
    }, { status: 200 }); // Return 200 with empty data instead of 500
  }
});

// ========== FILE UPLOAD API ==========

// Upload avatar/logo
app.post("/make-server-6e95bca3/upload-avatar", async (c) => {
  try {
    const { userId, imageData } = await c.req.json();
    
    if (!userId || !imageData) {
      return c.json({ error: "Missing userId or imageData" }, { status: 400 });
    }

    // Store image data in KV (for demo - in production use Supabase Storage)
    const imageKey = `avatar:${userId}`;
    await kv.set(imageKey, imageData);
    
    // Update profile with avatar URL
    const profile = await kv.get(`profile:${userId}`);
    if (profile) {
      (profile as any).avatarUrl = imageData; // Store base64 directly for demo
      await kv.set(`profile:${userId}`, profile);
    }
    
    return c.json({ 
      success: true, 
      avatarUrl: imageData 
    });
  } catch (error: any) {
    console.error("Upload avatar error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Upload company logo
app.post("/make-server-6e95bca3/upload-logo", async (c) => {
  try {
    const { userId, imageData } = await c.req.json();
    
    if (!userId || !imageData) {
      return c.json({ error: "Missing userId or imageData" }, { status: 400 });
    }

    // Store image data in KV
    const imageKey = `logo:${userId}`;
    await kv.set(imageKey, imageData);
    
    // Update profile with logo URL
    const profile = await kv.get(`profile:${userId}`);
    if (profile) {
      if (!(profile as any).company) {
        (profile as any).company = {};
      }
      (profile as any).company.logoUrl = imageData;
      await kv.set(`profile:${userId}`, profile);
    }
    
    return c.json({ 
      success: true, 
      logoUrl: imageData 
    });
  } catch (error: any) {
    console.error("Upload logo error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// ========== WITHHOLDING TAX API ==========

// Get all withholding taxes
app.get("/make-server-6e95bca3/withholding-taxes", async (c) => {
  try {
    const withholdingTaxes = await kv.getByPrefix("withholding-tax:");
    const validTaxes = Array.isArray(withholdingTaxes) ? withholdingTaxes : [];
    return c.json({ withholdingTaxes: validTaxes });
  } catch (error: any) {
    console.error("Get withholding taxes error:", error);
    return c.json({ withholdingTaxes: [], error: error?.message || 'Unknown error' }, { status: 200 });
  }
});

// Create withholding tax
app.post("/make-server-6e95bca3/withholding-taxes", async (c) => {
  try {
    const withholdingTax = await c.req.json();
    await kv.set(`withholding-tax:${withholdingTax.id}`, withholdingTax);
    return c.json({ success: true, withholdingTax });
  } catch (error: any) {
    console.error("Create withholding tax error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Update withholding tax
app.put("/make-server-6e95bca3/withholding-taxes/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const withholdingTax = await c.req.json();
    withholdingTax.updatedAt = Date.now();
    await kv.set(`withholding-tax:${id}`, withholdingTax);
    return c.json({ success: true, withholdingTax });
  } catch (error: any) {
    console.error("Update withholding tax error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Delete withholding tax
app.delete("/make-server-6e95bca3/withholding-taxes/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`withholding-tax:${id}`);
    return c.json({ success: true });
  } catch (error: any) {
    console.error("Delete withholding tax error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// ========== PARTNER PAYMENT API ==========

// Get all partner payments
app.get("/make-server-6e95bca3/partner-payments", async (c) => {
  try {
    const partnerPayments = await kv.getByPrefix("partner-payment:");
    const validPayments = Array.isArray(partnerPayments) ? partnerPayments : [];
    return c.json({ partnerPayments: validPayments });
  } catch (error: any) {
    console.error("Get partner payments error:", error);
    return c.json({ partnerPayments: [], error: error?.message || 'Unknown error' }, { status: 200 });
  }
});

// Create partner payment
app.post("/make-server-6e95bca3/partner-payments", async (c) => {
  try {
    const partnerPayment = await c.req.json();
    await kv.set(`partner-payment:${partnerPayment.id}`, partnerPayment);
    return c.json({ success: true, partnerPayment });
  } catch (error: any) {
    console.error("Create partner payment error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Update partner payment
app.put("/make-server-6e95bca3/partner-payments/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const partnerPayment = await c.req.json();
    partnerPayment.updatedAt = Date.now();
    await kv.set(`partner-payment:${id}`, partnerPayment);
    return c.json({ success: true, partnerPayment });
  } catch (error: any) {
    console.error("Update partner payment error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Delete partner payment
app.delete("/make-server-6e95bca3/partner-payments/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`partner-payment:${id}`);
    return c.json({ success: true });
  } catch (error: any) {
    console.error("Delete partner payment error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// ========== AUTH API ==========

// Signup endpoint with auto email confirmation
app.post("/make-server-6e95bca3/signup", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return c.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return c.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Create Supabase Admin client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      // User exists - check if email is confirmed
      if (existingUser.email_confirmed_at) {
        // Email is confirmed - user should login instead
        console.log("User already exists with confirmed email:", email);
        return c.json(
          { 
            error: "อีเมลนี้ถูกใช้งานแล้ว กรุณาเข้าสู่ระบบ",
            code: "email_exists_confirmed"
          },
          { status: 409 }
        );
      } else {
        // Email NOT confirmed - delete old user and create new one
        console.log("Deleting unconfirmed user and creating new:", email);
        await supabase.auth.admin.deleteUser(existingUser.id);
      }
    }

    // Create user with admin API (auto-confirms email)
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        name: name || email.split("@")[0],
      },
      // Automatically confirm the user's email since email server hasn't been configured
      email_confirm: true,
    });

    if (error) {
      console.error("Signup error:", error);
      return c.json({ error: error.message }, { status: 400 });
    }

    console.log("User created successfully:", data.user?.email);

    return c.json({
      success: true,
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
    });
  } catch (error: any) {
    console.error("Signup error:", error);
    return c.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
});

Deno.serve(app.fetch);