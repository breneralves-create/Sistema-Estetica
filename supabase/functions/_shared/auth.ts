import { supabaseAdmin } from './supabaseClient.ts'
import { buildResponse } from './cors.ts'

async function hashToken(token: string) {
  const msgUint8 = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function validateAuth(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { errorResponse: buildResponse(401, false, 'TOKEN_INVALIDO', 'Token ausente ou inválido') }
  }

  const token = authHeader.split(' ')[1]
  const tokenHash = await hashToken(token)

  const { data: apiToken, error: tokenError } = await supabaseAdmin
    .from('api_tokens')
    .select('*')
    .eq('token_hash', tokenHash)
    .single()

  if (tokenError || !apiToken) {
    return { errorResponse: buildResponse(401, false, 'TOKEN_INVALIDO', 'Token ausente ou inválido') }
  }

  if (apiToken.ativo === false) {
    return { errorResponse: buildResponse(401, false, 'TOKEN_DESABILITADO', 'Token desabilitado permanentemente') }
  }

  return { token: apiToken }
}

export async function validateAgenda(agenda_id: string) {
  if (!agenda_id) {
    return { errorResponse: buildResponse(403, false, 'AGENDA_NAO_ENCONTRADA', 'agenda_id inválido ou inativo') }
  }
  const { data: agenda, error: agendaError } = await supabaseAdmin
    .from('agendas')
    .select('*')
    .eq('id', agenda_id)
    .single()

  if (agendaError || !agenda || agenda.ativo === false) {
    return { errorResponse: buildResponse(403, false, 'AGENDA_NAO_ENCONTRADA', 'agenda_id inválido ou inativo') }
  }

  return { agenda }
}
