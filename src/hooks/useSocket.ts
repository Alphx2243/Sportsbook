// done
import { useSocket as useSocketContext } from '@/contexts/SocketContext';
import { useEffect, useRef } from 'react';

export const useSocket = (
  pageRoom: string,
  sportName?: string,
  onUpdate?: (data: any) => void,
  eventType: string = 'availability_changed',
) => {
  const { socket, isConnected, subscribeRooms } = useSocketContext();
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!socket) return;

    const rooms = [`page:${pageRoom}`];
    if (sportName && sportName !== 'all') rooms.push(`sport:${sportName}`);
    const unsubscribe = subscribeRooms(rooms);
    const handleUpdate = (data: any) => onUpdateRef.current?.(data);

    socket.on(eventType, handleUpdate);

    return () => {
      socket.off(eventType, handleUpdate);
      unsubscribe();
    };
  }, [socket, pageRoom, sportName, eventType, subscribeRooms]);

  return { socket, isConnected };
};
