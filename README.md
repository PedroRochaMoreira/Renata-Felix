# Renata Felix Store

Loja virtual em Next.js para a Renata Felix, com catálogo administrável, contas de clientes, estoque, pedidos, favoritos, cálculo de frete e checkout Mercado Pago.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Configuração de produção

Copie as chaves de `.env.example` para as variáveis de ambiente do projeto na Vercel. Nunca envie o arquivo `.env` ao GitHub.

| Variável                                           | Uso                                                                                                                               |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                    | Banco Neon. É incluída automaticamente ao conectar a integração Neon na Vercel.                                               |
| `ADMIN_EMAIL`                                     | E-mail da conta da proprietária; essa conta recebe acesso administrativo ao se cadastrar e é quem pode usar as rotas `/api/admin`. |
| `NEXT_PUBLIC_SITE_URL`                            | URL pública final, por exemplo`https://www.seudominio.com.br`.                                                                 |
| `BLOB_READ_WRITE_TOKEN`                           | Necessária para anexar fotos das peças em produção. Crie e conecte um Vercel Blob ao projeto.                                  |
| `MERCADO_PAGO_ACCESS_TOKEN`                       | Token privado da aplicação Mercado Pago.                                                                                        |
| `MERCADO_PAGO_WEBHOOK_SECRET`                     | Assinatura secreta do webhook Mercado Pago. Configure o destino como`https://seu-dominio.com/api/payments/mercadopago/webhook`. |
| `MELHOR_ENVIO_TOKEN`, `MELHOR_ENVIO_ORIGIN_CEP` | Credenciais para cálculo de frete.                                                                                               |
| `RESEND_API_KEY`, `EMAIL_FROM`                  | Confirmação de e-mail, recuperação de senha e avisos de pedidos. O domínio do remetente deve estar verificado no Resend.     |

Após o primeiro acesso à produção, as tabelas normalizadas são criadas automaticamente no Neon e os dados legados do armazenamento anterior são migrados uma única vez.

## Operação da loja

O painel administrativo em `/admin` foi retirado. A operação passa a ser feita
pelas rotas de API abaixo, que continuam protegidas por sessão de administrador
e servem de contrato para a interface que vier a substituí-lo.

| Rota                       | Métodos       | Uso                                                                |
| -------------------------- | ------------- | ------------------------------------------------------------------ |
| `/api/admin/products`      | POST, PATCH   | Publicar e editar peças. Envia `multipart/form-data` com as fotos. |
| `/api/admin/inventory`     | PATCH, DELETE | Ajustar estoque e retirar a peça da vitrine.                       |
| `/api/admin/featured`      | GET, PUT      | Ler e definir as até quatro peças em destaque na home.             |
| `/api/admin/gallery`       | GET           | Listar as fotos já enviadas e o estado do armazenamento.           |
| `/api/admin/orders`        | GET, PATCH    | Acompanhar pedidos e alterar o status.                             |
| `/api/admin/users`         | POST          | Conceder acesso administrativo a uma conta existente.              |

Regras que as rotas aplicam:

- Fotos em JPG, PNG ou WEBP de até 12 MB; cada peça aceita até 8 fotos.
- O estoque é por tamanho e cor. `PATCH /api/admin/inventory` com `size` e `color` ajusta uma combinação; sem esses campos, o valor informado é repartido entre a grade da peça.
- A exclusão retira a peça da vitrine e apaga do armazenamento as fotos que nenhuma outra peça usa.

## Validação

```bash
npx tsc --noEmit
npm run build
```
