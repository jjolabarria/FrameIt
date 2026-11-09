export const questionTypeConfig: Record<string, { title: string; help: string; item: string; rule: string }> = {
  ShortText: { title: 'Respuesta breve', help: 'Una frase para recoger una respuesta concreta.', item: '', rule: 'Un campo de una línea por participante.' },
  RichText: { title: 'Respuesta desarrollada', help: 'Espacio para explicar una propuesta con contexto.', item: '', rule: 'Una respuesta de varias líneas por participante.' },
  StickyNotes: { title: 'Lluvia de ideas', help: 'Cada participante puede añadir varias notas independientes.', item: '', rule: 'Una idea por nota; se envían juntas.' },
  Choice: { title: 'Opciones para elegir', help: 'El participante selecciona una de estas alternativas.', item: 'Opción', rule: 'Selección única. No se admite una respuesta de texto libre.' },
  Voting: { title: 'Candidaturas de la votación', help: 'Define las alternativas que el grupo va a priorizar.', item: 'Candidatura', rule: 'Un voto por participante. Puede cambiarlo mientras la ronda esté abierta.' },
  Ranking: { title: 'Elementos para ordenar', help: 'Este será el orden inicial. El participante podrá cambiarlo con las flechas.', item: 'Elemento', rule: 'Se ordenan todos los elementos, sin empates.' },
  ColumnSort: { title: 'Elementos para clasificar', help: 'Cada elemento se asigna a una columna de las definidas en Configuración.', item: 'Elemento', rule: 'Una columna por elemento. Hay que clasificar todos antes de enviar.' },
  Matrix: { title: 'Filas de la matriz', help: 'Cada fila se evaluará con la escala definida en Configuración.', item: 'Fila', rule: 'Un valor por fila. Hay que completar todas antes de enviar.' },
}
