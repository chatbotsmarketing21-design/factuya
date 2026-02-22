import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText, Send, CreditCard, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';

const Home = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: <FileText className="w-12 h-12" />,
      title: t('landing.feature1Title'),
      description: t('landing.feature1Desc')
    },
    {
      icon: <Send className="w-12 h-12" />,
      title: t('landing.feature2Title'),
      description: t('landing.feature2Desc')
    },
    {
      icon: <CreditCard className="w-12 h-12" />,
      title: t('landing.feature3Title'),
      description: t('landing.feature3Desc')
    }
  ];

  const benefits = [
    { icon: <CheckCircle className="w-5 h-5" />, text: t('landing.benefit1') },
    { icon: <CheckCircle className="w-5 h-5" />, text: t('landing.benefit2') },
    { icon: <CheckCircle className="w-5 h-5" />, text: t('landing.benefit3') },
    { icon: <CheckCircle className="w-5 h-5" />, text: t('landing.benefit4') },
    { icon: <CheckCircle className="w-5 h-5" />, text: t('landing.benefit5') },
    { icon: <CheckCircle className="w-5 h-5" />, text: t('landing.benefit6') }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-gray-900">Factu</span>
              <span className="text-2xl font-bold text-white bg-lime-500 px-2 ml-1">Ya!</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/signin">
                <Button variant="ghost" className="text-gray-700 hover:text-gray-900" data-testid="landing-signin-btn">
                  {t('landing.signIn')}
                </Button>
              </Link>
              <Link to="/create">
                <Button className="bg-lime-500 hover:bg-lime-600 text-white font-semibold" data-testid="landing-create-invoice-btn">
                  {t('landing.createInvoice')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6" data-testid="landing-hero-title">
              {t('landing.heroTitle')}
            </h1>
            <Link to={user ? "/dashboard" : "/create"}>
              <Button size="lg" className="bg-lime-500 hover:bg-lime-600 text-white text-xl px-12 py-6 rounded-lg mt-8" data-testid="landing-hero-cta">
                {t('landing.heroButton')}
              </Button>
            </Link>
          </div>

          {/* Hero Image */}
          <div className="mt-16 relative">
            <div className="mx-auto max-w-5xl">
              <img 
                src="https://static.prod-images.emergentagent.com/jobs/380f7905-e22e-4890-bf32-ad048c328c8c/images/cbf8c9555a7e26db470683536696b0a4fbbc534b686234bd784866245496b92b.png" 
                alt="Professional invoice templates"
                className="w-full rounded-lg shadow-2xl"
                data-testid="landing-hero-image"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {features.map((feature, index) => (
              <div key={index} className="text-center" data-testid={`landing-feature-${index + 1}`}>
                <div className="inline-flex items-center justify-center w-24 h-24 bg-yellow-100 rounded-full mb-6">
                  <div className="text-yellow-600">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 text-lg">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4" data-testid="landing-benefits-title">{t('landing.benefitsTitle')}</h2>
            <p className="text-xl text-gray-600">{t('landing.benefitsSubtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-3 text-gray-700" data-testid={`landing-benefit-${index + 1}`}>
                <div className="text-green-600 flex-shrink-0">{benefit.icon}</div>
                <span className="text-lg">{benefit.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6" data-testid="landing-cta-title">
            {t('landing.ctaTitle')}
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            {t('landing.ctaSubtitle')}
          </p>
          <Link to={user ? "/dashboard" : "/create"}>
            <Button size="lg" className="bg-lime-500 hover:bg-lime-600 text-white font-semibold text-xl px-12 py-6 rounded-lg" data-testid="landing-cta-btn">
              {t('landing.ctaButton')}
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-white font-semibold mb-4">FactuYa!</h3>
              <p className="text-sm">{t('landing.footerDesc')}</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">{t('landing.footerProduct')}</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">{t('landing.footerTemplates')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('landing.footerFeatures')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('landing.footerPricing')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">{t('landing.footerSupport')}</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">{t('landing.footerHelpCenter')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('landing.footerContact')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('landing.footerFAQ')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">{t('landing.footerCompany')}</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">{t('landing.footerAbout')}</a></li>
                <li><Link to="/privacy" className="hover:text-white transition-colors">{t('landing.footerPrivacy')}</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">{t('landing.footerTerms')}</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>{t('landing.footerCopyright')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
