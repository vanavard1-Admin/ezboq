import { Router, Response } from 'express';
import { AuthenticatedRequest, verifyAuth, getActiveBusinessId } from './auth';
import { Expense, ExpenseStatus } from '../shared/expense.types';
import { getDb } from '../core/firebaseAdmin';

const router = Router();

// Validation helper
const validateExpense = (body: any): Partial<Expense> | null => {
    if (!body.description || !body.amount || !body.date || !body.category) {
        return null;
    }
    return {
        description: body.description,
        amount: Number(body.amount),
        date: body.date,
        category: String(body.category),
        status: (body.status as ExpenseStatus) || ExpenseStatus.PAID,
        supplierName: body.supplierName || null,
        supplierTaxId: body.supplierTaxId || null,
        supplierAddress: body.supplierAddress || null,
        vatAmount: Number(body.vatAmount || 0),
        totalAmount: Number(body.totalAmount || body.amount),
        whtAmount: Number(body.whtAmount || 0),
        receiptUrl: body.receiptUrl || null,
    };
};

/**
 * POST /expenses
 * Create a new expense
 */
router.post('/', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const businessId = await getActiveBusinessId(req.userId || '');
        if (!businessId) {
            res.status(400).json({ error: 'No business context found' });
            return;
        }

        const payload = validateExpense(req.body);
        if (!payload) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        const db = getDb();
        const collection = db.collection('businesses').doc(businessId).collection('expenses');

        const now = new Date().toISOString();
        const expenseData: Omit<Expense, 'id'> = {
            userId: req.user?.uid || '',
            description: payload.description!,
            amount: payload.amount!,
            date: payload.date!,
            category: payload.category!,
            status: payload.status!,

            supplierName: payload.supplierName!,
            supplierTaxId: payload.supplierTaxId!,
            supplierAddress: payload.supplierAddress!,
            vatAmount: payload.vatAmount || 0,
            totalAmount: payload.totalAmount || payload.amount!,
            whtAmount: payload.whtAmount || 0,
            receiptUrl: payload.receiptUrl!,

            createdAt: now,
            updatedAt: now,
        };

        const docRef = await collection.add(expenseData);

        res.status(201).json({ id: docRef.id, ...expenseData });
    } catch (error) {
        console.error('Error creating expense:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /expenses
 * List expenses with optional filters
 */
router.get('/', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const businessId = await getActiveBusinessId(req.userId || '');
        if (!businessId) {
            res.status(400).json({ error: 'No business context found' });
            return;
        }

        const { startDate, endDate, category, status } = req.query;

        const db = getDb();
        let query = db.collection('businesses').doc(businessId).collection('expenses')
            .orderBy('date', 'desc');

        if (startDate) {
            query = query.where('date', '>=', startDate);
        }
        if (endDate) {
            query = query.where('date', '<=', endDate);
        }
        if (category) {
            query = query.where('category', '==', category);
        }
        if (status) {
            query = query.where('status', '==', status);
        }

        const snapshot = await query.get();
        const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.json(expenses);
    } catch (error) {
        console.error('Error listing expenses:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PUT /expenses/:id
 * Update an expense
 */
router.put('/:id', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const businessId = await getActiveBusinessId(req.userId || '');
        if (!businessId) {
            res.status(400).json({ error: 'No business context found' });
            return;
        }
        const { id } = req.params as { id: string };

        // Check ownership by just trying to reference the path inside business
        const db = getDb();
        const docRef = db.collection('businesses').doc(businessId).collection('expenses').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            res.status(404).json({ error: 'Expense not found' });
            return;
        }

        const payload = validateExpense(req.body);
        if (!payload) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        const updateData = {
            ...payload,
            updatedAt: new Date().toISOString(),
        };

        await docRef.update(updateData);

        res.json({ id, ...doc.data(), ...updateData });
    } catch (error) {
        console.error('Error updating expense:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /expenses/:id
 * Delete an expense
 */
router.delete('/:id', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const businessId = await getActiveBusinessId(req.userId || '');
        if (!businessId) {
            res.status(400).json({ error: 'No business context found' });
            return;
        }
        const { id } = req.params as { id: string };

        const db = getDb();
        const docRef = db.collection('businesses').doc(businessId).collection('expenses').doc(id);

        // Check existing
        const doc = await docRef.get();
        if (!doc.exists) {
            res.status(404).json({ error: 'Expense not found' });
            return;
        }

        await docRef.delete();

        res.json({ success: true, id });
    } catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
