console.log("app.js cargado ✅");
const form = document.querySelector("#form-incidencia");

form.addEventListener("submit", (event) => {
  // handler
      event.preventDefault();

    console.log("Formulario enviado");
});