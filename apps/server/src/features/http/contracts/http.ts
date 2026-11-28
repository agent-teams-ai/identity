export interface HttpHost {
  readonly listen: (options: { readonly host: string; readonly port: number }) => Promise<string>;
  readonly close: () => Promise<void>;
}
