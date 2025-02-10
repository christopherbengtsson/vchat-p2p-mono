// eslint-disable-next-line import/default
import ReactMarkdown from 'react-markdown';
import { LegalDocumentType } from '../model/LegalDocumentType';
import { useGetDocument } from '../hooks/useGetDocument';

export function TermsOfServicePage() {
  const { markdown } = useGetDocument({
    documentType: LegalDocumentType.TERMS_OF_SERVICE,
  });

  return (
    <div className="relative w-full h-dvh bg-white p-8 overflow-auto">
      <ReactMarkdown className="prose">{markdown}</ReactMarkdown>
    </div>
  );
}
