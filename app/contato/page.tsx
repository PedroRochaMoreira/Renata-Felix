'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ArrowUpRight, Clock3, Instagram, MapPin, MessageCircle, Phone, Send, ShieldCheck } from 'lucide-react';
import { Footer, Header } from '../components';

type FormStatus = { tone: 'success' | 'error'; text: string } | null;

const whatsappUrl = 'https://wa.me/5561994230194?text=Olá%2C%20gostaria%20de%20falar%20com%20a%20Renata%20Felix.';
const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=Renata+Felix+Store%2C+Rua+Jose+Alencar%2C+Qd+77%2C+Lt+12%2C+Luziania%2C+GO%2C+72804-030';

export default function Contato() {
  const [status, setStatus] = useState<FormStatus>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };

      if (!response.ok) throw new Error(body.error || 'Não foi possível enviar sua mensagem agora.');

      form.reset();
      setStatus({ tone: 'success', text: 'Mensagem enviada com carinho. Retornaremos em breve.' });
    } catch (error) {
      setStatus({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Não foi possível enviar sua mensagem. Tente novamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return <>
    <Header />
    <main className="contactPage contactExperience">
      <section className="contactHero" aria-labelledby="contact-title">
        <div className="contactHeroCopy">
          <span className="eyebrow">Atendimento Renata Felix</span>
          <h1 id="contact-title" className="serif">Fale conosco,<br /><em>com calma.</em></h1>
          <p>Queremos que cada escolha seja leve — antes, durante e depois da sua compra. Nossa equipe está por perto para orientar você.</p>
          <div className="contactHeroHours">
            <Clock3 size={17} aria-hidden="true" />
            <div><span>Horário de atendimento</span><strong>Segunda a sexta · 9h às 18h</strong></div>
          </div>
        </div>

        <aside className="contactHeroPanel" aria-label="Canais rápidos de atendimento">
          <span className="eyebrow">Atendimento próximo</span>
          <p className="serif">Prefere conversar agora?</p>
          <a className="contactHeroAction" href={whatsappUrl} target="_blank" rel="noreferrer">
            <MessageCircle size={19} aria-hidden="true" />
            <span><b>WhatsApp</b><small>Envie uma mensagem</small></span>
            <ArrowUpRight size={17} aria-hidden="true" />
          </a>
          <a className="contactHeroAction" href="tel:+5561994230194">
            <Phone size={18} aria-hidden="true" />
            <span><b>(61) 99423-0194</b><small>Ligue para a nossa equipe</small></span>
            <ArrowUpRight size={17} aria-hidden="true" />
          </a>
          <a className="contactHeroAction" href="https://www.instagram.com/renatafelixstore/" target="_blank" rel="noreferrer">
            <Instagram size={18} aria-hidden="true" />
            <span><b>@renatafelixstore</b><small>Acompanhe no Instagram</small></span>
            <ArrowUpRight size={17} aria-hidden="true" />
          </a>
        </aside>
      </section>

      <section className="contactConversation" aria-labelledby="contact-form-title">
        <div className="contactConversationIntro">
          <span className="eyebrow">Mensagem para a nossa equipe</span>
          <h2 id="contact-form-title" className="serif">Como podemos ajudar você?</h2>
          <p>Conte-nos o que precisa. Para assuntos sobre pedidos, inclua o número do pedido na mensagem para conseguirmos localizar tudo com mais agilidade.</p>

          <div className="contactReassurance">
            <ShieldCheck size={18} aria-hidden="true" />
            <p>Seus dados são usados apenas para responder ao seu atendimento.</p>
          </div>

          <div className="contactQuestions">
            <span className="eyebrow">Dúvidas frequentes</span>
            <details open>
              <summary>Preciso falar sobre uma troca ou devolução.</summary>
              <p>Envie a mensagem com o número do pedido ou consulte as orientações de <Link href="/trocas">trocas e devoluções</Link>.</p>
            </details>
            <details>
              <summary>Onde fica a loja física?</summary>
              <p>Estamos na R. José Alencar, Qd. 77 · Lt. 12, em Luziânia — GO. <Link href="/lojas">Veja o endereço e o mapa</Link>.</p>
            </details>
            <details>
              <summary>Quando posso falar com a equipe?</summary>
              <p>Nosso atendimento funciona de segunda a sexta, das 9h às 18h. Respondemos assim que possível dentro desse período.</p>
            </details>
          </div>
        </div>

        <form className="contactForm contactFormRefined" onSubmit={submit}>
          <div className="contactFormHeading">
            <span className="eyebrow">Escreva para nós</span>
            <p>Campos marcados são necessários para enviar sua mensagem.</p>
          </div>
          <div className="contactFormGrid">
            <label>Nome completo<input name="name" autoComplete="name" required aria-required="true" /></label>
            <label>E-mail<input name="email" type="email" autoComplete="email" required aria-required="true" /></label>
            <label className="contactFormWide">Assunto
              <select name="subject" defaultValue="" required aria-required="true">
                <option value="" disabled>Selecione um assunto</option>
                <option value="Dúvida sobre uma peça">Dúvida sobre uma peça</option>
                <option value="Pedido, pagamento ou entrega">Pedido, pagamento ou entrega</option>
                <option value="Troca ou devolução">Troca ou devolução</option>
                <option value="Atendimento na loja física">Atendimento na loja física</option>
                <option value="Outro assunto">Outro assunto</option>
              </select>
            </label>
            <label className="contactFormWide">Mensagem<textarea name="message" required aria-required="true" rows={7} placeholder="Conte-nos como podemos ajudar você." /></label>
          </div>
          <div className="contactFormFooter">
            <button className="button dark" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Enviando mensagem…' : <>Enviar mensagem <Send size={15} aria-hidden="true" /></>}</button>
            {status && <p className={`contactFormStatus ${status.tone}`} role="status" aria-live="polite">{status.text}</p>}
          </div>
        </form>
      </section>

      <section className="contactVisit" aria-labelledby="contact-visit-title">
        <div>
          <span className="eyebrow">Visite-nos</span>
          <h2 id="contact-visit-title" className="serif">Uma conversa também pode ser ao vivo.</h2>
        </div>
        <div className="contactVisitDetails">
          <MapPin size={20} aria-hidden="true" />
          <p>R. José Alencar, Qd. 77 · Lt. 12<br />Luziânia — GO · CEP 72804-030</p>
          <a className="textLink" href={mapsUrl} target="_blank" rel="noreferrer">Abrir no Google Maps <ArrowUpRight size={13} aria-hidden="true" /></a>
        </div>
      </section>
    </main>
    <Footer />
  </>;
}
