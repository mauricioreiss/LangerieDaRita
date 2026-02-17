# Lingerie da Rita

E-commerce e sistema de gestao de vendas de lingerie, desenvolvido para uma amiga que vende lingerie de forma autonoma.

## Sobre

Uma PWA (Progressive Web App) completa que funciona como vitrine publica para clientes e painel administrativo para a vendedora. O objetivo e facilitar o dia a dia de quem vende lingerie: cadastrar produtos, registrar vendas, controlar parcelas e compartilhar o catalogo via WhatsApp.

## Funcionalidades

**Vitrine Publica (clientes)**
- Catalogo de produtos com busca e filtro por tamanho
- Carrinho de compras persistente
- Checkout com QR Code Pix e opcao de parcelamento
- Envio do pedido via WhatsApp

**Painel Admin (vendedora)**
- Dashboard com receita, despesas e lucro do mes
- Cadastro e reposicao de estoque com busca por codigo
- Registro de vendas com parcelamento customizavel
- Controle financeiro com despesas por categoria
- Relatorios de mais vendidos e sugestao de reposicao
- Alerta de estoque baixo
- Cobranca de parcelas via WhatsApp
- Arquivar/restaurar produtos (soft delete)

## Tech Stack

- **Frontend:** React 19 + TypeScript + Tailwind CSS v4
- **Build:** Vite 7
- **Backend:** Supabase (Auth + PostgreSQL + RLS)
- **State:** Zustand
- **Deploy:** Vercel
- **Pagamento:** Pix via QR Code (padrao EMV/BR Code)

## Como rodar

```bash
npm install
npm run dev
```

Crie um `.env` na raiz com:

```
VITE_SUPABASE_URL=sua_url
VITE_SUPABASE_ANON_KEY=sua_chave
```

## Banco de dados

O arquivo `supabase/RESET_AND_CREATE.sql` contem o schema completo. Basta colar no SQL Editor do Supabase para criar todas as tabelas, policies e funcoes.
