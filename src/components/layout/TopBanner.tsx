import React from 'react'

const subjects = [
  'Doutrina da Salvação',
  'Atos dos Apóstolos',
  'Cristologia',
  'Epístolas aos Hebreus',
  'Teologia Sistemática',
  'Hermenêutica',
  'História da Igreja',
  'Eclesiologia',
  'Pneumatologia',
  'Escatologia',
  'Antropologia Teológica',
  'Ética Cristã'
]

const TopBanner: React.FC = () => {
  return (
    <div className="top-subjects-banner" role="marquee" aria-label="Matérias do curso">
      <div className="banner-overlay" />
      <div className="subjects-scroll">
        {subjects.map((subject, idx) => (
          <div key={idx} className="subject-item">
            <span aria-hidden="true" />
            {subject}
          </div>
        ))}
        {subjects.map((subject, idx) => (
          <div key={idx + subjects.length} className="subject-item">
            <span aria-hidden="true" />
            {subject}
          </div>
        ))}
      </div>
    </div>
  )
}

export default TopBanner