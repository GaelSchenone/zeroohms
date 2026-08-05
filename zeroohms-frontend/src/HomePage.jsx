import './HomePage.css'
import LedGlitchBackground from "./components/homepage/LedGlitchBackground";

function HomePage() {

  return (
    <>
    <div className="homepage-background">
      <LedGlitchBackground
              style={{ position: "absolute", inset: 0, zIndex: 0 }}
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

          <p>cachufleta</p>

    </div>
    
    </>
  )
}

export default HomePage
