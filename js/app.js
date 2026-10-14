// ======================================================
// Mi Plata — Lógica de la aplicación (interfaz)
// ======================================================

const CUPO_TARJETA_INICIAL = 3000000;
const SALDO_BASE = 2000000; // saldo inicial que recibe todo usuario nuevo en su Cuenta de Ahorros
const CLAVE_SESION = "sesionActivaMiPlata";

// ---------- Utilidades ----------

function formatearDinero(numero) {
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(numero);
}

function mostrarToast(mensaje) {
    let toast = document.getElementById("toast");
    toast.textContent = mensaje;
    toast.classList.add("show");
    setTimeout(function () {
        toast.classList.remove("show");
    }, 2600);
}

function obtenerUsuarioActivo() {
    return localStorage.getItem(CLAVE_SESION);
}

function obtenerClienteActivo() {
    let usuario = obtenerUsuarioActivo();
    if (usuario === null) {
        return null;
    }
    return buscarClientePorUsuario(usuario);
}

// ---------- Modales y navegación ----------

function abrirModal(idModal) {
    document.getElementById(idModal).classList.remove("hidden");
}

function cerrarModal(idModal) {
    document.getElementById(idModal).classList.add("hidden");
}

function cambiarPestanaAuth(modo) {
    let pestanas = document.querySelectorAll(".tab");
    for (let i = 0; i < pestanas.length; i++) {
        if (pestanas[i].dataset.auth === modo) {
            pestanas[i].classList.add("active");
        } else {
            pestanas[i].classList.remove("active");
        }
    }

    if (modo === "register") {
        document.getElementById("registerForm").classList.remove("hidden");
        document.getElementById("modalLoginForm").classList.add("hidden");
    } else {
        document.getElementById("registerForm").classList.add("hidden");
        document.getElementById("modalLoginForm").classList.remove("hidden");
    }
}

function abrirAuth(modo) {
    abrirModal("authModal");
    cambiarPestanaAuth(modo);
}

document.getElementById("openLogin").addEventListener("click", function () {
    abrirAuth("login");
});

document.getElementById("openRegister").addEventListener("click", function () {
    abrirAuth("register");
});

let botonesCerrar = document.querySelectorAll("[data-close]");
for (let i = 0; i < botonesCerrar.length; i++) {
    botonesCerrar[i].addEventListener("click", function () {
        cerrarModal(this.dataset.close);
    });
}

let pestanasAuth = document.querySelectorAll(".tab");
for (let i = 0; i < pestanasAuth.length; i++) {
    pestanasAuth[i].addEventListener("click", function () {
        cambiarPestanaAuth(this.dataset.auth);
    });
}

function actualizarNav() {
    let cliente = obtenerClienteActivo();
    document.getElementById("openLogin").classList.toggle("hidden", cliente !== null);

    let avatar = document.getElementById("openDashboard");
    avatar.classList.toggle("hidden", cliente === null);
    if (cliente !== null) {
        avatar.textContent = cliente.nombreCompleto.charAt(0).toUpperCase();
    }
}

// ---------- Registro ----------

document.getElementById("registerForm").addEventListener("submit", function (evento) {
    evento.preventDefault();

    let identificacion = document.getElementById("regIdentificacion").value.trim();
    let nombreCompleto = document.getElementById("regNombre").value.trim();
    let celular = document.getElementById("regCelular").value.trim();
    let usuario = document.getElementById("regUsuario").value.trim();
    let clave = document.getElementById("regClave").value;
    let clave2 = document.getElementById("regClave2").value;

    if (identificacion === "" || nombreCompleto === "" || celular === "" || usuario === "") {
        mostrarToast("Todos los campos son obligatorios.");
        return;
    }

    if (clave.length < 4) {
        mostrarToast("La contraseña debe tener al menos 4 caracteres.");
        return;
    }

    if (clave !== clave2) {
        mostrarToast("Las contraseñas no coinciden.");
        return;
    }

    if (existeUsuario(usuario)) {
        mostrarToast("Ese nombre de usuario ya está en uso.");
        return;
    }

    let cliente = new Cliente(identificacion, nombreCompleto, celular, usuario, clave);

    let cuentaAhorros = new CuentaAhorros("AH-" + identificacion, SALDO_BASE);
    cuentaAhorros.registrarMovimiento("Saldo inicial", SALDO_BASE);
    cliente.agregarCuenta(cuentaAhorros);
    cliente.agregarCuenta(new CuentaCorriente("CC-" + identificacion, 0));
    cliente.agregarCuenta(new TarjetaCredito("TC-" + identificacion, CUPO_TARJETA_INICIAL));

    let clientes = cargarClientes();
    clientes.push(cliente);
    guardarClientes(clientes);

    localStorage.setItem(CLAVE_SESION, usuario);
    cerrarModal("authModal");
    actualizarNav();
    abrirDashboard();
    mostrarToast("Cuenta creada. Recibiste $2.000.000 de saldo inicial en tu Cuenta de Ahorros.");
});

