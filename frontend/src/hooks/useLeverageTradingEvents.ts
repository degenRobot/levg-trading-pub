import { useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '@/providers/WebSocketProvider';
import { contracts } from '@/contracts/contracts';
import { formatUnits } from 'viem';
import { useToast } from '@/hooks/use-toast';
import { getFeedIdFromHash } from '@/lib/feedIdMapping';

export interface PositionOpenedEvent {
  positionId: bigint;
  trader: string;
  amount: bigint;
  entryPrice: bigint;
  leverage: number;
  isLong: boolean;
  feedId: string;
}

export interface PositionClosedEvent {
  positionId: bigint;
  trader: string;
  pnl: bigint;
  exitPrice: bigint;
}

export interface PositionLiquidatedEvent {
  positionId: bigint;
  trader: string;
  exitPrice: bigint;
}

export interface PriceUpdatedEvent {
  feedId: string;
  price: bigint;
  timestamp: bigint;
}

interface UseLeverageTradingEventsProps {
  onPositionOpened?: (event: PositionOpenedEvent) => void;
  onPositionClosed?: (event: PositionClosedEvent) => void;
  onPositionLiquidated?: (event: PositionLiquidatedEvent) => void;
  onPriceUpdated?: (event: PriceUpdatedEvent) => void;
}

export function useLeverageTradingEvents({
  onPositionOpened,
  onPositionClosed,
  onPositionLiquidated,
  onPriceUpdated
}: UseLeverageTradingEventsProps) {
  const { manager } = useWebSocket();
  const { toast } = useToast();
  const listenersRef = useRef<{ [key: string]: (event: any) => void }>({});

  const handlePositionOpened = useCallback((event: any) => {
    if (event.decoded && event.eventName === 'PositionOpened') {
      const { positionId, trader, amount, entryPrice, leverage, isLong, feedId } = event.args;
      
      const parsedEvent: PositionOpenedEvent = {
        positionId,
        trader,
        amount,
        entryPrice,
        leverage,
        isLong,
        feedId
      };

      console.log('Position opened event:', parsedEvent);
      onPositionOpened?.(parsedEvent);

      // Show toast notification
      toast({
        title: 'Position Opened',
        description: `${isLong ? 'Long' : 'Short'} position #${positionId} opened with ${leverage}x leverage`,
      });
    }
  }, [onPositionOpened, toast]);

  const handlePositionClosed = useCallback((event: any) => {
    if (event.decoded && event.eventName === 'PositionClosed') {
      const { positionId, trader, pnl, exitPrice } = event.args;
      
      const parsedEvent: PositionClosedEvent = {
        positionId,
        trader,
        pnl,
        exitPrice
      };

      console.log('Position closed event:', parsedEvent);
      onPositionClosed?.(parsedEvent);

      // Show toast notification with PnL
      const pnlAmount = Number(formatUnits(pnl, 6));
      const isProfit = pnl >= 0n;
      
      toast({
        title: 'Position Closed',
        description: `Position #${positionId} closed with ${isProfit ? 'profit' : 'loss'}: ${isProfit ? '+' : ''}${pnlAmount.toFixed(2)} USDC`,
        variant: isProfit ? 'default' : 'destructive',
      });
    }
  }, [onPositionClosed, toast]);

  const handlePositionLiquidated = useCallback((event: any) => {
    if (event.decoded && event.eventName === 'PositionLiquidated') {
      const { positionId, trader, exitPrice } = event.args;
      
      const parsedEvent: PositionLiquidatedEvent = {
        positionId,
        trader,
        exitPrice
      };

      console.log('Position liquidated event:', parsedEvent);
      onPositionLiquidated?.(parsedEvent);

      // Show toast notification
      toast({
        title: 'Position Liquidated',
        description: `Position #${positionId} has been liquidated`,
        variant: 'destructive',
      });
    }
  }, [onPositionLiquidated, toast]);

  const handlePriceUpdated = useCallback((event: any) => {
    if (event.decoded && event.eventName === 'PriceUpdated') {
      const { price, timestamp } = event.args;
      
      // For indexed string parameters, we need to check the topics
      // The feedId is the second topic (first is event signature)
      let feedId: string | undefined;
      if (event.topics && event.topics.length > 1) {
        const feedIdHash = event.topics[1];
        feedId = getFeedIdFromHash(feedIdHash);
      }
      
      if (feedId) {
        const parsedEvent: PriceUpdatedEvent = {
          feedId,
          price,
          timestamp
        };

        console.log('Price updated event:', parsedEvent);
        onPriceUpdated?.(parsedEvent);
      }
    }
  }, [onPriceUpdated]);

  useEffect(() => {
    if (!manager) return;

    // Create event listeners
    const leverageTradingListener = (event: any) => {
      handlePositionOpened(event);
      handlePositionClosed(event);
      handlePositionLiquidated(event);
    };

    const priceOracleListener = (event: any) => {
      handlePriceUpdated(event);
    };

    // Store listeners in ref for cleanup
    listenersRef.current = {
      leverageTrading: leverageTradingListener,
      priceOracle: priceOracleListener
    };

    // Subscribe to contract events
    manager.on(`logs:${contracts.LeverageTradingV3.address}`, leverageTradingListener);
    // Subscribe to oracle events
    manager.on(`logs:${contracts.PriceOracleV2.address}`, priceOracleListener);

    console.log('Subscribed to leverage trading events');

    // Cleanup
    return () => {
      if (listenersRef.current.leverageTrading) {
        manager.removeListener(`logs:${contracts.LeverageTradingV3.address}`, listenersRef.current.leverageTrading);
      }
      if (listenersRef.current.priceOracle) {
        manager.removeListener(`logs:${contracts.PriceOracleV2.address}`, listenersRef.current.priceOracle);
      }
      console.log('Unsubscribed from leverage trading events');
    };
  }, [manager, handlePositionOpened, handlePositionClosed, handlePositionLiquidated, handlePriceUpdated]);

  return {
    // Can expose additional utilities here if needed
  };
}