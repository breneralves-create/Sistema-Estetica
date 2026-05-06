-- ==========================================
-- SCRIPT DE RECUPERAÇÃO DO BANCO DE DADOS
-- ==========================================
-- ATENÇÃO: Os comandos DROP abaixo irão apagar TODAS as tabelas, tipos e funções para recriar o banco do zero.
-- O intuito é garantir que nenhuma "sujeira" das alterações de hoje permaneça.

-- ==========================
-- PASSO -1 : TEARDOWN (DROPS)
-- ==========================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

DROP TRIGGER IF EXISTS on_agenda_created ON agendas;
DROP FUNCTION IF EXISTS criar_agenda_hours() CASCADE;

DROP TRIGGER IF EXISTS on_lead_status_changed ON leads_estetica;
DROP FUNCTION IF EXISTS converter_lead_em_cliente() CASCADE;

DROP TRIGGER IF EXISTS on_api_token_update ON api_tokens;
DROP FUNCTION IF EXISTS prevent_token_reativation() CASCADE;

DROP TABLE IF EXISTS api_tokens CASCADE;
DROP TABLE IF EXISTS agendamentos_estetica CASCADE;
DROP TABLE IF EXISTS clientes_estetica CASCADE;
DROP TABLE IF EXISTS leads_estetica CASCADE;
DROP TABLE IF EXISTS agenda_hours CASCADE;
DROP TABLE IF EXISTS agendas CASCADE;
DROP TABLE IF EXISTS clinic_hours CASCADE;
DROP TABLE IF EXISTS clinic_config CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS lead_status CASCADE;
DROP TYPE IF EXISTS agendamento_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS dia_semana CASCADE;


-- ==========================
-- PASSO 0 — TIMEZONE
-- ==========================
ALTER DATABASE postgres SET timezone TO 'America/Sao_Paulo';
SHOW timezone;

-- ==========================
-- PASSO 1 — ENUMs
-- ==========================
CREATE TYPE lead_status AS ENUM (
  'iniciou_atendimento',
  'conversando',
  'agendado',
  'compareceu',
  'cancelou_agendamento',
  'follow_up',
  'abandonou_conversa'
);

CREATE TYPE agendamento_status AS ENUM (
  'agendado',
  'confirmado',
  'compareceu',
  'faltou',
  'cancelado'
);

CREATE TYPE user_role AS ENUM (
  'admin',
  'user'
);

CREATE TYPE dia_semana AS ENUM (
  'domingo', 'segunda', 'terca', 'quarta',
  'quinta', 'sexta', 'sabado'
);

-- ==========================
-- PASSO 2 — TABELAS
-- ==========================

-- Tabela: users
CREATE TABLE users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: clinic_config
CREATE TABLE clinic_config (
  id         INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  nome       TEXT NOT NULL,
  logo_url   TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: clinic_hours
CREATE TABLE clinic_hours (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dia         dia_semana NOT NULL UNIQUE,
  aberto      BOOLEAN NOT NULL DEFAULT false,
  hora_inicio TIME,
  hora_fim    TIME,
  CONSTRAINT check_horas CHECK (
    (aberto = false) OR (hora_inicio IS NOT NULL AND hora_fim IS NOT NULL)
  )
);

-- Tabela: agendas
CREATE TABLE agendas (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL,
  cor        TEXT NOT NULL DEFAULT '#C47E7E',
  ativo      BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: agenda_hours
CREATE TABLE agenda_hours (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agenda_id   UUID NOT NULL REFERENCES agendas(id) ON DELETE CASCADE,
  dia         dia_semana NOT NULL,
  aberto      BOOLEAN NOT NULL DEFAULT false,
  hora_inicio TIME,
  hora_fim    TIME,
  UNIQUE (agenda_id, dia),
  CONSTRAINT check_horas_agenda CHECK (
    (aberto = false) OR (hora_inicio IS NOT NULL AND hora_fim IS NOT NULL)
  )
);

-- Tabela: leads_estetica
CREATE TABLE leads_estetica (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_lead           TEXT NOT NULL,
  inicio_atendimento      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  nome_lead               TEXT,
  motivo_contato          TEXT,
  procedimento_interesse  TEXT,
  resumo_conversa         TEXT,
  status                  lead_status NOT NULL DEFAULT 'iniciou_atendimento',
  ultima_mensagem         TIMESTAMPTZ,
  minutos_ultima_mensagem NUMERIC GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (NOW() - ultima_mensagem)) / 60
  ) STORED,
  id_conta_chatwoot       TEXT,
  id_conversa_chatwoot    TEXT,
  id_lead_chatwoot        TEXT,
  inbox_id_chatwoot       TEXT,
  follow_up_1             TIMESTAMPTZ,
  follow_up_2             TIMESTAMPTZ,
  follow_up_3             TIMESTAMPTZ,
  data_agendamento        TIMESTAMPTZ,
  agendamento_criado_em   TIMESTAMPTZ,
  id_agendamento          TEXT,
  observacoes             TEXT,
  data_nascimento         DATE,
  genero                  TEXT,
  valor_pago              NUMERIC(10,2)
);

