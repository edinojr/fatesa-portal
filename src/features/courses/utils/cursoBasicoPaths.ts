// Caminho base (UTF-8 puro). Será codificado corretamente quando aparecer em href.
const CURSO_BASICO_BASE = '/licoes/Curso Básico'

const LICAO_NUM_PAD = (n: number) => String(n).padStart(2, '0')

/**
 * Normaliza cada segmento do caminho com encodeURIComponent de forma segura
 * (sem re-codificar "%" pré-existente). Para paths em /public, o React/browser
 * já cuida da codificação final ao montar o href.
 */
function buildPath(...segments: string[]): string {
  return segments
    .map((s) => encodeURIComponent(s).replace(/%2F/g, '/'))
    .join('/')
}

export function buildCursoBasicoPanoramaHref(bookTitle: string): string {
  return buildPath(CURSO_BASICO_BASE, bookTitle, 'Panorama.html')
}

export function buildCursoBasicoLicaoHref(bookTitle: string, ordem: number, lessonTitle: string): string {
  const fileName = `Lição ${LICAO_NUM_PAD(ordem)} - ${lessonTitle}.html`
  return buildPath(CURSO_BASICO_BASE, bookTitle, fileName)
}

export function buildCursoBasicoExercicioHref(bookTitle: string, ordem: number, lessonTitle: string, exercicioNum: number): string {
  const licaoFolder = `Lição ${LICAO_NUM_PAD(ordem)} - ${lessonTitle}`
  const fileName = `Exercício ${LICAO_NUM_PAD(exercicioNum)}.html`
  return buildPath(CURSO_BASICO_BASE, bookTitle, licaoFolder, fileName)
}
