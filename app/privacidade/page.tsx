import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDocument } from '../legal-document';

export const metadata: Metadata = {
  title: 'Política de privacidade',
  description: 'Saiba como a Renata Felix trata dados pessoais e respeita os seus direitos de privacidade.',
  alternates: { canonical: '/privacidade' },
  openGraph: { url: '/privacidade' },
};

export default function Privacidade() {
  return (
    <LegalDocument eyebrow="Privacidade e dados" title="Política de privacidade" updatedAt="24 de julho de 2026">
      <section>
        <h2 className="serif">1. Nosso compromisso</h2>
        <p>
          A Renata Felix Store trata seus dados pessoais com cuidado, transparência e apenas nas situações necessárias para oferecer a loja,
          processar pedidos e prestar atendimento. Esta política explica quais informações podem ser tratadas, por quais motivos e como você
          pode exercer seus direitos.
        </p>
      </section>
      <section>
        <h2 className="serif">2. Informações que podemos tratar</h2>
        <ul>
          <li>
            <strong>Cadastro e conta:</strong> nome, e-mail e dados necessários para autenticar e administrar sua conta.
          </li>
          <li>
            <strong>Pedido e entrega:</strong> itens escolhidos, endereço, CEP, telefone quando informado e informações necessárias para
            pagamento e envio.
          </li>
          <li>
            <strong>Atendimento e newsletter:</strong> informações enviadas por você em formulários de contato ou ao se inscrever na Carta
            Renata Felix.
          </li>
          <li>
            <strong>Dados técnicos essenciais:</strong> preferências da loja, itens da sacola e informações de sessão necessárias para o
            funcionamento e a segurança do site.
          </li>
        </ul>
      </section>
      <section>
        <h2 className="serif">3. Como usamos esses dados</h2>
        <p>
          Usamos dados para criar e administrar sua conta, processar pagamentos, viabilizar a entrega, responder mensagens, prevenir
          fraudes, cumprir obrigações legais e melhorar a experiência oferecida. Quando o uso depender de consentimento, ele poderá ser
          concedido ou revogado nas preferências de cookies.
        </p>
      </section>
      <section>
        <h2 className="serif">4. Compartilhamento necessário</h2>
        <p>
          Compartilhamos somente o necessário com parceiros que tornam a compra possível, como o Mercado Pago para pagamento e
          transportadoras ou plataformas de frete para entrega. Também poderemos compartilhar informações quando houver obrigação legal,
          requisição de autoridade competente ou para proteção de direitos e segurança.
        </p>
      </section>
      <section>
        <h2 className="serif">5. Cookies e preferências</h2>
        <p>
          Recursos essenciais ajudam a manter sua sessão, sacola e preferências. Tecnologias opcionais, quando utilizadas, serão
          apresentadas para sua escolha. Você pode rever essa decisão no rodapé, em “Preferências de cookies”.
        </p>
      </section>
      <section>
        <h2 className="serif">6. Seus direitos</h2>
        <p>
          Nos termos da Lei Geral de Proteção de Dados, você pode solicitar confirmação de tratamento, acesso, correção, anonimização,
          bloqueio, eliminação, portabilidade, informação sobre compartilhamentos e revogação de consentimento, observadas as hipóteses
          legais aplicáveis.
        </p>
        <p>
          Para exercer um direito ou tirar dúvidas, envie sua solicitação pela nossa <Link href="/contato">página de contato</Link>. Podemos
          pedir informações razoáveis para confirmar sua identidade e proteger seus dados.
        </p>
      </section>
      <section>
        <h2 className="serif">7. Segurança e retenção</h2>
        <p>
          Adotamos medidas técnicas e administrativas compatíveis com a operação da loja para proteger dados contra acessos não autorizados,
          perda, alteração e uso indevido. Guardamos as informações pelo tempo necessário para as finalidades descritas, para obrigações
          legais ou para defesa de direitos.
        </p>
      </section>
      <section>
        <h2 className="serif">8. Atualizações desta política</h2>
        <p>
          Esta política pode ser atualizada para refletir mudanças na operação ou na legislação. A versão vigente sempre estará disponível
          nesta página, com a data da última atualização.
        </p>
      </section>
    </LegalDocument>
  );
}
