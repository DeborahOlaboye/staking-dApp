import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { AlertCircle, AlertTriangle, Clock, DollarSign } from 'lucide-react';

const EmergencyWithdraw = ({ isConnected, handleEmergencyWithdraw, emergencyWithdrawPenalty, stakedBalance }) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const penaltyPercent = emergencyWithdrawPenalty ? Number(emergencyWithdrawPenalty) : 30;
  const stakedAmount = stakedBalance ? Number(stakedBalance) / 1e18 : 0;
  const penaltyAmount = (stakedAmount * penaltyPercent) / 100;
  const receivedAmount = stakedAmount - penaltyAmount;

  const handleConfirmWithdraw = async () => {
    setIsConfirming(true);
    try {
      await handleEmergencyWithdraw();
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <AlertTriangle className="h-5 w-5" />
            Emergency Withdrawal
          </CardTitle>
          <CardDescription className="text-orange-700">
            Withdraw your staked tokens immediately, bypassing the lock period
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2 p-3 bg-white rounded-lg border">
              <Clock className="h-4 w-4 text-blue-500" />
              <div>
                <div className="font-medium">Skip Lock Period</div>
                <div className="text-gray-600">Withdraw anytime</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white rounded-lg border">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <div>
                <div className="font-medium">{penaltyPercent}% Penalty</div>
                <div className="text-gray-600">Deducted from stake</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white rounded-lg border">
              <DollarSign className="h-4 w-4 text-green-500" />
              <div>
                <div className="font-medium">Instant Access</div>
                <div className="text-gray-600">No waiting required</div>
              </div>
            </div>
          </div>
          
          {stakedAmount > 0 && (
            <div className="bg-white p-4 rounded-lg border space-y-2">
              <h4 className="font-medium text-gray-900">Withdrawal Breakdown:</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Staked Amount:</span>
                  <span className="font-medium">{stakedAmount.toFixed(4)} tokens</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Penalty ({penaltyPercent}%):</span>
                  <span className="font-medium">-{penaltyAmount.toFixed(4)} tokens</span>
                </div>
                <div className="flex justify-between border-t pt-1 font-medium">
                  <span>You'll receive:</span>
                  <span className="text-green-600">{receivedAmount.toFixed(4)} tokens</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog>
        <DialogTrigger asChild>
          <Button 
            variant="destructive" 
            className="w-full flex items-center gap-2"
            disabled={!isConnected || stakedAmount === 0}
          >
            <AlertCircle className="h-4 w-4" /> 
            {!isConnected 
              ? 'Connect Wallet for Emergency Withdraw' 
              : stakedAmount === 0 
                ? 'No Staked Tokens to Withdraw'
                : 'Emergency Withdraw'
            }
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm Emergency Withdrawal
            </DialogTitle>
            <DialogDescription className="text-left space-y-2">
              <p>⚠️ <strong>Warning:</strong> This action cannot be undone!</p>
              <p>You are about to withdraw all your staked tokens with a <strong>{penaltyPercent}% penalty</strong>.</p>
              {stakedAmount > 0 && (
                <div className="bg-red-50 p-3 rounded border text-sm">
                  <div>Staked: <strong>{stakedAmount.toFixed(4)} tokens</strong></div>
                  <div>Penalty: <strong>{penaltyAmount.toFixed(4)} tokens</strong></div>
                  <div>You'll receive: <strong>{receivedAmount.toFixed(4)} tokens</strong></div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Button 
              onClick={handleConfirmWithdraw} 
              variant="destructive"
              className="w-full"
              disabled={isConfirming}
            >
              {isConfirming ? 'Processing...' : `Confirm Emergency Withdrawal`}
            </Button>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                Cancel
              </Button>
            </DialogTrigger>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmergencyWithdraw;
