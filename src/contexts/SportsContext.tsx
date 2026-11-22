// done
'use client'
import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef, ReactNode } from "react";
import { getSports } from "@/actions/sports";
import { usePathname } from "next/navigation";

const SportsContext = createContext<any>(null);

export const SportsProvider = ({ children }: { children: ReactNode }) => {
    const [sports, setSports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const latestRequest = useRef(0);
    const pathname = usePathname();

    const fetchSports = useCallback(async () => {
        const request = ++latestRequest.current;
        try {
            const result = await getSports();
            if (request !== latestRequest.current) return;
            setLoadFailed(!result.success);
            setSports(result.success ? result.data.documents : []);
        } catch {
            if (request === latestRequest.current) {
                setLoadFailed(true);
                setSports([]);
            }
        } finally {
            if (request === latestRequest.current) setLoading(false);
        }
    }, [])

    useEffect(() => {
        fetchSports();
    }, [pathname, fetchSports])

    const contextValue = useMemo(() => ({
        sports,
        loading,
        loadFailed,
        setSports,
        refreshSports: fetchSports
    }), [sports, loading, loadFailed, fetchSports]);

    return (
        <SportsContext.Provider value={contextValue}>
            {children}
        </SportsContext.Provider>
    )
}

export const useSport = () => {
    let context = useContext(SportsContext);
    if (!context) throw new Error("useSport must be used within SportsProvider");
    return context;
}
