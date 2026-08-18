import { pipeline, RawImage } from '@huggingface/transformers'

const MODEL_ID = 'onnx-community/ormbg-ONNX'

let segmenterPromise = null

function getSegmenter(onProgress) {
  if (!segmenterPromise) {
    segmenterPromise = pipeline('background-removal', MODEL_ID, {
      device: 'wasm',
      dtype: 'q8',
      progress_callback: onProgress,
    })
  }
  return segmenterPromise
}

self.onmessage = async (e) => {
  let id
  try {
    id = e.data.id
    const { blob } = e.data
    const segmenter = await getSegmenter((info) => {
      self.postMessage({ id, type: 'progress', info })
    })
    const image = await RawImage.fromBlob(blob)
    const out = await segmenter(image)
    const single = Array.isArray(out) ? out[0] : out
    const resultBlob = await single.toBlob()
    self.postMessage({ id, type: 'done', blob: resultBlob })
  } catch (err) {
    self.postMessage({ id, type: 'error', message: err?.message || 'Unbekannter Fehler beim Verarbeiten.' })
  }
}
