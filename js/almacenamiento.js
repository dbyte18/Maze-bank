// ======================================================
// Mi Plata — Persistencia en localStorage
// ======================================================
// localStorage solo guarda texto, así que al guardar convertimos
// los clientes a objetos "planos" con convertirClienteAObjeto(), y
// al leerlos los reconstruimos de vuelta a clases reales con
// reconstruirCliente(). Sin esto, los objetos leídos no tendrían
// los métodos de la clase (consignar, retirar, etc.).

const CLAVE_STORAGE = "clientesMiPlataV2";

// ---------- Convertir clases a objetos planos (para guardar) ----------

function convertirCuentaAObjeto(cuenta) {
    let objeto = {
        tipoClase: cuenta.constructor.name, // "CuentaAhorros", "CuentaCorriente", "TarjetaCredito"
        numero: cuenta.numero,
        saldo: cuenta.saldo,
        movimientos: cuenta.movimientos
    };

    if (cuenta.constructor.name === "TarjetaCredito") {
        objeto.cupo = cuenta.cupo;
    }

    return objeto;
}

function convertirClienteAObjeto(cliente) {
    let cuentasPlanas = [];
    for (let i = 0; i < cliente.cuentas.length; i++) {
        cuentasPlanas.push(convertirCuentaAObjeto(cliente.cuentas[i]));
    }

    return {
        identificacion: cliente.identificacion,
        nombreCompleto: cliente.nombreCompleto,
        celular: cliente.celular,
        usuario: cliente.usuario,
        clave: cliente.clave,
        intentosFallidos: cliente.intentosFallidos,
        bloqueado: cliente.bloqueado,
        cuentas: cuentasPlanas
    };
}

// ---------- Reconstruir objetos planos de vuelta a clases ----------

function reconstruirCuenta(objeto) {
    let cuenta;

    if (objeto.tipoClase === "CuentaAhorros") {
        cuenta = new CuentaAhorros(objeto.numero, 0);
    } else if (objeto.tipoClase === "CuentaCorriente") {
        cuenta = new CuentaCorriente(objeto.numero, 0);
    } else if (objeto.tipoClase === "TarjetaCredito") {
        cuenta = new TarjetaCredito(objeto.numero, objeto.cupo);
    } else {
        cuenta = new Cuenta(objeto.numero, 0);
    }

    cuenta.saldo = objeto.saldo;
    cuenta.movimientos = objeto.movimientos;

    return cuenta;
}

function reconstruirCliente(objeto) {
    let cliente = new Cliente(objeto.identificacion, objeto.nombreCompleto, objeto.celular, objeto.usuario, objeto.clave);

    cliente.intentosFallidos = objeto.intentosFallidos;
    cliente.bloqueado = objeto.bloqueado;

    for (let i = 0; i < objeto.cuentas.length; i++) {
        cliente.agregarCuenta(reconstruirCuenta(objeto.cuentas[i]));
    }

    return cliente;
}

// ---------- Funciones públicas que usa el resto de la app ----------

function cargarClientes() {
    let datos = localStorage.getItem(CLAVE_STORAGE);

    if (datos === null) {
        return [];
    }

    let clientesPlanos = JSON.parse(datos);
    let clientes = [];

    for (let i = 0; i < clientesPlanos.length; i++) {
        clientes.push(reconstruirCliente(clientesPlanos[i]));
    }

    return clientes;
}

function guardarClientes(clientes) {
    let clientesPlanos = [];

    for (let i = 0; i < clientes.length; i++) {
        clientesPlanos.push(convertirClienteAObjeto(clientes[i]));
    }

    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(clientesPlanos));
}

function buscarClientePorUsuario(usuario) {
    let clientes = cargarClientes();

    for (let i = 0; i < clientes.length; i++) {
        if (clientes[i].usuario === usuario) {
            return clientes[i];
        }
    }

    return null;
}

// Busca por nombre de usuario O por número de celular (como en Nequi,
// donde el dinero se envía escribiendo el dato de quien recibe).
function buscarClientePorUsuarioOCelular(dato) {
    let clientes = cargarClientes();

    for (let i = 0; i < clientes.length; i++) {
        if (clientes[i].usuario === dato || clientes[i].celular === dato) {
            return clientes[i];
        }
    }

    return null;
}

function existeUsuario(usuario) {
    return buscarClientePorUsuario(usuario) !== null;
}

function actualizarCliente(clienteActualizado) {
    let clientes = cargarClientes();

    for (let i = 0; i < clientes.length; i++) {
        if (clientes[i].usuario === clienteActualizado.usuario) {
            clientes[i] = clienteActualizado;
        }
    }

    guardarClientes(clientes);
}

function eliminarClientePorUsuario(usuario) {
    let clientes = cargarClientes();
    let clientesRestantes = [];

    for (let i = 0; i < clientes.length; i++) {
        if (clientes[i].usuario !== usuario) {
            clientesRestantes.push(clientes[i]);
        }
    }

    guardarClientes(clientesRestantes);
}
