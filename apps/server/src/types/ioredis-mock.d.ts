/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'ioredis-mock' {
  import { Redis } from 'ioredis';

  export default class RedisMock extends Redis {}
}
