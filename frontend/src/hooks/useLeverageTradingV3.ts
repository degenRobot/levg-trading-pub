import { useState, useCallback, useEffect } from 'react';
import { useReadContract, useAccount, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits, type Address, parseAbi } from 'viem';
import { contracts } from '@/contracts/contracts';
import { useToast } from '@/hooks/use-toast';
import { createContractHookPayable } from './useContractFactoryPayable';
import { useWebSocket } from '@/providers/WebSocketProvider';
import { getFeedIdFromHash } from '@/lib/feedIdMapping';

// Create contract hooks using the payable factory for sync transactions
const useLeverageTradingContract = createContractHookPayable('LeverageTradingV3');
const useMockUSDCContract = createContractHookPayable('MockUSDC');

export interface Position {
  id: bigint;
  trader: Address;
  amount: bigint;
  entryPrice: bigint;
  leverage: bigint;
  isLong: boolean;
  openTimestamp: bigint;
  feedId: string;
  currentPnL?: bigint;
}

export interface OraclePrices {
  BTC: {
    price: number;
    timestamp: number;
  };
  ETH: {
    price: number;
    timestamp: number;
  };
}

export function useLeverageTradingV3() {
  const { address } = useAccount();
  const { toast } = useToast();
  const publicClient = usePublicClient();
  const leverageTradingContract = useLeverageTradingContract();
  const mockUSDCContract = useMockUSDCContract();
  const [isLoading, setIsLoading] = useState(false);
  
  // Local state for real-time updates
  const [realtimePositions, setRealtimePositions] = useState<Position[]>([]);
  const [realtimePrices, setRealtimePrices] = useState<OraclePrices | null>(null);
  
  // Get contract events from WebSocket provider
  const { contractEvents } = useWebSocket();

  // Read oracle prices (fallback for initial load)
  const { data: oraclePrices } = useReadContract({
    address: contracts.LeverageTradingV3.address,
    abi: contracts.LeverageTradingV3.abi,
    functionName: 'getOraclePrices',
    args: [['BTCUSD', 'ETHUSD']],
    query: {
      refetchInterval: false, // Disable polling, we'll use events
    }
  });

  // Read user positions (fallback for initial load)
  const { data: userPositionIds } = useReadContract({
    address: contracts.LeverageTradingV3.address,
    abi: contracts.LeverageTradingV3.abi,
    functionName: 'getUserPositions',
    args: address ? [address] : undefined,
    query: {
      refetchInterval: false, // Disable polling, we'll use events
      enabled: !!address,
    }
  });

  // Helper functions for position management
  const addPosition = useCallback((position: Position) => {
    setRealtimePositions(prev => {
      // Check if position already exists
      if (prev.some(p => p.id === position.id)) return prev;
      // Add new position at the beginning (most recent first)
      return [position, ...prev];
    });
  }, []);

  const removePosition = useCallback((positionId: bigint) => {
    setRealtimePositions(prev => prev.filter(pos => pos.id !== positionId));
  }, []);

  // Process contract events for position updates
  useEffect(() => {
    if (!address) return;
    
    // Filter for LeverageTradingV3 events
    const leverageEvents = contractEvents.filter(
      event => event.address?.toLowerCase() === contracts.LeverageTradingV3.address.toLowerCase()
    );
    
    leverageEvents.forEach(event => {
      if (!event.eventName || !event.args) return;
      
      if (event.eventName === 'PositionOpened') {
        // Check if this position belongs to the current user
        const trader = event.args.trader as string;
        if (trader.toLowerCase() === address.toLowerCase()) {
          const newPosition: Position = {
            id: event.args.positionId as bigint,
            trader: trader as Address,
            amount: event.args.amount as bigint,
            entryPrice: event.args.entryPrice as bigint,
            leverage: event.args.leverage as bigint,
            isLong: event.args.isLong as boolean,
            openTimestamp: BigInt(Math.floor(Date.now() / 1000)),
            feedId: event.args.feedId as string,
            currentPnL: 0n
          };
          
          console.log('Adding user position:', newPosition);
          addPosition(newPosition);
        }
      } else if (event.eventName === 'PositionClosed') {
        // Remove position if it exists (we'll check inside the state update)
        const positionId = event.args.positionId as bigint;
        console.log('Position closed event for ID:', positionId);
        removePosition(positionId);
      } else if (event.eventName === 'PositionLiquidated') {
        // Remove position if it exists (we'll check inside the state update)
        const positionId = event.args.positionId as bigint;
        console.log('Position liquidated event for ID:', positionId);
        removePosition(positionId);
      }
    });
  }, [address, contractEvents, addPosition, removePosition]);

  // Process oracle price events
  useEffect(() => {
    // Process oracle price events
    const oracleEvents = contractEvents.filter(
      event => event.address?.toLowerCase() === contracts.PriceOracleV2.address.toLowerCase()
    );
    
    oracleEvents.forEach(event => {
      if (event.eventName === 'PriceUpdated' && event.args && event.topics && event.topics.length > 1) {
        const feedIdHash = event.topics[1];
        const feedId = getFeedIdFromHash(feedIdHash);
        
        if (feedId === 'BTCUSD' || feedId === 'ETHUSD') {
          setRealtimePrices(prev => {
            const updated = prev || {
              BTC: { price: 0, timestamp: 0 },
              ETH: { price: 0, timestamp: 0 }
            };

            if (feedId === 'BTCUSD') {
              updated.BTC = {
                price: Number(formatUnits(event.args.price as bigint, 18)),
                timestamp: Number(event.args.timestamp || Date.now() / 1000)
              };
            } else if (feedId === 'ETHUSD') {
              updated.ETH = {
                price: Number(formatUnits(event.args.price as bigint, 18)),
                timestamp: Number(event.args.timestamp || Date.now() / 1000)
              };
            }

            // Update PnL for all positions with new price
            setRealtimePositions(positions => 
              positions.map(pos => {
                const asset = pos.feedId === 'BTCUSD' ? 'BTC' : 'ETH';
                const currentPrice = asset === 'BTC' ? updated.BTC.price : updated.ETH.price;
                const entryPrice = Number(formatUnits(pos.entryPrice, 18));
                
                // Calculate PnL
                let priceChangePercent: number;
                if (pos.isLong) {
                  priceChangePercent = ((currentPrice - entryPrice) / entryPrice) * 100;
                } else {
                  priceChangePercent = ((entryPrice - currentPrice) / entryPrice) * 100;
                }
                
                const leverageNumber = Number(pos.leverage) / 10000; // Convert from contract format
                const leveragedChange = priceChangePercent * leverageNumber;
                const pnlAmount = (Number(formatUnits(pos.amount, 6)) * leveragedChange) / 100;
                
                return {
                  ...pos,
                  currentPnL: parseUnits(pnlAmount.toString(), 6)
                };
              })
            );

            return updated;
          });
        }
      }
    });
  }, [contractEvents]);

  // Load positions on mount and address change
  useEffect(() => {
    const loadPositions = async () => {
      if (!address || !userPositionIds || !publicClient) return;
      
      try {
        const positions: Position[] = [];
        
        for (const positionId of userPositionIds as bigint[]) {
          const position = await publicClient.readContract({
            address: contracts.LeverageTradingV3.address,
            abi: contracts.LeverageTradingV3.abi,
            functionName: 'positions',
            args: [positionId]
          }) as any;
          
          if (!position) continue;
          
          // Skip closed positions
          if (position[1] === 0n) continue;
          
          positions.push({
            id: positionId,
            trader: position[0],
            amount: position[1],
            entryPrice: position[2],
            leverage: position[3],
            isLong: position[4],
            openTimestamp: position[5],
            feedId: position[6],
            currentPnL: 0n
          });
        }
        
        // Set positions in reverse order (most recent first)
        setRealtimePositions(positions.reverse());
      } catch (error) {
        console.error('Failed to load positions:', error);
      }
    };

    loadPositions();
  }, [address, userPositionIds, publicClient]);

  // Initialize prices from contract data
  useEffect(() => {
    if (oraclePrices && !realtimePrices) {
      const pricesData = oraclePrices as [bigint[], bigint[]];
      setRealtimePrices({
        BTC: {
          price: Number(formatUnits(pricesData[0][0], 18)),
          timestamp: Number(pricesData[1][0])
        },
        ETH: {
          price: Number(formatUnits(pricesData[0][1], 18)),
          timestamp: Number(pricesData[1][1])
        }
      });
    }
  }, [oraclePrices, realtimePrices]);

  // Open position
  const openPosition = useCallback(async (
    amount: string,
    leverage: number,
    isLong: boolean,
    asset: 'BTC' | 'ETH'
  ) => {
    if (!address) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to continue',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const feedId = asset === 'BTC' ? 'BTCUSD' : 'ETHUSD';
      const amountBigInt = parseUnits(amount, 6); // USDC has 6 decimals

      // Check current allowance
      if (!publicClient) {
        throw new Error('Public client not available');
      }
      
      const allowance = await publicClient.readContract({
        address: contracts.MockUSDC.address,
        abi: parseAbi(['function allowance(address owner, address spender) view returns (uint256)']),
        functionName: 'allowance',
        args: [address, contracts.LeverageTradingV3.address]
      }) as bigint;

      console.log('Current allowance:', formatUnits(allowance, 6), 'USDC');
      console.log('Required amount:', formatUnits(amountBigInt, 6), 'USDC');

      // Only approve if allowance is insufficient
      if (allowance < amountBigInt) {
        // Approve a larger amount (10x the position size) for convenience
        const approvalAmount = amountBigInt * 10n;
        console.log('Approving:', formatUnits(approvalAmount, 6), 'USDC');
        
        const approvalResult = await mockUSDCContract.write('approve', [contracts.LeverageTradingV3.address, approvalAmount]);
        console.log('Approval result:', approvalResult);

        // Add a small delay to ensure the approval is processed
        await new Promise(resolve => setTimeout(resolve, 1000));

        toast({
          title: 'Approval successful',
          description: 'Opening position...',
        });
      }

      // Open position using the contract factory
      // Convert leverage to contract format (multiply by LEVERAGE_PRECISION = 10000)
      const leverageWithPrecision = leverage * 10000;
      
      console.log('Opening position with params:', {
        amount: formatUnits(amountBigInt, 6),
        leverage: leverage,
        leverageWithPrecision: leverageWithPrecision,
        isLong,
        feedId
      });
      
      const result = await leverageTradingContract.write('openPosition', [
        amountBigInt,
        leverageWithPrecision,
        isLong,
        feedId
      ]);

      console.log('Position opened result:', result);

      toast({
        title: 'Position opened!',
        description: `${isLong ? 'Long' : 'Short'} ${amount} USDC at ${leverage}x leverage`,
      });

      // Position will be added via event listener
    } catch (error) {
      console.error('Error opening position:', error);
      
      // Log detailed error information
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          cause: (error as any).cause,
          data: (error as any).data
        });
      }
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to open position',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [address, leverageTradingContract, mockUSDCContract, publicClient, toast]);

  // Close position
  const closePosition = useCallback(async (positionId: bigint) => {
    setIsLoading(true);
    try {
      await leverageTradingContract.write('closePosition', [positionId]);

      toast({
        title: 'Position closed!',
        description: 'Your position has been closed successfully',
      });

      // Position will be removed via event listener
    } catch (error) {
      console.error('Error closing position:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to close position',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [leverageTradingContract, toast]);

  return {
    openPosition,
    closePosition,
    userPositions: realtimePositions,
    oraclePrices: realtimePrices,
    isLoading: isLoading || leverageTradingContract.isLoading || mockUSDCContract.isLoading,
  };
}