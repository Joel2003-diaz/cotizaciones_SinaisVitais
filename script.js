const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzLXNy7NpRPLKKmx9OX4nmIBDKppmTbTjnh3nU734EprJNVZgT-YamnAjsDsKJVco_dAQ/exec';
const { jsPDF } = window.jspdf;

// Ruta del logo - AJUSTA ESTA RUTA SEGÚN TU ARCHIVO
const LOGO_PATH = 'logo.jpg';

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
    "Cesar": ["Valledupar", "Aguachica", "Codazzi", "La Paz", "Bosconia", "Curumaní","El copey","La jagua de ibirico","El paso","San martin"],
    "Chocó": ["Quibdó", "Istmina", "Tadó"],
    "Córdoba": ["Montería", "Cereté", "Sahagún", "Lorica"],
    "Cundinamarca": ["Soacha", "Chía", "Zipaquirá", "Facatativá", "Girardot", "Fusagasugá"],
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

document.addEventListener('DOMContentLoaded', function() {
    // Elementos DOM
    const form = document.getElementById('cotizacionForm');
    const vaciarBtn = document.getElementById('vaciarFormulario');
    const guardarImprimirBtn = document.getElementById('guardarImprimirBtn');
    const descargarPdfBtn = document.getElementById('descargarPdfBtn');
    const agregarProductoBtn = document.getElementById('agregarProductoBtn');
    const productosContainer = document.getElementById('productosContainer');
    const responseDiv = document.getElementById('responseMessage');
    const dptoSelect = document.getElementById('DEPARTAMENTO');
    const ciudadSelect = document.getElementById('CIUDAD');
    const autorizadorInput = document.getElementById('AUTORIZADOR'); // CAMBIADO A AUTORIZADOR
    
    // Elementos de totales
    const subtotalElement = document.getElementById('subtotal');
    const descuentoTotalElement = document.getElementById('descuento-total');
    const totalFinalElement = document.getElementById('total-final');

    // CORREGIDO: Configurar fecha actual EN FORMATO LOCAL COLOMBIANO
    const today = new Date();
    const colombiaOffset = -5 * 60; // Colombia está en UTC-5
    const todayUTC = new Date(today.getTime() + (today.getTimezoneOffset() - colombiaOffset) * 60000);
    
    // Formatear como YYYY-MM-DD para el input date
    const year = todayUTC.getFullYear();
    const month = String(todayUTC.getMonth() + 1).padStart(2, '0');
    const day = String(todayUTC.getDate()).padStart(2, '0');
    const todayFormatted = `${year}-${month}-${day}`;
    
    document.getElementById('FECHA_COTIZACION').value = todayFormatted;

    // Valores por defecto
    document.getElementById('TIPO_DOCUMENTO').value = 'CC';
    document.getElementById('SEXO').value = 'M';

    // Event listeners
    vaciarBtn.addEventListener('click', vaciarFormulario);
    guardarImprimirBtn.addEventListener('click', guardarYCrearPDF);
    descargarPdfBtn.addEventListener('click', generarPDF);
    agregarProductoBtn.addEventListener('click', agregarProducto);
    
    // Event listener para departamento
    if(dptoSelect) {
        dptoSelect.addEventListener('change', actualizarCiudades);
        console.log("Event listener para departamento configurado");
    }

    // Validación en tiempo real y cálculo de totales
    form.addEventListener('input', function() {
        const valido = form.checkValidity();
        if (valido) {
            calcularTotales();
            habilitarBotones(true);
        } else {
            habilitarBotones(false);
        }
    });

    // Delegación de eventos para eliminar productos
    productosContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('btn-eliminar-producto')) {
            const index = e.target.getAttribute('data-index');
            eliminarProducto(index);
        }
    });

    // Inicializar con un producto
    let productoIndex = 1;

    // Función para agregar nuevo producto
    function agregarProducto() {
        const productoHTML = `
            <div class="producto-item" data-index="${productoIndex}">
                <div class="producto-header">
                    <span>Producto #${productoIndex + 1}</span>
                    <button type="button" class="btn-eliminar-producto btn-danger btn-sm" data-index="${productoIndex}">
                        ✖ Eliminar
                    </button>
                </div>
                
                <div class="form-row">
                    <div class="form-group full-width">
                        <label for="SERVICIO_COTIZADO_${productoIndex}">Descripción *</label>
                        <input type="text" class="servicio-cotizado" name="SERVICIO_COTIZADO[]" required 
                            placeholder="Descripción del servicio" data-index="${productoIndex}">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="CANTIDAD_${productoIndex}">Cantidad *</label>
                        <input type="number" class="cantidad" name="CANTIDAD[]" min="1" value="1" required 
                            placeholder="Cantidad" data-index="${productoIndex}">
                    </div>
                    
                    <div class="form-group">
                        <label for="VALOR_${productoIndex}">Valor Unitario *</label>
                        <input type="number" class="valor-unitario" name="VALOR[]" min="0" step="0.01" required 
                            placeholder="$" data-index="${productoIndex}">
                    </div>
                    
                    <div class="form-group">
                        <label for="PORCENTAJE_DESCUENTO_${productoIndex}">% Descuento *</label>
                        <input type="number" class="porcentaje-descuento" name="PORCENTAJE_DESCUENTO[]" 
                            min="0" max="100" step="0.1" value="0" required data-index="${productoIndex}">
                    </div>
                </div>
            </div>
        `;
        
        productosContainer.insertAdjacentHTML('beforeend', productoHTML);
        productoIndex++;
        
        mostrarMensaje('success', '✅ Producto agregado correctamente');
        calcularTotales();
    }

    // Función para eliminar producto
    function eliminarProducto(index) {
        const producto = document.querySelector(`.producto-item[data-index="${index}"]`);
        if (producto && productosContainer.children.length > 1) {
            if (confirm('¿Está seguro de eliminar este producto?')) {
                producto.remove();
                renumerarProductos();
                productoIndex--;
                calcularTotales();
                mostrarMensaje('info', '🗑️ Producto eliminado');
            }
        } else if (productosContainer.children.length === 1) {
            mostrarMensaje('error', '❌ Debe tener al menos un producto');
        }
    }

    // Función para renumerar productos
    function renumerarProductos() {
        const productos = document.querySelectorAll('.producto-item');
        productos.forEach((producto, index) => {
            producto.setAttribute('data-index', index);
            producto.querySelector('.producto-header span').textContent = `Producto #${index + 1}`;
            
            // Actualizar todos los inputs dentro del producto
            const inputs = producto.querySelectorAll('input');
            inputs.forEach(input => {
                input.setAttribute('data-index', index);
                const id = input.id.split('_')[0] + '_' + index;
                input.id = id;
            });
            
            // Actualizar botón de eliminar
            const btnEliminar = producto.querySelector('.btn-eliminar-producto');
            btnEliminar.setAttribute('data-index', index);
        });
    }

    // Función para calcular totales
    function calcularTotales() {
        let subtotal = 0;
        let descuentoTotal = 0;
        
        const productos = document.querySelectorAll('.producto-item');
        productos.forEach(producto => {
            const cantidad = parseFloat(producto.querySelector('.cantidad').value) || 0;
            const valorUnitario = parseFloat(producto.querySelector('.valor-unitario').value) || 0;
            const porcentajeDescuento = parseFloat(producto.querySelector('.porcentaje-descuento').value) || 0;
            
            const valorProducto = cantidad * valorUnitario;
            const descuentoProducto = valorProducto * (porcentajeDescuento / 100);
            
            subtotal += valorProducto;
            descuentoTotal += descuentoProducto;
        });
        
        const totalFinal = subtotal - descuentoTotal;
        
        // Formatear valores en pesos colombianos
        const moneda = v => new Intl.NumberFormat('es-CO', { 
            style: 'currency', 
            currency: 'COP',
            maximumFractionDigits: 0 
        }).format(v);
        
        subtotalElement.textContent = moneda(subtotal);
        descuentoTotalElement.textContent = moneda(descuentoTotal);
        totalFinalElement.textContent = moneda(totalFinal);
    }

    // Función para vaciar formulario
    function vaciarFormulario() {
        if (confirm('¿Está seguro de que desea vaciar todo el formulario?')) {
            form.reset();
            
            // Limpiar y deshabilitar ciudad
            if (ciudadSelect) {
                ciudadSelect.innerHTML = '<option value="">Elija un departamento</option>';
                ciudadSelect.disabled = true;
            }
            
            // CORREGIDO: Restaurar fecha actual correctamente
            document.getElementById('FECHA_COTIZACION').value = todayFormatted;
            document.getElementById('TIPO_DOCUMENTO').value = 'CC';
            document.getElementById('SEXO').value = 'M';
            
            // Mantener solo el primer producto
            const productos = document.querySelectorAll('.producto-item');
            productos.forEach((producto, index) => {
                if (index > 0) {
                    producto.remove();
                }
            });
            
            // Resetear el primer producto
            const primerProducto = document.querySelector('.producto-item');
            if (primerProducto) {
                primerProducto.querySelector('.cantidad').value = 1;
                primerProducto.querySelector('.valor-unitario').value = '';
                primerProducto.querySelector('.porcentaje-descuento').value = 0;
                primerProducto.querySelector('.servicio-cotizado').value = '';
            }
            
            productoIndex = 1;
            calcularTotales();
            habilitarBotones(false);
            mostrarMensaje('info', '📝 Formulario listo para nueva cotización');
        }
    }

    // Función para habilitar/deshabilitar botones
    function habilitarBotones(habilitar) {
        descargarPdfBtn.disabled = !habilitar;
    }

    // Función para guardar y crear PDF
    async function guardarYCrearPDF() {
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        mostrarMensaje('info', '⏳ Procesando...');
        
        try {
            // Guardar en Google Sheets
            const guardado = await guardarEnGoogleSheets();
            
            if (guardado) {
                // Generar PDF
                await generarPDF();
                mostrarMensaje('success', '✅ Datos guardados en Google Sheets y PDF generado');
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarMensaje('error', '❌ Error: ' + error.message);
        }
    }

    // ✅ FUNCIÓN CORREGIDA: Para guardar en Google Sheets
    async function guardarEnGoogleSheets() {
        const productos = [];
        const productoElements = document.querySelectorAll('.producto-item');
        
        // Calcular el TOTAL como se muestra en el PDF
        let subtotal = 0;
        let descuentoTotal = 0;
        let serviciosConcatenados = '';
        
        productoElements.forEach((producto, index) => {
            const cantidad = parseFloat(producto.querySelector('.cantidad').value) || 0;
            const valorUnitario = parseFloat(producto.querySelector('.valor-unitario').value) || 0;
            const porcentajeDescuento = parseFloat(producto.querySelector('.porcentaje-descuento').value) || 0;
            const servicio = producto.querySelector('.servicio-cotizado').value;
            
            const valorProducto = cantidad * valorUnitario;
            const descuentoProducto = valorProducto * (porcentajeDescuento / 100);
            
            subtotal += valorProducto;
            descuentoTotal += descuentoProducto;
            
            productos.push({
                SERVICIO_COTIZADO: servicio,
                CANTIDAD: cantidad,
                VALOR: valorUnitario,
                PORCENTAJE_DESCUENTO: porcentajeDescuento
            });
            
            if (index > 0) {
                serviciosConcatenados += ' | ';
            }
            serviciosConcatenados += servicio;
        });
        
        const totalFinal = subtotal - descuentoTotal;
        
        // ✅ Obtener el autorizador de forma segura - CAMBIADO A AUTORIZADOR
        const autorizadorElement = document.getElementById('AUTORIZADOR');
        const autorizador = autorizadorElement ? autorizadorElement.value : '';
        
        const datosParaEnviar = {
            N_CONSECUTIVO: document.getElementById('N_CONSECUTIVO').value,
            FECHA_COTIZACION: document.getElementById('FECHA_COTIZACION').value,
            TIPO_DOCUMENTO: document.getElementById('TIPO_DOCUMENTO').value,
            DOCUMENTO: document.getElementById('DOCUMENTO').value,
            NOMBRES: document.getElementById('NOMBRES').value,
            EMPRESA: document.getElementById('EMPRESA').value,
            ESPECIALIDAD: document.getElementById('ESPECIALIDAD').value,
            SERVICIO_COTIZADO: serviciosConcatenados,
            VALOR: totalFinal,
            OBSERVACION_GENERAL: document.getElementById('OBSERVACION_GENERAL').value,
            OBSERVACION_ADICIONAL: document.getElementById('OBSERVACION_ADICIONAL').value,
            AUTORIZADOR: autorizador, // CAMBIADO A AUTORIZADOR
        };

        console.log("🔍 === DATOS A ENVIAR A GOOGLE SHEETS ===");
        console.log("AUTORIZADOR:", autorizador);
        console.log("Todos los datos:", datosParaEnviar);
        console.log("VALOR TOTAL:", totalFinal);

        try {
            const params = new URLSearchParams();
            Object.keys(datosParaEnviar).forEach(key => {
                params.append(key, datosParaEnviar[key]);
            });

            console.log("📤 Enviando datos a:", GOOGLE_SCRIPT_URL);
            
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params.toString()
            });

            if (!response.ok) {
                console.error("❌ Error HTTP:", response.status, response.statusText);
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log("✅ Respuesta de Google Sheets:", result);
            
            return true;
            
        } catch (error) {
            console.error("❌ Error completo al guardar:", error);
            throw new Error('No se pudo guardar en Google Sheets: ' + error.message);
        }
    }

    // Función para generar el contenido del PDF
    function generarContenidoPDF() {
        // Obtener valores directamente de los elementos del DOM
        const nConsecutivo = document.getElementById('N_CONSECUTIVO')?.value || '';
        const fechaCotizacion = document.getElementById('FECHA_COTIZACION')?.value || '';
        const empresa = document.getElementById('EMPRESA')?.value || '';
        const admision = document.getElementById('ADMISION')?.value || '';
        const nombres = document.getElementById('NOMBRES')?.value || '';
        const documento = document.getElementById('DOCUMENTO')?.value || '';
        const tipoDocumento = document.getElementById('TIPO_DOCUMENTO')?.value || '';
        const sexo = document.getElementById('SEXO')?.value || '';
        const direccion = document.getElementById('DIRECCION')?.value || '';
        const departamento = document.getElementById('DEPARTAMENTO')?.value || '';
        const ciudad = document.getElementById('CIUDAD')?.value || '';
        const telefono = document.getElementById('TELEFONO')?.value || '';
        const observacionGeneral = document.getElementById('OBSERVACION_GENERAL')?.value || '';
        const observacionAdicional = document.getElementById('OBSERVACION_ADICIONAL')?.value || '';
        
        // OBTENER AUTORIZADOR DE FORMA CORRECTA - CAMBIADO A AUTORIZADOR
        const autorizadorElement = document.getElementById('AUTORIZADOR');
        const autorizadoPor = autorizadorElement ? autorizadorElement.value : '';
        
        console.log("📝 Nombre del autorizador obtenido para PDF:", autorizadoPor);
        
        const moneda = v => new Intl.NumberFormat('es-CO', { 
            maximumFractionDigits: 0 
        }).format(v);
        
        // Manejar fecha correctamente
        let fecha = '';
        
        if (fechaCotizacion) {
            const [year, month, day] = fechaCotizacion.split('-');
            fecha = `${day}/${month}/${year}`;
        } else {
            const hoy = new Date();
            const day = String(hoy.getDate()).padStart(2, '0');
            const month = String(hoy.getMonth() + 1).padStart(2, '0');
            const year = hoy.getFullYear();
            fecha = `${day}/${month}/${year}`;
        }
        
        // Calcular totales para el PDF
        let subtotalPDF = 0;
        let descuentoTotalPDF = 0;
        const productosPDF = [];
        
        const cantidadInputs = document.querySelectorAll('.cantidad');
        const valorInputs = document.querySelectorAll('.valor-unitario');
        const porcentajeInputs = document.querySelectorAll('.porcentaje-descuento');
        const servicioInputs = document.querySelectorAll('.servicio-cotizado');
        
        for (let i = 0; i < cantidadInputs.length; i++) {
            const cantidad = parseFloat(cantidadInputs[i].value) || 0;
            const valorUnitario = parseFloat(valorInputs[i].value) || 0;
            const porcentajeDescuento = parseFloat(porcentajeInputs[i].value) || 0;
            const valorProducto = cantidad * valorUnitario;
            const descuentoProducto = valorProducto * (porcentajeDescuento / 100);
            
            productosPDF.push({
                descripcion: servicioInputs[i].value,
                cantidad: cantidad,
                valorUnitario: valorUnitario,
                porcentajeDescuento: porcentajeDescuento,
                valorProducto: valorProducto,
                descuentoProducto: descuentoProducto,
                totalProducto: valorProducto - descuentoProducto
            });
            
            subtotalPDF += valorProducto;
            descuentoTotalPDF += descuentoProducto;
        }
        
        const totalFinalPDF = subtotalPDF - descuentoTotalPDF;
        
        // Generar HTML para el PDF
        let tablaProductos = '';
        productosPDF.forEach(producto => {
            tablaProductos += `
                <tr>
                    <td style="border:1px solid #000; padding:2mm 1mm; font-size:8pt;">${producto.descripcion || ''}</td>
                    <td style="border:1px solid #000; text-align:center; padding:2mm 1mm; font-size:8pt;">${producto.cantidad}</td>
                    <td style="border:1px solid #000; text-align:right; padding:2mm 1mm; font-size:8pt;">$ ${moneda(producto.valorUnitario)}</td>
                    <td style="border:1px solid #000; text-align:right; padding:2mm 1mm; font-size:8pt;">$ ${moneda(producto.descuentoProducto)}</td>
                    <td style="border:1px solid #000; text-align:center; padding:2mm 1mm; font-size:8pt;">${producto.porcentajeDescuento}%</td>
                    <td style="border:1px solid #000; text-align:right; padding:2mm 1mm; font-size:8pt;">$ ${moneda(producto.totalProducto)}</td>
                </tr>
            `;
        });
        
        return `
            <div id="pdfContent" style="width:210mm; min-height:297mm; padding:10mm 15mm; box-sizing:border-box; font-family:Arial, sans-serif; font-size:9pt; color:#000; line-height:1.2;">
            
                <!-- CABECERA CON LOGO -->
                <table style="width:100%; border-collapse:collapse; border:1px solid #000; margin-bottom:5mm; height:25mm;">
                    <tr>
                        <td style="width:30%; border-right:1px solid #000; text-align:center; padding:2mm; vertical-align:middle;">
                            <img src="${LOGO_PATH}" style="max-width:100%; max-height:20mm; object-fit:contain;" 
                                 onerror="this.style.display='none'">
                        </td>
                        
                        <td style="width:40%; border-right:1px solid #000; padding:2mm; vertical-align:middle;">
                            <div style="text-align:center; font-size:10pt; font-weight:bold; margin-bottom:1mm;">
                                COTIZACIONES
                            </div>
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

                <!-- FECHA Y NÚMERO DE COTIZACIÓN -->
                <div style="text-align:center; font-weight:bold; font-size:9pt; margin-bottom:5mm;">
                    Fecha de Cotización: ${fecha} &nbsp;&nbsp; | &nbsp;&nbsp; N° Cotización: ${nConsecutivo}
                </div>

                <hr style="border:none; border-top:1px solid #000; margin-bottom:5mm;">

                <!-- DATOS DEL PACIENTE -->
                <table style="width:100%; font-size:8pt; margin-bottom:5mm; border-collapse:collapse;">
                    <tr>
                        <td style="width:50%; padding:0.5mm 0;"><strong>Señores:</strong> ${empresa}</td>
                        <td style="width:50%; padding:0.5mm 0;"><strong>Admisión:</strong> ${admision}</td>
                    </tr>
                    <tr>
                        <td style="padding:0.5mm 0;"><strong>Paciente:</strong> ${nombres}</td>
                        <td style="padding:0.5mm 0;">
                            <strong>CC:</strong> ${documento} &nbsp; 
                            <strong>TD:</strong> ${tipoDocumento} &nbsp; 
                            <strong>Sexo:</strong> ${sexo}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0.5mm 0;"><strong>Dirección:</strong> ${direccion}</td>
                        <td style="padding:0.5mm 0;">
                            <strong>Depto:</strong> ${departamento} &nbsp; 
                            <strong>Ciudad:</strong> ${ciudad}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0.5mm 0;"><strong>Teléfono:</strong> ${telefono}</td>
                        <td style="padding:0.5mm 0;"></td>
                    </tr>
                </table>

                <!-- TABLA DE PRODUCTOS -->
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
                        <tbody>
                            ${tablaProductos}
                        </tbody>
                    </table>
                </div>

                <!-- OBSERVACIÓN -->
                <div style="margin-bottom:5mm;">
                    <div style="font-weight:bold; margin-bottom:1mm; font-size:9pt;">Observación</div>
                    <div style="border:1px solid #000; padding:2mm; min-height:10mm; font-size:8pt;">
                        ${observacionGeneral}
                    </div>
                </div>

                <!-- TOTALES -->
                <div style="text-align:right; font-size:9pt; margin-top:5mm;">
                    <div style="margin-bottom:1mm;">Subtotal: $ ${moneda(subtotalPDF)}</div>
                    <div style="margin-bottom:1mm;">Descuento: $ ${moneda(descuentoTotalPDF)}</div>
                    <div style="font-size:10pt; font-weight:bold;">Total: $ ${moneda(totalFinalPDF)}</div>
                </div>

                <!-- FIRMA DEL AUTORIZADOR (PARTE INFERIOR IZQUIERDA) - SOLO EL NOMBRE -->
                <div style="position:absolute; bottom:20mm; left:15mm; width:70mm;">
                    <div style="text-align:center; font-size:9pt;">
                        <strong>Autorizado por:</strong><br>
                        <span style="font-size:10pt; text-transform:uppercase; font-weight:bold;">${autorizadoPor}</span>
                    </div>
                </div>

            </div>
        `;
    }

    // Función para generar PDF
    async function generarPDF() {
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        try {
            mostrarMensaje('info', '⏳ Generando PDF...');
            
            // Verificar si el autorizador está vacío
            const autorizadorElement = document.getElementById('AUTORIZADOR'); // CAMBIADO A AUTORIZADOR
            if (autorizadorElement && !autorizadorElement.value.trim()) {
                if (!confirm('⚠️ El campo "Autorizado por" está vacío. ¿Desea continuar sin el nombre del autorizador?')) {
                    autorizadorElement.focus();
                    return;
                }
            }
            
            // Crear elemento temporal
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = generarContenidoPDF();
            tempDiv.style.position = 'fixed';
            tempDiv.style.left = '-9999px';
            tempDiv.style.top = '0';
            document.body.appendChild(tempDiv);
            
            // Esperar a que el logo se cargue
            await new Promise(resolve => {
                const images = tempDiv.getElementsByTagName('img');
                if (images.length === 0) {
                    resolve();
                    return;
                }
                
                let loadedCount = 0;
                Array.from(images).forEach(img => {
                    if (img.complete) {
                        loadedCount++;
                    } else {
                        img.onload = () => {
                            loadedCount++;
                            if (loadedCount === images.length) resolve();
                        };
                        img.onerror = () => {
                            loadedCount++;
                            console.warn('Logo no se pudo cargar, continuando sin él');
                            if (loadedCount === images.length) resolve();
                        };
                    }
                });
                
                if (loadedCount === images.length) resolve();
            });
            
            // Configurar html2canvas
            const canvas = await html2canvas(tempDiv.querySelector('#pdfContent'), {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                width: 794,
                height: 1123,
                windowWidth: 794,
                windowHeight: 1123,
                allowTaint: true
            });
            
            // Remover elemento temporal
            document.body.removeChild(tempDiv);
            
            // Crear PDF
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
                compress: true
            });
            
            // Agregar imagen al PDF
            const imgWidth = 210;
            const imgHeight = 297;
            pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, imgWidth, imgHeight);
            
            // Descargar PDF
            const numero = document.getElementById('N_CONSECUTIVO').value || 'sin-numero';
            const nombreArchivo = `Cotizacion_${numero}.pdf`;
            pdf.save(nombreArchivo);
            
            mostrarMensaje('success', '✅ PDF generado exitosamente');
            
        } catch (error) {
            console.error('Error generando PDF:', error);
            mostrarMensaje('error', '❌ Error al generar PDF: ' + error.message);
        }
    }

    // Función para actualizar ciudades
    function actualizarCiudades() {
        if (!dptoSelect || !ciudadSelect) return;
        
        const dptoSeleccionado = dptoSelect.value;
        console.log("Departamento seleccionado:", dptoSeleccionado);
        
        // Limpiar ciudades actuales
        ciudadSelect.innerHTML = '';
        
        if (dptoSeleccionado && ciudadesPorDepartamento[dptoSeleccionado]) {
            ciudadSelect.disabled = false;
            
            // Agregar opción por defecto
            const defaultOption = document.createElement("option");
            defaultOption.value = "";
            defaultOption.textContent = "Seleccione una ciudad";
            ciudadSelect.appendChild(defaultOption);
            
            // Agregar ciudades del departamento
            ciudadesPorDepartamento[dptoSeleccionado].forEach(ciudad => {
                const option = document.createElement("option");
                option.value = ciudad;
                option.textContent = ciudad;
                ciudadSelect.appendChild(option);
            });
            
            console.log(`Ciudades cargadas: ${ciudadesPorDepartamento[dptoSeleccionado].length} ciudades para ${dptoSeleccionado}`);
        } else {
            ciudadSelect.disabled = true;
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "Primero elija un departamento";
            ciudadSelect.appendChild(option);
        }
    }

    // Función para mostrar mensajes
    function mostrarMensaje(tipo, mensaje) {
        if (!responseDiv) return;
        
        responseDiv.className = `response-message ${tipo}`;
        responseDiv.textContent = mensaje;
        responseDiv.style.display = 'block';
        
        setTimeout(() => {
            responseDiv.textContent = '';
            responseDiv.className = 'response-message';
            responseDiv.style.display = 'none';
        }, 5000);
    }

    // Inicializar
    calcularTotales();
    mostrarMensaje('info', 'Complete los campos obligatorios (*) para generar la cotización');

    // Verificar que el campo autorizador existe
    if (!document.getElementById('AUTORIZADOR')) {
        console.warn('⚠️ Campo AUTORIZADOR no encontrado en el HTML');
    } else {
        console.log('✅ Campo AUTORIZADOR encontrado');
    }
});

