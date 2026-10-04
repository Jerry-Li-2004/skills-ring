/** Keep product dialogs and the always-available tour controls in one focus loop. */
export function dialogFocusTargets(dialog: HTMLElement): HTMLElement[] {
  const selector = 'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]';
  const guide = dialog.closest('.tour-workspace')?.querySelector('.tour-guide');
  return [...dialog.querySelectorAll<HTMLElement>(selector), ...(guide?.querySelectorAll<HTMLElement>(selector) || [])]
    .filter(element => element.getClientRects().length > 0)
    .sort((a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
}
