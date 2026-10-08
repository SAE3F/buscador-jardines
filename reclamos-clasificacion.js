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
    { valor: 'EQUIPAMIENTO', etiqueta: 'Equipamiento', icono: '🧊', tipo: 'Estructural', ayuda: 'Pedidos o problemas de freezer, heladera, cocina, utensilios, mobiliario.' },
    { valor: 'MANTENIMIENTO', etiqueta: 'Mantenimiento', icono: '🛠️', tipo: 'Estructural', ayuda: 'Reparaciones: gas, refrigeración y otros arreglos.' },
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
      { valor: 'OTROS', etiqueta: 'Otros', ayuda: 'Cualquier otro problema con los alimentos.' }
    ],
    AVISO: [
      { valor: 'LOGISTICA', etiqueta: 'Logística', ayuda: 'Dónde o cómo entregar: subir a planta alta, sede/anexo, horarios de recepción.' },
      { valor: 'MENU', etiqueta: 'Menú', ayuda: 'Avisos sobre cambios o pedidos del menú.' },
      { valor: 'CANCELACION', etiqueta: 'Cancelación', ayuda: 'Suspender o cancelar uno o más despachos.' },
      { valor: 'VIANDAS', etiqueta: 'Viandas', ayuda: 'Pedido de viandas para días puntuales.' },
      { valor: 'OTROS', etiqueta: 'Otros', ayuda: 'Cualquier otro aviso de la escuela.' }
    ],
    'REEMPLAZOS C/A': [
      { valor: 'MENU', etiqueta: 'Menú', ayuda: 'Se reemplazó el menú, con aviso previo.' },
      { valor: 'OTROS', etiqueta: 'Otros', ayuda: 'Otro reemplazo avisado.' }
    ],
    CUPOS: [
      { valor: 'ESPECIALES - ALTA', etiqueta: 'Especiales - Alta', ayuda: 'Alta de un alumno con patología (celíaco, diabético, etc.).' },
      { valor: 'ESPECIALES - BAJA', etiqueta: 'Especiales - Baja', ayuda: 'Baja de un cupo especial.' },
      { valor: 'ESPECIALES', etiqueta: 'Especiales', ayuda: 'Otros temas de cupos especiales.' },
      { valor: 'OTROS', etiqueta: 'Otros', ayuda: 'Cambios en los cupos generales.' }
    ],
    EQUIPAMIENTO: [
      { valor: 'FREEZER', etiqueta: 'Freezer', ayuda: 'Pedido o problema con el freezer.' },
      { valor: 'HELADERA', etiqueta: 'Heladera', ayuda: 'Pedido o problema con la heladera.' },
      { valor: 'COCINA', etiqueta: 'Cocina', ayuda: 'Cocina u horno.' },
      { valor: 'TERMOTANQUE', etiqueta: 'Termotanque', ayuda: 'Termotanque o agua caliente.' },
      { valor: 'UTENSILIOS', etiqueta: 'Utensilios', ayuda: 'Ollas, vajilla, cubiertos, etc.' },
      { valor: 'MOBILIARIO', etiqueta: 'Mobiliario', ayuda: 'Mesas, sillas, estanterías.' }
    ],
    MANTENIMIENTO: [
      { valor: 'GAS', etiqueta: 'Gas', ayuda: 'Pérdidas, garrafas o instalación de gas.' },
      { valor: 'REFRIGERACION', etiqueta: 'Refrigeración', ayuda: 'Freezer o heladera que no enfría y hay que reparar.' },
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
      { valor: 'PERSONAL', etiqueta: 'Personal', ayuda: 'Temas del personal (cocina, repartidores, trato).' },
      { valor: 'ESPACIO', etiqueta: 'Espacio', ayuda: 'Espacio físico para recibir o guardar la mercadería.' }
    ]
  },

  // Problema específico (columna nueva PROBLEMA). Solo para Faltante y Calidad.
  problemas: {
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

  servicios: ['DESAYUNO/MERIENDA', 'COMEDOR', 'BOLSON', 'PATIOS', 'VIANDAS', 'DM MATERNAL'],

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

  /**
   * Devuelve { categoria, motivo, problema, producto, patologia, razones[] }
   * Los campos que no se pueden deducir quedan vacíos.
   */
  function sugerir(texto) {
    const t = normalizar(texto);
    const r = { categoria: '', motivo: '', problema: '', producto: '', patologia: '', razones: [] };
    if (t.trim().length < 4) return r;

    r.patologia = detectarPatologia(t);
    const productos = detectarProductos(t);

    const ret = (categoria, motivo, razon) => Object.assign(r, { categoria, motivo, producto: '', razones: [razon] });
    const roto = /no enfria|no funciona|no anda|se rompio|roto|rota|revisar|arreglar|repar|perdida|service/.test(t);

    // 1) Consejo Escolar (edificio y servicios)
    if (/consejo/.test(t) || /poda|arbol/.test(t)) {
      if (/poda|arbol/.test(t)) return ret('CONSEJO', 'PODA', 'menciona poda o árboles');
      if (/luz|electric|corte de luz|enchufe/.test(t)) return ret('CONSEJO', 'ELECTRICIDAD', 'menciona electricidad');
      if (/agua|canerias?|perdida de agua|tanque/.test(t)) return ret('CONSEJO', 'AGUA', 'menciona agua');
      if (/gas/.test(t)) return ret('CONSEJO', 'GAS', 'menciona gas');
      return ret('CONSEJO', 'INFRAESTRUCTURA', 'menciona al Consejo Escolar');
    }
    if (/corte de luz|sin luz|electricidad/.test(t)) return ret('CONSEJO', 'ELECTRICIDAD', 'menciona electricidad');
    if (/sin agua|corte de agua|no hay agua|perdida de agua/.test(t)) return ret('CONSEJO', 'AGUA', 'menciona agua');
    if (/techo|filtracion|humedad|bano|banos|edilicio|infraestructura/.test(t)) return ret('CONSEJO', 'INFRAESTRUCTURA', 'problema del edificio');

    // 2) Equipamiento y mantenimiento
    if (/fr+e+z+e*r|heladera|refrigera|no enfria|camara de frio/.test(t)) {
      if (roto) return ret('MANTENIMIENTO', 'REFRIGERACION', 'freezer o heladera para reparar');
      return ret('EQUIPAMIENTO', /heladera/.test(t) ? 'HELADERA' : 'FREEZER', 'menciona freezer/heladera');
    }
    if (/garrafa|gas|olor a gas/.test(t)) return ret('MANTENIMIENTO', 'GAS', 'menciona gas');
    if (/termotanque|agua caliente/.test(t)) return ret('EQUIPAMIENTO', 'TERMOTANQUE', 'menciona termotanque');
    if (/cocina|horno|hornalla/.test(t) && !/cocinar|personal de cocina|cocinera/.test(t)) return ret('EQUIPAMIENTO', 'COCINA', 'menciona cocina u horno');
    if (/olla|cacerola|vajilla|cubierto|utensilio|cucharon|bandeja|jarra/.test(t)) return ret('EQUIPAMIENTO', 'UTENSILIOS', 'menciona utensilios');
    if (/mesa|silla|estanteria|mobiliario|armario/.test(t)) return ret('EQUIPAMIENTO', 'MOBILIARIO', 'menciona mobiliario');

    // 3) Cupos
    if (/(dar de )?alta (de|del|a|para)? ?(un |una )?(alumn|estudiant|cupo|celiac|diabet)|nuevo alumno (celiac|diabet)|ingreso (de )?(un )?alumno (celiac|diabet)/.test(t)) {
      return ret('CUPOS', 'ESPECIALES - ALTA', 'alta de un cupo especial');
    }
    if (/(dar de )?baja (de|del|a)? ?(un |una )?(alumn|estudiant|cupo|celiac|diabet)|ya no (asiste|concurre|viene)/.test(t)) {
      return ret('CUPOS', 'ESPECIALES - BAJA', 'baja de un cupo especial');
    }
    if (/(aumentar|ampliar|reducir|bajar|subir|modificar|cambiar|actualizar) (el |los )?cupo|cupo especial/.test(t)) {
      return ret('CUPOS', r.patologia ? 'ESPECIALES' : 'OTROS', 'pide cambiar cupos');
    }

    // 4) Personal (antes que logística: "malos tratos al dejar la mercadería")
    if (/malos tratos|mal trato|maltrat|repartidor|chofer|personal/.test(t)) return ret('OTROS', 'PERSONAL', 'tema del personal');

    // 5) Avisos
    if (/cancel|suspend|no enviar (el )?despacho|no se envie/.test(t)) return ret('AVISO', 'CANCELACION', 'pide cancelar o suspender');
    if (/vianda/.test(t)) return ret('AVISO', 'VIANDAS', 'pide viandas');
    if (/planta alta|subir la mercader|dejar la mercader|en sede|en (el )?anexo|recibir (de|entre) \d/.test(t)) {
      return ret('AVISO', 'LOGISTICA', 'indicación de entrega');
    }
    if (/cambio de menu|cambiar el menu|modificar el menu/.test(t)) return ret('AVISO', 'MENU', 'aviso sobre el menú');

    // 6) Otros: espacio
    if (/no tienen (lugar|espacio)|falta de espacio|no hay lugar|deposito/.test(t)) return ret('OTROS', 'ESPACIO', 'tema de espacio');

    // 7) Reemplazo con aviso
    if (/(con aviso|avisaron|avisado|se aviso).*(reemplaz|cambio)|(reemplaz|cambio).*(con aviso|avisaron|avisado|se aviso)/.test(t)) {
      return ret('REEMPLAZOS C/A', /menu/.test(t) ? 'MENU' : 'OTROS', 'reemplazo avisado');
    }

    r.categoria = 'ALIMENTOS';
    r.producto = productos.length > 1 ? 'ITEMS VARIOS' : (productos[0] || '');

    // 8) Fuera de horario
    if (/fuera de horario|horario|llego (a las|pasadas)|pasadas las|tarde\b|al mediodia|\b1[2-6][:.,]\d{2}\b|\b1[2-6] ?hs?\b/.test(t)
        && !/turno tarde/.test(t)) {
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
