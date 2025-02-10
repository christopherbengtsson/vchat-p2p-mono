import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Maybe } from '@mono/common-dto';
import { LegalDocumentType } from '../model/LegalDocumentType';
import { DocumentsService } from '../service/DocumentsService';

interface In {
  documentType: LegalDocumentType;
}

interface Out {
  markdown: Maybe<string>;
  error: Maybe<Error>;
}

export const useGetDocument = ({ documentType }: In): Out => {
  const currentVersion = DocumentsService.getCurrentVersion(documentType);

  const { data, error } = useQuery({
    queryKey: [documentType, currentVersion],
    queryFn: () => DocumentsService.getDocumentByType(documentType),
  });

  useEffect(() => {
    if (error) {
      toast.error('Error fetching document');
    }
  }, [error]);

  return {
    markdown: data?.data,
    error,
  };
};
