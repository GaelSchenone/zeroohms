import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './HomePage.css'
import LedGlitchBackground from "./components/homepage/LedGlitchBackground";
import Header from "./components/homepage/Header/Header";
import Button from "./components/Button/Button";
import YoutubeCarousel from "./components/homepage/YoutubeCarousel";
import { ComputerSharp, TabletSharp, GpuSharp, CpuSharp, SettingsCog2, MemoryStickSharp } from 'pixelarticons/react'
import { FaInstagram, FaYoutube, FaWhatsapp, FaEnvelope } from 'react-icons/fa'

const EMAIL = 'contacto@zeroohms.com.ar'
const WHATSAPP = 'https://wa.me/5491124769779'

function HomePage() {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copiá el email:', EMAIL)
    }
  }

  return (
    <>
    <div className="homepage-background">
        <LedGlitchBackground
                style={{ position: "absolute", inset: 0, zIndex: 0}}
                tear={0.4}
                velocity={0.5}
                blockSize={0.3}
                bitThresh={0.18}
                density={0.4}
                pixelSize={4}
                bloom={1.55}
                dotMask={true}
                highlightColor="#F0513B"
                baseColor="#ffffff"
                bgColor="#050505"
              />
    </div>
    <div className="homepage-container">

      <Header />

        <div className="hero">

            <h1>Tu PC no necesita un milagro. <br/> Necesita <u className="subrayado-animado">servicio técnico</u>. </h1>
          
          <h3>Servicio tecnico especializado en PCs y Laptops.</h3>

          <div className="calltoaction-buttons">
            <Button text="Contáctanos" onClick={() => document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' })} color1="#F0513B" color2="#ffffff" size="l" />
            <Button text="Seguí tu reparación" onClick={() => navigate('/tracking')} color1="#ffffff" color2="#050505" size="l" />
          </div>

            
        </div>

        <div id="servicios" className="hm homepage-services">
          <div className="cards">
            <span className="service s1">
              <div className="icons"> 
                <ComputerSharp width={52} height={52} />
                <TabletSharp width={52} height={52} />

              </div>
              <h3>Reparacion de PCs y Laptops</h3>
              <p>Diagnosticamos el problema, te decimos qué pasó y cuánto sale antes de tocar nada.<br/><br/>Cambio de pantallas, teclados, baterías, puertos y más reparamos lo que se pueda salvar sin gastar de más.</p>
            </span>
            <span className="service s2">
              <div className="icons"> 
                <GpuSharp width={52} height={52} />
                <CpuSharp width={52} height={52} />

              </div>
              <h3>Armado de PCs</h3>
              <p>Armamos la PC perfecta para vos, ajustándonos a tu presupuesto y necesidades.<br/><br/>

                Elegimos todos los componentes con vos y mientras te guiamos en el proceso.</p>
            </span>
            <span className="service s3">
              <div className="icons">
                <SettingsCog2 width={52} height={52} />
                <MemoryStickSharp width={52} height={52} />

              </div>
              <h3>Mantenimiento y Actualizacion</h3>
              <p>¿Tu PC anda lenta o se sobrecalienta?
                <br/><br/>
                Vamos a la causa de tus problemas y los solucionamos: limpieza interna, pasta térmica, actualización de RAM o SSD. Le devolvemos años de vida a tu equipo.</p>
            </span>

          </div>
          <span className="aviso-servicio"><p>¿No está en la lista? Preguntanos, seguro lo resolvemos.</p></span>
      </div>

        <div id="reparaciones" className="hm homepage-reparaciones">
            <h2>Reparaciones recientes</h2>
            <YoutubeCarousel />

          </div>

        <section id="nosotros" className="hm homepage-about">
          
          <div className="about-panel">
            <h2>¿Quiénes somos?</h2>
            <p>Somos un equipo de tres técnicos en computación, que durante años cada uno fue ganando experiencia por su lado y a su manera: uno reparando consolas, otro laptops y PCs, otro armando computadoras desde cero. Todos empezamos igual, arreglando la PC de un amigo o la nuestra propia, sin pensar todavía en hacer de esto un trabajo.</p>
            <p>Fuimos aprendiendo a los golpes, probando, rompiendo cosas y volviendo a armarlas, hasta que en algún momento nos dimos cuenta de que ya no era solo un hobby: sabíamos resolver problemas de verdad, y bastante bien.</p>
            <p>A los tres nos tocó ver de cerca cómo alguien cercano pagaba de más por un arreglo que no necesitaba, o volvía de un service sin entender bien qué le habían hecho a su equipo. Vimos presupuestos inflados porque el cliente no sabía lo que estaba pagando, y equipos devueltos peor de como habían entrado.</p>
            <p>Juntamos experiencia, ganas y la idea de que arreglar algo bien no tiene que ser una experiencia rara para el que lo trae.</p>
          </div>
        </section>

        <section id="contacto" className="hm homepage-contact">
          <h2>¡Contactanos!</h2>
          <p>Escribinos por WhatsApp, Instagram o por email y te respondemos a la brevedad.</p>
          <div className="contact-actions">
            <a className="contact-button contact-button--primary" href={WHATSAPP} target="_blank" rel="noreferrer">
              <FaWhatsapp size={32} color="#ffffff" /> Escribirnos por WhatsApp
            </a>
            <a className="contact-button" href="https://ig.me/m/zeroohms__" target="_blank" rel="noreferrer">
              <FaInstagram size={32} color="#F0513B" /> Escribirnos por Instagram
            </a>
            <a className="contact-button" onClick={handleCopyEmail}>
              <FaEnvelope size={32} /> {copied ? '¡Email copiado!' : 'Copiar dirección de Email'}
            </a>
          </div>
        </section>

        <footer className="homepage-footer">
          <div className="footer-brand">
            <img src="/logos/imagotipo.svg" alt="Zero Ohms" />
            <div className="footer-socials">
              <a href={WHATSAPP} target="_blank" rel="noreferrer" aria-label="WhatsApp"><FaWhatsapp size={32} /></a>
              <a href="https://www.instagram.com/zeroohms__/" target="_blank" rel="noreferrer" aria-label="Instagram"><FaInstagram size={32} /></a>
              <a href="https://www.youtube.com/@zeroohms_tech" target="_blank" rel="noreferrer" aria-label="YouTube"><FaYoutube size={32} /></a>
            </div>
          </div>
          <nav className="footer-column">
            <strong>Navegación</strong>
            <a href="#top">Ir arriba</a>
            <a href="#servicios">Servicios</a>
            <a href="#nosotros">Nosotros</a>
            <a href="#contacto">Contacto</a>
            <a href="#reparaciones">Seguí tu reparación</a>
          </nav>
          <div className="footer-column">
            <strong>Redes sociales</strong>
            <a href={WHATSAPP} target="_blank" rel="noreferrer">WhatsApp</a>
            <a href="https://www.instagram.com/zeroohms__/" target="_blank" rel="noreferrer">Instagram</a>
            <a href="https://www.youtube.com/@zeroohms_tech" target="_blank" rel="noreferrer">Youtube</a>
          </div>
          <small>Sitio desarrollado por <a href="https://sashagala.com.ar" target="_blank" rel="noreferrer">sashagala studio</a></small>
        </footer>

    </div>
    
    
    </>
  )
}

export default HomePage
