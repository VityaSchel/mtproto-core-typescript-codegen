export const header = `// Type definitions for @mtproto/core 6.2
// Project: https://github.com/alik0211/mtproto-core
// Definitions by: Viktor Shchelochkov <https://github.com/VityaSchel>, Ali Gasymov <https://github.com/alik0211>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped`

export const disabledRules = `// Required for codegen
// tslint:disable:unified-signatures
// tslint:disable:max-line-length`

export const MTProtoClass = `export default class MTProto {
  constructor(options: {
    api_id: number,
    api_hash: string,
    test?: boolean,
    customLocalStorage?: MyAsyncLocalStorage,
    storageOptions?: {
      path: string;
    };
  });

  call(method: string, params?: object, options?: {
    dcId?: number,
    syncAuth?: boolean,
  }): Promise<object>;
%CALL_METHOD_SIGNATURES%

  setDefaultDc(dcId: number): Promise<string>;

  updates: {
    on(updateName: EventType, handler: EventHandler): void;
    off(updateName: EventType): void;
    removeAllListeners(): void;
  };

  crypto: {
    getSRPParams: typeof getSRPParams;
  };
}

`

export const namedImports = `export class MyAsyncLocalStorage {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string|null>;
}

export type EventType = 'updatesTooLong'
  | 'updateShortMessage'
  | 'updateShortChatMessage'
  | 'updateShort'
  | 'updatesCombined'
  | 'updates'
  | 'updateShortSentMessage';
export type EventHandler = (eventData: { [key: string]: any }) => any;

export function getSRPParams(params: {
  g: number,
  p: Uint8Array,
  salt1: Uint8Array,
  salt2: Uint8Array,
  gB: Uint8Array,
  password: string,
}): Promise<{
  A: Uint8Array,
  M1: Uint8Array;
}>;

`