// ---------- Inicio de sesión (con bloqueo de 3 intentos) ----------

function intentarLogin(usuario, clave, idContador) {
    let cliente = buscarClientePorUsuario(usuario.trim());

    if (cliente === null) {
        mostrarToast("Usuario o contraseña incorrectos.");
        return;
    }

    if (cliente.bloqueado) {
        mostrarToast("Cuenta bloqueada por 24 horas, comunícate con tu banco.");
        document.getElementById(idContador).textContent = "Cuenta bloqueada.";
        return;
    }

    if (cliente.validarClave(clave)) {
        cliente.reiniciarIntentos();
        actualizarCliente(cliente);

        localStorage.setItem(CLAVE_SESION, cliente.usuario);
        cerrarModal("authModal");
        actualizarNav();
        abrirDashboard();
        mostrarToast("Bienvenido, " + cliente.nombreCompleto.split(" ")[0] + ".");
    } else {
        cliente.registrarIntentoFallido();
        actualizarCliente(cliente);

        if (cliente.bloqueado) {
            mostrarToast("Cuenta bloqueada por 24 horas, comunícate con tu banco.");
            document.getElementById(idContador).textContent = "Cuenta bloqueada.";
        } else {
            mostrarToast("Contraseña incorrecta.");
            document.getElementById(idContador).textContent = "Intentos fallidos: " + cliente.intentosFallidos + " de 3";
        }
    }
}

document.getElementById("loginForm").addEventListener("submit", function (evento) {
    evento.preventDefault();
    let usuario = document.getElementById("loginUsuario").value;
    let clave = document.getElementById("loginClave").value;
    intentarLogin(usuario, clave, "loginContador");
});

document.getElementById("modalLoginForm").addEventListener("submit", function (evento) {
    evento.preventDefault();
    let usuario = document.getElementById("modalLoginUsuario").value;
    let clave = document.getElementById("modalLoginClave").value;
    intentarLogin(usuario, clave, "modalLoginContador");
});

// ---------- Panel (Dashboard) ----------

function abrirDashboard() {
    if (obtenerClienteActivo() === null) {
        abrirAuth("login");
        return;
    }
    abrirModal("dashboardModal");
    mostrarPaginaDashboard("overview");
}

document.getElementById("openDashboard").addEventListener("click", abrirDashboard);

document.getElementById("logoutBtn").addEventListener("click", function () {
    localStorage.removeItem(CLAVE_SESION);
    cerrarModal("dashboardModal");
    actualizarNav();
    mostrarToast("Sesión cerrada.");
});

function mostrarPaginaDashboard(pagina) {
    let paginas = document.querySelectorAll(".dash-page");
    for (let i = 0; i < paginas.length; i++) {
        paginas[i].classList.add("hidden");
    }
    document.getElementById("dash-" + pagina).classList.remove("hidden");

    let enlaces = document.querySelectorAll(".dash-link");
    for (let i = 0; i < enlaces.length; i++) {
        if (enlaces[i].dataset.dash === pagina) {
            enlaces[i].classList.add("active");
        } else {
            enlaces[i].classList.remove("active");
        }
    }

    let cliente = obtenerClienteActivo();
    if (cliente === null) {
        return;
    }

    document.getElementById("welcomeName").textContent = "Hola, " + cliente.nombreCompleto.split(" ")[0];

    if (pagina === "overview") {
        renderizarResumen(cliente);

    } else if (pagina === "movements") {
        renderizarMovimientos(cliente);
    } else if (pagina === "credit") {
        renderizarTarjeta(cliente);
    } else if (pagina === "profile") {
        renderizarPerfil(cliente);
    } else if (pagina === "admin") {
        renderizarAdmin();
    }
}

