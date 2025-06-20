'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLeverageTradingEvents } from '@/hooks/useLeverageTradingEvents';
import { formatUnits } from 'viem';

interface EventLog {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
}

export default function TestEventsPage() {
  const [events, setEvents] = useState<EventLog[]>([]);

  // Set up event listeners
  useLeverageTradingEvents({
    onPositionOpened: (event) => {
      setEvents(prev => [...prev, {
        id: `open-${event.positionId}-${Date.now()}`,
        type: 'PositionOpened',
        data: event,
        timestamp: new Date()
      }]);
    },
    onPositionClosed: (event) => {
      setEvents(prev => [...prev, {
        id: `close-${event.positionId}-${Date.now()}`,
        type: 'PositionClosed',
        data: event,
        timestamp: new Date()
      }]);
    },
    onPositionLiquidated: (event) => {
      setEvents(prev => [...prev, {
        id: `liq-${event.positionId}-${Date.now()}`,
        type: 'PositionLiquidated',
        data: event,
        timestamp: new Date()
      }]);
    },
    onPriceUpdated: (event) => {
      setEvents(prev => [...prev, {
        id: `price-${event.feedId}-${Date.now()}`,
        type: 'PriceUpdated',
        data: event,
        timestamp: new Date()
      }]);
    }
  });

  // Clear old events to prevent overflow
  useEffect(() => {
    if (events.length > 50) {
      setEvents(prev => prev.slice(-40));
    }
  }, [events.length]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Live Event Monitor</h1>
      
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Events ({events.length})</h2>
          <Badge variant={events.length > 0 ? "default" : "secondary"}>
            {events.length > 0 ? 'Live' : 'Waiting'}
          </Badge>
        </div>
        
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {events.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Waiting for events... Try opening/closing positions or updating oracle prices.
            </p>
          ) : (
            events.map((event) => (
              <Card key={event.id} className="p-3 text-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="outline" className="mb-1">
                      {event.type}
                    </Badge>
                    <div className="text-gray-600 dark:text-gray-400">
                      {event.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="text-right">
                    {event.type === 'PriceUpdated' && (
                      <>
                        <div>{event.data.feedId}</div>
                        <div className="font-mono">
                          ${Number(formatUnits(event.data.price, 18)).toFixed(2)}
                        </div>
                      </>
                    )}
                    {event.type === 'PositionOpened' && (
                      <>
                        <div>Position #{event.data.positionId.toString()}</div>
                        <div>
                          {event.data.isLong ? 'LONG' : 'SHORT'} {event.data.leverage}x
                        </div>
                        <div>{formatUnits(event.data.amount, 6)} USDC</div>
                      </>
                    )}
                    {event.type === 'PositionClosed' && (
                      <>
                        <div>Position #{event.data.positionId.toString()}</div>
                        <div className={Number(event.data.pnl) >= 0 ? 'text-green-600' : 'text-red-600'}>
                          PnL: {formatUnits(event.data.pnl, 6)} USDC
                        </div>
                      </>
                    )}
                    {event.type === 'PositionLiquidated' && (
                      <>
                        <div>Position #{event.data.positionId.toString()}</div>
                        <div className="text-red-600">Liquidated</div>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </Card>
      
      <div className="mt-8 text-sm text-gray-500">
        <p>💡 This page shows real-time events from the leverage trading contracts.</p>
        <p>Events are delivered via WebSocket using rise_subscribe method.</p>
      </div>
    </div>
  );
}