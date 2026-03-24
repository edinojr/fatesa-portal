import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap, BookOpen, Users, Clock, Mail, Phone, MapPin, ChevronRight, BookCheck, Award, Book, History, Shield, MessageCircle, Menu, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

const Landing = () => {
  const [showVilaLuzita, setShowVilaLuzita] = useState(false);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionUser(session.user);
    });
  }, []);

  return (
    <div className="landing-container">
      {/* Top Subjects Banner */}
      <div className="top-subjects-banner">
        <div className="banner-overlay"></div>
        <div className="subjects-scroll">
          <div className="subject-item"><span></span> Doutrina da Salvação</div>
          <div className="subject-item"><span></span> Atos dos Apóstolos</div>
          <div className="subject-item"><span></span> Cristologia</div>
          <div className="subject-item"><span></span> Epístolas aos Hebreus</div>
          {/* Repeating for smooth scroll */}
          <div className="subject-item"><span></span> Doutrina da Salvação</div>
          <div className="subject-item"><span></span> Atos dos Apóstolos</div>
          <div className="subject-item"><span></span> Cristologia</div>
          <div className="subject-item"><span></span> Epístolas aos Hebreus</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-content">
          <div className="logo-section">
            <GraduationCap size={40} color="var(--primary)" />
            <div className="logo-text">
              <h1>FATESA</h1>
              <p>Casa do Saber</p>
            </div>
          </div>
          <div className={`nav-links ${mobileMenuOpen ? 'active' : ''}`}>
            <a href="#home" onClick={() => setMobileMenuOpen(false)}>Home</a>
            <a href="#sobre" onClick={() => setMobileMenuOpen(false)}>A Fatesa</a>
            <a href="#metodologia" onClick={() => setMobileMenuOpen(false)}>Metodologia</a>
            <a href="#professores" onClick={() => setMobileMenuOpen(false)}>Patrono</a>
            <a href="#cursos" onClick={() => setMobileMenuOpen(false)}>Cursos</a>
            <a href="#contato" onClick={() => setMobileMenuOpen(false)}>Contato</a>
            <Link to="/login" className="btn btn-primary btn-sm" onClick={() => setMobileMenuOpen(false)}>
              {sessionUser ? "Meu Painel" : "Entrar"}
            </Link>
          </div>
          <button className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <XCircle size={32} /> : <Menu size={32} />}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="hero-section">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <span className="badge">Excelência desde 2006</span>
          <h1>Formação Teológica de Alto Nível</h1>
          <p className="slogan">
            Aprofunde seu conhecimento nas Escrituras com uma metodologia transformadora e professores renomados.
          </p>
          <div className="hero-btns">
            <Link to="/matricula" className="btn btn-primary">
              Iniciar Matrícula <ChevronRight size={20} />
            </Link>
            <a href="#cursos" className="btn btn-outline">Explorar Cursos</a>
          </div>
        </div>
      </section>

      {/* Access Portal Section */}
      <section id="acesso" className="access-portal-section">
        <div className="access-grid">
          <Link to="/login" className="access-card">
            <div className="access-icon student"><Users size={32} /></div>
            <div className="access-info">
              <h3>Portal do Aluno</h3>
              <p>Acesse suas aulas, livos e notas.</p>
            </div>
            <ChevronRight size={20} />
          </Link>
          
          <Link to="/professor/login" className="access-card">

            <div className="access-icon teacher"><GraduationCap size={32} /></div>
            <div className="access-info">
              <h3>Portal do Professor</h3>
              <p>Gerencie seus alunos e conteúdos.</p>
            </div>
            <ChevronRight size={20} />
          </Link>

          <Link to="/professor/login" className="access-card">

            <div className="access-icon admin"><Shield size={32} /></div>
            <div className="access-info">
              <h3>Administração</h3>
              <p>Painel de controle do sistema.</p>
            </div>
            <ChevronRight size={20} />
          </Link>
        </div>
      </section>

      {/* Info Stats */}
      <section className="stats-section">
        <div className="stats-grid">
          <a href="#metodologia" className="stat-card" style={{ textDecoration: 'none', color: 'inherit', transition: 'transform 0.3s ease' }}>
            <div className="icon-box"><BookCheck size={32} /></div>
            <h3>Metodologia Própria</h3>
            <p>Sistema de ensino exclusivo focado na exegese bíblica e aplicação prática para a vida cristã.</p>
          </a>
          <a href="#professores" className="stat-card" style={{ textDecoration: 'none', color: 'inherit', transition: 'transform 0.3s ease' }}>
            <div className="icon-box"><Users size={32} /></div>
            <h3>Corpo Docente</h3>
            <p>Mestres e doutores com vasta experiência teológica e compromisso com a sã doutrina.</p>
          </a>
          <a href="#nucleos" className="stat-card" style={{ textDecoration: 'none', color: 'inherit', transition: 'transform 0.3s ease' }}>
            <div className="icon-box"><Clock size={32} /></div>
            <h3>Flexibilidade Total</h3>
            <p>Estude no seu ritmo com nossa plataforma on-line ou participe de nossas turmas presenciais.</p>
          </a>
        </div>
      </section>

      {/* About Section */}
      <section id="sobre" className="about-section">
        <div className="section-grid">
          <div className="about-image">
             <div className="image-card">
                <GraduationCap size={160} color="var(--primary)" style={{ filter: 'drop-shadow(0 0 20px var(--primary-glow))' }} />
                <h2 style={{ marginTop: '2rem' }}>FATESA</h2>
                <p style={{ letterSpacing: '2px', opacity: 0.7 }}>EST. 2006</p>
             </div>
          </div>
          <div className="about-text">
            <span className="section-tag">Nossa História</span>
            <h2>Um Chamado para o Conhecimento</h2>
            <p>
              A Faculdade de Teologia de Santo André (FATESA) é fruto de uma visão dada por Deus ao Dr. Pr. Antônio Sebastião da Silva. 
              Nossa missão é equipar santos para a obra do ministério através de um ensino sério, bíblico e acessível.
            </p>
            <p>
              Em quase duas décadas de história, já formamos centenas de líderes e obreiros que hoje servem com excelência no Reino de Deus em todo o país.
            </p>
            <button className="btn btn-outline" style={{ width: 'fit-content' }}>Conheça nossa trajetória</button>
          </div>
        </div>
      </section>
      
      {/* Metodologia Section */}
      <section id="metodologia" style={{ padding: '8rem 2rem', background: 'radial-gradient(circle at 10% 50%, rgba(156, 39, 176, 0.03), transparent 40%)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="section-header" style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <span className="badge">EAD e Presencial</span>
            <h2>Metodologia de Ensino</h2>
            <p style={{ maxWidth: '800px', margin: '1rem auto' }}>
              No final do ano de 2024, a FATESA tomou a decisão de prover também o ensino à distância (EAD) e para tanto, 
              formatou dois cursos para alcançar os alunos que desejam aprender sobre a Palavra de Deus neste formato.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {/* Card 1: Material */}
            <div className="course-card" style={{ padding: '2.5rem', background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '16px', marginBottom: '1.5rem' }}>
                <Book size={24} color="var(--primary)" />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>O Material de Estudo</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                Os livros deixam de ser físicos e passam a ser digitais, disponibilizados para acesso imediato na Área do Aluno após a devida matrícula e liberação do módulo.
              </p>
            </div>

            {/* Card 2: Formato */}
            <div className="course-card" style={{ padding: '2.5rem', background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '16px', marginBottom: '1.5rem' }}>
                <Clock size={24} color="var(--primary)" />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Formato & Avaliações</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1rem' }}>
                Estudo da disciplina por no mínimo 30 dias. A avaliação (50 min) exige nota mínima 7.
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
                <small>Caso a nota seja inferior a 7, uma nova avaliação poderá ser solicitada após 15 dias mediante taxa administrativa.</small>
              </p>
            </div>

            {/* Card 3: Abandono */}
            <div className="course-card" style={{ padding: '2.5rem', background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '16px', marginBottom: '1.5rem' }}>
                <History size={24} color="var(--primary)" />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Do Abandono</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                O prazo máximo para realizar a avaliação é de 3 meses. A não interação (aquisição de nova disciplina) por período superior a 3 meses caracteriza abandono do curso.
              </p>
            </div>

            {/* Card 4: Conclusão */}
            <div className="course-card" style={{ padding: '2.5rem', background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '16px', marginBottom: '1.5rem' }}>
                <Award size={24} color="var(--primary)" />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Da Conclusão</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                Após a aprovação em todas as disciplinas e conclusão do cronograma, o aluno terá direito ao Certificado de Conclusão do Curso Teológico FATESA.
              </p>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', marginTop: '3rem', opacity: 0.6, fontSize: '0.9rem' }}>
            * As informações acima se referem tanto ao Curso Básico como o Curso Médio.
          </div>
        </div>
      </section>

      {/* Courses Section */}
      <section id="cursos" className="courses-section">
        <div className="section-header">
          <h2>Programas Acadêmicos</h2>
          <p>Escolha o nível ideal para sua jornada de aprendizado</p>
        </div>
        <div className="courses-grid-landing">
          <div className="course-card-landing">
            <div className="course-tag">Ideal para começar</div>
            <h3>Básico em Teologia</h3>
            <p>Fundamentação sólida nos principais pilares da fé cristã e introdução às disciplinas teológicas.</p>
            <ul>
              <li><BookOpen size={20} color="var(--primary)" /> Teologia Sistemática I & II</li>
              <li><BookOpen size={20} color="var(--primary)" /> Introdução Bíblica</li>
              <li><BookOpen size={20} color="var(--primary)" /> História do Cristianismo</li>
            </ul>
            <Link to="/signup" className="btn btn-primary">Inscrever-se</Link>
          </div>
          <div className="course-card-landing">
            <div className="course-tag">Avançado</div>
            <h3>Médio em Teologia</h3>
            <p>Aprofundamento exegético e ferramentas de liderança para um ministério frutífero.</p>
            <ul>
              <li><BookOpen size={20} color="var(--primary)" /> Hermenêutica Avançada</li>
              <li><BookOpen size={20} color="var(--primary)" /> Homilética e Pregação</li>
              <li><BookOpen size={20} color="var(--primary)" /> Grego Instrumental</li>
            </ul>
            <Link to="/signup" className="btn btn-outline">Mais Detalhes</Link>
          </div>
        </div>
      </section>
      {/* Corpo Docente Section */}
      <section id="professores" className="faculty-section">
        <div className="container">
          <div className="faculty-header" style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <span className="badge">Nosso Magistério</span>
            <h1 className="section-title" style={{ fontSize: '3rem', marginBottom: '1rem' }}>Corpo Docente</h1>
            <p className="section-subtitle" style={{ fontSize: '1.2rem', opacity: 0.8 }}>Conheça os mestres que dedicam suas vidas ao ensino da Palavra.</p>
          </div>

          <div className="faculty-grid" style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>
            <div className="faculty-card glass-card">
              <div className="faculty-photo-container">
                <img 
                  src="https://www.fatesacasadosaber.education/image/profes/profes.jpg" 
                  alt="Dr. Pr. Antônio Sebastião da Silva" 
                  className="faculty-photo" 
                />
              </div>
              <div className="faculty-info">
                <div className="faculty-title">
                  <h2 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>Dr. Pr. Antônio Sebastião da Silva</h2>
                  <span className="faculty-role" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Patrono & Diretor Fundador</span>
                </div>

                <div className="faculty-credentials" style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div className="credential-item">
                    <Award className="text-primary" size={20} />
                    <span>Graduado em Odontologia (Alfenas - MG)</span>
                  </div>
                  <div className="credential-item">
                    <Shield className="text-primary" size={20} />
                    <span>Graduado em Direito (São Bernardo - SP)</span>
                  </div>
                  <div className="credential-item">
                    <Book className="text-primary" size={20} />
                    <span>Bacharel em Teologia (São Miguel Paulista)</span>
                  </div>
                  <div className="credential-item">
                    <Users className="text-primary" size={20} />
                    <span>Pastor e Mestre (AD Santo André - SP)</span>
                  </div>
                </div>

                <div className="faculty-bio" style={{ marginTop: '2.5rem', borderLeft: '4px solid var(--primary)', paddingLeft: '1.5rem' }}>
                  <p style={{ marginBottom: '1rem' }}>
                    Nascido em um lar não evangélico, converteu-se em sua adolescência, sendo batizado nas águas em 9 de agosto de 1953, aos 13 anos. Desde cedo, demonstrou um amor profundo pelas Escrituras, sendo um aluno assíduo da Escola Bíblica Dominical em Santa Rita de Sapucaí, MG.
                  </p>
                  <p style={{ marginBottom: '1rem' }}>
                    Inspirado pelo Espírito Santo e motivado pelo desejo de elevar o nível do ensino teológico, idealizou a FATESA (Casa do Saber). Seu objetivo central sempre foi preparar novos obreiros e aperfeiçoar os que já militam na causa do Mestre, oferecendo uma formação sólida e transformadora.
                  </p>
                  <p>
                    Além de fundador da FATESA, é o criador e diretor do CAPED (Centro Avançado de Preparo de Educadores para a EBD), consolidando-se como uma das maiores referências no ensino teológico das Assembleias de Deus no Brasil.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Nossos Núcleos */}
      <section id="nucleos" style={{ padding: '8rem 2rem', background: 'var(--glass)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>Nossos Núcleos</h2>
            <p style={{ color: 'var(--text-muted)' }}>Encontre o polo da FATESA mais próximo de você.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <div 
              className="course-card" 
              onClick={() => setShowVilaLuzita(!showVilaLuzita)}
              style={{ padding: '3rem', border: '1px solid var(--glass-border)', background: 'var(--glass)', cursor: 'pointer', transition: 'all 0.3s ease' }}
            >
              <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '16px', marginBottom: '1.5rem' }}>
                <MapPin size={24} color="var(--primary)" />
              </div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', fontWeight: 700 }}>Núcleo Vila Luzita</h3>
              
              {showVilaLuzita ? (
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                  <li>📍 <b>Endereço:</b> Av. Dom Pedro I, 3145 - Vila Pires, Santo André, SP</li>
                  <li>📮 <b>CEP:</b> 09130-470</li>
                  <li>👨‍🏫 <b>Professor:</b> Pr Ademar</li>
                  <li>⏰ <b>Aulas:</b> Segunda-Feira, das 19:30 às 22:00</li>
                </ul>
              ) : (
                <p style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Clique para ver endereço e horários</p>
              )}
              
              <Link to="/matricula" className="btn btn-primary" style={{ marginTop: '2.5rem', width: '100%' }}>Quero me Matricular</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <footer id="contato" className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo-section">
              <GraduationCap size={32} color="var(--primary)" />
              <div className="logo-text">
                <h2 style={{ fontSize: '1.5rem' }}>FATESA</h2>
                <p style={{ fontSize: '0.8rem' }}>Casa do Saber</p>
              </div>
            </div>
            <p className="footer-description">
              Formando líderes e servos para o Reino de Deus através do ensino teológico de excelência.
            </p>
          </div>
          
          <div className="footer-links">
            <h4>Navegação</h4>
            <a href="#home">Início</a>
            <a href="#sobre">Instituição</a>
            <a href="#professores">Patrono</a>
            <a href="#cursos">Nossos Cursos</a>
            <Link to="/login">
              {sessionUser ? "Meu Painel" : "Portal do Aluno"}
            </Link>
          </div>

          <div className="footer-contact">
            <h4>Fale Conosco</h4>
            <div className="contact-item" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <a href="tel:1144013394" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', textDecoration: 'none', color: 'inherit', transition: 'color 0.3s' }} className="hover-primary">
                <Phone size={18} color="var(--primary)" />
                <span>(11) 4401-3394 <small style={{ opacity: 0.6 }}>(Administrativo)</small></span>
              </a>
              <a href="https://wa.me/5511999720904" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', textDecoration: 'none', color: 'inherit', transition: 'color 0.3s' }} className="hover-primary">
                <MessageCircle size={18} color="var(--primary)" />
                <span>+55 11 99972-0904 <small style={{ opacity: 0.6 }}>(WhatsApp Adm)</small></span>
              </a>
              <a href="https://wa.me/5511939014534" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', textDecoration: 'none', color: 'inherit', transition: 'color 0.3s' }} className="hover-primary">
                <MessageCircle size={18} color="var(--primary)" />
                <span>+55 11 93901-4534 <small style={{ opacity: 0.6 }}>(Suporte Técnico)</small></span>
              </a>
              <a href="mailto:contato@fatesacasadosaber.education" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', textDecoration: 'none', color: 'inherit', transition: 'color 0.3s' }} className="hover-primary">
                <Mail size={18} color="var(--primary)" />
                <span>contato@fatesacasadosaber.education</span>
              </a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} FATESA Casa do Saber. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}

export default Landing
