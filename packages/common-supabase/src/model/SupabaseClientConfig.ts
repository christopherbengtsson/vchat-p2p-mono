import { Maybe } from '@mono/common-dto';

export interface SupabaseClientConfig {
  url: Maybe<string>;
  key: Maybe<string>;
}
