# Contributing

Este documento define la forma de trabajo utilizada por el equipo para colaborar en el TCI.

## Modelo de ramas

Utilizamos **Feature Branch Flow**.

Cada cambio o funcionalidad deberá desarrollarse en una rama independiente creada a partir de `main`.

Regla principal:

**Una feature = una rama = un Pull Request.**

No se deben mezclar cambios que no estén relacionados dentro de una misma rama.

Motivos de decision:
Ayuda a mantener un registro claro y lógico de qué cambios corresponden a cada característica específica.
Fomenta la colaboración mediante pull requests.
Se centra en la integración y entrega continua.

## Actualizar el repositorio

Antes de comenzar una nueva tarea, se debe actualizar `main`:

```bash
git checkout main
git pull upstream main
git pull origin main
```

El remoto `upstream` corresponde al repositorio de la cátedra:

`desasoftfrlptn/TCI_S32_2026`

El remoto `origin` corresponde al repositorio del equipo:

`lucadiazg/TCI_S32_2026`

## Crear una rama

Las ramas deben tener nombres claros según el tipo de cambio.

Ejemplos:

```bash
git checkout -b feat/nueva-funcionalidad
git checkout -b fix/correccion-login
git checkout -b docs/documentacion
git checkout -b chore/configuracion
```

Convenciones principales:

- `feat/` para nuevas funcionalidades.
- `fix/` para correcciones.
- `docs/` para documentación.
- `chore/` para tareas de mantenimiento o configuración.

## Realizar commits

Los commits deberán seguir la convención **Conventional Commits**.

Ejemplos:

```bash
git commit -m "feat: agrego búsqueda de expedientes"
git commit -m "fix: corrijo validación del formulario"
git commit -m "docs: actualizo README"
git commit -m "chore: actualizo configuración"
```

Los commits deben representar cambios pequeños y relacionados entre sí.

## Subir una rama

Una vez realizado el cambio:

```bash
git push -u origin nombre-de-la-rama
```

## Pull Requests

Todo cambio deberá ingresar a `main` mediante un Pull Request.

Los Pull Requests deben realizarse siempre contra:

`lucadiazg/TCI_S32_2026:main`

Nunca deberán enviarse Pull Requests al repositorio base de la cátedra:

`desasoftfrlptn/TCI_S32_2026`

El repositorio de la cátedra se utiliza únicamente como `upstream` para recibir actualizaciones.

## Revisión y aprobación

Cada Pull Request deberá recibir al menos una revisión de otro integrante del equipo.

El proceso será:

1. El autor crea el Pull Request.
2. Otro integrante revisa los cambios.
3. Si encuentra problemas, solicita cambios.
4. Si el cambio es correcto, selecciona `Approve`.
5. Luego se realiza el merge a `main`.

El autor no deberá aprobar ni mergear su propio Pull Request.

## Después del merge

Antes de comenzar una nueva tarea, cada integrante deberá actualizar nuevamente su rama `main`:

```bash
git checkout main
git pull origin main
```

De esta forma, cada nueva rama se crea a partir de la versión más reciente del proyecto.