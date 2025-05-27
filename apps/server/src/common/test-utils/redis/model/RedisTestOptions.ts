export interface RedisTestOptions {
  localConfig?: {
    maxMemory?: string;
    args?: string[];
  };
}
