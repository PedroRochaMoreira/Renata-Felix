import { siteUrl } from '../app/site';
import { findCatalogProduct } from './catalog';
import { sendBackInStockEmail } from './email';
import { markStockAlertsNotified, pendingStockAlerts } from './store';

/**
 * Avisa quem pediu para ser lembrado quando uma combinação voltar ao estoque.
 * Roda depois de uma reposição e nunca derruba a operação que a disparou: se o
 * envio falhar, a inscrição continua pendente e será tentada na próxima vez.
 */
export async function notifyBackInStock(productId: string) {
  try {
    const alerts = await pendingStockAlerts(productId);
    if (!alerts.length) return 0;

    const product = await findCatalogProduct(productId);
    if (!product) return 0;

    const url = `${siteUrl}/produto/${encodeURIComponent(productId)}`;
    const sent: string[] = [];
    for (const alert of alerts) {
      try {
        const result = await sendBackInStockEmail({
          to: alert.email,
          productName: product.name,
          size: alert.size,
          color: alert.color,
          url,
        });
        if (result.sent) sent.push(alert.id);
      } catch {
        console.error(`Não foi possível avisar ${alert.email} sobre ${productId}.`);
      }
    }
    await markStockAlertsNotified(sent);
    return sent.length;
  } catch {
    console.error(`Não foi possível processar os avisos de estoque de ${productId}.`);
    return 0;
  }
}
