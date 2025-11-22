import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'CYP Vasai - Catholic Youth Group';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1C1917 0%, #292524 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Background Pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 20% 20%, rgba(251, 146, 60, 0.15), transparent 40%), radial-gradient(circle at 80% 80%, rgba(252, 211, 77, 0.15), transparent 40%)',
          }}
        />
        
        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            zIndex: 1,
            padding: '80px',
          }}
        >
          {/* Logo */}
          <div
            style={{
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: '#FB923C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 40,
              boxShadow: '0 20px 40px rgba(251, 146, 60, 0.3)',
            }}
          >
            <div
              style={{
                fontSize: 80,
                fontWeight: 'bold',
                color: '#1C1917',
              }}
            >
              CYP
            </div>
          </div>
          
          {/* Title */}
          <div
            style={{
              fontSize: 72,
              fontWeight: 'bold',
              color: '#FAFAFA',
              marginBottom: 20,
              letterSpacing: '-0.02em',
            }}
          >
            Christian Youth in Power
          </div>
          
          {/* Subtitle */}
          <div
            style={{
              fontSize: 40,
              color: '#FB923C',
              fontWeight: 600,
              marginBottom: 30,
            }}
          >
            Vasai
          </div>
          
          {/* Description */}
          <div
            style={{
              fontSize: 28,
              color: 'rgba(250, 250, 250, 0.7)',
              maxWidth: 800,
              lineHeight: 1.4,
            }}
          >
            Empowering young Catholics through faith, community & service
          </div>
          
          {/* Meeting Info */}
          <div
            style={{
              marginTop: 40,
              padding: '20px 40px',
              background: 'rgba(251, 146, 60, 0.1)',
              borderRadius: 12,
              border: '2px solid rgba(251, 146, 60, 0.3)',
              fontSize: 24,
              color: '#FAFAFA',
            }}
          >
            📍 Every Monday, 7 PM | Giriz, Vasai
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
