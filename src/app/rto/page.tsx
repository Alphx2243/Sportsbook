"use client";
import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useSport } from "@/contexts/SportsContext";
import { useTheme } from "@/contexts/ThemeContext";
// import { useSocket } from "@/hooks/useSocket";
import { Users, Percent, User, MapPin, Calendar, BarChart3, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from "recharts";

const parseList = (arr: any) => {
  if (!Array.isArray(arr)) return [];
  return arr.map((item: string) => {
    if (typeof item !== 'string') return { name: 'Unknown', count: 0 };
    const [name, count] = item.split(":");
    return { name: (name || 'Unknown').trim(), count: Number(count) || 0 };
  });
};

const SportSelector = ({ value, onChange }: { value: string; onChange: (val: string) => void }) => {
  const { sports } = useSport();
  const options = useMemo(() => sports?.map((s: any) => s.name) || [], [sports]);

  return (
    <div className="flex flex-wrap justify-center gap-3 mb-10">
      {options.map((s: string) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 border ${value === s
            ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105"
            : "bg-white/5 text-gray-400 border-white/5 hover:border-white/20 hover:bg-white/10"
            }`}
        >
          {s}
        </button>
      ))}
    </div>
  );
};

const OccupancyCard = ({ info }: { info: any }) => {
  if (!info || !info.name) return null;

  const totalPlayers = info.numPlayers || 0;
  const rate = info.maxCapacity
    ? Math.round(((info.numPlayers || 0) / info.maxCapacity) * 100)
    : info.numberOfCourts
      ? Math.round((info.courtsInUse / info.numberOfCourts) * 100)
      : 0;

  const statusColor = rate < 50 ? "text-emerald-400" : rate < 80 ? "text-amber-400" : "text-rose-400";
  const statusBg = rate < 50 ? "bg-emerald-500/10 border-emerald-500/20" : rate < 80 ? "bg-amber-500/10 border-amber-500/20" : "bg-rose-500/10 border-rose-500/20";
  const statusText = rate < 50 ? "Available" : rate < 80 ? "Busy" : "Near Capacity";

  const equipment = (info.equipments || []).map((e: any) => ({
    name: e.name,
    used: e.inUse || 0,
    total: e.total || 0
  }));

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass-panel rounded-3xl p-8 w-full max-w-lg border border-white/5 shadow-2xl relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-500">
        <Users size={120} />
      </div>

      <div className="flex justify-between items-start mb-8">
        <div>
          <p className="text-primary text-xs font-black uppercase tracking-widest mb-1">Live Metrics</p>
          <h2 className="text-3xl font-black text-foreground tracking-tight">{info.name}</h2>
        </div>
        <span className={`${statusBg} ${statusColor} border px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider`}>
          {statusText}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white/5 rounded-2xl p-5 border border-white/5 hover:bg-white/10 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Users className="text-blue-400 h-5 w-5" />
            </div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wide">Students</p>
          </div>
          <p className="text-3xl font-black text-foreground">{totalPlayers}</p>
        </div>

        <div className="bg-white/5 rounded-2xl p-5 border border-white/5 hover:bg-white/10 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Percent className="text-purple-400 h-5 w-5" />
            </div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wide">Occupancy</p>
          </div>
          <p className="text-3xl font-black text-foreground">{rate}%</p>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="text-primary w-4 h-4" />
          <h3 className="text-foreground text-sm font-black uppercase tracking-widest">Equipment Inventory</h3>
        </div>

        <div className="space-y-3">
          {equipment.length ? (
            equipment.map((e: any) => (
              <div key={e.name} className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                  <span className="text-gray-400">{e.name}</span>
                  <span className="text-foreground">{e.used} / {e.total}</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(e.used / e.total) * 100}%` }}
                    className={`h-full rounded-full ${e.used / e.total > 0.8 ? 'bg-rose-500' : 'bg-primary'}`}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="py-4 text-center bg-white/5 rounded-xl border border-dashed border-white/10">
              <p className="text-gray-500 text-xs font-medium">No equipment tracked for this sport</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const CourtVisualization = ({ info }: { info: any }) => {
  if (!info || !info.name) return null;
  const players = info.numPlayers || 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass-panel rounded-3xl p-8 w-full max-w-lg border border-white/5 shadow-2xl relative"
    >
      <div className="flex items-center gap-2 mb-6">
        <MapPin className="text-primary w-4 h-4" />
        <h3 className="text-foreground text-sm font-black uppercase tracking-widest">Interactive Court View</h3>
      </div>

      <div className="relative w-full h-72 bg-emerald-950/20 border-2 border-emerald-500/20 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
        {players > 0 ? (
          <div className="relative w-full h-full p-8 grid grid-cols-4 sm:grid-cols-6 gap-4 items-center justify-items-center">
            {Array.from({ length: Math.min(players, 24) }).map((_, idx) => (
              <motion.div
                key={idx}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center ring-4 ring-emerald-500/10"
              >
                <User size={16} className="text-emerald-700" />
              </motion.div>
            ))}
            {players > 24 && (
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-[10px] font-black text-primary border border-primary/30">
                +{players - 24}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 opacity-30">
            <Users size={48} className="text-gray-400" />
            <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">No active players</p>
          </div>
        )}
        <div className="absolute inset-0 border-x-[1px] border-white/5 pointer-events-none" />
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/5 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-white/5 rounded-full pointer-events-none" />
      </div>

      <p className="mt-4 text-[10px] text-gray-500 text-center font-bold uppercase tracking-widest">
        Visual representation of current facility load
      </p>
    </motion.div>
  );
};

const OccupancyLocation = ({ info }: { info: any }) => {
  const isGymOrSwim = info?.name?.toLowerCase() === "gym" || info?.name?.toLowerCase() === "swimming";
  if (!info || isGymOrSwim) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel w-full max-w-4xl mx-auto p-8 rounded-3xl mt-10 border border-white/5"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="w-2 h-8 bg-primary rounded-full" />
        <h3 className="text-2xl font-black text-foreground tracking-tight uppercase">Zone Status</h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
        {(info.courtData || []).map((c: string, i: number) => {
          const [name, status] = c.split(":");
          const isOccupied = info.maxCapacity ? info.numPlayers > 0 : status === "1";

          return (
            <div
              key={i}
              className={`p-6 rounded-2xl border transition-all duration-500 hover:scale-105 ${isOccupied
                ? "bg-rose-500/5 border-rose-500/20 shadow-lg shadow-rose-500/5"
                : "bg-emerald-500/5 border-emerald-500/20 shadow-lg shadow-emerald-500/5"
                } flex flex-col items-center justify-center text-center`}
            >
              <div className={`w-3 h-3 rounded-full mb-3 ${isOccupied ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`} />
              <span className={`text-xl font-black tracking-tight ${isOccupied ? "text-rose-400" : "text-emerald-400"}`}>
                {name || `Court ${i + 1}`}
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-2">
                {isOccupied ? "Reserved" : "Open"}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

const TimeTable = ({ sport }: { sport: string }) => {
  const [url, setUrl] = useState<any>(null);
  const [loading, setLoading] = useState(false);


  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-10 glass-panel rounded-3xl mt-10 w-full max-w-4xl mx-auto text-center border border-white/5 shadow-2xl"
    >
      <div className="flex flex-col items-center gap-2 mb-8">
        <Calendar className="text-primary w-8 h-8 mb-2" />
        <h2 className="text-3xl font-black text-foreground tracking-tight">Weekly Schedule</h2>
        <p className="text-gray-500 text-sm font-medium">Standard operating hours and reserved training slots</p>
      </div>

      <div className="w-full h-80 flex flex-col items-center justify-center bg-white/5 rounded-2xl text-gray-500 border border-dashed border-white/10 gap-4">
        <AlertCircle size={40} className="opacity-20" />
        <p className="font-bold uppercase tracking-widest text-xs">No active schedule found</p>
      </div>
    </motion.div>
  );
};

const DataAnalysis = ({ sport }: { sport: string }) => {
  const { theme } = useTheme() as { theme: string };
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [peakData, setPeakData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isDark = theme === 'dark';

  useEffect(() => {
    async function fetchData() {
      if (!sport) return;
      setLoading(true);
      try {
        const { getSportAnalytics } = await import("@/actions/sports");
        const res = await getSportAnalytics(sport);
        if (res.success) {
          setWeeklyData(res.data.weeklyAttendance);
          setPeakData(res.data.peakHours);
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [sport]);

  const chartColors = {
    stroke: isDark ? "#333" : "#eee",
    text: isDark ? "#666" : "#999",
    tooltipBg: isDark ? "rgba(10, 10, 10, 0.95)" : "#fff",
    tooltipBorder: isDark ? "rgba(255, 255, 255, 0.1)" : "#eee",
    grid: isDark ? "rgba(255, 255, 255, 0.03)" : "#f5f5f5",
    primary: "#3b82f6",
    secondary: "#8b5cf6"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-40">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-10 space-y-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-10 rounded-3xl border border-white/5 shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-10">
          <BarChart3 className="text-primary w-6 h-6" />
          <h2 className="text-2xl font-black text-foreground tracking-tight uppercase">Weekly Attendance</h2>
        </div>

        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="0" vertical={false} stroke={chartColors.grid} />
              <XAxis
                dataKey="day"
                stroke={chartColors.text}
                fontSize={12}
                fontWeight="bold"
                axisLine={false}
                tickLine={false}
                dy={15}
              />
              <YAxis
                stroke={chartColors.text}
                fontSize={12}
                fontWeight="bold"
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: chartColors.tooltipBg,
                  borderColor: chartColors.tooltipBorder,
                  borderRadius: '16px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '12px'
                }}
                itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase' }}
                cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
              />
              <Bar dataKey="Students" fill={chartColors.primary} radius={[6, 6, 0, 0]} barSize={40}>
                {weeklyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.Students > 20 ? chartColors.primary : 'rgba(59, 130, 246, 0.5)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-panel p-10 rounded-3xl border border-white/5 shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-10">
          <Users className="text-purple-400 w-6 h-6" />
          <h2 className="text-2xl font-black text-foreground tracking-tight uppercase">Average Load by Hour</h2>
        </div>

        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={peakData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="0" vertical={false} stroke={chartColors.grid} />
              <XAxis
                dataKey="time"
                stroke={chartColors.text}
                fontSize={10}
                fontWeight="bold"
                axisLine={false}
                tickLine={false}
                dy={15}
              />
              <YAxis
                stroke={chartColors.text}
                fontSize={12}
                fontWeight="bold"
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: chartColors.tooltipBg,
                  borderColor: chartColors.tooltipBorder,
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '12px'
                }}
                itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: '900' }}
                cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
              />
              <Bar dataKey="Users" fill={chartColors.secondary} radius={[6, 6, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
};

export default function Occupancy() {
  const { sports, loading: sportsLoading, refreshSports } = useSport();
  const [selectedSport, setSelectedSport] = useState("");
  const [activeTab, setActiveTab] = useState("liveVacancy");

  // useSocket("rto", selectedSport, () => {
  //   refreshSports(true);
  // });

  useEffect(() => {
    if (sports && sports.length > 0 && !selectedSport) {
      setSelectedSport(sports[0].name);
    }
  }, [sports, selectedSport]);

  const sportInfo = useMemo(
    () => sports?.find((s: any) => s.name === selectedSport) || null,
    [sports, selectedSport]
  );

  if (sportsLoading && !sports?.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pt-[8rem] py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[10%] left-[-5%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="max-w-7xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-5xl md:text-7xl font-black text-gradient-premium mb-4 tracking-tighter">
            LIVE OCCUPANCY
          </h1>
          <p className="text-gray-400 font-medium max-w-xl mx-auto">
            Experience the pulse of the arena with real-time tracking, equipment analytics, and visual zone monitoring.
          </p>
        </motion.div>

        <div className="flex justify-center mb-12">
          <div className="p-1.5 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 flex gap-2">
            {[
              { key: "liveVacancy", label: "Live Stats", icon: <Users size={16} /> },
              { key: "timeTable", label: "Schedule", icon: <Calendar size={16} /> },
              { key: "dataAnalysis", label: "Analytics", icon: <BarChart3 size={16} /> },
            ].map((tabObj) => (
              <button
                key={tabObj.key}
                onClick={() => setActiveTab(tabObj.key)}
                className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all duration-500 ${activeTab === tabObj.key
                  ? "bg-primary text-white shadow-xl shadow-primary/20 scale-105"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
              >
                {tabObj.icon}
                {tabObj.label}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + selectedSport}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
          >
            <SportSelector
              value={selectedSport}
              onChange={(val: string) => setSelectedSport(val)}
            />

            {activeTab === "liveVacancy" && (
              <>
                <div className="flex flex-wrap gap-8 justify-center items-start">
                  <OccupancyCard info={sportInfo} />
                  <CourtVisualization info={sportInfo} />
                </div>
                <OccupancyLocation info={sportInfo} />
              </>
            )}

            {activeTab === "timeTable" && <TimeTable sport={selectedSport} />}
            {activeTab === "dataAnalysis" && <DataAnalysis sport={selectedSport} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