-- Tabela: clientes_estetica
CREATE TABLE clientes_estetica (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id              UUID NOT NULL UNIQUE REFERENCES leads_estetica(id) ON DELETE CASCADE,
  data_primeira_visita DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: agendamentos_estetica
CREATE TABLE agendamentos_estetica (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agenda_id         UUID NOT NULL REFERENCES agendas(id) ON DELETE CASCADE,
  lead_id           UUID REFERENCES leads_estetica(id) ON DELETE CASCADE,
  cliente_id        UUID REFERENCES clientes_estetica(id) ON DELETE CASCADE,
  procedimento_nome TEXT,
  nome_lead         TEXT,
  whatsapp_lead     TEXT,
  data_hora_inicio  TIMESTAMPTZ NOT NULL,
  data_hora_fim     TIMESTAMPTZ GENERATED ALWAYS AS (
    data_hora_inicio + interval '60 minutes'
  ) STORED,
  status            agendamento_status NOT NULL DEFAULT 'agendado',
  observacoes       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_lead_ou_cliente CHECK (
    lead_id IS NOT NULL OR cliente_id IS NOT NULL
  )
);

-- Tabela: api_tokens
CREATE TABLE api_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label       TEXT NOT NULL,
  token_hash  TEXT NOT NULL UNIQUE,
  ativo       BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================
-- PASSO 3 — ÍNDICES
-- ==========================
CREATE INDEX idx_leads_whatsapp          ON leads_estetica(whatsapp_lead);
CREATE INDEX idx_leads_status            ON leads_estetica(status);
CREATE INDEX idx_clientes_lead_id        ON clientes_estetica(lead_id);
CREATE INDEX idx_agendamentos_agenda     ON agendamentos_estetica(agenda_id);
CREATE INDEX idx_agendamentos_data       ON agendamentos_estetica(data_hora_inicio);
CREATE INDEX idx_agendamentos_status     ON agendamentos_estetica(status);
CREATE INDEX idx_agenda_hours_agenda     ON agenda_hours(agenda_id);
CREATE INDEX idx_api_tokens_hash         ON api_tokens(token_hash);

-- ==========================
-- PASSO 4 — TRIGGERS
-- ==========================

-- Trigger 1: Criar usuário na tabela pública ao registrar no Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger 2: Criar 7 linhas em agenda_hours ao criar uma agenda
CREATE OR REPLACE FUNCTION criar_agenda_hours()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO agenda_hours (agenda_id, dia, aberto, hora_inicio, hora_fim) VALUES
    (NEW.id, 'domingo',  false, '08:00', '18:00'),
    (NEW.id, 'segunda',  true,  '08:00', '18:00'),
    (NEW.id, 'terca',    true,  '08:00', '18:00'),
    (NEW.id, 'quarta',   true,  '08:00', '18:00'),
    (NEW.id, 'quinta',   true,  '08:00', '18:00'),
    (NEW.id, 'sexta',    true,  '08:00', '18:00'),
    (NEW.id, 'sabado',   false, '08:00', '18:00');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_agenda_created
  AFTER INSERT ON agendas
  FOR EACH ROW EXECUTE FUNCTION criar_agenda_hours();

-- Trigger 3: Conversão bidirecional lead ↔ cliente
CREATE OR REPLACE FUNCTION converter_lead_em_cliente()
RETURNS TRIGGER AS $$
BEGIN
  -- PROMOÇÃO: status mudou PARA compareceu
  IF NEW.status = 'compareceu' AND OLD.status != 'compareceu' THEN
    INSERT INTO clientes_estetica (lead_id, data_primeira_visita)
    VALUES (NEW.id, CURRENT_DATE)
    ON CONFLICT (lead_id) DO NOTHING;
  END IF;

  -- REVERSÃO: status saiu DE compareceu para qualquer outro
  IF OLD.status = 'compareceu' AND NEW.status != 'compareceu' THEN
    DELETE FROM clientes_estetica WHERE lead_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_lead_status_changed
  AFTER UPDATE OF status ON leads_estetica
  FOR EACH ROW EXECUTE FUNCTION converter_lead_em_cliente();

-- Trigger 4: Impedir reabilitação de token desabilitado
CREATE OR REPLACE FUNCTION prevent_token_reativation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.ativo = false AND NEW.ativo = true THEN
    RAISE EXCEPTION 'TOKEN_PERMANENTEMENTE_DESABILITADO: Um token desabilitado não pode ser reabilitado.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_api_token_update
  BEFORE UPDATE ON api_tokens
  FOR EACH ROW EXECUTE FUNCTION prevent_token_reativation();

-- ==========================
-- PASSO 5 — ROW LEVEL SECURITY (RLS)
-- ==========================
ALTER TABLE users                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_config         ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_hours          ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_hours          ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads_estetica        ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes_estetica     ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos_estetica ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_tokens            ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticado_select" ON leads_estetica FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "autenticado_insert" ON leads_estetica FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "autenticado_update" ON leads_estetica FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "autenticado_delete" ON leads_estetica FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "autenticado_select" ON clientes_estetica FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "autenticado_insert" ON clientes_estetica FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "autenticado_update" ON clientes_estetica FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "autenticado_delete" ON clientes_estetica FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "autenticado_select" ON agendamentos_estetica FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "autenticado_insert" ON agendamentos_estetica FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "autenticado_update" ON agendamentos_estetica FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "autenticado_delete" ON agendamentos_estetica FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "autenticado_select" ON agendas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "autenticado_insert" ON agendas FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "autenticado_update" ON agendas FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "autenticado_select" ON agenda_hours FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "autenticado_insert" ON agenda_hours FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "autenticado_update" ON agenda_hours FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "somente_admin" ON clinic_config
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "somente_admin" ON clinic_hours
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "somente_admin" ON api_tokens
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- ==========================
-- PASSO 6 — DADOS INICIAIS
-- ==========================
INSERT INTO clinic_config (nome) VALUES ('Minha Clínica');

INSERT INTO clinic_hours (dia) VALUES
  ('domingo'), ('segunda'), ('terca'), ('quarta'),
  ('quinta'), ('sexta'), ('sabado');

INSERT INTO agendas (nome, cor) VALUES ('Agenda Principal', '#C47E7E');

-- O PASSO 7 (adicionar email e admin) você deve fazer manualmente ou usando a interface do supabase via auth!
