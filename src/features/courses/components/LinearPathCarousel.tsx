import React, { useRef, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Lock, CheckCircle, BookOpen, ClipboardList, GraduationCap, PlayCircle, Compass, FileText, Award } from 'lucide-react'

export interface PathStep {
  key: string
  label: string
  subtitle?: string
  href: string
  external?: boolean
  variant: 'panorama' | 'licao' | 'video' | 'exercicio' | 'avaliacao'
  isCompleted?: boolean
  isLocked?: boolean
  onDelete?: () => void
  deleteLabel?: string
}

/**
 * Detecta se um href aponta para arquivo HTML estático servido em /licoes/...
 * (caso em que o browser faz navegação nativa, sem React Router).
 */
function isStaticHtmlHref(href: string): boolean {
  return href.startsWith('/licoes/') && /\.html?(\?|$|#)/i.test(href)
}

export interface LinearPathCarouselProps {
  steps: PathStep[]
  title?: string
}

const VARIANT_STYLES: Record<PathStep['variant'], { color: string; bg: string; border: string; iconBg: string; icon: React.ReactNode; tag: string }> = {
  panorama: {
    color: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.10)',
    border: 'rgba(34, 197, 94, 0.30)',
    iconBg: 'rgba(34, 197, 94, 0.18)',
    icon: <Compass size={28} />,
    tag: 'PANORAMA',
  },
  licao: {
    color: '#3b82f6',
    bg: 'rgba(168, 85, 247, 0.10)',
    border: 'rgba(168, 85, 247, 0.30)',
    iconBg: 'rgba(168, 85, 247, 0.18)',
    icon: <BookOpen size={28} />,
    tag: 'LIÇÃO',
  },
  video: {
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.10)',
    border: 'rgba(59, 130, 246, 0.30)',
    iconBg: 'rgba(59, 130, 246, 0.18)',
    icon: <PlayCircle size={28} />,
    tag: 'VÍDEO',
  },
  exercicio: {
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.10)',
    border: 'rgba(16, 185, 129, 0.30)',
    iconBg: 'rgba(16, 185, 129, 0.18)',
    icon: <ClipboardList size={28} />,
    tag: 'EXERCÍCIO',
  },
  avaliacao: {
    color: '#eab308',
    bg: 'rgba(234, 179, 8, 0.10)',
    border: 'rgba(234, 179, 8, 0.30)',
    iconBg: 'rgba(234, 179, 8, 0.18)',
    icon: <GraduationCap size={28} />,
    tag: 'AVALIAÇÃO',
  },
}

