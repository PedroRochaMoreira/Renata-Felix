import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDocument } from '@/app/legal-document';

export const metadata: Metadata = {
  title: 'Trocas, devoluções e entregas',
  description: 'Informações sobre entrega, direito de arrependimento, trocas e devoluções na Renata Felix.',
  alternates: { canonical: '/trocas' },
  openGraph: { url: '/trocas' },
};

export default function Trocas() {
  return <LegalDocument eyebrow="Atendimento" title="Trocas, devoluções e entregas" updatedAt="24 de julho de 2026">
    <section id="entrega">
      <h2 className="serif">1. Entrega e acompanhamento</h2>
      <p>As opções de frete, valores e estimativas de prazo são calculados no checkout de acordo com o CEP e a modalidade escolhida. A contagem do prazo começa após a aprovação do pagamento. Quando houver código de rastreio, ele será disponibilizado conforme a transportadora responsável pelo envio.</p>
    </section>
    <section>
      <h2 className="serif">2. Direito de arrependimento</h2>
      <p>Nas compras realizadas fora do estabelecimento comercial, você pode desistir da compra em até 7 dias corridos contados do recebimento do produto, conforme o art. 49 do Código de Defesa do Consumidor. Para iniciar o atendimento, entre em contato dentro desse prazo pela nossa <Link href="/contato">página de contato</Link>, informando o número do pedido e a peça.</p>
    </section>
    <section>
      <h2 className="serif">3. Condições para devolução</h2>
      <p>Para análise, a peça deve ser enviada sem sinais de uso, lavagem, odor, ajustes ou danos, com etiquetas e acessórios originais. Produtos recebidos com defeito, avaria ou divergência devem ser comunicados assim que possível, com fotos que ajudem nossa equipe a avaliar o caso.</p>
    </section>
    <section>
      <h2 className="serif">4. Troca por tamanho ou modelo</h2>
      <p>Se desejar trocar uma peça, fale conosco para verificarmos a disponibilidade do item pretendido e orientarmos o envio. A aprovação de troca depende da análise da peça devolvida e da disponibilidade em estoque. Diferenças de preço, frete ou condições específicas serão informadas antes da conclusão.</p>
    </section>
    <section>
      <h2 className="serif">5. Reembolso</h2>
      <p>Depois que a devolução for recebida e aprovada, o reembolso será solicitado pelo mesmo meio de pagamento utilizado na compra, respeitando os prazos operacionais da instituição financeira ou do intermediador. Manteremos você informada sobre cada etapa.</p>
    </section>
    <section>
      <h2 className="serif">6. Como solicitar</h2>
      <p>Acesse a <Link href="/contato">página de contato</Link> e informe nome, e-mail usado no pedido, número do pedido e o motivo da solicitação. Nossa equipe retornará com as orientações aplicáveis.</p>
    </section>
  </LegalDocument>;
}
