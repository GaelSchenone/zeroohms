import './HomePage.css'
import LedGlitchBackground from "./components/homepage/LedGlitchBackground";
import Header from "./components/homepage/Header/Header";
import Button from "./components/Button/Button";
import { ComputerSharp, TabletSharp, GpuSharp, CpuSharp, SettingsCog, MemoryStickSharp } from 'pixelarticons/react'

function HomePage() {

  return (
    <>
    <div className="homepage-container">

      <Header />
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
                  /></div>

      <div className="hero">

          <h1>Tu PC no necesita un milagro. <br/> Necesita <u className="subrayado-animado">servicio técnico</u>. </h1>
        
        <h2>Servicio tecnico especializado en PCs y Laptops.</h2>

        <div className="calltoaction-buttons">
          <Button text="Contáctanos" onClick={() => {}} color1="#F0513B" color2="#ffffff" size="l" />
          <Button text="Seguí tu reparación" onClick={() => {}} color1="#ffffff" color2="#050505" size="l" />
        </div>

        <div className="hero-icons">
          <ComputerSharp width={32} height={32} />
          <TabletSharp width={32} height={32} />
          <GpuSharp width={32} height={32} />
          <CpuSharp width={32} height={32} />
          <SettingsCog width={32} height={32} />
          <MemoryStickSharp width={32} height={32} />
        </div>
          
      </div>
      

    </div>
    
    
    </>
  )
}

export default HomePage
