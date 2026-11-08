/**
 * El resumen como documento: el mismo orden que el PDF y que la anamnesis de la historia
 * clínica. Se usa en la revisión (con los faltantes resaltados) y en el resumen final.
 */
import type { ReactNode } from 'react'
import { Hand, Siren, Stethoscope, TriangleAlert } from 'lucide-react'
import {
  fechaHora,
  horaCorta,
  NO_ESPECIFICADO,
  type Dato,
  type Resumen,
} from '@/domain/resumen/resumen'

export interface DocumentoResumenProps {
  resumen: Resumen
  generado: Date
  /** En la revisión, lo que falta se resalta para saber qué repreguntar. */
  resaltarFaltantes?: boolean
}

export function DocumentoResumen({
  resumen,
  generado,
  resaltarFaltantes = false,
}: DocumentoResumenProps) {
  return (
    <article
      aria-label="Resumen pre-consulta"
      className="bg-superficie rounded-[1.75rem] p-5 shadow-[0_20px_50px_-30px_rgb(21_69_63/0.45)] ring-1 ring-black/5 sm:p-8"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-black/10 pb-4">
        <div>
          <p className="text-marca-oscuro flex items-center gap-2 font-semibold">
            <Stethoscope size={20} aria-hidden /> Para el profesional
          </p>
          <p className="text-tinta-suave mt-1 text-sm">
            Información referida por la persona usuaria de LSP
          </p>
        </div>
        <p className="text-tinta-suave text-sm tabular-nums">{fechaHora(generado)}</p>
      </header>

      <DeUnVistazo resumen={resumen} />

      <Seccion titulo="Alerta inicial">
        <p className={resumen.alerta.estado === 'si' ? 'text-alerta font-semibold' : ''}>
          {resaltarFaltantes && resumen.alerta.estado === 'no-especificado' ? (
            <Faltante>{resumen.alerta.texto}</Faltante>
          ) : (
            resumen.alerta.texto
          )}
        </p>
      </Seccion>

      <Seccion titulo="Síntomas referidos">
        {resumen.sintomas.length === 0 ? (
          <p className="text-tinta-suave italic">No especificado.</p>
        ) : (
          <ul className="space-y-4">
            {resumen.sintomas.map((s, i) => (
              <li key={i}>
                <p className="font-medium">{s.linea}</p>
                <Datos datos={s.datos} resaltar={resaltarFaltantes} />
                {s.detalles.length > 0 && (
                  <ul className="text-tinta border-marca-claro mt-2 space-y-1 border-l-2 pl-3 text-[0.95rem]">
                    {s.detalles.map((d, j) => (
                      <li key={j}>{d}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </Seccion>

      <Seccion titulo="Antecedentes">
        <Datos datos={resumen.antecedentes} resaltar={resaltarFaltantes} />
      </Seccion>

      {resumen.mensajeLibre.length > 0 && (
        <Seccion titulo="Mensaje libre en LSP">
          <ul className="space-y-1">
            {resumen.mensajeLibre.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </Seccion>
      )}

      {resumen.otrosDatos.length > 0 && (
        <Seccion titulo="Otros datos referidos">
          <ul className="space-y-1">
            {resumen.otrosDatos.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </Seccion>
      )}

      <footer className="text-tinta-suave mt-6 border-t border-black/10 pt-4 text-sm">
        {resumen.cierre}
      </footer>
    </article>
  )
}

/** Tres datos clave arriba, para leer de un vistazo. */
function DeUnVistazo({ resumen }: { resumen: Resumen }) {
  const alerta = resumen.alerta.estado
  return (
    <dl className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-3">
      <Tarjeta
        icono={<Siren size={18} aria-hidden />}
        etiqueta="Alerta inicial"
        valor={
          { si: 'Sí: avisar al personal', no: 'No', 'no-especificado': 'No especificado' }[alerta]
        }
        tono={alerta === 'si' ? 'alerta' : 'normal'}
      />
      <Tarjeta
        icono={<Stethoscope size={18} aria-hidden />}
        etiqueta="Síntomas referidos"
        valor={String(resumen.sintomas.length)}
      />
      <Tarjeta
        icono={<Hand size={18} aria-hidden />}
        etiqueta="Apoyo de interpretación"
        valor={resumen.pidioInterprete ? 'Solicitado' : 'No solicitado'}
        tono={resumen.pidioInterprete ? 'destacado' : 'normal'}
      />
    </dl>
  )
}

function Tarjeta({
  icono,
  etiqueta,
  valor,
  tono = 'normal',
}: {
  icono: ReactNode
  etiqueta: string
  valor: string
  tono?: 'normal' | 'alerta' | 'destacado'
}) {
  const estilos = {
    normal: 'bg-fondo text-tinta',
    alerta: 'bg-alerta text-white',
    destacado: 'bg-marca text-white',
  }[tono]
  return (
    <div className={`min-w-0 rounded-2xl px-4 py-3 ${estilos}`}>
      <dt className="flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
        {icono} {etiqueta}
      </dt>
      <dd className="mt-1 text-base leading-snug font-bold break-words">{valor}</dd>
    </div>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  const id = `seccion-${titulo.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <section aria-labelledby={id} className="mt-6">
      <h2 id={id} className="mb-2 text-lg font-bold">
        {titulo}
      </h2>
      {children}
    </section>
  )
}

/** Datos en dos columnas: etiqueta y valor. "No especificado" se ve distinto de lo dicho. */
function Datos({ datos, resaltar }: { datos: Dato[]; resaltar: boolean }) {
  return (
    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-[0.95rem] sm:grid-cols-[minmax(9rem,auto)_1fr]">
      {datos.map((d, i) => (
        <div key={i} className="contents">
          <dt className="text-tinta-suave">{d.etiqueta}</dt>
          <dd>
            {d.valor !== null ? (
              d.valor
            ) : resaltar ? (
              <Faltante>{NO_ESPECIFICADO}</Faltante>
            ) : (
              <span className="text-tinta-suave italic">{NO_ESPECIFICADO}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function Faltante({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2 py-0.5 text-amber-900">
      <TriangleAlert size={15} aria-hidden />
      <span className="sr-only">Falta un dato: </span>
      {children}
    </span>
  )
}

/** Respuestas tal como se confirmaron (RES3). */
export function Originales({ resumen }: { resumen: Resumen }) {
  return (
    <details className="bg-superficie rounded-2xl p-4 ring-1 ring-black/5">
      <summary className="cursor-pointer font-semibold">
        Respuestas originales ({resumen.originales.length})
      </summary>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="text-tinta-suave">
            <tr>
              <th className="py-1 pr-3 font-medium">Hora</th>
              <th className="py-1 pr-3 font-medium">Pregunta</th>
              <th className="py-1 pr-3 font-medium">Respuesta</th>
              <th className="py-1 font-medium">Cómo</th>
            </tr>
          </thead>
          <tbody>
            {resumen.originales.map((o, i) => (
              <tr key={i} className="border-t border-black/5">
                <td className="py-1.5 pr-3 tabular-nums">{horaCorta(o.hora)}</td>
                <td className="py-1.5 pr-3">{o.pregunta}</td>
                <td className="py-1.5 pr-3 font-medium">{o.respuesta}</td>
                <td className="py-1.5">{o.origen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
