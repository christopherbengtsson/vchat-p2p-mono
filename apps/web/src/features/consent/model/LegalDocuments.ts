import { LegalDocumentType } from './LegalDocumentType';

interface DocumentVersion {
  docPath: string;
  validFrom: string;
}

type DocumentVersions = Record<string, DocumentVersion>;

interface LegalDocument {
  current: string;
  versions: DocumentVersions;
}

export interface LegalDocuments {
  [LegalDocumentType.TERMS_OF_SERVICE]: LegalDocument;
}
