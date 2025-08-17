export function GET() {
  return new Response('Test API route is working!', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}

export function POST() {
  return new Response('Test POST API route is working!', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
