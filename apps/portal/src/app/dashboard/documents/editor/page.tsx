'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { documentsRepo } from '@/lib/repos/documents.repo';
import { EzDocument as Document } from '@/lib/repos/documents.repo';
import DocumentEditor from '@/components/document-editor';

function EditorContent() {
    const searchParams = useSearchParams();
    const [document, setDocument] = useState<Document | null | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);
    const id = searchParams.get('id');
    const type = searchParams.get('type') as Document['docType'] | null;
    const customerId = searchParams.get('customerId');
    const isNewDoc = id === 'new' || (!id && !!type);

    useEffect(() => {
        if (!id || isNewDoc) return;

        let isCancelled = false;

        documentsRepo.getDocument(id)
            .then((doc) => {
                if (!isCancelled) {
                    setError(null);
                    setDocument(doc ?? null);
                }
            })
            .catch((err) => {
                console.error(err);
                if (!isCancelled) {
                    setError('Failed to load document');
                }
            });

        return () => {
            isCancelled = true;
        };
    }, [id, isNewDoc]);

    if (isNewDoc) {
        const seed: Partial<Document> = {};
        if (type) seed.docType = type;
        if (customerId) seed.customerId = customerId;
        return <DocumentEditor initialData={seed as Document} isNew />;
    }

    if (!id) return <div className="p-8 text-center text-red-500">Missing document ID</div>;

    const isLoading = document === undefined && !error;
    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading document...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
    if (document === null) return <div className="p-8 text-center text-gray-500">Document not found</div>;

    return <DocumentEditor initialData={document ?? undefined} />;
}

export default function EditDocumentPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading...</div>}>
            <EditorContent />
        </Suspense>
    );
}
