const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxU_vSP6GEZZNBhqSkIgvQVVctoeb8iUVhBcoppsVuKOYd5aBimg34FKUoLQSyv549aQA/exec';
const { jsPDF } = window.jspdf;

// Ruta del logo - AJUSTA ESTA RUTA SEGÚN TU ARCHIVO
const LOGO_PATH = 'logo.jpg';
const PAGE_SIZE = 25;

const ciudadesPorDepartamento = {
    "Amazonas": ["Leticia", "Puerto Nariño"],
    "Antioquia": ["Medellín", "Envigado", "Itagüí", "Rionegro", "Apartadó", "Bello", "Turbo"],
    "Atlántico": ["Barranquilla", "Soledad", "Puerto Colombia", "Malambo", "Sabanalarga"],
    "Bogotá D.C.": ["Bogotá"],
    "Bolívar": ["Cartagena", "Magangué", "Turbaco", "Arjona", "Carmen de Bolívar"],
    "Boyacá": ["Tunja", "Duitama", "Sogamoso", "Chiquinquirá"],
    "Caldas": ["Manizales", "La Dorada", "Chinchiná", "Villamaría"],
    "Caquetá": ["Florencia", "Belén de los Andaquíes"],
    "Casanare": ["Yopal", "Aguazul", "Tauramena"],
    "Cauca": ["Popayán", "Santander de Quilichao", "Puerto Tejada"],
    "Cesar": ["Valledupar", "Aguachica", "Codazzi", "La Paz", "Bosconia", "Curumaní","El copey","La jagua de ibirico","El paso","San martin","Astrea"],
    "Chocó": ["Quibdó", "Istmina", "Tadó"],
    "Córdoba": ["Montería", "Cereté", "Sahagún", "Lorica"],
    "Cundinamarca": ["Soacha", "Chía", "Zipaquirá", "Facatativá", "Girardot", "Fusagasugá", "BOGOTA D.C"],
    "Guainía": ["Inírida"],
    "Guaviare": ["San José del Guaviare"],
    "Huila": ["Neiva", "Pitalito", "Garzón", "La Plata"],
    "La Guajira": ["Riohacha", "Maicao", "Uribia", "Manaure"],
    "Magdalena": ["Santa Marta", "Ciénaga", "Fundación", "Aracataca", "El Banco","Algarrobo","Ariguani"],
    "Meta": ["Villavicencio", "Acacías", "Granada"],
    "Nariño": ["Pasto", "Tumaco", "Ipiales"],
    "Norte de Santander": ["Cúcuta", "Ocaña", "Pamplona"],
    "Putumayo": ["Mocoa", "Puerto Asís", "Villagarzón"],
    "Quindío": ["Armenia", "Calarcá", "La Tebaida", "Montenegro"],
    "Risaralda": ["Pereira", "Dosquebradas", "Santa Rosa de Cabal"],
    "San Andrés y Providencia": ["San Andrés", "Providencia"],
    "Santander": ["Bucaramanga", "Floridablanca", "Girón", "Barrancabermeja", "Piedecuesta"],
    "Sucre": ["Sincelejo", "Corozal", "Sampués"],
    "Tolima": ["Ibagué", "Espinal", "Honda"],
    "Valle del Cauca": ["Cali", "Buenaventura", "Palmira", "Tuluá", "Cartago", "Buga"],
    "Vaupés": ["Mitú"],
    "Vichada": ["Puerto Carreño"]
};

