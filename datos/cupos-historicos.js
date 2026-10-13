/**
 * ==========================================================================
 * CUPOS HISTÓRICOS POR PROVEEDOR - cupos-historicos.js
 * Promedio de cupos diarios (raciones por día) de cada proveedor, por mes.
 * Sale de las pestañas "CUPOS 2023" y "CUPOS 2025" del Tablero de Gestión.
 * Se usa solo para comparar reclamos "cada 100 / cada 1.000 cupos".
 * Los meses de 2026 se calculan solos a partir de data.js (CUPOS 2026).
 * Para sumar otro año, agregar sus meses con el mismo formato.
 * ==========================================================================
 */
const SAE_CUPOS_HISTORICOS = {
 "2023-03": {
  "GYULAND": 14280,
  "GRUPO L": 23377,
  "TEYLEM": 3217
 },
 "2023-04": {
  "GYULAND": 13487,
  "GRUPO L": 23320,
  "TEYLEM": 3971
 },
 "2023-05": {
  "GYULAND": 14991,
  "GRUPO L": 23420,
  "TEYLEM": 3971
 },
 "2023-06": {
  "GYULAND": 15019,
  "GRUPO L": 23518,
  "TEYLEM": 3972
 },
 "2023-07": {
  "GYULAND": 15011,
  "GRUPO L": 23534,
  "TEYLEM": 4019
 },
 "2023-08": {
  "GYULAND": 15033,
  "GRUPO L": 22654,
  "TEYLEM": 3820
 },
 "2023-09": {
  "GYULAND": 14538,
  "GRUPO L": 23409,
  "TEYLEM": 3928
 },
 "2023-10": {
  "GYULAND": 14886,
  "GRUPO L": 23869,
  "TEYLEM": 3920
 },
 "2023-11": {
  "GYULAND": 14640,
  "GRUPO L": 23996,
  "TEYLEM": 4018
 },
 "2023-12": {
  "GYULAND": 13642,
  "GRUPO L": 13733,
  "TEYLEM": 4018
 },
 "2025-02": {
  "GYULAND": 2494,
  "GRUPO L": 3010
 },
 "2025-03": {
  "GYULAND": 14241,
  "GRUPO L": 22465,
  "SURMARKET": 4595
 },
 "2025-04": {
  "GYULAND": 14938,
  "GRUPO L": 23133,
  "SURMARKET": 4609
 },
 "2025-05": {
  "GYULAND": 14862,
  "GRUPO L": 23167,
  "SURMARKET": 5071
 },
 "2025-06": {
  "GYULAND": 14841,
  "GRUPO L": 23178,
  "SURMARKET": 5077
 },
 "2025-07": {
  "GYULAND": 14835,
  "GRUPO L": 23180,
  "SURMARKET": 5100
 },
 "2025-08": {
  "GYULAND": 14434,
  "GRUPO L": 23234,
  "SURMARKET": 5101
 },
 "2025-09": {
  "GYULAND": 14376,
  "GRUPO L": 23227,
  "SURMARKET": 5112
 },
 "2025-10": {
  "GYULAND": 14376,
  "GRUPO L": 23273,
  "SURMARKET": 5100
 },
 "2025-11": {
  "GYULAND": 13422,
  "GRUPO L": 21777,
  "SURMARKET": 4064
 }
};
