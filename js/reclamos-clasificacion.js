/**
 * ==========================================================================
 * CLASIFICACIÓN DE RECLAMOS SAE
 * Listas de opciones del formulario y el "asistente" que sugiere la
 * clasificación a partir del texto del detalle.
 * Para agregar o cambiar una opción, se edita solo este archivo.
 * Los valores ("valor") son lo que se escribe en la hoja; mantenerlos en
 * MAYÚSCULAS y sin cambiar los que ya existen, así los filtros siguen
 * encontrando los reclamos viejos.
 * ==========================================================================
 */

const CLASIFICACION = {

  // Categoría = columna CATEGORIA. "tipo" = columna TIPO (diaria / Estructural).
  categorias: [
    { valor: 'ALIMENTOS', etiqueta: 'Alimentos', icono: '🥪', tipo: 'diaria', ayuda: 'Problemas con la mercadería o la entrega del servicio.' },
    { valor: 'AVISO', etiqueta: 'Aviso', icono: '📣', tipo: 'diaria', ayuda: 'La escuela avisa o pide algo: cancelar, viandas, cambios de menú, logística.' },
    { valor: 'REEMPLAZOS C/A', etiqueta: 'Reemplazos con aviso', icono: '🔁', tipo: 'diaria', ayuda: 'Reemplazos de menú o productos que fueron avisados de antemano.' },
    { valor: 'CUPOS', etiqueta: 'Cupos', icono: '👥', tipo: 'diaria', ayuda: 'Altas, bajas o cambios de cupos, incluidos los especiales (patologías).' },
    { valor: 'EQUIPAMIENTO', etiqueta: 'Equipamiento', icono: '🧊', tipo: 'Estructural', ayuda: 'Pedir o instalar equipos y elementos: freezer, heladera, cocina, termotanque, electrodomésticos, utensilios, mobiliario.' },
    { valor: 'MANTENIMIENTO', etiqueta: 'Mantenimiento', icono: '🛠️', tipo: 'Estructural', ayuda: 'Reparaciones: gas (cocina, horno, termotanque), refrigeración, plomería, electricidad, desagües y canaletas.' },
    { valor: 'CONSEJO', etiqueta: 'Consejo Escolar', icono: '🏫', tipo: 'Estructural', ayuda: 'Temas que corresponden al Consejo Escolar: agua, luz, gas, poda, edificio.' },
    { valor: 'OTROS', etiqueta: 'Otros', icono: '📌', tipo: 'diaria', ayuda: 'Personal, espacio u otros temas.' }
  ],

  // Motivo = columna "Subcategoria" de la hoja
  motivos: {
    ALIMENTOS: [
      { valor: 'FALTANTE', etiqueta: 'Faltante', ayuda: 'No llegó algo, llegó menos cantidad o no coincide con el remito.' },
      { valor: 'CALIDAD', etiqueta: 'Calidad', ayuda: 'Llegó, pero en mal estado: podrido, roto, vencido, duro, congelado…' },
      { valor: 'FUERA DE HORARIO', etiqueta: 'Fuera de horario', ayuda: 'La entrega llegó tarde o en un horario en que no pueden recibir.' },
      { valor: 'REEMPLAZOS S/A', etiqueta: 'Reemplazos sin aviso', ayuda: 'Mandaron otro producto en lugar del que correspondía, sin avisar.' },
      { valor: 'ENTREGA EQUIVOCADA', etiqueta: 'Entrega equivocada / de más', ayuda: 'Llegó de más, mercadería de otra escuela o de una prestación que no tiene.' },
      { valor: 'REPARTO', etiqueta: 'Reparto / chofer', ayuda: 'Queja por cómo entregó el personal del proveedor: trato, descarga, daños, basura, mercadería dejada en otro lado.' },
      { valor: 'OTROS', etiqueta: 'Otros', ayuda: 'Cualquier otro problema con los alimentos.' }
    ],
    AVISO: [
      { valor: 'LOGISTICA', etiqueta: 'Logística', ayuda: 'Dónde o cómo entregar: subir a planta alta, sede/anexo, horarios de recepción.' },
      { valor: 'MENU', etiqueta: 'Menú', ayuda: 'Avisos sobre cambios o pedidos del menú.' },
      { valor: 'CANCELACION', etiqueta: 'Cancelación', ayuda: 'Suspender o cancelar uno o más despachos por otro motivo (no paro ni calendario).' },
      { valor: 'PARO', etiqueta: 'Paro / sin clases', ayuda: 'Paro, escuela cerrada, sin clases, asueto o jornada institucional (aunque haya que cancelar la entrega).' },
      { valor: 'CALENDARIO', etiqueta: 'Calendario', ayuda: 'Inicio o fin de ciclo, receso, último día de entrega, cupo reducido por fin de año.' },
      { valor: 'VIANDAS', etiqueta: 'Viandas', ayuda: 'Pedido de viandas para días puntuales.' },
      { valor: 'OTROS', etiqueta: 'Otros', ayuda: 'Cualquier otro aviso de la escuela.' }
    ],
    'REEMPLAZOS C/A': [
      { valor: 'MENU', etiqueta: 'Menú', ayuda: 'Se reemplazó el menú, con aviso previo.' },
      { valor: 'OTROS', etiqueta: 'Producto', ayuda: 'Se reemplazó un producto puntual, con aviso (ej. cebolla por papa). En la hoja figura como OTROS.' }
    ],
    CUPOS: [
      { valor: 'ESPECIALES - ALTA', etiqueta: 'Especiales - Alta', ayuda: 'Alta de un alumno con patología (celíaco, diabético, etc.).' },
      { valor: 'ESPECIALES - BAJA', etiqueta: 'Especiales - Baja', ayuda: 'Baja de un cupo especial.' },
      { valor: 'ESPECIALES', etiqueta: 'Especiales', ayuda: 'Otros temas de cupos especiales.' },
      { valor: 'BOLSON', etiqueta: 'Bolsón / mensual', ayuda: 'Cupos de bolsón, cajas o entregas mensuales.' },
      { valor: 'OTROS', etiqueta: 'Cambio de cupo', ayuda: 'Cambio en los cupos generales (sube, baja, cupo nuevo). En la hoja figura como OTROS.' }
    ],
    EQUIPAMIENTO: [
      { valor: 'FREEZER', etiqueta: 'Freezer', ayuda: 'Pedir, entregar o instalar un freezer.' },
      { valor: 'HELADERA', etiqueta: 'Heladera', ayuda: 'Pedir, entregar o instalar una heladera (familiar o comercial).' },
      { valor: 'COCINA', etiqueta: 'Cocina', ayuda: 'Pedir o instalar cocina (familiar, industrial de 4 o 6 hornallas), horno o anafe.' },
      { valor: 'TERMOTANQUE', etiqueta: 'Termotanque', ayuda: 'Pedir o instalar un termotanque (a gas o eléctrico).' },
      { valor: 'ELECTRODOMESTICOS', etiqueta: 'Electrodomésticos', ayuda: 'Multiprocesadora, licuadora, minipimer, pava eléctrica, microondas, balanza.' },
      { valor: 'UTENSILIOS', etiqueta: 'Utensilios', ayuda: 'Ollas, cacerolas, platos, vasos, cubiertos, jarras, bateas, cucharones, etc.' },
      { valor: 'MOBILIARIO', etiqueta: 'Mobiliario', ayuda: 'Mesas, sillas, bancos, estanterías, alacenas.' }
    ],
    MANTENIMIENTO: [
      { valor: 'GAS', etiqueta: 'Gas', ayuda: 'Cocina, horno u hornallas que no prenden, termotanque, estufa, pérdida u olor a gas.' },
      { valor: 'REFRIGERACION', etiqueta: 'Refrigeración', ayuda: 'Freezer, heladera o aire acondicionado que no enfría o hay que reparar.' },
      { valor: 'PLOMERIA', etiqueta: 'Plomería', ayuda: 'Inodoro tapado, mochila o flotante, canillas, pérdidas de agua, bomba o tanque.' },
      { valor: 'ELECTRICIDAD', etiqueta: 'Electricidad', ayuda: 'Sin luz, salta la térmica, enchufes, iluminación, portero o timbre, cables.' },
      { valor: 'DESAGUES', etiqueta: 'Desagües y cloacas', ayuda: 'Cloaca tapada, cámara séptica, grasera, cámara de inspección (atmosférico).' },
      { valor: 'CANALETAS', etiqueta: 'Canaletas', ayuda: 'Canaletas tapadas o rotas, embudos, rejillas, filtraciones por lluvia.' },
      { valor: 'OTROS', etiqueta: 'Otros', ayuda: 'Otro arreglo.' }
    ],
    CONSEJO: [
      { valor: 'AGUA', etiqueta: 'Agua', ayuda: 'Falta de agua, pérdidas, cañerías.' },
      { valor: 'ELECTRICIDAD', etiqueta: 'Electricidad', ayuda: 'Cortes de luz, instalación eléctrica.' },
      { valor: 'GAS', etiqueta: 'Gas', ayuda: 'Instalación de gas del edificio.' },
      { valor: 'PODA', etiqueta: 'Poda', ayuda: 'Árboles o poda.' },
      { valor: 'INFRAESTRUCTURA', etiqueta: 'Infraestructura', ayuda: 'Edificio: techos, baños, paredes.' },
      { valor: 'UTENSILIOS', etiqueta: 'Utensilios', ayuda: 'Utensilios a cargo del Consejo.' },
      { valor: 'MOBILIARIO', etiqueta: 'Mobiliario', ayuda: 'Mobiliario a cargo del Consejo.' }
    ],
    OTROS: [
      { valor: 'PERSONAL', etiqueta: 'Personal', ayuda: 'Personal de la escuela (cocina, auxiliares). Lo del chofer o el reparto va en Alimentos › Reparto.' },
      { valor: 'ESPACIO', etiqueta: 'Espacio', ayuda: 'Espacio físico para recibir o guardar la mercadería.' }
    ]
  },

  // Problema específico (columna PROBLEMA): qué pasó exactamente. Se elige según el motivo.
  problemas: {
    // ---- Mantenimiento (también sirven para el Consejo Escolar) ----
    GAS: [
      { valor: 'PERDIDA DE GAS', etiqueta: 'Pérdida u olor a gas', ayuda: 'Olor a gas o pérdida en cocina, cañería o artefacto.' },
      { valor: 'COCINA NO PRENDE', etiqueta: 'Hornalla u horno no prende', ayuda: 'No prende o se apaga: termocupla, robinete, válvula, quemadores.' },
      { valor: 'PERILLAS O PUERTA', etiqueta: 'Perillas, puerta o bisagras', ayuda: 'Perillas flojas o rotas, puerta del horno, bisagras, vidrio.' },
      { valor: 'TERMOTANQUE NO PRENDE', etiqueta: 'Termotanque no prende / se apaga', ayuda: 'No calienta el agua, no prende o se apaga.' },
      { valor: 'TERMOTANQUE PIERDE', etiqueta: 'Termotanque pierde agua', ayuda: 'Pinchado, gotea o pierde agua.' },
      { valor: 'SIN GAS', etiqueta: 'Sin gas o poca presión', ayuda: 'No llega gas, poca fuerza, corte o problema con el medidor.' },
      { valor: 'ESTUFA', etiqueta: 'Estufa o calefactor', ayuda: 'Estufa o calefactor que no anda o hay que revisar.' },
      { valor: 'CONDUCTO DE GASES', etiqueta: 'Salida de gases / conducto', ayuda: 'Conducto o chimenea de evacuación de gases.' },
      { valor: 'REVISION DE COCINA', etiqueta: 'Revisión general', ayuda: 'Revisar la cocina o la instalación sin una falla puntual.' }
    ],
    REFRIGERACION: [
      { valor: 'NO ENFRIA', etiqueta: 'No enfría / no funciona', ayuda: 'Motor, carga de gas, termostato o plaqueta.' },
      { valor: 'HACE HIELO', etiqueta: 'Hace hielo o congela de más', ayuda: 'Escarcha o temperatura mal regulada.' },
      { valor: 'BURLETE O PUERTA', etiqueta: 'Burlete, puerta o manija', ayuda: 'La puerta no cierra bien, burlete o manija rota.' },
      { valor: 'RUIDO O PIERDE AGUA', etiqueta: 'Hace ruido o pierde agua', ayuda: 'Ruidos raros, gotea o pierde agua.' },
      { valor: 'AIRE ACONDICIONADO', etiqueta: 'Aire acondicionado', ayuda: 'Aire que no enfría, no anda o hay que limpiar.' },
      { valor: 'REVISION', etiqueta: 'Revisión / service', ayuda: 'Revisar, limpiar o regular el equipo.' }
    ],
    PLOMERIA: [
      { valor: 'INODORO TAPADO', etiqueta: 'Inodoro tapado o roto', ayuda: 'Destape, inodoro roto o hay que cambiarlo.' },
      { valor: 'MOCHILA O FLOTANTE', etiqueta: 'Mochila o flotante', ayuda: 'La mochila pierde, no carga o el flotante no corta.' },
      { valor: 'CANILLA O GRIFERIA', etiqueta: 'Canilla o grifería', ayuda: 'Canilla que gotea o no cierra, grifería, flexible, llave de paso.' },
      { valor: 'PERDIDA DE AGUA', etiqueta: 'Pérdida de agua', ayuda: 'Pérdida en cañería, sifón, bacha o pileta.' },
      { valor: 'SIN AGUA O BOMBA', etiqueta: 'Sin agua / bomba / tanque', ayuda: 'No hay agua o hay poca presión: bomba, tanque de agua, colector.' }
    ],
    AGUA: [
      { valor: 'INODORO TAPADO', etiqueta: 'Inodoro tapado o roto', ayuda: 'Destape, inodoro roto o hay que cambiarlo.' },
      { valor: 'MOCHILA O FLOTANTE', etiqueta: 'Mochila o flotante', ayuda: 'La mochila pierde, no carga o el flotante no corta.' },
      { valor: 'CANILLA O GRIFERIA', etiqueta: 'Canilla o grifería', ayuda: 'Canilla que gotea o no cierra, grifería, flexible, llave de paso.' },
      { valor: 'PERDIDA DE AGUA', etiqueta: 'Pérdida de agua', ayuda: 'Pérdida en cañería, sifón, bacha o pileta.' },
      { valor: 'SIN AGUA O BOMBA', etiqueta: 'Sin agua / bomba / tanque', ayuda: 'No hay agua o hay poca presión: bomba, tanque de agua, colector.' }
    ],
    ELECTRICIDAD: [
      { valor: 'SIN LUZ O TERMICA', etiqueta: 'Sin luz / salta la térmica', ayuda: 'Corte de luz, salta la térmica o el disyuntor, problema en el tablero.' },
      { valor: 'ENCHUFES O TOMAS', etiqueta: 'Enchufes o tomas', ayuda: 'Tomas que no andan, sueltos o quemados.' },
      { valor: 'ILUMINACION', etiqueta: 'Iluminación', ayuda: 'Tubos, plafones, lámparas o reflectores que no prenden.' },
      { valor: 'PORTERO O TIMBRE', etiqueta: 'Portero o timbre', ayuda: 'Portero eléctrico o timbre.' },
      { valor: 'CABLES O INSTALACION', etiqueta: 'Cables o instalación', ayuda: 'Cables pelados o quemados, olor a quemado, chispas, instalación nueva.' }
    ],
    DESAGUES: [
      { valor: 'CLOACA TAPADA', etiqueta: 'Cloaca tapada', ayuda: 'Desborde, bajadas cloacales o desagüe tapado.' },
      { valor: 'CAMARA SEPTICA', etiqueta: 'Cámara séptica / pozo', ayuda: 'Hay que vaciar la cámara séptica o el pozo (atmosférico).' },
      { valor: 'GRASERA', etiqueta: 'Grasera', ayuda: 'Limpieza de la grasera de la cocina.' },
      { valor: 'CAMARA DE INSPECCION', etiqueta: 'Cámara de inspección', ayuda: 'Cámara de inspección tapada o rota.' },
      { valor: 'MAL OLOR', etiqueta: 'Mal olor', ayuda: 'Olor a cloaca en cocina o baños.' }
    ],
    CANALETAS: [
      { valor: 'CANALETA TAPADA', etiqueta: 'Canaleta tapada', ayuda: 'Hojas o basura: hay que limpiarla.' },
      { valor: 'CANALETA ROTA', etiqueta: 'Canaleta rota', ayuda: 'Canaleta o zinguería rota o despegada.' },
      { valor: 'EMBUDO O REJILLA', etiqueta: 'Embudo o rejilla', ayuda: 'Embudo de desagüe o rejilla de hierro.' },
      { valor: 'FILTRACIONES', etiqueta: 'Filtraciones o goteras', ayuda: 'Entra agua cuando llueve.' }
    ],
    // ---- Equipamiento ----
    FREEZER: [
      { valor: 'PIDE UNO NUEVO', etiqueta: 'Falta / pide uno nuevo', ayuda: 'No tiene, no alcanza o hay que reponerlo.' },
      { valor: 'INSTALACION', etiqueta: 'Instalar o trasladar', ayuda: 'Instalar uno que llegó o llevarlo a otra escuela.' },
      { valor: 'REPARACION', etiqueta: 'Necesita reparación', ayuda: 'Está, pero no funciona (si es para arreglar, conviene Mantenimiento).' }
    ],
    HELADERA: [
      { valor: 'PIDE UNO NUEVO', etiqueta: 'Falta / pide uno nuevo', ayuda: 'No tiene, no alcanza o hay que reponerlo.' },
      { valor: 'INSTALACION', etiqueta: 'Instalar o trasladar', ayuda: 'Instalar uno que llegó o llevarlo a otra escuela.' },
      { valor: 'REPARACION', etiqueta: 'Necesita reparación', ayuda: 'Está, pero no funciona (si es para arreglar, conviene Mantenimiento).' }
    ],
    COCINA: [
      { valor: 'PIDE UNO NUEVO', etiqueta: 'Falta / pide uno nuevo', ayuda: 'No tiene, no alcanza o hay que reponerlo.' },
      { valor: 'INSTALACION', etiqueta: 'Instalar o trasladar', ayuda: 'Instalar uno que llegó o llevarlo a otra escuela.' },
      { valor: 'REPARACION', etiqueta: 'Necesita reparación', ayuda: 'Está, pero no funciona (si es para arreglar, conviene Mantenimiento).' }
    ],
    TERMOTANQUE: [
      { valor: 'PIDE UNO NUEVO', etiqueta: 'Falta / pide uno nuevo', ayuda: 'No tiene, no alcanza o hay que reponerlo.' },
      { valor: 'INSTALACION', etiqueta: 'Instalar o trasladar', ayuda: 'Instalar uno que llegó o llevarlo a otra escuela.' },
      { valor: 'REPARACION', etiqueta: 'Necesita reparación', ayuda: 'Está, pero no funciona (si es para arreglar, conviene Mantenimiento).' }
    ],
    ELECTRODOMESTICOS: [
      { valor: 'PIDE UNO NUEVO', etiqueta: 'Falta / pide uno nuevo', ayuda: 'No tiene, no alcanza o hay que reponerlo.' },
      { valor: 'INSTALACION', etiqueta: 'Instalar o trasladar', ayuda: 'Instalar uno que llegó o llevarlo a otra escuela.' },
      { valor: 'REPARACION', etiqueta: 'Necesita reparación', ayuda: 'Está, pero no funciona (si es para arreglar, conviene Mantenimiento).' }
    ],
    UTENSILIOS: [
      { valor: 'FALTAN', etiqueta: 'Faltan / no alcanzan', ayuda: 'No hay suficientes para el cupo o piden más.' },
      { valor: 'ROTOS O GASTADOS', etiqueta: 'Rotos o gastados', ayuda: 'Se rompieron o están deteriorados y hay que reponerlos.' }
    ],
    MOBILIARIO: [
      { valor: 'FALTAN', etiqueta: 'Faltan / no alcanzan', ayuda: 'No hay suficientes para el cupo o piden más.' },
      { valor: 'ROTOS O GASTADOS', etiqueta: 'Rotos o gastados', ayuda: 'Se rompieron o están deteriorados y hay que reponerlos.' }
    ],
    // ---- Alimentos ----
    FALTANTE: [
      { valor: 'NO LLEGO', etiqueta: 'No llegó', ayuda: 'El producto no llegó en absoluto.' },
      { valor: 'MENOR CANTIDAD', etiqueta: 'Llegó menos cantidad', ayuda: 'Llegó, pero no alcanza para el cupo.' },
      { valor: 'NO COINCIDE CON REMITO', etiqueta: 'No coincide con el remito', ayuda: 'Lo entregado es distinto de lo que dice el remito.' },
      { valor: 'PATOLOGIA SIN MERCADERIA', etiqueta: 'Sin mercadería de patología', ayuda: 'No llegó lo del alumno celíaco, diabético, etc.' }
    ],
    CALIDAD: [
      { valor: 'MAL ESTADO', etiqueta: 'Mal estado / podrido', ayuda: 'Fruta o verdura podrida, con hongos, verde, con olor.' },
      { valor: 'ROTO O DAÑADO', etiqueta: 'Roto o dañado', ayuda: 'Paquetes rotos, galletitas partidas, cajas aplastadas.' },
      { valor: 'VENCIDO', etiqueta: 'Vencido', ayuda: 'Producto con fecha de vencimiento pasada.' },
      { valor: 'TEMPERATURA', etiqueta: 'Temperatura inadecuada', ayuda: 'Llegó congelado, muy frío o caliente cuando no corresponde.' },
      { valor: 'CRUDO O DURO', etiqueta: 'Crudo, duro o gomoso', ayuda: 'Pan o panificados mal cocidos, duros o del día anterior.' },
      { valor: 'SIN ROTULO', etiqueta: 'Sin rótulo o fecha', ayuda: 'Sin fecha de elaboración o etiqueta (lo observa bromatología).' },
      { valor: 'CAMBIO DE MARCA', etiqueta: 'Cambio de marca', ayuda: 'Cambiaron la marca y no funciona igual o no gusta.' },
      { valor: 'NO APTO PATOLOGIA', etiqueta: 'No apto para la patología', ayuda: 'Le mandaron al alumno algo que no puede comer.' },
      { valor: 'OTRO', etiqueta: 'Otro problema', ayuda: 'Otro problema de calidad.' }
    ]
  },

  // Productos (columna PRODUCTO). Se respetan los valores que ya usa la hoja.
  productos: [
    'PAN', 'LIBRITOS', 'PIZZETAS', 'GALLETITAS', 'FRUTA', 'VERDURAS', 'LECHE', 'YOGURT',
    'QUESO', 'HUEVOS', 'CARNE', 'POLLO', 'MILANESAS', 'ARROZ', 'FIDEOS', 'AZÚCAR',
    'CACAO', 'MATECOCIDO', 'MERMELADA/DDL', 'DULCE', 'CONDIMENTOS', 'INGREDIENTES',
    'LEVADURA', 'TAPA TARTA', 'BEBIDAS', 'MENU COMPLETO', 'ITEMS VARIOS', 'OTROS'
  ],

  patologias: ['CELIAQUIA', 'DIABETES', 'INTOLERANCIA A LA LACTOSA', 'OTRA'],

  servicios: ['DESAYUNO/MERIENDA', 'COMEDOR', 'DM/COMEDOR', 'BOLSON', 'PATIOS', 'VIANDAS', 'DM MATERNAL'],

  proveedoresBase: ['GRUPO L', 'GYULAND', 'EDEAL', 'TINTENFISCH', 'VALBER'],

  estados: ['Pendiente', 'En gestión', 'Resuelto'],

  responsables: ['Muni', 'Proveedor', 'Escuela']
};

