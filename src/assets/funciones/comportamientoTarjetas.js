export const manejarTarjetas = (tarjeta) => {
    if (!tarjeta || typeof tarjeta.tipoDeCuenta === 'undefined' || typeof tarjeta.saldoALaFecha === 'undefined') {
   
        return tarjeta; 
    }

    if (tarjeta.tipoDeCuenta === "credito") {
        return {
            ...tarjeta, // Copia todas las propiedades del objeto original
            saldoALaFecha: tarjeta.saldoALaFecha * -1, // Modifica solo el saldo
            saldoALaFechaMSI: tarjeta?.saldoALaFechaMSI * -1 // Modifica solo el saldo
        };
    }

    return tarjeta;
};