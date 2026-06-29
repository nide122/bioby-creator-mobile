type MammothResult = { value: string };

type MammothModule = {
  convertToHtml: (input: { arrayBuffer: ArrayBuffer }) => Promise<MammothResult>;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require('mammoth') as MammothModule;

export async function convertDocxToHtml(arrayBuffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return result.value;
}
