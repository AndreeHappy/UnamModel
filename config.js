// ============================================================================
// CONFIGURACIÓN ARQUITECTÓNICA DE 4 PISOS - SEDE ADMINISTRATIVA UNAM
// ============================================================================
// Terreno de 130 x 120 cuadros:
// - Mesa de Partes y Centros de Producción miden 25 cuadros de ancho (x: 19..44).
// - OTI y Secretaría General miden 15 cuadros de ancho cada uno (x: 55..70 y x: 70..85).
// - El túnel de Centros de Producción tiene 6.5 m de altura libre para que su
//   puerta y su cartel ("CENTROS DE PRODUCCIÓN") se vean completos y despejados.

window.UNAM_CONFIG = {
  edificio: {
    gridAnchoX: 140,
    gridFondoZ: 125,
    alturaOjos: 1.75,
    alturaUniforme: 7.5,    // Cada piso mide 7.5 cuadros de alto (P1: 0..7.5, P2: 7.5..15.0, P3: 15.0..22.5, P4: 22.5..30.0)
    velocidadCaminata: 9.5, // Velocidad fluida tanto en clic como con WASD
    colorFondo: 0xf6f5f0,
    colorTecho: 0xe6e9ef,
    colorLinea: 0x1e242b,
    colorAzul: 0x004b93,
    colorDorado: 0xd49b00,
  },

  pisos: [
    { id: 1, nombre: 'Piso 1', activo: true, baseY: 0.0 },
    { id: 2, nombre: 'Piso 2', activo: true, baseY: 7.5 },
    { id: 3, nombre: 'Piso 3', activo: true, baseY: 15.0 },
    { id: 4, nombre: 'Piso 4', activo: true, baseY: 22.5 },
  ],

  // --------------------------------------------------------------------------
  // 1. LUGARES / DESTINOS (Con textos completos en 1 o 2 líneas y más angostos
  //    que el marco de su puerta)
  // --------------------------------------------------------------------------
  lugares: {
    exterior: {
      id: 'exterior',
      nombre: 'Exterior',
      titulo: 'Exterior – Vereda Perimetral, 3 Escaleritas y Edificio de 4 Pisos',
      tramites: 'Vista exterior de los 4 pisos de la Sede Administrativa UNAM: vereda perimetral, las 3 escaleritas que sostienen todo el edificio encima, celosías con marco turquesa, 3 banderolas verticales, luminarias tipo brazo, placa plateada y cámaras de seguridad.',
      horario: 'Lunes a Viernes: 08:00 - 17:30',
      soloPiso1: true,
      posicion: [-13.5, 2.2, 74.0],
      orientacionLlegada: [8.5, 11.5, 50.0],
      nodoRed: 'wp_exterior',
      fotosReales: [
        './multimedia/fotos/fachada.jpg',
        './multimedia/fotos/puerta.jpg',
        './multimedia/fotos/MIRADA DE ABAJO SEDE ADMINISTRATIVA - IZQUIERDA.jpg',
        './multimedia/fotos/MIRADA DE ABAJO SEDE ADMINISTRATIVA - DERECHA.jpg',
      ],
    },
    caja: {
      id: 'caja',
      nombre: 'Caja',
      titulo: 'Caja y Tesorería',
      tramites: 'Pago de tasas educativas, derechos de examen de admisión, certificados y trámites. Cuenta con mampara cuadriculada, placa conmemorativa plateada, banca de espera de 3 asientos y backing UNAM / ADMISIÓN, alineada al nivel de Mesa de Partes.',
      horario: 'Lunes a Viernes: 08:00 - 13:00 y 14:00 - 16:30',
      posicion: [16.0, 1.75, 57.7],
      orientacionLlegada: [19.0, 2.2, 57.7],
      nodoRed: 'wp_caja',
      fotosReales: [
        './multimedia/fotos/ENTRADA Y VISTA A CAJA.jpg',
        './multimedia/fotos/caja.jpeg',
      ],
      letrero: { lineas: ['CAJA'], pos: [19.0, 4.25, 57.7], rotY: -Math.PI / 2, ancho: 1.4, alto: 0.46 },
    },
    admision: {
      id: 'admision',
      nombre: 'Admisión',
      titulo: 'Dirección de Admisión',
      tramites: 'Informes e inscripciones para exámenes de admisión ordinario y extraordinario, prospectos y resultados (con estante vitrina de libros en el centro y banca de espera).',
      horario: 'Lunes a Viernes: 08:00 - 15:45',
      posicion: [12.5, 1.75, 49.5],
      orientacionLlegada: [9.0, 2.4, 49.5],
      nodoRed: 'wp_admision',
      fotosReales: [
        './multimedia/fotos/ADMINISION Y CEPRE CON ESTANTE DE LIBROS.jpg',
        './multimedia/fotos/admision.jpg',
        './multimedia/fotos/ENTRADA Y VISTA A CAJA.jpg',
      ],
      letrero: { lineas: ['DIRECCIÓN DE', 'ADMISIÓN'], pos: [9.0, 4.35, 49.5], rotY: Math.PI / 2, ancho: 1.75, alto: 0.62 },
    },
    cepre: {
      id: 'cepre',
      nombre: 'CEPRE',
      titulo: 'CEPRE UNAM',
      tramites: 'Centro Preuniversitario de la UNAM. Matrículas por ciclo, entrega de material, roll-up banner institucional CEPRE y vitrina de trofeos y libros junto a la puerta.',
      horario: 'Lunes a Viernes: 07:30 - 15:30',
      posicion: [12.5, 1.75, 31.0],
      orientacionLlegada: [9.0, 2.4, 31.0],
      nodoRed: 'wp_cepre',
      fotosReales: [
        './multimedia/fotos/ADMINISION Y CEPRE CON ESTANTE DE LIBROS.jpg',
        './multimedia/fotos/cepre.jpg',
        './multimedia/fotos/VISTA A LA RAMPA.jpg',
      ],
      letrero: { lineas: ['CEPRE', 'UNAM'], pos: [9.0, 4.35, 31.0], rotY: Math.PI / 2, ancho: 1.65, alto: 0.62 },
    },
    abastecimiento: {
      id: 'abastecimiento',
      nombre: 'Abastecimiento',
      titulo: 'Unidad de Abastecimiento',
      tramites: 'Gestión de compras, órdenes de servicio y logística. Flanqueado a la izquierda por la tubería y gabinete rojo contra incendios, y a la derecha por los 2 tableros eléctricos y banca de espera de 3 asientos.',
      horario: 'Lunes a Viernes: 08:00 - 15:45',
      posicion: [28.0, 1.75, 33.0],
      orientacionLlegada: [28.0, 2.4, 28.0],
      nodoRed: 'wp_abastecimiento',
      fotosReales: [
        './multimedia/fotos/abastecimiento.jpg',
        './multimedia/fotos/VISTA A LA RAMPA.jpg',
      ],
      letrero: { lineas: ['UNIDAD DE', 'ABASTECIMIENTO'], pos: [28.0, 4.35, 28.0], rotY: 0, ancho: 1.85, alto: 0.62 },
    },
    patrimonio: {
      id: 'patrimonio',
      nombre: 'Patrimonio y Almacén',
      titulo: 'Patrimonio y Almacén Central (10 bloques de largo)',
      tramites: 'Control patrimonial, inventario de bienes institucionales y almacén central (de 10 bloques de largo en el ala norte de 28 bloques; se accede saliendo por la puerta doble frente a OTI).',
      horario: 'Lunes a Viernes: 08:00 - 15:45',
      posicion: [53.5, 1.75, 5.0],
      orientacionLlegada: [50.0, 2.4, 5.0],
      nodoRed: 'wp_patrimonio',
      fotosReales: [
        './multimedia/fotos/camino_a_oti.jpg',
        './multimedia/fotos/abastecimiento.jpg',
      ],
      letrero: { lineas: ['PATRIMONIO', 'Y ALMACÉN'], pos: [50.0, 4.35, 5.0], rotY: Math.PI / 2, ancho: 1.80, alto: 0.62 },
    },
    mesa_partes: {
      id: 'mesa_partes',
      nombre: 'Mesa de Partes',
      titulo: 'Mesa de Partes y Hall Central (Mostrador con Fondo de Madera)',
      tramites: 'Recepción y seguimiento de expedientes en mostrador de atención al cliente con mamparas serigrafiadas UNAM y pared posterior curva con revestimiento de madera.',
      horario: 'Lunes a Viernes: 08:00 - 16:00',
      posicion: [34.5, 1.75, 42.5],
      orientacionLlegada: [34.5, 1.85, 46.2],
      nodoRed: 'wp_mesa_partes',
      fotosReales: [
        './multimedia/fotos/MESA DE PARTES 1.jpg',
        './multimedia/fotos/MESA DE PARTES 2.jpg',
        './multimedia/fotos/MESA DE PARTES DE LEJOS.jpg',
        './multimedia/fotos/MESA DE PARTES - MURO Y PARTE TRASERA.jpg',
        './multimedia/fotos/MESA DE PARTES - ENCUENTRO CON CAJA.jpg',
      ],
    },
    centros_produccion: {
      id: 'centros_produccion',
      nombre: 'Centros de Producción',
      titulo: 'Centros de Producción (11 bloques de largo)',
      tramites: 'Coordinación de proyectos productivos y servicios autofinanciados de la UNAM (ubicado dentro del pasillo/túnel interior de 11 bloques de largo debajo de Mesa de Partes, junto al Elevador y segunda salida).',
      horario: 'Lunes a Viernes: 08:00 - 15:45',
      posicion: [36.0, 1.75, 56.0],
      orientacionLlegada: [35.0, 3.4, 58.2],
      nodoRed: 'wp_tunel_produccion',
      fotosReales: [
        './multimedia/fotos/VISTA ELEVADOR - BAÑO Y SEGUNDA SALIDA.jpg',
        './multimedia/fotos/pasadizo.jpg',
      ],
      letrero: { lineas: ['CENTROS DE', 'PRODUCCIÓN'], pos: [35.0, 4.35, 58.12], rotY: Math.PI, ancho: 1.90, alto: 0.64 },
    },
    oti: {
      id: 'oti',
      nombre: 'OTI',
      titulo: 'Oficina de Tecnología e Información – OTI (Mampara de Vidrio)',
      tramites: 'Soporte técnico institucional, administración del sistema académico, redes y servidores. Oficina con fachada completa de vidrio modular templado y franjas pavonadas UNAM.',
      horario: 'Lunes a Viernes: 08:00 - 15:45',
      posicion: [67.5, 1.75, 42.5],
      orientacionLlegada: [67.5, 2.4, 46.5],
      nodoRed: 'wp_oti',
      fotosReales: [
        './multimedia/fotos/VISTA DE AFUERA DE OTI.jpg',
        './multimedia/fotos/OFICINA DE OTI.jpg',
        './multimedia/fotos/camino_a_oti.jpg',
      ],
      letrero: { lineas: ['OFICINA TECNOLOGÍA', 'E INFORMACIÓN'], pos: [64.7, 2.35, 46.46], rotY: Math.PI, ancho: 2.05, alto: 0.62 },
    },
    secretaria: {
      id: 'secretaria',
      nombre: 'Secretaría General',
      titulo: 'Secretaría General (17 bloques)',
      tramites: 'Gestión de grados y títulos, resoluciones universitarias, fedateo de documentos oficiales, actas y archivo central.',
      horario: 'Lunes a Viernes: 08:00 - 15:45',
      posicion: [84.5, 1.75, 42.5],
      orientacionLlegada: [84.5, 2.4, 46.5],
      nodoRed: 'wp_secretaria',
      fotosReales: [
        './multimedia/fotos/camino_a_oti.jpg',
        './multimedia/fotos/VISTA A LAS ESCALERAS PRIMERAS.jpg',
      ],
      letrero: { lineas: ['SECRETARÍA', 'GENERAL'], pos: [84.5, 4.35, 46.5], rotY: Math.PI, ancho: 1.85, alto: 0.62 },
    },
    auditorio: {
      id: 'auditorio',
      nombre: 'Auditorio',
      titulo: 'Auditorio Principal',
      tramites: 'Recinto principal para ceremonias de graduación, conferencias magistrales, congresos académicos y eventos oficiales.',
      horario: 'Según programación de eventos institucionales',
      posicion: [97.0, 1.75, 41.0],
      orientacionLlegada: [101.0, 2.2, 41.0],
      nodoRed: 'wp_auditorio',
      fotosReales: [
        './multimedia/fotos/camino_a_oti.jpg',
      ],
      letrero: { lineas: ['AUDITORIO', 'PRINCIPAL'], pos: [101.0, 4.40, 41.0], rotY: -Math.PI / 2, ancho: 2.0, alto: 0.64 },
    },
    escalera_rampa: {
      id: 'escalera_rampa',
      nombre: 'Escaleras / Rampa',
      titulo: 'Escaleras (E1 a nivel del Baño, E2 Antihoraria) y Rampa + Sótano',
      tramites: 'Escalera 1 alineada a la entrada del Baño Norte (x: 43..52), Escalera 2 rotada 90° antihorario mirando al sur (x: 80..89), rampa doble de 4 cuadros de ancho cada tramo (x: 12..20.5) y rampa descendente hacia el Sótano en el Primer Piso.',
      horario: 'Lunes a Viernes: 08:00 - 17:30',
      posicion: [40.5, 1.75, 34.0],
      orientacionLlegada: [45.5, 2.2, 32.5],
      nodoRed: 'wp_cruce_norte_este',
      fotosReales: [
        './multimedia/fotos/VISTA A LAS ESCALERAS PRIMERAS.jpg',
        './multimedia/fotos/VISTA A LA RAMPA.jpg',
      ],
    },
  },

  // --------------------------------------------------------------------------
  // 2. RED ORTOGONAL DE ZONAS CAMINABLES (Adaptada al terreno 135x125)
  // --------------------------------------------------------------------------
  nodosCaminables: {
    wp_exterior:           [-13.5, 2.2, 74.0],
    wp_gradas_frente:      [2.0, 1.45, 55.9],
    wp_ingreso:            [9.0, 1.75, 55.9],
    wp_caja:               [16.0, 1.75, 57.7],
    wp_admision:           [12.5, 1.75, 49.5],
    wp_pasillo_izq_medio:  [12.5, 1.75, 40.0],
    wp_cepre:              [12.5, 1.75, 31.0],
    wp_pasillo_no:         [12.5, 1.75, 33.0],
    wp_rampa_base:         [18.5, 1.75, 33.0],
    wp_abastecimiento:     [28.0, 1.75, 33.0],
    wp_cruce_norte_este:   [41.0, 1.75, 33.0],
    wp_hall_oeste:         [18.0, 1.75, 42.5],
    wp_mesa_partes:        [34.5, 1.75, 42.5],
    wp_hall_este:          [41.0, 1.75, 42.5],
    wp_pasillo_tunel_ext:  [50.0, 1.75, 56.0],
    wp_tunel_produccion:   [36.0, 1.75, 56.0],
    wp_pasillo_central_1:  [50.0, 1.75, 42.5],
    wp_oti:                [67.5, 1.75, 42.5],
    wp_puerta_doble_int:   [67.5, 1.75, 39.5],
    wp_puerta_doble_ext:   [67.5, 1.75, 35.5],
    wp_exterior_norte:     [67.5, 1.75, 5.0],
    wp_patrimonio:         [53.5, 1.75, 5.0],
    wp_secretaria:         [84.5, 1.75, 42.5],
    wp_auditorio:          [97.0, 1.75, 41.0],
  },

  // --------------------------------------------------------------------------
  // 3. CONEXIONES ESTRICTAMENTE LIBRES DE PAREDES
  // --------------------------------------------------------------------------
  conexiones: [
    { desde: 'wp_exterior', hacia: 'wp_gradas_frente', estado: 'libre' },
    { desde: 'wp_gradas_frente', hacia: 'wp_ingreso', estado: 'libre' },
    { desde: 'wp_ingreso', hacia: 'wp_caja', estado: 'libre' },
    { desde: 'wp_ingreso', hacia: 'wp_admision', estado: 'libre' },
    { desde: 'wp_caja', hacia: 'wp_admision', estado: 'libre' },

    { desde: 'wp_admision', hacia: 'wp_pasillo_izq_medio', estado: 'libre' },
    { desde: 'wp_pasillo_izq_medio', hacia: 'wp_cepre', estado: 'libre' },
    { desde: 'wp_cepre', hacia: 'wp_pasillo_no', estado: 'libre' },
    { desde: 'wp_pasillo_no', hacia: 'wp_rampa_base', estado: 'libre' },
    { desde: 'wp_rampa_base', hacia: 'wp_abastecimiento', estado: 'libre' },
    { desde: 'wp_abastecimiento', hacia: 'wp_cruce_norte_este', estado: 'libre' },

    { desde: 'wp_pasillo_izq_medio', hacia: 'wp_hall_oeste', estado: 'libre' },
    { desde: 'wp_rampa_base', hacia: 'wp_hall_oeste', estado: 'libre' },
    { desde: 'wp_hall_oeste', hacia: 'wp_mesa_partes', estado: 'libre' },
    { desde: 'wp_mesa_partes', hacia: 'wp_hall_este', estado: 'libre' },
    { desde: 'wp_cruce_norte_este', hacia: 'wp_hall_este', estado: 'libre' },

    { desde: 'wp_hall_este', hacia: 'wp_pasillo_central_1', estado: 'libre' },
    { desde: 'wp_pasillo_central_1', hacia: 'wp_pasillo_tunel_ext', estado: 'libre' },
    { desde: 'wp_pasillo_tunel_ext', hacia: 'wp_tunel_produccion', estado: 'libre' },

    { desde: 'wp_pasillo_central_1', hacia: 'wp_oti', estado: 'libre' },
    { desde: 'wp_oti', hacia: 'wp_secretaria', estado: 'libre' },
    { desde: 'wp_secretaria', hacia: 'wp_auditorio', estado: 'libre' },

    { desde: 'wp_oti', hacia: 'wp_puerta_doble_int', estado: 'libre' },
    { desde: 'wp_pasillo_central_1', hacia: 'wp_puerta_doble_int', estado: 'libre' },
    { desde: 'wp_secretaria', hacia: 'wp_puerta_doble_int', estado: 'libre' },
    { desde: 'wp_puerta_doble_int', hacia: 'wp_puerta_doble_ext', estado: 'libre' },
    { desde: 'wp_puerta_doble_ext', hacia: 'wp_exterior_norte', estado: 'libre' },
    { desde: 'wp_exterior_norte', hacia: 'wp_patrimonio', estado: 'libre' },

    { desde: 'wp_caja', hacia: 'wp_tunel_produccion', estado: 'muro' },
    { desde: 'wp_abastecimiento', hacia: 'wp_patrimonio', estado: 'muro' },
    { desde: 'wp_hall_este', hacia: 'wp_patrimonio', estado: 'muro' },
  ],

  // --------------------------------------------------------------------------
  // 4. BLOQUES DEL PLANO (Mesa de Partes y Centros de Producción = 25 bloques;
  //    OTI y Secretaría General = 15 bloques cada uno)
  // --------------------------------------------------------------------------
  bloquesPlano: [
    { nombre: 'CEPRE', xMin: 0.0, xMax: 9.0, zMin: 28.0, zMax: 40.0 },
    { nombre: 'ADMISIÓN', xMin: 0.0, xMax: 9.0, zMin: 40.0, zMax: 52.0 },

    // Ala Norte de 28 bloques de largo (z: 0.0 .. 28.0):
    // - Abastecimiento: 15 bloques de ancho (x: 20.5 .. 35.5) y 28 bloques de largo (z: 0.0 .. 28.0)
    // - Patrimonio y Almacén: 10 bloques de largo (z: 0.0 .. 10.0)
    // - Baño Norte: z: 20.0 .. 28.0
    { nombre: 'ABASTECIMIENTO', xMin: 20.5, xMax: 35.5, zMin: 0.0, zMax: 28.0 },
    { nombre: 'PATRIMONIO Y ALMACÉN', xMin: 35.5, xMax: 50.0, zMin: 0.0, zMax: 10.0 },
    { nombre: 'ARCHIVO / DEPÓSITO NORTE', xMin: 35.5, xMax: 50.0, zMin: 10.0, zMax: 20.0 },
    { nombre: 'BAÑO NORTE', xMin: 43.0, xMax: 50.0, zMin: 20.0, zMax: 28.0 },

    // Caja metida más al Este para quedar exactamente al nivel de Mesa de Partes (x = 19.0)
    { nombre: 'CAJA (Muro Placa y Asientos)', xMin: 19.0, xMax: 23.5, zMin: 51.0, zMax: 55.6 },
    { nombre: 'CAJA (Interior Tras Mampara)', xMin: 20.5, xMax: 23.5, zMin: 55.6, zMax: 60.0 },
    {
      // Mesa de Partes (x: 19..45.74): termina antes del muro Este en x = 45.75..46.0 para evitar z-fighting
      nombre: 'MESA DE PARTES',
      alturaBloque: 1.25,
      esMostradorAtencion: true,
      poligono: [
        [19.0, 51.0],
        [27.0, 46.2],
        [45.74, 46.2],
        [45.74, 51.0],
      ],
      bbox: { xMin: 19.0, xMax: 45.75, zMin: 46.2, zMax: 51.0 },
    },
    // Centros de Producción movidos ordenadamente atrás de Caja (x: 23.5 .. 46.0) manteniendo 11 de largo (z: 51.0 .. 62.0) y túnel interior
    { nombre: 'CENTROS DE PRODUCCIÓN (Ala Superior)', xMin: 23.5, xMax: 46.0, zMin: 51.0, zMax: 53.8 },
    { nombre: 'CENTROS DE PRODUCCIÓN (Fondo Izquierdo)', xMin: 23.5, xMax: 27.5, zMin: 53.8, zMax: 62.0 },
    { nombre: 'CENTROS DE PRODUCCIÓN (Ala Inferior)', xMin: 27.5, xMax: 46.0, zMin: 58.2, zMax: 62.0 },

    // Elevador y Baño Sur de 5 bloques de ancho (x: 54.0 .. 59.0) dejando pasillo amplio de 8 bloques (x: 46.0 .. 54.0)
    { nombre: 'ELEVADOR', xMin: 54.0, xMax: 59.0, zMin: 46.5, zMax: 51.5 },
    { nombre: 'BAÑO SUR', xMin: 54.0, xMax: 59.0, zMin: 51.5, zMax: 59.5 },
    // OTI = 17 bloques de ancho (x: 59.0 .. 76.0); ambiente cerrado con puerta doble de vidrio cerrada en z = 46.5
    { nombre: 'OTI', xMin: 59.0, xMax: 76.0, zMin: 46.5, zMax: 59.5 },
    // SECRETARÍA GENERAL = 17 bloques de ancho (x: 76.0 .. 93.0)
    { nombre: 'SECRETARÍA GENERAL', xMin: 76.0, xMax: 93.0, zMin: 46.5, zMax: 59.5 },

    // Pasadizo al costado del Auditorio de 8 bloques de ancho (x: 93.0 .. 101.0)
    { nombre: 'AUDITORIO', xMin: 101.0, xMax: 121.0, zMin: 34.0, zMax: 59.5 },
  ],

  // --------------------------------------------------------------------------
  // 5. MAMPARAS DE VIDRIO
  // --------------------------------------------------------------------------
  murosVidrio: [
    { x1: 9.0, z1: 28.0, x2: 12.0, z2: 28.0, panos: 2 },
    // Cara Oeste del pórtico (x = 5.8): centrada la puerta principal en z = 55.9 (hueco libre z: 54.1 .. 57.7)
    { x1: 5.8, z1: 52.0, x2: 5.8, z2: 54.1, panos: 1 },
    { x1: 5.8, z1: 57.7, x2: 5.8, z2: 59.8, panos: 1 },
    // Cara Sur del pórtico y frente ampliado hacia Caja cerrados en vidrio continuo (x: 5.8..12.6 y 14.0..19.0)
    { x1: 5.8, z1: 59.8, x2: 12.6, z2: 59.8, panos: 4 },
    { x1: 14.0, z1: 59.8, x2: 19.0, z2: 59.8, panos: 3 },
    // Salida Sur amplia de 8 bloques (x: 46.0 .. 54.0, z = 59.5) frente al pasillo del Elevador
    { x1: 46.0, z1: 59.5, x2: 48.2, z2: 59.5, panos: 2 },
    { x1: 51.8, z1: 59.5, x2: 54.0, z2: 59.5, panos: 2 },
    // Escalera 1 alineada a la entrada del Baño Norte (x: 43..52, abierta al oeste y sin muro en z = 38.0)
    { x1: 52.0, z1: 38.0, x2: 65.7, z2: 38.0, panos: 5 },
    { x1: 69.3, z1: 38.0, x2: 80.0, z2: 38.0, panos: 4 },
    // Escalera 2 rotada 90° antihorario mirando al sur (x: 80..89, entrada abierta en z = 38.0)
    { x1: 89.0, z1: 38.0, x2: 93.0, z2: 38.0, panos: 2 },
    { x1: 93.0, z1: 34.0, x2: 93.0, z2: 38.0, panos: 2 },
    // Extremo Norte del pasadizo de 8 bloques cerrado con mampara de vidrio (sin puerta) y puerta doble solo al Sur
    { x1: 93.0, z1: 34.0, x2: 101.0, z2: 34.0, panos: 5 },
    { x1: 93.0, z1: 59.5, x2: 95.4, z2: 59.5, panos: 2 },
    { x1: 98.6, z1: 59.5, x2: 101.0, z2: 59.5, panos: 2 },
  ],

  // --------------------------------------------------------------------------
  // 6. PUERTAS (Oficinas cerradas de 3.7-3.85 de alto; puertas de vidrio abiertas)
  // --------------------------------------------------------------------------
  puertas: [
    { nombre: 'Puerta Doble Entrada', pos: [5.8, 2.25, 55.9], tam: [0.26, 4.5, 3.6], abiertaDoble: 'x' },
    { nombre: 'Puerta Caja', pos: [19.0, 1.85, 57.7], tam: [0.22, 3.7, 1.38] },
    { nombre: 'Puerta Admisión', pos: [9.0, 1.875, 49.5], tam: [0.26, 3.75, 2.2] },
    { nombre: 'Puerta CEPRE', pos: [9.0, 1.875, 31.0], tam: [0.26, 3.75, 2.2] },
    { nombre: 'Puerta Abastecimiento', pos: [28.0, 1.875, 28.0], tam: [2.5, 3.75, 0.26] },
    { nombre: 'Puerta Baño Norte', pos: [43.0, 1.875, 24.0], tam: [0.26, 3.75, 2.0] },
    { nombre: 'Puerta Patrimonio', pos: [50.0, 1.875, 5.0], tam: [0.26, 3.75, 2.4] },
    { nombre: 'Puerta Centros de Producción', pos: [35.0, 1.875, 58.2], tam: [2.5, 3.75, 0.26] },
    { nombre: 'Puerta Doble Sur', pos: [50.0, 2.25, 59.5], tam: [3.6, 4.5, 0.26], abiertaDoble: 'z' },
    { nombre: 'Puerta Doble Frente a OTI', pos: [67.5, 2.25, 38.0], tam: [3.6, 4.5, 0.26], abiertaDoble: 'z' },
    { nombre: 'Puerta Vidrio OTI', pos: [67.5, 1.95, 46.5], tam: [2.6, 3.9, 0.26], esPuertaVidrioCerrada: true },
    { nombre: 'Puerta Secretaría General', pos: [84.5, 1.875, 46.5], tam: [2.6, 3.75, 0.26] },
    { nombre: 'Puerta Doble Auditorio', pos: [101.0, 1.925, 41.0], tam: [0.28, 3.85, 3.6] },
    { nombre: 'Puerta Salida Sur Auditorio', pos: [97.0, 2.25, 59.5], tam: [3.2, 4.5, 0.26], abiertaDoble: 'z' },
  ],
};
