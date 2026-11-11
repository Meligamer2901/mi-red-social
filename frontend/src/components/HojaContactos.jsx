// Hoja de contactos decorativa para las pantallas de acceso: seis cuadros que
// "se revelan" con los mismos tratamientos que la app aplica a cada foto.
// Son degradados de CSS (sin imagenes), asi no depende de ningun archivo.
const CUADROS = ["original", "miniatura", "grayscale", "sepia", "grayscale", "original"];

export default function HojaContactos() {
    return (
        <div className="hoja">
            {CUADROS.map((tipo, i) => (
                <span key={i} className={`hoja-cuadro hoja-${tipo} hoja-${i}`} />
            ))}
        </div>
    );
}
