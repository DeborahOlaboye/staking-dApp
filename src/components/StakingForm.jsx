import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { formatEther, parseEther } from 'viem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '../hooks/use-toast';

// Custom hook for form validation
const useFormValidation = (stakeAmount, tokenBalance, tokenAllowance) => {
  const [errors, setErrors] = useState({});
  const [isValid, setIsValid] = useState(false);

  const validateAmount = useCallback((amount) => {
    const newErrors = {};
    
    if (!amount || amount.trim() === '') {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      newErrors.amount = 'Please enter a valid positive number';
    } else {
      try {
        const amountBigInt = parseEther(amount);
        if (tokenBalance && amountBigInt > tokenBalance) {
          newErrors.amount = 'Insufficient balance';
        }
      } catch {
        newErrors.amount = 'Invalid amount format';
      }
    }
    
    return newErrors;
  }, [tokenBalance]);

  useEffect(() => {
    const newErrors = validateAmount(stakeAmount);
    setErrors(newErrors);
    setIsValid(Object.keys(newErrors).length === 0 && stakeAmount !== '');
  }, [stakeAmount, validateAmount]);

  return { errors, isValid, validateAmount };
};

// Custom hook for approval status
const useApprovalStatus = (stakeAmount, tokenAllowance) => {
  return useMemo(() => {
    if (!stakeAmount || !tokenAllowance) return { needed: true, sufficient: false };
    
    try {
      const stakeAmountBigInt = parseEther(stakeAmount);
      const needed = stakeAmountBigInt > tokenAllowance;
      const sufficient = tokenAllowance >= stakeAmountBigInt;
      return { needed, sufficient };
    } catch {
      return { needed: true, sufficient: false };
    }
  }, [stakeAmount, tokenAllowance]);
};

// Custom hook for balance checks
const useBalanceCheck = (stakeAmount, tokenBalance) => {
  return useMemo(() => {
    if (!stakeAmount || !tokenBalance) return { sufficient: true, percentage: 0 };
    
    try {
      const stakeAmountBigInt = parseEther(stakeAmount);
      const sufficient = stakeAmountBigInt <= tokenBalance;
      const percentage = tokenBalance > 0n 
        ? Number((stakeAmountBigInt * 100n) / tokenBalance) 
        : 0;
      
      return { sufficient, percentage };
    } catch {
      return { sufficient: false, percentage: 0 };
    }
  }, [stakeAmount, tokenBalance]);
};

