// done
'use client'
import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef, ReactNode } from "react";
import { getSports } from "@/actions/sports";
import { usePathname } from "next/navigation";

const SportsContext = createContext<any>(null);

export const SportsProvider = ({ children }: { children: ReactNode }) => {
    const [sports, setSports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();
    const sportsRef = useRef<any[]>([]);

    const fetchSports = useCallback(async (force = false) => {
        try {
            if (!force && sportsRef.current !== null && sportsRef.current.length > 0) {
                setLoading(false); return;
            }
            const sportsData = await getSports();
            const docs = sportsData.success ? sportsData.data.documents : [];
            sportsRef.current = docs;
            setSports(docs);
            setLoading(false);
        }
        catch (error) {
            console.error('Failed to fetch sports:', error);
            setLoading(false);
        }
    }, [])

    useEffect(() => {
        fetchSports();
    }, [pathname, fetchSports])

    const contextValue = useMemo(() => ({
        sports,
        loading,
        setSports,
        refreshSports: fetchSports
    }), [sports, loading, fetchSports]);

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
