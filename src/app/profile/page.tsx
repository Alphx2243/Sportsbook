"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { useSport } from "@/contexts/SportsContext";
import { updateUser } from '@/actions/auth';

const EXPERTISE_LEVELS = ["Beginner", "Intermediate", "Expert"];

export default function ProfilePage() {
    const { user, loading: userLoading, setUser } = useAuth();
    const [userProfile, setUserProfile] = useState<any>(null);
    const { sports, setSports } = useSport();
    const [isEditing, setIsEditing] = useState(false);

    interface ProfileFormData {
        name: string;
        email: string;
        phoneNumber: string;
        rollNumber: string;
        sports: string[];
    }

    const [formData, setFormData] = useState<ProfileFormData>({
        name: "", email: "",
        phoneNumber: "", rollNumber: "",
        sports: [],
    });
    const [availableSports, setAvailableSports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");


    useEffect(() => {
        if (sports && sports.length > 0) {
            const sportNames = sports.map((s: any) => s.name);
            setAvailableSports(sportNames);
        }
    }, [sports]);

    useEffect(() => {
        async function fetchProfile() {
            if (userLoading || !user) return;
            try {
                const profile = user;
                if (!profile) throw new Error("User profile not found");
                setUserProfile(profile);
                setFormData({
                    name: profile.name || "",
                    email: profile.email || "",
                    phoneNumber: profile.phone || "",
                    rollNumber: profile.rollNumber || "",
                    sports: Array.isArray(profile.sportsExperience)
                        ? profile.sportsExperience
                        : [],
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
    }, [user, userLoading]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSportChange = (sportName: string, level: string | null) => {
        setFormData((prev) => {
            const updated = [...prev.sports];
            const idx = updated.findIndex((s: string) => s.startsWith(sportName));
            if (idx !== -1) {
                if (level) updated[idx] = `${sportName}:${level}`;
                else updated.splice(idx, 1);
            }
            else if (level) {
                updated.push(`${sportName}:${level}`);
            }
            return { ...prev, sports: updated };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!userProfile?.id || !user?.id) {
            setError("Profile not found");
            return;
        }

        try {
            const payload: any = {
                userid: user.id, name: formData.name,
                email: formData.email, phone: formData.phoneNumber,
                rollNumber: formData.rollNumber, sportsExperience: formData.sports,
            };

            const res = await updateUser(userProfile.id, payload);
            if (res.success) {
                setUserProfile(res.data);
                setUser(res.data);
                setIsEditing(false);
            } else {
                throw new Error(res.error || "Update failed");
            }
        }
        catch (err: any) {
            console.error("Error updating profile:", err);
            setError(err.message || "Failed to save changes");
        }
    };
    if (loading || userLoading) {
        return (
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-4 md:p-8 relative overflow-hidden">
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-purple-600/10 rounded-full blur-[100px]" />
            </div>

            <motion.div
                className="max-w-4xl mx-auto mt-20 glass-panel rounded-2xl p-6 md:p-8 shadow-2xl relative z-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gradient-premium">Profile</h1>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg cursor-pointer hover:shadow-lg hover:scale-105 transition-all"
                    >
                        {isEditing ? "Cancel" : "Edit Profile"}
                    </button>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {["name", "phoneNumber", "rollNumber"].map((field) => (
                            <div key={field}>
                                <label className="block text-sm font-medium mb-2 capitalize text-gray-400">
                                    {field.replace(/([A-Z])/g, " $1")}
                                </label>
                                <input
                                    type="text"
                                    name={field}
                                    value={(formData as any)[field]}
                                    onChange={handleChange}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 transition-all"
                                />
                            </div>
                        ))}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-400">Email</label>
                            <input
                                type="email"
                                name="email"
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

                    <div>
                        <h2 className="text-xl font-semibold mb-4 text-foreground">Sports Expertise</h2>
                        <div className="space-y-3">
                            {availableSports.map((sport) => {
                                const selected = formData.sports
                                    .map((s: string) => {
                                        const [name, level] = s.split(":");
                                        return { name, level };
                                    })
                                    .find((s) => s.name === sport);
                                return (
                                    <div
                                        key={sport}
                                        className="flex items-center justify-between bg-white/5 border border-white/5 p-4 rounded-xl hover:border-primary/30 transition-colors"
                                    >
                                        <span className="font-medium text-foreground">{sport}</span>
                                        {isEditing ? (
                                            <select
                                                className="bg-black/20 text-foreground px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:ring-1 focus:ring-primary"
                                                value={selected?.level || ""}
                                                onChange={(e) =>
                                                    handleSportChange(sport, e.target.value || null)
                                                }
                                            >
                                                <option value="" className="bg-zinc-900">None</option>
                                                {EXPERTISE_LEVELS.map((level) => (
                                                    <option key={level} value={level} className="bg-zinc-900">
                                                        {level}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className={`text-sm font-medium px-3 py-1 rounded-full ${selected?.level ? 'bg-primary/20 text-blue-300' : 'text-gray-500'}`}>
                                                {selected?.level || "None"}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {isEditing && (
                        <motion.button
                            type="submit"
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl text-lg shadow-[0_0_20px_-5px_var(--color-primary)] cursor-pointer"
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                        >
                            Save Changes
                        </motion.button>
                    )}
                </form>
            </motion.div>
        </div>
    );
}
