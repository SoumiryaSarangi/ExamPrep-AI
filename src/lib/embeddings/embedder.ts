'use client'

let extractor: any = null

export async function getEmbedder() {
  if (!extractor) {
    const { pipeline, env } = await import('@huggingface/transformers')
    // Disable local model loading to avoid Node 'fs' module errors in the browser
    env.allowLocalModels = false
    // Use quantized model to drastically reduce memory usage and prevent OOM crashes
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      dtype: 'q8',
    })
  }
  return extractor
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const ext = await getEmbedder()
  const output = await ext(texts, { pooling: 'mean', normalize: true })
  return output.tolist()
}

export async function embedSingle(text: string): Promise<number[]> {
  const vectors = await embedTexts([text])
  return vectors[0]
}