/* =========================================================
   Utilidades (funciones puras)
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function norm(s) {
    return String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}
function fmtMoney(v) {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(v || 0);
}
function fmtCOP(v) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);
}
// Convierte 52450, "52.450", "2.748.900", "1.234,50" -> número
function parseMoney(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    let s = String(v ?? '').replace(/[^\d.,-]/g, '').trim();
    if (!s) return 0;
    const hasDot = s.includes('.'), hasComma = s.includes(',');
    if (hasDot && hasComma) s = s.replace(/\./g, '').replace(',', '.');
    else if (hasDot) { if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ''); }
    else if (hasComma) { s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.'); }
    const n = parseFloat(s);
    return isFinite(n) ? n : 0;
}
// Acepta "2025-12-16", "2025-12-16T05:00:00Z", "16/12/2025" -> "2025-12-16"
function normDate(v) {
    const s = String(v ?? '').trim();
    if (!s) return '';
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return '';
}
function fechaCorta(iso) {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}
function hoyColombia() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }); // YYYY-MM-DD
}
function calcularTotales(productos) {
    let subtotal = 0, descuento = 0;
    const lineas = productos.map(p => {
        const bruto = (p.cantidad || 0) * (p.valorUnitario || 0);
        const desc = bruto * ((p.porcentajeDescuento || 0) / 100);
        subtotal += bruto; descuento += desc;
        return { bruto, desc, total: bruto - desc };
    });
    return { subtotal, descuento, total: subtotal - descuento, lineas };
}
function setSelect(sel, val) {
    if (val === undefined || val === null || val === '') { sel.value = ''; return; }
    val = String(val);
    if (![...sel.options].some(o => o.value === val)) {
        const o = document.createElement('option');
        o.value = val; o.textContent = val;
        sel.appendChild(o); // valores antiguos que ya no están en la lista
    }
    sel.value = val;
}
function llenarCiudades(dpto, ciudadSel, preselect = '') {
    const lista = ciudadesPorDepartamento[dpto];
    if (!lista) {
        ciudadSel.disabled = true;
        ciudadSel.innerHTML = '<option value="">Primero elija un departamento</option>';
        return;
    }
    ciudadSel.disabled = false;
    ciudadSel.innerHTML = '<option value="">Seleccione una ciudad</option>' +
        lista.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    if (preselect) setSelect(ciudadSel, preselect);
}

/* ---------- Registros de Google Sheets -> objeto de trabajo ---------- */
function normalizarFila(raw, filaPorDefecto) {
    const r = {};
    Object.keys(raw).forEach(k => { r[k.replace(/\s+/g, '').toUpperCase()] = raw[k]; });

    let detalle = null;
    if (r.DETALLE_JSON) { try { detalle = JSON.parse(r.DETALLE_JSON); } catch (e) { detalle = null; } }

    const servicios = String(r.SERVICIO_COTIZADO ?? '').split('|').map(s => s.trim()).filter(Boolean);
    const valorRaw = String(r.VALOR ?? '');
    const valoresPipe = valorRaw.includes('|') ? valorRaw.split('|').map(parseMoney) : null;
    const total = valoresPipe ? valoresPipe.reduce((a, b) => a + b, 0) : parseMoney(r.VALOR);

    return {
        fila: Number(r._FILA) || filaPorDefecto,
        consecutivo: String(r.N_CONSECUTIVO ?? '').trim(),
        fecha: normDate(r.FECHA_COTIZACION),
        tipoDocumento: String(r.TIPO_DOCUMENTO ?? '').trim(),
        documento: String(r.DOCUMENTO ?? '').trim(),
        nombres: String(r.NOMBRES ?? '').trim(),
        empresa: String(r.EMPRESA ?? ''),
        especialidad: String(r.ESPECIALIDAD ?? '').trim(),
        servicios, total, valoresPipe,
        observacionGeneral: String(r.OBSERVACION_GENERAL ?? ''),
        observacionAdicional: String(r.OBSERVACION_ADICIONAL ?? ''),
        autorizador: String(r.AUTORIZADOR ?? '').trim(),
        detalle
    };
}
// Devuelve { productos, incompleto } a partir de un registro guardado
function productosDeRegistro(r) {
    if (r.detalle && Array.isArray(r.detalle.productos) && r.detalle.productos.length) {
        return { productos: r.detalle.productos, incompleto: false };
    }
    const s = r.servicios;
    if (!s.length) return { productos: [{ descripcion: '', cantidad: 1, valorUnitario: r.total, porcentajeDescuento: 0 }], incompleto: false };
    if (r.valoresPipe && r.valoresPipe.length === s.length) {
        return { productos: s.map((d, i) => ({ descripcion: d, cantidad: 1, valorUnitario: r.valoresPipe[i], porcentajeDescuento: 0 })), incompleto: false };
    }
    if (s.length === 1) return { productos: [{ descripcion: s[0], cantidad: 1, valorUnitario: r.total, porcentajeDescuento: 0 }], incompleto: false };
    // Varios servicios y un solo total: no se puede repartir sin inventar datos
    return { productos: s.map(d => ({ descripcion: d, cantidad: 1, valorUnitario: '', porcentajeDescuento: 0 })), incompleto: true };
}
function datosDeRegistro(r) {
    const d = r.detalle || {};
    const { productos, incompleto } = productosDeRegistro(r);
    return {
        consecutivo: r.consecutivo, fecha: r.fecha || hoyColombia(),
        tipoDocumento: r.tipoDocumento, documento: r.documento, nombres: r.nombres,
        sexo: d.sexo || '', empresa: r.empresa, especialidad: r.especialidad,
        telefono: d.telefono || '', admision: d.admision || '', direccion: d.direccion || '',
        departamento: d.departamento || '', ciudad: d.ciudad || '',
        observacionGeneral: r.observacionGeneral, observacionAdicional: r.observacionAdicional,
        autorizador: r.autorizador, productos, incompleto,
        reconstruido: !r.detalle
    };
}

/* ---------- Productos (plantilla compartida: formulario y editor) ---------- */
function productoHTML(p = {}) {
    const v = (x, d = '') => (x === undefined || x === null || x === '') ? d : esc(x);
    return `
    <div class="producto-item">
        <div class="producto-head">
            <span class="producto-num"></span>
            <button type="button" class="btn-eliminar-producto icon-btn" aria-label="Eliminar producto" title="Eliminar producto"><i class="fas fa-trash-alt"></i></button>
        </div>
        <div class="producto-grid">
            <div class="field req producto-desc"><span>Descripción</span>
                <input type="text" class="servicio-cotizado" required placeholder="Descripción detallada del servicio" value="${v(p.descripcion)}" aria-label="Descripción"></div>
            <div class="field req"><span>Cantidad</span>
                <input type="number" class="cantidad" min="1" required value="${v(p.cantidad, 1)}" aria-label="Cantidad"></div>
            <div class="field req"><span>Valor unitario</span>
                <input type="number" class="valor-unitario" min="0" step="0.01" required placeholder="$" value="${v(p.valorUnitario)}" aria-label="Valor unitario"></div>
            <div class="field req"><span>% descuento</span>
                <input type="number" class="porcentaje-descuento" min="0" max="100" step="0.1" required value="${v(p.porcentajeDescuento, 0)}" aria-label="Porcentaje de descuento"></div>
            <div class="field linea"><span>Total de la línea</span><output class="linea-total">$ 0</output></div>
        </div>
    </div>`;
}
function leerProductos(root) {
    return $$('.producto-item', root).map(el => ({
        descripcion: $('.servicio-cotizado', el).value.trim(),
        cantidad: parseFloat($('.cantidad', el).value) || 0,
        valorUnitario: parseFloat($('.valor-unitario', el).value) || 0,
        porcentajeDescuento: parseFloat($('.porcentaje-descuento', el).value) || 0
    }));
}
function refrescarTotales(root, out) {
    const r = calcularTotales(leerProductos(root));
    $$('.producto-item', root).forEach((el, i) => { $('.linea-total', el).textContent = fmtCOP(r.lineas[i].total); });
    if (out.subtotal) out.subtotal.textContent = fmtCOP(r.subtotal);
    if (out.descuento) out.descuento.textContent = fmtCOP(r.descuento);
    if (out.total) out.total.textContent = fmtCOP(r.total);
    return r;
}
function conectarProductos(root, onChange) {
    root.addEventListener('click', e => {
        const btn = e.target.closest('.btn-eliminar-producto');
        if (!btn) return;
        if ($$('.producto-item', root).length <= 1) { mostrarMensaje('error', 'Debe tener al menos un producto'); return; }
        if (confirm('¿Está seguro de eliminar este producto?')) {
            btn.closest('.producto-item').remove();
            onChange();
            mostrarMensaje('info', 'Producto eliminado');
        }
    });
}

