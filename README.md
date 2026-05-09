# Sistema de Gestão para Clínicas de Estética 💅

Um sistema moderno, rápido e elegante para gestão de clínicas de estética, integrado com Supabase e pronto para automação com IA.

## ✨ Funcionalidades

- **Dashboard Inteligente**: Métricas em tempo real de agendamentos, leads e conversão.
- **Agenda Multi-Profissional**: Calendários sincronizados por profissional ou sala.
- **Gestão de Leads/CRM**: Acompanhamento completo do funil de vendas.
- **Integração com WhatsApp**: Pronto para conectar com EvolutionAPI e n8n (via funções backend).
- **Design Premium**: Interface Responsiva, Dark Mode e animações suaves.

## 🚀 Como Implantar (Vercel)

1. **Suba o código para o seu GitHub.**
2. **Conecte o repositório na Vercel.**
3. **Configure as Variáveis de Ambiente** no painel da Vercel:
   - `VITE_SUPABASE_URL`: Sua URL do projeto Supabase.
   - `VITE_SUPABASE_ANON_KEY`: Sua chave anônima (public anon key).
4. **Deploy!** A Vercel cuidará do build automaticamente.

## 🛠️ Configuração Local

1. Clone o repositório.
2. Instale as dependências: `npm install`.
3. Copie o arquivo `.env.example` para `.env` e preencha suas chaves.
4. Execute em modo dev: `npm run dev`.
---

## 🏗️ Decisões de Arquitetura

### Frontend

**React + Vite**
- Vite oferece build ultrarrápido e Hot Module Replacement (HMR) instantâneo
- React permite componentização modular e reutilização de código
- TypeScript garante type safety e melhor experiência de desenvolvimento

**Gerenciamento de Estado**
- Context API para estado global da aplicação
- React Query para cache e sincronização com Supabase
- Estado local com hooks (useState, useReducer) para componentes isolados

**UI/UX**
- Design system consistente com paleta de cores violeta/roxo
- Interface responsiva (mobile-first)
- Dark mode nativo
- Animações suaves para melhor experiência do usuário

### Backend (Supabase)

**Supabase como BaaS (Backend as a Service)**
- PostgreSQL gerenciado com performance e escalabilidade
- Autenticação integrada (Row Level Security)
- Realtime subscriptions para atualizações em tempo real
- Storage para arquivos e imagens
- Edge Functions para lógica backend customizada

**Modelagem de Dados**
- Tabelas normalizadas: `leads`, `interacoes`, `follow_ups`, `users`
- Triggers automáticos para atualização de temperatura de leads baseada em score
- Índices otimizados para consultas frequentes
- Políticas RLS (Row Level Security) para segurança

**API RESTful**
- Auto-gerada pelo Supabase a partir do schema
- TypeScript types gerados automaticamente
- Autenticação via JWT

### Integração e Automação

**Arquitetura de Integração**
- n8n como orquestrador de automações
- Evolution API para integração com WhatsApp
- Claude API (Anthropic) para processamento de linguagem natural
- Webhooks para comunicação assíncrona entre sistemas

**Fluxo de Dados**
WhatsApp → Evolution API → n8n → Claude API → Supabase → Dashboard React

**Separação de Responsabilidades**
- Frontend: visualização e interação do usuário
- Supabase: persistência, autenticação e lógica de dados
- n8n: orquestração de automações e integrações
- APIs externas: WhatsApp, IA, agendamentos

### Deploy e Infraestrutura

**Vercel (Frontend)**
- Deploy automático via Git push
- CDN global para baixa latência
- Preview deployments para cada PR
- Variáveis de ambiente seguras

**Supabase (Backend)**
- Hosted PostgreSQL com backups automáticos
- Edge Functions rodando em Deno
- Conexão segura via HTTPS

**Monitoramento**
- Supabase Analytics para métricas de uso
- Logs de API em tempo real
- Alertas de erro via webhooks
## 📂 Estrutura de Integração (Caminho para IA)

Este sistema foi projetado para ser o "front-end" de uma operação automatizada:
- **EvolutionAPI + n8n**: As integrações de WhatsApp devem apontar para as tabelas `leads_estetica` e `agendamentos_estetica` no seu banco de dados Supabase.
- **IA**: O agente de IA pode consumir a API do Supabase para consultar horários disponíveis e criar agendamentos diretamente na tabela do sistema.

---
Desenvolvido com ❤️ para Clínicas de Alta Performance.