let enlacesDash = document.querySelectorAll(".dash-link:not(.logout)");
for (let i = 0; i < enlacesDash.length; i++) {
    enlacesDash[i].addEventListener("click", function () {
        mostrarPaginaDashboard(this.dataset.dash);
    });
}

// ---------- Resumen (overview) ----------

function renderizarResumen(cliente) {
    let contenedor = document.getElementById("accountsGrid");
    contenedor.innerHTML = "";

    for (let i = 0; i < cliente.cuentas.length; i++) {
        let cuenta = cliente.cuentas[i];
        let tarjeta = document.createElement("div");
        tarjeta.className = "account-card";

        let montoTexto;
        if (cuenta.obtenerTipo() === "Tarjeta de Crédito") {
            montoTexto = "Deuda: " + formatearDinero(cuenta.saldo) + "<br><small>Disponible: " + formatearDinero(cuenta.obtenerDisponible()) + "</small>";
        } else {
            montoTexto = formatearDinero(cuenta.saldo);
        }

        let ultimoMovimientoTexto = "Sin movimientos aún";
        if (cuenta.movimientos.length > 0) {
            ultimoMovimientoTexto = cuenta.movimientos[0].tipo + " — " + cuenta.movimientos[0].fecha;
        }

        tarjeta.innerHTML =
            "<h4>" + cuenta.obtenerTipo() + "</h4>" +
            "<div class='monto'>" + montoTexto + "</div>" +
            "<div class='ultimo'>" + ultimoMovimientoTexto + "</div>";

        contenedor.appendChild(tarjeta);
    }
}

// ---------- Movimientos ----------

function renderizarMovimientos(cliente) {
    let tipoSeleccionado = document.getElementById("movCuentaSelect").value;
    let cuenta = cliente.buscarCuentaPorTipo(tipoSeleccionado);
    let contenedor = document.getElementById("allMovements");

    if (cuenta === null || cuenta.movimientos.length === 0) {
        contenedor.innerHTML = "<p style='color:#777;font-size:12px'>Aún no hay movimientos en esta cuenta.</p>";
        return;
    }

    let html = "";
    for (let i = 0; i < cuenta.movimientos.length; i++) {
        let movimiento = cuenta.movimientos[i];
        html += "<div class='movement'><span>" + movimiento.tipo + "<br><small>" + movimiento.fecha + "</small></span><strong>" + formatearDinero(movimiento.valor) + "</strong></div>";
    }
    contenedor.innerHTML = html;
}

document.getElementById("movCuentaSelect").addEventListener("change", function () {
    renderizarMovimientos(obtenerClienteActivo());
});

// ---------- Consignar y retirar ----------

// Muestra los campos de consignar o los de retirar según lo elegido
document.getElementById("opTipo").addEventListener("change", function () {
    if (this.value === "consignar") {
        document.getElementById("bloqueConsignar").classList.remove("hidden");
        document.getElementById("bloqueRetirar").classList.add("hidden");
    } else {
        document.getElementById("bloqueConsignar").classList.add("hidden");
        document.getElementById("bloqueRetirar").classList.remove("hidden");
    }
});

