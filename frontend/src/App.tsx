import { useState } from 'react'
import './App.css'

function App() {
  const [codigoMaquina, setCodigoMaquina] = useState('')
  const [descripcion, setDescripcion] = useState('')

  return (
    <main>
      <h1>Sistema de Gestión de Stock y Mantenimiento</h1>
      <h2 className="text-2xl font-bold text-blue-600">
        Reportar incidencia
      </h2>

      <form onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="maquina">Código de máquina:</label>
        <input
          id="maquina"
          type="text"
          value={codigoMaquina}
          onChange={(e) => setCodigoMaquina(e.target.value)}
          placeholder="Ingresá el código QR o tag"
          required
        />

        <label htmlFor="descripcion">Descripción:</label>
        <textarea
          id="descripcion"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          maxLength={250}
          required
        />

        <button type="submit">Reportar incidencia</button>
      </form>
    </main>
  )
}

export default App