const StakingForm = ({ 
  isConnected, 
  stakeAmount, 
  setStakeAmount, 
  handleApprove, 
  handleStake, 
  isStakingPending,
  tokenBalance,
  tokenAllowance
}) => {
  // State hooks for UI management
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [lastSuccessfulStake, setLastSuccessfulStake] = useState(null);
  const [buttonState, setButtonState] = useState('idle'); // 'idle', 'approving', 'staking'
  
  // Refs for DOM manipulation
  const inputRef = useRef(null);
  const formRef = useRef(null);
  
  // Custom hooks
  const { toast } = useToast();
  const { errors, isValid } = useFormValidation(stakeAmount, tokenBalance, tokenAllowance);
  const approvalStatus = useApprovalStatus(stakeAmount, tokenAllowance);
  const balanceCheck = useBalanceCheck(stakeAmount, tokenBalance);

  // Memoized calculations
  const formattedBalance = useMemo(() => {
    return tokenBalance ? parseFloat(formatEther(tokenBalance)).toFixed(4) : '0.0000';
  }, [tokenBalance]);

  const formattedAllowance = useMemo(() => {
    return tokenAllowance && tokenAllowance > 0n 
      ? parseFloat(formatEther(tokenAllowance)).toFixed(4) 
      : '0.0000';
  }, [tokenAllowance]);

  const maxStakeAmount = useMemo(() => {
    return tokenBalance ? formatEther(tokenBalance) : '0';
  }, [tokenBalance]);

  // Callback functions with useCallback for performance
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    // Allow only numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setStakeAmount(value);
    }
  }, [setStakeAmount]);

  const handleMaxClick = useCallback(() => {
    if (tokenBalance) {
      setStakeAmount(maxStakeAmount);
      inputRef.current?.focus();
    }
  }, [tokenBalance, maxStakeAmount, setStakeAmount]);

  const handleInputFocus = useCallback(() => {
    setIsInputFocused(true);
  }, []);

  const handleInputBlur = useCallback(() => {
    setIsInputFocused(false);
  }, []);

  const handleApproveClick = useCallback(async () => {
    if (!isValid || !balanceCheck.sufficient) {
      toast({ 
        title: 'Invalid Amount', 
        description: errors.amount || 'Please check your input',
        variant: 'destructive' 
      });
      return;
    }
    
    setButtonState('approving');
    try {
      await handleApprove();
      toast({ 
        title: 'Approval Initiated', 
        description: 'Please confirm the transaction in your wallet' 
      });
    } catch (error) {
      toast({ 
        title: 'Approval Failed', 
        description: error.message || 'Failed to approve tokens',
        variant: 'destructive' 
      });
    } finally {
      setButtonState('idle');
    }
  }, [isValid, balanceCheck.sufficient, errors.amount, handleApprove, toast]);

  const handleStakeClick = useCallback(async () => {
    if (!isValid || !balanceCheck.sufficient || approvalStatus.needed) {
      toast({ 
        title: 'Cannot Stake', 
        description: 'Please check amount and approval status',
        variant: 'destructive' 
      });
      return;
    }
    
    setButtonState('staking');
    try {
      await handleStake();
      setLastSuccessfulStake(stakeAmount);
      toast({ 
        title: 'Staking Initiated', 
        description: `Staking ${stakeAmount} tokens` 
      });
    } catch (error) {
      toast({ 
        title: 'Staking Failed', 
        description: error.message || 'Failed to stake tokens',
        variant: 'destructive' 
      });
    } finally {
      setButtonState('idle');
    }
  }, [isValid, balanceCheck.sufficient, approvalStatus.needed, handleStake, stakeAmount, toast]);

  // Effect for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'Enter' && isValid) {
        e.preventDefault();
        if (approvalStatus.needed) {
          handleApproveClick();
        } else {
          handleStakeClick();
        }
      }
    };

    if (isInputFocused) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isInputFocused, isValid, approvalStatus.needed, handleApproveClick, handleStakeClick]);

  // Effect for logging (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('StakingForm State:', {
        isConnected,
        isStakingPending,
        stakeAmount,
        tokenBalance: tokenBalance?.toString(),
        tokenAllowance: tokenAllowance?.toString(),
        isValid,
        approvalStatus,
        balanceCheck,
        buttonState
      });
    }
  }, [isConnected, isStakingPending, stakeAmount, tokenBalance, tokenAllowance, isValid, approvalStatus, balanceCheck, buttonState]);

  return (
    <Card ref={formRef}>
      <CardHeader>
        <CardTitle>Stake STK</CardTitle>
        <CardDescription>
          Enter amount to stake {lastSuccessfulStake && `(Last: ${lastSuccessfulStake})`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label htmlFor="stake">Amount</Label>
              {tokenBalance && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMaxClick}
                  className="h-auto p-1 text-xs"
                >
                  Max: {formattedBalance}
                </Button>
              )}
            </div>
            <div className="relative">
              <Input
                ref={inputRef}
                id="stake"
                type="text"
                placeholder="0.0"
                value={stakeAmount}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                className={`${errors.amount ? 'border-red-500' : ''} ${
                  isInputFocused ? 'ring-2 ring-blue-500' : ''
                }`}
              />
              {balanceCheck.percentage > 0 && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <span className="text-xs text-muted-foreground">
                    {balanceCheck.percentage.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
            
            {/* Balance and error display */}
            <div className="mt-2 space-y-1">
              {tokenBalance && (
                <p className="text-sm text-muted-foreground">
                  Balance: {formattedBalance} STK
                </p>
              )}
              {errors.amount && (
                <p className="text-sm text-red-500">
                  {errors.amount}
                </p>
              )}
              {!errors.amount && stakeAmount && balanceCheck.percentage > 50 && (
                <p className="text-sm text-yellow-600">
                  ⚠️ Staking {balanceCheck.percentage.toFixed(1)}% of your balance
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex space-x-2">
            {approvalStatus.needed ? (
              <Button
                onClick={handleApproveClick}
                className="w-full"
                disabled={!isConnected || !isValid || !balanceCheck.sufficient || buttonState === 'approving'}
              >
                {!isConnected 
                  ? 'Connect Wallet' 
                  : buttonState === 'approving' 
                    ? 'Approving...' 
                    : 'Approve STK'
                }
              </Button>
            ) : (
              <Button
                onClick={handleStakeClick}
                className="w-full"
                disabled={!isConnected || !isValid || !balanceCheck.sufficient || buttonState === 'staking'}
              >
                {!isConnected 
                  ? 'Connect Wallet' 
                  : buttonState === 'staking' 
                    ? 'Staking...' 
                    : 'Stake STK'
                }
              </Button>
            )}
          </div>

          {/* Approval status display */}
          {tokenAllowance && tokenAllowance > 0n && !approvalStatus.needed && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-sm text-green-700 flex items-center">
                <span className="mr-2">✓</span>
                Approved: {formattedAllowance} STK
              </p>
            </div>
          )}

          {/* Keyboard shortcut hint */}
          {isInputFocused && isValid && (
            <p className="text-xs text-muted-foreground text-center">
              Press Ctrl+Enter to {approvalStatus.needed ? 'approve' : 'stake'}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StakingForm;
