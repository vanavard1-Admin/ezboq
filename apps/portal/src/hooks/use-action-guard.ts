/**
 * useActionGuard Hook
 * 
 * B1: Prevents double actions by tracking action state
 * Provides loading state and disabled flag for buttons
 */
import { useState, useCallback } from 'react';

export interface UseActionGuardReturn {
    isExecuting: boolean;
    execute: <T>(action: () => Promise<T>) => Promise<T | undefined>;
    reset: () => void;
}

export function useActionGuard(): UseActionGuardReturn {
    const [isExecuting, setIsExecuting] = useState(false);

    const execute = useCallback(async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
        if (isExecuting) {
            console.warn('[useActionGuard] Action already executing, ignoring duplicate call');
            return undefined;
        }

        setIsExecuting(true);
        try {
            return await action();
        } catch (error) {
            throw error;
        } finally {
            setIsExecuting(false);
        }
    }, [isExecuting]);

    const reset = useCallback(() => {
        setIsExecuting(false);
    }, []);

    return {
        isExecuting,
        execute,
        reset,
    };
}






