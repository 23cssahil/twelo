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

      {/* Mission & Safety Section */}
      <section style={{ padding: '80px 20px', background: 'rgba(5,5,5,1)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '60px' }}>
          
          <div>
            <h3 style={{ fontSize: '2.5rem', marginBottom: '20px', color: '#0095f6' }}>Our Mission</h3>
            <p style={{ fontSize: '1.1rem', color: '#a8a8a8', lineHeight: '1.8' }}>
              At Twelo, we believe that the world becomes a smaller, friendlier place when people from diverse backgrounds can communicate without barriers. Our mission is to foster a global community where individuals can freely express themselves, share ideas, and build meaningful connections. By breaking down geographical limitations and prioritizing anonymity, we empower users to be their authentic selves. Whether you're looking to practice a new language, discuss your favorite hobbies, or simply have a lighthearted conversation after a long day, Twelo provides the perfect virtual environment.
            </p>
          </div>

          <div>
            <h3 style={{ fontSize: '2.5rem', marginBottom: '20px', color: '#2bd856' }}>Commitment to Safety & Privacy</h3>
            <p style={{ fontSize: '1.1rem', color: '#a8a8a8', lineHeight: '1.8' }}>
              We understand that interacting on the internet requires a high degree of trust. That's why your privacy and safety are at the core of Twelo's architecture. Unlike traditional social media platforms, we do not require you to link your phone number, share your location, or upload personal photos to chat with strangers. Our robust backend infrastructure ensures that your data is handled securely and responsibly. Furthermore, we provide you with the tools to block and report inappropriate behavior instantly, ensuring that our community remains a respectful and positive space for everyone involved.
            </p>
          </div>

        </div>
      </section>

      {/* FAQ Section */}
      <section style={{ padding: '80px 20px', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h3 style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '50px' }}>Frequently Asked Questions</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '25px', borderRadius: '15px' }}>
              <h5 style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#fff' }}>Is Twelo completely free to use?</h5>
              <p style={{ color: '#a8a8a8', margin: 0, lineHeight: '1.6' }}>Yes, the core features of Twelo, including finding random matches and chatting, are entirely free. We also offer a reward system where you can earn coins just by being active on the platform.</p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '25px', borderRadius: '15px' }}>
              <h5 style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#fff' }}>How does the random chat matching work?</h5>
              <p style={{ color: '#a8a8a8', margin: 0, lineHeight: '1.6' }}>When you click the globe icon, our algorithm connects you with another available user in real-time. The matching is completely random, giving you the chance to meet people from completely different walks of life.</p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '25px', borderRadius: '15px' }}>
              <h5 style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#fff' }}>Can I add someone as a friend after a random chat?</h5>
              <p style={{ color: '#a8a8a8', margin: 0, lineHeight: '1.6' }}>Absolutely! If you enjoy a conversation with a stranger, you can view their public profile and send them a follow request. Once accepted, you can chat with them anytime from your connections list.</p>
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '25px', borderRadius: '15px' }}>
              <h5 style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#fff' }}>What should I do if someone is being inappropriate?</h5>
              <p style={{ color: '#a8a8a8', margin: 0, lineHeight: '1.6' }}>We have zero tolerance for abuse. If you encounter any inappropriate behavior, you can immediately use the "Report" button located in the chat header. Our moderation team reviews these reports promptly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Educational Guide Section for AdSense Value */}
      <section style={{ padding: '80px 20px', background: 'rgba(5,5,5,1)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h3 style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '20px', color: '#00c6ff' }}>Essential Guide: Tips for Safe Online Chatting</h3>
          <p style={{ textAlign: 'center', fontSize: '1.1rem', color: '#a8a8a8', marginBottom: '50px', maxWidth: '700px', margin: '0 auto 50px' }}>
            While making new friends online is an exciting experience, it's crucial to stay informed about digital safety. Here are our top expert recommendations for ensuring your online interactions remain secure and enjoyable.
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '30px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ fontSize: '1.3rem', marginBottom: '15px', color: '#fff' }}>1. Protect Personal Information</h4>
              <p style={{ color: '#a8a8a8', lineHeight: '1.6' }}>Never share sensitive personal data such as your home address, financial details, or passwords with strangers. Even in anonymous chats, maintaining a strict boundary regarding personal identifiable information (PII) is your best defense against identity theft and digital fraud.</p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '30px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ fontSize: '1.3rem', marginBottom: '15px', color: '#fff' }}>2. Trust Your Instincts</h4>
              <p style={{ color: '#a8a8a8', lineHeight: '1.6' }}>If a conversation makes you feel uncomfortable or a user behaves aggressively, trust your gut feeling. Disconnect immediately. You are never obligated to continue a chat that violates your personal boundaries or makes you feel unsafe.</p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '30px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ fontSize: '1.3rem', marginBottom: '15px', color: '#fff' }}>3. Beware of External Links</h4>
              <p style={{ color: '#a8a8a8', lineHeight: '1.6' }}>Exercise extreme caution before clicking on links sent by unfamiliar users. Malicious links can lead to phishing websites designed to steal your credentials or download malware onto your device. When in doubt, simply ignore the link.</p>
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '30px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ fontSize: '1.3rem', marginBottom: '15px', color: '#fff' }}>4. Utilize Moderation Tools</h4>
              <p style={{ color: '#a8a8a8', lineHeight: '1.6' }}>Familiarize yourself with the platform's reporting and blocking features. By actively reporting toxic behavior or spam, you not only protect yourself but also help maintain a healthy, welcoming community for everyone else.</p>
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
