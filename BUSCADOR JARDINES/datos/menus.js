/**
 * ==========================================================================
 * MENÚS DE JARDINES MATERNALES Y DISPOSITIVOS - menus.js
 * Generado automáticamente desde "2026_JM_Y_DISPOSITIVOS.xlsx" (08/10/2026).
 * Pestañas: GR COMEDOR, JM REFUERZO, GR DM JM, DM GR DISP, COM GR DISP, DM ESPERANZA.
 * Desayuno/merienda de escuelas (EP, EES, JI) por proveedor (dmGeneral): pestaña
 * "DM GR AGOSTO" de "2026_PRESTACIONES_PBA.xlsx" (26/08/2026). Un 0 significa que
 * ese nivel no recibe ese alimento.
 * Desayuno/merienda de las secciones maternales de los JI (dmMaternal): pestaña
 * "DM GR MATERNAL" del mismo archivo, con dos tablas: "1-2" (1 a 2 años) y
 * "7-12" (7 a 12 meses). "c/n" = cantidad necesaria (se envía a granel).
 * Para actualizar los menús, volver a generar este archivo con la planilla nueva.
 * Requiere data.js cargado antes.
 * ==========================================================================
 */
const SAE_MENUS_DATA = {
 "origen": "2026_JM_Y_DISPOSITIVOS.xlsx",
 "dmMaternal": {
  "1-2": {
   "Lunes": {
    "lista": "Lista 1",
    "nombre": "Leche + pancakes de naranja",
    "ingredientes": [
     {
      "alimento": "Leche fluida LV",
      "unidad": "ml",
      "gramaje": 120
     },
     {
      "alimento": "Harina de trigo leudante",
      "unidad": "g",
      "gramaje": 50
     },
     {
      "alimento": "Huevo",
      "unidad": "g",
      "gramaje": 15
     },
     {
      "alimento": "Esencia de vainilla",
      "unidad": "ml",
      "gramaje": "c/n"
     },
     {
      "alimento": "Aceite de girasol",
      "unidad": "ml",
      "gramaje": "c/n"
     },
     {
      "alimento": "Naranja",
      "unidad": "g",
      "gramaje": 80
     }
    ]
   },
   "Martes": {
    "lista": "Lista 2",
    "nombre": "Leche + figaza de salvado con queso cremoso",
    "ingredientes": [
     {
      "alimento": "Leche fluida LV",
      "unidad": "ml",
      "gramaje": 120
     },
     {
      "alimento": "Figaza de salvado",
      "unidad": "g",
      "gramaje": 40
     },
     {
      "alimento": "Queso cremoso",
      "unidad": "g",
      "gramaje": 20
     }
    ]
   },
   "Miércoles": {
    "lista": "Lista 3",
    "nombre": "Leche + pancakes de manzana",
    "ingredientes": [
     {
      "alimento": "Leche fluida LV",
      "unidad": "ml",
      "gramaje": 120
     },
     {
      "alimento": "Harina de trigo leudante",
      "unidad": "g",
      "gramaje": 50
     },
     {
      "alimento": "Huevo",
      "unidad": "g",
      "gramaje": 15
     },
     {
      "alimento": "Manzana",
      "unidad": "g",
      "gramaje": 80
     }
    ]
   },
   "Jueves": {
    "lista": "Lista 4",
    "nombre": "Leche + figaza de salvado con queso cremoso + naranja",
    "ingredientes": [
     {
      "alimento": "Leche fluida LV",
      "unidad": "ml",
      "gramaje": 120
     },
     {
      "alimento": "Figaza de salvado",
      "unidad": "g",
      "gramaje": 40
     },
     {
      "alimento": "Queso cremoso",
      "unidad": "g",
      "gramaje": 20
     },
     {
      "alimento": "Naranja",
      "unidad": "g",
      "gramaje": 100
     }
    ]
   },
   "Viernes": {
    "lista": "Lista 5",
    "nombre": "Leche + pancakes de manzana",
    "ingredientes": [
     {
      "alimento": "Leche fluida LV",
      "unidad": "ml",
      "gramaje": 120
     },
     {
      "alimento": "Harina de trigo leudante",
      "unidad": "g",
      "gramaje": 50
     },
     {
      "alimento": "Huevo",
      "unidad": "g",
      "gramaje": 15
     },
     {
      "alimento": "Esencia de vainilla",
      "unidad": "ml",
      "gramaje": "c/n"
     },
     {
      "alimento": "Aceite de girasol",
      "unidad": "ml",
      "gramaje": "c/n"
     },
     {
      "alimento": "Manzana",
      "unidad": "g",
      "gramaje": 80
     }
    ]
   }
  },
  "7-12": {
   "Lunes": {
    "lista": "Lista 1",
    "nombre": "Pancakes de naranja",
    "ingredientes": [
     {
      "alimento": "Leche de fórmula",
      "unidad": "g",
      "gramaje": 32
     },
     {
      "alimento": "Harina de trigo leudante",
      "unidad": "g",
      "gramaje": 50
     },
     {
      "alimento": "Huevo",
      "unidad": "g",
      "gramaje": 15
     },
     {
      "alimento": "Esencia de vainilla",
      "unidad": "ml",
      "gramaje": "c/n"
     },
     {
      "alimento": "Aceite de girasol",
      "unidad": "g",
      "gramaje": 5
     },
     {
      "alimento": "Naranja",
      "unidad": "g",
      "gramaje": 80
     }
    ]
   },
   "Martes": {
    "lista": "Lista 2",
    "nombre": "Figaza de salvado con huevo revuelto + pera",
    "ingredientes": [
     {
      "alimento": "Leche de fórmula",
      "unidad": "g",
      "gramaje": 32
     },
     {
      "alimento": "Figaza de salvado",
      "unidad": "g",
      "gramaje": 40
     },
     {
      "alimento": "Huevo",
      "unidad": "g",
      "gramaje": 25
     },
     {
      "alimento": "Aceite de girasol",
      "unidad": "g",
      "gramaje": 5
     },
     {
      "alimento": "Pera",
      "unidad": "g",
      "gramaje": 100
     }
    ]
   },
   "Miércoles": {
    "lista": "Lista 3",
    "nombre": "Pancakes de manzana",
    "ingredientes": [
     {
      "alimento": "Leche de fórmula",
      "unidad": "g",
      "gramaje": 32
     },
     {
      "alimento": "Harina de trigo leudante",
      "unidad": "g",
      "gramaje": 50
     },
     {
      "alimento": "Huevo",
      "unidad": "g",
      "gramaje": 15
     },
     {
      "alimento": "Aceite de girasol",
      "unidad": "g",
      "gramaje": 5
     },
     {
      "alimento": "Manzana",
      "unidad": "g",
      "gramaje": 80
     }
    ]
   },
   "Jueves": {
    "lista": "Lista 4",
    "nombre": "Figaza de salvado con huevo revuelto + naranja",
    "ingredientes": [
     {
      "alimento": "Leche de fórmula",
      "unidad": "g",
      "gramaje": 32
     },
     {
      "alimento": "Figaza de salvado",
      "unidad": "g",
      "gramaje": 40
     },
     {
      "alimento": "Huevo",
      "unidad": "g",
      "gramaje": 25
     },
     {
      "alimento": "Aceite de girasol",
      "unidad": "g",
      "gramaje": 5
     },
     {
      "alimento": "Naranja",
      "unidad": "g",
      "gramaje": 100
     }
    ]
   },
   "Viernes": {
    "lista": "Lista 5",
    "nombre": "Budín de manzana",
    "ingredientes": [
     {
      "alimento": "Leche de fórmula",
      "unidad": "g",
      "gramaje": 32
     },
     {
      "alimento": "Harina de trigo leudante",
      "unidad": "g",
      "gramaje": 50
     },
     {
      "alimento": "Huevo",
      "unidad": "g",
      "gramaje": 15
     },
     {
      "alimento": "Aceite de girasol",
      "unidad": "g",
      "gramaje": 8
     },
     {
      "alimento": "Manzana",
      "unidad": "g",
      "gramaje": 80
     }
    ]
   }
  }
 },
 "dmGeneral": {
  "GYULAND": {
   "Lunes": {
    "lista": "Lista 1",
    "nombre": "Leche con cacao + Galletitas dulces/ marineras",
    "ingredientes": [
     {
      "alimento": "Leche fluida LV",
      "unidad": "ml",
      "jardin": 120,
      "primaria": 130,
      "secundaria": 140
     },
     {
      "alimento": "Cacao",
      "unidad": "g",
      "jardin": 15,
      "primaria": 15,
      "secundaria": 15
     },
     {
      "alimento": "Galletitas dulces / marineras",
      "unidad": "g",
      "jardin": 30,
      "primaria": 50,
      "secundaria": 65
     }
    ]
   },
   "Martes": {
    "lista": "Lista 2",
    "nombre": "Leche con infusión + figaza con dulce de leche",
    "ingredientes": [
     {
      "alimento": "Leche fluida LV",
      "unidad": "ml",
      "jardin": 120,
      "primaria": 130,
      "secundaria": 140
     },
     {
      "alimento": "Azúcar",
      "unidad": "g",
      "jardin": 5,
      "primaria": 5,
      "secundaria": 5
     },
     {
      "alimento": "Infusión (mate cocido / té)",
      "unidad": "saquito",
      "jardin": 1,
      "primaria": 1,
      "secundaria": 1
     },
     {
      "alimento": "Pan",
      "unidad": "g",
      "jardin": 40,
      "primaria": 50,
      "secundaria": 65
     },
     {
      "alimento": "Dulce de leche",
      "unidad": "g",
      "jardin": 10,
      "primaria": 15,
      "secundaria": 20
     }
    ]
   },
   "Miércoles": {
    "lista": "Lista 3",
    "nombre": "Leche con infusión + librito + mandarina",
    "ingredientes": [
     {
      "alimento": "Leche fluida LV",
      "unidad": "ml",
      "jardin": 120,
      "primaria": 130,
      "secundaria": 140
     },
     {
      "alimento": "Infusión (mate cocido / té)",
      "unidad": "saquito",
      "jardin": 1,
      "primaria": 1,
      "secundaria": 1
     },
     {
      "alimento": "Azúcar",
      "unidad": "g",
      "jardin": 5,
      "primaria": 5,
      "secundaria": 5
     },
     {
      "alimento": "Librito",
      "unidad": "g",
      "jardin": 40,
      "primaria": 50,
      "secundaria": 80
     },
     {
      "alimento": "Mandarina",
      "unidad": "g",
      "jardin": 200,
      "primaria": 200,
      "secundaria": 200
     }
    ]
   },
   "Jueves": {
    "lista": "Lista 4",
    "nombre": "Infusión cortada + figaza con queso fresco + cítrico",
    "ingredientes": [
     {
      "alimento": "Infusión (mate cocido / té)",
      "unidad": "saquito",
      "jardin": 1,
      "primaria": 1,
      "secundaria": 1
     },
     {
      "alimento": "Leche fluida LV",
      "unidad": "ml",
      "jardin": 40,
      "primaria": 50,
      "secundaria": 0
     },
     {
      "alimento": "Azúcar",
      "unidad": "g",
      "jardin": 5,
      "primaria": 5,
      "secundaria": 5
     },
     {
      "alimento": "Pan",
      "unidad": "g",
      "jardin": 50,
      "primaria": 50,
      "secundaria": 65
     },
     {
      "alimento": "Queso fresco",
      "unidad": "g",
      "jardin": 20,
      "primaria": 30,
      "secundaria": 40
     },
     {
      "alimento": "Naranja / mandarina",
      "unidad": "g",
      "jardin": 200,
      "primaria": 200,
      "secundaria": 200
     }
    ]
   },
   "Viernes": {
    "lista": "Lista 5",
    "nombre": "Leche con infusión + figaza con dulce de leche + manzana/Banana",
    "ingredientes": [
     {
      "alimento": "Leche fluida LV",
      "unidad": "ml",
      "jardin": 120,
      "primaria": 130,
      "secundaria": 140
     },
     {
      "alimento": "Azúcar",
      "unidad": "g",
      "jardin": 5,
      "primaria": 5,
      "secundaria": 5
     },
     {
      "alimento": "Infusión (mate cocido / té)",
      "unidad": "saquito",
      "jardin": 1,
      "primaria": 1,
      "secundaria": 1
     },
     {
      "alimento": "Pan",
      "unidad": "g",
      "jardin": 40,
      "primaria": 50,
      "secundaria": 65
     },
     {
      "alimento": "Dulce de leche",
      "unidad": "g",
      "jardin": 10,
      "primaria": 15,
      "secundaria": 20
     },
     {
      "alimento": "Manzana / banana",
      "unidad": "g",
      "jardin": 200,
      "primaria": 200,
      "secundaria": 200
     }
    ]
   }
  },
  "GRUPO L": {
   "Lunes": {
    "lista": "Lista 1",
    "nombre": "Leche con cacao + Galletitas dulces/ marineras",
    "ingredientes": [
     {
      "alimento": "Leche fluida LV",
      "unidad": "ml",
      "jardin": 120,
      "primaria": 125,
      "secundaria": 140
     },
     {
      "alimento": "Cacao",
      "unidad": "g",
      "jardin": 15,
      "primaria": 15,
      "secundaria": 15
     },
     {
      "alimento": "Galletitas dulces / marineras",
      "unidad": "g",
      "jardin": 30,
      "primaria": 50,
      "secundaria": 65
     }
    ]
   },
   "Martes": {
    "lista": "Lista 2",
    "nombre": "Leche con infusión + figaza con dulce de leche",
    "ingredientes": [
     {
      "alimento": "Leche fluida LV",
      "unidad": "ml",
      "jardin": 120,
      "primaria": 125,
      "secundaria": 140
     },
     {
      "alimento": "Azúcar",
      "unidad": "g",
      "jardin": 5,
      "primaria": 5,
      "secundaria": 5
     },
     {
      "alimento": "Infusión (mate cocido / té)",
      "unidad": "saquito",
      "jardin": 0.5,
      "primaria": 0.5,
      "secundaria": 0.5
     },
     {
      "alimento": "Pan",
      "unidad": "g",
      "jardin": 40,
      "primaria": 45,
      "secundaria": 70
     },
     {
      "alimento": "Dulce de leche",
      "unidad": "g",
      "jardin": 10,
      "primaria": 15,
      "secundaria": 20
     }
    ]
   },
   "Miércoles": {
    "lista": "Lista 3",
    "nombre": "Leche con infusión + librito + mandarina",
    "ingredientes": [
     {
      "alimento": "Leche fluida LV",
      "unidad": "ml",
      "jardin": 120,
      "primaria": 125,
      "secundaria": 140
     },
     {
      "alimento": "Infusión (mate cocido / té)",
      "unidad": "saquito",
      "jardin": 0.5,
      "primaria": 0.5,
      "secundaria": 0.5
     },
     {
      "alimento": "Librito",
      "unidad": "g",
      "jardin": 35,
      "primaria": 45,
      "secundaria": 75
     },
     {
      "alimento": "Mandarina",
      "unidad": "g",
      "jardin": 80,
      "primaria": 80,
      "secundaria": 80
     }
    ]
   },
   "Jueves": {
    "lista": "Lista 4",
    "nombre": "Infusión cortada + figaza con queso fresco + cítrico",
    "ingredientes": [
     {
      "alimento": "Infusión (mate cocido / té)",
      "unidad": "saquito",
      "jardin": 0.5,
      "primaria": 0.5,
      "secundaria": 0.5
     },
     {
      "alimento": "Leche fluida LV",
      "unidad": "ml",
      "jardin": 40,
      "primaria": 50,
      "secundaria": 0
     },
     {
      "alimento": "Pan",
      "unidad": "g",
      "jardin": 40,
      "primaria": 45,
      "secundaria": 70
     },
     {
      "alimento": "Queso fresco",
      "unidad": "g",
      "jardin": 20,
      "primaria": 30,
      "secundaria": 40
     },
     {
      "alimento": "Naranja / mandarina",
      "unidad": "g",
      "jardin": 50,
      "primaria": 50,
      "secundaria": 50
     }
    ]
   },
   "Viernes": {
    "lista": "Lista 5",
    "nombre": "Leche con infusión + figaza con dulce de leche + manzana/Banana",
    "ingredientes": [
     {
      "alimento": "Leche fluida LV",
      "unidad": "ml",
      "jardin": 120,
      "primaria": 125,
      "secundaria": 140
     },
     {
      "alimento": "Azúcar",
      "unidad": "g",
      "jardin": 5,
      "primaria": 5,
      "secundaria": 5
     },
     {
      "alimento": "Infusión (mate cocido / té)",
      "unidad": "saquito",
      "jardin": 1,
      "primaria": 1,
      "secundaria": 1
     },
     {
      "alimento": "Pan",
      "unidad": "g",
      "jardin": 35,
      "primaria": 45,
      "secundaria": 70
     },
     {
      "alimento": "Dulce de leche",
      "unidad": "g",
      "jardin": 10,
      "primaria": 15,
      "secundaria": 20
     },
     {
      "alimento": "Manzana / banana",
      "unidad": "g",
      "jardin": 50,
      "primaria": 50,
      "secundaria": 50
     }
    ]
   }
  }
 },
 "comedorJM": {
  "Lunes": [
   {
    "lista": "Lista 1",
    "nombre": "FIDEOS CORTOS CON SALSA FILETO + FRUTA",
    "ingredientes": [
     {
      "alimento": "Fideos tirabuzón",
      "unidad": "g",
      "gramaje": 70.0
     },
     {
      "alimento": "Cebolla",
      "unidad": "g",
      "gramaje": 25.0
     },
     {
      "alimento": "Zanahoria",
      "unidad": "g",
      "gramaje": 20.0
     },
     {
      "alimento": "Tomate triturado",
      "unidad": "g",
      "gramaje": 50.0
     },
     {
      "alimento": "Queso cremoso",
      "unidad": "g",
      "gramaje": 10.0
     },
     {
      "alimento": "Manzana",
      "unidad": "g",
      "gramaje": 150.0
     }
    ]
   },
   {
    "lista": "Lista 6",
    "nombre": "FIDEOS CORTOS CON SALSA FILETO + FRUTA",
    "ingredientes": [
     {
      "alimento": "Fideos tirabuzón",
      "unidad": "g",
      "gramaje": 70.0
     },
     {
      "alimento": "Cebolla",
      "unidad": "g",
      "gramaje": 20.0
     },
     {
      "alimento": "Zanahoria",
      "unidad": "g",
      "gramaje": 15.0
     },
     {
      "alimento": "Tomate triturado",
      "unidad": "g",
      "gramaje": 50.0
     },
     {
      "alimento": "Queso cremoso",
      "unidad": "g",
      "gramaje": 10.0
     },
     {
      "alimento": "Manzana",
      "unidad": "g",
      "gramaje": 150.0
     }
    ]
   }
  ],
  "Martes": [
   {
    "lista": "Lista 2",
    "nombre": "EMPANADA DE POLLO + FRUTA",
    "ingredientes": [
     {
      "alimento": "Tapas de empanadas",
      "unidad": "u",
      "gramaje": 3.0
     },
     {
      "alimento": "Pollo",
      "unidad": "g",
      "gramaje": 200.0,
      "nota": "neto 120"
     },
     {
      "alimento": "Huevo",
      "unidad": "g",
      "gramaje": 30.0
     },
     {
      "alimento": "Cebolla",
      "unidad": "g",
      "gramaje": 30.0
     },
     {
      "alimento": "Zapallito",
      "unidad": "g",
      "gramaje": 40.0
     },
     {
      "alimento": "Tomate triturado",
      "unidad": "g",
      "gramaje": 30.0
     },
     {
      "alimento": "Manzana",
      "unidad": "g",
      "gramaje": 100.0
     }
    ]
   },
   {
    "lista": "Lista 7",
    "nombre": "RISOTO DE CALABAZA Y POLLO + FRUTA",
    "ingredientes": [
     {
      "alimento": "Arroz",
      "unidad": "g",
      "gramaje": 60.0
     },
     {
      "alimento": "Cebolla",
      "unidad": "g",
      "gramaje": 30.0
     },
     {
      "alimento": "Pollo entero",
      "unidad": "g",
      "gramaje": 140.0,
      "nota": "neto 80"
     },
     {
      "alimento": "Zapallo",
      "unidad": "g",
      "gramaje": 70.0
     },
     {
      "alimento": "Queso fresco",
      "unidad": "g",
      "gramaje": 15.0
     },
     {
      "alimento": "Manzana",
      "unidad": "g",
      "gramaje": 150.0
     }
    ]
   }
  ],
  "Miércoles": [
   {
    "lista": "Lista 3",
    "nombre": "MILANESA DE CARNE CON PURE MIXTO + FRUTA",
    "ingredientes": [
     {
      "alimento": "Emince de carne",
      "unidad": "g",
      "gramaje": 120.0
     },
     {
      "alimento": "Pan rallado",
      "unidad": "g",
      "gramaje": 30.0
     },
     {
      "alimento": "Huevos",
      "unidad": "g",
      "gramaje": 20.0
     },
     {
      "alimento": "Papa",
      "unidad": "g",
      "gramaje": 140.0
     },
     {
      "alimento": "Calabaza",
      "unidad": "g",
      "gramaje": 40.0
     },
     {
      "alimento": "Cítrico",
      "unidad": "g",
      "gramaje": 150.0
     }
    ]
   },
   {
    "lista": "Lista 8",
    "nombre": "MILANESA DE CARNE CON PURE + FRUTA",
    "ingredientes": [
     {
      "alimento": "Emince de carne",
      "unidad": "g",
      "gramaje": 120.0
     },
     {
      "alimento": "Pan rallado",
      "unidad": "g",
      "gramaje": 30.0
     },
     {
      "alimento": "Huevos",
      "unidad": "g",
      "gramaje": 20.0
     },
     {
      "alimento": "Papa",
      "unidad": "g",
      "gramaje": 200.0
     },
     {
      "alimento": "Cítrico",
      "unidad": "g",
      "gramaje": 100.0
     }
    ]
   }
  ],
  "Jueves": [
   {
    "lista": "Lista 4",
    "nombre": "ARROZ CON ESTOFADO DE POLLO + FRUTA",
    "ingredientes": [
     {
      "alimento": "Pollo",
      "unidad": "g",
      "gramaje": 150.0,
      "nota": "neto 90"
     },
     {
      "alimento": "Arroz",
      "unidad": "g",
      "gramaje": 60.0
     },
     {
      "alimento": "Batata",
      "unidad": "g",
      "gramaje": 40.0
     },
     {
      "alimento": "Zapallo",
      "unidad": "g",
      "gramaje": 50.0
     },
     {
      "alimento": "Cebolla",
      "unidad": "g",
      "gramaje": 20.0
     },
     {
      "alimento": "Tomate triturado",
      "unidad": "g",
      "gramaje": 50.0
     },
     {
      "alimento": "Banana",
      "unidad": "g",
      "gramaje": 100.0
     }
    ]
   },
   {
    "lista": "Lista 9",
    "nombre": "GUISO DE ARROZ CON ENTEJAS Y POLLO + FRUTA",
    "ingredientes": [
     {
      "alimento": "Arroz",
      "unidad": "g",
      "gramaje": 60.0
     },
     {
      "alimento": "Lenteja",
      "unidad": "g",
      "gramaje": 20.0
     },
     {
      "alimento": "Cebolla",
      "unidad": "g",
      "gramaje": 20.0
     },
     {
      "alimento": "Pollo",
      "unidad": "g",
      "gramaje": 140.0,
      "nota": "neto 80"
     },
     {
      "alimento": "Calabaza",
      "unidad": "g",
      "gramaje": 40.0
     },
     {
      "alimento": "Tomate triturado",
      "unidad": "g",
      "gramaje": 50.0
     },
     {
      "alimento": "Banana",
      "unidad": "g",
      "gramaje": 150.0
     }
    ]
   }
  ],
  "Viernes": [
   {
    "lista": "Lista 5",
    "nombre": "PIZZA NAPOLITANA + POSTRE DE MAICENA",
    "ingredientes": [
     {
      "alimento": "Harina 000",
      "unidad": "g",
      "gramaje": 60.0
     },
     {
      "alimento": "Levadura en polvo",
      "unidad": "g",
      "gramaje": 0.5
     },
     {
      "alimento": "Queso fresco",
      "unidad": "g",
      "gramaje": 50.0
     },
     {
      "alimento": "Sal",
      "unidad": "g",
      "gramaje": 0.5,
      "nota": "0.5"
     },
     {
      "alimento": "Tomate",
      "unidad": "g",
      "gramaje": 20.0
     },
     {
      "alimento": "Tomate triturado",
      "unidad": "g",
      "gramaje": 25.0
     },
     {
      "alimento": "Leche",
      "unidad": "ml",
      "gramaje": 100.0
     },
     {
      "alimento": "Maicena",
      "unidad": "g",
      "gramaje": 7.0
     },
     {
      "alimento": "Azúcar",
      "unidad": "g",
      "gramaje": 7.0
     },
     {
      "alimento": "Esencia de vainilla",
      "unidad": "ml",
      "gramaje": 0.005
     }
    ]
   },
   {
    "lista": "Lista 10",
    "nombre": "PIZZA CON HUEVO + POSTRE DE MAICENA",
    "ingredientes": [
     {
      "alimento": "Harina 000",
      "unidad": "g",
      "gramaje": 60.0
     },
     {
      "alimento": "Levadura en polvo",
      "unidad": "g",
      "gramaje": 0.5
     },
     {
      "alimento": "Queso fresco",
      "unidad": "g",
      "gramaje": 50.0
     },
     {
      "alimento": "Sal",
      "unidad": "g",
      "gramaje": 0.5,
      "nota": "0.5"
     },
     {
      "alimento": "Huevo",
      "unidad": "g",
      "gramaje": 25.0
     },
     {
      "alimento": "Tomate triturado",
      "unidad": "g",
      "gramaje": 25.0
     },
     {
      "alimento": "Leche",
      "unidad": "ml",
      "gramaje": 100.0
     },
     {
      "alimento": "Maicena",
      "unidad": "g",
      "gramaje": 7.0
     },
     {
      "alimento": "Azúcar",
      "unidad": "g",
      "gramaje": 7.0
     },
     {
      "alimento": "Esencia de vainilla",
      "unidad": "ml",
      "gramaje": 0.005
     }
    ]
   }
  ]
 },
 "refuerzo": {
  "EDEAL": {
   "Lunes": [
    {
     "lista": "Lista 1",
     "nombre": "SANDWICH DE MILANESA",
     "ingredientes": [
      {
       "alimento": "Milanesas apanadas",
       "unidad": "g",
       "gramaje": 70.0
      },
      {
       "alimento": "Figaza",
       "unidad": "u",
       "gramaje": 1.0
      }
     ]
    },
    {
     "lista": "Lista 4",
     "nombre": "SANDWICH DE MILANESA",
     "ingredientes": [
      {
       "alimento": "Milanesas apanadas",
       "unidad": "g",
       "gramaje": 70.0
      },
      {
       "alimento": "Huevo",
       "unidad": "g",
       "gramaje": 20.0
      },
      {
       "alimento": "Figaza",
       "unidad": "u",
       "gramaje": 1.0
      }
     ]
    }
   ],
   "Miércoles": [
    {
     "lista": "Lista 2",
     "nombre": "TARTA DE QUESO Y HUEVO",
     "ingredientes": [
      {
       "alimento": "Tapa de tarta",
       "unidad": "g",
       "gramaje": 60.0
      },
      {
       "alimento": "Queso fresco",
       "unidad": "g",
       "gramaje": 50.0
      },
      {
       "alimento": "Huevo",
       "unidad": "g",
       "gramaje": 25.0
      }
     ]
    },
    {
     "lista": "Lista 5",
     "nombre": "TARTA DE QUESO Y HUEVO",
     "ingredientes": [
      {
       "alimento": "Tapa de tarta",
       "unidad": "g",
       "gramaje": 60.0
      },
      {
       "alimento": "Queso fresco",
       "unidad": "g",
       "gramaje": 50.0
      },
      {
       "alimento": "Huevo",
       "unidad": "g",
       "gramaje": 25.0
      }
     ]
    }
   ],
   "Jueves": [
    {
     "lista": "Lista 3",
     "nombre": "PIZZETA",
     "ingredientes": [
      {
       "alimento": "Pizzeta",
       "unidad": "g",
       "gramaje": 60.0
      },
      {
       "alimento": "Queso fresco",
       "unidad": "g",
       "gramaje": 40.0
      }
     ]
    },
    {
     "lista": "Lista 6",
     "nombre": "PIZZETA CON HUEVO",
     "ingredientes": [
      {
       "alimento": "Pizzeta",
       "unidad": "g",
       "gramaje": 60.0
      },
      {
       "alimento": "Queso fresco",
       "unidad": "g",
       "gramaje": 40.0
      },
      {
       "alimento": "Huevo",
       "unidad": "g",
       "gramaje": 25.0
      }
     ]
    }
   ]
  },
  "TINTENFISCH": {
   "Lunes": [
    {
     "lista": "Lista 1",
     "nombre": "SANDWICH DE MILANESA CON TOMATE",
     "ingredientes": [
      {
       "alimento": "Milanesas apanadas",
       "unidad": "g",
       "gramaje": 100.0
      },
      {
       "alimento": "Tomate",
       "unidad": "g",
       "gramaje": 20.0
      },
      {
       "alimento": "Figaza 50 G ó pan lactal",
       "unidad": "u",
       "gramaje": 1.0,
       "nota": "1 u. ó 2 u."
      },
      {
       "alimento": "Aceite",
       "unidad": "ml",
       "gramaje": 10.0
      }
     ]
    }
   ],
   "Miércoles": [
    {
     "lista": "Lista 2",
     "nombre": "TARTA DE QUESO Y HUEVO",
     "ingredientes": [
      {
       "alimento": "Tapa de tarta",
       "unidad": "g",
       "gramaje": 60.0
      },
      {
       "alimento": "Queso fresco",
       "unidad": "g",
       "gramaje": 50.0
      },
      {
       "alimento": "Huevo",
       "unidad": "g",
       "gramaje": 25.0
      }
     ]
    }
   ],
   "Jueves": [
    {
     "lista": "Lista 3",
     "nombre": "PIZZETA CON HUEVO",
     "ingredientes": [
      {
       "alimento": "Pizzeta",
       "unidad": "g",
       "gramaje": 60.0
      },
      {
       "alimento": "Huevo",
       "unidad": "g",
       "gramaje": 15.0
      },
      {
       "alimento": "Queso fresco",
       "unidad": "g",
       "gramaje": 40.0
      }
     ]
    }
   ]
  }
 },
 "dmJM": {
  "EDEAL": {
   "Lunes": {
    "lista": "Lista 1",
    "nombre": "LECHE CON CACAO + MADALENAS/ VAINILLAS",
    "ingredientes": [
     {
      "alimento": "Leche LV",
      "unidad": "ml",
      "gramaje": 120.0
     },
     {
      "alimento": "Cacao",
      "unidad": "g",
      "gramaje": 15.0
     },
     {
      "alimento": "Madalenas/ vainillas",
      "unidad": "g",
      "gramaje": 30.0
     }
    ]
   },
   "Martes": {
    "lista": "Lista 2",
    "nombre": "LECHE CON INFUSIÓN + PAN LACTAL CON QUESO FRESCO y HUEVO + NARANJA",
    "ingredientes": [
     {
      "alimento": "Leche LV",
      "unidad": "ml",
      "gramaje": 120.0
     },
     {
      "alimento": "Azúcar",
      "unidad": "g",
      "gramaje": 10.0
     },
     {
      "alimento": "Mate cocido",
      "unidad": "g",
      "gramaje": 1.5
     },
     {
      "alimento": "Pan lactal blanco",
      "unidad": "g",
      "gramaje": 50.0
     },
     {
      "alimento": "Queso fresco",
      "unidad": "g",
      "gramaje": 20.0
     },
     {
      "alimento": "Naranja",
      "unidad": "g",
      "gramaje": 100.0
     }
    ]
   },
   "Miércoles": {
    "lista": "Lista 3",
    "nombre": "YOGUR + PAN CON DDL",
    "ingredientes": [
     {
      "alimento": "Yogur vainilla",
      "unidad": "ml",
      "gramaje": 120.0
     },
     {
      "alimento": "Pan lactal blanco",
      "unidad": "g",
      "gramaje": 50.0
     },
     {
      "alimento": "Dulce de leche",
      "unidad": "g",
      "gramaje": 15.0
     },
     {
      "alimento": "Banana",
      "unidad": "g",
      "gramaje": 100.0
     }
    ]
   },
   "Jueves": {
    "lista": "Lista 4",
    "nombre": "LECHE CON INFUSIÓN + PAN LACTAL CON QUESO FRESCO +",
    "ingredientes": [
     {
      "alimento": "Leche LV",
      "unidad": "ml",
      "gramaje": 120.0
     },
     {
      "alimento": "Azucar",
      "unidad": "g",
      "gramaje": 10.0
     },
     {
      "alimento": "Mate cocido",
      "unidad": "g",
      "gramaje": 1.5
     },
     {
      "alimento": "Pan lactal",
      "unidad": "g",
      "gramaje": 50.0
     },
     {
      "alimento": "Queso fresco",
      "unidad": "g",
      "gramaje": 20.0
     },
     {
      "alimento": "Mandarina",
      "unidad": "g",
      "gramaje": 100.0
     }
    ]
   },
   "Viernes": {
    "lista": "Lista 5",
    "nombre": "YOGUR + LIBRITO + MANZANA",
    "ingredientes": [
     {
      "alimento": "Yogur vainilla",
      "unidad": "ml",
      "gramaje": 120.0
     },
     {
      "alimento": "Librito",
      "unidad": "g",
      "gramaje": 50.0
     },
     {
      "alimento": "Manzana",
      "unidad": "g",
      "gramaje": 100.0
     }
    ]
   }
  },
  "TINTENFISCH": {
   "Lunes": {
    "lista": "Lista 1",
    "nombre": "LECHE CON CACAO + MADALENAS/ VAINILLAS",
    "ingredientes": [
     {
      "alimento": "Leche LV",
      "unidad": "ml",
      "gramaje": 120.0
     },
     {
      "alimento": "Cacao",
      "unidad": "g",
      "gramaje": 15.0
     },
     {
      "alimento": "Madalenas/ vainillas",
      "unidad": "g",
      "gramaje": 30.0
     }
    ]
   },
   "Martes": {
    "lista": "Lista 2",
    "nombre": "LECHE CON INFUSIÓN + PAN LACTAL CON QUESO FRESCO + NARANJA",
    "ingredientes": [
     {
      "alimento": "Leche LV",
      "unidad": "ml",
      "gramaje": 120.0
     },
     {
      "alimento": "Azúcar",
      "unidad": "g",
      "gramaje": 10.0
     },
     {
      "alimento": "Mate cocido",
      "unidad": "g",
      "gramaje": 1.5
     },
     {
      "alimento": "Pan lactal",
      "unidad": "g",
      "gramaje": 50.0
     },
     {
      "alimento": "Queso fresco",
      "unidad": "g",
      "gramaje": 20.0
     },
     {
      "alimento": "Naranja",
      "unidad": "g",
      "gramaje": 100.0
     }
    ]
   },
   "Miércoles": {
    "lista": "Lista 3",
    "nombre": "YOGUR + LIBRITO + MANZANA",
    "ingredientes": [
     {
      "alimento": "Yogur vainilla",
      "unidad": "ml",
      "gramaje": 120.0
     },
     {
      "alimento": "Librito",
      "unidad": "g",
      "gramaje": 50.0
     },
     {
      "alimento": "Manzana",
      "unidad": "g",
      "gramaje": 100.0
     }
    ]
   },
   "Jueves": {
    "lista": "Lista 4",
    "nombre": "LECHE CON INFUSIÓN + FIGAZA INTEGRAL CON QUESO FRESCO + BANANA",
    "ingredientes": [
     {
      "alimento": "Leche LV",
      "unidad": "ml",
      "gramaje": 120.0
     },
     {
      "alimento": "Azucar",
      "unidad": "g",
      "gramaje": 10.0
     },
     {
      "alimento": "Mate cocido",
      "unidad": "g",
      "gramaje": 1.5
     },
     {
      "alimento": "Figaza integral",
      "unidad": "g",
      "gramaje": 50.0
     },
     {
      "alimento": "Queso fresco",
      "unidad": "g",
      "gramaje": 20.0
     },
     {
      "alimento": "Huevo",
      "unidad": "g",
      "gramaje": 25.0
     },
     {
      "alimento": "Banana",
      "unidad": "g",
      "gramaje": 100.0
     }
    ]
   },
   "Viernes": {
    "lista": "Lista 5",
    "nombre": "YOGUR + PAN CON DDL",
    "ingredientes": [
     {
      "alimento": "Yogur vainilla",
      "unidad": "ml",
      "gramaje": 120.0
     },
     {
      "alimento": "Pan lactal blanco",
      "unidad": "g",
      "gramaje": 30.0
     },
     {
      "alimento": "Dulce de leche",
      "unidad": "g",
      "gramaje": 15.0
     }
    ]
   }
  }
 },
 "dmDisp": {
  "Lunes": {
   "lista": "Lista 1",
   "nombre": "LECHE CON CACAO + MADALENAS/ VAINILLAS",
   "ingredientes": [
    {
     "alimento": "Leche LV",
     "unidad": "ml",
     "porTipo": {
      "EPI": 150.0,
      "UDI": 150.0,
      "ENVIÓN": 150.0,
      "TALLER PROTEGIDO": 150.0
     }
    },
    {
     "alimento": "Cacao",
     "unidad": "g",
     "porTipo": {
      "EPI": 15.0,
      "UDI": 15.0,
      "ENVIÓN": 15.0,
      "TALLER PROTEGIDO": 15.0
     }
    },
    {
     "alimento": "Madalenas/ vainillas",
     "unidad": "g",
     "porTipo": {
      "EPI": 30.0,
      "UDI": 30.0,
      "ENVIÓN": 50.0,
      "TALLER PROTEGIDO": 50.0
     }
    }
   ]
  },
  "Martes": {
   "lista": "Lista 2",
   "nombre": "LECHE CON INFUSIÓN + FIGAZA CON QUESO FRESCO + NARANJA",
   "ingredientes": [
    {
     "alimento": "Leche fluida LV",
     "unidad": "ml",
     "porTipo": {
      "EPI": 120.0,
      "UDI": 120.0,
      "ENVIÓN": 100.0,
      "TALLER PROTEGIDO": 100.0
     }
    },
    {
     "alimento": "Azúcar",
     "unidad": "g",
     "porTipo": {
      "EPI": 10.0,
      "UDI": 10.0,
      "ENVIÓN": 10.0,
      "TALLER PROTEGIDO": 10.0
     }
    },
    {
     "alimento": "Mate cocido",
     "unidad": "g",
     "porTipo": {
      "EPI": 1.5,
      "UDI": 1.5,
      "ENVIÓN": 1.5,
      "TALLER PROTEGIDO": 1.5
     }
    },
    {
     "alimento": "Figaza",
     "unidad": "g",
     "porTipo": {
      "EPI": 50.0,
      "UDI": 50.0,
      "ENVIÓN": 50.0,
      "TALLER PROTEGIDO": 50.0
     }
    },
    {
     "alimento": "Queso fresco",
     "unidad": "g",
     "porTipo": {
      "EPI": 20.0,
      "UDI": 20.0,
      "ENVIÓN": 30.0,
      "TALLER PROTEGIDO": 30.0
     }
    },
    {
     "alimento": "Naranja",
     "unidad": "g",
     "porTipo": {
      "EPI": 150.0,
      "UDI": 150.0,
      "ENVIÓN": 150.0,
      "TALLER PROTEGIDO": 150.0
     }
    }
   ]
  },
  "Miércoles": {
   "lista": "Lista 3",
   "nombre": "YOGUR + PAN CON DDL + MANZANA",
   "ingredientes": [
    {
     "alimento": "Yogur vainilla",
     "unidad": "ml",
     "porTipo": {
      "EPI": 120.0,
      "UDI": 120.0,
      "ENVIÓN": 120.0,
      "TALLER PROTEGIDO": 120.0
     }
    },
    {
     "alimento": "Pan lactal blanco",
     "unidad": "g",
     "porTipo": {
      "EPI": 30.0,
      "UDI": 50.0,
      "ENVIÓN": 50.0,
      "TALLER PROTEGIDO": 50.0
     }
    },
    {
     "alimento": "Dulce de leche",
     "unidad": "g",
     "porTipo": {
      "EPI": 15.0,
      "UDI": 15.0,
      "ENVIÓN": 15.0,
      "TALLER PROTEGIDO": 15.0
     }
    },
    {
     "alimento": "Manzana",
     "unidad": "g",
     "porTipo": {
      "EPI": 150.0,
      "UDI": 150.0,
      "ENVIÓN": 150.0,
      "TALLER PROTEGIDO": 150.0
     }
    }
   ]
  },
  "Jueves": {
   "lista": "Lista 4",
   "nombre": "LECHE CON INFUSIÓN + FIGAZA INTEGRAL CON QUESO FRESCO + BANANA",
   "ingredientes": [
    {
     "alimento": "Leche fluida LV",
     "unidad": "ml",
     "porTipo": {
      "EPI": 120.0,
      "UDI": 120.0,
      "ENVIÓN": 100.0,
      "TALLER PROTEGIDO": 100.0
     }
    },
    {
     "alimento": "Azucar",
     "unidad": "g",
     "porTipo": {
      "EPI": 10.0,
      "UDI": 10.0,
      "ENVIÓN": 10.0,
      "TALLER PROTEGIDO": 10.0
     }
    },
    {
     "alimento": "Mate cocido",
     "unidad": "g",
     "porTipo": {
      "EPI": 1.5,
      "UDI": 1.5,
      "ENVIÓN": 1.5,
      "TALLER PROTEGIDO": 1.5
     }
    },
    {
     "alimento": "Figaza integral",
     "unidad": "g",
     "porTipo": {
      "EPI": 50.0,
      "UDI": 50.0,
      "ENVIÓN": 50.0,
      "TALLER PROTEGIDO": 50.0
     }
    },
    {
     "alimento": "Queso fresco",
     "unidad": "g",
     "porTipo": {
      "EPI": 20.0,
      "UDI": 20.0,
      "ENVIÓN": 30.0,
      "TALLER PROTEGIDO": 30.0
     }
    },
    {
     "alimento": "Banana",
     "unidad": "g",
     "porTipo": {
      "EPI": 150.0,
      "UDI": 150.0,
      "ENVIÓN": 150.0,
      "TALLER PROTEGIDO": 150.0
     }
    }
   ]
  },
  "Viernes": {
   "lista": "Lista 5",
   "nombre": "YOGUR + PAN CON DDL",
   "ingredientes": [
    {
     "alimento": "Yogur vainilla",
     "unidad": "ml",
     "porTipo": {
      "EPI": 120.0,
      "UDI": 120.0,
      "ENVIÓN": 120.0,
      "TALLER PROTEGIDO": 120.0
     }
    },
    {
     "alimento": "Pan lactal blanco",
     "unidad": "g",
     "porTipo": {
      "EPI": 30.0,
      "UDI": 50.0,
      "ENVIÓN": 50.0,
      "TALLER PROTEGIDO": 50.0
     }
    },
    {
     "alimento": "Dulce de leche",
     "unidad": "g",
     "porTipo": {
      "EPI": 15.0,
      "UDI": 15.0,
      "ENVIÓN": 15.0,
      "TALLER PROTEGIDO": 15.0
     }
    }
   ]
  }
 },
 "comDisp": {
  "Lunes": [
   {
    "lista": "Lista 1",
    "nombre": "FIDEOS CORTOS CON SALSA DE CALABAZA + FRUTA",
    "ingredientes": [
     {
      "alimento": "Fideos tirabuzón",
      "unidad": "g",
      "porTipo": {
       "EPI": 60.0,
       "UDI": 60.0,
       "ENVIÓN": 80.0,
       "TALLER PROTEGIDO": 80.0
      }
     },
     {
      "alimento": "Cebolla",
      "unidad": "g",
      "porTipo": {
       "EPI": 20.0,
       "UDI": 20.0,
       "ENVIÓN": 30.0,
       "TALLER PROTEGIDO": 30.0
      }
     },
     {
      "alimento": "Zanahoria",
      "unidad": "g",
      "porTipo": {
       "EPI": 15.0,
       "UDI": 15.0,
       "ENVIÓN": 20.0,
       "TALLER PROTEGIDO": 20.0
      }
     },
     {
      "alimento": "Calabaza",
      "unidad": "g",
      "porTipo": {
       "EPI": 70.0,
       "UDI": 70.0,
       "ENVIÓN": 80.0,
       "TALLER PROTEGIDO": 80.0
      }
     },
     {
      "alimento": "Queso cremoso",
      "unidad": "g",
      "porTipo": {
       "EPI": 20.0,
       "UDI": 20.0,
       "ENVIÓN": 30.0,
       "TALLER PROTEGIDO": 30.0
      }
     },
     {
      "alimento": "Naranja",
      "unidad": "g",
      "porTipo": {
       "EPI": 150.0,
       "UDI": 150.0,
       "ENVIÓN": 150.0,
       "TALLER PROTEGIDO": 150.0
      }
     }
    ]
   },
   {
    "lista": "Lista 6",
    "nombre": "FIDEOS CORTOS CON SALSA FILETO + FRUTA",
    "ingredientes": [
     {
      "alimento": "Fideos tirabuzón",
      "unidad": "g",
      "porTipo": {
       "EPI": 60.0,
       "UDI": 60.0,
       "ENVIÓN": 80.0,
       "TALLER PROTEGIDO": 80.0
      }
     },
     {
      "alimento": "Cebolla",
      "unidad": "g",
      "porTipo": {
       "EPI": 20.0,
       "UDI": 20.0,
       "ENVIÓN": 30.0,
       "TALLER PROTEGIDO": 30.0
      }
     },
     {
      "alimento": "Zanahoria",
      "unidad": "g",
      "porTipo": {
       "EPI": 15.0,
       "UDI": 15.0,
       "ENVIÓN": 20.0,
       "TALLER PROTEGIDO": 20.0
      }
     },
     {
      "alimento": "Tomate triturado",
      "unidad": "g",
      "porTipo": {
       "EPI": 50.0,
       "UDI": 50.0,
       "ENVIÓN": 60.0,
       "TALLER PROTEGIDO": 60.0
      }
     },
     {
      "alimento": "Queso pasta dura",
      "unidad": "g",
      "porTipo": {
       "EPI": 10.0,
       "UDI": 10.0,
       "ENVIÓN": 15.0,
       "TALLER PROTEGIDO": 15.0
      }
     },
     {
      "alimento": "Manzana",
      "unidad": "g",
      "porTipo": {
       "EPI": 150.0,
       "UDI": 150.0,
       "ENVIÓN": 150.0,
       "TALLER PROTEGIDO": 150.0
      }
     }
    ]
   }
  ],
  "Martes": [
   {
    "lista": "Lista 2",
    "nombre": "EMPANADA DE POLLO + FRUTA",
    "ingredientes": [
     {
      "alimento": "Tapas de empanadas",
      "unidad": "u",
      "porTipo": {
       "EPI": 2.0,
       "UDI": 2.0,
       "ENVIÓN": null,
       "TALLER PROTEGIDO": null
      }
     },
     {
      "alimento": "Tapa de tarta",
      "unidad": "g",
      "porTipo": {
       "EPI": null,
       "UDI": null,
       "ENVIÓN": 90.0,
       "TALLER PROTEGIDO": 90.0
      }
     },
     {
      "alimento": "Pollo",
      "unidad": "g",
      "porTipo": {
       "EPI": 130.0,
       "UDI": 130.0,
       "ENVIÓN": 150.0,
       "TALLER PROTEGIDO": 150.0
      },
      "notaPorTipo": {
       "EPI": "neto 80",
       "UDI": "neto 80",
       "ENVIÓN": "neto 90",
       "TALLER PROTEGIDO": "neto 90"
      }
     },
     {
      "alimento": "Huevo",
      "unidad": "g",
      "porTipo": {
       "EPI": 20.0,
       "UDI": 20.0,
       "ENVIÓN": 25.0,
       "TALLER PROTEGIDO": 25.0
      }
     },
     {
      "alimento": "Cebolla",
      "unidad": "g",
      "porTipo": {
       "EPI": 20.0,
       "UDI": 20.0,
       "ENVIÓN": 25.0,
       "TALLER PROTEGIDO": 25.0
      }
     },
     {
      "alimento": "Zapallito",
      "unidad": "g",
      "porTipo": {
       "EPI": 30.0,
       "UDI": 30.0,
       "ENVIÓN": 35.0,
       "TALLER PROTEGIDO": 35.0
      }
     },
     {
      "alimento": "Tomate triturado",
      "unidad": "g",
      "porTipo": {
       "EPI": 20.0,
       "UDI": 20.0,
       "ENVIÓN": 25.0,
       "TALLER PROTEGIDO": 25.0
      }
     },
     {
      "alimento": "Manzana",
      "unidad": "g",
      "porTipo": {
       "EPI": 150.0,
       "UDI": 150.0,
       "ENVIÓN": 150.0,
       "TALLER PROTEGIDO": 150.0
      }
     }
    ]
   },
   {
    "lista": "Lista 7",
    "nombre": "RISOTO DE CALABAZA Y POLLO + FRUTA",
    "ingredientes": [
     {
      "alimento": "Arroz",
      "unidad": "g",
      "porTipo": {
       "EPI": 50.0,
       "UDI": 50.0,
       "ENVIÓN": 60.0,
       "TALLER PROTEGIDO": 60.0
      }
     },
     {
      "alimento": "Cebolla",
      "unidad": "g",
      "porTipo": {
       "EPI": 30.0,
       "UDI": 30.0,
       "ENVIÓN": 30.0,
       "TALLER PROTEGIDO": 30.0
      }
     },
     {
      "alimento": "Pollo entero",
      "unidad": "g",
      "porTipo": {
       "EPI": 110.0,
       "UDI": 110.0,
       "ENVIÓN": 140.0,
       "TALLER PROTEGIDO": 140.0
      },
      "notaPorTipo": {
       "EPI": "neto 70",
       "UDI": "neto 70",
       "ENVIÓN": "neto 85",
       "TALLER PROTEGIDO": "neto 85"
      }
     },
     {
      "alimento": "Zapallo",
      "unidad": "g",
      "porTipo": {
       "EPI": 70.0,
       "UDI": 70.0,
       "ENVIÓN": 80.0,
       "TALLER PROTEGIDO": 80.0
      }
     },
     {
      "alimento": "Queso fresco",
      "unidad": "g",
      "porTipo": {
       "EPI": 15.0,
       "UDI": 15.0,
       "ENVIÓN": 20.0,
       "TALLER PROTEGIDO": 20.0
      }
     },
     {
      "alimento": "Manzana",
      "unidad": "g",
      "porTipo": {
       "EPI": 150.0,
       "UDI": 150.0,
       "ENVIÓN": 150.0,
       "TALLER PROTEGIDO": 150.0
      }
     }
    ]
   }
  ],
  "Miércoles": [
   {
    "lista": "Lista 3",
    "nombre": "MILANESA DE CARNE CON PURE MIXTO + FRUTA",
    "ingredientes": [
     {
      "alimento": "Emince de carne",
      "unidad": "g",
      "porTipo": {
       "EPI": 100.0,
       "UDI": 100.0,
       "ENVIÓN": 150.0,
       "TALLER PROTEGIDO": 150.0
      }
     },
     {
      "alimento": "Pan rallado",
      "unidad": "g",
      "porTipo": {
       "EPI": 30.0,
       "UDI": 30.0,
       "ENVIÓN": 35.0,
       "TALLER PROTEGIDO": 35.0
      }
     },
     {
      "alimento": "Huevos",
      "unidad": "g",
      "porTipo": {
       "EPI": 20.0,
       "UDI": 20.0,
       "ENVIÓN": 25.0,
       "TALLER PROTEGIDO": 25.0
      }
     },
     {
      "alimento": "Papa",
      "unidad": "g",
      "porTipo": {
       "EPI": 120.0,
       "UDI": 120.0,
       "ENVIÓN": 150.0,
       "TALLER PROTEGIDO": 150.0
      }
     },
     {
      "alimento": "Calabaza",
      "unidad": "g",
      "porTipo": {
       "EPI": 40.0,
       "UDI": 40.0,
       "ENVIÓN": 60.0,
       "TALLER PROTEGIDO": 60.0
      }
     },
     {
      "alimento": "Cítrico",
      "unidad": "g",
      "porTipo": {
       "EPI": 150.0,
       "UDI": 150.0,
       "ENVIÓN": 150.0,
       "TALLER PROTEGIDO": 150.0
      }
     }
    ]
   },
   {
    "lista": "Lista 8",
    "nombre": "MILANESA DE CARNE CON PURE + FRUTA",
    "ingredientes": [
     {
      "alimento": "Emince de carne",
      "unidad": "g",
      "porTipo": {
       "EPI": 100.0,
       "UDI": 100.0,
       "ENVIÓN": 150.0,
       "TALLER PROTEGIDO": 150.0
      }
     },
     {
      "alimento": "Pan rallado",
      "unidad": "g",
      "porTipo": {
       "EPI": 30.0,
       "UDI": 30.0,
       "ENVIÓN": 35.0,
       "TALLER PROTEGIDO": 35.0
      }
     },
     {
      "alimento": "Huevos",
      "unidad": "g",
      "porTipo": {
       "EPI": 20.0,
       "UDI": 20.0,
       "ENVIÓN": 25.0,
       "TALLER PROTEGIDO": 25.0
      }
     },
     {
      "alimento": "Papa",
      "unidad": "g",
      "porTipo": {
       "EPI": 120.0,
       "UDI": 120.0,
       "ENVIÓN": 150.0,
       "TALLER PROTEGIDO": 150.0
      }
     },
     {
      "alimento": "Batata",
      "unidad": "g",
      "porTipo": {
       "EPI": 40.0,
       "UDI": 40.0,
       "ENVIÓN": 60.0,
       "TALLER PROTEGIDO": 60.0
      }
     },
     {
      "alimento": "Cítrico",
      "unidad": "g",
      "porTipo": {
       "EPI": 150.0,
       "UDI": 150.0,
       "ENVIÓN": 150.0,
       "TALLER PROTEGIDO": 150.0
      }
     }
    ]
   }
  ],
  "Jueves": [
   {
    "lista": "Lista 4",
    "nombre": "ARROZ CON ESTOFADO DE POLLO + FRUTA",
    "ingredientes": [
     {
      "alimento": "Pollo",
      "unidad": "g",
      "porTipo": {
       "EPI": 110.0,
       "UDI": 110.0,
       "ENVIÓN": 150.0,
       "TALLER PROTEGIDO": 150.0
      },
      "notaPorTipo": {
       "EPI": "neto 70",
       "UDI": "neto 70",
       "ENVIÓN": "neto 90",
       "TALLER PROTEGIDO": "neto 90"
      }
     },
     {
      "alimento": "Arroz",
      "unidad": "g",
      "porTipo": {
       "EPI": 50.0,
       "UDI": 50.0,
       "ENVIÓN": 60.0,
       "TALLER PROTEGIDO": 60.0
      }
     },
     {
      "alimento": "Batata",
      "unidad": "g",
      "porTipo": {
       "EPI": 40.0,
       "UDI": 40.0,
       "ENVIÓN": 60.0,
       "TALLER PROTEGIDO": 60.0
      }
     },
     {
      "alimento": "Zapallo",
      "unidad": "g",
      "porTipo": {
       "EPI": 50.0,
       "UDI": 50.0,
       "ENVIÓN": 60.0,
       "TALLER PROTEGIDO": 60.0
      }
     },
     {
      "alimento": "Cebolla",
      "unidad": "g",
      "porTipo": {
       "EPI": 20.0,
       "UDI": 20.0,
       "ENVIÓN": 25.0,
       "TALLER PROTEGIDO": 25.0
      }
     },
     {
      "alimento": "Tomate triturado",
      "unidad": "g",
      "porTipo": {
       "EPI": 50.0,
       "UDI": 50.0,
       "ENVIÓN": 60.0,
       "TALLER PROTEGIDO": 60.0
      }
     },
     {
      "alimento": "Banana",
      "unidad": "g",
      "porTipo": {
       "EPI": 150.0,
       "UDI": 150.0,
       "ENVIÓN": 150.0,
       "TALLER PROTEGIDO": 150.0
      }
     }
    ]
   },
   {
    "lista": "Lista 9",
    "nombre": "GUISO DE ARROZ CON LENTEJAS Y POLLO + FRUTA",
    "ingredientes": [
     {
      "alimento": "Arroz",
      "unidad": "g",
      "porTipo": {
       "EPI": 50.0,
       "UDI": 50.0,
       "ENVIÓN": 60.0,
       "TALLER PROTEGIDO": 60.0
      }
     },
     {
      "alimento": "Lenteja",
      "unidad": "g",
      "porTipo": {
       "EPI": 20.0,
       "UDI": 20.0,
       "ENVIÓN": 30.0,
       "TALLER PROTEGIDO": 30.0
      }
     },
     {
      "alimento": "Cebolla",
      "unidad": "g",
      "porTipo": {
       "EPI": 20.0,
       "UDI": 20.0,
       "ENVIÓN": 30.0,
       "TALLER PROTEGIDO": 30.0
      }
     },
     {
      "alimento": "Pollo",
      "unidad": "g",
      "porTipo": {
       "EPI": 100.0,
       "UDI": 100.0,
       "ENVIÓN": 140.0,
       "TALLER PROTEGIDO": 140.0
      },
      "notaPorTipo": {
       "EPI": "neto 60",
       "UDI": "neto 60",
       "ENVIÓN": "neto 85",
       "TALLER PROTEGIDO": "neto 85"
      }
     },
     {
      "alimento": "Calabaza",
      "unidad": "g",
      "porTipo": {
       "EPI": 40.0,
       "UDI": 40.0,
       "ENVIÓN": 50.0,
       "TALLER PROTEGIDO": 50.0
      }
     },
     {
      "alimento": "Banana",
      "unidad": "g",
      "porTipo": {
       "EPI": 150.0,
       "UDI": 150.0,
       "ENVIÓN": 150.0,
       "TALLER PROTEGIDO": 150.0
      }
     }
    ]
   }
  ],
  "Viernes": [
   {
    "lista": "Lista 5",
    "nombre": "PIZZA NAPOLITANA + POSTRE DE MAICENA",
    "ingredientes": [
     {
      "alimento": "Harina 000",
      "unidad": "g",
      "porTipo": {
       "EPI": 60.0,
       "UDI": 60.0,
       "ENVIÓN": 60.0,
       "TALLER PROTEGIDO": 60.0
      }
     },
     {
      "alimento": "Levadura en polvo",
      "unidad": "g",
      "porTipo": {
       "EPI": 0.5,
       "UDI": 0.5,
       "ENVIÓN": 0.5,
       "TALLER PROTEGIDO": 0.5
      }
     },
     {
      "alimento": "Queso fresco",
      "unidad": "g",
      "porTipo": {
       "EPI": 50.0,
       "UDI": 50.0,
       "ENVIÓN": 50.0,
       "TALLER PROTEGIDO": 50.0
      }
     },
     {
      "alimento": "Sal",
      "unidad": "g",
      "porTipo": {
       "EPI": 0.5,
       "UDI": 0.5,
       "ENVIÓN": 0.5,
       "TALLER PROTEGIDO": 0.5
      },
      "notaPorTipo": {
       "EPI": "0.5",
       "UDI": "0.5",
       "ENVIÓN": "0.5",
       "TALLER PROTEGIDO": "0.5"
      }
     },
     {
      "alimento": "Tomate",
      "unidad": "g",
      "porTipo": {
       "EPI": 15.0,
       "UDI": 15.0,
       "ENVIÓN": 15.0,
       "TALLER PROTEGIDO": 15.0
      }
     },
     {
      "alimento": "Tomate triturado",
      "unidad": "g",
      "porTipo": {
       "EPI": 20.0,
       "UDI": 20.0,
       "ENVIÓN": 20.0,
       "TALLER PROTEGIDO": 20.0
      }
     },
     {
      "alimento": "Leche",
      "unidad": "ml",
      "porTipo": {
       "EPI": 100.0,
       "UDI": 100.0,
       "ENVIÓN": 100.0,
       "TALLER PROTEGIDO": 100.0
      }
     },
     {
      "alimento": "Maicena",
      "unidad": "g",
      "porTipo": {
       "EPI": 7.0,
       "UDI": 7.0,
       "ENVIÓN": 7.0,
       "TALLER PROTEGIDO": 7.0
      }
     },
     {
      "alimento": "Azúcar",
      "unidad": "g",
      "porTipo": {
       "EPI": 7.0,
       "UDI": 7.0,
       "ENVIÓN": 7.0,
       "TALLER PROTEGIDO": 7.0
      }
     },
     {
      "alimento": "Esencia de vainilla",
      "unidad": "ml",
      "porTipo": {
       "EPI": 0.005,
       "UDI": 0.005,
       "ENVIÓN": 0.005,
       "TALLER PROTEGIDO": 0.005
      }
     }
    ]
   },
   {
    "lista": "Lista 10",
    "nombre": "PIZZA CON HUEVO + POSTRE DE MAICENA",
    "ingredientes": [
     {
      "alimento": "Harina 000",
      "unidad": "g",
      "porTipo": {
       "EPI": 60.0,
       "UDI": 60.0,
       "ENVIÓN": 60.0,
       "TALLER PROTEGIDO": 60.0
      }
     },
     {
      "alimento": "Levadura en polvo",
      "unidad": "g",
      "porTipo": {
       "EPI": 0.5,
       "UDI": 0.5,
       "ENVIÓN": 0.5,
       "TALLER PROTEGIDO": 0.5
      }
     },
     {
      "alimento": "Queso fresco",
      "unidad": "g",
      "porTipo": {
       "EPI": 50.0,
       "UDI": 50.0,
       "ENVIÓN": 50.0,
       "TALLER PROTEGIDO": 50.0
      }
     },
     {
      "alimento": "Sal",
      "unidad": "g",
      "porTipo": {
       "EPI": 0.5,
       "UDI": 0.5,
       "ENVIÓN": 0.5,
       "TALLER PROTEGIDO": 0.5
      }
     },
     {
      "alimento": "Huevo",
      "unidad": "g",
      "porTipo": {
       "EPI": 25.0,
       "UDI": 25.0,
       "ENVIÓN": 25.0,
       "TALLER PROTEGIDO": 25.0
      }
     },
     {
      "alimento": "Tomate triturado",
      "unidad": "g",
      "porTipo": {
       "EPI": 20.0,
       "UDI": 20.0,
       "ENVIÓN": 20.0,
       "TALLER PROTEGIDO": 20.0
      }
     },
     {
      "alimento": "Leche",
      "unidad": "ml",
      "porTipo": {
       "EPI": 100.0,
       "UDI": 100.0,
       "ENVIÓN": 100.0,
       "TALLER PROTEGIDO": 100.0
      }
     },
     {
      "alimento": "Maicena",
      "unidad": "g",
      "porTipo": {
       "EPI": 7.0,
       "UDI": 7.0,
       "ENVIÓN": 7.0,
       "TALLER PROTEGIDO": 7.0
      }
     },
     {
      "alimento": "Azúcar",
      "unidad": "g",
      "porTipo": {
       "EPI": 7.0,
       "UDI": 7.0,
       "ENVIÓN": 7.0,
       "TALLER PROTEGIDO": 7.0
      }
     },
     {
      "alimento": "Esencia de vainilla",
      "unidad": "ml",
      "porTipo": {
       "EPI": 0.005,
       "UDI": 0.005,
       "ENVIÓN": 0.005,
       "TALLER PROTEGIDO": 0.005
      }
     }
    ]
   }
  ]
 },
 "dmEsperanza": {
  "Lunes": {
   "lista": "Lista 1",
   "nombre": "LECHE CON CACAO + MAGDALENAS / BUDÍN",
   "ingredientes": [
    {
     "alimento": "Leche LV",
     "unidad": "ml",
     "gramaje": 120.0
    },
    {
     "alimento": "Cacao",
     "unidad": "g",
     "gramaje": 15.0
    },
    {
     "alimento": "Azúcar",
     "unidad": "g",
     "gramaje": 10.0
    },
    {
     "alimento": "Magdalenas /budín",
     "unidad": "g",
     "gramaje": 40.0
    }
   ]
  },
  "Miércoles": {
   "lista": "Lista 3",
   "nombre": "YOGUR + PAN LCTAL CON QUESO FRESCO + FRUTA",
   "ingredientes": [
    {
     "alimento": "Yogur desc vainilla",
     "unidad": "ml",
     "gramaje": 120.0
    },
    {
     "alimento": "Pan lactal",
     "unidad": "g",
     "gramaje": 30.0
    },
    {
     "alimento": "Queso fresco",
     "unidad": "g",
     "gramaje": 20.0
    },
    {
     "alimento": "Fruta",
     "unidad": "g",
     "gramaje": 150.0
    }
   ]
  },
  "Viernes": {
   "lista": "Lista 4",
   "nombre": "YOGUR + PAN LACTAL CON DULCE DE LECHE + FRUTA",
   "ingredientes": [
    {
     "alimento": "Yogur desc vainilla",
     "unidad": "ml",
     "gramaje": 120.0
    },
    {
     "alimento": "Azúcar",
     "unidad": "g",
     "gramaje": 8.0
    },
    {
     "alimento": "Pan lactal",
     "unidad": "g",
     "gramaje": 30.0
    },
    {
     "alimento": "Dulce de leche",
     "unidad": "g",
     "gramaje": 15.0
    },
    {
     "alimento": "Fruta -manzana",
     "unidad": "g",
     "gramaje": 150.0
    }
   ]
  }
 }
};

