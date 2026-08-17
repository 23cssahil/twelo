import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Shield, Globe, Gift, ArrowRight, Users, Zap, Heart, BookOpen } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  // Load AdSense only on this content page
  useEffect(() => {
    document.title = 'Twelo - Anonymous Chat Platform | Meet New People Globally';
    
    // Set meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = 'Twelo is a secure anonymous chatting platform where you can meet new people from around the world. Chat freely, make friends, earn rewards, and enjoy safe online conversations.';


  }, []);

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

      {/* Blog / Articles Section - High Value Content for AdSense */}
      <section style={{ padding: '80px 20px', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(0,149,246,0.1)', padding: '8px 20px', borderRadius: '30px', color: '#0095f6', fontSize: '0.9rem', fontWeight: '600', marginBottom: '20px' }}>
              <BookOpen size={16} /> Latest Insights
            </span>
            <h3 style={{ fontSize: '2.5rem', marginBottom: '15px' }}>From Our Blog</h3>
            <p style={{ color: '#a8a8a8', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>Expert insights on digital communication, online safety, and the future of social interaction.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
            
            <article style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ height: '180px', background: 'linear-gradient(135deg, #0095f6 0%, #00c6ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={60} color="rgba(255,255,255,0.3)" />
              </div>
              <div style={{ padding: '25px' }}>
                <span style={{ fontSize: '0.8rem', color: '#0095f6', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Digital Safety</span>
                <h4 style={{ fontSize: '1.3rem', marginTop: '10px', marginBottom: '15px', lineHeight: '1.4' }}>The Complete Guide to Staying Safe While Chatting Online in 2026</h4>
                <p style={{ color: '#a8a8a8', lineHeight: '1.7', fontSize: '0.95rem' }}>
                  The internet has revolutionized how we communicate. With over 4.9 billion internet users worldwide, online chatting has become a primary mode of social interaction. However, this convenience comes with unique challenges. Cybersecurity experts recommend following the principle of "minimum necessary disclosure" — sharing only information that is absolutely essential for the conversation. This means avoiding revealing your full name, home address, workplace, or daily routine to people you've just met online. Additionally, using platforms that prioritize encryption and anonymity, like Twelo, adds an extra layer of protection. Always verify the identity of people you interact with before moving conversations to other platforms, and never feel pressured to share personal details.
                </p>
              </div>
            </article>

            <article style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ height: '180px', background: 'linear-gradient(135deg, #2bd856 0%, #a8e063 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Globe size={60} color="rgba(255,255,255,0.3)" />
              </div>
              <div style={{ padding: '25px' }}>
                <span style={{ fontSize: '0.8rem', color: '#2bd856', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Cross-Cultural Communication</span>
                <h4 style={{ fontSize: '1.3rem', marginTop: '10px', marginBottom: '15px', lineHeight: '1.4' }}>How Anonymous Chat Platforms Are Breaking Cultural Barriers Worldwide</h4>
                <p style={{ color: '#a8a8a8', lineHeight: '1.7', fontSize: '0.95rem' }}>
                  In a world that is increasingly connected yet paradoxically divided, anonymous chat platforms are emerging as powerful tools for cross-cultural understanding. When you remove the visual biases of race, nationality, and appearance, conversations become more genuine and empathetic. Research from the University of Oxford has shown that anonymous interactions can reduce social prejudice by up to 40%. Platforms like Twelo enable users from 190+ countries to have meaningful conversations without preconceived notions. Whether you're a student in Tokyo connecting with an artist in São Paulo, or a professional in Lagos exchanging ideas with someone in Berlin, anonymous chat creates a level playing field where ideas matter more than identity.
                </p>
              </div>
            </article>

            <article style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ height: '180px', background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Heart size={60} color="rgba(255,255,255,0.3)" />
              </div>
              <div style={{ padding: '25px' }}>
                <span style={{ fontSize: '0.8rem', color: '#FFD700', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Mental Wellness</span>
                <h4 style={{ fontSize: '1.3rem', marginTop: '10px', marginBottom: '15px', lineHeight: '1.4' }}>The Psychology Behind Anonymous Conversations and Mental Health Benefits</h4>
                <p style={{ color: '#a8a8a8', lineHeight: '1.7', fontSize: '0.95rem' }}>
                  Psychologists have long recognized the therapeutic value of anonymous expression. The concept of the "online disinhibition effect," first described by psychologist John Suler, explains why people tend to be more open and honest in anonymous settings. This openness can be incredibly beneficial for mental health. Many users find that talking to a stranger about their day, their struggles, or their dreams provides a sense of relief similar to journaling. Unlike social media, where the pressure to maintain a curated image can increase anxiety, anonymous platforms allow for authentic self-expression. Studies published in the Journal of Social and Clinical Psychology suggest that anonymous peer support can complement professional mental health treatment, offering a judgement-free space for emotional processing.
                </p>
              </div>
            </article>

          </div>
        </div>
      </section>

      {/* Statistics / Social Proof Section */}
      <section style={{ padding: '60px 20px', background: 'rgba(5,5,5,1)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '30px', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '3rem', fontWeight: '800', color: '#0095f6' }}>190+</div>
            <p style={{ color: '#a8a8a8', marginTop: '5px' }}>Countries Connected</p>
          </div>
          <div>
            <div style={{ fontSize: '3rem', fontWeight: '800', color: '#2bd856' }}>100%</div>
            <p style={{ color: '#a8a8a8', marginTop: '5px' }}>Anonymous & Secure</p>
          </div>
          <div>
            <div style={{ fontSize: '3rem', fontWeight: '800', color: '#FFD700' }}>24/7</div>
            <p style={{ color: '#a8a8a8', marginTop: '5px' }}>Active Community</p>
          </div>
          <div>
            <div style={{ fontSize: '3rem', fontWeight: '800', color: '#ff6b6b' }}>0</div>
            <p style={{ color: '#a8a8a8', marginTop: '5px' }}>Personal Data Required</p>
          </div>
        </div>
      </section>

      {/* Detailed Feature Deep-Dive */}
      <section style={{ padding: '80px 20px', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '2.5rem', marginBottom: '20px', textAlign: 'center' }}>Platform Features In Depth</h3>
          <p style={{ textAlign: 'center', color: '#a8a8a8', marginBottom: '50px', fontSize: '1.1rem' }}>Discover the powerful features that make Twelo the preferred choice for anonymous social interaction.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            <div style={{ display: 'flex', gap: '25px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ width: '50px', height: '50px', minWidth: '50px', background: 'rgba(0,149,246,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0095f6' }}>
                <Zap size={24} />
              </div>
              <div style={{ flex: 1, minWidth: '250px' }}>
                <h4 style={{ fontSize: '1.3rem', marginBottom: '10px' }}>Instant Random Matching</h4>
                <p style={{ color: '#a8a8a8', lineHeight: '1.7' }}>
                  Our proprietary matching algorithm connects you with a random user in under 3 seconds. Unlike other platforms that use basic queue systems, Twelo's matching engine considers multiple factors including user activity patterns and connection history to ensure you get fresh, engaging conversations every time. The matching system uses a WebSocket-based real-time queue that provides instant connections without any page reloads or waiting screens.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '25px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ width: '50px', height: '50px', minWidth: '50px', background: 'rgba(43,216,86,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2bd856' }}>
                <Users size={24} />
              </div>
              <div style={{ flex: 1, minWidth: '250px' }}>
                <h4 style={{ fontSize: '1.3rem', marginBottom: '10px' }}>Smart Connection System</h4>
                <p style={{ color: '#a8a8a8', lineHeight: '1.7' }}>
                  When you find someone interesting during a random chat, you can seamlessly transition from an anonymous conversation to a lasting friendship. Our connection system allows you to send follow requests, and once mutually accepted, you can chat privately anytime. The system supports real-time messaging with read receipts, typing indicators, message replies, voice notes, image sharing, and even video and audio calls — all built with privacy at the core.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '25px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ width: '50px', height: '50px', minWidth: '50px', background: 'rgba(255,215,0,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFD700' }}>
                <Gift size={24} />
              </div>
              <div style={{ flex: 1, minWidth: '250px' }}>
                <h4 style={{ fontSize: '1.3rem', marginBottom: '10px' }}>Gamified Reward System</h4>
                <p style={{ color: '#a8a8a8', lineHeight: '1.7' }}>
                  Twelo introduces a unique gamification layer to online chatting. Every user starts with virtual coins that can be earned through platform engagement — watching reward videos, daily logins, and maintaining active conversations. These coins serve as a currency for premium interactions like sending friend requests to users you meet. This system not only incentivizes positive behavior but also adds an exciting, game-like dimension to social networking that keeps users engaged and invested in the community.
                </p>
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