/* ---------- Hoja de cálculo ---------- */
function aPayload(d, t) {
    const detalle = {
        productos: d.productos, sexo: d.sexo, direccion: d.direccion,
        departamento: d.departamento, ciudad: d.ciudad, telefono: d.telefono, admision: d.admision
    };
    return {
        N_CONSECUTIVO: d.consecutivo,
        FECHA_COTIZACION: d.fecha,
        TIPO_DOCUMENTO: d.tipoDocumento,
        DOCUMENTO: d.documento,
        NOMBRES: d.nombres,
        EMPRESA: d.empresa,
        ESPECIALIDAD: d.especialidad,
        SERVICIO_COTIZADO: d.productos.map(p => p.descripcion).join(' | '),
        VALOR: t.total,
        OBSERVACION_GENERAL: d.observacionGeneral,
        OBSERVACION_ADICIONAL: d.observacionAdicional,
        AUTORIZADOR: d.autorizador,
        DETALLE_JSON: JSON.stringify(detalle)
    };
}
async function enviarAHoja(payload) {
    const params = new URLSearchParams();
    Object.keys(payload).forEach(k => params.append(k, payload[k]));
    const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
    });
    if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
    const result = await response.json();
    if (result && result.status === 'error') throw new Error(result.mensaje || 'Google Sheets devolvió un error');
    return result;
}

