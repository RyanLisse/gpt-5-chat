// Streaming resume endpoint disabled (Responses API MVP is non-streaming)
export async function GET() {
  return new Response(null, { status: 204 });
}
