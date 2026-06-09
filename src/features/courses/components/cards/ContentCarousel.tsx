import React, { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react'
import ContentCard from './ContentCard'
import { ContentRoot, ROOT_CONFIG, ROOT_ORDER, groupByRoot } from './contentTypes'

export interface ContentCarouselProps {
  items: any[]
  showReleaseBadges?: (item: any) => boolean
  renderHeader?: (root: ContentRoot, count: number) => React.ReactNode
  compact?: boolean
  defaultRoot?: ContentRoot
}

const ContentCarousel: React.FC<ContentCarouselProps> = ({
  items,
  showReleaseBadges,
  renderHeader,
  compact = true,
  defaultRoot = 'licoes',
}) => {
  const grouped = groupByRoot(items)
  const [expandedRoots, setExpandedRoots] = useState<Set<ContentRoot>>(new Set([defaultRoot]))

  const toggleRoot = (root: ContentRoot) => {
    setExpandedRoots((prev) => {
      const next = new Set(prev)
      if (next.has(root)) {
        next.delete(root)
      } else {
        next.add(root)
      }
      return next
    })
  }

  const trackRef = useRef<HTMLDivElement | null>(null)

  // Removed useEffect for scrolling and go function as we are now using expand/collapse logic

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {ROOT_ORDER.map((root) => {
            const conf = ROOT_CONFIG[root]
            const count = grouped[root].length
            const isActive = expandedRoots.has(root)
            return (
              <button
                key={root}
                onClick={() => toggleRoot(root)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '20px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  cursor: 'pointer',
                  background: isActive ? conf.bg : 'rgba(255,255,255,0.04)',
                  color: isActive ? conf.color : 'var(--text-muted)',
                  border: `1px solid ${isActive ? conf.border : 'rgba(255,255,255,0.08)'}`,
                  transition: 'all 0.2s',
                }}
              >
                {conf.icon}
                {conf.label}
                <span
                  style={{
                    fontSize: '0.65rem',
                    background: isActive ? conf.color : 'rgba(255,255,255,0.08)',
                    color: isActive ? '#fff' : 'var(--text-muted)',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    minWidth: '20px',
                    textAlign: 'center',
                  }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

       <div
         ref={trackRef}
         style={{
           display: 'flex',
           flexDirection: 'column',
           gap: '1rem',
           paddingBottom: '0.25rem',
         }}
         className="carousel-track-no-scrollbar"
       >
         {ROOT_ORDER.map((root) => {
           if (!expandedRoots.has(root)) return null;
           const rootItems = grouped[root]
           const conf = ROOT_CONFIG[root]
           return (
             <div
               key={root}
               style={{
                 display: 'flex',
                 flexDirection: 'column',
                 gap: '0.5rem',
               }}
             >

              {renderHeader ? (
                renderHeader(root, rootItems.length)
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 0.6rem',
                    background: conf.bg,
                    border: `1px solid ${conf.border}`,
                    borderRadius: '10px',
                  }}
                >
                  <span style={{ color: conf.color, display: 'flex' }}>{conf.icon}</span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      color: conf.color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {conf.label} ({rootItems.length})
                  </span>
                </div>
              )}

              {rootItems.length === 0 ? (
                <div
                  style={{
                    padding: '1.25rem',
                    textAlign: 'center',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px dashed rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <Inbox size={14} /> Nenhum conteúdo nesta categoria.
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: '0.6rem',
                  }}
                >
                  {rootItems.map((lesson, idx) => (
                    <ContentCard
                      key={lesson.id}
                      lesson={lesson}
                      index={idx}
                      compact={compact}
                      released={showReleaseBadges ? !showReleaseBadges(lesson) : true}
                      showReleaseBadge={!!showReleaseBadges}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      </div>
    )
  }


export default ContentCarousel
