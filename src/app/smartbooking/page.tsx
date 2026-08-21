'use client'
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from "@/contexts/AuthContext";

interface Slot {
  id: number;
  courtName: string;
  slotTime: string;
  imageUrl: string;
}

function App() {
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [showAvailability, setShowAvailability] = useState(false);

  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = "./";
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const sports = [
    'Tennis', 'Basketball', 'Volleyball', 'Cricket',
    'Table Tennis', 'Lawn Tennis', 'Badminton'
  ];

  const searchAvailability = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const sport = formData.get('sport');
    const date = formData.get('date');
    const timeFrom = formData.get('timeFrom');
    const timeTo = formData.get('timeTo');

    if (!sport || !date || !timeFrom || !timeTo) {
      alert('Please fill out all fields to check availability.');
      return;
    }

    const sampleSlots: Slot[] = Array.from({ length: 6 }, (_, i) => ({
      id: i + 1,
      courtName: `${sport as string} Court #${i + 1}`,
      slotTime: `${timeFrom as string} to ${timeTo as string}`,
      imageUrl: ''
    }));

    setAvailableSlots(sampleSlots);
    setShowAvailability(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[50%] h-[50%] bg-secondary/5 rounded-full blur-[120px]" />
      </div>

      <main className="container mx-auto px-4 py-8 relative z-10 pt-[8rem]">
        <section className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gradient-premium">Smart Booking System</h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Instant reservations for all your favorite sports. Select your time, check availability, and play.
          </p>
        </section>

        <section className="max-w-2xl mx-auto mb-16">
          <div className="glass-panel p-8 rounded-2xl shadow-xl">
            <h2 className="text-2xl font-bold text-foreground text-center mb-8">Check Availability</h2>
            <form onSubmit={searchAvailability} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Choose Sport</label>
                <div className="relative">
                  <select name="sport" className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-foreground appearance-none focus:ring-2 focus:ring-primary focus:outline-none transition-all">
                    <option value="" className="bg-zinc-900 text-gray-400">Select Sport</option>
                    {sports.map(sport => (
                      <option key={sport} value={sport} className="bg-zinc-900">{sport}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Select Date</label>
                <input type="date" name="date" className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all [color-scheme:dark]" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Select Time Slot</label>
                <div className="flex items-center gap-4">
                  <input type="time" name="timeFrom" className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all [color-scheme:dark]" />
                  <span className="text-gray-400 font-medium">to</span>
                  <input type="time" name="timeTo" className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all [color-scheme:dark]" />
                </div>
              </div>

              <button type="submit" className="w-full cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground py-4 rounded-xl font-bold text-lg shadow-[0_0_20px_-5px_var(--color-primary)] transform hover:scale-[1.01] transition-all duration-300">
                Check Availability
              </button>
            </form>
          </div>
        </section>

        {showAvailability && (
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-foreground text-center mb-8">Available Slots</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {availableSlots.map((slot: Slot) => (
                <div key={slot.id} className="glass-card rounded-2xl overflow-hidden shadow-lg group hover:border-primary/50">
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={slot.imageUrl}
                      alt={slot.courtName}
                      width={500}
                      height={300}
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <h3 className="absolute bottom-4 left-4 text-xl font-bold text-white shadow-sm">{slot.courtName}</h3>
                  </div>
                  <div className="p-6">
                    <p className="text-gray-400 mb-6 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      Available: <span className="text-foreground font-medium">{slot.slotTime}</span>
                    </p>
                    <button className="w-full bg-white/10 hover:bg-primary hover:text-white text-foreground border border-white/10 py-3 rounded-xl font-bold transition-all duration-300">
                      Book Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
