'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { RiseWebSocketManager } from '@/lib/websocket/RiseWebSocketManager';

interface WebSocketContextType {
  wsManager: RiseWebSocketManager | null;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({
  wsManager: null,
  isConnected: false,
});

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [wsManager, setWsManager] = useState<RiseWebSocketManager | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Create WebSocket manager instance
    const manager = new RiseWebSocketManager();
    
    // Set up connection listeners
    manager.on('connected', () => {
      console.log('WebSocket connected in context');
      setIsConnected(true);
    });
    
    manager.on('disconnected', () => {
      console.log('WebSocket disconnected in context');
      setIsConnected(false);
    });
    
    setWsManager(manager);
    
    // Cleanup on unmount
    return () => {
      manager.removeAllListeners();
      manager.disconnect();
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ wsManager, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}