document.getElementById("operacionForm").addEventListener("submit", function (evento) {
    evento.preventDefault();

    let cliente = obtenerClienteActivo();
    let tipoOperacion = document.getElementById("opTipo").value;
    let monto = Number(document.getElementById("opMonto").value);
    let mensajeDiv = document.getElementById("opMensaje");

    if (tipoOperacion === "consignar") {
        let datoDestino = document.getElementById("opUsuarioDestino").value.trim();
        let tipoCuenta = document.getElementById("opCuentaDestino").value;

        if (datoDestino === "") {
            mensajeDiv.textContent = "Escribe el usuario o el celular de quien recibe.";
            return;
        }

        if (isNaN(monto) || monto <= 0) {
            mensajeDiv.textContent = "Ingresa un monto válido.";
            return;
        }

        let clienteDestino = buscarClientePorUsuarioOCelular(datoDestino);

        if (clienteDestino === null) {
            mensajeDiv.textContent = "No encontramos ningún usuario con ese dato.";
            return;
        }

        // Como en Nequi: antes de enviar, se muestra a quién le va a llegar el dinero
        let confirmado = confirm("¿Consignar " + formatearDinero(monto) + " a " + clienteDestino.nombreCompleto + "?");
        if (!confirmado) {
            mensajeDiv.textContent = "Operación cancelada.";
            return;
        }

        // Si el destino soy yo, uso el mismo objeto para no pisar los datos al guardar
        if (clienteDestino.usuario === cliente.usuario) {
            clienteDestino = cliente;
        }

        let cuentaDestino = clienteDestino.buscarCuentaPorTipo(tipoCuenta);

        if (cuentaDestino.consignar(monto)) {
            actualizarCliente(clienteDestino);
            if (clienteDestino.usuario === cliente.usuario) {
                mensajeDiv.textContent = "Consignación exitosa. Nuevo saldo: " + formatearDinero(cuentaDestino.saldo);
            } else {
                mensajeDiv.textContent = "Consignación enviada a " + clienteDestino.nombreCompleto + ".";
            }
            mostrarToast("Consignación realizada.");
            document.getElementById("opMonto").value = "";
            document.getElementById("opUsuarioDestino").value = "";
        }
    } else {
        let cuenta = cliente.buscarCuentaPorTipo(document.getElementById("opCuentaRetiro").value);

        if (cuenta.retirar(monto)) {
            actualizarCliente(cliente);
            mensajeDiv.textContent = "Retiro exitoso. Nuevo saldo: " + formatearDinero(cuenta.saldo);
            mostrarToast("Retiro realizado.");
            document.getElementById("opMonto").value = "";
        }
    }
});

// ---------- Transferencias ----------

// Alterna entre "otra cuenta mía" y "otro usuario"
let radiosDestino = document.querySelectorAll("input[name='destinoTipo']");
for (let i = 0; i < radiosDestino.length; i++) {
    radiosDestino[i].addEventListener("change", function () {
        if (this.value === "propia") {
            document.getElementById("bloqueDestinoPropia").classList.remove("hidden");
            document.getElementById("bloqueDestinoOtro").classList.add("hidden");
        } else {
            document.getElementById("bloqueDestinoPropia").classList.add("hidden");
            document.getElementById("bloqueDestinoOtro").classList.remove("hidden");
        }
    });
}

// Aplica una consignación a una cuenta, tratando la Tarjeta de Crédito
// como un abono (reduce deuda) en vez de una consignación normal.
function acreditarACuenta(cuenta, monto) {
    if (cuenta.obtenerTipo() === "Tarjeta de Crédito") {
        return cuenta.abonar(monto);
    }
    return cuenta.consignar(monto);
}

function transferirEntreMisCuentas(cliente, cuentaOrigen, monto) {
    let tipoDestino = document.getElementById("destinoCuentaPropia").value;

    if (tipoDestino === cuentaOrigen.obtenerTipo()) {
        return "No puedes transferir al mismo tipo de producto.";
    }

    let cuentaDestino = cliente.buscarCuentaPorTipo(tipoDestino);

    if (!cuentaOrigen.retirar(monto)) {
        return ""; // el mensaje de error ya lo mostró retirar()
    }

    acreditarACuenta(cuentaDestino, monto);
    actualizarCliente(cliente);
    return "OK:Dinero movido entre tus productos.";
}

function transferirAOtroUsuario(cliente, cuentaOrigen, monto) {
    let usuarioDestino = document.getElementById("destinoUsuario").value.trim();
    let tipoDestino = document.getElementById("destinoTipoCuenta").value;
    let clienteDestino = buscarClientePorUsuarioOCelular(usuarioDestino);

    if (clienteDestino === null) {
        return "No encontramos ningún usuario con ese dato.";
    }

    if (isNaN(monto) || monto <= 0) {
        return "Ingresa un monto válido.";
    }

    if (clienteDestino.usuario === cliente.usuario) {
        return "Para mover dinero a tus propios productos, usa la otra opción.";
    }

    // Como en Nequi: antes de enviar, se muestra a quién le va a llegar el dinero
    if (!confirm("¿Enviar " + formatearDinero(monto) + " a " + clienteDestino.nombreCompleto + "?")) {
        return "Operación cancelada.";
    }

    let cuentaDestino = clienteDestino.buscarCuentaPorTipo(tipoDestino);

    if (!cuentaOrigen.retirar(monto)) {
        return "";
    }

    acreditarACuenta(cuentaDestino, monto);
    actualizarCliente(cliente);
    actualizarCliente(clienteDestino);
    return "OK:Transferencia enviada a " + clienteDestino.nombreCompleto + ".";
}

