import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/installer/qstash/validate
 *
 * Valida o token QStash contra a URL fornecida pelo usuário.
 * O usuário copia URL e token direto do console Upstash → sem detecção de região.
 * Usado no step 4 do wizard de instalação.
 */
export async function POST(req: NextRequest) {
  try {
    const { url, token } = await req.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token QStash é obrigatório' },
        { status: 400 }
      );
    }

    if (!url || typeof url !== 'string' || !url.startsWith('https://')) {
      return NextResponse.json(
        { error: 'URL QStash inválida. Copie a QSTASH_URL do console Upstash.' },
        { status: 400 }
      );
    }

    const baseUrl = url.replace(/\/$/, '');
    const res = await fetch(`${baseUrl}/v2/schedules`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    const body = await res.text().catch(() => '');

    if (res.ok) {
      return NextResponse.json({ valid: true, message: 'Token QStash válido' });
    }

    if (body.includes('not found in this region')) {
      return NextResponse.json(
        { error: 'Token não pertence a esta região. Verifique se copiou a URL e o token da mesma região (US-East-1).' },
        { status: 401 }
      );
    }

    if (res.status === 401 || res.status === 403) {
      return NextResponse.json(
        { error: 'Token QStash inválido. Verifique se copiou o token correto no painel do Upstash.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: `Erro ao validar token: ${body || res.statusText}` },
      { status: res.status }
    );

  } catch (error) {
    console.error('[installer/qstash/validate] Erro:', error);
    return NextResponse.json(
      { error: 'Erro interno ao validar token' },
      { status: 500 }
    );
  }
}
