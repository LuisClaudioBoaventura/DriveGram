import React from 'react';
import { ApiKeysManagerModal } from './ApiKeysManagerModal.js';

interface OmdbKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: (newKey: string) => void;
}

export const OmdbKeyModal: React.FC<OmdbKeyModalProps> = ({
  isOpen,
  onClose
}) => {
  return <ApiKeysManagerModal isOpen={isOpen} onClose={onClose} />;
};
export default OmdbKeyModal;