document.getElementById("transferForm").addEventListener("submit", function (evento) {
    evento.preventDefault();

    let cliente = obtenerClienteActivo();
    let cuentaOrigen = cliente.buscarCuentaPorTipo(document.getElementById("origenCuenta").value);
    let monto = Number(document.getElementById("montoTransferencia").value);
    let mensajeDiv = document.getElementById("transferMensaje");
    let resultado;

    let esPropia = document.querySelector("input[name='destinoTipo']:checked").value === "propia";
    if (esPropia) {
        resultado = transferirEntreMisCuentas(cliente, cuentaOrigen, monto);
    } else {
        resultado = transferirAOtroUsuario(cliente, cuentaOrigen, monto);
    }

    if (resultado.indexOf("OK:") === 0) {
        mensajeDiv.textContent = resultado.substring(3);
        mostrarToast("Transferencia realizada.");
        document.getElementById("montoTransferencia").value = "";
    } else {
        mensajeDiv.textContent = resultado;
    }
});

// ---------- Tarjeta de crédito (compras a cuotas) ----------

function renderizarTarjeta(cliente) {
    let tarjeta = cliente.buscarCuentaPorTipo("Tarjeta de Crédito");
    document.getElementById("creditResumen").textContent =
        "Cupo: " + formatearDinero(tarjeta.cupo) + " · Deuda actual: " + formatearDinero(tarjeta.saldo) + " · Disponible: " + formatearDinero(tarjeta.obtenerDisponible());
}

document.getElementById("creditForm").addEventListener("submit", function (evento) {
    evento.preventDefault();

    let cliente = obtenerClienteActivo();
    let tarjeta = cliente.buscarCuentaPorTipo("Tarjeta de Crédito");

    let monto = Number(document.getElementById("montoCompra").value);
    let cuotas = Number(document.getElementById("cuotasCompra").value);

    let mensajeDiv = document.getElementById("creditMensaje");

    if (tarjeta.comprar(monto, cuotas)) {
        actualizarCliente(cliente);
        mensajeDiv.textContent = "Compra realizada. Cuota mensual estimada: " + formatearDinero(tarjeta.ultimaCuotaCalculada);
        mostrarToast("Compra registrada en tu tarjeta.");
        renderizarTarjeta(cliente);
        document.getElementById("montoCompra").value = "";
    }
});

// ---------- Perfil ----------

function renderizarPerfil(cliente) {
    document.getElementById("profileData").innerHTML =
        "<p><b>Nombre</b>" + cliente.nombreCompleto + "</p>" +
        "<p><b>Identificación</b>" + cliente.identificacion + "</p>" +
        "<p><b>Usuario</b>" + cliente.usuario + "</p>" +
        "<p><b>Celular</b>" + cliente.celular + "</p>";

    document.getElementById("perfilNombre").value = cliente.nombreCompleto;
    document.getElementById("perfilCelular").value = cliente.celular;
}

document.getElementById("perfilForm").addEventListener("submit", function (evento) {
    evento.preventDefault();

    let cliente = obtenerClienteActivo();
    cliente.nombreCompleto = document.getElementById("perfilNombre").value.trim();
    cliente.celular = document.getElementById("perfilCelular").value.trim();

    actualizarCliente(cliente);
    document.getElementById("perfilMensaje").textContent = "Perfil actualizado.";
    renderizarPerfil(cliente);
    actualizarNav();
});

document.getElementById("claveForm").addEventListener("submit", function (evento) {
    evento.preventDefault();

    let cliente = obtenerClienteActivo();
    let actual = document.getElementById("claveActual").value;
    let nueva = document.getElementById("claveNueva").value;
    let nueva2 = document.getElementById("claveNueva2").value;
    let mensajeDiv = document.getElementById("claveMensaje");

    if (nueva !== nueva2) {
        mensajeDiv.textContent = "Las contraseñas nuevas no coinciden.";
        return;
    }

    if (cliente.cambiarClave(actual, nueva)) {
        actualizarCliente(cliente);
        mensajeDiv.textContent = "Contraseña cambiada correctamente.";
        this.reset();
    } else {
        mensajeDiv.textContent = "La contraseña actual no es correcta.";
    }
});

// ---------- Administración de usuarios (CRUD) ----------

