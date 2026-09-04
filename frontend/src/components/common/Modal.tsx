import { X } from 'lucide-react'

interface ModalProps { title: string; onClose: () => void; children: React.ReactNode }
export function Modal({ title, onClose, children }: ModalProps) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header><h2 id="modal-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={19} /></button></header>{children}</section></div>
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label> }
export function FormActions({ onClose, label = 'Save changes' }: { onClose: () => void; label?: string }) { return <div className="form-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button">{label}</button></div> }
