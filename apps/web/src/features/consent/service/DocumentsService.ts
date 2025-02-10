// eslint-disable-next-line import/default
import axios from 'axios';
import termsOfServiceV1Url from '@/assets/docs/terms-of-service-v1.md?url';
import { LegalDocuments } from '../model/LegalDocuments';
import { LegalDocumentType } from '../model/LegalDocumentType';

const legalDocuments: LegalDocuments = {
  [LegalDocumentType.TERMS_OF_SERVICE]: {
    current: 'v1',
    versions: {
      v1: {
        docPath: termsOfServiceV1Url,
        validFrom: '2025-02-10',
      },
    },
  },
} as const;

const getDocumentByType = async (documentType: LegalDocumentType) => {
  const version = legalDocuments[documentType].current;
  const path = legalDocuments[documentType].versions[version].docPath;

  return await axios.get(path);
};

const getCurrentVersion = (documentType: LegalDocumentType) => {
  return legalDocuments[documentType].current;
};

export const DocumentsService = {
  getDocumentByType,
  getCurrentVersion,
};