function renderizarAdmin() {
    let clientes = cargarClientes();
    let contenedor = document.getElementById("adminLista");

    if (clientes.length === 0) {
        contenedor.innerHTML = "<p style='font-size:12px;color:#777'>No hay usuarios registrados.</p>";
        return;
    }

    let html = "";
    for (let i = 0; i < clientes.length; i++) {
        html += "<div class='admin-row'>" +
            "<span><b>" + clientes[i].nombreCompleto + "</b> — usuario: " + clientes[i].usuario + "</span>" +
            "<span class='admin-botones'>" +
            "<button data-accion='editar' data-usuario='" + clientes[i].usuario + "'>Editar</button>" +
            "<button class='danger' data-accion='eliminar' data-usuario='" + clientes[i].usuario + "'>Eliminar</button>" +
            "</span></div>";
    }
    contenedor.innerHTML = html;
}

document.getElementById("adminLista").addEventListener("click", function (evento) {
    let boton = evento.target.closest("button");
    if (boton === null) {
        return;
    }

    let usuario = boton.dataset.usuario;
    let cliente = buscarClientePorUsuario(usuario);

    if (boton.dataset.accion === "editar") {
        let nuevoNombre = prompt("Nuevo nombre completo:", cliente.nombreCompleto);
        if (nuevoNombre === null || nuevoNombre.trim() === "") {
            return;
        }
        let nuevoCelular = prompt("Nuevo número de celular:", cliente.celular);
        if (nuevoCelular === null || nuevoCelular.trim() === "") {
            return;
        }

        cliente.nombreCompleto = nuevoNombre.trim();
        cliente.celular = nuevoCelular.trim();
        actualizarCliente(cliente);
        mostrarToast("Usuario actualizado.");
        renderizarAdmin();

    } else if (boton.dataset.accion === "eliminar") {
        let confirmado = confirm("¿Seguro que quieres eliminar al usuario \"" + usuario + "\"? Esta acción no se puede deshacer.");
        if (confirmado) {
            eliminarClientePorUsuario(usuario);
            mostrarToast("Usuario eliminado.");
            renderizarAdmin();
        }
    }
});

// ---------- Simulador de créditos (independiente, de la página de inicio) ----------

const tasasPrestamo = { libre: 0.0145, vehiculo: 0.0115, vivienda: 0.0085, estudio: 0.0075, negocio: 0.0125 };

function calcularPrestamo() {
    let tipo = document.getElementById("loanType").value;
    let capital = Number(document.getElementById("loanAmount").value);
    let plazo = Number(document.getElementById("loanTerm").value);
    let tasa = tasasPrestamo[tipo];

    let cuota = capital * tasa / (1 - Math.pow(1 + tasa, -plazo));
    let total = cuota * plazo;

    document.getElementById("monthlyPayment").textContent = formatearDinero(cuota);
    document.getElementById("monthlyRate").textContent = (tasa * 100).toFixed(2) + "%";
    document.getElementById("totalInterest").textContent = formatearDinero(total - capital);
    document.getElementById("totalPay").textContent = formatearDinero(total);
    document.getElementById("termLabel").textContent = plazo + " meses";
}

document.getElementById("loanForm").addEventListener("submit", function (evento) {
    evento.preventDefault();
    calcularPrestamo();
    mostrarToast("Simulación actualizada.");
});
calcularPrestamo();

// ---------- Simulador de inversión ----------

document.getElementById("calcInvestment").addEventListener("click", function () {
    let capital = Number(document.getElementById("invCapital").value);
    let tasa = Number(document.getElementById("invRate").value) / 100;
    let anios = Number(document.getElementById("invYears").value);

    let total = capital * Math.pow(1 + tasa, anios);
    document.getElementById("investmentTotal").textContent = formatearDinero(total);
});
document.getElementById("calcInvestment").click();

// ---------- Otros botones de la landing ----------

document.getElementById("searchBtn").addEventListener("click", function () {
    mostrarToast("Buscador demo: usa el menú para navegar por productos.");
});

let enlacesPagina = document.querySelectorAll("[data-page]");
for (let i = 0; i < enlacesPagina.length; i++) {
    enlacesPagina[i].addEventListener("click", function (evento) {
        let pagina = this.dataset.page;
        if (!pagina || pagina === "home") {
            return;
        }
        evento.preventDefault();
        let seccion = document.getElementById(pagina);
        if (seccion) {
            seccion.scrollIntoView({ behavior: "smooth" });
        }
    });
}

// ---------- Arranque ----------

actualizarNav();
