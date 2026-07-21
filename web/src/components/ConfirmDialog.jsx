import { Modal } from './Modal.jsx';

export function ConfirmDialog({
  title = 'Confirmar ação',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button className="btn" onClick={onCancel}>{cancelLabel}</button>
          <button className={`btn btn-primary${danger ? ' btn-danger' : ''}`} onClick={onConfirm}>{confirmLabel}</button>
        </>
      }
    >
      <p className="text-secondary" style={{ fontSize: 13.5 }}>{message}</p>
    </Modal>
  );
}
