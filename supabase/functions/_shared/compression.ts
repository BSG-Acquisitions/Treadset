/**
 * Response Compression Utilities
 * Compresses JSON payloads > 10 KB for faster transmission
 */

const COMPRESSION_THRESHOLD = 10 * 1024; // 10 KB

/**
 * Compress response if payload is large
 */
export async function compressResponse(
  data: any,
  headers: HeadersInit
): Promise<{ body: string | Uint8Array; headers: HeadersInit }> {
  const jsonString = JSON.stringify(data);
  const byteSize = new TextEncoder().encode(jsonString).length;

  // No compression needed for small payloads
  if (byteSize < COMPRESSION_THRESHOLD) {
    return {
      body: jsonString,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'X-Uncompressed-Size': byteSize.toString(),
      },
    };
  }

  try {
    // Compress using gzip
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(jsonString));
        controller.close();
      },
    }).pipeThrough(new CompressionStream('gzip'));

    const compressed = await new Response(stream).arrayBuffer();
    const compressedSize = compressed.byteLength;
    const ratio = ((1 - compressedSize / byteSize) * 100).toFixed(1);

    return {
      body: new Uint8Array(compressed),
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip',
        'X-Uncompressed-Size': byteSize.toString(),
        'X-Compressed-Size': compressedSize.toString(),
        'X-Compression-Ratio': `${ratio}%`,
      },
    };
  } catch (error) {
    console.warn('Compression failed, returning uncompressed:', error);
    return {
      body: jsonString,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
    };
  }
}

/**
 * Create optimized JSON response with optional compression
 */
export async function createOptimizedResponse(
  data: any,
  status: number = 200,
  additionalHeaders: HeadersInit = {}
): Promise<Response> {
  const baseHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    ...additionalHeaders,
  };

  const { body, headers } = await compressResponse(data, baseHeaders);

  return new Response(body, {
    status,
    headers,
  });
}
