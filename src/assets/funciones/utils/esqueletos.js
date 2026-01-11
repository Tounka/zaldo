export const tipoDeCuentaInput = [
    {label:"Débito", value:"debito"},
    {label:"Crédito", value:"credito"},
    {label:"Inversion", value:"inversion"},
    {label:"Efectivo", value:"efectivo"},
]

export const categoriasEsqueleto = [
  { label: "Gastos Fijos", value: "gastosFijos" },
  { label: "Hogar", value: "hogar" },
  { label: "Comida", value: "comida" },
  { label: "Transporte", value: "transporte" },
  { label: "Entretenimiento", value: "entretenimiento" },
  { label: "Salud", value: "salud" },
  { label: "Personal", value: "personal" },
  { label: "Educación", value: "educacion" },
  { label: "Servicios", value: "servicios" },
  { label: "Ahorro", value: "ahorro" },
  { label: "Deudas", value: "deudas" },
];

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