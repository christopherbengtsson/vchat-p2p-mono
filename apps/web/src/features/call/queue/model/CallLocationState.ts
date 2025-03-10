import { Maybe } from '@mono/common-dto';

export interface CallLocation {
  state: Maybe<{
    findMatch: boolean;
    slow?: boolean;
  }>;
}
