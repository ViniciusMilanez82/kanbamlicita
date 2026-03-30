export interface IaProvider {
  complete(system: string, user: string): Promise<string>;
  readonly modelName: string;
}