/**
 * ==========================================================================
 * LÓGICA DE MENÚS POR ESCUELA
 * Decide qué prestaciones mostrar según los servicios de la escuela
 * (igual que la fórmula del BUSCADOR del Tablero SAE):
 *
 *  COMEDOR
 *   - Jardines maternales con comedor ......... GR COMEDOR (Lista 1 y 6, 2 y 7…)
 *   - REFUERZO (según proveedor) .............. JM REFUERZO (lunes, miércoles y jueves)
 *   - CM DISPOSITIVOS (UDI/EPI/Envión/Taller) .. COM GR DISP (columna del tipo)
 *   - Resto de las escuelas ................... listas generales (data.js)
 *
 *  DESAYUNO / MERIENDA
 *   - DM JARDINES (según proveedor) ........... GR DM JM
 *   - DM DISPOSITIVOS ......................... DM GR DISP (columna del tipo)
 *   - Centros Esperanza ....................... DM ESPERANZA (lunes, miércoles y viernes)
 *   - Resto de las escuelas ................... lista general (data.js)
 * ==========================================================================
 */
const SAE_MENUS = (function () {
  const D = SAE_MENUS_DATA;
  const NUM_DIA = { 'Lunes': '1', 'Martes': '2', 'Miércoles': '3', 'Jueves': '4', 'Viernes': '5' };

  const mayus = (t) => String(t || '').toUpperCase().replace(/\s+/g, ' ').trim();

  /** 'DM' o 'COMEDOR' según el nombre del servicio. */
  function grupoDeServicio(servicio) {
    const s = mayus(servicio);
    if (/^(COMEDOR|CM\b)/.test(s) || s.indexOf('REFUERZO') >= 0) return 'COMEDOR';
    return 'DM';
  }

  /** Servicios que no llevan menú en la calculadora. */
  function sinMenu(servicio) {
    const s = mayus(servicio);
    return s === 'PATIOS' || s === 'GENERAL' || /^\d/.test(s) || s === '';
  }

  /** UDI / EPI / ENVIÓN / TALLER PROTEGIDO / ESPERANZA / '' según el nombre. */
  function tipoDispositivo(nombre) {
    const n = mayus(nombre);
    if (/^UDI\b/.test(n)) return 'UDI';
    if (/^EPI\b/.test(n)) return 'EPI';
    if (/^ENVI[OÓ]N\b/.test(n)) return 'ENVIÓN';
    if (/^TALLER/.test(n)) return 'TALLER PROTEGIDO';
    if (n.indexOf('ESPERANZA') >= 0) return 'ESPERANZA';
    return '';
  }

  /* Edad para el DM maternal: se elige en la ficha y se recuerda por jardín en este navegador */
  const EDADES_MATERNAL = [
    { valor: '1-2', etiqueta: '1 a 2 años' },
    { valor: '7-12', etiqueta: '7 a 12 meses' }
  ];
  const CLAVE_EDADES = 'sae-maternal-edad';
  function leerEdades() {
    try { return JSON.parse(localStorage.getItem(CLAVE_EDADES) || '{}') || {}; } catch (e) { return {}; }
  }
  function edadMaternal(escuela) {
    const v = leerEdades()[mayus(escuela && escuela.nombre)];
    return EDADES_MATERNAL.some(x => x.valor === v) ? v : '1-2';
  }
  function elegirEdadMaternal(escuela, valor) {
    const todas = leerEdades();
    todas[mayus(escuela && escuela.nombre)] = valor;
    try { localStorage.setItem(CLAVE_EDADES, JSON.stringify(todas)); } catch (e) { /* sin guardar */ }
  }

  /** 'GRUPO L' / 'GYULAND' para los menús de desayuno/merienda de escuelas. */
  function proveedorGeneral(p) {
    const s = mayus(p);
    if (s.indexOf('GRUPO L') >= 0) return 'GRUPO L';
    if (s.indexOf('GYULAND') >= 0) return 'GYULAND';
    return '';
  }

  function proveedorClave(p) {
    const s = mayus(p);
    if (s.indexOf('EDEAL') >= 0) return 'EDEAL';
    if (s.indexOf('TINTENFISCH') >= 0) return 'TINTENFISCH';
    return '';
  }

  /** Cupo vigente del servicio para la fecha (el último cargado hasta esa fecha). */
  function cupoEnFecha(servicio, fechaISO) {
    if (!servicio || !servicio.cupos) return 0;
    const c = servicio.cupos;
    if (c[fechaISO] !== undefined && c[fechaISO] !== null && c[fechaISO] !== '') return Number(c[fechaISO]) || 0;
    const fechas = Object.keys(c).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
    const previas = fechas.filter(f => !fechaISO || f <= fechaISO);
    const f = previas.length ? previas[previas.length - 1] : fechas[fechas.length - 1];
    return f ? (Number(c[f]) || 0) : 0;
  }

  /** Convierte una lista con gramaje único al formato de la calculadora (jardín/primaria/secundaria). */
  function normalizarLista(l, tipo) {
    if (!l) return null;
    const ingredientes = [];
    (l.ingredientes || []).forEach(i => {
      let g = i.gramaje;
      let nota = i.nota || '';
      if (i.porTipo) {
        g = i.porTipo[tipo];
        nota = (i.notaPorTipo && i.notaPorTipo[tipo]) || '';
      }
      if (g === null || g === undefined) return;   // ese tipo no lleva este ingrediente
      let alimento = i.alimento;
      if (nota) alimento += /^neto/.test(nota) ? ` (${nota} ${i.unidad === 'ml' ? 'cc' : 'g'})` : ` (${nota})`;
      ingredientes.push({ alimento, unidad: i.unidad, jardin: g, primaria: g, secundaria: g, fijo: true });
    });
    return { lista: l.lista, nombre: l.nombre, ingredientes };
  }

  function bloque(prestacion, fuente, servicio, listas, sinEntrega, gramajeFijo) {
    return {
      prestacion, fuente,
      servicio: servicio.servicio,
      proveedor: servicio.proveedor || '',
      servicioRef: servicio,
      listas: (listas || []).filter(Boolean),
      sinEntrega: sinEntrega || '',
      gramajeFijo: !!gramajeFijo
    };
  }

  /**
   * Prestaciones de la escuela para el grupo ('DM' o 'COMEDOR') y el día.
   * Devuelve un array de bloques: { prestacion, fuente, servicio, proveedor,
   * servicioRef, listas:[{lista,nombre,ingredientes}], sinEntrega, gramajeFijo }
   */
  function bloques(escuela, grupo, dia) {
    if (!escuela) return [];
    const nombre = escuela.nombre || '';
    const esJM = /^JM\s/i.test(nombre) || escuela.tipo === 'Jardín Maternal' || escuela.tipo === 'Escuela Municipal';
    const tipo = tipoDispositivo(nombre);
    const salida = [];
    let generalDM = false, generalCom = false;

    (escuela.servicios || []).forEach(s => {
      if (sinMenu(s.servicio) || grupoDeServicio(s.servicio) !== grupo) return;
      const sv = mayus(s.servicio);
      const prov = proveedorClave(s.proveedor);

      if (grupo === 'COMEDOR') {
        if (sv === 'REFUERZO') {
          const menus = (D.refuerzo[prov] || {})[dia];
          salida.push(bloque('Refuerzo', `Refuerzo · ${prov || 'proveedor'}`, s,
            (menus || []).map(l => normalizarLista(l)),
            menus ? '' : (prov ? 'Sin entrega: el refuerzo se reparte lunes, miércoles y jueves.' : 'No se encontró el menú de refuerzo para este proveedor.'), true));
        } else if (/^CM\b/.test(sv)) {
          const t = tipo && tipo !== 'ESPERANZA' ? tipo : 'UDI';
          salida.push(bloque('Comedor', `CM Dispositivos · ${t === 'TALLER PROTEGIDO' ? 'Taller Protegido' : t}`, s,
            (D.comDisp[dia] || []).map(l => normalizarLista(l, t)), '', true));
        } else if (esJM) {
          salida.push(bloque('Comedor', 'Comedor jardines maternales', s,
            (D.comedorJM[dia] || []).map(l => normalizarLista(l)), '', true));
        } else if (!generalCom) {
          generalCom = true;
          salida.push(bloque('Comedor', 'Comedor escuelas', s,
            (SAE_DATA.comedorDays && SAE_DATA.comedorDays[dia]) || [], '', false));
        }
      } else {
        if (sv === 'DM JARDINES') {
          const l = (D.dmJM[prov] || {})[dia];
          salida.push(bloque('Desayuno / Merienda', `DM Jardines maternales · ${prov || 'proveedor'}`, s,
            [normalizarLista(l)], l ? '' : 'No se encontró el menú de DM para este proveedor.', true));
        } else if (sv === 'DM DISPOSITIVOS' && tipo === 'ESPERANZA') {
          const l = D.dmEsperanza[dia];
          salida.push(bloque('Desayuno / Merienda', 'DM Centro Esperanza', s,
            [normalizarLista(l)], l ? '' : 'Sin entrega: el Centro Esperanza recibe DM lunes, miércoles y viernes.', true));
        } else if (sv === 'DM DISPOSITIVOS') {
          const t = tipo || 'UDI';
          salida.push(bloque('Desayuno / Merienda', `DM Dispositivos · ${t === 'TALLER PROTEGIDO' ? 'Taller Protegido' : t}`, s,
            [normalizarLista(D.dmDisp[dia], t)], '', true));
        } else if (sv === 'DM MATERNAL' && D.dmMaternal) {
          // Sección maternal de los JI: menú propio según la edad elegida para ese jardín
          const edad = edadMaternal(escuela);
          const op = EDADES_MATERNAL.find(x => x.valor === edad);
          const l = (D.dmMaternal[edad] || {})[dia];
          const b = bloque('Desayuno / Merienda maternal', `DM maternal · ${op.etiqueta}`, s,
            [normalizarLista(l)], l ? '' : 'No se encontró el menú de DM maternal para este día.', true);
          b.edades = EDADES_MATERNAL;
          b.edad = edad;
          salida.push(b);
        } else if (!generalDM) {
          generalDM = true;
          // Menú y gramajes propios del proveedor (GRUPO L / GYULAND); si no hay, la lista general
          const pg = proveedorGeneral(s.proveedor);
          const lp = pg && D.dmGeneral && D.dmGeneral[pg] ? D.dmGeneral[pg][dia] : null;
          if (lp) {
            salida.push(bloque('Desayuno / Merienda', `DM escuelas · ${pg}`, s, [lp], '', false));
          } else {
            const l = SAE_DATA.dmLists && SAE_DATA.dmLists[NUM_DIA[dia]];
            salida.push(bloque('Desayuno / Merienda', 'DM escuelas', s, [l], '', false));
          }
        }
      }
    });
    return salida;
  }

  /** ¿La escuela tiene algún servicio de comedor (comedor, CM o refuerzo)? */
  function tieneComedor(escuela) {
    return (escuela.servicios || []).some(s => !sinMenu(s.servicio) && grupoDeServicio(s.servicio) === 'COMEDOR');
  }

  /** Texto para la pestaña de comedor: "Comedor", "Refuerzo" o "Comedor + Refuerzo". */
  function etiquetaComedor(escuela) {
    const nombres = [];
    (escuela.servicios || []).forEach(s => {
      if (sinMenu(s.servicio) || grupoDeServicio(s.servicio) !== 'COMEDOR') return;
      const n = mayus(s.servicio) === 'REFUERZO' ? 'Refuerzo' : 'Comedor';
      if (nombres.indexOf(n) < 0) nombres.push(n);
    });
    return nombres.join(' + ') || 'Comedor';
  }

  /** Gramaje "c/n" (cantidad necesaria) u otro texto: no se calcula total. */
  function esCantidadNecesaria(v) { return typeof v === 'string' && !/^\s*\d/.test(v); }

  return { bloques, grupoDeServicio, tieneComedor, etiquetaComedor, cupoEnFecha, tipoDispositivo, sinMenu,
    edadMaternal, elegirEdadMaternal, EDADES_MATERNAL, esCantidadNecesaria };
})();
