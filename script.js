const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzLXNy7NpRPLKKmx9OX4nmIBDKppmTbTjnh3nU734EprJNVZgT-YamnAjsDsKJVco_dAQ/exec';
const { jsPDF } = window.jspdf;

// Ruta del logo - AJUSTA ESTA RUTA SEGÚN TU ARCHIVO
const LOGO_PATH = 'logo.jpg';

const ciudadesPorDepartamento = {
    "Cesar": ["Bosconia", "Valledupar", "Aguachica", "Codazzi", "La Paz", "Curumaní"],
    "Antioquia": ["Medellín", "Envigado", "Itagüí", "Rionegro", "Apartadó"],
    "Atlántico": ["Barranquilla", "Soledad", "Puerto Colombia", "Malambo"],
    "Bogotá": ["Bogotá D.C."],
    "Bolívar": ["Cartagena", "Magangué", "Turbaco"],
    "Cundinamarca": ["Soacha", "Chía", "Zipaquirá", "Facatativá"],
    "Valle del Cauca": ["Cali", "Buenaventura", "Palmira", "Tuluá"],
    "Santander": ["Bucaramanga", "Floridablanca", "Girón", "Barrancabermeja"],
    "Magdalena": ["Santa Marta", "Ciénaga", "Fundación"],
    "La Guajira": ["Riohacha", "Maicao", "Uribia"]
};

