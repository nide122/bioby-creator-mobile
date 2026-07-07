import { useTranslation } from 'react-i18next';

import { LegalDocumentView } from '@/components/legal/LegalDocumentView';
import { getTermsDocument } from '@/src/legal';

export default function TermsScreen() {
  useTranslation();
  return <LegalDocumentView document={getTermsDocument()} />;
}
