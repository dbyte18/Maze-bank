

// ---------- Clase base: Cuenta ----------
class Cuenta {
    constructor(numero, saldoInicial) {
        this.numero = numero;
        this.saldo = saldoInicial;
        this.movimientos = [];
    }

    // Nombre legible del producto. Cada subclase lo cambia.
    obtenerTipo() {
        return "Cuenta genérica";
    }

    consignar(monto) {
        if (isNaN(monto) || monto <= 0) {
            alert("El monto a consignar debe ser un número positivo.");
            return false;
        }

        this.saldo = this.saldo + monto;
        this.registrarMovimiento("Consignación", monto);
        return true;
    }

    // Polimorfismo: este es el retiro POR DEFECTO. CuentaAhorros y
    // CuentaCorriente sobrescriben este mismo método con sus propias reglas.
    retirar(monto) {
        if (isNaN(monto) || monto <= 0) {
            alert("El monto a retirar debe ser un número positivo.");
            return false;
        }

        if (monto > this.saldo) {
            alert("Fondos insuficientes.");
            return false;
        }

        this.saldo = this.saldo - monto;
        this.registrarMovimiento("Retiro", monto);
        return true;
    }

    registrarMovimiento(tipo, valor) {
        let movimiento = {
            fecha: new Date().toLocaleString("es-CO"),
            tipo: tipo,
            valor: valor,
            saldo: this.saldo
        };
        this.movimientos.unshift(movimiento); // unshift = lo agrega al INICIO del array
    }
}

// ---------- CuentaAhorros (herencia) ----------
class CuentaAhorros extends Cuenta {
    constructor(numero, saldoInicial) {
        super(numero, saldoInicial);
        this.tasaInteres = 0.015; // 1.5% mensual
    }

    obtenerTipo() {
        return "Cuenta de Ahorros";
    }

    // Polimorfismo: esta versión de retirar() aplica el interés del 1.5%
    retirar(monto) {
        if (isNaN(monto) || monto <= 0) {
            alert("El monto a retirar debe ser un número positivo.");
            return false;
        }

        if (monto > this.saldo) {
            alert("Fondos insuficientes. No puedes retirar más del saldo disponible.");
            return false;
        }

        let interes = monto * this.tasaInteres;
        this.saldo = this.saldo - monto - interes;
        this.registrarMovimiento("Retiro (interés: $" + Math.round(interes) + ")", monto);
        return true;
    }
}

// ---------- CuentaCorriente (herencia) ----------
class CuentaCorriente extends Cuenta {
    constructor(numero, saldoInicial) {
        super(numero, saldoInicial);
        this.porcentajeSobregiro = 0.2; // 20%
    }

    obtenerTipo() {
        return "Cuenta Corriente";
    }

    // Polimorfismo: esta versión de retirar() permite sobregiro del 20%
    retirar(monto) {
        if (isNaN(monto) || monto <= 0) {
            alert("El monto a retirar debe ser un número positivo.");
            return false;
        }

        let limite = this.saldo + (this.saldo * this.porcentajeSobregiro);

        if (monto > limite) {
            alert("Supera el límite permitido con sobregiro incluido ($" + Math.round(limite) + ").");
            return false;
        }

        this.saldo = this.saldo - monto;
        this.registrarMovimiento("Retiro", monto);
        return true;
    }
}

// ---------- TarjetaCredito (herencia) ----------
// Aquí "saldo" representa la DEUDA actual, no dinero disponible propio.
class TarjetaCredito extends Cuenta {
    constructor(numero, cupo) {
        super(numero, 0);
        this.cupo = cupo;
    }

    obtenerTipo() {
        return "Tarjeta de Crédito";
    }

    obtenerDisponible() {
        return this.cupo - this.saldo;
    }

    // Regla de negocio del documento: la tasa depende del número de cuotas
    obtenerTasaPorCuotas(cuotas) {
        if (cuotas <= 2) {
            return 0;
        } else if (cuotas <= 6) {
            return 0.019;
        } else {
            return 0.023;
        }
    }

    // Fórmula del documento: Cuota = (Capital x tasa) / (1 - (1+tasa)^(-n))
    calcularCuotaMensual(monto, cuotas) {
        let tasa = this.obtenerTasaPorCuotas(cuotas);

        if (tasa === 0) {
            return monto / cuotas;
        }

        return (monto * tasa) / (1 - Math.pow(1 + tasa, -cuotas));
    }

    // "Comprar" es el equivalente a un retiro, pero genera deuda en vez
    // de descontar dinero propio.
    comprar(monto, cuotas) {
        if (isNaN(monto) || monto <= 0) {
            alert("El monto de la compra debe ser un número positivo.");
            return false;
        }

        if (monto > this.obtenerDisponible()) {
            alert("Supera tu cupo disponible ($" + Math.round(this.obtenerDisponible()) + ").");
            return false;
        }

        let cuotaMensual = this.calcularCuotaMensual(monto, cuotas);

        this.saldo = this.saldo + monto; // aumenta la deuda
        this.registrarMovimiento("Compra a " + cuotas + " cuota(s) de $" + Math.round(cuotaMensual), monto);
        this.ultimaCuotaCalculada = cuotaMensual;

        return true;
    }

    // Un abono a la tarjeta reduce la deuda (nunca por debajo de 0)
    abonar(monto) {
        if (isNaN(monto) || monto <= 0) {
            return false;
        }
        let nuevoSaldo = this.saldo - monto;
        if (nuevoSaldo < 0) {
            nuevoSaldo = 0;
        }
        this.saldo = nuevoSaldo;
        this.registrarMovimiento("Abono recibido", monto);
        return true;
    }
}

// ---------- Cliente ----------
class Cliente {
    constructor(identificacion, nombreCompleto, celular, usuario, clave) {
        this.identificacion = identificacion;
        this.nombreCompleto = nombreCompleto;
        this.celular = celular;
        this.usuario = usuario;
        this.clave = clave;
        this.intentosFallidos = 0;
        this.bloqueado = false;
        this.cuentas = [];
    }

    agregarCuenta(cuenta) {
        this.cuentas.push(cuenta);
    }

    buscarCuentaPorTipo(nombreTipo) {
        for (let i = 0; i < this.cuentas.length; i++) {
            if (this.cuentas[i].obtenerTipo() === nombreTipo) {
                return this.cuentas[i];
            }
        }
        return null;
    }

    validarClave(clave) {
        return this.clave === clave;
    }

    registrarIntentoFallido() {
        this.intentosFallidos = this.intentosFallidos + 1;
        if (this.intentosFallidos >= 3) {
            this.bloqueado = true;
        }
    }

    reiniciarIntentos() {
        this.intentosFallidos = 0;
    }

    cambiarClave(claveActual, claveNueva) {
        if (!this.validarClave(claveActual)) {
            return false;
        }
        this.clave = claveNueva;
        return true;
    }
}
