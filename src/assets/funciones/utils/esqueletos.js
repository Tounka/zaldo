export const tipoDeCuentaInput = [
    {label:"Débito", value:"debito"},
    {label:"Crédito", value:"credito"},
    {label:"Inversion", value:"inversion"},
    {label:"Efectivo", value:"efectivo"},
]

export const categoriasEsqueleto = [
    {label:"Gastos Fijos", value:"gastosFijos"},
    {label:"Hogar", value:"hogar"},
    {label:"Servicios", value:"servicios"},
    {label:"Comida", value:"comida"},
    {label:"Transporte", value:"transporte"},
    {label:"Salud", value:"salud"},
    {label:"Entretenimiento", value:"entretenimiento"},
]

export const tipoDeCuentaEsqueletos = {
    debito:{
        campos: ["saldoALaFecha", "fechaDeModificacion", "activo"]
    },
    credito:{
        campos: ["saldoALaFecha", "fechaDeModificacion", "activo", "fechaLimiteDePago"]
    },
    inversion:{
        campos: ["saldoALaFecha", "fechaDeModificacion", "activo", "saldoFinalInversion", "tipoInversion"] //de momento puras inversiones fijas
    }
}