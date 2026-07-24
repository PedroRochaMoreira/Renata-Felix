import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDocument } from '../legal-document';

export const metadata: Metadata = {
  title: 'Termos de uso e venda',
  description: 'Condições de uso da loja online Renata Felix e regras aplicáveis às compras.',
  alternates: { canonical: '/termos' },
  openGraph: { url: '/termos' },
};

export default function Termos() {
  return <LegalDocument eyebrow="Compra com clareza" title="Termos de uso e venda" updatedAt="24 de julho de 2026">
    <section>
      <h2 className="serif">1. Aceitação</h2>
      <p>Ao navegar na loja, criar uma conta ou realizar um pedido, você concorda com estes termos e com nossa <Link href="/privacidade">Política de privacidade</Link>. Caso não concorde com alguma condição, não utilize os serviços da loja.</p>
    </section>
    <section>
      <h2 className="serif">2. Conta da cliente</h2>
      <p>Você é responsável pela veracidade das informações fornecidas e pela confidencialidade de suas credenciais. Avise-nos pela <Link href="/contato">página de contato</Link> caso perceba uso indevido da sua conta.</p>
    </section>
    <section>
      <h2 className="serif">3. Produtos e disponibilidade</h2>
      <p>As peças são apresentadas com descrições, preços, fotografias e disponibilidade informados no catálogo. Procuramos reproduzir cores e detalhes com fidelidade, mas a visualização pode variar conforme a tela. A inclusão de um item na sacola não garante sua reserva até a confirmação do pagamento.</p>
    </section>
    <section>
      <h2 className="serif">4. Preços e pagamento</h2>
      <p>Os preços são exibidos em reais e podem ser atualizados antes da finalização de uma compra. O pagamento é processado no ambiente do Mercado Pago, sujeito às regras e validações daquele serviço. Um pedido só é confirmado após a aprovação do pagamento e das verificações necessárias.</p>
    </section>
    <section>
      <h2 className="serif">5. Entrega, trocas e devoluções</h2>
      <p>Prazo, valor e modalidade de entrega são apresentados no checkout conforme o CEP e a opção selecionada. As condições para troca, devolução e direito de arrependimento estão detalhadas na página de <Link href="/trocas">trocas e devoluções</Link>.</p>
    </section>
    <section>
      <h2 className="serif">6. Conteúdo e propriedade intelectual</h2>
      <p>Textos, fotografias, identidade visual, logotipos e demais elementos da Renata Felix são protegidos por legislação aplicável. Não é permitido reproduzir, distribuir ou utilizar esse conteúdo sem autorização prévia por escrito.</p>
    </section>
    <section>
      <h2 className="serif">7. Alterações e contato</h2>
      <p>Podemos atualizar estes termos para refletir mudanças na operação, nos serviços ou na legislação. Em caso de dúvida sobre um pedido ou estes termos, fale com a nossa equipe pela <Link href="/contato">página de contato</Link>.</p>
    </section>
  </LegalDocument>;
}
