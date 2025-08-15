import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';
import { chatModels } from '@/lib/ai/all-models';
import type { ModelId } from '@/lib/ai/model-id';

const COOKIE_MAX_AGE_DAYS = 365;
const SECONDS_PER_DAY = 60 * 60 * 24;

// Route for updating selected-model cookie because setting in an action causes a refresh
export async function POST(request: NextRequest) {
  try {
    const { model } = await request.json();

    if (!model || typeof model !== 'string') {
      return NextResponse.json(
        { error: 'Invalid model parameter' },
        { status: 400 },
      );
    }

    // Validate model ID against allowed chat models
    const allowed = new Set(chatModels.map((m) => m.id));
    if (!allowed.has(model as ModelId)) {
      return NextResponse.json({ error: 'Model not allowed' }, { status: 400 });
    }

    const cookieStore = await cookies();
    cookieStore.set('chat-model', model, {
      path: '/',
      maxAge: SECONDS_PER_DAY * COOKIE_MAX_AGE_DAYS, // 1 year
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to set cookie' },
      { status: 500 },
    );
  }
}