/* --------------------------------------------------------------------------
 * ASISTENTE DE CLASIFICACIÓN
 * Lee el detalle y propone categoría, motivo, problema, producto y patología.
 * Son reglas simples por palabras clave, armadas con los reclamos reales.
 * -------------------------------------------------------------------------- */
const ASISTENTE = (function () {

  function normalizar(t) {
    return String(t || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, ' ');
  }

  // El orden importa: la primera regla que coincide gana.
  const REGLAS_PRODUCTO = [
    [/esencia( de vainilla)?/, 'INGREDIENTES'],
    [/galletas? de arroz/, 'GALLETITAS'],
    [/tapa(s)? (de )?tarta/, 'TAPA TARTA'],
    [/pizzet/, 'PIZZETAS'],
    [/librito/, 'LIBRITOS'],
    [/milanesa/, 'MILANESAS'],
    [/dulce de leche|mermelada|\bddl\b/, 'MERMELADA/DDL'],
    [/dulce de batata|dulce de membrillo|\bdulce\b/, 'DULCE'],
    [/\bpan(es)?\b|figaza|figacita|figazita|lactal/, 'PAN'],
    [/galle|galleta|vainilla|magdalena|bizcoch/, 'GALLETITAS'],
    [/mandarin|naranj|banan|manzan|fruta|citric|pera(s)?\b|durazno/, 'FRUTA'],
    [/zapallo|calabaza|tomate|\bpapa(s)?\b|cebolla|zanahoria|verdura|acelga|lechuga|batata/, 'VERDURAS'],
    [/yogur/, 'YOGURT'],
    [/leche/, 'LECHE'],
    [/queso/, 'QUESO'],
    [/huevo/, 'HUEVOS'],
    [/pollo|suprema/, 'POLLO'],
    [/carne|cerdo|picada/, 'CARNE'],
    [/arroz/, 'ARROZ'],
    [/fideo/, 'FIDEOS'],
    [/azucar/, 'AZÚCAR'],
    [/cacao/, 'CACAO'],
    [/mate ?cocido|infusion|\bte\b/, 'MATECOCIDO'],
    [/condimento|\bsal\b|aceite|oregano|provenzal|pimenton/, 'CONDIMENTOS'],
    [/levadura/, 'LEVADURA'],
    [/harina|ingrediente/, 'INGREDIENTES'],
    [/jugo|bebida|agua mineral/, 'BEBIDAS']
  ];

  function detectarProductos(texto) {
    let t = texto;
    const encontrados = [];
    REGLAS_PRODUCTO.forEach(([re, prod]) => {
      const global = new RegExp(re.source, 'g');
      if (global.test(t)) {
        if (!encontrados.includes(prod)) encontrados.push(prod);
        // Se quita lo encontrado para que "dulce de leche" no cuente también como "leche"
        t = t.replace(new RegExp(re.source, 'g'), ' ');
      }
    });
    // "la carne de las milanesas" es un solo producto
    if (encontrados.includes('MILANESAS')) {
      return encontrados.filter(p => p !== 'CARNE' && p !== 'POLLO');
    }
    return encontrados;
  }

  function detectarPatologia(t) {
    if (/celiac|celiaq|sin tacc/.test(t)) return 'CELIAQUIA';
    if (/diabet/.test(t)) return 'DIABETES';
    if (/lactosa/.test(t)) return 'INTOLERANCIA A LA LACTOSA';
    if (/patolog/.test(t)) return 'OTRA';
    return '';
  }

  /* ---------- Mantenimiento y equipamiento ----------
   * Devuelve { categoria, motivo, problema, razon } o null. El orden importa:
   * primero lo más específico (desagües, canaletas, plomería, electricidad,
   * refrigeración, termotanque) y al final la cocina, que a veces es solo el lugar
   * ("la canilla de la cocina"). Si piden algo nuevo va a Equipamiento; si hay
   * que arreglarlo, a Mantenimiento (como se viene cargando en la hoja). */
  const RE_PEDIDO = /\b(pedido|pide|piden|pidio|pedir|solicita|solicitan|necesita|necesitan|requiere|falta|faltan|no (tiene|tienen|hay|cuenta|cuentan)|entrega|entregar|llevar|nuev[oa]s?|comprar|reponer|reposicion|cambiar (el|la|los|las))\b/;
  const RE_INSTALAR = /instal|colocar|conectar|traslad|llevar (la|el) .* a /;
  const RE_FALLA = /no (funciona|anda|prende|enciende|enfria|calienta|sale|cierra|carga|corta)|se (apaga|rompio|rompieron|quemo|corta|tapo|tapa|desborda|cayo)|\brot[oa]s?\b|rompi|pierde|perdida|gotea|goteo|pinchad|revis|repar|arregl|service|falla|tapad|desbord|salta|quemad|flojo|flojas?|suelt[oa]s?|averia|anda mal|funciona mal|no esta funcionando/;
  const pedidoSinFalla = (t) => RE_PEDIDO.test(t) && !RE_FALLA.test(t);
  const equipo = (t, motivo, razon) => ({
    categoria: 'EQUIPAMIENTO', motivo, razon,
    problema: RE_INSTALAR.test(t) ? 'INSTALACION' : (RE_FALLA.test(t) ? 'REPARACION' : 'PIDE UNO NUEVO')
  });
  const APARATO = /anafe|pava|termo|horno|procesadora|microondas|heladera|freezer|frezzer|licuadora|cocina|calefon|estufa|aire/;

  function mantenimiento(t) {
    const M = (motivo, problema, razon) => ({ categoria: 'MANTENIMIENTO', motivo, problema, razon });

    // Desagües y cloacas (atmosférico)
    if (/camara septica|pozo ciego|pozo negro|atmosferic|grasera|cloaca|cloacal|camara de inspeccion|olor a cloaca|desagote/.test(t)) {
      const p = /septica|pozo|atmosferic|desagote/.test(t) ? 'CAMARA SEPTICA' : /grasera/.test(t) ? 'GRASERA'
        : /camara de inspeccion/.test(t) ? 'CAMARA DE INSPECCION' : /olor/.test(t) && !/tapad|desbord/.test(t) ? 'MAL OLOR' : 'CLOACA TAPADA';
      return M('DESAGUES', p, 'menciona cloacas o desagües');
    }
    // Canaletas y desagües pluviales
    if (/canaleta|embudo|zingueria|desague pluvial|bajada pluvial|rejilla (de hierro|del patio|pluvial)/.test(t)) {
      const p = /rot[oa]|repar|despeg|suelt|cayo/.test(t) ? 'CANALETA ROTA' : /embudo|rejilla/.test(t) ? 'EMBUDO O REJILLA'
        : /filtr|gotera|gotea|lluvia|llueve/.test(t) ? 'FILTRACIONES' : 'CANALETA TAPADA';
      return M('CANALETAS', p, 'menciona canaletas');
    }
    // Plomería (si no es el termotanque o la heladera la que pierde)
    const termo = /termo ?tanque|termotan|termotamque|temrotanque|\btermos?\b|calefon|agua caliente/.test(t);
    if (!termo && !/heladera|freezer|frezzer|aire acondicionado/.test(t) &&
        /inodoro|mochila|flotante|canilla|griferia|grifo|flexible|bacha|pileta|sifon|lavamanos|lavatorio|\bbanos?\b|caneria|perdida de agua|pierde agua|sin agua|no hay agua|no sale agua|no tienen agua|corte de agua|presion (de|del) agua|poca presion|\bbomba|tanque de agua|\btanque\b|llave de paso|colector|destap|mingitorio|depresor|cisterna/.test(t)) {
      const p = /inodoro|destap|mingitorio/.test(t) && !/mochila|flotante|depresor/.test(t) ? 'INODORO TAPADO'
        : /mochila|flotante|cisterna|depresor/.test(t) ? 'MOCHILA O FLOTANTE'
        : /canilla|griferia|grifo|flexible|llave de paso/.test(t) ? 'CANILLA O GRIFERIA'
        : /sin agua|no hay agua|no sale agua|no tienen agua|corte de agua|presion|bomba|tanque|colector/.test(t) ? 'SIN AGUA O BOMBA'
        : 'PERDIDA DE AGUA';
      return M('PLOMERIA', p, 'problema de plomería');
    }
    // Electricidad (lo "eléctrico" de un aparato no cuenta: anafe eléctrico, pava eléctrica...)
    const fuerteElec = /\bluz\b|\bluces\b|termica|disyuntor|tablero|enchufe|cortocircuito|chispa|olor a quemado|portero|timbre|plafon|lampara|lamparita|\bfocos?\b|reflector|iluminacion|jabalina|puesta a tierra|corte de (luz|energia)|sin (luz|energia)|\bcables?\b|cableado|\btomas? ?corrientes?\b|\btomas\b|tubos? (led|fluorescente)|\btubos?\b(?! de gas)/;
    if (fuerteElec.test(t) || (/electric/.test(t) && !APARATO.test(t))) {
      const p = /tubo|plafon|lampara|lamparita|foco|reflector|iluminacion|luces/.test(t) ? 'ILUMINACION'
        : /portero|timbre/.test(t) ? 'PORTERO O TIMBRE'
        : /enchufe|toma/.test(t) ? 'ENCHUFES O TOMAS'
        : /cable|cableado|quemad|chispa|cortocircuito|instalacion/.test(t) ? 'CABLES O INSTALACION'
        : 'SIN LUZ O TERMICA';
      return M('ELECTRICIDAD', p, 'problema eléctrico');
    }
    // Refrigeración: heladera, freezer, aire acondicionado
    if (/fr+e+z+e*r|helader|refrigeracion|refrigerador|no enfria|enfria de mas|burlete|camara de frio|congelador|exhibidora|aire acondicionado|\baires?\b (no |acondicionado)|\bsplit\b/.test(t)) {
      const aire = /aire acondicionado|\baires?\b|split/.test(t);
      if (!aire && pedidoSinFalla(t)) return equipo(t, /heladera/.test(t) ? 'HELADERA' : 'FREEZER', 'piden heladera o freezer');
      if (!aire && RE_INSTALAR.test(t) && !RE_FALLA.test(t)) return equipo(t, /heladera/.test(t) ? 'HELADERA' : 'FREEZER', 'instalar heladera o freezer');
      const p = aire ? 'AIRE ACONDICIONADO' : /burlete|puerta|manija|no cierra/.test(t) ? 'BURLETE O PUERTA'
        : /hielo|escarcha|congela de mas|congela todo/.test(t) ? 'HACE HIELO'
        : /ruido|pierde agua|gotea|charco/.test(t) ? 'RUIDO O PIERDE AGUA'
        : /no enfria|no funciona|no anda|no prende|motor|termostato|plaqueta|carga de gas|se corta|calienta|funcionando mal|anda mal|funciona mal|no regula|temperatura/.test(t) ? 'NO ENFRIA' : 'REVISION';
      return M('REFRIGERACION', p, aire ? 'aire acondicionado para reparar' : 'freezer o heladera para reparar');
    }
    // Termotanque / calefón (lo arregla el servicio de gas)
    if (termo) {
      if (pedidoSinFalla(t) || (RE_INSTALAR.test(t) && !RE_FALLA.test(t))) return equipo(t, 'TERMOTANQUE', 'piden o hay que instalar un termotanque');
      const p = /pierde|perdida|gotea|pinchad|agua (por|en el piso)|chorrea/.test(t) ? 'TERMOTANQUE PIERDE' : 'TERMOTANQUE NO PRENDE';
      return M('GAS', p, 'termotanque para reparar');
    }
    // Estufa o calefactor
    if (/estufa|calefactor|calefaccion|caloventor|tiro balanceado/.test(t)) return M('GAS', 'ESTUFA', 'menciona estufa o calefacción');
    // Gas (pérdida, sin gas, conducto)
    if (/\bgas\b|garrafa|naturgy|medidor|olor a gas|fuga/.test(t)) {
      if (/perdida|pierde|olor|fuga/.test(t)) return M('GAS', 'PERDIDA DE GAS', 'pérdida u olor a gas');
      if (/conducto|salida de gases|chimenea|ventilacion/.test(t)) return M('GAS', 'CONDUCTO DE GASES', 'conducto de gases');
      if (/sin gas|no hay gas|no tienen gas|no tiene gas|falta de gas|fuerza|presion|corte|cortaron|medidor|no llega/.test(t)) return M('GAS', 'SIN GAS', 'falta gas o poca presión');
      if (/cocina|horno|hornalla|anafe/.test(t)) return M('GAS', /perilla|puerta|bisagra|vidrio/.test(t) ? 'PERILLAS O PUERTA' : 'COCINA NO PRENDE', 'cocina a gas');
      return M('GAS', 'REVISION DE COCINA', 'menciona gas');
    }
    // Electrodomésticos chicos
    if (/procesadora|licuadora|mini ?pimer|batidora|pava electrica|\bpava\b|microondas|balanza|tostadora|cafetera|dispenser|freidora/.test(t) && !/camion|remito/.test(t)) {
      return equipo(t, 'ELECTRODOMESTICOS', 'menciona un electrodoméstico');
    }
    // Cocina, horno, hornallas, anafe
    const partes = /horno|hornalla|quemador|anafe|robinete|termocupla|perilla|pizzero|mechero|valvula de seguridad|bisagra/;
    const cocina = /\bcocinas?\b/.test(t) && !/personal de cocina|cocinera|cocinero|ayudante de cocina|auxiliar(es)? de cocina|cocina y comedor|cocina comedor|lugar fisico/.test(t);
    if (partes.test(t) || (cocina && (RE_FALLA.test(t) || RE_PEDIDO.test(t) || RE_INSTALAR.test(t)))) {
      if ((pedidoSinFalla(t) || (RE_INSTALAR.test(t) && !RE_FALLA.test(t))) && !/robinete|termocupla|perilla|valvula/.test(t)) {
        return equipo(t, 'COCINA', 'piden o hay que instalar cocina, horno o anafe');
      }
      const p = /perilla|puerta|bisagra|vidrio|manija|ladrillo|lana/.test(t) ? 'PERILLAS O PUERTA'
        : /termocupla|robinete|valvula|no prende|se apaga|no enciende|no calienta|quemador|hornalla|no funciona|no anda/.test(t) ? 'COCINA NO PRENDE'
        : 'REVISION DE COCINA';
      return M('GAS', p, 'cocina u horno para reparar');
    }
    // Utensilios
    if (/utensil|utensill|vajilla|cubiertos?\b|cuchar|tenedor|cuchill|\bollas?\b|cacerola|jarras?\b|bandejas?\b|\bvasos?\b|\btazas?\b|\bbowls?\b|bateas?\b|asadera|colapasta|colador|espumadera|pisapapa|pelapapa|tablas? (de corte|blancas?)|hermetico|tupper|sarten|rallador|abrelatas|abre latas|compotera|\bplatos\b|\bplato hondo|enseres|contenedores/.test(t)) {
      return { categoria: 'EQUIPAMIENTO', motivo: 'UTENSILIOS', problema: /rot[oa]s|gastad|deterior|se (fueron )?rompi/.test(t) ? 'ROTOS O GASTADOS' : 'FALTAN', razon: 'menciona utensilios' };
    }
    // Mobiliario
    if (!/\bcajas?\b|cupo|\bmesa \d|\d+ mesa|entrega(r)? (de )?mesa|recib\w* (la )?mesa|programa/.test(t) &&
        /\bmesas\b|mesas? (de|del|para) comedor|\bsillas?\b|\bbancos?\b|estanteria|mobiliario|armario|alacena|meson|placard|\brack\b/.test(t)) {
      return { categoria: 'EQUIPAMIENTO', motivo: 'MOBILIARIO', problema: /rot[oa]s|gastad|deterior|se (fueron )?rompi/.test(t) ? 'ROTOS O GASTADOS' : 'FALTAN', razon: 'menciona mobiliario' };
    }
    return null;
  }

  /**
   * Devuelve { categoria, motivo, problema, producto, patologia, razones[] }
   * Los campos que no se pueden deducir quedan vacíos.
   */
  function sugerir(texto) {
    const t = normalizar(texto);
    const r = { categoria: '', motivo: '', problema: '', producto: '', patologia: '', razones: [] };
    // Solo un número ("139", "81"): en la hoja es un cambio de cupo
    if (/^\W*\d{1,4}\W*$/.test(t)) return Object.assign(r, { categoria: 'CUPOS', motivo: 'OTROS', razones: ['solo un número: cambio de cupo'] });
    if (t.trim().length < 4) return r;

    r.patologia = detectarPatologia(t);
    const productos = detectarProductos(t);

    const ret = (categoria, motivo, razon) => Object.assign(r, { categoria, motivo, producto: '', razones: [razon] });
    const roto = /no enfria|no funciona|no anda|se rompio|roto|rota|revisar|arreglar|repar|perdida|service/.test(t);

    // 0) Si habla de comida, menú o viandas porque están "sin gas / sin luz / sin heladera"
    //    y no pide un arreglo, es un aviso o un tema de alimentos, no mantenimiento.
    const RE_ARREGLO = /revis|repar|arregl|service|tecnico|presupuesto|no (funciona|anda|prende|enciende|enfria|calienta)|pierde|perdida de (gas|agua)|gotea|pinchad|instal|tapad|destap/;
    const hablaDeComida = productos.length > 0 || /\bmenu\b|vianda|chocolatada|cacao|contingencia|listo consumo|sin clases|\bclases\b|\bdmc?\b|desayuno|merienda|cajas? mesa|\bmesa\b.*caja|cupo mesa|camion|ya (tiene|tienen|puede|pueden)|vuelve|cerrad[oa]|suspend|cancel|cocinar|refuerzo|despacho|consumo|\bcupo\b|modificacion de/.test(t);
    // (una lista de utensilios con números no es comida: "90 tazas - 90 cucharas - 6 bandejas")
    const utensilios = (t.match(/cuchar|tenedor|cuchill|\bollas?\b|cacerola|jarras?\b|bandejas?\b|\bvasos?\b|\btazas?\b|\bplatos?\b|pelapapa|compotera|bowl|asadera|cucharon|utensil/g) || []).length;
    const saltearMant = hablaDeComida && !RE_ARREGLO.test(t) && utensilios < 2;

    // 1) Consejo Escolar: solo si lo nombran (o poda / techo del edificio)
    if (!saltearMant && (/consejo/.test(t) || /\bpoda|\barbol/.test(t))) {
      if (/\bpoda|\barbol/.test(t)) return ret('CONSEJO', 'PODA', 'menciona poda o árboles');
      const m = mantenimiento(t);
      if (m) {
        const mot = { GAS: 'GAS', ELECTRICIDAD: 'ELECTRICIDAD', PLOMERIA: 'AGUA', DESAGUES: 'AGUA' }[m.motivo];
        if (mot) return Object.assign(ret('CONSEJO', mot, 'menciona al Consejo Escolar y ' + m.razon), { problema: m.problema || '' });
        if (m.motivo === 'UTENSILIOS' || m.motivo === 'MOBILIARIO') return Object.assign(ret('CONSEJO', m.motivo, 'menciona al Consejo Escolar y ' + m.razon), { problema: m.problema || '' });
      }
      return ret('CONSEJO', 'INFRAESTRUCTURA', 'menciona al Consejo Escolar');
    }
    if (!saltearMant && /\btecho|humedad|edilici|infraestructura|rajadura|pared(es)? (rota|con)|revoque|pintura/.test(t) && !/canaleta|embudo/.test(t)) {
      return ret('CONSEJO', 'INFRAESTRUCTURA', 'problema del edificio');
    }

    // 2) Mantenimiento y equipamiento (armado con el preciario y la facturación de suministros)
    const m = saltearMant ? null : mantenimiento(t);
    if (m) return Object.assign(ret(m.categoria, m.motivo, m.razon), { problema: m.problema || '' });

    // 3) Avisos, cupos y reemplazos avisados (armado con los reclamos reales de la hoja)
    const RE_QUEJA = /vencid|mal estado|podrid|no llego|no llegaron|no vino|no vinieron|\bfalt|rot[oa]s?\b|llegaron|\bllego\b|\bllega\b|recibieron|recibio|en lugar de|hongo|feos?\b|sin aviso|no salio|no salieron|no llevaron|no enviaron|no mandaron|la mitad|\bmenos\b|fuera de horario|(?<!turno )\btarde\b|demor|tardanz|\btardo\b|tardaron|atrasad|\batraso|retras|a destiempo|fuera de hora\b|despues de hora|deberia (llegar|recibir)|debe(n)? (llegar|recibir)|tiene(n)? que (llegar|recibir)|reposicion|reponer|no mandan|no envian|dejaron|por error/;
    // (2.10.0) Llegó tarde, con otras palabras ("turno tarde" no cuenta: es el turno de la escuela)
    const RE_TARDE = /fuera de horario|fuera de hora\b|(?<!turno )\btarde\b|tardanz|\btardo\b|tardaron|demor|atrasad|\batraso|retras|a destiempo|despues de hora|pasado el horario|pasadas las/;
    // "No enviar galletitas Gold Mundo" o "no reciben queso" hablan de un producto: no es cancelar la entrega
    const sobreProducto = productos.length > 0 && !/mercader|consumo|despacho|entrega|\bdmc?\b|comedor|\bsae\b|nada|lunes|martes|miercoles|jueves|viernes|\d+\/\d+/.test(t);
    const RE_PAT = /celiac|celiaq|diabet|\bdbt\b|hipogras|hipocalor|hepatic|deslact|lactosa|\baplv\b|hiposod|vegan|vegetarian|intoleran|bajo peso|constipac|alergi|alergic|gluten|dieta (blanda|especial)|sin tacc|alto en fibra|fenilceton|obesidad|hipercolesterol|epilep/;
    // Viandas
    if (/vianda/.test(t) && !RE_QUEJA.test(t)) return ret('AVISO', 'VIANDAS', 'pide viandas');
    // Paro / sin clases (aunque pidan cancelar), calendario (inicio, fin de ciclo, receso) y cancelaciones por otro motivo
    const RE_PARO = /\bparo\b|sin clases|no hay clases|no habra clases|no (tienen|tuvieron|tuviron) clases|suspension de clases|suspenden (las )?clases|no (hay|tienen|habra) actividad|desinfecc|fumigac|desratiz|(?<!doble )\bjornada\b(?! (completa|simple|extendida))|(?<!mal )cerrad[oa]s?\b|feriado|asueto|adhier|adheren|elecciones|no asisten|sin (chicos|alumnos)|no (va a )?(estar|esta) abiert|no (van a )?abrir|no abren/;
    const RE_CALENDARIO = /ultimo (dia (de|que|del?)|despacho)|fin de (ciclo|clases|ano)|cierre (de|del) ciclo|receso|vacacion|cupo al \d+ ?%|\d+ ?% del cupo|(comienza|comienzan|empieza|empiezan|arranca|arrancan|inicia|inician|retoma|retoman|vuelve(n)?)\b.{0,25}(clases|el \d|\d+\/[23]\b|sae|servicio|febrero|marzo)|inicio de clases|tienen? actividad hasta|termina(n)? (el )?\d{1,2}\/12|hasta (el )?\d{1,2}\/12|colonia/;
    const RE_CANCEL = /suspend|cancel|no (enviar|mandar|envien|manden)\b|no (recibe|reciben|recibira|recibiran)\b|no recibe(n)? mas|dar de baja (el|los|las) (consumo|despacho|entrega)|se (da|dan) de baja (el|los) despacho|baja(r)? (el )?despacho/;
    if ((RE_PARO.test(t) || RE_CALENDARIO.test(t) || RE_CANCEL.test(t)) && !RE_QUEJA.test(t) && !sobreProducto
        && !(!RE_CALENDARIO.test(t) && !RE_CANCEL.test(t) && /(entregar|recibir|dejar|llevar).{0,40}(luego|despues|antes|a partir|\d{1,2}([:.]\d{2})? ?(hs|am|pm))|turno (manana|tarde)|luego de ese horario|dejar .*en (el )?anexo/.test(t) && !/\bparo\b|sin clases|asueto|feriado/.test(t))
        && !/(mal|bien) cerrad|cajas? .*cerrad/.test(t)) {
      // "Cerrado el turno mañana, entregar después de las 12" es una indicación de entrega (logística)
      const soloHorario = !/\bparo\b|sin clases|no hay clases|asueto|feriado|jornada|elecciones/.test(t)
        && /(entregar|recibir|recibe|reciben|dejar|llevar).{0,40}(luego|despues|antes|a partir|\d{1,2}([:.]\d{2})? ?(hs|am|pm))|turno (manana|tarde)|luego de ese horario|dejar .*en (el )?anexo|en sede/.test(t);
      if (RE_PARO.test(t) && !soloHorario && !/caja|heladera|freezer|porton|puerta/.test(t)) return ret('AVISO', 'PARO', 'paro, escuela cerrada o sin clases');
      if (RE_CALENDARIO.test(t)) return ret('AVISO', 'CALENDARIO', 'inicio o fin de ciclo, receso o último día');
      return ret('AVISO', 'CANCELACION', 'pide cancelar o suspender entregas');
    }
    // Cupos especiales (patologías): "1 celíaco", "1 alumno diabético", "se da de baja el celíaco"
    if (RE_PAT.test(t) && !/no recib|\bfalt|no llego|mal estado|vencid|en lugar de|por error|no estan enviando/.test(t)) {
      if (/\bbaja\b|ya no (asiste|concurre|viene)|dejo de (asistir|venir)|no asiste mas/.test(t)) return ret('CUPOS', 'ESPECIALES - BAJA', 'baja de un cupo especial');
      if (/^\W*\d{1,2}\s/.test(t) || /\bsumar\b|\balta\b|nuev[oa] alumn|alumn[oa] nuev|ingres|se suma|agregar|incorpor|cupo (especial|celiac|diabet)|\bcupos? \w+ ?(celiac|diabet)/.test(t)) {
        return ret('CUPOS', 'ESPECIALES - ALTA', 'alta de un cupo especial');
      }
    }
    if (/(dar de )?alta (de|del|a|para)? ?(un |una )?(alumn|estudiant|cupo|celiac|diabet)|nuevo alumno (celiac|diabet)|ingreso (de )?(un )?alumno (celiac|diabet)/.test(t)) {
      return ret('CUPOS', 'ESPECIALES - ALTA', 'alta de un cupo especial');
    }
    if (/(dar de )?baja (de|del|a)? ?(un |una )?(alumn|estudiant|cupo|celiac|diabet)|ya no (asiste|concurre|viene)/.test(t)) {
      return ret('CUPOS', 'ESPECIALES - BAJA', 'baja de un cupo especial');
    }
    // Bolsón, cajas o cupos mensuales: "252 mensual", "430 CAJAS", "CUPO BOLSON 310"
    const cajas = t.match(/^\W*(?:cupos?\s*:?\s*)?(\d{2,4})\s*(cajas|modulos)\W*$/);
    if (((/bolson|\bmensual(es)?\b/.test(t) && /\d/.test(t)) || (cajas && Number(cajas[1]) >= 20))
        && !RE_QUEJA.test(t) && !/mesa|aplastad|rot[oa]s?\b|apilad|dejar|entreg|traslad|mover|direccion|retir/.test(t)) {
      return ret('CUPOS', 'BOLSON', 'cupo de bolsón, cajas o mensual');
    }
    // Cupos generales: "PASA A 150", "CUPO 47", "235", "BAJA A 400"
    if (/^\W*(cupos?|pasa(n)? a|baja(n)? a|sube(n)? a|aumenta(n)? a|queda(n)? en|nuevo cupo|cupo total|total|matricula)?\s*:?\s*\d{1,4}\s*(cupos?|cajas|raciones|alumnos|chicos)?\s*(\(.*\))?\W*$/.test(t)
        || /\b(pasa|pasan|baja|bajan|sube|suben|aumenta|aumentan|disminuye|reduce|reducen|cambia|queda)( el| los)? (cupo|cupos|a|de|en) ?(de |a )?\d+|\bcupos? (de |a |en |total |normal(es)? )?:?\s*\d+|\b\d+ cupos?\b|\b\d+ (diarios|total|mensuales|chicos|alumnos|ninos|raciones)\b|cupos diarios|cambio de \d+ a \d+|son \d+ (chicos|alumnos|ninos)|^\W*\d{2,4}\s+(desde|a partir|hasta)|cupos? invertid|(aumentar|ampliar|reducir|bajar|subir|modificar|cambiar|actualizar) (el |los )?cupo|cupo especial|\bcajas? (de )?\d+ a \d+/.test(t)) {
      if (!/cupo al \d+ ?%/.test(t) && !RE_QUEJA.test(t) && !/^\W*\d+\s*cajas?\W*$/.test(t)) return ret('CUPOS', r.patologia ? 'ESPECIALES' : 'OTROS', 'cambio en los cupos');
    }

    // 4) Reparto: quejas por cómo entregó el personal del proveedor (antes que logística:
    //    "pidan que la suban" es logística; "no la quisieron subir" es reparto)
    if (!/personal de cocina|auxiliar|cocinera/.test(t) && !(/falt|no llego|no llegaron|recibieron \d|recibio \d|correspond/.test(t) && !/malos tratos|mal trato|maltrat/.test(t)) &&
        (/malos tratos|mal trato|maltrat|repartidor|chofer|chicos del camion|el camion (rompio|dejo|choco)|camion (rompio|dejo)/.test(t)
         || /no (quieren|quisieron|quiso|quiere) (subir|bajar|entrar|descargar)|no (la |las |lo |los )?subieron|dejaron (basura|mal (la|las|los) (mercader|cajas)|todo (en|tirado)|la mercader\w* (afuera|en la vereda|en la puerta|en (la|el) (ep|ji|ees|jm|eep|cef|udi|anexo|sede)))|mal apilad|rompi(o|eron) (el|la|los|las) (toldo|porton|puerta|reja|cerco)|en tandas|reforzar (el tema|pedido a los choferes)/.test(t))) {
      return ret('ALIMENTOS', 'REPARTO', 'queja por el reparto o el chofer');
    }
    if (/\bpersonal\b/.test(t) && !/personal de cocina|auxiliar/.test(t)) return ret('OTROS', 'PERSONAL', 'tema del personal');

    // 5) Reemplazos avisados: "se reemplaza banana por manzana", "cambio de cebolla por papa"
    if (/(se )?reemplaza(ra|n|ran)? .*\bpor\b|cambio de \w+( \w+)?( \w+)? por\b|cambia(n|ra)? (el|la|los|las) .* por\b|en (su )?reemplazo|se envia(ra|n)? .* en (reemplazo|lugar)|van a recibir|recibira(n)?\b|\bsale (mermelada|ddl|dulce)|no hay stock|por falta de .* (se envia|van a|reciben)|(con aviso|avisaron|avisado|se aviso).*(reemplaz|cambio)/.test(t)
        && !/\b(recibio|recibieron|mandaron|enviaron|llego|llegaron|rechaz)\b|sin aviso/.test(t)) {
      return ret('REEMPLAZOS C/A', /menu|lista|\bl\d\b|mosaico|comedor|dm\b|desayuno/.test(t) ? 'MENU' : 'OTROS', 'reemplazo avisado de antemano');
    }
    // 6) Cambios de menú: "vuelve a menú normal", "pasa a chocolatada", "alfajores para el viernes"
    if (/menu normal|vuelve(n)? (a|al) (menu|comedor|dm|recibir)|vuelve(n)? (dmc?|comedor)|pasa(r|n)? a (menu|leche|chocolatada|dmc?|comedor|matecocido)|chocolatada|alfajor|barrita|solo matecocido|(mandar|enviar) solo|listo consumo|dm individual|solido dulce|sin horno|tiene(n)? anafe|cambio de (dm|menu|mosaico)|modificacion de (d\/m|dm|menu|mosaico)|para (el )?consumo (del?|de los)|en compensacion|sobre ?stock|cambio de menu|cambiar el menu|modificar el menu|pide (que )?(envien|manden)|algo cerrado|jugos?\b.*(alfajor|barrita)/.test(t)
        && !RE_QUEJA.test(t)) {
      return ret('AVISO', 'MENU', 'cambio o pedido sobre el menú');
    }
    // 7) Logística: horarios, dirección, sede/anexo, cajas MESA, cambios de día
    if (!RE_QUEJA.test(t) && !RE_TARDE.test(t) &&
        (/(entregar|recibir|recibe|reciben|dejar|descargar|abre|abren|abrimos|abierto|abiertos|ya hay gente|llevar|mandar|traer)\b.{0,30}(\d{1,2}([:.,]\d{2})? ?(hs|h|am|pm|horas)?\b|tempran|mediodia|despues|luego|antes|a partir|hasta las)/.test(t)
         || /a partir de las|antes de las|despues de las|luego de las|planta alta|subir la mercader|dejar la mercader|en sede|en (el )?anexo|\bsede\b.*\banexo\b|direccion|reprogram|cambiar el dia|cambia(r)? de dia|otro dia|para retirar|retira(n|r)? (la|el|las|los)|cajas? mesa|modulos? mesa|\bmesa\b.*\d|recibir (de|entre) \d/.test(t))) {
      return ret('AVISO', 'LOGISTICA', 'indicación de entrega');
    }

    // 8) Otros: espacio
    if (/no tienen (lugar|espacio)|falta de espacio|no hay lugar|deposito|lugar fisico|espacio fisico/.test(t)) return ret('OTROS', 'ESPACIO', 'tema de espacio');

    r.categoria = 'ALIMENTOS';
    r.producto = productos.length > 1 ? 'ITEMS VARIOS' : (productos[0] || '');

    // Entrega equivocada / de más: llegó para más cupos de los que tiene, de otra escuela,
    // de una prestación que no tiene o sin pedirlo ("recibió 374 cupos y tienen 84")
    const nums = t.match(/recib\w*\s+(?:mercaderia\s+)?(?:por\s+|para\s+)?(\d+)\D{0,30}?(?:y\s+)?(?:tiene|tienen|son)\s+(\d+)/);
    if (nums && Number(nums[1]) > Number(nums[2])) {
      r.motivo = 'ENTREGA EQUIVOCADA'; r.razones.push('llegó para más cupos de los que tiene'); return r;
    }
    if (/de mas\b|recibio doble|recibieron doble|\bdoble\b|exceso|de otr[oa] (jardin|escuela|establecimiento)|mercaderia de (comedor|otr[oa])|llego mercaderia de|no (brinda|tiene|tienen|da) (esa |el |ese )?(prestacion|servicio|comedor)|no tienen? comedor|no solicitad|que no (le |les )?corresponde|por error|ademas de recibir|de mi mamita|retirar (la )?mercaderia/.test(t)
        && !/falt|no llego|no llegaron|no recib|no vino|la mitad|\bmenos\b/.test(t)) {
      r.motivo = 'ENTREGA EQUIVOCADA'; r.razones.push('llegó de más o algo que no le correspondía'); return r;
    }

    // 8) Fuera de horario (2.10.0: también demora, atraso, retraso, tardanza, "a destiempo"…)
    if (/fuera de horario|horario|llego (a las|pasadas)|\b(llego|llegaron|vino|vinieron|entregaron|trajeron)\b.{0,25}\ba las \d|pasadas las|al mediodia|\b1[2-6][:.,]\d{2}\b|\b1[2-6] ?hs?\b/.test(t) || RE_TARDE.test(t)) {
      r.motivo = 'FUERA DE HORARIO';
      r.razones.push('habla del horario de entrega');
      if (!r.producto && /mercaderia|sae|todo/.test(t)) r.producto = 'MENU COMPLETO';
      return r;
    }

    // 9) Reemplazo sin aviso
    if (/en lugar de|en vez de|reemplaz|tocaba recibir|mandaron .* en lugar/.test(t)) {
      r.motivo = 'REEMPLAZOS S/A';
      r.razones.push('mandaron otro producto en lugar del que correspondía');
      return r;
    }

    // 10) Calidad
    const calidad = [
      [/no (se )?disuelve|no les gusta|no gusta|sabor|gusto raro|algo raro/, 'OTRO', 'el producto no es aceptado'],
      [/vencid/, 'VENCIDO', 'producto vencido'],
      [/podrid|mal estado|hongo|feo|feas|feos|olor|verdes?\b|apelmaz|en malas condiciones|no estar en condiciones|materia grasa/, 'MAL ESTADO', 'producto en mal estado'],
      [/\brot[oa]s?\b|roto|rotas|danad|aplastad|partid|caja rota/, 'ROTO O DANADO', 'producto roto o dañado'],
      [/congelad|muy frio|frio\b|calient|descongel/, 'TEMPERATURA', 'problema de temperatura'],
      [/crud|\bduro|\bduras?\b|gomos|seco|del dia anterior/, 'CRUDO O DURO', 'pan o panificado mal cocido o duro'],
      [/rotulo|sin fecha|fecha de elaboracion|etiqueta/, 'SIN ROTULO', 'sin rótulo o fecha'],
      [/marca/, 'CAMBIO DE MARCA', 'cambio de marca'],
      [/no (es |son )?apt|no puede (comer|por)|que no puede/, 'NO APTO PATOLOGIA', 'no apto para la patología']
    ];
    for (const [re, prob, razon] of calidad) {
      if (re.test(t)) {
        r.motivo = 'CALIDAD';
        r.problema = prob === 'ROTO O DANADO' ? 'ROTO O DAÑADO' : prob;
        r.razones.push(razon);
        return r;
      }
    }

    // 11) Faltante
    if (/falt|no recib|no llego|no vino|no vinieron|solo recib|recibio solo|recibieron solo|no (les )?alcanza|nunca recib|necesita|solicita|requiere|enviar|\bmenos\b|cuando tiene|cuando tienen|debia (llegar|recibir)|deberia (llegar|recibir)/.test(t)) {
      r.motivo = 'FALTANTE';
      if (r.patologia && /no recib|falt|no llego|sin mercader|no recibe/.test(t)) {
        r.problema = 'PATOLOGIA SIN MERCADERIA';
        r.razones.push('no llegó la mercadería de la patología');
      } else if (/remito/.test(t)) {
        r.problema = 'NO COINCIDE CON REMITO';
        r.razones.push('menciona el remito');
      } else if (/solo|no (les )?alcanza|\bmenos\b|cuando tiene|cuando tienen|de \d+ (cupos|raciones)|recibieron \d+|recibio \d+/.test(t)) {
        r.problema = 'MENOR CANTIDAD';
        r.razones.push('llegó menos cantidad');
      } else {
        r.problema = 'NO LLEGO';
        r.razones.push('algo no llegó');
      }
      return r;
    }

    if (r.patologia) {
      r.motivo = 'OTROS';
      r.razones.push('relacionado con una patología');
    }
    return r;
  }

  return { sugerir, normalizar };
})();
