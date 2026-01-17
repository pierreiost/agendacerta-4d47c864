const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">Política de Privacidade</h1>
        
        <div className="prose prose-sm max-w-none text-muted-foreground space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Introdução</h2>
            <p>
              Esta Política de Privacidade descreve como coletamos, usamos e protegemos suas informações 
              pessoais quando você utiliza nossa aplicação de gestão de espaços e reservas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Informações Coletadas</h2>
            <p>Coletamos as seguintes informações:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Nome e informações de contato (e-mail, telefone)</li>
              <li>Dados de autenticação e credenciais de acesso</li>
              <li>Informações de reservas e agendamentos</li>
              <li>Dados de integração com Google Calendar (quando autorizado)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. Uso das Informações</h2>
            <p>Utilizamos suas informações para:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Fornecer e manter nossos serviços</li>
              <li>Gerenciar suas reservas e agendamentos</li>
              <li>Sincronizar eventos com seu Google Calendar (quando autorizado)</li>
              <li>Enviar notificações e lembretes de reservas</li>
              <li>Melhorar nossos serviços</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Integração com Google Calendar</h2>
            <p>
              Quando você conecta sua conta do Google Calendar, solicitamos acesso para:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Visualizar seus calendários</li>
              <li>Criar e gerenciar eventos relacionados às suas reservas</li>
            </ul>
            <p className="mt-2">
              Esses dados são usados exclusivamente para sincronizar suas reservas com seu calendário 
              pessoal. Não compartilhamos essas informações com terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Compartilhamento de Dados</h2>
            <p>
              Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros, 
              exceto quando necessário para fornecer nossos serviços ou quando exigido por lei.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Segurança</h2>
            <p>
              Implementamos medidas de segurança técnicas e organizacionais para proteger suas 
              informações contra acesso não autorizado, alteração, divulgação ou destruição.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Seus Direitos</h2>
            <p>Você tem o direito de:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Acessar suas informações pessoais</li>
              <li>Corrigir dados incorretos</li>
              <li>Solicitar a exclusão de seus dados</li>
              <li>Revogar consentimentos concedidos</li>
              <li>Desconectar integrações como Google Calendar</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Contato</h2>
            <p>
              Para questões sobre esta política ou sobre seus dados pessoais, entre em contato 
              conosco através das configurações da aplicação.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Alterações</h2>
            <p>
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre 
              quaisquer alterações significativas através da aplicação.
            </p>
          </section>

          <p className="text-sm text-muted-foreground mt-8 pt-4 border-t">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
