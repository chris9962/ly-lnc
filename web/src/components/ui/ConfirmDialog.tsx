"use client";

import { Button } from "./Button";
import { Dialog } from "./Dialog";

type Props = {
  open: boolean;
  question: string;
  confirmLabel: string;
  danger?: boolean;
  pending?: boolean;
  error?: string;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({ open, question, confirmLabel, danger, pending, error, onConfirm, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} title={question} closeOnOutside={!pending}>
      {error && (
        <p role="alert" className="mb-3 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button onClick={onClose} disabled={pending}>
          Huỷ
        </Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} disabled={pending}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
