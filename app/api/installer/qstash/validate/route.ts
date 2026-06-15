import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/installer/qstash/validate
 *
 * Valida o token do QStash fazendo uma request à API.
 * Usado no step 4 do wizard de instalação.
 */
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    // Validação básica
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token QStash é obrigatório' },
        { status: 400 }
      );
    }

    // Detecta a URL base do QStash a partir do JWT (campo iss)
    // Evita falha para instâncias fora da região us-east-1
    let qstashBaseUrl = 'https://qstash.upstash.io';
    try {
      const payloadB64 = token.split('.')[1];
      if (payloadB64) {
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
        if (payload.iss && typeof payload.iss === 'string') {
          qstashBaseUrl = payload.iss.replace(/\/$/, '');
        }
      }
    } catch {
      // JWT indecodificável: usa fallback genérico
    }

    const qstashRes = await fetch(`${qstashBaseUrl}/v2/schedules`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!qstashRes.ok) {
      if (qstashRes.status === 401 || qstashRes.status === 403) {
        return NextResponse.json(
          { error: 'Token QStash inválido. Verifique se criou o QStash na região US-East-1 no Upstash.' },
          { status: 401 }
        );
      }

      const errorText = await qstashRes.text().catch(() => '');
      return NextResponse.json(
        { error: `Erro ao validar token: ${errorText || qstashRes.statusText}` },
        { status: qstashRes.status }
      );
    }

    return NextResponse.json({
      valid: true,
      message: 'Token QStash válido',
    });

  } catch (error) {
    console.error('[installer/qstash/validate] Erro:', error);
    return NextResponse.json(
      { error: 'Erro interno ao validar token' },
      { status: 500 }
    );
  }
}
