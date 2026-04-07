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

## 📂 Estrutura de Integração (Caminho para IA)

Este sistema foi projetado para ser o "front-end" de uma operação automatizada:
- **EvolutionAPI + n8n**: As integrações de WhatsApp devem apontar para as tabelas `leads_estetica` e `agendamentos_estetica` no seu banco de dados Supabase.
- **IA**: O agente de IA pode consumir a API do Supabase para consultar horários disponíveis e criar agendamentos diretamente na tabela do sistema.

---
Desenvolvido com ❤️ para Clínicas de Alta Performance.
