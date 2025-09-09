import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { AlertCircle } from 'lucide-react';

const EmergencyWithdraw = ({ isConnected, handleEmergencyWithdraw }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="destructive" 
          className="w-full flex items-center gap-2"
          disabled={!isConnected}
        >
          <AlertCircle className="h-4 w-4" /> 
          {!isConnected ? 'Connect Wallet for Emergency Withdraw' : 'Emergency Withdraw'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Emergency Withdrawal</DialogTitle>
        </DialogHeader>
        <Button onClick={handleEmergencyWithdraw} className="w-full">
          Confirm
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default EmergencyWithdraw;
