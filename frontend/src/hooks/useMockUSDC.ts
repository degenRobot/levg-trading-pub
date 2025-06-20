import { useState, useCallback } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { useToast } from '@/hooks/use-toast';
import { contracts } from '@/contracts/contracts';
import { createContractHookPayable } from './useContractFactoryPayable';

// Create contract hook using the payable factory for sync transactions
const useMockUSDCContract = createContractHookPayable('MockUSDC');

export function useMockUSDC() {
  const { address } = useAccount();
  const { toast } = useToast();
  const mockUSDCContract = useMockUSDCContract();
  const [isRequestingTokens, setIsRequestingTokens] = useState(false);

  // Read balance
  const { data: balance = 0n, refetch: refetchBalance } = useReadContract({
    address: contracts.MockUSDC.address,
    abi: contracts.MockUSDC.abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 5000, // Refetch every 5 seconds
    }
  });

  // Request tokens from faucet
  const requestTokens = useCallback(async () => {
    if (!address) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to continue',
        variant: 'destructive',
      });
      return;
    }

    setIsRequestingTokens(true);
    try {
      await mockUSDCContract.write('faucet', []);

      toast({
        title: 'Success!',
        description: 'You received 1000 USDC',
      });

      // Refetch balance
      await refetchBalance();
    } catch (error) {
      console.error('Error requesting tokens:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to request tokens',
        variant: 'destructive',
      });
    } finally {
      setIsRequestingTokens(false);
    }
  }, [address, mockUSDCContract, toast, refetchBalance]);

  return {
    balance,
    requestTokens,
    isLoading: isRequestingTokens || mockUSDCContract.isLoading,
    refetchBalance,
  };
}