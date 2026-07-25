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
| `ADMIN_EMAIL`                                     | E-mail da conta da proprietária; essa conta recebe acesso administrativo ao se cadastrar.                                        |
| `NEXT_PUBLIC_SITE_URL`                            | URL pública final, por exemplo`https://www.seudominio.com.br`.                                                                 |
| `BLOB_READ_WRITE_TOKEN`                           | Necessária para anexar fotos no painel administrativo em produção. Crie e conecte um Vercel Blob ao projeto.                   |
| `MERCADO_PAGO_ACCESS_TOKEN`                       | Token privado da aplicação Mercado Pago.                                                                                        |
| `MERCADO_PAGO_WEBHOOK_SECRET`                     | Assinatura secreta do webhook Mercado Pago. Configure o destino como`https://seu-dominio.com/api/payments/mercadopago/webhook`. |
| `MELHOR_ENVIO_TOKEN`, `MELHOR_ENVIO_ORIGIN_CEP` | Credenciais para cálculo de frete.                                                                                               |
| `RESEND_API_KEY`, `EMAIL_FROM`                  | Confirmação de e-mail, recuperação de senha e avisos de pedidos. O domínio do remetente deve estar verificado no Resend.     |

Após o primeiro acesso à produção, as tabelas normalizadas são criadas automaticamente no Neon e os dados legados do armazenamento anterior são migrados uma única vez.

## Operação da loja

- Painel: `/admin`
- Pedidos: `/admin/pedidos`
- Fotos: envie JPG, PNG ou WEBP de até 12 MB; cada produto permite até 8 fotos.
- Categorias e cores podem ser escolhidas da lista ou criadas por “Outro”. Novas categorias passam a aparecer na loja automaticamente.
- Estoque `0` deixa a peça esgotada; a lixeira retira a peça da vitrine.

## Validação

```bash
npx tsc --noEmit
npm run build
```
