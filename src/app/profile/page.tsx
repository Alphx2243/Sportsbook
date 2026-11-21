"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";

export default function ProfilePage() {
    const router = useRouter();
    const { user, loading: userLoading } = useAuth();

    interface ProfileFormData {
        name: string;
        email: string;
        phoneNumber: string;
        rollNumber: string;
    }

    const [formData, setFormData] = useState<ProfileFormData>({
        name: "", email: "",
        phoneNumber: "", rollNumber: "",
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function fetchProfile() {
            if (userLoading) return;
            if (!user) {
                setLoading(false);
                router.push("/login");
                return;
            }
            try {
                const profile = user;
                if (!profile) throw new Error("User profile not found");
                setFormData({
                    name: profile.name || "",
                    email: profile.email || "",
                    phoneNumber: profile.phone || "",
                    rollNumber: profile.rollNumber || "",
                });
            }
            catch (err: any) {
                console.error("Error fetching user profile:", err);
                setError(err.message || "Failed to fetch profile");
            }
            finally {
                setLoading(false);
            }
        }
        fetchProfile();
    }, [user, userLoading, router]);

    if (loading || userLoading) {
        return (
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
            <motion.div
                className="max-w-4xl mx-auto mt-20 glass-panel rounded-2xl p-6 md:p-8 shadow-xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gradient-premium">Profile</h1>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {["name", "phoneNumber", "rollNumber"].map((field) => {
                            const identityField = field === 'name' || field === 'rollNumber';
                            return (
                            <div key={field}>
                                <label className="block text-sm font-medium mb-2 capitalize text-gray-400">
                                    {field.replace(/([A-Z])/g, " $1")}
                                </label>
                                <input
                                    type="text"
                                    name={field}
                                    value={(formData as any)[field]}
                                    disabled
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 transition-all"
                                />
                                {field === 'phoneNumber' ? (
                                    <p className="mt-1 text-xs text-gray-500">Mobile number updates are temporarily unavailable.</p>
                                ) : identityField && (
                                    <p className="mt-1 text-xs text-gray-500">Verified from your IIITD Google account and cannot be edited.</p>
                                )}
                            </div>
                            );
                        })}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-400">Email</label>
                            <input
                                type="text"
                                name="userId"
                                value={formData.email}
                                disabled
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder-gray-500 opacity-60"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-400">User Id</label>
                            <input
                                type="email"
                                name="email"
                                value={user?.id}
                                disabled
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder-gray-500 opacity-60"
                            />
                        </div>
                    </div>

                </div>
            </motion.div>
        </div>
    );
}
