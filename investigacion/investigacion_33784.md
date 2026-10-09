# Investigación — [Puebla, Zoe] (Legajo 33784)

## Parte A — JS asincrónico + fetch + SPA

#### ¿Qué es una SPA (Single Page Application) y en qué se diferencia de una página tradicional (MPA)?

Una SPA es una aplicación que trabaja sobre una sola página y va cambiando el contenido según lo que hace el usuario. En una MPA se cargan distintas páginas a medida que el usuario navega.

Fuente: https://developer.mozilla.org/es/docs/Glossary/SPA

#### ¿Qué es una promesa (Promise) en JavaScript y para qué sirve? ¿Qué problema resuelve?

Una promesa representa un resultado que todavía no está disponible, pero que llegará más adelante. Sirve para poder seguir trabajando mientras se espera el resultado de una tarea, por ejemplo una petición a un servidor.

Fuente: https://es.javascript.info/promise-basics

#### ¿Por qué fetch devuelve una promesa y no el dato directamente?

Porque cuando hacemos una petición no sabemos cuánto va a tardar el servidor en responder. Fetch devuelve una promesa y cuando llega la respuesta podemos trabajar con los datos.

Fuente: https://developer.mozilla.org/es/docs/Web/API/Fetch_API/Using_Fetch

#### ¿Qué diferencia hay entre XMLHttpRequest y fetch?

Los dos permiten pedir información a un servidor. XMLHttpRequest es una forma más antigua de hacerlo, mientras que fetch permite trabajar con promesas y hace que este tipo de peticiones sea más sencillo de escribir y entender.

Fuente: https://developer.mozilla.org/es/docs/Web/API/Fetch_API/Using_Fetch



## Parte B — React + TypeScript + Vite

### ¿Qué es un componente en React?
Un componente es una parte de la interfaz que podemos reutilizar. Por ejemplo, Incidencia es un componente que muestra un título, una descripción y un estado.
### ¿Qué son las props?
Las props son datos que un componente recibe desde otro componente. En este caso, Incidencia recibe titulo y descripcion desde App.tsx.
### ¿Qué es el estado?
El estado es un dato que puede cambiar mientras se usa la aplicación. En este ejemplo usamos useState para cambiar una incidencia entre Pendiente y Resuelta.
### ¿Para qué sirve TypeScript en React?
TypeScript permite indicar qué tipo de dato esperamos. Si un dato no coincide con ese tipo, nos muestra un error antes de ejecutar el programa.

### Búsquedas

### Evidencia actividad guiada


## Parte C — Contrato OpenAPI + Prism

### Preguntas guía

### Búsquedas

### Evidencia actividad guiada


## Reflexión