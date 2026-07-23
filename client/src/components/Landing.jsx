import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Shield, Globe, Gift, ArrowRight } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{ backgroundColor: '#050505', color: '#fff', minHeight: '100vh', fontFamily: 'var(--font-sans)', overflowX: 'hidden' }}>
      
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'sticky', top: 0, background: 'rgba(5,5,5,0.8)', backdropFilter: 'blur(10px)', zIndex: 100 }}>
        <h1 className="gradient-text" style={{ fontSize: '2rem', margin: 0, cursor: 'pointer' }}>Twelo</h1>
        <button 
          onClick={() => navigate('/login')}
          style={{ padding: '10px 24px', background: '#0095f6', border: 'none', borderRadius: '30px', color: '#fff', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', transition: 'background 0.3s' }}
        >
          Login
        </button>
      </header>

      {/* Hero Section */}
      <section style={{ padding: '80px 20px', textAlign: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(0,149,246,0.15) 0%, rgba(0,0,0,0) 70%)', zIndex: 0, pointerEvents: 'none' }}></div>
        
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '3.5rem', fontWeight: '800', marginBottom: '20px', lineHeight: '1.2' }}>
            Connect with the Universe <br />
            <span className="gradient-text">Anonymously</span>
          </h2>
          <p style={{ fontSize: '1.2rem', color: '#a8a8a8', marginBottom: '40px', lineHeight: '1.6' }}>
            Twelo is a secure, anonymous chatting platform where you can meet new people globally. Express yourself freely, make friends, and earn rewards while chatting.
          </p>
          <button 
            onClick={() => navigate('/login')}
            style={{ padding: '16px 40px', background: 'linear-gradient(45deg, #0095f6, #00c6ff)', border: 'none', borderRadius: '30px', color: '#fff', fontWeight: 'bold', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', margin: '0 auto', boxShadow: '0 8px 32px rgba(0, 149, 246, 0.4)' }}
          >
            Get Started <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section style={{ padding: '80px 20px', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h3 style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '60px' }}>Why Choose Twelo?</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' }}>
            
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '40px 30px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
              <div style={{ width: '60px', height: '60px', background: 'rgba(0,149,246,0.1)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 20px', color: '#0095f6' }}>
                <Shield size={30} />
              </div>
              <h4 style={{ fontSize: '1.5rem', marginBottom: '15px' }}>100% Anonymous</h4>
              <p style={{ color: '#a8a8a8', lineHeight: '1.6' }}>We prioritize your privacy. Chat securely without revealing your real identity. Your conversations are completely private and protected.</p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '40px 30px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
              <div style={{ width: '60px', height: '60px', background: 'rgba(43,216,86,0.1)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 20px', color: '#2bd856' }}>
                <Globe size={30} />
              </div>
              <h4 style={{ fontSize: '1.5rem', marginBottom: '15px' }}>Global Network</h4>
              <p style={{ color: '#a8a8a8', lineHeight: '1.6' }}>Meet interesting people from all over the world. Break boundaries and learn about different cultures through seamless chat.</p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '40px 30px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
              <div style={{ width: '60px', height: '60px', background: 'rgba(255,215,0,0.1)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 20px', color: '#FFD700' }}>
                <Gift size={30} />
              </div>
              <h4 style={{ fontSize: '1.5rem', marginBottom: '15px' }}>Earn Rewards</h4>
              <p style={{ color: '#a8a8a8', lineHeight: '1.6' }}>Engage with the platform and earn virtual coins. Use your coins to send friend requests, use advanced filters, and more.</p>
            </div>

          </div>
        </div>
      </section>

      {/* How it Works */}
      <section style={{ padding: '80px 20px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h3 style={{ fontSize: '2.5rem', marginBottom: '20px' }}>How It Works</h3>
          <p style={{ fontSize: '1.1rem', color: '#a8a8a8', marginBottom: '50px' }}>Start connecting with people in three simple steps.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', background: 'rgba(255,255,255,0.03)', padding: '30px', borderRadius: '15px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0095f6' }}>1</div>
              <div>
                <h5 style={{ fontSize: '1.3rem', marginBottom: '10px' }}>Create an Account</h5>
                <p style={{ color: '#a8a8a8', margin: 0 }}>Sign in securely using your Google account. It only takes a few seconds to get started.</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', background: 'rgba(255,255,255,0.03)', padding: '30px', borderRadius: '15px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0095f6' }}>2</div>
              <div>
                <h5 style={{ fontSize: '1.3rem', marginBottom: '10px' }}>Find a Match</h5>
                <p style={{ color: '#a8a8a8', margin: 0 }}>Click on the space globe and wait while our intelligent matching system finds you a random partner.</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', background: 'rgba(255,255,255,0.03)', padding: '30px', borderRadius: '15px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0095f6' }}>3</div>
              <div>
                <h5 style={{ fontSize: '1.3rem', marginBottom: '10px' }}>Start Chatting</h5>
                <p style={{ color: '#a8a8a8', margin: 0 }}>Send messages, share voice notes, and add interesting people to your friends list.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '60px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', background: '#020202' }}>
        <h2 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '20px' }}>Twelo</h2>
        <p style={{ color: '#888', marginBottom: '30px' }}>Powered by NexGenRewards</p>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap', marginBottom: '40px' }}>
          <span onClick={() => { window.scrollTo(0,0); navigate('/about-us'); }} style={{ color: '#fff', cursor: 'pointer', fontSize: '1rem' }}>About Us</span>
          <span onClick={() => { window.scrollTo(0,0); navigate('/contact-us'); }} style={{ color: '#fff', cursor: 'pointer', fontSize: '1rem' }}>Contact Us</span>
          <span onClick={() => { window.scrollTo(0,0); navigate('/privacy-policy'); }} style={{ color: '#fff', cursor: 'pointer', fontSize: '1rem' }}>Privacy Policy</span>
          <span onClick={() => { window.scrollTo(0,0); navigate('/terms'); }} style={{ color: '#fff', cursor: 'pointer', fontSize: '1rem' }}>Terms & Conditions</span>
        </div>
        
        <p style={{ color: '#555', fontSize: '0.9rem', margin: 0 }}>&copy; {new Date().getFullYear()} Twelo. All rights reserved.</p>
      </footer>

    </div>
  );
}
