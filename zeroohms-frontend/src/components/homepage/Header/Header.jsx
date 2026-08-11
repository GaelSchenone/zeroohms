import './Header.css'

export default function Header() {
  return (
    <header id="top" className="homepage-header">
        <div className="logo">
          <img src="/logos/imagotipo.svg" alt="Imagotipo" />
        </div>
        <div className="nav">
            <a href="#servicios">Servicios</a>
            <a href="#reparaciones">Reparaciones</a>
            <a href="#nosotros">Nosotros</a>
            <a href="#contacto">Contacto</a>

        </div>
            
    </header>
  );
}   
