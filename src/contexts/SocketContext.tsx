// done
'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  subscribeRooms: (rooms: string[]) => () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  subscribeRooms: () => () => undefined,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const roomCountsRef = useRef(new Map<string, number>());
  const subscriberCountRef = useRef(0);

  useEffect(() => {
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3005', {
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      autoConnect: false,
      transports: ['websocket'],
      upgrade: false,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      roomCountsRef.current.forEach((_count, room) => {
        socketInstance.emit('join_room', room);
      });
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      setIsConnected(false);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      socketRef.current = null;
      roomCountsRef.current.clear();
      subscriberCountRef.current = 0;
    };
  }, []);

  const subscribeRooms = useCallback((rooms: string[]) => {
    const socketInstance = socketRef.current;
    if (!socketInstance) return () => undefined;

    const uniqueRooms = Array.from(new Set(rooms.map((room) => room.trim()).filter(Boolean)));
    subscriberCountRef.current += 1;

    uniqueRooms.forEach((room) => {
      const count = roomCountsRef.current.get(room) ?? 0;
      roomCountsRef.current.set(room, count + 1);
      if (count === 0 && socketInstance.connected) {
        socketInstance.emit('join_room', room);
      }
    });

    if (!socketInstance.connected) socketInstance.connect();

    return () => {
      uniqueRooms.forEach((room) => {
        const count = roomCountsRef.current.get(room) ?? 0;
        if (count <= 1) {
          roomCountsRef.current.delete(room);
          if (socketInstance.connected) socketInstance.emit('leave_room', room);
        } else {
          roomCountsRef.current.set(room, count - 1);
        }
      });

      subscriberCountRef.current = Math.max(0, subscriberCountRef.current - 1);
      if (subscriberCountRef.current === 0) {
        socketInstance.disconnect();
        setIsConnected(false);
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, subscribeRooms }}>
      {children}
    </SocketContext.Provider>
  );
};
