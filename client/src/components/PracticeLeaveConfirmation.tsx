import React from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PracticeLeaveConfirmationProps = {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
};

export function PracticeLeaveConfirmation({ open, onStay, onLeave }: PracticeLeaveConfirmationProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onStay(); }}>
      <DialogContent className="ct-practice-leave-dialog max-w-md gap-0 p-0" showCloseButton={false}>
        <div className="ct-practice-leave-dialog-inner">
          <span className="ct-practice-leave-dialog-icon" aria-hidden="true"><AlertTriangle size={19} /></span>
          <DialogHeader className="ct-practice-leave-dialog-header">
            <DialogTitle className="ct-modal-title">Leave preparation?</DialogTitle>
            <DialogDescription className="ct-modal-copy">Your active company, role, selected sources, files, and brief are not saved. Leaving now will discard this preparation.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="ct-practice-leave-dialog-actions">
            <button className="ct-button ct-button--secondary" type="button" onClick={onStay} autoFocus>Stay here</button>
            <button className="ct-button ct-button--danger" type="button" onClick={onLeave}>Leave and discard</button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
