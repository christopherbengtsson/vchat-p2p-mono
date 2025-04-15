import ReactMarkdown from 'react-markdown';
import { LegalDocumentType } from '../model/LegalDocumentType';
import { useGetDocument } from '../hooks/useGetDocument';

export function TermsOfServicePage() {
  const { markdown } = useGetDocument({
    documentType: LegalDocumentType.TERMS_OF_SERVICE,
  });

  return (
    <div className="prose dark:prose-invert p-8">
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  );
}
