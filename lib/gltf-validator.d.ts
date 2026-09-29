/**
 * Типы валидатора glTF от Khronos — у пакета своих нет. Описано только то,
 * чем пользуется lib/glb.test.ts.
 */
declare module "gltf-validator" {
  type Message = { code: string; message: string; severity: number; pointer?: string };

  export function validateBytes(
    data: Uint8Array,
    options?: { maxIssues?: number },
  ): Promise<{
    issues: { numErrors: number; numWarnings: number; numInfos: number; messages: Message[] };
  }>;
}
