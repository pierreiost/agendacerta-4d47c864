import { useNavigate } from 'react-router-dom';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingSegments } from '@/components/landing/LandingSegments';
import { LandingFeatures } from '@/components/landing/LandingFeatures';
import { LandingTestimonials } from '@/components/landing/LandingTestimonials';
import { LandingBenefits } from '@/components/landing/LandingBenefits';
import { LandingPricing } from '@/components/landing/LandingPricing';
import { LandingCTA } from '@/components/landing/LandingCTA';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingNav } from '@/components/landing/LandingNav';
import { SEOHead } from '@/components/shared/SEOHead';

const LANDING_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "AgendaCerta",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "description": "Sistema completo para gestão de reservas, agendamentos e espaços. Gerencie sua agenda de forma simples e eficiente.",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "BRL"
  }
};

export default function LandingPage() {
  const navigate = useNavigate();
  
  const handleCTA = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Sistema de Gestão de Reservas e Agendamentos"
        description="AgendaCerta é o sistema completo para gestão de reservas, agendamentos e espaços. Ideal para salões, clínicas, coworkings e muito mais."
        canonical="/inicio"
        jsonLd={LANDING_JSON_LD}
      />
      <LandingNav onCTA={handleCTA} />
      <LandingHero onCTA={handleCTA} />
      <LandingSegments />
      <LandingFeatures />
      <LandingTestimonials />
      <LandingBenefits />
      <LandingPricing onCTA={handleCTA} />
      <LandingCTA onCTA={handleCTA} />
      <LandingFooter />
    </div>
  );
}
