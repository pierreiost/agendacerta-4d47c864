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

export default function LandingPage() {
  const navigate = useNavigate();
  
  const handleCTA = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
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
