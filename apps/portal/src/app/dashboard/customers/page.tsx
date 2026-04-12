'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { customersRepo } from '@/lib/repos/customers.repo';
import { Customer } from '@/lib/api';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const searchParamValue = searchParams.get('q') ?? '';

    // Form state
    const [formData, setFormData] = useState<Partial<Customer>>({ type: 'PERSON' });

    const fetchCustomers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await customersRepo.listCustomers({ q: search });
            setCustomers(res.customers);
        } catch (error) {
            console.error('Failed to fetch customers:', error);
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]); // Re-fetch when search changes (debounce would be better in prod)

    useEffect(() => {
        if (searchParamValue !== search) {
            setSearch(searchParamValue);
        }
    }, [searchParamValue, search]);

    useEffect(() => {
        const nextValue = search.trim();
        if (nextValue === searchParamValue) return;
        const handle = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (nextValue) {
                params.set('q', nextValue);
            } else {
                params.delete('q');
            }
            const query = params.toString();
            router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false });
        }, 350);
        return () => clearTimeout(handle);
    }, [search, searchParamValue, searchParams, pathname, router]);

    const handleOpenModal = (customer?: Customer) => {
        if (customer) {
            setEditingCustomer(customer);
            setFormData(customer);
        } else {
            setEditingCustomer(null);
            setFormData({ type: 'PERSON', displayName: '', address: '', phone: '', email: '', taxId: '' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCustomer(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCustomer) {
                await customersRepo.updateCustomer(editingCustomer.id, formData);
            } else {
                await customersRepo.createCustomer(formData);
            }
            setIsModalOpen(false);
            fetchCustomers();
        } catch (error) {
            alert('บันทึกลูกค้าไม่สำเร็จ');
            console.error(error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('ยืนยันลบลูกค้ารายนี้หรือไม่?')) return;
        try {
            await customersRepo.deleteCustomer(id);
            fetchCustomers();
        } catch (error) {
            alert('ลบลูกค้าไม่สำเร็จ');
            console.error(error);
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">ลูกค้า</h1>
                    <p className="mt-2 text-sm text-gray-700 dark:text-slate-300">
                        รายชื่อลูกค้าทั้งหมดของคุณ พร้อมเลขผู้เสียภาษีและข้อมูลติดต่อ
                    </p>
                </div>
                <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
                    <button
                        onClick={() => handleOpenModal()}
                        className="relative z-50 block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                        <Plus className="inline-block w-4 h-4 mr-1" />
                        เพิ่มลูกค้า
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="mt-6 flex">
                <div className="relative flex-grow focus-within:z-10">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-5 w-5 text-gray-400 dark:text-slate-400" aria-hidden="true" />
                    </div>
                    <input
                        type="text"
                        className="block w-full rounded-md border-gray-300 dark:border-slate-700 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border dark:bg-slate-800 dark:text-slate-100"
                        placeholder="ค้นหาลูกค้า..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            <div className="mt-8 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg bg-white dark:bg-slate-900">
                            <table className="min-w-full divide-y divide-gray-300 dark:divide-slate-700">
                                <thead className="bg-gray-50 dark:bg-slate-800">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100 sm:pl-6">ชื่อ</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">ประเภท</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">เลขผู้เสียภาษี</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">ติดต่อ</th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                            <span className="sr-only">การทำงาน</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                                    {loading && customers.length === 0 ? (
                                        <tr><td colSpan={5} className="p-4 text-center">กำลังโหลด...</td></tr>
                                    ) : customers.length === 0 ? (
                                        <tr><td colSpan={5} className="p-4 text-center text-gray-500 dark:text-slate-400">ยังไม่มีลูกค้าในระบบ</td></tr>
                                    ) : (
                                        customers.map((customer) => (
                                            <tr key={customer.id}>
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-6">
                                                    <Link href={`/dashboard/customers/detail?id=${customer.id}`} className="text-emerald-600 dark:text-emerald-400 hover:underline">
                                                        {customer.displayName}
                                                    </Link>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-slate-400">
                                                    {customer.type}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-slate-400">
                                                    {customer.taxId || '-'}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-slate-400">
                                                    <div>{customer.email}</div>
                                                    <div>{customer.phone}</div>
                                                </td>
                                                <td className="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                    <button onClick={() => handleOpenModal(customer)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDelete(customer.id)} className="text-red-600 hover:text-red-900">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-screen items-center justify-center px-4 py-12 text-center">
                        <div className="fixed inset-0 bg-transparent backdrop-blur-sm transition-opacity" onClick={handleCloseModal} />

                        <div className="relative z-10 w-full max-w-lg transform overflow-hidden rounded-lg bg-white dark:bg-slate-900 px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:p-6">
                            <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                                <button
                                    type="button"
                                    className="rounded-md bg-white dark:bg-slate-900 text-gray-400 dark:text-slate-400 hover:text-gray-500 dark:hover:text-slate-300 focus:outline-none"
                                    onClick={handleCloseModal}
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-slate-100 mb-4">
                                {editingCustomer ? 'แก้ไขลูกค้า' : 'เพิ่มลูกค้า'}
                            </h3>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">ประเภท</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value as 'PERSON' | 'COMPANY' })}
                                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm border dark:bg-slate-800 dark:text-slate-100"
                                    >
                                        <option value="PERSON">บุคคล</option>
                                        <option value="COMPANY">บริษัท</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">ชื่อที่แสดง</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.displayName || ''}
                                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border dark:bg-slate-800 dark:text-slate-100"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">เลขผู้เสียภาษี</label>
                                    <input
                                        type="text"
                                        value={formData.taxId || ''}
                                        onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border dark:bg-slate-800 dark:text-slate-100"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">ที่อยู่</label>
                                    <input
                                        type="text"
                                        value={formData.address || ''}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border dark:bg-slate-800 dark:text-slate-100"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">เบอร์โทร</label>
                                        <input
                                            type="text"
                                            value={formData.phone || ''}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border dark:bg-slate-800 dark:text-slate-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">อีเมล</label>
                                        <input
                                            type="email"
                                            value={formData.email || ''}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border dark:bg-slate-800 dark:text-slate-100"
                                        />
                                    </div>
                                </div>

                                <div className="mt-5 sm:mt-6">
                                    <button
                                        type="submit"
                                        className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:text-sm"
                                    >
                                        บันทึก
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
