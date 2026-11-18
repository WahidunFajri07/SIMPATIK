"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal-content">
          <div className="modal-heading">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>
                {description ?? "Atur data untuk melanjutkan pekerjaan Anda."}
              </Dialog.Description>
            </div>
            <Dialog.Close className="icon-btn" aria-label="Tutup dialog">
              <X size={20} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
