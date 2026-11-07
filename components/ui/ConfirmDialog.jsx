"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { useSelector } from "react-redux";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/context/LanguageContext";

/**
 * In-app replacement for window.confirm().
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ message: t("users.confirmDelete"), danger: true }))) return;
 *
 * confirm({ title, message, confirmText, cancelText, danger }) resolves true on
 * the confirm button (or Enter, since it has focus), false on Cancel, Escape,
 * the close icon or a backdrop click. The function is stable across renders so
 * it is safe inside memoised react-table cells. One dialog at a time: opening a
 * new one resolves the previous one as false.
 */
const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const { t } = useTranslation();
  // The dialog is portalled to <body>, outside the layout's `.dark` wrapper.
  const isDark = useSelector((state) => state.layout?.darkMode);
  const [open, setOpen] = useState(false);
  // Kept after closing so the text doesn't vanish during the leave transition.
  const [options, setOptions] = useState({});
  const resolverRef = useRef(null);
  const confirmButtonRef = useRef(null);

  const settle = useCallback((value) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setOpen(false);
    if (resolve) resolve(value);
  }, []);

  const confirm = useCallback((opts = {}) => {
    const next = typeof opts === "string" ? { message: opts } : opts;
    if (resolverRef.current) resolverRef.current(false);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setOptions(next);
      setOpen(true);
    });
  }, []);

  const { title, message, confirmText, cancelText, danger } = options;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        activeModal={open}
        onClose={() => settle(false)}
        centered
        className="max-w-md"
        rootClassName={isDark ? "dark" : ""}
        initialFocus={confirmButtonRef}
        title={title || t("common.confirmTitle")}
        footerContent={
          <>
            <Button
              text={cancelText || t("common.cancel")}
              className="btn-outline-dark"
              onClick={() => settle(false)}
            />
            <button
              ref={confirmButtonRef}
              type="button"
              // Button doesn't forward refs; same classes so it looks the same.
              className={`btn inline-flex justify-center ${danger ? "btn-danger" : "btn-dark"}`}
              onClick={() => settle(true)}
            >
              {confirmText || t("common.confirm")}
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">{message}</p>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return confirm;
}