/* ---------- PDF ---------- */
function generarContenidoPDF(d, t) {
    const fecha = fechaCorta(d.fecha) || fechaCorta(hoyColombia());
    const filas = d.productos.map((p, i) => `
        <tr>
            <td style="border:1px solid #000; padding:2mm 1mm; font-size:8pt;">${esc(p.descripcion)}</td>
            <td style="border:1px solid #000; text-align:center; padding:2mm 1mm; font-size:8pt;">${p.cantidad}</td>
            <td style="border:1px solid #000; text-align:right; padding:2mm 1mm; font-size:8pt;">$ ${fmtMoney(p.valorUnitario)}</td>
            <td style="border:1px solid #000; text-align:right; padding:2mm 1mm; font-size:8pt;">$ ${fmtMoney(t.lineas[i].desc)}</td>
            <td style="border:1px solid #000; text-align:center; padding:2mm 1mm; font-size:8pt;">${p.porcentajeDescuento}%</td>
            <td style="border:1px solid #000; text-align:right; padding:2mm 1mm; font-size:8pt;">$ ${fmtMoney(t.lineas[i].total)}</td>
        </tr>`).join('');

    return `
        <div id="pdfContent" style="position:relative; width:210mm; min-height:297mm; padding:10mm 15mm; box-sizing:border-box; font-family:Arial, sans-serif; font-size:9pt; color:#000; line-height:1.2;">

            <table style="width:100%; border-collapse:collapse; border:1px solid #000; margin-bottom:5mm; height:25mm;">
                <tr>
                    <td style="width:30%; border-right:1px solid #000; text-align:center; padding:2mm; vertical-align:middle;">
                        <img src="${LOGO_PATH}" style="max-width:100%; max-height:20mm; object-fit:contain;" onerror="this.style.display='none'">
                    </td>
                    <td style="width:40%; border-right:1px solid #000; padding:2mm; vertical-align:middle;">
                        <div style="text-align:center; font-size:10pt; font-weight:bold; margin-bottom:1mm;">COTIZACIONES</div>
                        <div style="text-align:center; font-size:8pt; line-height:1.3;">
                            CLINICA REGIONAL DE ESPECIALISTAS SINAIS VITAIS S.A.S<br>
                            NIT. 900498069-1<br>
                            CALLE 18 # 16 - 09 BOSCONIA CESAR<br>
                            Teléfono: 5781068
                        </div>
                    </td>
                    <td style="width:30%; padding:2mm; vertical-align:top; font-size:7pt;">
                        <table style="width:100%;">
                            <tr><td><strong>Código:</strong></td><td></td></tr>
                            <tr><td><strong>Versión:</strong></td><td></td></tr>
                            <tr><td><strong>Fecha:</strong></td><td>${fecha}</td></tr>
                            <tr><td><strong>Página:</strong></td><td>1 de 1</td></tr>
                        </table>
                    </td>
                </tr>
            </table>

            <div style="text-align:center; font-weight:bold; font-size:9pt; margin-bottom:5mm;">
                Fecha de Cotización: ${fecha} &nbsp;&nbsp; | &nbsp;&nbsp; N° Cotización: ${esc(d.consecutivo)}
            </div>

            <hr style="border:none; border-top:1px solid #000; margin-bottom:5mm;">

            <table style="width:100%; font-size:8pt; margin-bottom:5mm; border-collapse:collapse;">
                <tr>
                    <td style="width:50%; padding:0.5mm 0;"><strong>Señores:</strong> ${esc(d.empresa)}</td>
                    <td style="width:50%; padding:0.5mm 0;"><strong>Admisión:</strong> ${esc(d.admision)}</td>
                </tr>
                <tr>
                    <td style="padding:0.5mm 0;"><strong>Paciente:</strong> ${esc(d.nombres)}</td>
                    <td style="padding:0.5mm 0;">
                        <strong>CC:</strong> ${esc(d.documento)} &nbsp;
                        <strong>TD:</strong> ${esc(d.tipoDocumento)} &nbsp;
                        <strong>Sexo:</strong> ${esc(d.sexo)}
                    </td>
                </tr>
                <tr>
                    <td style="padding:0.5mm 0;"><strong>Dirección:</strong> ${esc(d.direccion)}</td>
                    <td style="padding:0.5mm 0;">
                        <strong>Depto:</strong> ${esc(d.departamento)} &nbsp;
                        <strong>Ciudad:</strong> ${esc(d.ciudad)}
                    </td>
                </tr>
                <tr>
                    <td style="padding:0.5mm 0;"><strong>Teléfono:</strong> ${esc(d.telefono)}</td>
                    <td style="padding:0.5mm 0;"></td>
                </tr>
            </table>

            <div style="max-height:130mm; overflow:hidden; margin-bottom:5mm;">
                <table style="width:100%; border-collapse:collapse; font-size:8pt;">
                    <thead>
                        <tr style="background:#f0f0f0;">
                            <th style="border:1px solid #000; padding:2mm 1mm; font-size:8pt;">Descripción</th>
                            <th style="border:1px solid #000; padding:2mm 1mm; width:8%; font-size:8pt;">Cantidad</th>
                            <th style="border:1px solid #000; padding:2mm 1mm; width:12%; font-size:8pt;">Vr. Unitario</th>
                            <th style="border:1px solid #000; padding:2mm 1mm; width:10%; font-size:8pt;">Vr. Desc</th>
                            <th style="border:1px solid #000; padding:2mm 1mm; width:8%; font-size:8pt;">% Desc</th>
                            <th style="border:1px solid #000; padding:2mm 1mm; width:12%; font-size:8pt;">Vr. Total</th>
                        </tr>
                    </thead>
                    <tbody>${filas}</tbody>
                </table>
            </div>

            <div style="margin-bottom:5mm;">
                <div style="font-weight:bold; margin-bottom:1mm; font-size:9pt;">Observación</div>
                <div style="border:1px solid #000; padding:2mm; min-height:10mm; font-size:8pt;">${esc(d.observacionGeneral)}</div>
            </div>

            <div style="text-align:right; font-size:9pt; margin-top:5mm;">
                <div style="margin-bottom:1mm;">Subtotal: $ ${fmtMoney(t.subtotal)}</div>
                <div style="margin-bottom:1mm;">Descuento: $ ${fmtMoney(t.descuento)}</div>
                <div style="font-size:10pt; font-weight:bold;">Total: $ ${fmtMoney(t.total)}</div>
            </div>

            <div style="position:absolute; bottom:20mm; left:15mm; width:70mm;">
                <div style="text-align:center; font-size:9pt;">
                    <strong>Autorizado por:</strong><br>
                    <span style="font-size:10pt; text-transform:uppercase; font-weight:bold;">${esc(d.autorizador)}</span>
                </div>
            </div>
        </div>`;
}

async function crearPDF(d) {
    if (!d.autorizador.trim()) {
        if (!confirm('⚠️ El campo "Autorizado por" está vacío. ¿Desea continuar sin el nombre del autorizador?')) return false;
    }
    mostrarMensaje('info', 'Generando PDF...');
    const t = calcularTotales(d.productos);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = generarContenidoPDF(d, t);
    tempDiv.style.position = 'fixed';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    document.body.appendChild(tempDiv);
    try {
        // Esperar a que el logo cargue (o falle)
        await Promise.all(Array.from(tempDiv.getElementsByTagName('img')).map(img =>
            img.complete ? Promise.resolve() : new Promise(res => { img.onload = res; img.onerror = res; })));

        const canvas = await html2canvas(tempDiv.querySelector('#pdfContent'), {
            scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff',
            width: 794, height: 1123, windowWidth: 794, windowHeight: 1123, allowTaint: true
        });
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
        pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, 210, 297);
        pdf.save(`Cotizacion_${d.consecutivo || 'sin-numero'}.pdf`);
        mostrarMensaje('success', 'PDF generado correctamente');
        return true;
    } finally {
        document.body.removeChild(tempDiv);
    }
}

/* ---------- Avisos ---------- */
let toastTimer;
function mostrarMensaje(tipo, mensaje) {
    const el = $('#responseMessage');
    if (!el) return;
    el.className = `toast show ${tipo}`;
    el.textContent = mensaje;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = 'toast'; el.textContent = ''; }, 5000);
}
function ocupado(btn, on) { if (btn) { btn.dataset.busy = on ? 'true' : 'false'; btn.disabled = !!on; } }