const LinearPathCarousel: React.FC<LinearPathCarouselProps> = ({ steps, title }) => {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollState = () => {
    const el = trackRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    updateScrollState()
    const el = trackRef.current
    if (!el) return
    el.addEventListener('scroll', updateScrollState)
    window.addEventListener('resize', updateScrollState)
    return () => {
      el.removeEventListener('scroll', updateScrollState)
      window.removeEventListener('resize', updateScrollState)
    }
  }, [steps.length])

  const go = (delta: number) => {
    const el = trackRef.current
    if (!el) return
    const card = el.querySelector<HTMLElement>('[data-linear-step]')
    const step = card ? card.offsetWidth + 24 : 264
    el.scrollBy({ left: delta * step, behavior: 'smooth' })
  }

  const goTo = (idx: number) => {
    const el = trackRef.current
    if (!el) return
    const cards = el.querySelectorAll<HTMLElement>('[data-linear-step]')
    const target = cards[idx]
    if (target) el.scrollTo({ left: target.offsetLeft, behavior: 'smooth' })
  }

  return (
    <div
      style={{
        background: 'var(--glass)',
        border: '1px solid var(--glass-border)',
        borderRadius: '24px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Compass size={20} color="var(--primary)" /> {title}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {activeIndex + 1} de {steps.length}
            </span>
            <button
              onClick={() => go(-1)}
              disabled={!canScrollLeft}
              aria-label="Anterior"
              style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: canScrollLeft ? 'var(--text-muted)' : 'rgba(255,255,255,0.2)',
                cursor: canScrollLeft ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => go(1)}
              disabled={!canScrollRight}
              aria-label="Próximo"
              style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: canScrollRight ? 'var(--text-muted)' : 'rgba(255,255,255,0.2)',
                cursor: canScrollRight ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      <div
        ref={trackRef}
        onScroll={() => {
          const el = trackRef.current
          if (!el) return
          const cards = el.querySelectorAll<HTMLElement>('[data-linear-step]')
          const scrollLeft = el.scrollLeft
          let closest = 0
          let minDist = Infinity
          cards.forEach((c, i) => {
            const dist = Math.abs(c.offsetLeft - scrollLeft)
            if (dist < minDist) { minDist = dist; closest = i }
          })
          setActiveIndex(closest)
        }}
        className="linear-path-track"
        style={{
          display: 'flex',
          gap: '1.25rem',
          overflowX: 'auto',
          padding: '0.5rem 0.25rem 1rem',
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
        }}
      >
        {steps.map((step, idx) => {
          const v = VARIANT_STYLES[step.variant]
          const isDisabled = step.isLocked
          const isStaticHtml = isStaticHtmlHref(step.href)
          return (
            <a
              key={step.key}
              data-linear-step
              href={isDisabled ? undefined : step.href}
              target={step.external && !isStaticHtml ? '_blank' : undefined}
              rel={step.external && !isStaticHtml ? 'noopener noreferrer' : undefined}
              onClick={(e) => { if (isDisabled) e.preventDefault() }}
              style={{
                flex: '0 0 240px',
                minWidth: '240px',
                maxWidth: '240px',
                scrollSnapAlign: 'start',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '0.85rem',
                padding: '1.5rem 1.25rem',
                background: v.bg,
                border: `1px solid ${v.border}`,
                borderRadius: '20px',
                textDecoration: 'none',
                color: 'inherit',
                opacity: isDisabled ? 0.55 : 1,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
                filter: isDisabled ? 'grayscale(0.6)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (isDisabled) return
                e.currentTarget.style.transform = 'translateY(-6px)'
                e.currentTarget.style.boxShadow = '0 14px 30px rgba(0,0,0,0.35)'
                e.currentTarget.style.borderColor = v.color
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.borderColor = v.border
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  fontSize: '0.65rem',
                  fontWeight: 900,
                  padding: '4px 10px',
                  borderRadius: '8px',
                  background: step.isCompleted ? 'var(--success)' : v.iconBg,
                  color: step.isCompleted ? '#fff' : v.color,
                  border: `1px solid ${step.isCompleted ? 'var(--success)' : v.color}55`,
                }}
              >
                #{String(idx + 1).padStart(2, '0')}
              </div>

              {step.isCompleted && (
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'var(--success)',
                    color: '#fff',
                    fontSize: '0.6rem',
                    fontWeight: 900,
                    padding: '4px 8px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <CheckCircle size={10} /> OK
                </div>
              )}

              {isDisabled && (
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'rgba(239,68,68,0.15)',
                    color: '#f87171',
                    fontSize: '0.6rem',
                    fontWeight: 900,
                    padding: '4px 8px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    border: '1px solid rgba(239,68,68,0.3)',
                  }}
                >
                  <Lock size={10} /> BLOQUEADO
                </div>
              )}

              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '18px',
                  background: v.iconBg,
                  border: `1px solid ${v.color}33`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: v.color,
                }}
              >
                {isDisabled ? <Lock size={28} color="var(--text-muted)" /> : v.icon}
              </div>

              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: v.color,
                }}
              >
                {v.tag}
              </span>

              <span
                style={{
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  lineHeight: 1.3,
                  color: '#fff',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {step.label}
              </span>

              {step.subtitle && (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '-0.3rem' }}>
                  {step.subtitle}
                </span>
              )}

              {step.onDelete && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); step.onDelete?.() }}
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '10px',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '8px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: '#f87171',
                  }}
                >
                  Excluir
                </button>
              )}
            </a>
          )
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
        {steps.map((s, idx) => {
          const v = VARIANT_STYLES[s.variant]
          return (
            <button
              key={s.key}
              onClick={() => goTo(idx)}
              aria-label={`Ir para ${s.label}`}
              style={{
                width: idx === activeIndex ? '24px' : '8px',
                height: '8px',
                borderRadius: '10px',
                border: 'none',
                padding: 0,
                background: idx === activeIndex ? v.color : 'rgba(255,255,255,0.15)',
                transition: 'all 0.2s',
                cursor: 'pointer',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

export default LinearPathCarousel
