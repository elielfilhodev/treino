import * as React from "react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur">
      <div
        className={cn(
          "w-full max-w-xl rounded-2xl border border-zinc-200 bg-white shadow-2xl",
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