/* =========================================================
   Aplicación
   ========================================================= */
const estado = { registros: [], cargando: false, error: null, cargado: false, limite: PAGE_SIZE, editando: null, sucio: false };

document.addEventListener('DOMContentLoaded', function () {
    const form = $('#cotizacionForm');
    const contenedor = $('#productosContainer');
    const dptoSelect = $('#DEPARTAMENTO');
    const ciudadSelect = $('#CIUDAD');
    const outPrincipal = { subtotal: $('#subtotal'), descuento: $('#descuento-total'), total: $('#total-final') };

    // Evita que Enter envíe/recargue los formularios
    form.addEventListener('submit', e => e.preventDefault());
    $('#editForm').addEventListener('submit', e => e.preventDefault());

    /* ---------- Pestañas ---------- */
    function mostrarTab(nombre) {
        $$('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === nombre)));
        $$('[data-panel]').forEach(p => { p.hidden = p.dataset.panel !== nombre; });
        history.replaceState(null, '', nombre === 'registros' ? '#registros' : '#nueva');
        if (nombre === 'registros') { if (!estado.cargado && !estado.cargando) cargarRegistros(); else renderRegistros(); }
    }
    $$('[data-tab]').forEach(b => b.addEventListener('click', () => mostrarTab(b.dataset.tab)));

    /* ---------- Formulario nuevo ---------- */
    $('#FECHA_COTIZACION').value = hoyColombia();
    $('#TIPO_DOCUMENTO').value = 'CC';
    $('#SEXO').value = 'M';
    contenedor.innerHTML = productoHTML();

    function recalcular() {
        refrescarTotales(contenedor, outPrincipal);
        $('#descargarPdfBtn').disabled = !form.checkValidity();
    }
    form.addEventListener('input', recalcular);
    conectarProductos(contenedor, recalcular);
    dptoSelect.addEventListener('change', () => llenarCiudades(dptoSelect.value, ciudadSelect));

    $('#agregarProductoBtn').addEventListener('click', () => {
        contenedor.insertAdjacentHTML('beforeend', productoHTML());
        $$('.servicio-cotizado', contenedor).pop().focus();
        recalcular();
    });

    function leerFormularioPrincipal() {
        const v = id => $('#' + id)?.value || '';
        return {
            consecutivo: v('N_CONSECUTIVO'), fecha: v('FECHA_COTIZACION'), tipoDocumento: v('TIPO_DOCUMENTO'),
            documento: v('DOCUMENTO'), nombres: v('NOMBRES'), sexo: v('SEXO'), empresa: v('EMPRESA'),
            especialidad: v('ESPECIALIDAD'), telefono: v('TELEFONO'), admision: v('ADMISION'),
            direccion: v('DIRECCION'), departamento: v('DEPARTAMENTO'), ciudad: v('CIUDAD'),
            observacionGeneral: v('OBSERVACION_GENERAL'), observacionAdicional: v('OBSERVACION_ADICIONAL'),
            autorizador: v('AUTORIZADOR'), productos: leerProductos(contenedor)
        };
    }

    $('#vaciarFormulario').addEventListener('click', () => {
        if (!confirm('¿Está seguro de que desea vaciar todo el formulario?')) return;
        form.reset();
        llenarCiudades('', ciudadSelect);
        $('#FECHA_COTIZACION').value = hoyColombia();
        $('#TIPO_DOCUMENTO').value = 'CC';
        $('#SEXO').value = 'M';
        contenedor.innerHTML = productoHTML();
        recalcular();
        mostrarSugerencia();
        mostrarMensaje('info', 'Formulario listo para una nueva cotización');
    });

    $('#descargarPdfBtn').addEventListener('click', async () => {
        if (!form.checkValidity()) { form.reportValidity(); return; }
        const btn = $('#descargarPdfBtn');
        ocupado(btn, true);
        try { await crearPDF(leerFormularioPrincipal()); }
        catch (e) { console.error(e); mostrarMensaje('error', 'Error al generar PDF: ' + e.message); }
        finally { ocupado(btn, false); recalcular(); }
    });

    $('#guardarImprimirBtn').addEventListener('click', async () => {
        if (!form.checkValidity()) { form.reportValidity(); return; }
        const d = leerFormularioPrincipal();
        const existe = estado.registros.find(r => r.consecutivo === String(d.consecutivo).trim());
        if (existe && !confirm(`Ya existe la cotización N° ${d.consecutivo} (${existe.nombres}). Guardar creará una fila duplicada. Para modificarla usa «Cotizaciones realizadas». ¿Guardar de todos modos?`)) return;

        const btn = $('#guardarImprimirBtn');
        ocupado(btn, true);
        mostrarMensaje('info', 'Procesando...');
        try {
            await enviarAHoja(aPayload(d, calcularTotales(d.productos)));
            const ok = await crearPDF(d);
            mostrarMensaje('success', ok ? 'Datos guardados en Google Sheets y PDF generado' : 'Datos guardados en Google Sheets');
            cargarRegistros();
        } catch (e) {
            console.error(e);
            mostrarMensaje('error', 'Error: ' + e.message);
        } finally { ocupado(btn, false); }
    });

    /* Sugerencia del siguiente consecutivo (según lo ya registrado) */
    function mostrarSugerencia() {
        const btn = $('#sugerenciaConsecutivo');
        const nums = estado.registros.map(r => parseInt(r.consecutivo, 10)).filter(n => !isNaN(n));
        if (!nums.length || $('#N_CONSECUTIVO').value) { btn.hidden = true; return; }
        const sig = Math.max(...nums) + 1;
        btn.textContent = `Usar el siguiente: ${sig}`;
        btn.onclick = () => { $('#N_CONSECUTIVO').value = sig; btn.hidden = true; recalcular(); };
        btn.hidden = false;
    }
    $('#N_CONSECUTIVO').addEventListener('input', mostrarSugerencia);

    /* =====================================================
       MÓDULO 2: cotizaciones realizadas
       ===================================================== */
    const tbody = $('#tbodyRegistros');
    const estadoBox = $('#estadoRegistros');

    window.cargarRegistros = async function () {
        if (estado.cargando) return;
        estado.cargando = true; estado.error = null;
        renderRegistros();
        try {
            const res = await fetch(GOOGLE_SCRIPT_URL, { cache: 'no-store' });
            if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
            const data = await res.json();
            if (!Array.isArray(data)) throw new Error(data && data.error ? data.error : 'Respuesta inesperada del servidor');
            estado.registros = data.map((raw, i) => normalizarFila(raw, i + 2))
                                   .filter(r => r.consecutivo || r.documento);
            estado.cargado = true;
        } catch (e) {
            console.error(e);
            estado.error = e.message;
        } finally {
            estado.cargando = false;
            llenarEspecialidades();
            renderRegistros();
            mostrarSugerencia();
        }
    };

    function llenarEspecialidades() {
        const sel = $('#fEspecialidad');
        const actual = sel.value;
        const lista = [...new Set(estado.registros.map(r => r.especialidad).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
        sel.innerHTML = '<option value="">Todas</option>' + lista.map(e => `<option value="${esc(e)}">${esc(e)}</option>`).join('');
        sel.value = lista.includes(actual) ? actual : '';
    }

    function filtrar() {
        const fd = norm($('#fDocumento').value), fc = $('#fConsecutivo').value.trim();
        const fp = norm($('#fProducto').value), fe = $('#fEspecialidad').value;
        return estado.registros
            .map((r, id) => ({ r, id }))
            .filter(({ r }) =>
                (!fd || norm(r.documento).includes(fd)) &&
                (!fc || r.consecutivo.includes(fc)) &&
                (!fp || norm(r.servicios.join(' ')).includes(fp)) &&
                (!fe || r.especialidad === fe))
            .sort((a, b) => (parseInt(b.r.consecutivo, 10) || 0) - (parseInt(a.r.consecutivo, 10) || 0));
    }

    function renderRegistros() {
        const badge = $('#badgeRegistros');
        badge.hidden = !estado.cargado;
        badge.textContent = estado.registros.length;
        const conteo = $('#resultadoConteo');
        const btnMas = $('#btnMas');
        estadoBox.hidden = true; btnMas.hidden = true;
        $('.records').hidden = false;

        if (estado.cargando && !estado.cargado) {
            conteo.textContent = 'Cargando cotizaciones...';
            tbody.innerHTML = Array.from({ length: 6 }, () =>
                `<tr class="skeleton">${'<td><span></span></td>'.repeat(8)}</tr>`).join('');
            return;
        }
        if (estado.error && !estado.cargado) {
            conteo.textContent = '';
            $('.records').hidden = true;
            estadoBox.className = 'state state--error';
            estadoBox.innerHTML = `<strong>No se pudieron cargar las cotizaciones</strong>${esc(estado.error)}<br>
                Verifica tu conexión y que el Apps Script esté publicado con la última versión.<br>
                <button type="button" class="btn btn-secondary" id="btnReintentar"><i class="fas fa-rotate"></i> Reintentar</button>`;
            estadoBox.hidden = false;
            $('#btnReintentar').onclick = cargarRegistros;
            return;
        }

        const lista = filtrar();
        const total = estado.registros.length;
        conteo.textContent = lista.length === total
            ? `${total} cotizaciones`
            : `${lista.length} de ${total} cotizaciones`;

        if (!lista.length) {
            $('.records').hidden = true;
            estadoBox.className = 'state';
            estadoBox.innerHTML = total
                ? '<strong>Ninguna cotización coincide</strong>Cambia o limpia los filtros para ver más resultados.'
                : '<strong>Aún no hay cotizaciones guardadas</strong>Cuando guardes una, aparecerá aquí.';
            estadoBox.hidden = false;
            return;
        }

        const visibles = lista.slice(0, estado.limite);
        tbody.innerHTML = visibles.map(({ r, id }) => {
            const chips = r.servicios.slice(0, 2).map(s => `<span class="chip" title="${esc(s)}">${esc(s)}</span>`).join('') +
                (r.servicios.length > 2 ? `<span class="chip chip--more" title="${esc(r.servicios.slice(2).join(' | '))}">+${r.servicios.length - 2}</span>` : '');
            return `
            <tr data-id="${id}">
                <td class="num" data-label="N°">${esc(r.consecutivo)}</td>
                <td data-label="Fecha">${fechaCorta(r.fecha)}</td>
                <td data-label="Paciente"><span class="cell-main">${esc(r.nombres)}</span><span class="cell-sub">${esc(r.tipoDocumento)} ${esc(r.documento)}</span></td>
                <td data-label="EPS">${esc(r.empresa.trim())}</td>
                <td data-label="Especialidad">${esc(r.especialidad)}</td>
                <td data-label="Servicios"><div class="chips">${chips || '<span class="cell-sub">Sin detalle</span>'}</div></td>
                <td class="money" data-label="Total">${fmtCOP(r.total)}</td>
                <td><div class="row-actions">
                    <button type="button" class="btn btn-secondary" data-act="editar"><i class="fas fa-pen"></i> Editar</button>
                    <button type="button" class="btn btn-ghost" data-act="pdf" title="Generar PDF"><i class="fas fa-file-pdf"></i> PDF</button>
                </div></td>
            </tr>`;
        }).join('');
        btnMas.hidden = lista.length <= visibles.length;
        btnMas.textContent = `Mostrar más (${lista.length - visibles.length} restantes)`;
    }

    // Filtros en vivo
    let debounce;
    ['fDocumento', 'fConsecutivo', 'fProducto'].forEach(id =>
        $('#' + id).addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(() => { estado.limite = PAGE_SIZE; renderRegistros(); }, 150); }));
    $('#fEspecialidad').addEventListener('change', () => { estado.limite = PAGE_SIZE; renderRegistros(); });
    $('#btnLimpiarFiltros').addEventListener('click', () => {
        ['fDocumento', 'fConsecutivo', 'fProducto'].forEach(id => { $('#' + id).value = ''; });
        $('#fEspecialidad').value = '';
        estado.limite = PAGE_SIZE; renderRegistros();
    });
    $('#btnRefrescar').addEventListener('click', cargarRegistros);
    $('#btnMas').addEventListener('click', () => { estado.limite += PAGE_SIZE; renderRegistros(); });

    tbody.addEventListener('click', async e => {
        const btn = e.target.closest('[data-act]');
        if (!btn) return;
        const r = estado.registros[Number(btn.closest('tr').dataset.id)];
        if (!r) return;
        if (btn.dataset.act === 'editar') { abrirEditor(r); return; }
        // PDF rápido
        const d = datosDeRegistro(r);
        if (d.incompleto) {
            mostrarMensaje('info', 'Este registro antiguo necesita que confirmes los valores por producto. Se abrió el editor.');
            abrirEditor(r); return;
        }
        ocupado(btn, true);
        try { await crearPDF(d); } catch (err) { console.error(err); mostrarMensaje('error', 'Error al generar PDF: ' + err.message); }
        finally { ocupado(btn, false); }
    });

    /* =====================================================
       Editor lateral
       ===================================================== */
    const dialog = $('#editorDialog');
    const editBody = $('#editorBody');
    const outEditor = { total: $('#editorTotal') };

    function campo(label, inner, cls = '') {
        return `<div class="field ${cls}"><label>${label}</label>${inner}</div>`;
    }
    function editorHTML(d) {
        const opts = id => $('#' + id).innerHTML;
        const aviso = d.reconstruido ? `
            <div class="notice"><strong>Registro anterior a esta versión</strong>
            Solo se había guardado el texto de los servicios y el total. Revisa cantidades, valores y descuentos${d.incompleto ? ' (los valores por producto están vacíos porque el total no se puede repartir automáticamente)' : ''} antes de generar el PDF. Los datos de dirección, ciudad, teléfono y admisión solo se guardan desde ahora.</div>` : '';
        return `${aviso}
        <section class="block">
            <div class="block__head"><h2>Paciente y cotización</h2></div>
            <div class="block__fields">
                ${campo('N° cotización', `<input data-f="consecutivo" value="${esc(d.consecutivo)}" readonly>`)}
                ${campo('Fecha', `<input type="date" data-f="fecha" value="${esc(d.fecha)}" required>`, 'req')}
                ${campo('Tipo de documento', `<select data-f="tipoDocumento" required>${opts('TIPO_DOCUMENTO')}</select>`, 'req')}
                ${campo('N° documento', `<input data-f="documento" inputmode="numeric" value="${esc(d.documento)}" required>`, 'req')}
                ${campo('Nombres del paciente', `<input data-f="nombres" value="${esc(d.nombres)}" required>`, 'req')}
                ${campo('Sexo', `<select data-f="sexo"><option value="">Sin dato</option><option value="M">Masculino (M)</option><option value="F">Femenino (F)</option></select>`)}
                ${campo('Empresa / EPS', `<select data-f="empresa" required>${opts('EMPRESA')}</select>`, 'req')}
                ${campo('Especialidad', `<select data-f="especialidad" required>${opts('ESPECIALIDAD')}</select>`, 'req')}
                ${campo('Observación adicional (solo Google Sheets)', `<textarea data-f="observacionAdicional" rows="2" class="note-sheet">${esc(d.observacionAdicional)}</textarea>`, 'span-2')}
            </div>
        </section>
        <section class="block">
            <div class="block__head"><h2>Productos y servicios</h2></div>
            <div class="block__fields block__fields--stack">
                <div class="productos-list" id="editorProductos">${d.productos.map(productoHTML).join('')}</div>
                <button type="button" class="btn btn-soft" id="editorAgregar"><i class="fas fa-plus"></i> Agregar producto</button>
            </div>
        </section>
        <section class="block">
            <div class="block__head"><h2>Datos para el PDF</h2></div>
            <div class="block__fields">
                ${campo('Teléfono', `<input data-f="telefono" inputmode="numeric" value="${esc(d.telefono)}">`)}
                ${campo('N° admisión', `<input data-f="admision" inputmode="numeric" value="${esc(d.admision)}">`)}
                ${campo('Dirección', `<input data-f="direccion" value="${esc(d.direccion)}">`, 'span-2')}
                ${campo('Departamento', `<select data-f="departamento">${opts('DEPARTAMENTO')}</select>`)}
                ${campo('Ciudad', `<select data-f="ciudad" disabled></select>`)}
                ${campo('Observación general (aparece en el PDF)', `<textarea data-f="observacionGeneral" rows="3" required>${esc(d.observacionGeneral)}</textarea>`, 'span-2 req')}
                ${campo('Autorizado por', `<input data-f="autorizador" value="${esc(d.autorizador)}" required>`, 'span-2 req')}
            </div>
        </section>`;
    }
    const F = k => $(`[data-f="${k}"]`, editBody);

    function leerEditor() {
        const g = k => F(k).value;
        return {
            consecutivo: g('consecutivo'), fecha: g('fecha'), tipoDocumento: g('tipoDocumento'), documento: g('documento').trim(),
            nombres: g('nombres').trim(), sexo: g('sexo'), empresa: g('empresa'), especialidad: g('especialidad'),
            telefono: g('telefono'), admision: g('admision'), direccion: g('direccion'),
            departamento: g('departamento'), ciudad: g('ciudad'),
            observacionGeneral: g('observacionGeneral'), observacionAdicional: g('observacionAdicional'),
            autorizador: g('autorizador'), productos: leerProductos($('#editorProductos'))
        };
    }
    function recalcularEditor() {
        const r = refrescarTotales($('#editorProductos'), outEditor);
        const reg = estado.editando;
        const dif = reg && Math.round(r.total) !== Math.round(reg.total);
        $('#editorTotalRegistrado').textContent = reg ? (dif ? `Registrado en la hoja: ${fmtCOP(reg.total)}` : 'Igual al total registrado') : '';
    }

    function abrirEditor(r) {
        estado.editando = r; estado.sucio = false;
        const d = datosDeRegistro(r);
        $('#editorTitulo').textContent = `Editar cotización N° ${r.consecutivo}`;
        $('#editorSub').textContent = `${r.nombres} - fila ${r.fila} de la hoja`;
        editBody.innerHTML = editorHTML(d);

        setSelect(F('tipoDocumento'), d.tipoDocumento);
        setSelect(F('sexo'), d.sexo);
        setSelect(F('empresa'), d.empresa);
        setSelect(F('especialidad'), d.especialidad);
        setSelect(F('departamento'), d.departamento);
        llenarCiudades(F('departamento').value, F('ciudad'), d.ciudad);

        recalcularEditor();
        dialog.showModal();
        dialog.scrollTop = 0; editBody.scrollTop = 0;
    }
    function cerrarEditor(forzar) {
        if (!forzar && estado.sucio && !confirm('Tienes cambios sin guardar. ¿Descartarlos?')) return;
        dialog.close();
        estado.editando = null; estado.sucio = false;
    }

    editBody.addEventListener('input', e => {
        estado.sucio = true;
        if (e.target.closest('#editorProductos')) recalcularEditor();
    });
    editBody.addEventListener('change', e => {
        if (e.target.matches('[data-f="departamento"]')) llenarCiudades(e.target.value, F('ciudad'));
    });
    editBody.addEventListener('click', e => {
        if (e.target.closest('#editorAgregar')) {
            $('#editorProductos').insertAdjacentHTML('beforeend', productoHTML());
            $$('.servicio-cotizado', $('#editorProductos')).pop().focus();
            estado.sucio = true; recalcularEditor();
        }
    });
    conectarProductos(editBody, () => { estado.sucio = true; recalcularEditor(); });

    $('#editorCerrar').addEventListener('click', () => cerrarEditor(false));
    dialog.addEventListener('cancel', e => { e.preventDefault(); cerrarEditor(false); });
    dialog.addEventListener('click', e => { if (e.target === dialog) cerrarEditor(false); });

    async function guardarEdicion(conPdf) {
        const f = $('#editForm');
        if (!f.checkValidity()) { f.reportValidity(); return; }
        const d = leerEditor();
        const t = calcularTotales(d.productos);
        const reg = estado.editando;
        const btn = conPdf ? $('#editorGuardarPdf') : $('#editorGuardar');
        ocupado(btn, true);
        try {
            const payload = aPayload(d, t);
            payload.action = 'UPDATE';
            payload.FILA = reg.fila;
            payload.N_CONSECUTIVO_ORIGINAL = reg.consecutivo;
            await enviarAHoja(payload);
            mostrarMensaje('success', `Cotización N° ${d.consecutivo} actualizada en Google Sheets`);
            if (conPdf) await crearPDF(d);
            cerrarEditor(true);
            cargarRegistros();
        } catch (e) {
            console.error(e);
            mostrarMensaje('error', 'No se pudo guardar: ' + e.message);
        } finally { ocupado(btn, false); }
    }
    $('#editorGuardar').addEventListener('click', () => guardarEdicion(false));
    $('#editorGuardarPdf').addEventListener('click', () => guardarEdicion(true));
    $('#editorSoloPdf').addEventListener('click', async () => {
        const f = $('#editForm');
        if (!f.checkValidity()) { f.reportValidity(); return; }
        const btn = $('#editorSoloPdf');
        ocupado(btn, true);
        try { await crearPDF(leerEditor()); }
        catch (e) { console.error(e); mostrarMensaje('error', 'Error al generar PDF: ' + e.message); }
        finally { ocupado(btn, false); }
    });

    /* ---------- Inicio ---------- */
    recalcular();
    mostrarMensaje('info', 'Completa los campos obligatorios (*) para generar la cotización');
    mostrarTab(location.hash === '#registros' ? 'registros' : 'nueva');
    if (location.hash !== '#registros') cargarRegistros(); // precarga para sugerir consecutivo y detectar duplicados
});