document.addEventListener('DOMContentLoaded', function() {
    // Elementos DOM
    const form = document.getElementById('cotizacionForm');
    const vaciarBtn = document.getElementById('vaciarFormulario');
    const guardarImprimirBtn = document.getElementById('guardarImprimirBtn');
    const imprimirBtn = document.getElementById('imprimirBtn');
    const descargarPdfBtn = document.getElementById('descargarPdfBtn');
    const agregarProductoBtn = document.getElementById('agregarProductoBtn');
    const productosContainer = document.getElementById('productosContainer');
    const responseDiv = document.getElementById('responseMessage');
    const dptoSelect = document.getElementById('DEPARTAMENTO');
    const ciudadSelect = document.getElementById('CIUDAD');
    
    // Elementos de totales
    const subtotalElement = document.getElementById('subtotal');
    const descuentoTotalElement = document.getElementById('descuento-total');
    const totalFinalElement = document.getElementById('total-final');

    // Configurar fecha actual
    const today = new Date();
    document.getElementById('FECHA_COTIZACION').value = today.toISOString().split('T')[0];

    // Valores por defecto
    document.getElementById('TIPO_DOCUMENTO').value = 'CC';
    document.getElementById('SEXO').value = 'M';

    // Event listeners
    vaciarBtn.addEventListener('click', vaciarFormulario);
    guardarImprimirBtn.addEventListener('click', guardarYCrearPDF);
    imprimirBtn.addEventListener('click', imprimirCotizacion);
    descargarPdfBtn.addEventListener('click', generarPDF);
    agregarProductoBtn.addEventListener('click', agregarProducto);
    if(dptoSelect) dptoSelect.addEventListener('change', actualizarCiudades);

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
                        <input type="number" class="valor-unitario" name="VALOR[]" min="0" step="1000" required 
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
                input.id = input.id.replace(/\d+$/, index);
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
            ciudadSelect.innerHTML = '<option value="">Elija un departamento</option>';
            ciudadSelect.disabled = true;
            document.getElementById('CIUDAD').disabled = true;
            document.getElementById('FECHA_COTIZACION').value = today.toISOString().split('T')[0];
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
        imprimirBtn.disabled = !habilitar;
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

    // Función para guardar en Google Sheets - INCLUYE OBSERVACIÓN ADICIONAL
    async function guardarEnGoogleSheets() {
        const productos = [];
        const productoElements = document.querySelectorAll('.producto-item');
        
        productoElements.forEach((producto, index) => {
            productos.push({
                SERVICIO_COTIZADO: producto.querySelector('.servicio-cotizado').value,
                CANTIDAD: producto.querySelector('.cantidad').value,
                VALOR: producto.querySelector('.valor-unitario').value,
                PORCENTAJE_DESCUENTO: producto.querySelector('.porcentaje-descuento').value
            });
        });
        
        // Obtener todos los valores de productos para concatenar
        let serviciosConcatenados = '';
        let valoresConcatenados = '';
        
        productoElements.forEach((producto, index) => {
            const servicio = producto.querySelector('.servicio-cotizado').value;
            const valor = producto.querySelector('.valor-unitario').value;
            
            if (index > 0) {
                serviciosConcatenados += ' | ';
                valoresConcatenados += ' | ';
            }
            serviciosConcatenados += servicio;
            valoresConcatenados += valor;
        });
        
        const datosParaEnviar = {
            N_CONSECUTIVO: document.getElementById('N_CONSECUTIVO').value,
            FECHA_COTIZACION: document.getElementById('FECHA_COTIZACION').value,
            TIPO_DOCUMENTO: document.getElementById('TIPO_DOCUMENTO').value,
            DOCUMENTO: document.getElementById('DOCUMENTO').value,
            NOMBRES: document.getElementById('NOMBRES').value,
            EMPRESA: document.getElementById('EMPRESA').value,
            ESPECIALIDAD: document.getElementById('ESPECIALIDAD').value,
            SERVICIO_COTIZADO: serviciosConcatenados, // Concatenado de todos los servicios
            VALOR: valoresConcatenados, // Concatenado de todos los valores
            OBSERVACION_ADICIONAL: document.getElementById('OBSERVACION_ADICIONAL').value,
            PRODUCTOS_JSON: JSON.stringify(productos), // JSON completo por si lo necesitas
            OBSERVACION_GENERAL: document.getElementById('OBSERVACION_GENERAL').value,
            FECHA_REGISTRO: new Date().toISOString()
        };

        try {
            const params = new URLSearchParams();
            Object.keys(datosParaEnviar).forEach(key => {
                params.append(key, datosParaEnviar[key]);
            });

            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params.toString()
            });

            if (!response.ok) throw new Error('Error en la respuesta del servidor');
            return true;
            
        } catch (error) {
            throw new Error('No se pudo guardar en Google Sheets: ' + error.message);
        }
    }

    // Función para generar el HTML del PDF - NO INCLUYE OBSERVACIÓN ADICIONAL
    function generarContenidoPDF() {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        const moneda = v => new Intl.NumberFormat('es-CO', { 
            maximumFractionDigits: 0 
        }).format(v);
        
        const fecha = new Date(data.FECHA_COTIZACION).toLocaleDateString('es-CO');
        
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
        
        // Generar HTML para el PDF CON DISEÑO EXACTO COMO LA IMAGEN
        let tablaProductos = '';
        productosPDF.forEach(producto => {
            tablaProductos += `
                <tr>
                    <td style="border:1px solid #000; padding:3mm 2mm;">${producto.descripcion || ''}</td>
                    <td style="border:1px solid #000; text-align:center; padding:3mm 2mm;">${producto.cantidad}</td>
                    <td style="border:1px solid #000; text-align:right; padding:3mm 2mm;">$ ${moneda(producto.valorUnitario)}</td>
                    <td style="border:1px solid #000; text-align:right; padding:3mm 2mm;">$ ${moneda(producto.descuentoProducto)}</td>
                    <td style="border:1px solid #000; text-align:center; padding:3mm 2mm;">${producto.porcentajeDescuento}%</td>
                    <td style="border:1px solid #000; text-align:right; padding:3mm 2mm;">$ ${moneda(producto.totalProducto)}</td>
                </tr>
            `;
        });
        
        return `
            <div id="pdfContent" style="width:210mm; min-height:297mm; padding:15mm 20mm; box-sizing:border-box; font-family:Arial, sans-serif; font-size:9pt; color:#000; line-height:1.2;">
            
                <!-- CABECERA CON LOGO - DISEÑO EXACTO COMO LA IMAGEN -->
                <table style="width:100%; border-collapse:collapse; border:1px solid #000; margin-bottom:10mm;">
                    <tr>
                        <!-- LOGO IZQUIERDA -->
                        <td style="width:30%; border-right:1px solid #000; text-align:center; padding:5mm; vertical-align:middle;">
                            <img src="${LOGO_PATH}" style="max-width:100%; max-height:40mm; object-fit:contain;" 
                                 onerror="this.style.display='none'">
                        </td>
                        
                        <!-- TEXTO CENTRAL -->
                        <td style="width:40%; border-right:1px solid #000; padding:5mm; vertical-align:middle;">
                            <div style="text-align:center; font-size:12pt; font-weight:bold; margin-bottom:3mm;">
                                COTIZACIONES
                            </div>
                            <div style="text-align:center; font-size:9pt; line-height:1.3;">
                                CLINICA REGIONAL DE ESPECIALISTAS SINAIS VITAIS S.A.S<br>
                                NIT. 900498069-1<br>
                                CALLE 18 # 16 - 09 BOSCONIA CESAR<br>
                                Teléfono: 5781068
                            </div>
                        </td>
                        
                        <!-- DATOS DERECHA -->
                        <td style="width:30%; padding:5mm; vertical-align:top; font-size:8pt;">
                            <table style="width:100%;">
                                <tr>
                                    <td><strong>Código:</strong></td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td><strong>Versión:</strong></td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td><strong>Fecha:</strong></td>
                                    <td>${fecha}</td>
                                </tr>
                                <tr>
                                    <td><strong>Página:</strong></td>
                                    <td>1 de 1</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>

                <!-- FECHA Y NÚMERO DE COTIZACIÓN -->
                <div style="text-align:center; font-weight:bold; font-size:10pt; margin-bottom:8mm;">
                    Fecha de Cotización: ${fecha} &nbsp;&nbsp; | &nbsp;&nbsp; N° Cotización: ${data.N_CONSECUTIVO || ''}
                </div>

                <hr style="border:none; border-top:1px solid #000; margin-bottom:8mm;">

                <!-- DATOS DEL PACIENTE -->
                <table style="width:100%; font-size:9pt; margin-bottom:10mm; border-collapse:collapse;">
                <tr>
                    <td style="width:50%; padding:1mm 0;"><strong>Señores:</strong> ${data.EMPRESA || ''}</td>
                    <td style="width:50%; padding:1mm 0;"><strong>Admisión:</strong> ${data.ADMISION || ''}</td>
                </tr>
                <tr>
                    <td style="padding:1mm 0;"><strong>Paciente:</strong> ${data.NOMBRES || ''}</td>
                    <td style="padding:1mm 0;">
                        <strong>CC:</strong> ${data.DOCUMENTO || ''} &nbsp; 
                        <strong>TD:</strong> ${data.TIPO_DOCUMENTO || ''} &nbsp; 
                        <strong>Sexo:</strong> ${data.SEXO || ''}
                    </td>
                </tr>
                <tr>
                    <td style="padding:1mm 0;"><strong>Dirección:</strong> ${data.DIRECCION || ''}</td>
                    <td style="padding:1mm 0;">
                        <strong>Depto:</strong> ${data.DEPARTAMENTO || ''} &nbsp; 
                        <strong>Ciudad:</strong> ${data.CIUDAD || ''}
                    </td>
                </tr>
                <tr>
                    <td style="padding:1mm 0;"><strong>Teléfono:</strong> ${data.TELEFONO || ''}</td>
                    <td style="padding:1mm 0;"></td>
                </tr>
                </table>

                <!-- TABLA DE PRODUCTOS -->
                <table style="width:100%; border-collapse:collapse; font-size:9pt; margin-bottom:10mm;">
                <thead>
                <tr style="background:#f0f0f0;">
                    <th style="border:1px solid #000; padding:3mm 2mm;">Descripción</th>
                    <th style="border:1px solid #000; padding:3mm 2mm; width:10%;">Cantidad</th>
                    <th style="border:1px solid #000; padding:3mm 2mm; width:15%;">Vr. Unitario</th>
                    <th style="border:1px solid #000; padding:3mm 2mm; width:10%;">Vr. Desc</th>
                    <th style="border:1px solid #000; padding:3mm 2mm; width:8%;">% Desc</th>
                    <th style="border:1px solid #000; padding:3mm 2mm; width:12%;">Vr. Total</th>
                </tr>
                </thead>
                <tbody>
                ${tablaProductos}
                </tbody>
                </table>

                <!-- OBSERVACIÓN (SOLO LA GENERAL, NO LA ADICIONAL) -->
                <div style="margin-bottom:10mm;">
                    <div style="font-weight:bold; margin-bottom:2mm; font-size:10pt;">Observación</div>
                    <div style="border:1px solid #000; padding:4mm; min-height:20mm;">
                        ${data.OBSERVACION_GENERAL || ''}
                    </div>
                </div>

                <!-- TOTALES -->
                <div style="text-align:right; font-size:10pt; margin-top:10mm;">
                    <div style="margin-bottom:2mm;">Subtotal: $ ${moneda(subtotalPDF)}</div>
                    <div style="margin-bottom:2mm;">Descuento: $ ${moneda(descuentoTotalPDF)}</div>
                    <div style="font-size:12pt; font-weight:bold;">Total: $ ${moneda(totalFinalPDF)}</div>
                </div>
                </div>

                <div style="margin-top: 25mm;">
                    <div style="width: 250px; border-top: 1px solid #000; padding-top: 2mm; text-align: center;">
                        <strong style="font-size: 9pt;">Autorizado por:</strong><br>
                        <span style="font-size: 10pt; text-transform: uppercase;">${data.AUTORIZADO_POR || '_________________________'}</span>
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

    // Función para imprimir directamente
    function imprimirCotizacion() {
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const printWindow = window.open('', '_blank');
        const contenidoPDF = generarContenidoPDF();
        
        const printContent = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Cotización ${document.getElementById('N_CONSECUTIVO').value}</title>
                <style>
                    @media print {
                        @page {
                            size: A4;
                            margin: 15mm;
                        }
                        body {
                            font-family: Arial, sans-serif;
                            font-size: 11pt;
                            line-height: 1.3;
                            margin: 0;
                            padding: 0;
                        }
                    }
                </style>
            </head>
            <body>
                ${contenidoPDF}
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() {
                            window.close();
                        }, 1000);
                    };
                </script>
            </body>
            </html>
        `;
        
        printWindow.document.write(printContent);
        printWindow.document.close();
    }

    // Función para mostrar mensajes
    function mostrarMensaje(tipo, mensaje) {
        responseDiv.className = `response-message ${tipo}`;
        responseDiv.textContent = mensaje;
        
        setTimeout(() => {
            responseDiv.textContent = '';
            responseDiv.className = 'response-message';
        }, 5000);
    }
    function actualizarCiudades() {
        const dptoSeleccionado = dptoSelect.value;
        console.log("Departamento detectado:", dptoSeleccionado);

        // Limpiar ciudades actuales
        ciudadSelect.innerHTML = '';
        
        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = dptoSeleccionado ? "Seleccione una ciudad..." : "Primero elija un departamento";
        ciudadSelect.appendChild(defaultOption);

        if (dptoSeleccionado && ciudadesPorDepartamento[dptoSeleccionado]) {
            ciudadSelect.disabled = false;
            ciudadesPorDepartamento[dptoSeleccionado].forEach(ciudad => {
                const option = document.createElement("option");
                option.value = ciudad;
                option.textContent = ciudad;
                ciudadSelect.appendChild(option);
            });
            console.log("Ciudades cargadas para:", dptoSeleccionado);
        } else {
            ciudadSelect.disabled = true;
            ciudadSelect.innerHTML = '<option value="">Elija un departamento</option>';
        }
    }

    // Inicializar
    calcularTotales();
    mostrarMensaje('info', 'Complete los campos obligatorios (*) para generar la cotización');

});





