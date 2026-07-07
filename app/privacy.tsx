import { useTranslation } from 'react-i18next';

import { LegalDocumentView } from '@/components/legal/LegalDocumentView';
import { getPrivacyDocument } from '@/src/legal';

export default function PrivacyScreen() {
  useTranslation();
  return <LegalDocumentView document={getPrivacyDocument()} />;
}
